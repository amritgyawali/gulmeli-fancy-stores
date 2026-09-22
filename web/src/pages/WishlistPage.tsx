import { Link } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { ProductCardCompact, ProductGrid } from "@/components/ProductCard";
import { Rail } from "@/components/Rail";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { useDocumentMeta, useRecentlyViewed } from "@/lib/hooks";
import type { Product } from "@/lib/types";

/*
 * Saved items and browsing history, in one place anyone can reach.
 *
 * The wishlist used to exist only as a panel inside the signed-in account
 * page, so a guest could tap a heart and never find what they had saved.
 * Guests' lists are kept on this device (see ShopContext); a signed-in
 * customer sees their account's lists, shared with the app.
 */
export function WishlistPage() {
  const { commerce, productById, cart, add, updateCommerce, session } = useShop();
  const toast = useToast();
  const recent = useRecentlyViewed(undefined, 20);
  useDocumentMeta({ title: "Wishlist" });

  const saved = commerce.wishlist
    .map((id) => productById[id])
    .filter((p): p is Product => Boolean(p));
  const addable = saved.filter(
    (p) => p.stock > (cart.find((i) => i.productId === p.id)?.quantity ?? 0),
  );

  const addAll = () => {
    for (const p of addable) add(p);
    toast({
      message: `${addable.length} ${addable.length === 1 ? "item" : "items"} added to your cart`,
      action: { label: "View cart", to: "/cart" },
    });
  };

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Wishlist
            {saved.length > 0 && (
              <span className="tnum ml-2 text-base font-normal text-ink-muted">
                {saved.length} {saved.length === 1 ? "item" : "items"}
              </span>
            )}
          </h1>
          {!session && (
            <p className="mt-1 text-sm text-ink-muted">
              Saved on this device.{" "}
              <Link to="/auth" className="font-medium text-brand hover:text-brand-strong">
                Sign in
              </Link>{" "}
              to keep your wishlist on every device.
            </p>
          )}
        </div>
        {addable.length > 0 && (
          <button
            type="button"
            onClick={addAll}
            className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-e1 hover:bg-brand-strong active:scale-[0.98]"
          >
            <Icon name="cartPlus" size={17} />
            Add {addable.length === saved.length ? "all" : addable.length} to cart
          </button>
        )}
      </header>

      {saved.length ? (
        <ProductGrid products={saved} />
      ) : (
        <div className="rounded-xl border border-line bg-raised px-6 py-16 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-soft">
            <Icon name="heart" size={28} className="text-brand" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-ink">Nothing saved yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
            Tap the heart on any product to keep it here for later.
          </p>
          <Link
            to="/"
            className="mt-5 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
          >
            Start exploring
          </Link>
        </div>
      )}

      {recent.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-end justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight text-ink">Recently viewed</h2>
            <button
              type="button"
              onClick={() => {
                updateCommerce((current) => ({ ...current, recent: [] }));
                toast({ message: "Browsing history cleared", tone: "info" });
              }}
              className="text-sm font-medium text-ink-muted hover:text-critical"
            >
              Clear history
            </button>
          </div>
          <Rail label="Recently viewed">
            {recent.map((p) => (
              <li key={p.id}>
                <ProductCardCompact product={p} />
              </li>
            ))}
          </Rail>
        </section>
      )}
    </div>
  );
}
