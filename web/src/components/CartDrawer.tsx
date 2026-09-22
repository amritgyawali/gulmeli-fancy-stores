import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { ProductVisual, discountPercent } from "./ProductCard";
import { Icon } from "./Icon";
import { useToast } from "./Toast";
import { rs } from "@/lib/format";
import { voucherDiscount } from "@/lib/commerce";
import { deliveryFeeFor, useDeliveryTerms } from "@/lib/shipping";
import { prefersReducedMotion } from "@/lib/hooks";
import type { Product } from "@/lib/types";

/*
 * Slide-in cart.
 *
 * It unmounts when closed (an off-screen drawer kept its buttons in the tab
 * order), traps focus while open, returns focus to whatever opened it, and
 * restores the exact previous overflow value. Delivery terms come from
 * lib/shipping, the same numbers the product page and checkout quote.
 *
 * Added in this round:
 * - It slides in and out instead of appearing, and the backdrop fades.
 * - Removing a line offers Undo, because a trash icon next to a quantity
 *   stepper is easy to hit by mistake.
 * - When the order is short of free delivery, it suggests in-stock products
 *   priced to close the gap — the "add-on" row every marketplace cart has —
 *   chosen from the catalogue, cheapest sufficient first.
 */

const FOCUSABLE =
  'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { cart, productById, products, subtotal, count, setQty, removeItem, add, commerce } =
    useShop();
  const toast = useToast();
  const panel = useRef<HTMLElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  /* Stay mounted through the exit animation, then unmount. */
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const t = window.setTimeout(
      () => {
        setMounted(false);
        setClosing(false);
      },
      prefersReducedMotion() ? 0 : 200,
    );
    return () => window.clearTimeout(t);
  }, [open, mounted]);

  const terms = useDeliveryTerms();
  const lines = cart.filter((i) => productById[i.productId]);
  const deliveryFee = lines.length ? deliveryFeeFor(subtotal, terms) : 0;
  const voucher = voucherDiscount(commerce.voucher, subtotal);
  const total = Math.max(0, subtotal + deliveryFee - voucher);
  const toFreeDelivery = Math.max(0, terms.freeOver - subtotal);
  const progress = terms.freeOver > 0 ? Math.min(100, (subtotal / terms.freeOver) * 100) : 100;

  const addOns = useMemo(() => {
    if (!toFreeDelivery || !lines.length) return [];
    const inCart = new Set(cart.map((i) => i.productId));
    const candidates = products.filter((p) => p.stock > 0 && !inCart.has(p.id));
    const closes = candidates
      .filter((p) => p.price >= toFreeDelivery)
      .sort((a, b) => a.price - b.price);
    const rest = candidates
      .filter((p) => p.price < toFreeDelivery)
      .sort((a, b) => b.price - a.price);
    return [...closes, ...rest].slice(0, 6);
  }, [toFreeDelivery, lines.length, cart, products]);

  useEffect(() => {
    if (!open) return;
    restoreFocus.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    /* Move focus into the panel so the next Tab lands inside it. */
    requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus());

    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = previousOverflow;
      restoreFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!mounted) return null;

  const remove = (p: Product, quantity: number) => {
    removeItem(p.id);
    toast({
      message: `Removed ${p.name}`,
      tone: "info",
      action: {
        label: "Undo",
        onClick: () => {
          for (let i = 0; i < quantity; i += 1) add(p);
        },
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button
        type="button"
        aria-label="Close cart"
        onClick={onClose}
        tabIndex={-1}
        className={`absolute inset-0 bg-ink/45 transition-opacity duration-200 ${
          closing ? "opacity-0" : "animate-fade-in"
        }`}
      />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-raised shadow-e3 transition-transform duration-200 ease-in-quad ${
          closing ? "translate-x-full" : "animate-slide-in-right"
        }`}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-lg font-semibold text-ink">
            Your cart
            {count > 0 && <span className="tnum ml-1.5 text-ink-muted">({count})</span>}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="hit -mr-2 grid place-items-center rounded-sm text-ink-muted hover:bg-sunken hover:text-ink"
          >
            <Icon name="close" size={20} />
          </button>
        </header>

        {lines.length > 0 && terms.freeOver > 0 && (
          <div className="shrink-0 border-b border-line bg-brand-soft px-4 py-3">
            <p className="flex items-center gap-2 text-sm text-brand-strong">
              <Icon name="truckFast" size={16} className="shrink-0" />
              {toFreeDelivery > 0 ? (
                <span>
                  Add <strong className="tnum">{rs(toFreeDelivery)}</strong> more for{" "}
                  <strong>free delivery</strong>
                </span>
              ) : (
                <span className="font-semibold">You have unlocked free delivery</span>
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

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-sunken">
                <Icon name="cart" size={36} className="text-ink-faint" strokeWidth={1.4} />
              </span>
              <p className="text-base font-semibold text-ink">Your cart is empty</p>
              <p className="text-sm text-ink-muted">Items you add will show up here.</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-1 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-line">
                {lines.map((item) => {
                  const p = productById[item.productId];
                  const overStock = item.quantity > p.stock;
                  const off = discountPercent(p);
                  return (
                    <li key={item.productId} className="animate-fade-in flex gap-3 p-4">
                      <Link
                        to={`/product/${p.id}`}
                        onClick={onClose}
                        className="media h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-line"
                      >
                        <ProductVisual product={p} fit="cover" width={80} />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to={`/product/${p.id}`}
                            onClick={onClose}
                            className="clamp-2 text-sm leading-snug text-ink hover:text-brand"
                          >
                            {p.name}
                          </Link>
                          <button
                            type="button"
                            aria-label={`Remove ${p.name} from cart`}
                            onClick={() => remove(p, item.quantity)}
                            className="-mr-1 -mt-1 shrink-0 rounded-md p-1.5 text-ink-faint hover:bg-critical-soft hover:text-critical"
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                        {overStock && (
                          <p className="mt-1 text-xs font-medium text-critical">
                            Only {p.stock} in stock
                          </p>
                        )}
                        <div className="mt-2 flex items-end justify-between gap-2">
                          <div className="tnum">
                            <span className="block text-base font-bold text-brand">
                              {rs(p.price * item.quantity)}
                            </span>
                            {(item.quantity > 1 || off > 0) && (
                              <span className="block text-xs text-ink-muted">
                                {item.quantity > 1 && `${rs(p.price)} each`}
                                {item.quantity > 1 && off > 0 && " · "}
                                {off > 0 && (
                                  <span className="font-medium text-positive">{off}% off</span>
                                )}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center rounded-full border border-line">
                            <button
                              type="button"
                              aria-label={`Decrease quantity of ${p.name}`}
                              disabled={item.quantity <= 1}
                              onClick={() => setQty(p, item.quantity - 1)}
                              className="grid h-8 w-8 place-items-center rounded-l-full text-ink-soft hover:bg-sunken disabled:opacity-30"
                            >
                              <Icon name="minus" size={14} />
                            </button>
                            <span className="tnum w-7 text-center text-sm font-semibold text-ink">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label={`Increase quantity of ${p.name}`}
                              disabled={item.quantity >= p.stock}
                              onClick={() => setQty(p, item.quantity + 1)}
                              className="grid h-8 w-8 place-items-center rounded-r-full text-ink-soft hover:bg-sunken disabled:opacity-30"
                            >
                              <Icon name="plus" size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {addOns.length > 0 && (
                <section className="border-t border-line bg-sunken px-4 py-4">
                  <h3 className="mb-2.5 text-sm font-semibold text-ink">
                    Add one of these for free delivery
                  </h3>
                  <ul className="rail -mx-4 scroll-px-4 gap-2.5 px-4">
                    {addOns.map((p) => (
                      <li
                        key={p.id}
                        className="flex w-[128px] flex-col overflow-hidden rounded-lg border border-line bg-raised"
                      >
                        <Link
                          to={`/product/${p.id}`}
                          onClick={onClose}
                          className="media aspect-square w-full"
                        >
                          <ProductVisual product={p} width={128} />
                        </Link>
                        <div className="flex flex-1 flex-col p-2">
                          <p className="clamp-2 text-xs leading-snug text-ink-soft">{p.name}</p>
                          <p className="tnum mt-auto pt-1 text-sm font-bold text-brand">
                            {rs(p.price)}
                          </p>
                          <button
                            type="button"
                            onClick={() => add(p)}
                            aria-label={`Add ${p.name} to cart`}
                            className="mt-1.5 flex h-8 items-center justify-center gap-1 rounded-full border border-brand text-xs font-semibold text-brand hover:bg-brand hover:text-white"
                          >
                            <Icon name="plus" size={13} />
                            Add
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>

        {lines.length > 0 && (
          <div className="shrink-0 border-t border-line bg-raised p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <dl className="tnum space-y-1.5 text-sm">
              <div className="flex justify-between text-ink-muted">
                <dt>Subtotal</dt>
                <dd className="text-ink">{rs(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-ink-muted">
                <dt>Delivery</dt>
                <dd className={deliveryFee ? "text-ink" : "font-medium text-positive"}>
                  {deliveryFee ? rs(deliveryFee) : "Free"}
                </dd>
              </div>
              {voucher > 0 && (
                <div className="flex justify-between text-positive">
                  <dt>Voucher</dt>
                  <dd>− {rs(voucher)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-line pt-2 text-base font-semibold text-ink">
                <dt>Total</dt>
                <dd className="text-xl text-brand">{rs(total)}</dd>
              </div>
            </dl>
            <div className="mt-3 grid grid-cols-[1fr_2fr] gap-2">
              <Link
                to="/cart"
                onClick={onClose}
                className="flex items-center justify-center rounded-full border border-line py-3 text-sm font-semibold text-ink hover:border-ink-faint"
              >
                View cart
              </Link>
              <Link
                to="/checkout"
                onClick={onClose}
                className="flex items-center justify-center gap-2 rounded-full bg-brand py-3 text-sm font-semibold text-white shadow-e1 hover:bg-brand-strong"
              >
                <Icon name="lock" size={15} />
                Checkout
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
