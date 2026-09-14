import { Link } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { ProductVisual } from "./ProductCard";
import { rs } from "@/lib/format";

/*
 * Slide-in cart drawer, ported from the cart-drawer markup in
 * ../web ui ux design/daraz_nepal_homepage_clone/code.html. It is driven by
 * the same ShopContext cart as /cart — selecting/removing stays in sync.
 */
export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { cart, productById, subtotal, count, setQty, toggle } = useShop();
  const lines = cart.filter((i) => productById[i.productId]);
  return (
    <>
      {/* backdrop */}
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity ${
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
        <header className="flex items-center justify-between border-b border-gray-100 bg-[#f85606] px-4 py-3 text-white">
          <h2 className="text-base font-black">
            My Shopping Cart ({count})
          </h2>
          <button
            id="cart-close-btn"
            aria-label="Close cart"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/15 hover:bg-white/25"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-3">
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
            <ul className="divide-y divide-gray-100">
              {lines.map((item) => {
                const p = productById[item.productId];
                return (
                  <li key={item.productId} className="flex gap-3 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${p.name}`}
                      checked={item.selected}
                      onChange={() => toggle(p.id)}
                      className="mt-2 h-4 w-4 accent-[#f85606]"
                    />
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-gray-50">
                      <ProductVisual product={p} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/product/${p.id}`}
                        onClick={onClose}
                        className="line-clamp-2 text-xs font-medium text-gray-800 hover:text-[#f85606]"
                      >
                        {p.name}
                      </Link>
                      <p className="mt-1 text-sm font-bold text-[#f85606]">
                        {rs(p.price)}
                      </p>
                      <div className="mt-1 inline-flex items-center border border-gray-200 text-xs">
                        <button
                          aria-label={`Decrease ${p.name}`}
                          disabled={item.quantity <= 1 || item.quantity > p.stock}
                          onClick={() => setQty(p, item.quantity - 1)}
                          className="px-2 py-0.5 disabled:text-gray-300"
                        >
                          −
                        </button>
                        <span className="min-w-6 px-1 text-center">
                          {item.quantity}
                        </span>
                        <button
                          aria-label={`Increase ${p.name}`}
                          disabled={item.quantity >= p.stock}
                          onClick={() => setQty(p, item.quantity + 1)}
                          className="px-2 py-0.5 disabled:text-gray-300"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <footer className="border-t border-gray-100 p-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-lg font-black text-[#f85606]">
              {rs(subtotal)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/cart"
              onClick={onClose}
              className="rounded border border-[#f85606] px-4 py-2.5 text-center text-sm font-bold text-[#f85606] hover:bg-orange-50"
            >
              View Cart
            </Link>
            <Link
              to="/checkout"
              onClick={onClose}
              className="rounded bg-[#f85606] px-4 py-2.5 text-center text-sm font-black text-white hover:bg-[#d04402]"
            >
              Check Out ({count})
            </Link>
          </div>
        </footer>
      </aside>
    </>
  );
}
