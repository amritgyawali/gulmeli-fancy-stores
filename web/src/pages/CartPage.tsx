import { useState } from "react";
import { Link } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { ProductVisual } from "@/components/ProductCard";
import { Icon } from "@/components/Icon";
import { voucherDiscount, voucherTerms, VOUCHER } from "@/lib/commerce";
import { deliveryFeeFor, useDeliveryTerms } from "@/lib/shipping";
import { rs } from "@/lib/format";

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
  } = useShop();
  const terms = useDeliveryTerms();
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
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <Icon name="cart" size={40} strokeWidth={1.4} className="text-ink-faint" />
        <h1 className="text-xl font-semibold text-ink">Your cart is empty</h1>
        <p className="text-sm text-ink-muted">Items you add will show up here.</p>
        <Link
          to="/search"
          className="mt-1 rounded-md bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
        >
          Browse products
        </Link>
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

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-md border border-line bg-raised">
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
                    className="media h-20 w-20 shrink-0 rounded-sm border border-line"
                  >
                    <ProductVisual product={product} fit="contain" sizes="80px" />
                  </Link>

                  <div className="min-w-[180px] flex-1">
                    <Link
                      to={`/product/${product.id}`}
                      className="clamp-2 text-sm text-ink hover:text-brand"
                    >
                      {product.name}
                    </Link>
                    <p className="tnum mt-1 text-sm text-ink-muted">{rs(product.price)} each</p>
                    {out ? (
                      <p className="mt-1 text-xs font-medium text-critical">
                        Out of stock — deselect to continue
                      </p>
                    ) : overStock ? (
                      <p className="tnum mt-1 text-xs font-medium text-caution">
                        Only {product.stock} available
                      </p>
                    ) : null}
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

                    <button
                      type="button"
                      aria-label={`Remove ${product.name} from cart`}
                      onClick={() => removeItem(product.id)}
                      className="rounded-sm p-1.5 text-ink-faint hover:text-critical"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="lg:sticky lg:top-24">
          <div className="rounded-md border border-line bg-raised p-4">
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
              aria-disabled={count < 1 || unavailable.length > 0}
              onClick={(e) => {
                if (count < 1 || unavailable.length > 0) e.preventDefault();
              }}
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-md py-3 text-base font-semibold ${
                count < 1 || unavailable.length > 0
                  ? "pointer-events-none bg-line-strong text-ink-faint"
                  : "bg-brand text-white hover:bg-brand-strong"
              }`}
            >
              {count < 1 ? "Select an item to continue" : "Continue to checkout"}
              {count > 0 && unavailable.length === 0 && <Icon name="arrowRight" size={17} />}
            </Link>

            <Link
              to="/search"
              className="mt-3 block text-center text-sm text-ink-muted hover:text-brand"
            >
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
