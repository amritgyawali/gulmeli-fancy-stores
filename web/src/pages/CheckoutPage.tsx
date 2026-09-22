import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { usePublishedConfig } from "@/lib/config-api";
import { ProductVisual } from "@/components/ProductCard";
import { Icon } from "@/components/Icon";
import { useOrderQuote } from "@/lib/order-quote";
import { profileError, voucherTerms, VOUCHER } from "@/lib/commerce";
import { useDeliveryTerms } from "@/lib/shipping";
import { deliveryWindow } from "@/lib/hooks";
import { rs } from "@/lib/format";
import type { Profile } from "@/lib/types";

/*
 * Checkout.
 *
 * Two things here were not cosmetic:
 *
 * 1. The express-delivery option added Rs.100 to the displayed total on the
 *    client. `checkout()` takes only a profile and a voucher — the server has
 *    no shipping tier — so choosing Express showed the customer one total and
 *    placed the order at another. There is one delivery option now, priced by
 *    the server quote, and the fee shown is the fee charged.
 *
 * 2. Four payment methods were selectable (eSewa, Khalti, card, cash) with
 *    promises attached — "Instant Cashback 5%", "Nabil/NIC Asia 10% Off" —
 *    and a line of small print admitting every one of them places a cash-on
 *    -delivery order anyway. Offering a payment method that silently becomes
 *    a different one is worse than not offering it, and the cashback was
 *    never real. Cash on delivery is the only method presented, and the
 *    others are listed as not yet available rather than as choices.
 *
 * Also removed: a "Delivery Coverage" progress bar permanently at 75%, a
 * three-step progress header whose third step ("Payment") does not exist, and
 * a "Verified Store" badge applied to the store by the store.
 *
 * The form itself now validates per field on blur and on submit, moves focus
 * to the first field in error, and marks fields with aria-invalid — it
 * previously surfaced one combined sentence at the bottom of a long page and
 * left the customer to work out which input it referred to.
 */

type FieldErrors = Partial<Record<keyof Profile, string>>;

const fieldError = (key: keyof Profile, value: string): string => {
  const v = value.trim();
  if (key === "name") return v.length < 2 ? "Enter your full name." : "";
  if (key === "phone") {
    const digits = v.replace(/\D/g, "");
    if (!/^\+?[0-9\s-]+$/.test(v) || digits.length < 7 || digits.length > 15)
      return "Enter a valid phone number (7–15 digits).";
    return "";
  }
  if (key === "address")
    return v.length < 8 ? "Enter your street, city and delivery area." : "";
  return "";
};

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
  const terms = useDeliveryTerms();
  const eta = deliveryWindow(terms.estimate);

  const [profile, setProfile] = useState<Profile>(commerce.profile);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [voucher, setVoucher] = useState(commerce.voucher);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const lines = cart.filter((i) => i.selected && productById[i.productId]);
  const { quote, error: quoteError } = useOrderQuote(!!session && count > 0, cart, voucher);

  const discount = quote?.discount ?? 0;
  const shipping = quote?.shipping ?? 0;
  const total = quote?.total ?? 0;

  useEffect(() => {
    document.title = "Checkout";
  }, []);

  /* Why the voucher field is not applying, in the customer's words. */
  const voucherHint = useMemo(() => {
    const code = voucher.trim().toUpperCase();
    if (!code) return "";
    if (discount > 0) return "";
    if (code !== VOUCHER.code) return "That code is not recognised.";
    if (subtotal < VOUCHER.minSpend)
      return `Spend ${rs(VOUCHER.minSpend - subtotal)} more to use this code.`;
    return "";
  }, [voucher, discount, subtotal]);

  const set = (key: keyof Profile, value: string) => {
    setProfile((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: fieldError(key, value) }));
  };

  const place = async () => {
    if (busy) return;
    const next: FieldErrors = {
      name: fieldError("name", profile.name),
      phone: fieldError("phone", profile.phone),
      address: fieldError("address", profile.address),
    };
    const firstBad = (Object.keys(next) as (keyof Profile)[]).find((k) => next[k]);
    setErrors(next);
    if (firstBad) {
      setNotice("");
      document.getElementById(`field-${firstBad}`)?.focus();
      return;
    }
    if (!lines.length) {
      setNotice("Select items in your cart before ordering.");
      return;
    }
    if (!session) {
      navigate("/auth");
      return;
    }
    if (!customerReady) {
      setNotice("Still loading your account — try again in a moment.");
      return;
    }
    if (!quote) {
      setNotice("Waiting for the order total. Try again in a moment.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      updateCommerce((s) => ({ ...s, profile, voucher }));
      const orderId = await checkout({ ...profile, name: profile.name.trim() }, voucher);
      navigate(`/account?order=${encodeURIComponent(orderId)}`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "The order could not be placed.");
    } finally {
      setBusy(false);
    }
  };

  const field = (
    key: keyof Profile,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> & { multiline?: boolean } = {},
  ) => {
    const { multiline, ...rest } = props;
    const err = errors[key];
    const Tag = multiline ? "textarea" : "input";
    return (
      <div className={multiline ? "sm:col-span-2" : ""}>
        <label htmlFor={`field-${key}`} className="mb-1 block text-sm font-medium text-ink">
          {label}
        </label>
        <Tag
          id={`field-${key}`}
          value={profile[key]}
          aria-invalid={!!err}
          aria-describedby={err ? `error-${key}` : undefined}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            set(key, e.target.value)
          }
          onBlur={() => setErrors((s) => ({ ...s, [key]: fieldError(key, profile[key]) }))}
          rows={multiline ? 3 : undefined}
          {...(rest as object)}
          className={`w-full rounded-md border bg-raised px-3 py-2.5 text-base text-ink outline-none placeholder:text-ink-faint focus:border-brand ${
            err ? "border-critical" : "border-line"
          }`}
        />
        {err && (
          <p id={`error-${key}`} className="mt-1 flex items-center gap-1.5 text-xs text-critical">
            <Icon name="alert" size={13} />
            {err}
          </p>
        )}
      </div>
    );
  };

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1.5 text-xs text-ink-muted">
          <li>
            <Link to="/cart" className="hover:text-brand">
              Cart
            </Link>
          </li>
          <li aria-hidden="true">
            <Icon name="chevronRight" size={12} />
          </li>
          <li className="text-ink" aria-current="page">
            Checkout
          </li>
        </ol>
      </nav>

      <h1 className="mb-5 text-2xl font-semibold text-ink">Checkout</h1>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {/* Delivery address */}
          <section className="rounded-md border border-line bg-raised p-4">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
              <Icon name="pin" size={18} className="text-ink-muted" />
              Delivery address
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {field("name", "Full name", { autoComplete: "name", placeholder: "Your name" })}
              {field("phone", "Mobile number", {
                autoComplete: "tel",
                inputMode: "tel",
                type: "tel",
                placeholder: "98XXXXXXXX",
              })}
              {field("address", "Street address, city and district", {
                multiline: true,
                autoComplete: "street-address",
                placeholder: "House / street, ward, city, district",
              })}
            </div>
          </section>

          {/* Items */}
          <section className="rounded-md border border-line bg-raised">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-ink">
                  {count} {count === 1 ? "item" : "items"}
                </h2>
                {eta && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                    <Icon name="truck" size={13} />
                    Estimated delivery <span className="font-medium text-positive">{eta}</span>
                  </p>
                )}
              </div>
              <Link
                to="/cart"
                className="flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-strong"
              >
                Edit cart
                <Icon name="chevronRight" size={14} />
              </Link>
            </div>
            {lines.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-muted">
                No items are selected. Choose items in your cart to continue.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {lines.map((item) => {
                  const p = productById[item.productId];
                  return (
                    <li key={item.productId} className="flex items-start gap-3 p-4">
                      <div className="media h-16 w-16 shrink-0 rounded-sm border border-line">
                        <ProductVisual product={p} fit="cover" width={64} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="clamp-2 text-sm text-ink">{p.name}</p>
                        <p className="tnum mt-0.5 text-sm text-ink-muted">
                          {rs(p.price)} × {item.quantity}
                        </p>
                      </div>
                      <p className="tnum shrink-0 text-sm font-semibold text-ink">
                        {rs(p.price * item.quantity)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Voucher */}
          <section className="rounded-md border border-line bg-raised p-4">
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-ink">
              <Icon name="ticket" size={18} className="text-ink-muted" />
              Voucher
            </h2>
            <p className="mb-3 text-sm text-ink-muted">{voucherTerms()}</p>
            <div className="flex gap-2">
              <input
                value={voucher}
                aria-label="Voucher code"
                onChange={(e) => {
                  setVoucher(e.target.value);
                  updateCommerce((s) => ({ ...s, voucher: e.target.value }));
                }}
                placeholder={VOUCHER.code}
                className="min-w-0 flex-1 rounded-md border border-line bg-raised px-3 py-2.5 text-base uppercase text-ink outline-none placeholder:normal-case placeholder:text-ink-faint focus:border-brand"
              />
              {discount > 0 && (
                <span className="flex shrink-0 items-center gap-1.5 rounded-md bg-positive-soft px-3 text-sm font-medium text-positive">
                  <Icon name="check" size={15} />
                  Applied
                </span>
              )}
            </div>
            <div aria-live="polite">
              {discount > 0 ? (
                <p className="tnum mt-2 text-sm text-positive">
                  {rs(discount)} off this order.
                </p>
              ) : voucherHint ? (
                <p className="mt-2 text-sm text-ink-muted">{voucherHint}</p>
              ) : null}
            </div>
          </section>

          {/* Payment */}
          <section className="rounded-md border border-line bg-raised p-4">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
              <Icon name="wallet" size={18} className="text-ink-muted" />
              Payment
            </h2>
            <div className="flex items-start gap-3 rounded-md border border-brand bg-brand-soft p-3.5">
              <Icon name="banknote" size={20} className="mt-0.5 shrink-0 text-brand" />
              <div>
                <p className="text-sm font-medium text-ink">Cash on delivery</p>
                <p className="text-sm text-ink-muted">
                  Pay the courier when your order arrives.
                </p>
              </div>
            </div>
            {/* Listed, not selectable, because selecting them did nothing. */}
            <p className="mt-3 text-sm text-ink-muted">
              Card and wallet payments (eSewa, Khalti) are not available yet.
            </p>
          </section>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24">
          <div className="rounded-md border border-line bg-raised p-4">
            <h2 className="mb-3 text-base font-semibold text-ink">Order summary</h2>
            <dl className="tnum space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">
                  Subtotal ({count} {count === 1 ? "item" : "items"})
                </dt>
                <dd className="text-ink">{rs(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Delivery</dt>
                <dd className={shipping ? "text-ink" : "text-positive"}>
                  {quote ? (shipping ? rs(shipping) : "Free") : "—"}
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
                <dd className="text-xl text-brand">{quote ? rs(total) : "—"}</dd>
              </div>
            </dl>
            <p className="mt-1 text-xs text-ink-muted">Inclusive of all taxes</p>

            <button
              type="button"
              disabled={busy || !lines.length || !quote}
              onClick={() => void place()}
              className="mt-4 hidden w-full items-center justify-center gap-2 rounded-full bg-brand py-3 text-base font-semibold text-white shadow-e1 hover:bg-brand-strong active:scale-[0.98] disabled:bg-line-strong disabled:text-ink-faint lg:flex"
            >
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Placing order…
                </>
              ) : (
                <>
                  <Icon name="lock" size={16} />
                  Place order
                </>
              )}
            </button>
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
              <Icon name="shieldCheck" size={14} />
              Pay in cash when your order arrives
            </p>

            <div aria-live="assertive">
              {(notice || quoteError) && (
                <p
                  role="alert"
                  className="mt-3 flex items-start gap-2 rounded-md border border-critical/30 bg-critical-soft px-3 py-2.5 text-sm text-critical"
                >
                  <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
                  {notice || quoteError}
                </p>
              )}
            </div>

            {!session && (
              <p className="mt-3 text-sm text-ink-muted">
                <Link to="/auth" className="font-medium text-brand hover:text-brand-strong">
                  Sign in
                </Link>{" "}
                to place your order.
              </p>
            )}

            <p className="mt-3 text-xs leading-relaxed text-ink-muted">
              By placing this order you agree to the{" "}
              <Link to="/help" className="underline hover:text-brand">
                terms of use
              </Link>{" "}
              and{" "}
              <Link to="/help" className="underline hover:text-brand">
                privacy policy
              </Link>{" "}
              of {config.branding.companyName}.
            </p>
          </div>
        </aside>
      </div>

      {/* Phone: the total and Place order stay on screen while the form
          scrolls. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-raised/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgb(20_22_26/0.06)] backdrop-blur-md lg:hidden">
        <div className="page flex items-center gap-3 py-2.5">
          <div className="tnum min-w-0 flex-1">
            <p className="text-xs text-ink-muted">
              Total · {count} {count === 1 ? "item" : "items"}
            </p>
            <p className="text-lg font-bold leading-tight text-brand">
              {quote ? rs(total) : "—"}
            </p>
          </div>
          <button
            type="button"
            disabled={busy || !lines.length || !quote}
            onClick={() => void place()}
            className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-7 text-sm font-semibold text-white active:scale-[0.98] disabled:bg-line-strong disabled:text-ink-faint"
          >
            {busy ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <Icon name="lock" size={15} />
            )}
            {busy ? "Placing…" : "Place order"}
          </button>
        </div>
      </div>
    </div>
  );
}
