import { CONFIG_GROUPS } from "./config-schema.ts";
import { getPath } from "./query.ts";
import { NAVIGATION, resources } from "./resources/index.ts";
import type { AdminStore } from "./store.ts";

export interface SearchHit {
  id: string;
  title: string;
  subtitle: string;
  group: string;
  route: string;
  icon: string;
}

/** One global search across products, orders, customers, settings and screens. */
export function globalSearch(
  store: AdminStore,
  term: string,
  limit = 30,
): SearchHit[] {
  const needle = term.trim().toLowerCase();
  if (needle.length < 2) return [];
  const hits: SearchHit[] = [];

  for (const resource of resources) {
    if (hits.length >= limit) break;
    const fields = resource.searchFields.length
      ? resource.searchFields
      : [resource.labelField];
    for (const record of store.all(resource.key)) {
      if (hits.length >= limit) break;
      const matched = fields.some((field) =>
        String(getPath(record, field) ?? "")
          .toLowerCase()
          .includes(needle),
      );
      if (!matched) continue;
      const title = String(getPath(record, resource.labelField) ?? record.id);
      const subtitleField = resource.columns.find(
        (column) => column.field !== resource.labelField && !column.format,
      );
      hits.push({
        id: `${resource.key}:${record.id}`,
        title,
        subtitle: subtitleField
          ? String(getPath(record, subtitleField.field) ?? resource.singular)
          : resource.singular,
        group: resource.label,
        route: `/admin/r/${resource.key}/${record.id}`,
        icon: resource.icon,
      });
    }
  }

  for (const section of NAVIGATION) {
    const entries =
      section.items ??
      (section.route
        ? [{ label: section.label, route: section.route, icon: section.icon }]
        : []);
    for (const entry of entries) {
      if (!entry.label.toLowerCase().includes(needle)) continue;
      hits.push({
        id: `nav:${entry.route}`,
        title: entry.label,
        subtitle: section.label,
        group: "Screens",
        route: entry.route,
        icon: entry.icon,
      });
    }
  }

  for (const group of CONFIG_GROUPS) {
    for (const field of group.fields) {
      if (
        !field.label.toLowerCase().includes(needle) &&
        !group.label.toLowerCase().includes(needle)
      )
        continue;
      hits.push({
        id: `cfg:${field.name}`,
        title: field.label,
        subtitle: `${group.label} setting`,
        group: "Settings",
        route:
          group.module === "appearance"
            ? "/admin/appearance"
            : "/admin/settings",
        icon: group.icon,
      });
      break;
    }
  }

  return hits.slice(0, limit);
}

export interface CommandAction {
  id: string;
  label: string;
  hint: string;
  icon: string;
  module: string;
  route: string;
}

/** The quick-action centre, also used by the Overview quick-action buttons. */
export const COMMAND_ACTIONS: CommandAction[] = [
  {
    id: "new-product",
    label: "Create product",
    hint: "Add a new item to the catalogue",
    icon: "tag",
    module: "products",
    route: "/admin/r/products/new",
  },
  {
    id: "new-order",
    label: "Create order",
    hint: "Take an order over the phone or in person",
    icon: "receipt",
    module: "orders",
    route: "/admin/r/orders/new",
  },
  {
    id: "new-coupon",
    label: "Create coupon",
    hint: "Percentage, fixed, free shipping or buy X get Y",
    icon: "ticket",
    module: "discounts",
    route: "/admin/r/coupons/new",
  },
  {
    id: "new-customer",
    label: "Add customer",
    hint: "Create a customer profile",
    icon: "users",
    module: "customers",
    route: "/admin/r/customers/new",
  },
  {
    id: "new-banner",
    label: "Add banner",
    hint: "Homepage, category or product banner",
    icon: "image",
    module: "content",
    route: "/admin/r/banners/new",
  },
  {
    id: "send-notification",
    label: "Send notification",
    hint: "Push, email or SMS to a customer segment",
    icon: "paper-plane",
    module: "notifications",
    route: "/admin/r/notifications/new",
  },
  {
    id: "add-stock",
    label: "Add inventory",
    hint: "Record a restock or a stock correction",
    icon: "boxes-stacked",
    module: "inventory",
    route: "/admin/r/inventory_movements/new",
  },
  {
    id: "search-orders",
    label: "Search orders",
    hint: "Find an order by number, customer or tracking",
    icon: "magnifying-glass",
    module: "orders",
    route: "/admin/r/orders",
  },
  {
    id: "refund",
    label: "Refund an order",
    hint: "Open returns and refunds",
    icon: "rotate-left",
    module: "returns",
    route: "/admin/r/returns",
  },
  {
    id: "appearance",
    label: "Change appearance",
    hint: "Colours, typography, logos and presets",
    icon: "palette",
    module: "appearance",
    route: "/admin/appearance",
  },
  {
    id: "homepage",
    label: "Edit the homepage",
    hint: "Reorder, hide, schedule and preview sections",
    icon: "table-cells-large",
    module: "content",
    route: "/admin/homepage",
  },
  {
    id: "settings",
    label: "Open settings",
    hint: "Store, checkout, features, localisation and more",
    icon: "gear",
    module: "settings",
    route: "/admin/settings",
  },
];

export function filterCommands(
  term: string,
  allowed: (module: string) => boolean,
): CommandAction[] {
  const needle = term.trim().toLowerCase();
  return COMMAND_ACTIONS.filter(
    (action) =>
      allowed(action.module) &&
      (!needle ||
        action.label.toLowerCase().includes(needle) ||
        action.hint.toLowerCase().includes(needle)),
  );
}
