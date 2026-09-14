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
import { products as localCatalog } from "@/data/catalog";
import {
  AdminStore,
  type Snapshot,
  type WriteOptions,
} from "@/admin/core/store";
import {
  buildSeed,
  emptySnapshot,
  type SeedSourceProduct,
} from "@/admin/core/seed";
import { defaultConfig, type StorefrontConfig } from "@/admin/core/config";
import {
  applyScheduledPublish,
  discardDraft as discardDraftState,
  hasUnpublishedChanges,
  initialConfigState,
  publishDraft,
  rollbackTo,
  schedulePublish,
  updateDraft,
  type ConfigState,
} from "@/admin/core/publishing";
import { adminTheme, type AdminTheme } from "@/admin/ui/theme";
import { can, type PermissionMap, type RoleRecord } from "@/admin/core/rbac";
import type { PermissionAction } from "@/admin/core/resource";
import { emptyDashboardData, type DashboardData } from "@/admin/core/metrics";
import type {
  Actor,
  AdminOrder,
  AdminProduct,
  AdminRecord,
} from "@/admin/core/types";
import {
  adminStorage,
  configStorage,
  publishConfigRemotely,
  refreshPublishedConfig,
} from "@/services/storefront-config";
import { backendConfig } from "@/services/backend-config";
import { supabase } from "@/services/supabase";
import {
  markAppliedRemotely,
  pullAdminData,
  pullCustomerOrders,
  pushAdminData,
  queueCatalogSync,
  watchRemoteAdmin,
} from "@/services/remote-admin";

export interface Toast {
  id: number;
  message: string;
  tone: "info" | "success" | "danger";
}

interface AdminValue {
  ready: boolean;
  live: boolean;
  syncOn: boolean;
  store: AdminStore;
  /** Bumped on every write so screens re-render off the mutable store. */
  revision: number;
  snapshotError: string;

  configState: ConfigState;
  draft: StorefrontConfig;
  published: StorefrontConfig;
  dirty: boolean;
  theme: AdminTheme;

  actor: Actor;
  role: RoleRecord | null;
  roles: RoleRecord[];
  allowed(module: string, action?: PermissionAction): boolean;
  signInAs(userId: string): void;

  data: DashboardData;
  write: WriteOptions;

  setDraft(next: StorefrontConfig): void;
  publish(label?: string): Promise<void>;
  discardDraft(): void;
  scheduleFor(when: string): void;
  restoreVersion(versionId: string): void;
  savePermissions(roleId: string, permissions: PermissionMap): void;

  resetDemoData(): Promise<void>;
  clearBusinessData(): Promise<void>;
  exportSnapshot(): string;
  importSnapshot(json: string): void;

  toasts: Toast[];
  notify(message: string, tone?: Toast["tone"]): void;
  dismissToast(id: number): void;
}

const AdminContext = createContext<AdminValue | null>(null);

function catalogSeed(): SeedSourceProduct[] {
  return localCatalog.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    originalPrice: product.originalPrice,
    category: product.category,
    group: product.group,
    stock: product.stock,
    brand: product.brand,
    badge: product.badge,
    imageUrl: product.imageUrl,
    sold: product.sold,
    rating: product.rating,
  }));
}

const FALLBACK_ACTOR: Actor = {
  id: "admin_owner",
  name: "Store owner",
  roleId: "role_super_admin",
};

/** Applies one server record locally without re-auditing or echoing it back. */
function applyRemoteRecord(
  store: AdminStore,
  collection: string,
  record: AdminRecord,
) {
  const current = store.get(collection, record.id);
  if (current && current.revision >= Number(record.revision || 0)) return;
  const list = store.raw(collection);
  if (current) {
    store.replaceAll({
      ...store.snapshot(),
      [collection]: list.map((entry) =>
        entry.id === record.id ? record : entry,
      ),
    });
  } else {
    store.replaceAll({ ...store.snapshot(), [collection]: [...list, record] });
  }
}

/** Copies customer-app orders into the board without touching admin records. */
function mergeCustomerOrders(store: AdminStore, orders: AdminOrder[]) {
  const existing = store.raw("orders");
  const byId = new Map(existing.map((order) => [order.id, order]));
  const merged = [...existing];
  for (const order of orders) {
    const current = byId.get(order.id);
    if (!current) {
      merged.push(order);
      continue;
    }
    if (
      current.source !== "customer-app" &&
      current.updatedAt >= order.updatedAt
    )
      continue; // the admin progressed this order more recently
    merged[merged.indexOf(current)] = {
      ...order,
      revision: current.revision + 1,
    };
  }
  store.replaceAll({ ...store.snapshot(), orders: merged });
}

export function AdminProvider({ children }: PropsWithChildren) {
  const [store] = useState(() => new AdminStore());
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const [snapshotError, setSnapshotError] = useState("");
  const [configState, setConfigState] = useState<ConfigState>(() =>
    initialConfigState(),
  );
  const [actorId, setActorId] = useState(FALLBACK_ACTOR.id);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const saveQueue = useRef(Promise.resolve());
  // Set once the dashboard is sharing state with Supabase (signed-in admin).
  const [syncOn, setSyncOn] = useState(false);
  const syncRef = useRef(false);
  const actorNameRef = useRef("admin");
  useEffect(() => {
    syncRef.current = syncOn;
  }, [syncOn]);

  const notify = useCallback(
    (message: string, tone: Toast["tone"] = "info") => {
      toastId.current += 1;
      const id = toastId.current;
      setToasts((current) => [...current, { id, message, tone }]);
      setTimeout(
        () =>
          setToasts((current) => current.filter((entry) => entry.id !== id)),
        4200,
      );
    },
    [],
  );

  const dismissToast = useCallback(
    (id: number) =>
      setToasts((current) => current.filter((entry) => entry.id !== id)),
    [],
  );

  // Load persisted state, seeding from the shop's own catalogue on first run.
  // When signed in as an admin with Supabase configured, the shared server
  // copy wins so every device shows the same dashboard.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [snapshot, config] = await Promise.all([
          adminStorage.load(),
          configStorage.load(),
        ]);
        if (!active) return;
        store.replaceAll(snapshot ?? buildSeed(catalogSeed()));
        setConfigState(applyScheduledPublish(config));
      } catch {
        if (!active) return;
        store.replaceAll(buildSeed(catalogSeed()));
        setSnapshotError(
          "Saved dashboard data could not be read, so a fresh copy was loaded.",
        );
      } finally {
        if (active) {
          setReady(true);
          setRevision((value) => value + 1);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [store]);

  // Take over from the shared Supabase copy for admins, and keep following it
  // over realtime so changes from any device land here within seconds.
  useEffect(() => {
    if (!backendConfig.live || !supabase) return;
    const client = supabase;
    let active = true;
    const adopt = async (userId: string | null) => {
      if (!userId) {
        setSyncOn(false);
        return;
      }
      const { data: admin } = await client.rpc("claim_first_admin");
      if (!active || !admin) {
        setSyncOn(false);
        return;
      }
      try {
        const shared = await pullAdminData();
        if (!active) return;
        const seeded = store.snapshot();
        store.replaceAll(
          Object.keys(shared).length ? shared : (seeded ?? shared),
        );
        if (!Object.keys(shared).length)
          void pushAdminData(store.snapshot(), "admin");
        try {
          const orders = await pullCustomerOrders();
          if (active) mergeCustomerOrders(store, orders);
        } catch {
          // Order mirroring is best-effort; the board keeps its own copy.
        }
        setSyncOn(true);
        setRevision((value) => value + 1);
      } catch (error) {
        if (active)
          setSnapshotError(
            error instanceof Error
              ? `Shared dashboard data could not be loaded: ${error.message}`
              : "Shared dashboard data could not be loaded.",
          );
      }
    };
    void client.auth
      .getSession()
      .then(({ data }) => adopt(data.session?.user.id ?? null))
      .catch(() => undefined);
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      void adopt(session?.user.id ?? null);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [store]);

  // Follow server changes while syncing.
  useEffect(() => {
    if (!syncOn) return;
    const unsubscribe = watchRemoteAdmin({
      onRecord: (collection, record) => {
        if (record) {
          markAppliedRemotely(collection, record.id);
          applyRemoteRecord(store, collection, record);
        } else setRevision((value) => value + 1);
        setRevision((value) => value + 1);
      },
      onCatalogChange: () => setRevision((value) => value + 1),
    });
    const poll = setInterval(() => {
      void pullAdminData()
        .then((shared) => {
          for (const [collection, records] of Object.entries(shared)) {
            for (const record of records) {
              markAppliedRemotely(collection, record.id);
              applyRemoteRecord(store, collection, record);
            }
          }
          setRevision((value) => value + 1);
        })
        .catch(() => undefined);
    }, 3000);
    return () => {
      unsubscribe();
      clearInterval(poll);
    };
  }, [syncOn, store]);

  // Persist every write, serialised so a slow write cannot overtake a newer one.
  // While syncing with Supabase, also mirror to the server and republish the
  // customer-facing catalogue.
  useEffect(() => {
    if (!ready) return;
    const unsubscribe = store.subscribe(() => {
      setRevision((value) => value + 1);
      const snapshot = store.snapshot();
      saveQueue.current = saveQueue.current
        .then(async () => {
          await adminStorage.save(snapshot);
          if (syncRef.current) {
            await pushAdminData(snapshot, actorNameRef.current);
            queueCatalogSync(snapshot);
          }
        })
        .catch((error) =>
          setSnapshotError(
            syncRef.current
              ? `Changes are on this device, but the server copy failed: ${
                  error instanceof Error ? error.message : "unreachable"
                }`
              : "Dashboard changes could not be saved on this device.",
          ),
        );
    });
    return unsubscribe;
  }, [ready, store]);

  useEffect(() => {
    if (!ready) return;
    void configStorage
      .save(configState)
      .catch(() =>
        setSnapshotError(
          "The configuration could not be saved on this device.",
        ),
      );
  }, [configState, ready]);

  const roles = useMemo(
    () => store.all<RoleRecord>("roles"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, revision],
  );

  const actor = useMemo<Actor>(() => {
    const user = store.get("admin_users", actorId);
    if (!user) return FALLBACK_ACTOR;
    return {
      id: user.id,
      name: String(user.name),
      roleId: String(user.roleId ?? ""),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, actorId, revision]);

  const role = useMemo(
    () =>
      roles.find(
        (entry) => entry.id === actor.roleId || entry.key === actor.roleId,
      ) ?? null,
    [roles, actor.roleId],
  );

  const allowed = useCallback(
    (module: string, action: PermissionAction = "view") =>
      can(role, module, action),
    [role],
  );

  const data = useMemo<DashboardData>(
    () => ({
      ...emptyDashboardData,
      orders: store.all<AdminOrder>("orders"),
      products: store.all<AdminProduct>("products"),
      customers: store.all<AdminRecord>("customers"),
      carts: store.all("carts"),
      returns: store.all("returns"),
      transactions: store.all("transactions"),
      reviews: store.all("reviews"),
      tickets: store.all("tickets"),
      categories: store.all("categories"),
      expenses: store.all("expenses"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, revision],
  );

  const write = useMemo<WriteOptions>(() => ({ actor }), [actor]);
  useEffect(() => {
    actorNameRef.current = actor.name || "admin";
  }, [actor]);

  const setDraft = useCallback(
    (next: StorefrontConfig) =>
      setConfigState((current) => updateDraft(current, next)),
    [],
  );

  const publish = useCallback(
    async (label?: string) => {
      const next = publishDraft(configState, actor.name, label);
      setConfigState(next);
      store.log(
        "publish",
        "appearance",
        label ?? "Published storefront configuration",
        actor,
      );
      try {
        await publishConfigRemotely(next.published);
        // Storefront screens listen to this, so the change shows up immediately.
        await refreshPublishedConfig();
        notify(
          "Published. The app and website now use these settings.",
          "success",
        );
      } catch (error) {
        await refreshPublishedConfig().catch(() => undefined);
        notify(
          error instanceof Error
            ? `Saved on this device, but the shared copy was not updated: ${error.message}`
            : "Saved on this device, but the shared copy was not updated.",
          "danger",
        );
      }
    },
    [actor, configState, notify, store],
  );

  const value = useMemo<AdminValue>(
    () => ({
      ready,
      live: backendConfig.live,
      syncOn,
      store,
      revision,
      snapshotError,
      configState,
      draft: configState.draft,
      published: configState.published,
      dirty: hasUnpublishedChanges(configState),
      theme: adminTheme(configState.draft),
      actor,
      role,
      roles,
      allowed,
      signInAs: setActorId,
      data,
      write,
      setDraft,
      publish,
      discardDraft: () => {
        setConfigState((current) => discardDraftState(current));
        notify("Draft changes discarded.");
      },
      scheduleFor: (when) => {
        setConfigState((current) => schedulePublish(current, when));
        notify("Publication scheduled.", "success");
      },
      restoreVersion: (versionId) => {
        setConfigState((current) => rollbackTo(current, versionId));
        notify(
          "Earlier version loaded into the draft. Review it, then publish.",
        );
      },
      savePermissions: (roleId, permissions) => {
        store.update("roles", roleId, { permissions }, { actor });
        notify("Permissions updated.", "success");
      },
      resetDemoData: async () => {
        store.replaceAll(buildSeed(catalogSeed()));
        await adminStorage.save(store.snapshot());
        setRevision((current) => current + 1);
        notify("Demo data restored.", "success");
      },
      clearBusinessData: async () => {
        store.replaceAll(emptySnapshot(catalogSeed()));
        await adminStorage.save(store.snapshot());
        setRevision((current) => current + 1);
        notify("Orders, customers and other demo records cleared.", "success");
      },
      exportSnapshot: () =>
        JSON.stringify(
          { snapshot: store.snapshot(), config: configState },
          null,
          2,
        ),
      importSnapshot: (json) => {
        try {
          const parsed = JSON.parse(json) as {
            snapshot?: Snapshot;
            config?: ConfigState;
          };
          if (!parsed.snapshot)
            throw new Error("The backup has no dashboard data.");
          store.replaceAll(parsed.snapshot);
          if (parsed.config) setConfigState(parsed.config);
          setRevision((current) => current + 1);
          notify("Backup restored.", "success");
        } catch (error) {
          notify(
            error instanceof Error
              ? error.message
              : "That backup could not be read.",
            "danger",
          );
        }
      },
      toasts,
      notify,
      dismissToast,
    }),
    [
      ready,
      syncOn,
      store,
      revision,
      snapshotError,
      configState,
      actor,
      role,
      roles,
      allowed,
      data,
      write,
      setDraft,
      publish,
      notify,
      dismissToast,
      toasts,
    ],
  );

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdmin(): AdminValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error("AdminProvider is missing");
  return value;
}

/** Convenience for screens that only need the theme. */
export function useAdminTheme(): AdminTheme {
  return useAdmin().theme;
}

export const ADMIN_DEFAULT_CONFIG = defaultConfig;
