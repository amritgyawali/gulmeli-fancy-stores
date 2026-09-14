import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { ProductVisual } from "@/components/ProductCard";
import { Icon } from "@/components/Icon";
import { profileError, voucherDiscount } from "@/lib/commerce";
import { errorMessage } from "@/lib/format";
import type { Profile } from "@/lib/types";

export function CartPage() {
  const {
    cart,
    productById,
    setQty,
    toggle,
    select,
    removeSelected,
    commerce,
    updateCommerce,
    subtotal,
    count,
    checkout,
    session,
  } = useShop();
  const navigate = useNavigate();
  const [voucherInput, setVoucherInput] = useState(commerce.voucher);
  const [voucherNotice, setVoucherNotice] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState("");
  const discount = voucherDiscount(commerce.voucher, subtotal);
  const total = Math.max(0, subtotal - discount);
  const items = cart
    .map((item) => ({ item, product: productById[item.productId] }))
    .filter((entry) => entry.product);
  const allSelected = items.length > 0 && items.every((entry) => entry.item.selected);

  const applyVoucher = () => {
    const code = voucherInput.trim().toUpperCase();
    if (code && code !== "GULMELI10") {
      setVoucherNotice("Code not recognized. Use GULMELI10 for 10% off Rs. 500+ orders, up to Rs. 100.");
      return;
    }
    setVoucherNotice("");
    updateCommerce((current) => ({ ...current, voucher: code }));
  };

  const placeOrder = async (profile: Profile) => {
    setPlacing(true);
    setError("");
    try {
      const orderId = await checkout(profile);
      setPlaced(orderId);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPlacing(false);
    }
  };

  if (placed)
    return (
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <Icon name="check" size={32} />
        </div>
        <h1 className="mt-4 text-xl font-bold">Order placed</h1>
        <p className="mt-1 break-all text-sm text-slate-500">
          Order ID <span className="font-mono font-semibold">{placed}</span> — pay cash
          on delivery. It is now in your Account and visible on the mobile app.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link to="/account" className="rounded-lg bg-[#f85606] px-5 py-2.5 text-sm font-bold text-white">
            View orders
          </Link>
          <Link to="/" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700">
            Keep shopping
          </Link>
        </div>
      </div>
    );

  if (!items.length)
    return (
      <div className="py-20 text-center">
        <p className="text-4xl">🛒</p>
        <h1 className="mt-3 text-lg font-bold text-slate-700">Your cart is empty</h1>
        <Link to="/" className="mt-4 inline-block rounded-lg bg-[#f85606] px-6 py-2.5 text-sm font-bold text-white">
          Browse the store
        </Link>
      </div>
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-black">Shopping cart</h1>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-[#f85606]">
              {items.length} product{items.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-600">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => select(items.map((e) => e.item.productId), !allSelected)}
                className="h-4 w-4 accent-[#f85606]"
              />
              Select all
            </label>
            <button
              onClick={removeSelected}
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600"
            >
              <Icon name="trash" size={14} /> Remove selected
            </button>
          </div>
        </header>
        <ul className="divide-y divide-slate-100">
          {items.map(({ item, product }) => (
            <li key={item.productId} className="flex items-center gap-4 px-5 py-4">
              <input
                type="checkbox"
                checked={item.selected}
                onChange={() => toggle(item.productId)}
                aria-label={`Select ${product.name}`}
                className="h-4 w-4 shrink-0 accent-[#f85606]"
              />
              <Link to={`/product/${product.id}`} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                <ProductVisual product={product} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/product/${product.id}`} className="line-clamp-2 text-sm font-medium hover:text-[#f85606]">
                  {product.name}
                </Link>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {product.stock < 1
                    ? "Out of stock — deselect to continue"
                    : `Rs.${product.price.toLocaleString()} each · ${product.stock} in stock`}
                </p>
              </div>
              <div className="flex items-center rounded-lg border border-slate-200">
                <button
                  aria-label="Decrease quantity"
                  disabled={item.quantity <= 1}
                  onClick={() => setQty(product, item.quantity - 1)}
                  className="px-2.5 py-1.5 disabled:opacity-30"
                >
                  <Icon name="minus" size={12} />
                </button>
                <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                <button
                  aria-label="Increase quantity"
                  disabled={item.quantity >= product.stock}
                  onClick={() => setQty(product, item.quantity + 1)}
                  className="px-2.5 py-1.5 disabled:opacity-30"
                >
                  <Icon name="plus" size={12} />
                </button>
              </div>
              <p className="w-24 text-right text-sm font-extrabold text-[#f5222d]">
                Rs.{(product.price * item.quantity).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <aside className="h-fit space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold">Order summary</h2>
        <div className="flex gap-2">
          <input
            value={voucherInput}
            onChange={(event) => setVoucherInput(event.target.value)}
            placeholder="Voucher code"
            aria-label="Voucher code"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#f85606]"
          />
          <button onClick={applyVoucher} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white">
            Apply
          </button>
        </div>
        {voucherNotice && <p className="text-xs text-rose-600">{voucherNotice}</p>}
        {commerce.voucher && (
          <p className="text-xs font-semibold text-emerald-600">
            {commerce.voucher} applied
            <button
              onClick={() => {
                updateCommerce((current) => ({ ...current, voucher: "" }));
                setVoucherInput("");
              }}
              className="ml-2 text-slate-400 underline hover:text-rose-600"
            >
              remove
            </button>
          </p>
        )}
        <dl className="space-y-1.5 border-t border-slate-100 pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Selected items ({count})</dt>
            <dd className="font-semibold">Rs.{subtotal.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Voucher discount</dt>
            <dd className={`font-semibold ${discount ? "text-emerald-600" : ""}`}>
              {discount ? `-Rs.${discount}` : "—"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Shipping</dt>
            <dd className="font-semibold text-emerald-600">Free</dd>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-2 text-base">
            <dt className="font-bold">Total</dt>
            <dd className="font-black text-[#f5222d]">Rs.{total.toLocaleString()}</dd>
          </div>
        </dl>
        {error && (
          <p role="alert" className="rounded-lg bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
            {error}
          </p>
        )}
        {session ? (
          <CheckoutForm
            busy={placing}
            disabled={count < 1}
            profile={commerce.profile}
            onPlace={placeOrder}
          />
        ) : (
          <Link
            to="/auth"
            className="block rounded-xl bg-[#f85606] py-3 text-center text-sm font-bold text-white"
          >
            Sign in to place the order
          </Link>
        )}
        <button
          onClick={() => navigate("/")}
          className="w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-700"
        >
          ← Continue shopping
        </button>
      </aside>
    </div>
  );
}

function CheckoutForm({
  profile,
  busy,
  disabled,
  onPlace,
}: {
  profile: Profile;
  busy: boolean;
  disabled: boolean;
  onPlace: (profile: Profile) => Promise<void>;
}) {
  const [form, setForm] = useState<Profile>({
    ...profile,
    avatar: profile.avatar || "",
  });
  const [fieldError, setFieldError] = useState("");
  const submit = async () => {
    const error = profileError(form);
    if (error) {
      setFieldError(error);
      return;
    }
    setFieldError("");
    await onPlace(form);
  };
  return (
    <div className="space-y-2 border-t border-slate-100 pt-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Delivery details</p>
      {(
        [
          ["name", "Full name", "text"],
          ["phone", "Phone number", "tel"],
          ["address", "Delivery address", "text"],
        ] as const
      ).map(([key, label, type]) => (
        <label key={key} className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
          <input
            type={type}
            value={form[key]}
            onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#f85606]"
          />
        </label>
      ))}
      {fieldError && <p className="text-xs font-semibold text-rose-600">{fieldError}</p>}
      <button
        onClick={() => void submit()}
        disabled={busy || disabled}
        className="w-full rounded-xl bg-[#f85606] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#e14d05] disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {busy ? "Placing order…" : disabled ? "Select at least one item" : "Place order · Cash on delivery"}
      </button>
    </div>
  );
}
