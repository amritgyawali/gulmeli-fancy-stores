import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { Listing, applyListing, discountOf, useListingState } from "@/components/Listing";
import { useDocumentMeta } from "@/lib/hooks";
import { Icon } from "@/components/Icon";
import { voucherTerms } from "@/lib/commerce";

/*
 * Offers.
 *
 * The header here was a full-width orange gradient panel with 32px padding
 * carrying the sentence "Extra discounts, the more you add" and a restatement
 * of the voucher rule that did not match the rule the checkout applies. The
 * rule is real, so it stayed — as one line above the results rather than a
 * banner taking a third of the first screen, and generated from the rule in
 * lib/commerce so the two can no longer disagree.
 */
export function OffersPage() {
  const { offerProducts, products } = useShop();
  const [state, setState] = useListingState({ sort: "discount" });
  useDocumentMeta({ title: "Offers" });

  /* Anything genuinely reduced belongs on this page, whichever group the
     catalogue assigned it to. */
  const source = useMemo(() => {
    const seen = new Set(offerProducts.map((p) => p.id));
    return [
      ...offerProducts,
      ...products.filter((p) => !seen.has(p.id) && discountOf(p) > 0),
    ].sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0));
  }, [offerProducts, products]);

  const results = useMemo(() => applyListing(source, state), [source, state]);

  const best = useMemo(
    () => Math.round(Math.max(0, ...source.map(discountOf)) * 100),
    [source],
  );

  return (
    <Listing
      source={source}
      results={results}
      state={state}
      onChange={setState}
      sortOptions={["discount", "relevance", "price-asc", "price-desc", "rating", "newest"]}
      heading="Offers"
      subheading={
        <span className="tnum">
          {results.length} reduced {results.length === 1 ? "product" : "products"}
          {best > 0 && <> · up to {best}% off</>}
        </span>
      }
      intro={
        <p className="mb-5 flex items-center gap-2 rounded-xl border border-dashed border-brand bg-brand-soft px-3.5 py-3 text-sm font-medium text-brand-strong">
          <Icon name="ticket" size={16} className="shrink-0" />
          {voucherTerms()}
        </p>
      }
      emptyAction={
        <Link
          to="/search"
          className="rounded-md border border-line bg-raised px-4 py-2 text-sm font-semibold text-ink hover:border-brand hover:text-brand"
        >
          Browse everything
        </Link>
      }
    />
  );
}
