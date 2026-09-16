import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { ProductVisual } from "./ProductCard";
import { rs } from "@/lib/format";
import { voucherDiscount } from "@/lib/commerce";

/*
 * Slide-in cart drawer, ported from the cart-drawer markup in
 * ../web ui ux design/daraz_nepal_homepage_clone/code.html: orange header
 * with bag icon, free-delivery promo strip, item rows with trash-can remove
 * and a −/+ stepper, then a gray pricing-breakdown footer (Subtotal /
 * Delivery Fee / Voucher Discount / Total) closing on a single
 * "Proceed to Checkout" bar.
 */
const DELIVERY_FEE = 60;
export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { cart, productById, subtotal, count, setQty, removeItem, commerce } = useShop();
  const lines = cart.filter((i) => productById[i.productId]);
  const deliveryFee = lines.length && subtotal < 500 ? DELIVERY_FEE : 0;
  const voucher = voucherDiscount(commerce.voucher, subtotal);
  const total = Math.max(0, subtotal + deliveryFee - voucher);
  const toFreeDelivery = Math.max(0, 500 - subtotal);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  return (
    <>
      {/* backdrop */}
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        id="cart-drawer"
        aria-label="Shopping Cart"
        className={`fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-md translate-x-full flex-col bg-white shadow-2xl transition-transform duration-300 ${
          open ? "!translate-x-0" : ""
        }`}
      >
        {/* Header */}
        <header className="flex items-center justify-between bg-[#f85606] px-4 py-4 text-white shadow-sm">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-bag-shopping text-lg" />
            <h2 className="text-base font-bold tracking-wide">My Shopping Cart ({count})</h2>
          </div>
          <button
            id="cart-close-btn"
            aria-label="Close cart"
            onClick={onClose}
            className="rounded p-1 text-lg text-white hover:text-gray-200"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </header>
        {/* Free shipping promo banner */}
        {lines.length > 0 && (
          <div className="flex items-center gap-2 border-b border-[#fed6c5] bg-[#fff6f2] px-4 py-2 text-xs text-[#f85606]">
            <i className="fa-solid fa-truck-fast text-sm" />
            {toFreeDelivery > 0 ? (
              <span>
                Add <strong>{rs(toFreeDelivery)}</strong> more to qualify for{" "}
                <strong>FREE DELIVERY</strong>!
              </span>
            ) : (
              <span>
                You qualify for <strong>FREE DELIVERY</strong>!
              </span>
            )}
          </div>
        )}
        {/* Items list */}
        <div className="flex-1 divide-y divide-gray-100 overflow-y-auto p-4">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
              <i className="fa-solid fa-cart-shopping text-4xl" />
              <p className="text-sm">Your cart is empty.</p>
              <button
                onClick={onClose}
                className="rounded bg-[#f85606] px-5 py-2 text-sm font-bold text-white"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            lines.map((item) => {
              const p = productById[item.productId];
              return (
                <div key={item.productId} className="flex items-start gap-3 pt-3 first:pt-0">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded border bg-gray-50 p-1">
                    <ProductVisual product={p} fit="contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between">
                      <Link
                        to={`/product/${p.id}`}
                        onClick={onClose}
                        className="line-clamp-2 text-xs font-medium leading-snug text-gray-800 hover:text-[#f85606]"
                      >
                        {p.name}
                      </Link>
                      <button
                        aria-label={`Remove ${p.name}`}
                        onClick={() => removeItem(p.id)}
                        className="ml-2 text-xs text-gray-400 hover:text-red-500"
                      >
                        <i className="fa-regular fa-trash-can" />
                      </button>
                    </div>
                    <div className="mt-0.5 text-xs text-gray-400">
                      Variant: {p.brand ?? p.category}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-sm font-bold text-[#f85606]">{rs(p.price)}</div>
                      <div className="flex items-center rounded border border-gray-300">
                        <button
                          aria-label={`Decrease ${p.name}`}
                          disabled={item.quantity <= 1 || item.quantity > p.stock}
                          onClick={() => setQty(p, item.quantity - 1)}
                          className="px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                        >
                          −
                        </button>
                        <span className="min-w-6 px-2 text-center text-xs font-semibold text-gray-800">
                          {item.quantity}
                        </span>
                        <button
                          aria-label={`Increase ${p.name}`}
                          disabled={item.quantity >= p.stock}
                          onClick={() => setQty(p, item.quantity + 1)}
                          className="px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {/* Pricing breakdown & checkout */}
        {lines.length > 0 && (
          <div className="space-y-2.5 border-t border-gray-200 bg-gray-50 p-4">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium text-gray-800">{rs(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Delivery Fee</span>
              <span className="font-medium text-gray-800">
                {deliveryFee ? rs(deliveryFee) : "Free"}
              </span>
            </div>
            {voucher > 0 && (
              <div className="flex justify-between text-xs text-green-600">
                <span>Voucher Discount</span>
                <span className="font-medium">− {rs(voucher)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-bold text-gray-900">
              <span>Total</span>
              <span className="text-base text-[#f85606]">{rs(total)}</span>
            </div>
            <Link
              to="/checkout"
              onClick={onClose}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-[2px] bg-[#f85606] py-3 text-xs font-bold uppercase tracking-wider text-white shadow transition hover:bg-[#d04402]"
            >
              <span>Proceed to Checkout</span>
              <i className="fa-solid fa-arrow-right text-xs" />
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
