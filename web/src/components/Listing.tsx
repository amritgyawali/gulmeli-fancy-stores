import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import type { Product } from "@/lib/types";
import { rs } from "@/lib/format";
import { useInView, useScrollLock } from "@/lib/hooks";
import { Icon, Stars } from "./Icon";
import { ProductGrid, ProductGridSkeleton } from "./ProductCard";

/*
 * The shared listing surface behind /search and /offers.
 *
 * Both pages once carried their own copy of the filter sidebar, sort control
 * and grid, with accidental differences; they are one component so they
 * cannot drift. Below `lg` the filters are a bottom sheet opened from a
 * Filters button that shows how many are active.
 *
 * This version adds what shoppers expect from a catalogue listing:
 *
 * - Filters live in the URL. A filtered result can be shared or bookmarked,
 *   and Back undoes the last filter instead of leaving the page.
 * - A rating filter and a custom price range beside the preset steps.
 * - Results arrive in pages of 24 as the customer scrolls, so a large
 *   catalogue does not render hundreds of cards up front.
 */

export type SortKey = "relevance" | "discount" | "price-asc" | "price-desc" | "newest" | "rating";

const SORT_LABELS: Record<SortKey, string> = {
  relevance: "Recommended",
  discount: "Biggest discount",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  newest: "Newest first",
  rating: "Top rated",
};

/* Discount read from the two prices, never from the free-text `discount`
   field — that string said things like "Up to 40%" which parsed as 40 for a
   product discounted 12%. */
export const discountOf = (p: Product) =>
  p.originalPrice && p.originalPrice > p.price ? 1 - p.price / p.originalPrice : 0;

const ratingOf = (p: Product) => Number.parseFloat(p.rating ?? "") || 0;

const SORTERS: Record<SortKey, (a: Product, b: Product) => number> = {
  relevance: (a, b) => (b.sold ?? 0) - (a.sold ?? 0) || discountOf(b) - discountOf(a),
  discount: (a, b) => discountOf(b) - discountOf(a),
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  newest: (a, b) =>
    (Date.parse(b.createdAt ?? "") || 0) - (Date.parse(a.createdAt ?? "") || 0) ||
    String(b.id).localeCompare(String(a.id)),
  rating: (a, b) => ratingOf(b) - ratingOf(a) || (b.sold ?? 0) - (a.sold ?? 0),
};

const PRICE_STEPS = [500, 1000, 2500, 5000] as const;
const RATING_STEPS = [4, 3] as const;

export interface ListingState {
  category: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number | null;
  inStockOnly: boolean;
  onSaleOnly: boolean;
  sort: SortKey;
}

export const emptyListingState: ListingState = {
  category: null,
  minPrice: null,
  maxPrice: null,
  minRating: null,
  inStockOnly: false,
  onSaleOnly: false,
  sort: "relevance",
};

/*
 * Search matching. Every word typed must appear somewhere in the product's
 * name, category, brand or seller, in any order — "keyboard wireless" finds
 * "Mini Wireless Keyboard". Matches in the name rank above matches elsewhere.
 */
const fold = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "");

export function searchProducts(products: Product[], query: string) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return products;
  const scored: { p: Product; score: number }[] = [];
  for (const p of products) {
    const name = fold(p.name);
    const rest = `${fold(p.category)} ${fold(p.brand)} ${fold(p.store)}`;
    let score = 0;
    let all = true;
    for (const w of words) {
      if (name.includes(w)) score += name.startsWith(w) || name.includes(` ${w}`) ? 3 : 2;
      else if (rest.includes(w)) score += 1;
      else {
        all = false;
        break;
      }
    }
    if (all) scored.push({ p, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.p);
}

export function applyListing(source: Product[], state: ListingState) {
  let list = source;
  if (state.category) list = list.filter((p) => p.category === state.category);
  if (state.minPrice != null) list = list.filter((p) => p.price >= state.minPrice!);
  if (state.maxPrice != null) list = list.filter((p) => p.price <= state.maxPrice!);
  if (state.minRating != null) list = list.filter((p) => ratingOf(p) >= state.minRating!);
  if (state.inStockOnly) list = list.filter((p) => p.stock > 0);
  if (state.onSaleOnly) list = list.filter((p) => discountOf(p) > 0);
  /* "Recommended" keeps the search ranking; every other sort reorders. The
     sort is stable, so ties keep their relevance order. */
  const sorted = state.sort === "relevance" ? list : [...list].sort(SORTERS[state.sort]);
  /* Sold-out products always sink below ones that can be bought. */
  return [...sorted].sort((a, b) => Number(a.stock < 1) - Number(b.stock < 1));
}

/* ------------------------------------------------------------ URL state */

const num = (v: string | null) => {
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export function useListingState(defaults: Partial<ListingState> = {}) {
  const [params, setParams] = useSearchParams();
  const base = { ...emptyListingState, ...defaults };
  const sort = params.get("sort") as SortKey | null;
  const state: ListingState = {
    category: params.get("cat") || null,
    minPrice: num(params.get("min")),
    maxPrice: num(params.get("max")),
    minRating: num(params.get("rating")),
    inStockOnly: params.get("stock") === "1",
    onSaleOnly: params.get("sale") === "1",
    sort: sort && sort in SORT_LABELS ? sort : base.sort,
  };
  const setState = (next: ListingState) => {
    const p = new URLSearchParams(params);
    const put = (key: string, value: string | null) =>
      value == null || value === "" ? p.delete(key) : p.set(key, value);
    put("cat", next.category);
    put("min", next.minPrice == null ? null : String(next.minPrice));
    put("max", next.maxPrice == null ? null : String(next.maxPrice));
    put("rating", next.minRating == null ? null : String(next.minRating));
    put("stock", next.inStockOnly ? "1" : null);
    put("sale", next.onSaleOnly ? "1" : null);
    put("sort", next.sort === base.sort ? null : next.sort);
    setParams(p, { replace: false, preventScrollReset: true });
  };
  return [state, setState] as const;
}

/* -------------------------------------------------------------- facets */

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

  const [min, setMin] = useState(state.minPrice?.toString() ?? "");
  const [max, setMax] = useState(state.maxPrice?.toString() ?? "");
  useEffect(() => {
    setMin(state.minPrice?.toString() ?? "");
    setMax(state.maxPrice?.toString() ?? "");
  }, [state.minPrice, state.maxPrice]);

  const set = (patch: Partial<ListingState>) => onChange({ ...state, ...patch });
  const heading = "mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-faint";

  return (
    <div className="space-y-6">
      {/* Sort lives in the sheet on small screens, where the results header
          has no room for it. */}
      <section className="lg:hidden">
        <h3 className={heading}>Sort by</h3>
        <ul className="flex flex-wrap gap-1.5">
          {sortOptions.map((k) => (
            <li key={k}>
              <button
                type="button"
                onClick={() => set({ sort: k })}
                aria-pressed={state.sort === k}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  state.sort === k
                    ? "border-ink bg-ink font-medium text-raised"
                    : "border-line text-ink-soft"
                }`}
              >
                {SORT_LABELS[k]}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {categories.length > 1 && (
        <section>
          <h3 className={heading}>Category</h3>
          <ul className="space-y-0.5">
            <li>
              <button
                type="button"
                onClick={() => set({ category: null })}
                aria-pressed={!state.category}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm ${
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
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm ${
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
        <h3 className={heading}>Price</h3>
        <ul className="flex flex-wrap gap-1.5">
          {[null, ...PRICE_STEPS].map((v) => {
            const on = state.maxPrice === v && state.minPrice == null;
            return (
              <li key={String(v)}>
                <button
                  type="button"
                  onClick={() => set({ maxPrice: v, minPrice: null })}
                  aria-pressed={on}
                  className={`tnum rounded-full border px-3 py-1.5 text-xs font-medium ${
                    on
                      ? "border-brand bg-brand-soft text-brand-strong"
                      : "border-line text-ink-soft hover:border-line-strong"
                  }`}
                >
                  {v == null ? "Any" : `Under ${rs(v)}`}
                </button>
              </li>
            );
          })}
        </ul>
        {/* A custom range, for the customer whose budget is not a preset. */}
        <form
          className="mt-2.5 flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            let lo = num(min || null);
            let hi = num(max || null);
            if (lo != null && hi != null && lo > hi) [lo, hi] = [hi, lo];
            set({ minPrice: lo, maxPrice: hi });
          }}
        >
          <input
            inputMode="numeric"
            value={min}
            onChange={(e) => setMin(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="Min"
            aria-label="Minimum price"
            className="tnum w-full min-w-0 rounded-md border border-line bg-raised px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand"
          />
          <span className="text-ink-faint">–</span>
          <input
            inputMode="numeric"
            value={max}
            onChange={(e) => setMax(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="Max"
            aria-label="Maximum price"
            className="tnum w-full min-w-0 rounded-md border border-line bg-raised px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand"
          />
          <button
            type="submit"
            aria-label="Apply price range"
            className="grid h-8 w-9 shrink-0 place-items-center rounded-md bg-ink text-raised hover:bg-brand"
          >
            <Icon name="chevronRight" size={15} />
          </button>
        </form>
      </section>

      <section>
        <h3 className={heading}>Customer rating</h3>
        <ul className="space-y-0.5">
          {RATING_STEPS.map((r) => (
            <li key={r}>
              <button
                type="button"
                onClick={() => set({ minRating: state.minRating === r ? null : r })}
                aria-pressed={state.minRating === r}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm ${
                  state.minRating === r
                    ? "bg-brand-soft font-semibold text-brand-strong"
                    : "text-ink-soft hover:bg-sunken"
                }`}
              >
                <Stars value={r} size={13} />& up
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className={heading}>Show only</h3>
        <ul className="space-y-1">
          {(
            [
              ["inStockOnly", "In stock"],
              ["onSaleOnly", "On sale"],
            ] as const
          ).map(([key, label]) => (
            <li key={key}>
              <label className="flex cursor-pointer items-center justify-between gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink-soft hover:bg-sunken">
                {label}
                <input
                  type="checkbox"
                  role="switch"
                  checked={state[key]}
                  onChange={(e) => set({ [key]: e.target.checked } as Partial<ListingState>)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className="relative h-5 w-9 shrink-0 rounded-full bg-line-strong transition-colors peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-e1 after:transition-transform after:duration-200 peer-checked:after:translate-x-4"
                />
              </label>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const PAGE = 24;

export function Listing({
  source,
  results,
  state,
  onChange,
  heading,
  subheading,
  intro,
  loading = false,
  sortOptions = ["relevance", "discount", "price-asc", "price-desc", "rating", "newest"],
  emptyAction,
  emptyHint,
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
  emptyHint?: ReactNode;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [visible, setVisible] = useState(PAGE);
  const [sentinel, near] = useInView<HTMLDivElement>({ rootMargin: "800px" });
  useScrollLock(sheetOpen);

  const activeCount =
    (state.category ? 1 : 0) +
    (state.maxPrice != null || state.minPrice != null ? 1 : 0) +
    (state.minRating != null ? 1 : 0) +
    (state.inStockOnly ? 1 : 0) +
    (state.onSaleOnly ? 1 : 0);

  /* A different result set starts again from the first page. */
  const signature = results.map((p) => p.id).join(",");
  useEffect(() => setVisible(PAGE), [signature]);
  const shown = results.slice(0, visible);
  const hasMore = shown.length < results.length;
  useEffect(() => {
    if (near && hasMore) setVisible((v) => v + PAGE);
  }, [near, hasMore]);

  useEffect(() => {
    if (!sheetOpen) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setSheetOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [sheetOpen]);

  const clear = () => onChange({ ...emptyListingState, sort: state.sort });
  const facets = (
    <Facets source={source} state={state} onChange={onChange} sortOptions={sortOptions} />
  );

  const priceLabel =
    state.minPrice != null && state.maxPrice != null
      ? `${rs(state.minPrice)} – ${rs(state.maxPrice)}`
      : state.minPrice != null
        ? `Over ${rs(state.minPrice)}`
        : state.maxPrice != null
          ? `Under ${rs(state.maxPrice)}`
          : "";

  return (
    <div>
      {intro}

      <div className="grid gap-6 lg:grid-cols-[232px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-40 max-h-[calc(100vh-11rem)] overflow-y-auto rounded-xl border border-line bg-raised p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Filters</h2>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  className="text-xs font-medium text-brand hover:text-brand-strong"
                >
                  Clear all
                </button>
              )}
            </div>
            {facets}
          </div>
        </aside>

        <div className="min-w-0">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">{heading}</h1>
              <p className="mt-0.5 text-sm text-ink-muted" aria-live="polite">
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
                className="flex items-center gap-2 rounded-full border border-line bg-raised px-3.5 py-2 text-sm font-medium text-ink lg:hidden"
              >
                <Icon name="filter" size={16} />
                Filter &amp; sort
                {activeCount > 0 && (
                  <span className="tnum grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-2xs font-bold text-white">
                    {activeCount}
                  </span>
                )}
              </button>

              <label className="hidden items-center gap-2 text-sm text-ink-muted lg:flex">
                Sort by
                <select
                  value={state.sort}
                  onChange={(e) => onChange({ ...state, sort: e.target.value as SortKey })}
                  className="rounded-lg border border-line bg-raised px-2.5 py-2 text-sm font-medium text-ink"
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

          {/* Active filters as removable chips, so it is always visible why a
              result count is low. */}
          {activeCount > 0 && (
            <ul className="mb-4 flex flex-wrap items-center gap-1.5">
              {state.category && (
                <FilterChip
                  label={state.category}
                  onRemove={() => onChange({ ...state, category: null })}
                />
              )}
              {priceLabel && (
                <FilterChip
                  label={priceLabel}
                  onRemove={() => onChange({ ...state, maxPrice: null, minPrice: null })}
                />
              )}
              {state.minRating != null && (
                <FilterChip
                  label={`${state.minRating}★ & up`}
                  onRemove={() => onChange({ ...state, minRating: null })}
                />
              )}
              {state.inStockOnly && (
                <FilterChip
                  label="In stock"
                  onRemove={() => onChange({ ...state, inStockOnly: false })}
                />
              )}
              {state.onSaleOnly && (
                <FilterChip
                  label="On sale"
                  onRemove={() => onChange({ ...state, onSaleOnly: false })}
                />
              )}
              <li>
                <button
                  type="button"
                  onClick={clear}
                  className="px-2 py-1 text-xs font-medium text-ink-muted underline-offset-2 hover:text-brand hover:underline"
                >
                  Clear all
                </button>
              </li>
            </ul>
          )}

          {loading ? (
            <ProductGridSkeleton />
          ) : results.length ? (
            <>
              <ProductGrid products={shown} />
              <div ref={sentinel} aria-hidden="true" />
              {hasMore && (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <p className="tnum text-xs text-ink-muted">
                    Showing {shown.length} of {results.length}
                  </p>
                  <div className="h-1 w-40 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-brand transition-[width] duration-300"
                      style={{ width: `${(shown.length / results.length) * 100}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setVisible((v) => v + PAGE)}
                    className="mt-1 rounded-full border border-line bg-raised px-8 py-2.5 text-sm font-semibold text-ink hover:border-brand hover:text-brand"
                  >
                    Show more
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-line bg-raised px-6 py-16 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sunken">
                <Icon name="search" size={28} strokeWidth={1.5} className="text-ink-faint" />
              </span>
              <h2 className="mt-4 text-base font-semibold text-ink">No products found</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
                {activeCount > 0
                  ? "No product matches every filter you have applied. Try removing one."
                  : (emptyHint ?? "There is nothing to show here yet.")}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={clear}
                    className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
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
            className="animate-fade-in absolute inset-0 bg-ink/45"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="animate-slide-up absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-2xl bg-raised pb-[env(safe-area-inset-bottom)] shadow-e3"
          >
            <div className="flex justify-center pt-2" aria-hidden="true">
              <span className="h-1 w-10 rounded-full bg-line-strong" />
            </div>
            <header className="flex shrink-0 items-center justify-between border-b border-line px-4 py-2.5">
              <h2 className="text-base font-semibold text-ink">Filter &amp; sort</h2>
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
                onClick={clear}
                className="flex-1 rounded-full border border-line py-3 text-sm font-semibold text-ink"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="tnum flex-[2] rounded-full bg-brand py-3 text-sm font-semibold text-white"
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
    <li className="animate-scale-in">
      <button
        type="button"
        onClick={onRemove}
        className="flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-soft py-1 pl-3 pr-2 text-xs font-medium text-brand-strong hover:border-brand"
      >
        {label}
        <Icon name="close" size={13} />
        <span className="sr-only">Remove filter</span>
      </button>
    </li>
  );
}
