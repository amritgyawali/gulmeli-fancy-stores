// Shares the admin dashboard state with Supabase exactly like the mobile
// AdminProvider: one snapshot in memory, mirrored to admin_data, followed over
// realtime with a 3s safety poll. Products re-publish to the public catalog.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  claimAdmin,
  adoptAdminData,
  mergeAdminData,
  adminSyncBusy,
  pullAdminData,
  pushAdminData,
  watchRemoteAdmin,
  type AdminRecord,
  type Snapshot,
} from "@/lib/admin-api";
import { errorMessage } from "@/lib/format";

interface AdminValue {
  ready: boolean;
  denied: string;
  isAdmin: boolean;
  session: Session | null;
  snapshot: Snapshot;
  revision: number;
  syncStatus: string;
  all(collection: string): AdminRecord[];
  get(collection: string, id: string): AdminRecord | null;
  create(collection: string, values: Record<string, unknown>): AdminRecord;
  update(collection: string, id: string, values: Record<string, unknown>): void;
  remove(collection: string, id: string): void;
  restore(collection: string, id: string): void;
  purge(collection: string, id: string): void;
  setOrderStatus(order: AdminRecord, status: string): Promise<void>;
  signOut(): Promise<void>;
}

const AdminContext = createContext<AdminValue | null>(null);

export function AdminProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [denied, setDenied] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [revision, setRevision] = useState(0);
  const [syncStatus, setSyncStatus] = useState("");
  const dataRef = useRef(snapshot);
  const saveQueue = useRef(Promise.resolve());
  const dirty = useRef(false);

  dataRef.current = snapshot;

  // Auth + membership
  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        if (!data.session) {
          setSnapshot({});
          setIsAdmin(false);
          setDenied("Sign in with a staff account to open the dashboard.");
          setReady(true);
        }
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      if (!next) {
        setIsAdmin(false);
        setDenied("Sign in with a staff account to open the dashboard.");
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!session) return;
    let active = true;
    void claimAdmin()
      .then((admin) => {
        if (!active) return;
        setIsAdmin(admin);
        setDenied(
          admin
            ? ""
            : "This account is not a store admin. Add it to admin_members first.",
        );
        setReady(!admin);
      })
      .catch((error) => {
        if (active) {
          setIsAdmin(false);
          setDenied(errorMessage(error));
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [session]);

  // Adopt the shared snapshot; seed from the live catalog when empty.
  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    void (async () => {
      try {
        const shared = await pullAdminData();
        if (!active) return;
        adoptAdminData(shared);
        setSnapshot(shared);
      } catch (error) {
        if (active) setDenied(errorMessage(error));
      } finally {
        if (active) {
          setReady(true);
          setRevision((v) => v + 1);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [isAdmin]);

  // Realtime + poll from other devices.
  useEffect(() => {
    if (!isAdmin || !ready) return;
    let active = true;
    const refresh = () => {
      if (dirty.current || adminSyncBusy()) return;
      void pullAdminData()
        .then((shared) => {
          if (!active || dirty.current) return;
          setSnapshot((current) => mergeAdminData(current, shared));
        })
        .catch((error) =>
          setSyncStatus(`Refresh failed: ${errorMessage(error)}`),
        );
    };
    const unsubscribe = watchRemoteAdmin({ onChange: refresh });
    const poll = setInterval(refresh, 10000);
    return () => {
      active = false;
      unsubscribe();
      clearInterval(poll);
    };
  }, [isAdmin, ready]);

  // Debounced mirror of every local write.
  useEffect(() => {
    if (!ready || !isAdmin || !dirty.current) return;
    const timer = setTimeout(() => {
      saveQueue.current = saveQueue.current
        .then(async () => {
          await pushAdminData(
            dataRef.current,
            session?.user.email ?? "web-admin",
          );
          dirty.current = false;
          setSyncStatus("Synced with the mobile dashboard");
        })
        .catch((error) => setSyncStatus(`Not synced: ${errorMessage(error)}`));
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, ready, isAdmin]);

  const mutate = useCallback(
    (
      collection: string,
      id: string,
      updater: (current: Snapshot) => Snapshot,
    ) => {
      if (!isAdmin) return;
      dirty.current = true;
      setSnapshot((current) => updater(current));
      setRevision((v) => v + 1);
      void id;
    },
    [isAdmin],
  );

  const value = useMemo<AdminValue>(
    () => ({
      ready,
      denied,
      isAdmin,
      session,
      snapshot,
      revision,
      syncStatus,
      all: (collection) =>
        (snapshot[collection] ?? []).filter((r) => !r.deletedAt),
      get: (collection, id) =>
        (snapshot[collection] ?? []).find((r) => r.id === id) ?? null,
      create: (collection, values) => {
        const record: AdminRecord = {
          ...values,
          id: String(
            values.id ??
              `${collection.slice(0, 4)}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          ),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          revision: 1,
        };
        mutate(collection, record.id, (current) => ({
          ...current,
          [collection]: [...(current[collection] ?? []), record],
        }));
        return record;
      },
      update: (collection, id, values) =>
        mutate(collection, id, (current) => ({
          ...current,
          [collection]: (current[collection] ?? []).map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...values,
                  id: r.id,
                  createdAt: r.createdAt,
                  updatedAt: new Date().toISOString(),
                  revision: Number(r.revision ?? 0) + 1,
                }
              : r,
          ),
        })),
      remove: (collection, id) =>
        mutate(collection, id, (current) => ({
          ...current,
          [collection]: (current[collection] ?? []).map((r) =>
            r.id === id ? { ...r, deletedAt: new Date().toISOString() } : r,
          ),
        })),
      restore: (collection, id) =>
        mutate(collection, id, (current) => ({
          ...current,
          [collection]: (current[collection] ?? []).map((r) =>
            r.id === id ? { ...r, deletedAt: null } : r,
          ),
        })),
      purge: (collection, id) =>
        mutate(collection, id, (current) => ({
          ...current,
          [collection]: (current[collection] ?? []).filter((r) => r.id !== id),
        })),
      signOut: async () => {
        await supabase.auth.signOut({ scope: "local" });
      },
      setOrderStatus: async (order, status) => {
        // The database projects this admin record into the customer order atomically.
        const doc = { status };
        mutate("orders", order.id, (current) => ({
          ...current,
          orders: (current.orders ?? []).map((r) =>
            r.id === order.id
              ? {
                  ...r,
                  status,
                  document: doc,
                  updatedAt: new Date().toISOString(),
                }
              : r,
          ),
        }));
      },
    }),
    [ready, denied, isAdmin, session, snapshot, revision, syncStatus, mutate],
  );
  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error("AdminProvider is missing");
  return value;
}
