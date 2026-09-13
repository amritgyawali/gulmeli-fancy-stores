import { MODULES } from "./resources/index.ts";
import { PERMISSION_ACTIONS, type PermissionAction } from "./resource.ts";
import type { Actor, AdminRecord } from "./types.ts";

/** module → allowed actions. `*` as a module means every module. */
export type PermissionMap = Record<string, PermissionAction[]>;

export interface RoleRecord extends AdminRecord {
  name: string;
  key: string;
  description: string;
  builtIn: boolean;
  permissions: PermissionMap;
}

const all = (...modules: string[]): PermissionMap =>
  Object.fromEntries(
    modules.map((module) => [module, [...PERMISSION_ACTIONS]]),
  );

const viewOnly = (...modules: string[]): PermissionMap =>
  Object.fromEntries(
    modules.map((module) => [module, ["view"] as PermissionAction[]]),
  );

const edit = (...modules: string[]): PermissionMap =>
  Object.fromEntries(
    modules.map((module) => [
      module,
      ["view", "create", "edit", "export"] as PermissionAction[],
    ]),
  );

export interface RoleDefinition {
  name: string;
  key: string;
  description: string;
  builtIn: boolean;
  permissions: PermissionMap;
}

/** The roles the brief asks for, ready to use and editable in the dashboard. */
export const BUILT_IN_ROLES: RoleDefinition[] = [
  {
    name: "Super admin",
    key: "super_admin",
    description:
      "Full control over every module, including settings and users.",
    builtIn: true,
    permissions: { "*": [...PERMISSION_ACTIONS] },
  },
  {
    name: "Manager",
    key: "manager",
    description:
      "Runs the shop day to day, but cannot change users or system settings.",
    builtIn: true,
    permissions: {
      ...all(
        "dashboard",
        "orders",
        "products",
        "inventory",
        "customers",
        "returns",
        "discounts",
        "marketing",
        "reviews",
        "support",
        "content",
        "appearance",
        "notifications",
        "analytics",
        "reports",
        "shipping",
        "payments",
        "suppliers",
        "media",
        "seo",
      ),
      ...viewOnly(
        "finance",
        "audit",
        "automation",
        "integrations",
        "system",
        "settings",
        "users",
      ),
    },
  },
  {
    name: "Product manager",
    key: "product_manager",
    description:
      "Catalogue, categories, collections, inventory and merchandising.",
    builtIn: true,
    permissions: {
      ...all("products", "inventory", "media", "seo"),
      ...edit("content"),
      ...viewOnly("dashboard", "orders", "analytics", "reports", "suppliers"),
    },
  },
  {
    name: "Order manager",
    key: "order_manager",
    description: "Fulfilment, deliveries, returns and refunds.",
    builtIn: true,
    permissions: {
      ...all("orders", "returns", "shipping"),
      ...edit("customers"),
      ...viewOnly(
        "dashboard",
        "products",
        "inventory",
        "payments",
        "analytics",
        "reports",
      ),
    },
  },
  {
    name: "Support",
    key: "support",
    description: "Tickets, contact forms, reviews and customer questions.",
    builtIn: true,
    permissions: {
      ...all("support", "reviews"),
      ...edit("customers", "returns"),
      ...viewOnly("dashboard", "orders", "products"),
    },
  },
  {
    name: "Marketing",
    key: "marketing",
    description: "Campaigns, discounts, banners, popups and the homepage.",
    builtIn: true,
    permissions: {
      ...all("marketing", "discounts", "notifications", "content", "seo"),
      ...edit("appearance"),
      ...viewOnly("dashboard", "customers", "products", "analytics", "reports"),
    },
  },
  {
    name: "Accountant",
    key: "accountant",
    description: "Finance, payments, taxes and reporting.",
    builtIn: true,
    permissions: {
      ...all("finance", "reports", "payments"),
      ...viewOnly(
        "dashboard",
        "orders",
        "returns",
        "products",
        "analytics",
        "suppliers",
        "audit",
      ),
    },
  },
  {
    name: "Warehouse",
    key: "warehouse",
    description: "Stock levels, purchase orders and packing.",
    builtIn: true,
    permissions: {
      ...all("inventory", "suppliers"),
      ...edit("orders", "shipping"),
      ...viewOnly("dashboard", "products"),
    },
  },
];

export function permissionsOf(
  role: RoleRecord | null | undefined,
): PermissionMap {
  return role?.permissions ?? {};
}

/** Whether a role may take an action in a module. */
export function can(
  role: RoleRecord | null | undefined,
  module: string,
  action: PermissionAction = "view",
): boolean {
  const permissions = permissionsOf(role);
  const wildcard = permissions["*"];
  if (wildcard?.includes(action)) return true;
  return permissions[module]?.includes(action) ?? false;
}

/** Whether an actor's role grants the action, given the roles available. */
export function actorCan(
  actor: Actor | null,
  roles: RoleRecord[],
  module: string,
  action: PermissionAction = "view",
): boolean {
  if (!actor) return false;
  const role = roles.find(
    (entry) => entry.id === actor.roleId || entry.key === actor.roleId,
  );
  return can(role ?? null, module, action);
}

/** Modules an actor may at least see, used to filter the sidebar. */
export function visibleModules(role: RoleRecord | null): string[] {
  if (!role) return [];
  if (role.permissions["*"]?.includes("view")) return [...MODULES];
  return MODULES.filter((module) => can(role, module, "view"));
}

export function togglePermission(
  permissions: PermissionMap,
  module: string,
  action: PermissionAction,
): PermissionMap {
  const current = permissions[module] ?? [];
  const next = current.includes(action)
    ? current.filter((entry) => entry !== action)
    : [...current, action];
  const result = { ...permissions, [module]: next };
  if (!next.length) delete result[module];
  return result;
}

/** Grants or clears every action in a module at once. */
export function setModulePermissions(
  permissions: PermissionMap,
  module: string,
  granted: boolean,
): PermissionMap {
  const result = { ...permissions };
  if (granted) result[module] = [...PERMISSION_ACTIONS];
  else delete result[module];
  return result;
}
