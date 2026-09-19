import { useMemo, useState } from "react";
import { useAdmin } from "./AdminContext";
import { rs, shortDate } from "@/lib/format";

export function AdminCustomers() {
  const { all } = useAdmin();
  const [search, setSearch] = useState("");
  // Customer_state rows are private per account under RLS, so the customer
  // list is derived from orders — the same data both dashboards can see.
  const customers = useMemo(() => {
    const map = new Map<
      string,
      { name: string; phone: string; address: string; orders: number; spent: number; last: string }
    >();
    for (const order of all("orders")) {
      const doc = (order.document ?? {}) as Record<string, any>;
      const profile = (order.shippingAddress ? { ...(order.shippingAddress as object), ...(doc.profile ?? {}) } : doc.profile) as Record<string, string>;
      const name = String(order.customerName ?? profile?.name ?? "Customer");
      const phone = String(profile?.phone ?? "");
      const key = `${name}|${phone}`;
      const current = map.get(key) ?? {
        name,
        phone,
        address: String((profile?.address ?? (order.shippingAddress as { line1?: string })?.line1) ?? ""),
        orders: 0,
        spent: 0,
        last: "",
      };
      current.orders += 1;
      current.spent += Number(order.total ?? 0);
      const placedAt = String(order.placedAt ?? order.createdAt ?? "");
      if (placedAt > current.last) current.last = placedAt;
      map.set(key, current);
    }
    return [...map.values()].sort((a, b) => b.last.localeCompare(a.last));
  }, [all]);
  const filtered = customers.filter((customer) =>
    search.trim()
      ? `${customer.name} ${customer.phone}`.toLowerCase().includes(search.trim().toLowerCase())
      : true,
  );

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-sm text-ink-muted">
          Derived from order history — contact details only appear once a customer
          has checked out. Private carts and wishlists stay on each account (RLS).
        </p>
      </header>
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search name or phone"
        className="w-full max-w-sm rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
      />
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Delivery address</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Spent</th>
              <th className="px-4 py-3">Last order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((customer) => (
              <tr key={`${customer.name}|${customer.phone}`} className="hover:bg-brand-soft/40">
                <td className="px-4 py-3 font-semibold">{customer.name}</td>
                <td className="px-4 py-3 text-ink-muted">{customer.phone || "—"}</td>
                <td className="max-w-64 truncate px-4 py-3 text-ink-muted">{customer.address || "—"}</td>
                <td className="px-4 py-3">{customer.orders}</td>
                <td className="px-4 py-3 font-bold">{rs(customer.spent)}</td>
                <td className="px-4 py-3 text-ink-muted">{shortDate(customer.last)}</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center text-sm text-ink-faint">
                  No customers with orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
