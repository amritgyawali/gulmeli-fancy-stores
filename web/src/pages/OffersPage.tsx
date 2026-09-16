import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { ProductCard } from "@/components/ProductCard";
import { Icon } from "@/components/Icon";

type Sort = "popular" | "discount" | "price-asc" | "price-desc" | "newest";

export function OffersPage() {
  const { offerProducts, ui, setFilter } = useShop();
  const [query, setQuery] = useState(ui.offerQuery);
  const [sort, setSort] = useState<Sort>("popular");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const categories = useMemo(
    () => [...new Set(offerProducts.map((p) => p.category))].sort(),
    [offerProducts],
  );
  const [category, setCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = offerProducts.filter((p) =>
      query.trim()
        ? p.name.toLowerCase().includes(query.trim().toLowerCase())
        : true,
    );
    if (category) list = list.filter((p) => p.category === category);
    if (maxPrice != null) list = list.filter((p) => p.price <= maxPrice);
    const sorters: Record<Sort, (a: typeof list[number], b: typeof list[number]) => number> = {
      popular: (a, b) => (b.sold ?? 0) - (a.sold ?? 0),
      discount: (a, b) =>
        Number.parseInt(b.discount ?? "0", 10) - Number.parseInt(a.discount ?? "0", 10),
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      newest: (a, b) => String(b.id).localeCompare(String(a.id)),
    };
    return [...list].sort(sorters[sort]);
  }, [offerProducts, query, category, maxPrice, sort]);

  return (
    <div>
      <div className="mb-5 overflow-hidden rounded-[2px] ribbon-gradient p-8 text-white shadow-md">
        <div className="flex items-center gap-2 text-xs font-black tracking-[0.25em]">
          <Icon name="tag" size={14} /> BUY MORE SAVE MORE
        </div>
        <h1 className="mt-2 text-3xl font-black lg:text-4xl">
          Extra discounts, the more you add
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-white/85">
          Tiered savings applied at checkout, stackable with GULMELI10 (10% off
          Rs. 500+, max Rs. 100). Stock updates in real time across app and web.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        {/* Sidebar filters */}
        <aside className="h-fit space-y-4 rounded-[2px] border border-[#e0e0e0] bg-white p-4 shadow-sm lg:sticky lg:top-40">
          <div>
            <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">
              Category
            </h3>
            <ul className="space-y-1 text-sm">
              <li>
                <button
                  onClick={() => setCategory(null)}
                  className={`w-full rounded-lg px-3 py-1.5 text-left font-semibold ${!category ? "bg-orange-50 text-[var(--store-primary-text)]" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  All offers ({offerProducts.length})
                </button>
              </li>
              {categories.map((c) => (
                <li key={c}>
                  <button
                    onClick={() => setCategory(c === category ? null : c)}
                    className={`w-full rounded-lg px-3 py-1.5 text-left font-semibold ${category === c ? "bg-orange-50 text-[var(--store-primary-text)]" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    {c} ({offerProducts.filter((p) => p.category === c).length})
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">
              Max price
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {[null, 500, 1000, 2000, 5000].map((v) => (
                <button
                  key={String(v)}
                  onClick={() => setMaxPrice(v)}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${maxPrice === v ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {v == null ? "Any" : `Rs.${v.toLocaleString()}`}
                </button>
              ))}
            </div>
          </div>
          <Link
            to="/"
            className="block rounded-lg border border-[var(--store-border)] py-2 text-center text-xs font-bold text-[var(--store-muted)] hover:bg-slate-50"
          >
            ← Back to home feed
          </Link>
        </aside>

        {/* Results */}
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[2px] border border-[#e0e0e0] bg-white p-3 shadow-sm">
            <div className="flex min-w-52 flex-1 items-center gap-2 rounded-lg border border-[var(--store-border)] px-3">
              <Icon name="search" size={14} className="text-slate-400" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setFilter("offerQuery", event.target.value);
                }}
                placeholder="Search in offers"
                aria-label="Search offers"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--store-muted)]">
              Sort
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                className="rounded-lg border border-[var(--store-border)] bg-[var(--store-surface)] px-2 py-2 text-sm font-bold outline-none"
              >
                <option value="popular">Most popular</option>
                <option value="discount">Biggest discount</option>
                <option value="price-asc">Price: low → high</option>
                <option value="price-desc">Price: high → low</option>
                <option value="newest">Newest</option>
              </select>
            </label>
            <span className="text-sm text-slate-400">{filtered.length} results</span>
          </div>

          {filtered.length ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} variant="flash" />
              ))}
            </div>
          ) : (
            <div className="rounded-[2px] border border-[#e0e0e0] bg-white py-20 text-center text-sm text-slate-400 shadow-sm">
              Nothing matches these filters — try clearing price or category.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
