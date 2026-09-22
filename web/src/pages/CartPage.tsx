import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { ProductCard, ProductVisual, discountPercent } from "@/components/ProductCard";
import { Rail } from "@/components/Rail";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { voucherDiscount, voucherTerms, VOUCHER } from "@/lib/commerce";
import { deliveryFeeFor, useDeliveryTerms } from "@/lib/shipping";
import { useDocumentMeta } from "@/lib/hooks";
import { rs } from "@/lib/format";
import type { Product } from "@/lib/types";

/*
 * The cart.
 *
 * This page used to contain a second checkout: its own name/phone/address
 * form, its own validation, and its own "Place order · Cash on delivery"
 * button, sitting alongside the real /checkout route. The two disagreed —
 * this one showed "Shipping: Free" unconditionally while checkout billed the
 * server's delivery fee — so the total a customer agreed to here was not the
 * total they were charged.
 *
 * The cart is now a cart: review lines, change quantities, apply a voucher,
 * then continue to checkout, which is the one place an order is placed.
 *
 * Also here: progress towards free delivery, "Save for later" (moves a line
 * to the wishlist), Undo after removing a line, a checkout bar fixed to the
 * bottom of a phone screen, and products related to what is in the cart.
 */
export function CartPage() {
  const {
    cart,
    productById,
    setQty,
    toggle,
    select,
    removeSelected,
    removeItem,
    commerce,
    updateCommerce,
    subtotal,
    count,
    add,
    products,
  } = useShop();
  const terms = useDeliveryTerms();
  const toast = useToast();
  useDocumentMeta({ title: "Cart" });
  const [voucherInput, setVoucherInput] = useState(commerce.voucher);
  const [voucherNotice, setVoucherNotice] = useState("");

  const discount = voucherDiscount(commerce.voucher, subtotal);
  const delivery = count > 0 ? deliveryFeeFor(subtotal, terms) : 0;
  const total = Math.max(0, subtotal + delivery - discount);

  const items = cart
    .map((item) => ({ item, product: productById[item.productId] }))
    .filter((entry) => entry.product);
  const selectedCount = items.filter((e) => e.item.selected).length;
  const allSelected = items.length > 0 && selectedCount === items.length;
  const unavailable = items.filter((e) => e.item.selected && e.product.stock < 1);
  const toFree = Math.max(0, terms.freeOver - subtotal);
  const progress = terms.freeOver > 0 ? Math.min(100, (subtotal / terms.freeOver) * 100) : 100;
  const savings = items.reduce(
    (sum, { item, product }) =>
      item.selected && product.originalPrice && product.originalPrice > product.price
        ? sum + (product.originalPrice - product.price) * item.quantity
        : sum,
    0,
  );
  const blocked = count < 1 || unavailable.length > 0;

  /* Related to what is in the cart: same categories first, best sellers. */
  const suggestions = useMemo(() => {
    const inCart = new Set(cart.map((i) => i.productId));
    const categories = new Set(
      cart.map((i) => productById[i.productId]?.category).filter(Boolean),
    );
    return products
      .filter((p) => !inCart.has(p.id) && p.stock > 0)
      .sort(
        (a, b) =>
          Number(categories.has(b.category)) - Number(categories.has(a.category)) ||
          (b.sold ?? 0) - (a.sold ?? 0),
      )
      .slice(0, 12);
  }, [cart, productById, products]);

  const remove = (product: Product, quantity: number) => {
    removeItem(product.id);
    toast({
      message: `Removed ${product.name}`,
      tone: "info",
      action: {
        label: "Undo",
        onClick: () => {
          for (let i = 0; i < quantity; i += 1) add(product);
        },
      },
    });
  };
  const saveForLater = (product: Product) => {
    updateCommerce((current) => ({
      ...current,
      wishlist: current.wishlist.includes(product.id)
        ? current.wishlist
        : [...current.wishlist, product.id],
    }));
    removeItem(product.id);
    toast({
      message: "Moved to your wishlist",
      action: { label: "View", to: "/wishlist" },
    });
  };

  const applyVoucher = () => {
    const code = voucherInput.trim().toUpperCase();
    if (code && code !== VOUCHER.code) {
      setVoucherNotice(`That code is not recognised. ${voucherTerms()}`);
      return;
    }
    if (code && subtotal < VOUCHER.minSpend) {
      setVoucherNotice(`Spend ${rs(VOUCHER.minSpend - subtotal)} more to use this code.`);
      return;
    }
    setVoucherNotice("");
    updateCommerce((current) => ({ ...current, voucher: code }));
  };

  if (!items.length)
    return (
      <div>
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-raised ring-1 ring-line">
            <Icon name="cart" size={36} strokeWidth={1.4} className="text-ink-faint" />
          </span>
          <h1 className="text-xl font-semibold text-ink">Your cart is empty</h1>
          <p className="text-sm text-ink-muted">Items you add will show up here.</p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <Link
              to="/search"
              className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
            >
              Browse products
            </Link>
            <Link
              to="/wishlist"
              className="rounded-full border border-line bg-raised px-6 py-2.5 text-sm font-semibold text-ink hover:border-brand hover:text-brand"
            >
              View wishlist
            </Link>
          </div>
        </div>
        {suggestions.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-xl font-semibold tracking-tight text-ink">Popular right now</h2>
            <Rail label="Popular right now">
              {suggestions.map((p) => (
                <li key={p.id} className="w-[168px] sm:w-[200px]">
                  <ProductCard product={p} />
                </li>
              ))}
            </Rail>
          </section>
        )}
      </div>
    );

  return (
    <div>
      <h1 className="mb-5 text-2xl font-semibold text-ink">
        Cart
        <span className="tnum ml-2 text-base font-normal text-ink-muted">
          {items.length} {items.length === 1 ? "product" : "products"}
        </span>
      </h1>

      {terms.freeOver > 0 && (
        <div className="mb-4 rounded-xl border border-brand-border bg-brand-soft px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-brand-strong">
            <Icon name="truckFast" size={17} className="shrink-0" />
            {toFree > 0 ? (
              <span>
                Add <strong className="tnum">{rs(toFree)}</strong> more to get{" "}
                <strong>free delivery</strong>
              </span>
            ) : (
              <span className="font-semibold">Your order qualifies for free delivery</span>
            )}
          </p>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-border"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progress to free delivery"
          >
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out-quint"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-xl border border-line bg-raised">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() =>
                  select(items.map((e) => e.item.productId), !allSelected)
                }
                className="h-4 w-4 accent-[var(--color-brand)]"
              />
              Select all
            </label>
            <button
              type="button"
              onClick={removeSelected}
              disabled={selectedCount === 0}
              className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-critical disabled:opacity-40 disabled:hover:text-ink-muted"
            >
              <Icon name="trash" size={15} />
              Remove selected
            </button>
          </header>

          <ul className="divide-y divide-line">
            {items.map(({ item, product }) => {
              const out = product.stock < 1;
              const overStock = item.quantity > product.stock;
              return (
                <li key={item.productId} className="flex flex-wrap items-start gap-3 p-4">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggle(item.productId)}
                    aria-label={`Include ${product.name} in the order`}
                    className="mt-6 h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                  />
                  <Link
                    to={`/product/${product.id}`}
                    className="media h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-line"
                  >
                    <ProductVisual product={product} fit="cover" width={96} />
                  </Link>

                  <div className="min-w-[180px] flex-1">
                    <Link
                      to={`/product/${product.id}`}
                      className="clamp-2 text-sm text-ink hover:text-brand"
                    >
                      {product.name}
                    </Link>
                    <p className="tnum mt-1 flex flex-wrap items-baseline gap-x-1.5 text-sm text-ink-muted">
                      {rs(product.price)} each
                      {discountPercent(product) > 0 && (
                        <>
                          <span className="text-xs text-ink-faint line-through">
                            {rs(product.originalPrice!)}
                          </span>
                          <span className="text-xs font-semibold text-positive">
                            -{discountPercent(product)}%
                          </span>
                        </>
                      )}
                    </p>
                    {out ? (
                      <p className="mt-1 text-xs font-medium text-critical">
                        Out of stock — deselect to continue
                      </p>
                    ) : overStock ? (
                      <p className="tnum mt-1 text-xs font-medium text-caution">
                        Only {product.stock} available
                      </p>
                    ) : null}
                    <div className="mt-2 flex items-center gap-3 text-xs font-medium">
                      <button
                        type="button"
                        onClick={() => saveForLater(product)}
                        className="flex items-center gap-1 text-ink-muted hover:text-brand"
                      >
                        <Icon name="heart" size={13} />
                        Save for later
                      </button>
                      <span aria-hidden="true" className="h-3 w-px bg-line-strong" />
                      <button
                        type="button"
                        onClick={() => remove(product, item.quantity)}
                        className="flex items-center gap-1 text-ink-muted hover:text-critical"
                      >
                        <Icon name="trash" size={13} />
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-md border border-line">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${product.name}`}
                        disabled={item.quantity <= 1}
                        onClick={() => setQty(product, item.quantity - 1)}
                        className="grid h-9 w-9 place-items-center text-ink-soft hover:bg-sunken disabled:opacity-30"
                      >
                        <Icon name="minus" size={14} />
                      </button>
                      <span className="tnum w-9 text-center text-sm font-semibold text-ink">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${product.name}`}
                        disabled={item.quantity >= product.stock}
                        onClick={() => setQty(product, item.quantity + 1)}
                        className="grid h-9 w-9 place-items-center text-ink-soft hover:bg-sunken disabled:opacity-30"
                      >
                        <Icon name="plus" size={14} />
                      </button>
                    </div>

                    <p className="tnum w-24 text-right text-sm font-semibold text-ink">
                      {rs(product.price * item.quantity)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="lg:sticky lg:top-40">
          <div className="rounded-xl border border-line bg-raised p-4">
            <h2 className="mb-3 text-base font-semibold text-ink">Summary</h2>

            <div className="flex gap-2">
              <input
                value={voucherInput}
                onChange={(e) => setVoucherInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyVoucher()}
                placeholder="Voucher code"
                aria-label="Voucher code"
                className="min-w-0 flex-1 rounded-md border border-line bg-raised px-3 py-2.5 text-base uppercase text-ink outline-none placeholder:normal-case placeholder:text-ink-faint focus:border-brand"
              />
              <button
                type="button"
                onClick={applyVoucher}
                className="shrink-0 rounded-md border border-line px-4 text-sm font-semibold text-ink hover:border-brand hover:text-brand"
              >
                Apply
              </button>
            </div>
            <div aria-live="polite">
              {voucherNotice && <p className="mt-2 text-sm text-critical">{voucherNotice}</p>}
              {commerce.voucher && !voucherNotice && (
                <p className="mt-2 flex items-center gap-2 text-sm text-positive">
                  <Icon name="check" size={15} />
                  {commerce.voucher} applied
                  <button
                    type="button"
                    onClick={() => {
                      updateCommerce((current) => ({ ...current, voucher: "" }));
                      setVoucherInput("");
                    }}
                    className="ml-auto text-ink-muted underline hover:text-critical"
                  >
                    Remove
                  </button>
                </p>
              )}
            </div>

            <dl className="tnum mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">
                  Selected ({count} {count === 1 ? "item" : "items"})
                </dt>
                <dd className="text-ink">{rs(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Delivery</dt>
                <dd className={delivery ? "text-ink" : "text-positive"}>
                  {delivery ? rs(delivery) : "Free"}
                </dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-positive">
                  <dt>Voucher</dt>
                  <dd>− {rs(discount)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-line pt-3 text-base font-semibold">
                <dt className="text-ink">Total</dt>
                <dd className="text-xl text-brand">{rs(total)}</dd>
              </div>
            </dl>
            {savings + discount > 0 && (
              <p className="tnum mt-2 rounded-lg bg-positive-soft px-3 py-2 text-sm font-medium text-positive">
                You save {rs(savings + discount)} on this order
              </p>
            )}
            <p className="mt-1 text-xs text-ink-muted">
              Confirmed at checkout, where stock and delivery are re-checked.
            </p>

            {unavailable.length > 0 && (
              <p
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-md border border-caution/30 bg-caution-soft px-3 py-2.5 text-sm text-caution"
              >
                <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
                Deselect the {unavailable.length === 1 ? "item that is" : "items that are"} out
                of stock to continue.
              </p>
            )}

            <Link
              to="/checkout"
              aria-disabled={blocked}
              onClick={(e) => {
                if (blocked) e.preventDefault();
              }}
              className={`mt-4 hidden w-full items-center justify-center gap-2 rounded-full py-3 text-base font-semibold lg:flex ${
                blocked
                  ? "pointer-events-none bg-line-strong text-ink-faint"
                  : "bg-brand text-white shadow-e1 hover:bg-brand-strong"
              }`}
            >
              {count < 1 ? "Select an item to continue" : "Continue to checkout"}
              {!blocked && <Icon name="arrowRight" size={17} />}
            </Link>
            <p className="mt-3 hidden items-center justify-center gap-1.5 text-xs text-ink-muted lg:flex">
              <Icon name="shieldCheck" size={14} />
              Secure checkout · Cash on delivery
            </p>

            <Link
              to="/search"
              className="mt-3 block text-center text-sm text-ink-muted hover:text-brand"
            >
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>

      {suggestions.length > 0 && (
        <section className="reveal mt-10">
          <h2 className="mb-3 text-xl font-semibold tracking-tight text-ink">
            You might also like
          </h2>
          <Rail label="You might also like">
            {suggestions.map((p) => (
              <li key={p.id} className="w-[168px] sm:w-[200px]">
                <ProductCard product={p} />
              </li>
            ))}
          </Rail>
        </section>
      )}

      {/* Phone checkout bar: the total and the next step, always in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-raised/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgb(20_22_26/0.06)] backdrop-blur-md lg:hidden">
        <div className="page flex items-center gap-3 py-2.5">
          <label className="flex shrink-0 items-center gap-2 text-xs text-ink-muted">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => select(items.map((e) => e.item.productId), !allSelected)}
              className="h-4 w-4 accent-[var(--color-brand)]"
            />
            All
          </label>
          <div className="tnum min-w-0 flex-1 text-right">
            <p className="text-xs text-ink-muted">
              Total{discount > 0 || savings > 0 ? ` · saved ${rs(savings + discount)}` : ""}
            </p>
            <p className="text-lg font-bold leading-tight text-brand">{rs(total)}</p>
          </div>
          <Link
            to="/checkout"
            aria-disabled={blocked}
            onClick={(e) => {
              if (blocked) e.preventDefault();
            }}
            className={`flex h-12 shrink-0 items-center justify-center rounded-full px-6 text-sm font-semibold ${
              blocked ? "pointer-events-none bg-line-strong text-ink-faint" : "bg-brand text-white"
            }`}
          >
            Checkout ({count})
          </Link>
        </div>
      </div>
    </div>
  );
}
