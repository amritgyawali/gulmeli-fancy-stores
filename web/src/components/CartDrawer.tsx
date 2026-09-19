import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { ProductVisual } from "./ProductCard";
import { Icon } from "./Icon";
import { rs } from "@/lib/format";
import { voucherDiscount } from "@/lib/commerce";
import { deliveryFeeFor, useDeliveryTerms } from "@/lib/shipping";

/*
 * Slide-in cart.
 *
 * The previous version stayed mounted and moved off-screen with a transform.
 * Off-screen is not hidden: its buttons and links kept their place in the tab
 * order, so a keyboard user tabbing across the home page fell into a cart
 * they could not see. It also reset `document.body.style.overflow` to the
 * empty string on close, wiping any lock the mobile nav drawer had set.
 *
 * Now it unmounts when closed, traps focus while open, returns focus to
 * whatever opened it, and restores the exact previous overflow value.
 *
 * The delivery fee and free-delivery threshold come from lib/shipping rather
 * than the Rs.60-over-Rs.500 pair that used to be declared here, which did
 * not match either the product page or the published config.
 */

const FOCUSABLE =
  'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { cart, productById, subtotal, count, setQty, removeItem, commerce } = useShop();
  const panel = useRef<HTMLElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  const terms = useDeliveryTerms();
  const lines = cart.filter((i) => productById[i.productId]);
  const deliveryFee = lines.length ? deliveryFeeFor(subtotal, terms) : 0;
  const voucher = voucherDiscount(commerce.voucher, subtotal);
  const total = Math.max(0, subtotal + deliveryFee - voucher);
  const toFreeDelivery = Math.max(0, terms.freeOver - subtotal);
  const progress = terms.freeOver > 0 ? Math.min(100, (subtotal / terms.freeOver) * 100) : 100;

  useEffect(() => {
    if (!open) return;
    restoreFocus.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    /* Move focus into the panel so the next Tab lands inside it. */
    panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button
        type="button"
        aria-label="Close cart"
        onClick={onClose}
        className="absolute inset-0 bg-ink/45"
      />
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-raised shadow-e3"
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
          <div className="shrink-0 border-b border-line bg-brand-soft px-4 py-2.5">
            <p className="flex items-center gap-2 text-xs text-brand-strong">
              <Icon name="truckFast" size={15} className="shrink-0" />
              {toFreeDelivery > 0 ? (
                <span>
                  Spend <strong className="tnum">{rs(toFreeDelivery)}</strong> more for free
                  delivery
                </span>
              ) : (
                <span>Free delivery unlocked</span>
              )}
            </p>
            <div
              className="mt-1.5 h-1 overflow-hidden rounded-full bg-brand-border"
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progress to free delivery"
            >
              <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <Icon name="cart" size={40} className="text-ink-faint" strokeWidth={1.4} />
              <p className="text-base font-medium text-ink">Your cart is empty</p>
              <p className="text-sm text-ink-muted">
                Items you add will show up here.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-1 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {lines.map((item) => {
                const p = productById[item.productId];
                const overStock = item.quantity > p.stock;
                return (
                  <li key={item.productId} className="flex gap-3 p-4">
                    <div className="media h-16 w-16 shrink-0 rounded-sm border border-line">
                      <ProductVisual product={p} fit="contain" sizes="64px" />
                    </div>
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
                          onClick={() => removeItem(p.id)}
                          className="shrink-0 rounded-sm p-1 text-ink-faint hover:text-critical"
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                      {(p.brand || p.category) && (
                        <p className="mt-0.5 text-xs text-ink-faint">{p.brand ?? p.category}</p>
                      )}
                      {overStock && (
                        <p className="mt-1 text-xs font-medium text-critical">
                          Only {p.stock} in stock
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="tnum text-base font-bold text-brand">{rs(p.price)}</span>
                        <div className="flex items-center rounded-sm border border-line">
                          <button
                            type="button"
                            aria-label={`Decrease quantity of ${p.name}`}
                            disabled={item.quantity <= 1}
                            onClick={() => setQty(p, item.quantity - 1)}
                            className="grid h-8 w-8 place-items-center text-ink-soft hover:bg-sunken disabled:opacity-30"
                          >
                            <Icon name="minus" size={14} />
                          </button>
                          <span className="tnum w-8 text-center text-sm font-semibold text-ink">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label={`Increase quantity of ${p.name}`}
                            disabled={item.quantity >= p.stock}
                            onClick={() => setQty(p, item.quantity + 1)}
                            className="grid h-8 w-8 place-items-center text-ink-soft hover:bg-sunken disabled:opacity-30"
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
          )}
        </div>

        {lines.length > 0 && (
          <div className="shrink-0 border-t border-line bg-sunken p-4">
            <dl className="tnum space-y-1.5 text-sm">
              <div className="flex justify-between text-ink-muted">
                <dt>Subtotal</dt>
                <dd className="text-ink">{rs(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-ink-muted">
                <dt>Delivery</dt>
                <dd className={deliveryFee ? "text-ink" : "text-positive"}>
                  {deliveryFee ? rs(deliveryFee) : "Free"}
                </dd>
              </div>
              {voucher > 0 && (
                <div className="flex justify-between text-positive">
                  <dt>Voucher</dt>
                  <dd>− {rs(voucher)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-ink">
                <dt>Total</dt>
                <dd className="text-brand">{rs(total)}</dd>
              </div>
            </dl>
            <Link
              to="/checkout"
              onClick={onClose}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-brand py-3 text-sm font-semibold text-white hover:bg-brand-strong"
            >
              Checkout
              <Icon name="arrowRight" size={16} />
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
