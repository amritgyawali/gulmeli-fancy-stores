import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { usePublishedConfig } from "@/lib/config-api";
import { ProductVisual } from "@/components/ProductCard";
import { M3 } from "@/layouts/StoreM3Layout";
import { useOrderQuote } from "@/lib/order-quote";
import { profileError } from "@/lib/commerce";
import { rs } from "@/lib/format";
import type { Profile } from "@/lib/types";

/*
 * Checkout rebuilt from
 * ../web ui ux design/daraz_nepal_checkout_buy_now/code.html: the M3 chrome
 * (StoreM3Layout) wraps a stepper bar, delivery-address card, shipping-speed
 * radios, store item card, payment-method stack, coins + voucher row and a
 * sticky Order Summary. It submits through the same authoritative ShopContext
 * checkout() the mobile app uses; quote/voucher/profile wiring is unchanged.
 */

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
  const config = usePublishedConfig();
  const [profile, setProfile] = useState<Profile>(commerce.profile);
  const [voucher, setVoucher] = useState(commerce.voucher);
  const [delivery, setDelivery] = useState("standard");
  const [payment, setPayment] = useState("cod");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const lines = cart.filter((i) => i.selected && productById[i.productId]);
  const { quote, error: quoteError } = useOrderQuote(
    !!session && count > 0,
    cart,
    voucher,
  );
  const discount = quote?.discount ?? 0;
  const shipping = (quote?.shipping ?? 0) + (delivery === "express" ? 100 : 0);
  const total = quote ? quote.total + (delivery === "express" ? 100 : 0) : 0;

  const place = async () => {
    if (busy || !quote) return;
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
      const orderId = await checkout(
        { ...profile, name: profile.name.trim() },
        voucher,
      );
      navigate(`/account?order=${encodeURIComponent(orderId)}`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Order could not be placed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col w-full">
      {/* Stepper bar */}
      <div className="w-full bg-surface-container-low py-space-md">
        <div className="max-w-[1200px] mx-auto px-margin-desktop flex items-center justify-between">
          <div className="flex items-center gap-space-sm font-label-md text-label-md text-on-surface-variant">
            <Link
              className="hover:text-primary transition-colors flex items-center gap-1 text-on-surface-variant"
              to="/cart"
            >
              <span className="w-5 h-5 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center font-bold text-[11px]">
                1
              </span>
              <span>Shopping Cart</span>
            </Link>
            <M3 className="text-[16px] text-outline">chevron_right</M3>
            <div className="flex items-center gap-1 text-primary font-bold">
              <span className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center text-[11px]">
                2
              </span>
              <span>Checkout &amp; Delivery</span>
            </div>
            <M3 className="text-[16px] text-outline">chevron_right</M3>
            <div className="flex items-center gap-1 text-on-surface-variant opacity-60">
              <span className="w-5 h-5 rounded-full bg-surface-container-highest flex items-center justify-center text-[11px]">
                3
              </span>
              <span>Payment</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-space-xs text-tertiary font-label-sm text-label-sm">
            <M3 className="text-[18px]">verified_user</M3>
            <span>256-bit SSL Encrypted Checkout</span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1200px] mx-auto px-margin-desktop py-space-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-8 flex flex-col gap-space-lg">
            {/* Delivery address */}
            <div className="bg-surface-container-lowest rounded-lg p-space-lg shadow-sm">
              <div className="flex items-center justify-between pb-space-sm">
                <div className="flex items-center gap-space-sm">
                  <M3 className="text-primary text-[22px]">location_on</M3>
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    Delivery Address
                  </span>
                </div>
                <span className="text-tertiary font-label-md text-label-md font-bold">
                  Enter your details
                </span>
              </div>
              <div className="bg-surface-container-low rounded-lg p-space-md mt-space-xs grid gap-space-md sm:grid-cols-2">
                <label className="block">
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-bold uppercase">
                    Full name
                  </span>
                  <input
                    value={profile.name}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="e.g. Amrit Sharma"
                    className="mt-1 w-full bg-surface-container-lowest rounded px-space-md py-space-sm outline-none font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary"
                  />
                </label>
                <label className="block">
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-bold uppercase">
                    Mobile number
                  </span>
                  <input
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, phone: e.target.value }))
                    }
                    placeholder="+977 98XXXXXXXX"
                    className="mt-1 w-full bg-surface-container-lowest rounded px-space-md py-space-sm outline-none font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-bold uppercase">
                    Street address · District, Province
                  </span>
                  <textarea
                    value={profile.address}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, address: e.target.value }))
                    }
                    placeholder="House/Street, Ward, City, District — Nepal"
                    rows={2}
                    className="mt-1 w-full bg-surface-container-lowest rounded px-space-md py-space-sm outline-none font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary"
                  />
                </label>
                <div className="sm:col-span-2 flex items-center gap-space-xs text-tertiary font-label-sm text-label-sm">
                  <M3 className="text-[16px]">check_circle</M3>
                  <span>Delivery coverage across all 77 districts</span>
                </div>
              </div>
              <div className="mt-space-lg">
                <span className="font-label-md text-label-md text-on-surface font-bold block mb-space-sm">
                  Select Shipping Speed
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                  <label
                    className={`relative flex items-start gap-space-sm p-space-md rounded-lg cursor-pointer transition-all ${
                      delivery === "standard"
                        ? "bg-primary-fixed/20"
                        : "bg-surface-container-low hover:bg-surface-container"
                    }`}
                  >
                    <input
                      checked={delivery === "standard"}
                      onChange={() => setDelivery("standard")}
                      className="accent-primary mt-1"
                      name="shipping_tier"
                      type="radio"
                      value="standard"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-headline-sm text-headline-sm text-on-surface">
                          Standard Delivery
                        </span>
                        <span
                          className={`font-headline-sm text-headline-sm font-bold ${
                            delivery === "standard" ? "text-primary" : "text-on-surface"
                          }`}
                        >
                          {quote ? rs(quote.shipping) : "…"}
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        2–4 days to your doorstep
                      </p>
                      <span className="inline-block mt-space-xs font-badge-micro text-badge-micro text-tertiary bg-surface-container-lowest px-1.5 py-0.5 rounded font-bold uppercase">
                        Daraz Express Fleet
                      </span>
                    </div>
                  </label>
                  <label
                    className={`relative flex items-start gap-space-sm p-space-md rounded-lg cursor-pointer transition-all ${
                      delivery === "express"
                        ? "bg-primary-fixed/20"
                        : "bg-surface-container-low hover:bg-surface-container"
                    }`}
                  >
                    <input
                      checked={delivery === "express"}
                      onChange={() => setDelivery("express")}
                      className="accent-primary mt-1"
                      name="shipping_tier"
                      type="radio"
                      value="express"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-headline-sm text-headline-sm text-on-surface">
                          Express Next-Day
                        </span>
                        <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          {quote ? rs(quote.shipping + 100) : "+ Rs. 100"}
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        Delivery tomorrow by 6:00 PM
                      </p>
                      <span className="inline-block mt-space-xs font-badge-micro text-badge-micro text-secondary bg-surface-container-lowest px-1.5 py-0.5 rounded font-bold uppercase">
                        Priority Slot
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Store + items */}
            <div className="bg-surface-container-lowest rounded-lg p-space-lg shadow-sm">
              <div className="flex items-center justify-between pb-space-sm">
                <div className="flex items-center gap-space-sm">
                  <div className="px-2 py-0.5 rounded bg-tertiary text-on-tertiary font-badge-micro text-badge-micro uppercase tracking-wider font-bold flex items-center gap-1">
                    <M3 className="text-[13px]">verified</M3>
                    <span>Verified Store</span>
                  </div>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    {config.branding.companyName}
                  </span>
                </div>
                <Link
                  className="text-tertiary hover:text-primary font-label-sm text-label-sm font-bold flex items-center gap-0.5"
                  to="/cart"
                >
                  <span>Edit cart</span>
                  <M3 className="text-[14px]">arrow_forward</M3>
                </Link>
              </div>
              {!lines.length && (
                <div className="pt-space-md text-center font-body-md text-body-md text-on-surface-variant">
                  No items selected — visit your cart to choose.
                </div>
              )}
              {lines.map((item, idx) => {
                const p = productById[item.productId];
                return (
                  <div
                    key={item.productId}
                    className={`pt-space-md flex flex-col md:flex-row gap-space-md items-start md:items-center justify-between bg-surface-container-low/50 p-space-md rounded-lg ${
                      idx ? "mt-space-md" : ""
                    }`}
                  >
                    <div className="flex items-start gap-space-md min-w-0">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-surface-container shrink-0 relative">
                        <ProductVisual product={p} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h3 className="font-body-lg text-body-lg text-on-surface font-semibold line-clamp-2 leading-snug">
                          {p.name}
                        </h3>
                        <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                          Qty: {item.quantity}
                        </span>
                      </div>
                    </div>
                    <div className="flex md:flex-col items-end justify-between w-full md:w-auto gap-space-xs shrink-0 pt-space-xs md:pt-0">
                      <div className="text-right">
                        <div className="font-price-card text-price-card text-primary font-bold">
                          {rs(p.price * item.quantity)}
                        </div>
                        {(p.originalPrice ?? 0) > p.price && (
                          <div className="flex items-center gap-1 justify-end">
                            <span className="font-price-strikethrough text-price-strikethrough text-on-surface-variant line-through">
                              {rs((p.originalPrice as number) * item.quantity)}
                            </span>
                            <span className="px-1 bg-primary text-on-primary font-badge-micro text-badge-micro rounded font-bold">
                              -{Math.round(100 - (p.price / p.originalPrice!) * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="mt-space-md flex flex-wrap items-center gap-space-md text-on-surface-variant font-label-sm text-label-sm">
                <span className="flex items-center gap-1 text-tertiary">
                  <M3 className="text-[16px]">verified</M3>
                  <span>100% Buyer Protection</span>
                </span>
                <span className="flex items-center gap-1">
                  <M3 className="text-[16px]">published_with_changes</M3>
                  <span>Easy returns within 7 days</span>
                </span>
                <span className="flex items-center gap-1 text-secondary font-semibold">
                  <M3 className="text-[16px]">local_shipping</M3>
                  <span>Ships from Kathmandu Hub</span>
                </span>
              </div>
            </div>

            {/* Payment method */}
            <div className="bg-surface-container-lowest rounded-lg p-space-lg shadow-sm">
              <div className="flex items-center justify-between pb-space-md">
                <div className="flex items-center gap-space-sm">
                  <M3 className="text-primary text-[22px]">payments</M3>
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    Payment Method
                  </span>
                </div>
                <span className="font-label-sm text-label-sm text-tertiary font-bold flex items-center gap-1">
                  <M3 className="text-[16px]">lock</M3>
                  <span>Safe &amp; Encrypted</span>
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                <label className="flex flex-col justify-between p-space-md rounded-lg bg-surface-container-low cursor-pointer hover:bg-surface-container transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="px-2 py-0.5 rounded bg-primary text-on-primary font-label-sm text-label-sm font-bold tracking-tight">
                        eSewa
                      </span>
                      <span className="font-label-md text-label-md text-on-surface font-bold">
                        Wallet
                      </span>
                    </div>
                    <input
                      checked={payment === "esewa"}
                      onChange={() => setPayment("esewa")}
                      className="accent-primary"
                      name="payment_method"
                      type="radio"
                      value="esewa"
                    />
                  </div>
                  <div className="mt-space-md">
                    <span className="px-1.5 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed font-badge-micro text-badge-micro font-bold uppercase block w-max">
                      Instant Cashback 5%
                    </span>
                    <span className="text-on-surface-variant font-body-sm text-body-sm block mt-1">
                      Pay with eSewa digital wallet ID
                    </span>
                  </div>
                </label>
                <label className="flex flex-col justify-between p-space-md rounded-lg bg-surface-container-low cursor-pointer hover:bg-surface-container transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="px-2 py-0.5 rounded bg-tertiary text-on-tertiary font-label-sm text-label-sm font-bold">
                        Khalti
                      </span>
                      <span className="font-label-md text-label-md text-on-surface font-bold">
                        / IME Pay
                      </span>
                    </div>
                    <input
                      checked={payment === "khalti"}
                      onChange={() => setPayment("khalti")}
                      className="accent-primary"
                      name="payment_method"
                      type="radio"
                      value="khalti"
                    />
                  </div>
                  <div className="mt-space-md">
                    <span className="text-on-surface-variant font-body-sm text-body-sm block">
                      Fast digital wallet transfer
                    </span>
                  </div>
                </label>
                <label className="flex flex-col justify-between p-space-md rounded-lg bg-surface-container-low cursor-pointer hover:bg-surface-container transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="font-label-md text-label-md text-on-surface font-bold">
                        Debit / Credit
                      </span>
                    </div>
                    <input
                      checked={payment === "card"}
                      onChange={() => setPayment("card")}
                      className="accent-primary"
                      name="payment_method"
                      type="radio"
                      value="card"
                    />
                  </div>
                  <div className="mt-space-md">
                    <span className="px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed-variant font-badge-micro text-badge-micro font-bold uppercase block w-max">
                      Nabil/NIC Asia 10% Off
                    </span>
                    <div className="flex items-center gap-1 mt-1 text-on-surface-variant font-label-sm text-label-sm">
                      <span>Visa</span>
                      <span>•</span>
                      <span>Mastercard</span>
                    </div>
                  </div>
                </label>
              </div>
              <div className="mt-space-md p-space-md rounded-lg bg-surface-container-low flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                    <M3 className="text-[18px]">currency_exchange</M3>
                  </div>
                  <div>
                    <span className="font-headline-sm text-headline-sm text-on-surface block">
                      Cash On Delivery (COD)
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Pay with cash upon package receipt at your doorstep
                    </span>
                  </div>
                </div>
                <label className="cursor-pointer">
                  <input
                    checked={payment === "cod"}
                    onChange={() => setPayment("cod")}
                    className="accent-primary"
                    name="payment_method"
                    type="radio"
                    value="cod"
                  />
                </label>
              </div>
              {payment !== "cod" && (
                <p className="mt-space-sm font-body-sm text-body-sm text-tertiary">
                  Online payments launch soon — your order is placed as Cash On
                  Delivery.
                </p>
              )}
            </div>

            {/* Voucher */}
            <div className="bg-surface-container-lowest rounded-lg p-space-lg shadow-sm flex flex-col md:flex-row gap-space-lg items-center justify-between">
              <div className="flex items-center gap-space-sm w-full md:w-auto">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shrink-0">
                  <M3 className="text-[24px]">monetization_on</M3>
                </div>
                <div>
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    Voucher discount
                  </span>
                  <span className="font-body-sm text-body-sm text-tertiary block ml-0">
                    {discount ? `Saving ${rs(discount)} on this order` : "Enter a code to save instantly"}
                  </span>
                </div>
              </div>
              <div className="w-full md:w-80">
                <div className="flex items-center bg-surface-container-low rounded-lg overflow-hidden p-1">
                  <M3 className="text-outline px-2 text-[20px]">confirmation_number</M3>
                  <input
                    value={voucher}
                    onChange={(e) => {
                      setVoucher(e.target.value);
                      updateCommerce((s) => ({ ...s, voucher: e.target.value }));
                    }}
                    placeholder="GULMELI10"
                    className="w-full bg-transparent outline-none font-label-md text-label-md text-on-surface uppercase font-bold"
                    type="text"
                  />
                  <span className="bg-surface-container-highest px-space-md py-1.5 rounded text-on-surface font-label-sm text-label-sm font-bold uppercase">
                    {discount ? "APPLIED" : "APPLY"}
                  </span>
                </div>
                {discount > 0 && (
                  <span className="font-badge-micro text-badge-micro text-primary font-bold block mt-1 pl-2">
                    Voucher '{voucher.trim()}' applied (-{rs(discount)})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-4 flex flex-col gap-space-lg lg:sticky lg:top-40">
            <div className="bg-surface-container-lowest rounded-lg p-space-lg shadow-md">
              <h2 className="font-headline-md text-headline-md text-on-surface pb-space-sm">
                Order Summary
              </h2>
              <div className="flex flex-col gap-space-sm py-space-md">
                <div className="flex items-center justify-between font-body-md text-body-md text-on-surface-variant">
                  <span>Items Total ({count} {count === 1 ? "Item" : "Items"})</span>
                  <span className="text-on-surface font-medium">{rs(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between font-body-md text-body-md text-on-surface-variant">
                  <span>Delivery Fee</span>
                  <span className="text-on-surface font-medium">
                    {quote ? (shipping ? rs(shipping) : "Free") : "…"}
                  </span>
                </div>
                <div className="flex items-center justify-between font-body-md text-body-md text-primary">
                  <span className="flex items-center gap-1">
                    <M3 className="text-[16px]">sell</M3>
                    <span>Voucher Discount</span>
                  </span>
                  <span className="font-medium">{discount ? `-${rs(discount)}` : rs(0)}</span>
                </div>
              </div>
              <div className="bg-surface-container-low p-space-md rounded-lg my-space-sm">
                <div className="flex items-baseline justify-between">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Total Amount
                  </span>
                  <div className="text-right">
                    <span className="font-price-hero text-price-hero text-primary font-bold tracking-tight">
                      {quote ? rs(total) : "…"}
                    </span>
                    <span className="font-badge-micro text-badge-micro text-on-surface-variant block uppercase">
                      VAT Included Where Applicable
                    </span>
                  </div>
                </div>
              </div>
              <button
                disabled={busy || !lines.length || !quote}
                onClick={() => void place()}
                className="w-full bg-primary hover:bg-primary-container text-on-primary py-3 px-space-lg rounded font-headline-sm text-headline-sm uppercase tracking-wider font-bold transition-all shadow-md flex items-center justify-center gap-2 mt-space-md active:scale-[0.99] disabled:opacity-50"
                type="button"
              >
                <M3 className="text-[20px]">lock</M3>
                <span>{busy ? "PLACING ORDER…" : "PLACE ORDER"}</span>
              </button>
              <p className="font-badge-micro text-badge-micro text-on-surface-variant text-center mt-space-sm">
                By placing an order, you agree to our{" "}
                <Link className="text-tertiary underline" to="/account">
                  Terms of Use
                </Link>{" "}
                and{" "}
                <Link className="text-tertiary underline" to="/account">
                  Privacy Policy
                </Link>
                .
              </p>
              {(notice || quoteError) && (
                <p role="alert" className="mt-space-sm text-center font-body-sm text-body-sm text-error">
                  {notice || quoteError}
                </p>
              )}
            </div>
            <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col gap-space-sm">
              <div className="flex items-center gap-space-sm text-on-surface">
                <M3 className="text-primary text-[20px]">security</M3>
                <span className="font-label-md text-label-md font-bold">
                  100% Buyer Protection
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Get full refund if item is not as described or not delivered
                within timeframe.
              </p>
              <div className="pt-space-xs flex items-center justify-between text-outline font-label-sm text-label-sm">
                <span className="flex items-center gap-1">
                  <M3 className="text-[16px] text-tertiary">check_circle</M3>
                  <span>Verified Seller</span>
                </span>
                <span className="flex items-center gap-1">
                  <M3 className="text-[16px] text-tertiary">verified_user</M3>
                  <span>PCI-DSS Safe</span>
                </span>
              </div>
            </div>
            <div className="bg-surface-container-low rounded-lg p-space-md">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-md text-label-md text-on-surface font-bold">
                  Delivery Coverage
                </span>
                <span className="font-badge-micro text-badge-micro text-tertiary uppercase font-bold">
                  Kathmandu Hub
                </span>
              </div>
              <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
                <div className="bg-primary h-full rounded-full w-3/4"></div>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant block mt-1">
                High dispatch readiness: orders usually ship in under 12 hours
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
