import { f, options } from "../fields.ts";
import type { ResourceDefinition } from "../resource.ts";
import { catalogResources } from "./catalog.ts";
import { contentResources } from "./content.ts";
import { marketingResources } from "./marketing.ts";
import { operationsResources } from "./operations.ts";
import { peopleResources } from "./people.ts";
import { salesResources } from "./sales.ts";

/** Read-only view over the audit trail, so it lists like any other resource. */
export const auditLogs: ResourceDefinition = {
  key: "audit_logs",
  label: "Audit log",
  singular: "Audit entry",
  icon: "clock-rotate-left",
  module: "audit",
  labelField: "recordLabel",
  description: "Who changed what, when, and what the value was before.",
  fields: [
    f.readonly("createdAt", "When", { width: "half" }),
    f.readonly("actorName", "Who", { width: "half" }),
    f.readonly("action", "Action", { width: "half" }),
    f.readonly("resource", "Area", { width: "half" }),
    f.readonly("recordLabel", "Record", { width: "half" }),
    f.readonly("ip", "IP address", { width: "half" }),
    f.readonly("device", "Device", { width: "half" }),
    f.json("changes", "Changes"),
  ],
  columns: [
    { field: "createdAt", label: "When", format: "datetime" },
    { field: "actorName", label: "Who" },
    { field: "action", label: "Action", format: "badge" },
    { field: "resource", label: "Area", compact: true },
    { field: "recordLabel", label: "Record" },
  ],
  searchFields: ["actorName", "resource", "recordLabel", "action"],
  filters: [
    {
      field: "action",
      label: "Action",
      type: "select",
      options: options(
        "create",
        "update",
        "delete",
        "restore",
        "purge",
        "login",
        "publish",
        "rollback",
        "bulk",
        "run",
        "export",
        "import",
        "refund",
      ),
    },
    { field: "createdAt", label: "When", type: "dateRange" },
  ],
  defaultSort: { field: "createdAt", direction: "desc" },
  features: {
    create: false,
    edit: false,
    delete: false,
    bulk: false,
    revisions: false,
    trash: false,
  },
};

export const resources: ResourceDefinition[] = [
  ...catalogResources,
  ...salesResources,
  ...peopleResources,
  ...marketingResources,
  ...contentResources,
  ...operationsResources,
  auditLogs,
];

export const resourceByKey: Record<string, ResourceDefinition> =
  Object.fromEntries(resources.map((resource) => [resource.key, resource]));

export function getResource(key: string): ResourceDefinition | null {
  return resourceByKey[key] ?? null;
}

export interface NavItem {
  label: string;
  /** Route inside the admin, relative to /admin. */
  route: string;
  icon: string;
  /** Permission module that gates the item. */
  module: string;
  /** Live counter shown as a pill, resolved by the shell. */
  badge?:
    | "pendingOrders"
    | "openTickets"
    | "pendingReviews"
    | "lowStock"
    | "returnRequests";
}

export interface NavSection {
  label: string;
  icon: string;
  module: string;
  route?: string;
  items?: NavItem[];
}

const item = (
  label: string,
  route: string,
  icon: string,
  module: string,
  badge?: NavItem["badge"],
): NavItem => ({ label, route, icon, module, badge });

const list = (key: string, badge?: NavItem["badge"]): NavItem => {
  const resource = resourceByKey[key];
  if (!resource) throw new Error(`Unknown admin resource: ${key}`);
  return item(
    resource.label,
    `/admin/r/${key}`,
    resource.icon,
    resource.module,
    badge,
  );
};

/**
 * The sidebar. Order matches the agreed information architecture:
 * Dashboard → Orders → Products → … → System → Settings.
 */
export const NAVIGATION: NavSection[] = [
  {
    label: "Dashboard",
    icon: "gauge-high",
    module: "dashboard",
    route: "/admin",
  },
  {
    label: "Orders",
    icon: "receipt",
    module: "orders",
    items: [
      item(
        "All orders",
        "/admin/r/orders",
        "receipt",
        "orders",
        "pendingOrders",
      ),
      item("Order board", "/admin/orders-board", "table-columns", "orders"),
      list("deliveries"),
    ],
  },
  {
    label: "Products",
    icon: "tag",
    module: "products",
    items: [
      list("products"),
      list("brands"),
      list("bundles"),
      list("preorders"),
    ],
  },
  {
    label: "Categories",
    icon: "table-cells",
    module: "products",
    route: "/admin/r/categories",
  },
  {
    label: "Collections",
    icon: "layer-group",
    module: "products",
    route: "/admin/r/collections",
  },
  {
    label: "Inventory",
    icon: "boxes-stacked",
    module: "inventory",
    items: [
      item(
        "Stock overview",
        "/admin/inventory",
        "boxes-stacked",
        "inventory",
        "lowStock",
      ),
      list("inventory_movements"),
    ],
  },
  {
    label: "Customers",
    icon: "users",
    module: "customers",
    items: [
      list("customers"),
      list("customer_groups"),
      list("carts"),
      list("wishlists"),
    ],
  },
  {
    label: "Returns",
    icon: "rotate-left",
    module: "returns",
    route: "/admin/r/returns",
  },
  {
    label: "Payments",
    icon: "credit-card",
    module: "payments",
    items: [list("payment_methods"), list("transactions"), list("tax_rates")],
  },
  {
    label: "Shipping",
    icon: "truck",
    module: "shipping",
    items: [
      list("shipping_zones"),
      list("shipping_rates"),
      list("couriers"),
      list("locations"),
    ],
  },
  {
    label: "Discounts",
    icon: "ticket",
    module: "discounts",
    items: [
      list("coupons"),
      list("flash_sales"),
      list("promotions"),
      list("gift_cards"),
    ],
  },
  {
    label: "Marketing",
    icon: "bullhorn",
    module: "marketing",
    items: [
      list("campaigns"),
      list("segments"),
      list("popups"),
      list("referrals"),
      list("loyalty_rules"),
      list("back_in_stock"),
      list("price_alerts"),
    ],
  },
  {
    label: "Reviews",
    icon: "star",
    module: "reviews",
    items: [
      item("Reviews", "/admin/r/reviews", "star", "reviews", "pendingReviews"),
      list("questions"),
    ],
  },
  {
    label: "Support",
    icon: "headset",
    module: "support",
    items: [
      item("Tickets", "/admin/r/tickets", "headset", "support", "openTickets"),
      list("contact_submissions"),
      list("data_requests"),
    ],
  },
  {
    label: "Content",
    icon: "file-lines",
    module: "content",
    items: [
      list("pages"),
      list("blog_posts"),
      list("faqs"),
      list("banners"),
      list("menu_items"),
      item("SEO & search", "/admin/seo", "magnifying-glass", "seo"),
    ],
  },
  {
    label: "Homepage Builder",
    icon: "table-cells-large",
    module: "content",
    route: "/admin/homepage",
  },
  {
    label: "Appearance",
    icon: "palette",
    module: "appearance",
    route: "/admin/appearance",
  },
  {
    label: "Notifications",
    icon: "bell",
    module: "notifications",
    items: [
      list("notifications"),
      list("email_templates"),
      list("sms_templates"),
      list("push_templates"),
    ],
  },
  {
    label: "Analytics",
    icon: "chart-line",
    module: "analytics",
    route: "/admin/analytics",
  },
  {
    label: "Reports",
    icon: "file-csv",
    module: "reports",
    route: "/admin/reports",
  },
  {
    label: "Finance",
    icon: "sack-dollar",
    module: "finance",
    items: [
      item("Profit & loss", "/admin/finance", "sack-dollar", "finance"),
      list("expenses"),
    ],
  },
  {
    label: "Suppliers",
    icon: "industry",
    module: "suppliers",
    items: [list("suppliers"), list("purchase_orders")],
  },
  {
    label: "Media",
    icon: "photo-film",
    module: "media",
    route: "/admin/media",
  },
  {
    label: "Users & Roles",
    icon: "user-shield",
    module: "users",
    items: [
      list("admin_users"),
      item("Roles & permissions", "/admin/roles", "key", "users"),
    ],
  },
  {
    label: "Integrations",
    icon: "plug",
    module: "integrations",
    items: [list("integrations"), list("webhooks"), list("webhook_logs")],
  },
  {
    label: "Automation",
    icon: "robot",
    module: "automation",
    route: "/admin/automation",
  },
  {
    label: "Audit Logs",
    icon: "clock-rotate-left",
    module: "audit",
    route: "/admin/r/audit_logs",
  },
  {
    label: "System",
    icon: "server",
    module: "system",
    items: [
      item("System health", "/admin/system", "server", "system"),
      list("error_logs"),
      list("backups"),
      item("Trash", "/admin/trash", "trash-can", "system"),
    ],
  },
  {
    label: "Settings",
    icon: "gear",
    module: "settings",
    route: "/admin/settings",
  },
];

/** Every distinct permission module, in sidebar order. */
export const MODULES: string[] = [
  ...new Set([
    "dashboard",
    ...NAVIGATION.flatMap((section) => [
      section.module,
      ...(section.items?.map((entry) => entry.module) ?? []),
    ]),
    ...resources.map((resource) => resource.module),
  ]),
];
