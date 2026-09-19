import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import {
  Listing,
  applyListing,
  emptyListingState,
  type ListingState,
} from "@/components/Listing";

/*
 * Search results. The page itself is now only the query handling; the filter
 * rail, sort control, chips, grid and empty state come from <Listing/> so
 * they behave identically here and on /offers.
 */
export function SearchPage() {
  const [params] = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  const { products, catalogReady } = useShop();
  const [state, setState] = useState<ListingState>(emptyListingState);

  /* A new search term is a new context — carrying the previous category
     filter across it was how a search for "watch" could return nothing at
     all while the catalogue clearly had watches. */
  useEffect(() => {
    setState((s) => ({ ...emptyListingState, sort: s.sort }));
  }, [query]);

  const matched = useMemo(() => {
    const needle = query.toLowerCase();
    if (!needle) return products;
    return products.filter((p) =>
      [p.name, p.category, p.brand, p.store].some((field) =>
        String(field ?? "").toLowerCase().includes(needle),
      ),
    );
  }, [products, query]);

  const results = useMemo(() => applyListing(matched, state), [matched, state]);

  return (
    <Listing
      source={matched}
      results={results}
      state={state}
      onChange={setState}
      loading={!catalogReady && products.length === 0}
      heading={query ? `Results for “${query}”` : "All products"}
      emptyAction={
        <Link
          to="/"
          className="rounded-md border border-line bg-raised px-4 py-2 text-sm font-semibold text-ink hover:border-brand hover:text-brand"
        >
          Back to home
        </Link>
      }
    />
  );
}
