import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { ProductVisual } from "@/components/ProductCard";
import { profileError, voucherDiscount } from "@/lib/commerce";
import { rs } from "@/lib/format";
import type { Profile } from "@/lib/types";

/*
 * Checkout rebuilt from
 * ../web ui ux design/daraz_nepal_checkout_buy_now/code.html: address card,
 * delivery coverage strip, payment method radios (COD default) and a sticky
 * Order Summary. It submits through the same authoritative ShopContext
 * checkout() the mobile app uses.
 */

const DELIVERY_OPTIONS = [
  { key: "standard", label: "Standard Delivery", eta: "2–4 days", fee: 0, icon: "fa-truck-fast" },
  { key: "express", label: "Express Next-Day", eta: "Tomorrow by 6 PM", fee: 120, icon: "fa-bolt" },
];

const PAYMENT_METHODS = [
  { key: "cod", label: "Cash On Delivery (COD)", note: "Pay with cash upon package receipt at your doorstep", icon: "fa-money-bill-wave" },
  { key: "esewa", label: "eSewa", note: "Pay with eSewa digital wallet ID", icon: "fa-wallet" },
  { key: "khalti", label: "Khalti", note: "Fast digital wallet transfer", icon: "fa-mobile-screen-button" },
  { key: "card", label: "Debit / Credit Card", note: "Card payments activate once the store enables the gateway", icon: "fa-credit-card" },
];

export default function CheckoutPage() {
  const {
    cart,
    productById,
    subtotal,
    count,
    commerce,
    updateCommerce,
    checkout,
    session,
    customerReady,
  } = useShop();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>(commerce.profile);
  const [voucher, setVoucher] = useState(commerce.voucher);
  const [delivery, setDelivery] = useState("standard");
  const [payment, setPayment] = useState("cod");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const lines = cart.filter((i) => i.selected && productById[i.productId]);
  const discount = voucherDiscount(voucher, subtotal);
  const shipping = delivery === "express" ? 120 : 0;
  const total = Math.max(0, subtotal - discount) + shipping;

  const place = async () => {
    if (busy) return;
    const error = profileError(profile);
    if (error) {
      setNotice(error);
      return;
    }
    if (!lines.length) {
      setNotice("Select items to order in your cart first.");
      return;
    }
    if (!session) {
      setNotice("Sign in to place an order.");
      navigate("/auth");
      return;
    }
    if (!customerReady) {
      setNotice("Loading your account — try again in a moment.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      updateCommerce((s) => ({ ...s, profile, voucher }));
      const orderId = await checkout({ ...profile, name: profile.name.trim() });
      navigate(`/account?order=${encodeURIComponent(orderId)}`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Order could not be placed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-16">
      {/* Breadcrumb strip like the design header */}
      <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold text-gray-400">
        <Link to="/" className="hover:text-[#f85606]">HOME</Link>
        <i className="fa-solid fa-chevron-right text-[8px]" />
        <Link to="/cart" className="hover:text-[#f85606]">CART</Link>
        <i className="fa-solid fa-chevron-right text-[8px]" />
        <span className="text-gray-700">CHECKOUT</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Delivery address */}
          <section className="rounded-[2px] border border-gray-200 bg-white shadow-sm">
            <header className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
              <i className="fa-solid fa-location-dot text-[#f85606]" />
              <h2 className="text-sm font-bold text-gray-800">Delivery Address</h2>
            </header>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-gray-500">
                Full name
                <input
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Amrit Sharma"
                  className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm font-normal outline-none focus:border-[#f85606]"
                />
              </label>
              <label className="text-xs font-semibold text-gray-500">
                Mobile number
                <input
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+977 98XXXXXXXX"
                  className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm font-normal outline-none focus:border-[#f85606]"
                />
              </label>
              <label className="text-xs font-semibold text-gray-500 sm:col-span-2">
                Street address · District, Province
                <textarea
                  value={profile.address}
                  onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
                  placeholder="House/Street, Ward, City, District — Nepal"
                  rows={2}
                  className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm font-normal outline-none focus:border-[#f85606]"
                />
              </label>
              <p className="col-span-full flex items-center gap-1 text-[11px] text-gray-400">
                <i className="fa-solid fa-shield-halved text-emerald-600" />
                Delivery coverage across all 77 districts; Kathmandu Hub dispatches same day before 2 PM.
              </p>
            </div>
          </section>

          {/* Delivery speed */}
          <section className="rounded-[2px] border border-gray-200 bg-white shadow-sm">
            <header className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
              <i className="fa-solid fa-truck text-[#f85606]" />
              <h2 className="text-sm font-bold text-gray-800">Delivery Speed</h2>
            </header>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {DELIVERY_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setDelivery(o.key)}
                  className={`flex items-center gap-3 rounded border p-3 text-left transition ${
                    delivery === o.key
                      ? "border-[#f85606] bg-orange-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <i
                    className={`fa-solid ${o.icon} ${
                      delivery === o.key ? "text-[#f85606]" : "text-gray-400"
                    }`}
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-gray-800">{o.label}</span>
                    <span className="block text-[11px] text-gray-400">{o.eta}</span>
                  </span>
                  <span className="text-xs font-black text-gray-700">
                    {o.fee ? rs(o.fee) : "Free"}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Payment method */}
          <section className="rounded-[2px] border border-gray-200 bg-white shadow-sm">
            <header className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
              <i className="fa-solid fa-money-check-dollar text-[#f85606]" />
              <h2 className="text-sm font-bold text-gray-800">Payment Method</h2>
            </header>
            <div className="divide-y divide-gray-100">
              {PAYMENT_METHODS.map((m) => (
                <label
                  key={m.key}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-gray-50 ${
                    payment === m.key ? "bg-orange-50/60" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={payment === m.key}
                    onChange={() => setPayment(m.key)}
                    className="h-4 w-4 accent-[#f85606]"
                  />
                  <i className={`fa-solid ${m.icon} w-5 text-center text-gray-500`} />
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-gray-800">{m.label}</span>
                    <span className="block text-[11px] text-gray-400">{m.note}</span>
                  </span>
                  {m.key === "card" && (
                    <span className="flex gap-1 text-[10px] text-gray-400">
                      <i className="fa-brands fa-cc-visa" />
                      <i className="fa-brands fa-cc-mastercard" />
                    </span>
                  )}
                </label>
              ))}
            </div>
          </section>

          {/* Items */}
          <section className="rounded-[2px] border border-gray-200 bg-white shadow-sm">
            <header className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
              <i className="fa-solid fa-bag-shopping text-[#f85606]" />
              <h2 className="text-sm font-bold text-gray-800">
                Order Items ({count})
              </h2>
              <Link to="/cart" className="ml-auto text-[11px] font-semibold text-[#0f828a] hover:underline">
                Edit cart
              </Link>
            </header>
            <ul className="divide-y divide-gray-50">
              {lines.map((item) => {
                const p = productById[item.productId];
                return (
                  <li key={item.productId} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-gray-50">
                      <ProductVisual product={p} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-xs font-medium text-gray-800">{p.name}</p>
                      <p className="text-[11px] text-gray-400">Qty {item.quantity}</p>
                    </div>
                    <span className="text-sm font-bold text-[#f85606]">
                      {rs(p.price * item.quantity)}
                    </span>
                  </li>
                );
              })}
              {!lines.length && (
                <li className="px-4 py-6 text-center text-xs text-gray-400">
                  No items selected — visit your cart to choose.
                </li>
              )}
            </ul>
          </section>
        </div>

        {/* Order summary */}
        <aside className="lg:sticky lg:top-40 lg:self-start">
          <div className="rounded-[2px] border border-gray-200 bg-white shadow-sm">
            <header className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
              <i className="fa-solid fa-file-invoice text-[#f85606]" />
              <h2 className="text-sm font-bold text-gray-800">Order Summary</h2>
            </header>
            <div className="space-y-2.5 p-4 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal ({count} items)</span>
                <span>{rs(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Voucher discount</span>
                <span className={discount ? "font-bold text-emerald-600" : ""}>
                  {discount ? `− ${rs(discount)}` : rs(0)}
                </span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Shipping</span>
                <span>{shipping ? rs(shipping) : "Free"}</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  value={voucher}
                  onChange={(e) => {
                    setVoucher(e.target.value);
                    updateCommerce((s) => ({ ...s, voucher: e.target.value }));
                  }}
                  placeholder="Voucher code (GULMELI10)"
                  aria-label="Voucher code"
                  className="min-w-0 flex-1 rounded border border-dashed border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-[#f85606]"
                />
              </div>
              <hr className="border-gray-100" />
              <div className="flex items-baseline justify-between">
                <span className="font-black text-gray-800">Total</span>
                <span className="text-xl font-black text-[#f85606]">{rs(total)}</span>
              </div>
              <button
                type="button"
                disabled={busy || !lines.length}
                onClick={() => void place()}
                className="mt-1 w-full rounded-[2px] bg-[#f85606] py-3 text-sm font-black uppercase tracking-wide text-white shadow transition hover:bg-[#d04402] disabled:opacity-50"
              >
                {busy ? "Placing order…" : "Place Order"}
              </button>
              {notice && (
                <p role="alert" className="text-[11px] font-semibold text-rose-600">
                  {notice}
                </p>
              )}
              <p className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <i className="fa-solid fa-lock" />
                100% Buyer Protection · Easy returns within 7 days
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
