import { NavLink, Link } from "react-router-dom";
import type { ReactNode } from "react";
import { AdminProvider, useAdmin } from "@/admin/AdminContext";

/*
 * "Ops Central" shell for the marketplace operations consoles, ported from
 * ../web ui ux design/daraz_nepal_central_enterprise_admin_console_operations_suite
 * (and its sibling exports). Dark sidebar, top bar with environment chip,
 * shared card/table primitives the consoles reuse.
 */

export const OPS_NAV = [
  { to: "/admin/ops", label: "Command Center", icon: "fa-gauge-high", end: true, section: "Operations" },
  { to: "/admin/ops/catalog", label: "Catalog & Stock", icon: "fa-boxes-stacked", section: "Operations" },
  { to: "/admin/ops/orders", label: "Orders Fulfillment", icon: "fa-truck-ramp-box", section: "Operations" },
  { to: "/admin/ops/campaigns", label: "Campaign Orchestrator", icon: "fa-bolt", section: "Growth" },
  { to: "/admin/ops/vouchers", label: "Voucher & Coin Pools", icon: "fa-ticket", section: "Growth" },
  { to: "/admin/ops/logistics/dex", label: "DEX 77-District Matrix", icon: "fa-map-location-dot", section: "Logistics" },
  { to: "/admin/ops/logistics/3pl", label: "3PL Courier Overflow", icon: "fa-shuffle", section: "Logistics" },
  { to: "/admin/ops/finance/commissions", label: "Commissions & Payouts", icon: "fa-coins", section: "Finance" },
  { to: "/admin/ops/sellers/kyc", label: "Seller KYC Queue", icon: "fa-id-card-clip", section: "Trust & Sellers" },
  { to: "/admin/ops/sellers/mall", label: "Brand / Mall Approvals", icon: "fa-certificate", section: "Trust & Sellers" },
  { to: "/admin/ops/risk", label: "Trust & Bot Guard", icon: "fa-shield-halved", section: "Trust & Sellers" },
] as const;

export function OpsSection({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <OpsLayout>{children}</OpsLayout>
    </AdminProvider>
  );
}

export function OpsLayout({ children }: { children: ReactNode }) {
  const { isAdmin, ready, denied, syncStatus } = useAdmin();
  if (!ready)
    return (
      <div className="grid min-h-screen place-items-center bg-sidebar-bg text-sm text-slate-400">
        Checking your ops access…
      </div>
    );
  if (!isAdmin)
    return (
      <div className="mx-auto grid min-h-screen max-w-md place-items-center px-4">
        <div className="w-full rounded-2xl bg-white p-8 text-center shadow-lg">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-orange-50 text-2xl">
            🔐
          </span>
          <h1 className="mt-4 text-lg font-bold">Ops access required</h1>
          <p className="mt-1 text-sm text-slate-500">{denied || "Please sign in."}</p>
          <div className="mt-5 flex justify-center gap-3">
            <Link to="/auth" className="rounded-lg bg-[#f85606] px-5 py-2.5 text-sm font-bold text-white">
              Sign in
            </Link>
            <Link to="/" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-600">
              Back to store
            </Link>
          </div>
        </div>
      </div>
    );
  const sections = [...new Set(OPS_NAV.map((n) => n.section))];
  return (
    <div className="flex min-h-screen bg-[#f1f0ef]">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-sidebar-border bg-sidebar-bg text-slate-300">
        <Link to="/admin" className="flex items-center gap-2.5 border-b border-white/5 px-4 py-4">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f85606] text-sm text-white">
            <i className="fa-solid fa-tower-broadcast" />
          </span>
          <span>
            <span className="block text-[13px] font-black leading-tight text-white">
              Ops Central
            </span>
            <span className="block text-[9px] uppercase tracking-widest text-slate-500">
              Gulmeli Marketplace
            </span>
          </span>
        </Link>
        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {sections.map((section) => (
            <div key={section}>
              <p className="mb-1 px-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
                {section}
              </p>
              <div className="space-y-0.5">
                {OPS_NAV.filter((n) => n.section === section).map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    end={"end" in n ? n.end : false}
                    className={({ isActive }) =>
                      `group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                        isActive
                          ? "bg-primary text-white shadow-sm"
                          : "text-slate-300 hover:bg-sidebar-hover hover:text-white"
                      }`
                    }
                  >
                    <i className={`fa-solid ${n.icon} w-4 text-center text-[11px]`} />
                    {n.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/5 px-4 py-3 text-[10px] text-slate-500">
          <p className="truncate">{syncStatus || "Session active"}</p>
          <Link to="/" className="mt-1 inline-flex items-center gap-1 hover:text-white">
            <i className="fa-solid fa-arrow-left text-[9px]" /> Back to storefront
          </Link>
        </div>
      </aside>

      <div className="ml-64 min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-outline-variant bg-white/90 px-6 py-3 backdrop-blur">
          <h1 className="text-sm font-black text-on-surface">
            Marketplace Operations Suite
          </h1>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
            <i className="fa-solid fa-circle-dot mr-1 animate-pulse text-[7px]" />
            LIVE
          </span>
          <div className="ml-auto flex items-center gap-4 text-xs text-gray-500">
            <span className="hidden md:inline">
              <i className="fa-regular fa-clock mr-1" /> Kathmandu · UTC+5:45
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-orange-100 text-[11px] font-black text-[#d04402]">
              OP
            </span>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

/* ---------- shared console primitives ---------- */

export function OpsPageHead({
  title,
  subtitle,
  demo,
  children,
}: {
  title: string;
  subtitle?: string;
  demo?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-headline-xl flex items-center gap-2 text-on-surface">
          {title}
          {demo && (
            <span className="rounded bg-amber-200/70 px-1.5 py-0.5 align-middle text-[9px] font-black uppercase tracking-wider text-amber-900">
              Demo data
            </span>
          )}
        </h2>
        {subtitle && <p className="mt-0.5 text-xs text-on-surface-variant">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  tone = "up",
  icon,
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: "up" | "down" | "warn" | "flat";
  icon: string;
}) {
  const toneClass =
    tone === "up"
      ? "text-emerald-600"
      : tone === "down"
        ? "text-rose-600"
        : tone === "warn"
          ? "text-amber-600"
          : "text-gray-400";
  return (
    <div className="rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
          {label}
        </p>
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-orange-50 text-[#f85606]">
          <i className={`fa-solid ${icon} text-xs`} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-black text-on-surface">{value}</p>
      {delta && <p className={`mt-0.5 text-[11px] font-semibold ${toneClass}`}>{delta}</p>}
    </div>
  );
}

export function OpsTable({
  head,
  children,
}: {
  head: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant bg-white shadow-sm">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead className="bg-surface-container-low text-[10px] uppercase tracking-wider text-on-surface-variant">
          <tr>
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-3 font-black">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/60">{children}</tbody>
      </table>
    </div>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: "live" | "warn" | "bad" | "ok" | "muted";
  children: ReactNode;
}) {
  const map = {
    live: "bg-emerald-100 text-emerald-800",
    warn: "bg-amber-100 text-amber-800",
    bad: "bg-rose-100 text-rose-700",
    ok: "bg-sky-100 text-sky-800",
    muted: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${map[tone]}`}>
      {children}
    </span>
  );
}

export function BurnBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className={`h-full rounded-full ${
          pct > 80 ? "bg-rose-500" : pct > 50 ? "bg-[#f85606]" : "bg-emerald-500"
        }`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}
