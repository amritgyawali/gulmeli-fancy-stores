import { NavLink, Link } from "react-router-dom";
import type { ReactNode } from "react";
import { AdminProvider, useAdmin } from "@/admin/AdminContext";
import { Icon } from "@/components/Icon";

/*
 * "Ops Central" shell for the marketplace operations consoles, ported from
 * ../web ui ux design/daraz_nepal_central_enterprise_admin_console_operations_suite
 * (and its sibling exports). Dark sidebar, top bar with environment chip,
 * shared card/table primitives the consoles reuse.
 */

export const OPS_NAV = [
  { to: "/admin/ops", label: "Command Center", icon: "gauge", end: true, section: "Operations" },
  { to: "/admin/ops/catalog", label: "Catalog & Stock", icon: "boxes", section: "Operations" },
  { to: "/admin/ops/orders", label: "Orders Fulfillment", icon: "truck", section: "Operations" },
  { to: "/admin/ops/campaigns", label: "Campaign Orchestrator", icon: "bolt", section: "Growth" },
  { to: "/admin/ops/vouchers", label: "Voucher & Coin Pools", icon: "ticket", section: "Growth" },
  { to: "/admin/ops/logistics/dex", label: "DEX 77-District Matrix", icon: "map", section: "Logistics" },
  { to: "/admin/ops/logistics/3pl", label: "3PL Courier Overflow", icon: "shuffle", section: "Logistics" },
  { to: "/admin/ops/finance/commissions", label: "Commissions & Payouts", icon: "coins", section: "Finance" },
  { to: "/admin/ops/sellers/kyc", label: "Seller KYC Queue", icon: "idCard", section: "Trust & Sellers" },
  { to: "/admin/ops/sellers/mall", label: "Brand / Mall Approvals", icon: "badgeCheck", section: "Trust & Sellers" },
  { to: "/admin/ops/risk", label: "Trust & Bot Guard", icon: "shield", section: "Trust & Sellers" },
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
      <div className="grid min-h-screen place-items-center bg-shell text-sm text-shell-text">
        Checking your ops access…
      </div>
    );
  if (!isAdmin)
    return (
      <div className="mx-auto grid min-h-screen max-w-md place-items-center px-4">
        <div className="w-full rounded-md border border-line bg-raised p-8 text-center">
          <Icon name="lock" size={32} strokeWidth={1.4} className="mx-auto text-ink-faint" />
          <h1 className="mt-4 text-lg font-semibold text-ink">Ops access required</h1>
          <p className="mt-1 text-sm text-ink-muted">{denied || "Please sign in."}</p>
          <div className="mt-5 flex justify-center gap-3">
            <Link to="/auth" className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong">
              Sign in
            </Link>
            <Link to="/" className="rounded-md border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:border-brand hover:text-brand">
              Back to store
            </Link>
          </div>
        </div>
      </div>
    );
  const sections = [...new Set(OPS_NAV.map((n) => n.section))];
  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="dark-surface fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-shell-line bg-shell text-shell-text">
        <Link to="/admin" className="flex items-center gap-2.5 border-b border-white/5 px-4 py-4">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brand text-white">
            <Icon name="broadcast" size={17} />
          </span>
          <span>
            <span className="block text-sm font-semibold leading-tight text-white">
              Ops Central
            </span>
            <span className="block text-2xs uppercase tracking-wider text-ink-faint">
              Marketplace
            </span>
          </span>
        </Link>
        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {sections.map((section) => (
            <div key={section}>
              <p className="mb-1 px-2 text-2xs font-semibold uppercase tracking-wider text-ink-faint">
                {section}
              </p>
              <div className="space-y-0.5">
                {OPS_NAV.filter((n) => n.section === section).map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    end={"end" in n ? n.end : false}
                    className={({ isActive }) =>
                      `group flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm font-medium ${
                        isActive
                          ? "bg-brand text-white"
                          : "text-shell-text hover:bg-shell-hover hover:text-white"
                      }`
                    }
                  >
                    <Icon name={n.icon} size={16} className="shrink-0" />
                    {n.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-shell-line px-4 py-3 text-xs text-ink-faint">
          <p className="truncate">{syncStatus || "Session active"}</p>
          <Link to="/" className="mt-1 inline-flex items-center gap-1.5 hover:text-white">
            <Icon name="arrowLeft" size={13} />
            Back to storefront
          </Link>
        </div>
      </aside>

      <div className="ml-64 min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-raised px-6 py-3">
          <h1 className="text-base font-semibold text-ink">Marketplace operations</h1>
          <span className="ml-auto hidden items-center gap-1.5 text-xs text-ink-muted md:inline-flex">
            <Icon name="clock" size={13} />
            Kathmandu · UTC+5:45
          </span>
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
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-ink">
          {title}
          {demo && (
            <span className="rounded-sm bg-caution-soft px-2 py-0.5 align-middle text-2xs font-semibold uppercase tracking-wide text-caution">
              Demo data
            </span>
          )}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
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
      ? "text-positive"
      : tone === "down"
        ? "text-critical"
        : tone === "warn"
          ? "text-caution"
          : "text-ink-faint";
  return (
    <div className="rounded-md border border-line bg-raised p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-2xs font-semibold uppercase tracking-wide text-ink-muted">
          {label}
        </p>
        <Icon name={icon} size={17} className="shrink-0 text-ink-faint" />
      </div>
      <p className="tnum mt-2 text-2xl font-semibold text-ink">{value}</p>
      {delta && <p className={`tnum mt-0.5 text-xs font-medium ${toneClass}`}>{delta}</p>}
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
    <div className="overflow-x-auto rounded-md border border-line bg-raised">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-line bg-sunken text-2xs uppercase tracking-wide text-ink-muted">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="whitespace-nowrap px-4 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
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
    live: "bg-positive-soft text-positive",
    warn: "bg-caution-soft text-caution",
    bad: "bg-critical-soft text-critical",
    ok: "bg-info-soft text-info",
    muted: "bg-sunken text-ink-muted",
  };
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-2 py-0.5 text-2xs font-semibold ${map[tone]}`}>
      {children}
    </span>
  );
}

export function BurnBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div
        className={`h-full rounded-full ${
          pct > 80 ? "bg-critical" : pct > 50 ? "bg-brand" : "bg-positive"
        }`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}
