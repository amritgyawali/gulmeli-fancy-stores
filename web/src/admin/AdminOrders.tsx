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
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-sm text-ink-muted">
          App and web orders, live. Status changes sync to every customer device.
        </p>
      </header>
      {error && (
        <p className="rounded-lg bg-critical-soft p-3 text-sm font-semibold text-critical">{error}</p>
      )}
      <div className="grid gap-4 xl:grid-cols-5">
        {COLUMNS.map((column) => (
          <div key={column.key} className="min-w-0 rounded-lg bg-line/60 p-3">
            <h2 className="mb-3 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {column.label}
              <span className="rounded-full bg-white px-2 py-0.5">{byColumn.get(column.key)?.length ?? 0}</span>
            </h2>
            <div className="space-y-3">
              {(byColumn.get(column.key) ?? []).map((order) => (
                <article key={order.id} className="rounded-md bg-white p-3.5 shadow-sm">
                  <p className="truncate text-sm font-bold">{String(order.customerName ?? "Customer")}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">
                    {(Array.isArray(order.lines) ? order.lines : [])
                      .map((line: { name?: string; quantity?: number }) =>
                        `${line.quantity ?? 1}× ${line.name ?? "item"}`,
                      )
                      .join(", ") || order.id}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">{rs(Number(order.total ?? 0))}</span>
                    <span className="text-[10px] text-ink-faint">
                      {shortDate(String(order.createdAt ?? order.placedAt ?? ""))}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-1 border-t border-slate-50 pt-2">
                    {column.key !== "delivered" && column.key !== "cancelled" && (
                      <button
                        disabled={busy === order.id}
                        onClick={() => void advance(order, 1)}
                        className="flex items-center gap-1 rounded bg-positive-soft px-2 py-1 text-[11px] font-bold text-positive hover:bg-positive-soft disabled:opacity-50"
                      >
                        Advance <Icon name="chevronRight" size={11} />
                      </button>
                    )}
                    {["pending", "processing"].includes(column.key) && (
                      <button
                        disabled={busy === order.id}
                        onClick={() => void advance(order, -1)}
                        className="flex items-center gap-1 rounded bg-sunken px-2 py-1 text-[11px] font-bold text-ink-soft hover:bg-line disabled:opacity-50"
                      >
                        <Icon name="chevronRight" size={11} className="rotate-180" /> Back
                      </button>
                    )}
                    {column.key === "pending" && (
                      <button
                        disabled={busy === order.id}
                        onClick={() => void setOrderStatus(order, "cancelled").catch((e) => setError(String(e)))}
                        className="ml-auto rounded bg-critical-soft px-2 py-1 text-[11px] font-bold text-critical hover:bg-critical-soft disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </article>
              ))}
              {!(byColumn.get(column.key) ?? []).length && (
                <p className="py-6 text-center text-xs text-ink-faint">—</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
