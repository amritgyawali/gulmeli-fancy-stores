import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { ProductCard } from "@/components/ProductCard";
import { Icon } from "@/components/Icon";
import type { Product } from "@/lib/types";

type Sort = "relevance" | "discount" | "price-asc" | "price-desc";

export function SearchPage() {
  const [params] = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  const { products, catalogReady } = useShop();
  const [sort, setSort] = useState<Sort>("relevance");
  const [category, setCategory] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  const results = useMemo(() => {
    const needle = query.toLowerCase();
    let list = products;
    if (needle)
      list = list.filter((p) =>
        [p.name, p.category, p.brand, p.store].some((field) =>
          String(field ?? "")
            .toLowerCase()
            .includes(needle),
        ),
      );
    if (category) list = list.filter((p) => p.category === category);
    if (maxPrice != null) list = list.filter((p) => p.price <= maxPrice);
    const sorters: Record<Sort, (a: Product, b: Product) => number> = {
      relevance: (a, b) =>
        (b.sold ?? 0) - (a.sold ?? 0) || Number.parseInt(b.discount ?? "0", 10) - Number.parseInt(a.discount ?? "0", 10),
      discount: (a, b) =>
        Number.parseInt(b.discount ?? "0", 10) - Number.parseInt(a.discount ?? "0", 10),
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
    };
    return [...list].sort(sorters[sort]);
  }, [products, query, category, maxPrice, sort]);

  const categories = useMemo(
    () =>
      [...new Set(
        products
          .filter((p) => !query || p.name.toLowerCase().includes(query.toLowerCase()))
          .map((p) => p.category),
      )].sort(),
    [products, query],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="h-fit space-y-4 lg:sticky lg:top-40">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">
            Category
          </h3>
          <ul className="space-y-1 text-sm">
            <li>
              <button
                onClick={() => setCategory(null)}
                className={`w-full rounded-lg px-3 py-1.5 text-left font-semibold ${!category ? "bg-orange-50 text-[#f85606]" : "text-slate-600 hover:bg-slate-50"}`}
              >
                All ({results.length + (category ? 0 : 0)})
              </button>
            </li>
            {categories.map((c) => (
              <li key={c}>
                <button
                  onClick={() => setCategory(c === category ? null : c)}
                  className={`w-full rounded-lg px-3 py-1.5 text-left font-semibold ${category === c ? "bg-orange-50 text-[#f85606]" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  {c} ({products.filter((p) => p.category === c && (!query || p.name.toLowerCase().includes(query.toLowerCase()))).length})
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
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
        <Link to="/" className="block rounded-xl border border-slate-200 bg-white py-2 text-center text-xs font-bold text-slate-500 hover:bg-slate-50">
          ← Back to home feed
        </Link>
      </aside>

      <div className="min-w-0">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <h1 className="text-xl font-black">
              {query ? (
                <>
                  Results for <span className="text-[#f85606]">“{query}”</span>
                </>
              ) : (
                "All products"
              )}
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">{results.length} item(s) found</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Icon name="grid" size={14} /> Sort
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-bold text-slate-700 outline-none"
            >
              <option value="relevance">Relevance</option>
              <option value="discount">Biggest discount</option>
              <option value="price-asc">Price: low → high</option>
              <option value="price-desc">Price: high → low</option>
            </select>
          </label>
        </header>

        {!catalogReady ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : results.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white py-24 text-center shadow-sm">
            <p className="text-4xl">🔍</p>
            <h2 className="mt-3 font-black text-slate-700">No products matched</h2>
            <p className="mt-1 text-sm text-slate-400">
              Try “belt”, “watch”, “groceries” — or{" "}
              <Link to="/" className="font-bold text-[#f85606]">
                browse the home feed
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
