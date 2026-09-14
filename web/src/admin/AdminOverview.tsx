import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAdmin } from "./AdminContext";
import { Panel } from "./AdminLayout";
import { rs, shortDate } from "@/lib/format";

export function AdminOverview() {
  const { all } = useAdmin();
  const stats = useMemo(() => {
    const products = all("products");
    const orders = all("orders");
    const live = orders.filter((o) => o.status !== "cancelled");
    return {
      products: products.length,
      lowStock: products.filter((p) => Number(p.stock ?? 0) < 5).length,
      revenue: live.reduce((n, o) => n + Number(o.total ?? 0), 0),
      orders: orders.length,
      pending: orders.filter((o) =>
        ["pending", "confirmed", "processing", "placed"].includes(
          String(o.status ?? "").toLowerCase(),
        ),
      ).length,
      recent: [...orders]
        .sort((a, b) =>
          String(b.createdAt ?? b.placedAt ?? "").localeCompare(
            String(a.createdAt ?? a.placedAt ?? ""),
          ),
        )
        .slice(0, 6),
      lowStockList: products
        .filter((p) => Number(p.stock ?? 0) < 5)
        .sort((a, b) => Number(a.stock ?? 0) - Number(b.stock ?? 0))
        .slice(0, 6),
    };
  }, [all]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black">Overview</h1>
        <p className="text-sm text-slate-500">
          Live store data — the same documents the mobile dashboard reads and writes.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue (live orders)" value={rs(stats.revenue)} to="/admin/orders" />
        <Stat label="Orders" value={String(stats.orders)} hint={`${stats.pending} to fulfil`} to="/admin/orders" />
        <Stat label="Products" value={String(stats.products)} hint={`${stats.lowStock} low stock`} to="/admin/products" />
        <Stat label="Stock alerts" value={String(stats.lowStock)} hint="below 5 units" to="/admin/products" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Recent orders">
          {stats.recent.length ? (
            <ul className="divide-y divide-slate-100 text-sm">
              {stats.recent.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {String(order.customerName ?? order.number ?? order.id)}
                    </p>
                    <p className="text-xs text-slate-400">{shortDate(String(order.createdAt ?? order.placedAt))}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold capitalize text-slate-600">
                    {String(order.status)}
                  </span>
                  <span className="w-20 shrink-0 text-right font-extrabold">
                    {rs(Number(order.total ?? 0))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">No orders yet.</p>
          )}
        </Panel>
        <Panel title="Low stock">
          {stats.lowStockList.length ? (
            <ul className="divide-y divide-slate-100 text-sm">
              {stats.lowStockList.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate font-medium">{String(product.name)}</span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      Number(product.stock) === 0
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {Number(product.stock)} left
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">
              Every product has healthy stock. 🎉
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  to,
}: {
  label: string;
  value: string;
  hint?: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </Link>
  );
}
