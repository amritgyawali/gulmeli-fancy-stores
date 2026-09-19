import { useMemo, useState } from "react";
import { useAdmin } from "./AdminContext";
import { Panel } from "./AdminLayout";
import { rs } from "@/lib/format";
import { Link } from "react-router-dom";

const STATUS_COLORS: Record<string, string> = {
  delivered: "#16a34a",
  shipped: "#0d9488",
  processing: "#d97706",
  pending: "#f59e0b",
  cancelled: "#dc2626",
};

export function AdminAnalytics() {
  const { all } = useAdmin();
  const [range, setRange] = useState(90);

  const data = useMemo(() => {
    const orders = all("orders").filter((o) => o.status !== "cancelled");
    const cutoff = Date.now() - range * 86_400_000;
    const inRange = orders.filter(
      (o) => Date.parse(String(o.placedAt ?? o.createdAt ?? 0)) >= cutoff,
    );
    const revenue = inRange.reduce((n, o) => n + Number(o.total ?? 0), 0);
    // Daily buckets for the sparkline
    const days = Math.min(range, 30);
    const buckets = new Array(days).fill(0);
    for (const o of inRange) {
      const at = Date.parse(String(o.placedAt ?? o.createdAt ?? 0));
      const idx = days - 1 - Math.floor((Date.now() - at) / 86_400_000);
      if (idx >= 0 && idx < days) buckets[idx] += Number(o.total ?? 0);
    }
    const byStatus = new Map<string, number>();
    for (const o of all("orders")) {
      const key = String(o.status ?? "pending");
      byStatus.set(key, (byStatus.get(key) ?? 0) + 1);
    }
    const productRevenue = new Map<string, number>();
    for (const o of inRange)
      for (const line of (o.lines ?? []) as { name: string; unitPrice: number; quantity: number }[])
        productRevenue.set(
          line.name ?? "item",
          (productRevenue.get(line.name ?? "item") ?? 0) +
            Number(line.unitPrice ?? 0) * Number(line.quantity ?? 0),
        );
    const top = [...productRevenue.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const products = all("products");
    const low = products
      .filter((p) => Number(p.stock ?? 0) < 5)
      .sort((a, b) => Number(a.stock ?? 0) - Number(b.stock ?? 0))
      .slice(0, 8);
    return {
      orders: inRange.length,
      revenue,
      aov: inRange.length ? revenue / inRange.length : 0,
      conversion: 0,
      buckets,
      byStatus: [...byStatus.entries()].sort((a, b) => b[1] - a[1]),
      top,
      low,
    };
  }, [all, range]);

  const maxBucket = Math.max(...data.buckets, 1);
  const totalStatus = data.byStatus.reduce((n, [, v]) => n + v, 0) || 1;
  let acc = 0;
  const donut = data.byStatus
    .map(([name, count]) => {
      const start = (acc / totalStatus) * 100;
      acc += count;
      return { name, count, start, width: (count / totalStatus) * 100 };
    })
    .filter((s) => s.width > 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-ink-muted">
            Computed live from orders shared with the mobile dashboard.
          </p>
        </div>
        <div className="flex gap-1 rounded-md bg-white p-1 shadow-sm">
          {[30, 90, 365].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg px-4 py-1.5 text-sm font-bold ${range === r ? "bg-brand text-white" : "text-ink-muted hover:bg-sunken"}`}
            >
              {r === 365 ? "1 year" : `${r / 30} months`}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Revenue" value={rs(data.revenue)} tone="text-positive" />
        <Stat label="Orders" value={String(data.orders)} />
        <Stat label="Average order" value={rs(Math.round(data.aov))} />
        <Stat label="Low-stock products" value={String(data.low.length)} tone="text-critical" />
      </div>

      <Panel title="Revenue over time">
        <div className="flex h-40 items-end gap-1">
          {data.buckets.map((v, i) => (
            <div
              key={i}
              title={rs(v)}
              className="flex-1 rounded-t bg-gradient-to-t from-orange-200 to-[#f85606] transition-all"
              style={{ height: `${Math.max(2, (v / maxBucket) * 100)}%` }}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-faint">Last {Math.min(range, 30)} days</p>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Orders by status">
          {donut.length ? (
            <>
              <div
                className="mx-auto h-40 w-40 rounded-full"
                style={{
                  background: `conic-gradient(${donut
                    .map(
                      (s) =>
                        `${STATUS_COLORS[s.name] ?? "#64748b"} ${s.start}% ${s.start + s.width}%`,
                    )
                    .join(", ")})`,
                }}
              />
              <ul className="mt-4 space-y-1.5 text-sm">
                {data.byStatus.map(([name, count]) => (
                  <li key={name} className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: STATUS_COLORS[name] ?? "#64748b" }}
                    />
                    <span className="flex-1 font-semibold capitalize text-ink-soft">{name}</span>
                    <span className="text-ink-faint">{count}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-ink-faint">No orders yet.</p>
          )}
        </Panel>
        <Panel title="Top products by revenue">
          {data.top.length ? (
            <ul className="space-y-3">
              {data.top.map(([name, value]) => (
                <li key={name}>
                  <div className="flex justify-between text-sm">
                    <span className="truncate font-semibold text-ink">{name}</span>
                    <span className="shrink-0 pl-3 font-semibold">{rs(value)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-sunken">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${(value / (data.top[0][1] || 1)) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-sm text-ink-faint">
              Nothing sold in this window yet.
            </p>
          )}
        </Panel>
      </div>

      <Panel
        title="Low stock watchlist"
        action={
          <Link to="/admin/products" className="text-sm font-bold text-brand">
            Manage products ›
          </Link>
        }
      >
        {data.low.length ? (
          <ul className="divide-y divide-slate-50 text-sm">
            {data.low.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2.5">
                <span className="truncate font-medium">{String(p.name)}</span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    Number(p.stock) === 0
                      ? "bg-critical-soft text-critical"
                      : "bg-caution-soft text-caution"
                  }`}
                >
                  {Number(p.stock)} left
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-ink-faint">All products are well stocked.</p>
        )}
      </Panel>
    </div>
  );
}

function Stat({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
