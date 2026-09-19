import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@/lib/types";
import { rs } from "@/lib/format";
import { Icon } from "./Icon";
import { ProductGrid } from "./ProductCard";

/*
 * The shared listing surface behind /search and /offers.
 *
 * Both pages previously carried their own copy of the same filter sidebar,
 * the same sort <select> and the same results grid, with small differences
 * that were plainly accidental: one used six columns at lg and the other
 * four, one had a price filter above the category list and the other below.
 * They are one component now, so the two pages cannot drift again.
 *
 * The sidebar also no longer disappears on a phone. It used to be a `lg:
 * sticky` aside that simply stacked above the results at small sizes, pushing
 * the first product roughly a screen and a half down. Below `lg` it is a
 * sheet opened from a Filters button, and the button shows how many filters
 * are active.
 */

export type SortKey = "relevance" | "discount" | "price-asc" | "price-desc" | "newest";

const SORT_LABELS: Record<SortKey, string> = {
  relevance: "Most popular",
  discount: "Biggest discount",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  newest: "Newest first",
};

/* Discount read from the two prices, never from the free-text `discount`
   field — that string said things like "Up to 40%" which parsed as 40 for a
   product discounted 12%. */
export const discountOf = (p: Product) =>
  p.originalPrice && p.originalPrice > p.price
    ? 1 - p.price / p.originalPrice
    : 0;

const SORTERS: Record<SortKey, (a: Product, b: Product) => number> = {
  relevance: (a, b) => (b.sold ?? 0) - (a.sold ?? 0) || discountOf(b) - discountOf(a),
  discount: (a, b) => discountOf(b) - discountOf(a),
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  newest: (a, b) =>
    (Date.parse(b.createdAt ?? "") || 0) - (Date.parse(a.createdAt ?? "") || 0) ||
    String(b.id).localeCompare(String(a.id)),
};

const PRICE_STEPS = [500, 1000, 2500, 5000] as const;

export interface ListingState {
  category: string | null;
  maxPrice: number | null;
  inStockOnly: boolean;
  onSaleOnly: boolean;
  sort: SortKey;
}

export const emptyListingState: ListingState = {
  category: null,
  maxPrice: null,
  inStockOnly: false,
  onSaleOnly: false,
  sort: "relevance",
};

export function applyListing(source: Product[], state: ListingState) {
  let list = source;
  if (state.category) list = list.filter((p) => p.category === state.category);
  if (state.maxPrice != null) list = list.filter((p) => p.price <= state.maxPrice!);
  if (state.inStockOnly) list = list.filter((p) => p.stock > 0);
  if (state.onSaleOnly) list = list.filter((p) => discountOf(p) > 0);
  return [...list].sort(SORTERS[state.sort]);
}

function Facets({
  source,
  state,
  onChange,
  sortOptions,
}: {
  source: Product[];
  state: ListingState;
  onChange: (next: ListingState) => void;
  sortOptions: SortKey[];
}) {
  const categories = useMemo(() => {
    const counted = new Map<string, number>();
    for (const p of source) counted.set(p.category, (counted.get(p.category) ?? 0) + 1);
    return [...counted.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [source]);

  const set = (patch: Partial<ListingState>) => onChange({ ...state, ...patch });

  return (
    <div className="space-y-5">
      {/* Sort lives in the sheet on small screens, where the results header has
          no room for it. */}
      <section className="lg:hidden">
        <h3 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-faint">
          Sort
        </h3>
        <select
          value={state.sort}
          onChange={(e) => set({ sort: e.target.value as SortKey })}
          aria-label="Sort results"
          className="w-full rounded-md border border-line bg-raised px-3 py-2.5 text-sm text-ink"
        >
          {sortOptions.map((k) => (
            <option key={k} value={k}>
              {SORT_LABELS[k]}
            </option>
          ))}
        </select>
      </section>

      {categories.length > 1 && (
        <section>
          <h3 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-faint">
            Category
          </h3>
          <ul className="space-y-0.5">
            <li>
              <button
                type="button"
                onClick={() => set({ category: null })}
                aria-pressed={!state.category}
                className={`flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-left text-sm ${
                  !state.category
                    ? "bg-brand-soft font-semibold text-brand-strong"
                    : "text-ink-soft hover:bg-sunken"
                }`}
              >
                All
                <span className="tnum text-xs text-ink-faint">{source.length}</span>
              </button>
            </li>
            {categories.map(([name, n]) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => set({ category: name === state.category ? null : name })}
                  aria-pressed={state.category === name}
                  className={`flex w-full items-center justify-between gap-2 rounded-sm px-2.5 py-2 text-left text-sm ${
                    state.category === name
                      ? "bg-brand-soft font-semibold text-brand-strong"
                      : "text-ink-soft hover:bg-sunken"
                  }`}
                >
                  <span className="clamp-1">{name}</span>
                  <span className="tnum shrink-0 text-xs text-ink-faint">{n}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-faint">
          Maximum price
        </h3>
        <ul className="flex flex-wrap gap-1.5">
          {[null, ...PRICE_STEPS].map((v) => (
            <li key={String(v)}>
              <button
                type="button"
                onClick={() => set({ maxPrice: v })}
                aria-pressed={state.maxPrice === v}
                className={`tnum rounded-sm border px-2.5 py-1.5 text-xs font-medium ${
                  state.maxPrice === v
                    ? "border-brand bg-brand-soft text-brand-strong"
                    : "border-line text-ink-soft hover:border-line-strong"
                }`}
              >
                {v == null ? "Any" : `Under ${rs(v)}`}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-faint">
          Show only
        </h3>
        <ul className="space-y-1">
          {(
            [
              ["inStockOnly", "In stock"],
              ["onSaleOnly", "Reduced price"],
            ] as const
          ).map(([key, label]) => (
            <li key={key}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-ink-soft hover:bg-sunken">
                <input
                  type="checkbox"
                  checked={state[key]}
                  onChange={(e) => set({ [key]: e.target.checked } as Partial<ListingState>)}
                  className="h-4 w-4 accent-[var(--color-brand)]"
                />
                {label}
              </label>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function Listing({
  source,
  results,
  state,
  onChange,
  heading,
  subheading,
  intro,
  loading = false,
  sortOptions = ["relevance", "discount", "price-asc", "price-desc", "newest"],
  emptyAction,
}: {
  /* Everything in scope, used for facet counts. */
  source: Product[];
  /* What survived the filters, already sorted. */
  results: Product[];
  state: ListingState;
  onChange: (next: ListingState) => void;
  heading: ReactNode;
  subheading?: ReactNode;
  intro?: ReactNode;
  loading?: boolean;
  sortOptions?: SortKey[];
  emptyAction?: ReactNode;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeCount =
    (state.category ? 1 : 0) +
    (state.maxPrice != null ? 1 : 0) +
    (state.inStockOnly ? 1 : 0) +
    (state.onSaleOnly ? 1 : 0);

  useEffect(() => {
    if (!sheetOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setSheetOpen(false);
    document.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", esc);
    };
  }, [sheetOpen]);

  const facets = (
    <Facets source={source} state={state} onChange={onChange} sortOptions={sortOptions} />
  );

  return (
    <div>
      {intro}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-md border border-line bg-raised p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Filters</h2>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={() => onChange({ ...emptyListingState, sort: state.sort })}
                  className="text-xs font-medium text-brand hover:text-brand-strong"
                >
                  Clear
                </button>
              )}
            </div>
            {facets}
          </div>
        </aside>

        <div className="min-w-0">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-ink">{heading}</h1>
              <p className="mt-0.5 text-sm text-ink-muted">
                {subheading ?? (
                  <span className="tnum">
                    {results.length} {results.length === 1 ? "product" : "products"}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="flex items-center gap-2 rounded-md border border-line bg-raised px-3 py-2 text-sm font-medium text-ink lg:hidden"
              >
                <Icon name="filter" size={16} />
                Filters
                {activeCount > 0 && (
                  <span className="tnum grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-2xs font-bold text-white">
                    {activeCount}
                  </span>
                )}
              </button>

              <label className="hidden items-center gap-2 text-sm text-ink-muted lg:flex">
                <span className="sr-only sm:not-sr-only">Sort</span>
                <select
                  value={state.sort}
                  onChange={(e) => onChange({ ...state, sort: e.target.value as SortKey })}
                  aria-label="Sort results"
                  className="rounded-md border border-line bg-raised px-2.5 py-2 text-sm text-ink"
                >
                  {sortOptions.map((k) => (
                    <option key={k} value={k}>
                      {SORT_LABELS[k]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </header>

          {/* Active filters shown as removable chips, so it is always visible
              why a result count is low. */}
          {activeCount > 0 && (
            <ul className="mb-4 flex flex-wrap gap-1.5">
              {state.category && (
                <FilterChip label={state.category} onRemove={() => onChange({ ...state, category: null })} />
              )}
              {state.maxPrice != null && (
                <FilterChip
                  label={`Under ${rs(state.maxPrice)}`}
                  onRemove={() => onChange({ ...state, maxPrice: null })}
                />
              )}
              {state.inStockOnly && (
                <FilterChip label="In stock" onRemove={() => onChange({ ...state, inStockOnly: false })} />
              )}
              {state.onSaleOnly && (
                <FilterChip
                  label="Reduced price"
                  onRemove={() => onChange({ ...state, onSaleOnly: false })}
                />
              )}
            </ul>
          )}

          {loading ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="skeleton aspect-[3/4] rounded-md" />
              ))}
            </div>
          ) : results.length ? (
            <ProductGrid products={results} />
          ) : (
            <div className="rounded-md border border-line bg-raised px-6 py-16 text-center">
              <Icon
                name="search"
                size={32}
                strokeWidth={1.4}
                className="mx-auto text-ink-faint"
              />
              <h2 className="mt-3 text-base font-semibold text-ink">No products found</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
                {activeCount > 0
                  ? "No product matches every filter you have applied."
                  : "There is nothing to show here yet."}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...emptyListingState, sort: state.sort })}
                    className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
                  >
                    Clear filters
                  </button>
                )}
                {emptyAction}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter sheet, phone and tablet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-ink/45"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-xl bg-raised pb-[env(safe-area-inset-bottom)]"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-base font-semibold text-ink">Filters</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close filters"
                className="hit -mr-2 grid place-items-center rounded-sm text-ink-muted hover:text-ink"
              >
                <Icon name="close" size={20} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto overscroll-contain p-4">{facets}</div>
            <div className="flex shrink-0 gap-2 border-t border-line p-4">
              <button
                type="button"
                onClick={() => onChange({ ...emptyListingState, sort: state.sort })}
                className="flex-1 rounded-md border border-line py-2.5 text-sm font-semibold text-ink"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="tnum flex-[2] rounded-md bg-brand py-2.5 text-sm font-semibold text-white"
              >
                Show {results.length} {results.length === 1 ? "product" : "products"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onRemove}
        className="flex items-center gap-1.5 rounded-sm border border-brand-border bg-brand-soft py-1 pl-2.5 pr-1.5 text-xs font-medium text-brand-strong hover:border-brand"
      >
        {label}
        <Icon name="close" size={13} />
        <span className="sr-only">Remove filter</span>
      </button>
    </li>
  );
}
