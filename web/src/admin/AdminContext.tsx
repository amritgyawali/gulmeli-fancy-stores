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
import { loadCatalog } from "@/lib/shop-api";
import type { Product } from "@/lib/types";
import {
  claimAdmin,
  markAppliedRemotely,
  pullAdminData,
  pullCustomerOrders,
  pushAdminData,
  queueCatalogSync,
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
          admin ? "" : "This account is not a store admin. Add it to admin_members first.",
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
        const merged: Snapshot = Object.keys(shared).length ? { ...shared } : {};
        try {
          const orders = await pullCustomerOrders();
          const existing = merged.orders ?? [];
          const byId = new Map(
            existing.map((r): [string, AdminRecord] => [r.id, r]),
          );
          const combined = [...existing];
          for (const order of orders) {
            const current = byId.get(order.id);
            if (!current) {
              combined.push(order);
              continue;
            }
            if (
              current.source !== "customer-app" &&
              String(current.updatedAt) >= String(order.updatedAt)
            )
              continue;
            combined[combined.indexOf(current)] = {
              ...order,
              revision: Number(current.revision ?? 0) + 1,
            };
          }
          merged.orders = combined;
        } catch {
          /* order mirroring is best-effort */
        }
        if (Object.keys(merged).length) {
          setSnapshot(merged);
        } else {
          const products: AdminRecord[] = (await loadCatalog()).map((p) =>
            productFromCatalog(p),
          );
          const seeded: Snapshot = { products };
          setSnapshot(seeded);
          dirty.current = true;
        }
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
    const applyRecord = (
      collection: string,
      record: AdminRecord | null,
      removedId?: string,
    ) => {
      setSnapshot((current) => {
        const list = current[collection] ?? [];
        dirty.current = true;
        if (!record)
          return { ...current, [collection]: list.filter((r) => r.id !== removedId) };
        markAppliedRemotely(collection, record.id);
        const index = list.findIndex((r) => r.id === record.id);
        dirty.current = true;
        if (index < 0) return { ...current, [collection]: [...list, record] };
        const next = [...list];
        next[index] = record;
        return { ...current, [collection]: next };
      });
      setRevision((v) => v + 1);
    };
    const unsubscribe = watchRemoteAdmin({ onRecord: applyRecord });
    const poll = setInterval(() => {
      void pullAdminData()
        .then((shared) => {
          if (dirty.current) return; // local edits pending; they win
          setSnapshot(shared);
          setRevision((v) => v + 1);
        })
        .catch(() => undefined);
    }, 3000);
    return () => {
      unsubscribe();
      clearInterval(poll);
    };
  }, [isAdmin, ready]);

  // Debounced mirror of every local write.
  useEffect(() => {
    if (!ready || !isAdmin) return;
    dirty.current = true;
    const timer = setTimeout(() => {
      dirty.current = false;
      saveQueue.current = saveQueue.current
        .then(async () => {
          await pushAdminData(dataRef.current, session?.user.email ?? "web-admin");
          queueCatalogSync(dataRef.current);
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
      setSnapshot((current) => updater(current));
      setRevision((v) => v + 1);
      void id;
    },
    [],
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
          id: String(values.id ?? `${collection.slice(0, 4)}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`),
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
            r.id === id
              ? { ...r, deletedAt: new Date().toISOString() }
              : r,
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
        // Update the shared orders table (RLS admin policy) so the customer
        // surfaces pick it up, then reflect it in the local board.
        const { data, error } = await supabase
          .from("orders")
          .select("document")
          .eq("id", order.id)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) throw new Error("This order is not in the shared orders table.");
        const doc = { ...(data.document as Record<string, unknown>), status };
        const { error: updateError } = await supabase
          .from("orders")
          .update({ document: doc })
          .eq("id", order.id);
        if (updateError) throw new Error(updateError.message);
        mutate("orders", order.id, (current) => ({
          ...current,
          orders: (current.orders ?? []).map((r) =>
            r.id === order.id
              ? { ...r, status, document: doc, updatedAt: new Date().toISOString() }
              : r,
          ),
        }));
      },
    }),
    [ready, denied, isAdmin, session, snapshot, revision, syncStatus, mutate],
  );
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error("AdminProvider is missing");
  return value;
}

/** Reverse of the mobile syncCatalog mapping, for first-run seeding. */
function productFromCatalog(p: Product): AdminRecord {
  const details: Record<string, unknown> = {
    discount: p.discount,
    originalPrice: p.originalPrice,
    imageKey: p.imageKey,
    illustration: p.illustration,
    brand: p.brand,
    store: p.store,
    rating: p.rating,
    sold: p.sold,
    gems: p.gems,
    fastDelivery: p.fastDelivery,
    voucher: p.voucher,
    badge: p.badge,
  };
  for (const key of Object.keys(details))
    if (details[key] === undefined) delete details[key];
  return {
    id: p.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    revision: 1,
    name: p.name,
    slug: p.id,
    sku: p.id.toUpperCase(),
    status: "published",
    price: p.price,
    salePrice: null,
    stock: p.stock,
    unlimitedStock: false,
    categoryId: null,
    categoryName: p.category,
    storefrontGroup: p.group,
    images: p.imageUrl ? [p.imageUrl] : [],
    details,
  };
}
