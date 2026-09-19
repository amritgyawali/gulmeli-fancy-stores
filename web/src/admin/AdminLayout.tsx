import { NavLink, Outlet, Link } from "react-router-dom";
import { AdminProvider, useAdmin } from "./AdminContext";
import { Icon } from "@/components/Icon";
import { metaFor } from "./resources";

const PRIMARY = [
  { to: "/admin", label: "Overview", icon: "chart", end: true },
  { to: "/admin/ops", label: "Ops Central", icon: "gauge" },
  { to: "/admin/products", label: "Products", icon: "grid" },
  { to: "/admin/orders", label: "Orders board", icon: "box" },
  { to: "/admin/media", label: "Media (Cloudinary)", icon: "image" },
  { to: "/admin/customers", label: "Customers", icon: "users" },
  { to: "/admin/analytics", label: "Analytics", icon: "chart" },
  { to: "/admin/reports", label: "Reports & export", icon: "download" },
];
const SECONDARY = [
  { to: "/admin/trash", label: "Trash", icon: "trash" },
  { to: "/admin/settings", label: "Store settings", icon: "settings" },
];

export function AdminLayout() {
  return (
    <AdminProvider>
      <Shell />
    </AdminProvider>
  );
}

function Shell() {
  const { isAdmin, ready, denied, syncStatus, signOut, snapshot } = useAdmin();
  if (!ready && isAdmin !== false)
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-ink-faint">
        Checking your admin access…
      </div>
    );
  if (!isAdmin)
    return (
      <div className="mx-auto grid min-h-screen max-w-md place-items-center px-4">
        <div className="w-full rounded-md border border-line bg-raised p-8 text-center">
          <Icon name="lock" size={32} strokeWidth={1.4} className="mx-auto text-ink-faint" />
          <h1 className="mt-4 text-lg font-semibold text-ink">Admin access required</h1>
          <p className="mt-1 text-sm text-ink-muted">{denied || "Please sign in."}</p>
          <div className="mt-5 flex justify-center gap-3">
            <Link to="/auth" className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white">
              Sign in
            </Link>
            <Link to="/" className="rounded-lg border border-line px-5 py-2.5 text-sm font-bold text-ink-soft">
              Back to store
            </Link>
          </div>
        </div>
      </div>
    );

  const liveKeys = Object.keys(snapshot).filter(
    (k) => !["audit_logs", "revisions"].includes(k),
  );
  const resourceKeys = [
    ...new Set([
      "products", "orders", "categories", "brands", "collections", "bundles",
      "inventory_movements", "pages", "blog_posts", "faqs", "banners",
      "menu_items", "homepage_sections", "media", "carts", "wishlists",
      "reviews", "returns", "preorders", "coupons", "gift_cards", "customers",
      "customer_groups", "segments", "admin_users", "roles", "referrals",
      "deliveries", "couriers", "pickup_stores", "shipping_rates",
      "shipping_zones", "locations", "suppliers", "purchase_orders",
      "expenses", "transactions", "tax_rates", "currencies", "payment_methods",
      "campaigns", "promotions", "flash_sales", "automations", "popups",
      "notifications", "push_templates", "sms_templates", "email_templates",
      "price_alerts", "back_in_stock", "search_terms", "redirects", "webhooks",
      "webhook_logs", "integrations", "translations", "error_logs",
      "data_requests", "backups",
      ...liveKeys,
    ]),
  ];

  return (
    <div className="flex min-h-screen bg-sunken">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-slate-950 p-4 text-slate-300">
        <Link to="/" className="mb-5 flex items-center gap-2 px-2 text-white">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brand text-white"><Icon name="store" size={17} /></span>
          <span>
            <span className="block text-sm font-semibold leading-tight">Gulmeli</span>
            <span className="block text-[10px] text-ink-faint">Store control</span>
          </span>
        </Link>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {PRIMARY.map((link) => (
            <SideLink key={link.to} {...link} end={link.end} />
          ))}
          <p className="!mt-4 px-2 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
            All data
          </p>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-white/10">
              <Icon name="database" size={16} /> Collections
              <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                {resourceKeys.length}
              </span>
            </summary>
            <div className="mt-1 space-y-0.5 pl-2">
              {resourceKeys.map((key) => (
                <SideLink
                  key={key}
                  to={`/admin/r/${key}`}
                  label={metaFor(key).label}
                  icon={metaFor(key).icon}
                  small
                />
              ))}
            </div>
          </details>
          <p className="!mt-4 px-2 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
            More
          </p>
          {SECONDARY.map((link) => (
            <SideLink key={link.to} {...link} />
          ))}
        </nav>
        <div className="mt-3 space-y-3 px-1 text-xs">
          <p className="text-ink-muted">{syncStatus}</p>
          <button
            onClick={() => void signOut().then(() => (window.location.hash = "#/"))}
            className="flex items-center gap-2 font-semibold text-ink-faint hover:text-white"
          >
            <Icon name="logout" size={14} /> Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}

function SideLink({
  to,
  label,
  icon,
  end,
  small,
}: {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
  small?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-lg font-semibold transition ${
          small ? "px-3 py-1.5 text-[13px]" : "px-3 py-2 text-sm"
        } ${
          isActive
            ? "bg-brand text-white"
            : "text-slate-300 hover:bg-white/10 hover:text-white"
        }`
      }
    >
      <Icon name={icon} size={small ? 13 : 16} />
      {label}
    </NavLink>
  );
}

export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
