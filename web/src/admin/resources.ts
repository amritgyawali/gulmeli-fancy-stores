// Registry of admin dashboard collections: labels, grouping and column hints.
// Mirrors the mobile dashboard's resource keys (admin_data collections) so the
// web admin can open, search and edit every one of them — and new collections
// created on the mobile dashboard show up automatically.
export interface CollectionMeta {
  key: string;
  label: string;
  group: string;
  icon: string;
  labelField: string;
  columns: string[];
  note?: string;
}

export const GROUPS = [
  "Catalog",
  "Content",
  "Sales",
  "People",
  "Operations",
  "Marketing",
  "System",
] as const;

export const COLLECTIONS: CollectionMeta[] = [
  // ——— Catalog
  { key: "products", label: "Products", group: "Catalog", icon: "grid", labelField: "name", columns: ["name", "price", "stock", "status"] },
  { key: "categories", label: "Categories", group: "Catalog", icon: "grid", labelField: "name", columns: ["name", "slug", "active"] },
  { key: "brands", label: "Brands", group: "Catalog", icon: "shield", labelField: "name", columns: ["name", "featured"] },
  { key: "collections", label: "Collections", group: "Catalog", icon: "star", labelField: "name", columns: ["name", "type"] },
  { key: "bundles", label: "Bundles", group: "Catalog", icon: "gift", labelField: "name", columns: ["name", "price"] },
  { key: "inventory_movements", label: "Stock movements", group: "Catalog", icon: "box", labelField: "productId", columns: ["productId", "quantity", "reason", "createdAt"] },
  // ——— Content
  { key: "pages", label: "Pages", group: "Content", icon: "image", labelField: "title", columns: ["title", "slug", "status"] },
  { key: "blog_posts", label: "Blog posts", group: "Content", icon: "message", labelField: "title", columns: ["title", "status", "publishedAt"] },
  { key: "faqs", label: "FAQs", group: "Content", icon: "search", labelField: "question", columns: ["question", "category"] },
  { key: "banners", label: "Banners", group: "Content", icon: "image", labelField: "title", columns: ["title", "position", "active"] },
  { key: "menu_items", label: "Menu items", group: "Content", icon: "grid", labelField: "label", columns: ["label", "url", "order"] },
  { key: "homepage_sections", label: "Homepage builder", group: "Content", icon: "home", labelField: "title", columns: ["title", "type", "enabled"] },
  { key: "media", label: "Media library", group: "Content", icon: "image", labelField: "name", columns: ["name", "kind", "folder"] },
  // ——— Sales
  { key: "orders", label: "Orders", group: "Sales", icon: "box", labelField: "number", columns: ["number", "customerName", "status", "total"] },
  { key: "carts", label: "Abandoned carts", group: "Sales", icon: "cart", labelField: "customerName", columns: ["customerName", "items", "total"] },
  { key: "wishlists", label: "Wishlists", group: "Sales", icon: "heart", labelField: "customerName", columns: ["customerName", "products"] },
  { key: "reviews", label: "Reviews", group: "Sales", icon: "star", labelField: "productName", columns: ["productName", "rating", "status"] },
  { key: "returns", label: "Returns", group: "Sales", icon: "logout", labelField: "orderNumber", columns: ["orderNumber", "status", "amount"] },
  { key: "preorders", label: "Pre-orders", group: "Sales", icon: "clock", labelField: "productName", columns: ["productName", "status"] },
  { key: "coupons", label: "Coupons", group: "Sales", icon: "ticket", labelField: "code", columns: ["code", "discount", "uses", "active"] },
  { key: "gift_cards", label: "Gift cards", group: "Sales", icon: "gift", labelField: "code", columns: ["code", "balance", "status"] },
  // ——— People
  { key: "customers", label: "Customers", group: "People", icon: "users", labelField: "name", columns: ["name", "email", "totalSpent"] },
  { key: "customer_groups", label: "Customer groups", group: "People", icon: "users", labelField: "name", columns: ["name", "discount"] },
  { key: "segments", label: "Segments", group: "People", icon: "users", labelField: "name", columns: ["name", "size"] },
  { key: "admin_users", label: "Staff accounts", group: "People", icon: "user", labelField: "name", columns: ["name", "roleId"] },
  { key: "roles", label: "Roles & permissions", group: "People", icon: "shield", labelField: "name", columns: ["name"] },
  { key: "referrals", label: "Referrals", group: "People", icon: "gift", labelField: "customerName", columns: ["customerName", "code", "reward"] },
  // ——— Operations
  { key: "deliveries", label: "Deliveries", group: "Operations", icon: "truck", labelField: "orderNumber", columns: ["orderNumber", "courier", "status"] },
  { key: "couriers", label: "Couriers", group: "Operations", icon: "truck", labelField: "name", columns: ["name", "active"] },
  { key: "pickup_stores", label: "Pickup stores", group: "Operations", icon: "home", labelField: "name", columns: ["name", "city"] },
  { key: "shipping_rates", label: "Shipping rates", group: "Operations", icon: "truck", labelField: "name", columns: ["name", "rate"] },
  { key: "shipping_zones", label: "Shipping zones", group: "Operations", icon: "shield", labelField: "name", columns: ["name"] },
  { key: "locations", label: "Locations", group: "Operations", icon: "home", labelField: "name", columns: ["name", "type"] },
  { key: "suppliers", label: "Suppliers", group: "Operations", icon: "users", labelField: "name", columns: ["name", "email"] },
  { key: "purchase_orders", label: "Purchase orders", group: "Operations", icon: "box", labelField: "number", columns: ["number", "supplierName", "status"] },
  { key: "expenses", label: "Expenses", group: "Operations", icon: "chart", labelField: "title", columns: ["title", "amount", "date"] },
  { key: "transactions", label: "Transactions", group: "Operations", icon: "chart", labelField: "reference", columns: ["reference", "amount", "type"] },
  { key: "tax_rates", label: "Tax rates", group: "Operations", icon: "percent", labelField: "name", columns: ["name", "rate"] },
  { key: "currencies", label: "Currencies", group: "Operations", icon: "percent", labelField: "code", columns: ["code", "rate"] },
  { key: "payment_methods", label: "Payment methods", group: "Operations", icon: "shield", labelField: "name", columns: ["name", "enabled"] },
  // ——— Marketing
  { key: "campaigns", label: "Campaigns", group: "Marketing", icon: "bolt", labelField: "name", columns: ["name", "status"] },
  { key: "promotions", label: "Promotions", group: "Marketing", icon: "tag", labelField: "name", columns: ["name", "type", "active"] },
  { key: "flash_sales", label: "Flash sales", group: "Marketing", icon: "bolt", labelField: "name", columns: ["name", "startsAt", "endsAt"] },
  { key: "automations", label: "Automations", group: "Marketing", icon: "gauge", labelField: "name", columns: ["name", "enabled"] },
  { key: "popups", label: "Popups", group: "Marketing", icon: "image", labelField: "title", columns: ["title", "active"] },
  { key: "notifications", label: "Notifications", group: "Marketing", icon: "message", labelField: "title", columns: ["title", "channel"] },
  { key: "push_templates", label: "Push templates", group: "Marketing", icon: "message", labelField: "name", columns: ["name"] },
  { key: "sms_templates", label: "SMS templates", group: "Marketing", icon: "message", labelField: "name", columns: ["name"] },
  { key: "email_templates", label: "Email templates", group: "Marketing", icon: "message", labelField: "name", columns: ["name", "subject"] },
  { key: "price_alerts", label: "Price alerts", group: "Marketing", icon: "tag", labelField: "email", columns: ["email", "productId"] },
  { key: "back_in_stock", label: "Back-in-stock alerts", group: "Marketing", icon: "box", labelField: "email", columns: ["email", "productId"] },
  { key: "search_terms", label: "Search terms", group: "Marketing", icon: "search", labelField: "term", columns: ["term", "results", "createdAt"] },
  // ——— System
  { key: "redirects", label: "URL redirects", group: "System", icon: "swap", labelField: "from", columns: ["from", "to", "type"] },
  { key: "webhooks", label: "Webhooks", group: "System", icon: "gauge", labelField: "name", columns: ["name", "url", "active"] },
  { key: "webhook_logs", label: "Webhook log", group: "System", icon: "clock", labelField: "eventName", columns: ["eventName", "status", "createdAt"] },
  { key: "integrations", label: "Integrations", group: "System", icon: "gauge", labelField: "name", columns: ["name", "enabled"] },
  { key: "translations", label: "Translations", group: "System", icon: "message", labelField: "key", columns: ["key", "locale"] },
  { key: "error_logs", label: "Error log", group: "System", icon: "close", labelField: "message", columns: ["message", "createdAt"] },
  { key: "data_requests", label: "Data requests", group: "System", icon: "shield", labelField: "email", columns: ["email", "type", "status"] },
  { key: "backups", label: "Backups", group: "System", icon: "box", labelField: "name", columns: ["name", "createdAt"] },
];

export const META_BY_KEY: Record<string, CollectionMeta> = Object.fromEntries(
  COLLECTIONS.map((c) => [c.key, c]),
);

export function metaFor(key: string): CollectionMeta {
  return (
    META_BY_KEY[key] ?? {
      key,
      label: key.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
      group: "System",
      icon: "grid",
      labelField: "name",
      columns: [],
    }
  );
}

/** Collections the dashboard never syncs or lists for editing. */
export const HIDDEN_COLLECTIONS = new Set([
  "audit_logs",
  "revisions",
]);
