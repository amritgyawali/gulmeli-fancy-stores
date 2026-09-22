import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { Listing, applyListing, searchProducts, useListingState } from "@/components/Listing";
import { useDocumentMeta } from "@/lib/hooks";

/*
 * Search results. The page itself is only the query handling; the filter
 * rail, sort control, chips, grid and empty state come from <Listing/> so
 * they behave identically here and on /offers.
 *
 * Filters are part of the URL (see useListingState). A new search from the
 * header navigates to a fresh `?q=` URL, so it starts without the previous
 * search's filters — carrying a category across was how a search for "watch"
 * once returned nothing while the catalogue clearly had watches.
 */
export function SearchPage() {
  const [params] = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  const { products, catalogReady } = useShop();
  const [state, setState] = useListingState();

  useDocumentMeta({ title: query ? `${query} — search` : "All products" });

  /* Ranked by how well each product matches; with no query, most popular
     first. */
  const matched = useMemo(
    () =>
      query
        ? searchProducts(products, query)
        : [...products].sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0)),
    [products, query],
  );

  const results = useMemo(() => applyListing(matched, state), [matched, state]);

  /* When nothing matches, suggest the categories people shop most. */
  const popular = useMemo(() => {
    const counted = new Map<string, number>();
    for (const p of products) counted.set(p.category, (counted.get(p.category) ?? 0) + (p.sold ?? 1));
    return [...counted.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c);
  }, [products]);

  return (
    <Listing
      source={matched}
      results={results}
      state={state}
      onChange={setState}
      loading={!catalogReady && products.length === 0}
      heading={query ? `Results for “${query}”` : "All products"}
      emptyHint={
        query ? (
          <>
            Check the spelling, or try a shorter or more general term.
            {popular.length > 0 && (
              <span className="mt-3 flex flex-wrap justify-center gap-1.5">
                {popular.map((c) => (
                  <Link
                    key={c}
                    to={`/search?q=${encodeURIComponent(c)}`}
                    className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-strong hover:bg-brand-border"
                  >
                    {c}
                  </Link>
                ))}
              </span>
            )}
          </>
        ) : undefined
      }
      emptyAction={
        <Link
          to="/"
          className="rounded-full border border-line bg-raised px-5 py-2 text-sm font-semibold text-ink hover:border-brand hover:text-brand"
        >
          Back to home
        </Link>
      }
    />
  );
}
