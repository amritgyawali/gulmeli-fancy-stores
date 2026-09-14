import { useMemo, useState } from "react";
import { useAdmin } from "./AdminContext";
import { Icon } from "@/components/Icon";
import { rs, shortDate } from "@/lib/format";
import type { AdminRecord } from "@/lib/admin-api";

const COLUMNS: { key: string; label: string; statuses: string[] }[] = [
  { key: "pending", label: "New", statuses: ["pending", "placed"] },
  { key: "processing", label: "Processing", statuses: ["confirmed", "processing", "packed"] },
  { key: "shipped", label: "Shipped", statuses: ["ready_to_ship", "shipped", "out_for_delivery"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
];

function columnOf(order: AdminRecord) {
  const status = String(order.status ?? "pending").toLowerCase();
  return COLUMNS.find((c) => c.statuses.includes(status)) ?? COLUMNS[0];
}

export function AdminOrders() {
  const { all, setOrderStatus } = useAdmin();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const orders = all("orders");

  const byColumn = useMemo(() => {
    const map = new Map<string, AdminRecord[]>(COLUMNS.map((c) => [c.key, []]));
    for (const order of orders) map.get(columnOf(order).key)!.push(order);
    return map;
  }, [orders]);

  const advance = async (order: AdminRecord, direction: -1 | 1) => {
    const from = COLUMNS.indexOf(columnOf(order));
    const to = Math.min(COLUMNS.length - 2, Math.max(0, from + direction));
    if (to === from) return;
    const target = COLUMNS[to].statuses[0];
    setBusy(order.id);
    setError("");
    try {
      await setOrderStatus(order, target);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-black">Orders</h1>
        <p className="text-sm text-slate-500">
          App and web orders, live. Status changes sync to every customer device.
        </p>
      </header>
      {error && (
        <p className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>
      )}
      <div className="grid gap-4 xl:grid-cols-5">
        {COLUMNS.map((column) => (
          <div key={column.key} className="min-w-0 rounded-2xl bg-slate-200/60 p-3">
            <h2 className="mb-3 flex items-center justify-between px-1 text-xs font-black uppercase tracking-wide text-slate-500">
              {column.label}
              <span className="rounded-full bg-white px-2 py-0.5">{byColumn.get(column.key)?.length ?? 0}</span>
            </h2>
            <div className="space-y-3">
              {(byColumn.get(column.key) ?? []).map((order) => (
                <article key={order.id} className="rounded-xl bg-white p-3.5 shadow-sm">
                  <p className="truncate text-sm font-bold">{String(order.customerName ?? "Customer")}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                    {(Array.isArray(order.lines) ? order.lines : [])
                      .map((line: { name?: string; quantity?: number }) =>
                        `${line.quantity ?? 1}× ${line.name ?? "item"}`,
                      )
                      .join(", ") || order.id}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-black">{rs(Number(order.total ?? 0))}</span>
                    <span className="text-[10px] text-slate-400">
                      {shortDate(String(order.createdAt ?? order.placedAt ?? ""))}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-1 border-t border-slate-50 pt-2">
                    {column.key !== "delivered" && column.key !== "cancelled" && (
                      <button
                        disabled={busy === order.id}
                        onClick={() => void advance(order, 1)}
                        className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        Advance <Icon name="chevron" size={11} />
                      </button>
                    )}
                    {["pending", "processing"].includes(column.key) && (
                      <button
                        disabled={busy === order.id}
                        onClick={() => void advance(order, -1)}
                        className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                      >
                        <Icon name="chevron" size={11} className="rotate-180" /> Back
                      </button>
                    )}
                    {column.key === "pending" && (
                      <button
                        disabled={busy === order.id}
                        onClick={() => void setOrderStatus(order, "cancelled").catch((e) => setError(String(e)))}
                        className="ml-auto rounded bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </article>
              ))}
              {!(byColumn.get(column.key) ?? []).length && (
                <p className="py-6 text-center text-xs text-slate-400">—</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
