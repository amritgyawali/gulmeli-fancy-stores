import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdmin } from "@/admin/AdminContext";
import { OpsPageHead, OpsTable, StatusPill, BurnBar } from "../OpsLayout";
import { catalogSkus } from "@/lib/demo-data";
import { rs } from "@/lib/format";

/* Catalog & stock console — from
   ../web ui ux design/daraz_nepal_catalog_assortment_stock_management_console.
   Live Supabase products lead the table; seeded demo SKUs cover fields the
   live schema does not store (IRD tax, run-rate, reserves). */
export function CatalogConsole() {
  const { snapshot } = useAdmin();
  const [query, setQuery] = useState("");

  const liveRows = useMemo(() => {
    const products = (snapshot.products ?? []) as {
      id?: string;
      name?: string;
      price?: number;
      stock?: number;
      category?: string;
      product_group?: string;
    }[];
    return products.map((p) => ({
      sku: (p.id ?? "").toUpperCase().slice(0, 12) || "—",
      product: p.name ?? "—",
      merchant: "Gulmeli Fancy Stores",
      category: p.category ?? "—",
      irdTax: "—",
      price: Number(p.price ?? 0),
      strike: 0,
      stock: Number(p.stock ?? 0),
      reserved: 0,
      runRate: 0,
      status: "Active" as const,
      live: true,
    }));
  }, [snapshot]);

  const rows = [...liveRows, ...catalogSkus.map((s) => ({ ...s, live: false }))];
  const q = query.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (r) =>
          r.product.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q),
      )
    : rows;

  return (
    <div>
      <OpsPageHead
        title="Catalog Assortment & Stock Console"
        subtitle="Live rows come from Supabase products; reserve, run-rate and tax columns are seeded samples."
        demo
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter SKU / product / category"
          aria-label="Filter catalog"
          className="w-64 rounded border border-line bg-white px-3 py-1.5 text-xs outline-none focus:border-brand"
        />
      </OpsPageHead>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {[
          ["Tracked SKUs", `${rows.length}`],
          ["Out of stock", `${rows.filter((r) => r.stock === 0).length}`],
          ["Low stock (<10)", `${rows.filter((r) => r.stock > 0 && r.stock < 10).length}`],
          ["Avg run-rate", "12.4 / day"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-line bg-white p-3 text-center shadow-sm">
            <p className="text-lg font-semibold text-ink">{value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">{label}</p>
          </div>
        ))}
      </div>

      <OpsTable head={["SKU", "Product & Merchant", "Category & IRD Tax", "Pricing (NPR)", "Stock Distribution", "Velocity", "Status", "Actions"]}>
        {filtered.map((r) => {
          const pct = r.stock > 0 ? Math.min(100, r.stock) : 0;
          return (
            <tr key={`${r.sku}-${r.product}`} className="hover:bg-brand-soft/30">
              <td className="px-4 py-3 font-mono text-[10px] text-ink-muted">{r.sku}</td>
              <td className="px-4 py-3">
                <p className="line-clamp-1 max-w-[260px] font-bold text-ink">{r.product}</p>
                <p className="text-[10px] text-ink-muted">{r.merchant}{!r.live && " · sample"}</p>
              </td>
              <td className="px-4 py-3 text-ink-muted">
                {r.category}
                <span className="block text-[10px]">{r.irdTax}</span>
              </td>
              <td className="px-4 py-3">
                <span className="font-semibold text-brand-strong">{rs(r.price)}</span>
                {r.strike > 0 && (
                  <span className="ml-1 text-[10px] text-ink-faint line-through">{rs(r.strike)}</span>
                )}
              </td>
              <td className="w-44 px-4 py-3">
                <div className="flex items-center justify-between text-[10px] text-ink-muted">
                  <span>{r.stock} on hand</span>
                  {r.reserved > 0 && <span>+{r.reserved} reserved</span>}
                </div>
                <div className="mt-1"><BurnBar pct={pct} /></div>
              </td>
              <td className="px-4 py-3 text-ink-muted">{r.runRate ? `${r.runRate}/day` : "—"}</td>
              <td className="px-4 py-3">
                <StatusPill tone={r.status === "Active" ? "live" : r.status === "Review" ? "warn" : "muted"}>
                  {r.live ? "Live" : r.status}
                </StatusPill>
              </td>
              <td className="px-4 py-3">
                <Link to="/admin/products" className="text-[11px] font-bold text-info hover:underline">
                  Manage
                </Link>
              </td>
            </tr>
          );
        })}
      </OpsTable>
    </div>
  );
}
