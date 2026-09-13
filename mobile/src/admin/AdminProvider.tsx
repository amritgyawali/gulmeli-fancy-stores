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

export interface Toast {
  id: number;
  message: string;
  tone: "info" | "success" | "danger";
}

interface AdminValue {
  ready: boolean;
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

  // Persist every write, serialised so a slow write cannot overtake a newer one.
  useEffect(() => {
    if (!ready) return;
    const unsubscribe = store.subscribe(() => {
      setRevision((value) => value + 1);
      const snapshot = store.snapshot();
      saveQueue.current = saveQueue.current
        .then(() => adminStorage.save(snapshot))
        .catch(() =>
          setSnapshotError(
            "Dashboard changes could not be saved on this device.",
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
