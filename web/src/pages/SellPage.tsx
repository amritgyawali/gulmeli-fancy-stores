import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { usePublishedConfig } from "@/lib/config-api";
import { rs } from "@/lib/format";
import { Icon } from "@/components/Icon";

/*
 * Become a seller.
 *
 * The page kept its purpose — recruiting merchants — and lost the operational
 * commitments it had no basis for making: "approves within 2 working days",
 * "Every Wednesday batch … wired through NCHL-IPS within 24 hours", "overflow
 * rides on partner couriers like Pathao and DHL", and a "Seller University"
 * offering free courses. None of those systems exist in this codebase, and a
 * merchant deciding whether to stock a shop is entitled not to be told
 * otherwise.
 *
 * The fee calculator stayed, because it is genuinely useful, and it now says
 * plainly that the commission rate is the seller's own input rather than a
 * quoted rate. The three "store types" with precise commission bands became
 * one honest line: the rate is agreed when the store is approved.
 *
 * Visually: the four-stop orange gradient hero and the near-black closing
 * panel are gone, as is the second call-to-action that repeated the first.
 */

const STEPS = [
  {
    icon: "file",
    title: "Apply",
    copy: "Send your registration details and a bank account in the same name.",
  },
  {
    icon: "idCard",
    title: "Get verified",
    copy: "We check your documents before your store goes live.",
  },
  {
    icon: "boxes",
    title: "List products",
    copy: "Add photos, prices and stock from the seller console or the app.",
  },
  {
    icon: "wallet",
    title: "Get paid",
    copy: "Revenue from delivered orders, less commission, to your bank account.",
  },
];

const BENEFITS = [
  { icon: "banknote", title: "No upfront cost", copy: "No listing fee and no deposit — commission is charged on sales." },
  { icon: "truckFast", title: "Nationwide delivery", copy: "Orders reach customers across all 77 districts." },
  { icon: "mobile", title: "Console and app", copy: "Manage stock and orders from a browser or your phone." },
  { icon: "chartLine", title: "Sales reporting", copy: "See what sells, what is running low and what was returned." },
];

const FAQS = [
  {
    q: "What does it cost to start?",
    a: "Nothing upfront. There is no listing fee, no monthly rent and no deposit. Commission is charged on completed sales, at the rate agreed when your store is approved.",
  },
  {
    q: "Which documents do I need?",
    a: "A citizenship certificate if you are selling as an individual, or company registration and PAN/VAT documents if you are selling as a business — plus a bank account in the same name.",
  },
  {
    q: "How do orders reach customers?",
    a: "Orders are collected and delivered through the store's courier network. Cash collected on delivery is settled with your sales revenue.",
  },
  {
    q: "When am I paid?",
    a: "On the store's regular payout cycle, covering delivered orders less commission. The schedule is confirmed with you when your store is approved.",
  },
];

export default function SellPage() {
  const config = usePublishedConfig();
  const [price, setPrice] = useState(1500);
  const [commission, setCommission] = useState(5);
  const [shipping, setShipping] = useState(90);
  const id = useId();

  const brand = config.branding.companyName;
  const fee = Math.round((price * commission) / 100);
  const payout = Math.max(0, price - fee - shipping);

  return (
    <div className="space-y-10">
      <header className="rounded-md border border-line bg-raised p-6 sm:p-8">
        <h1 className="max-w-2xl text-3xl font-semibold text-ink">
          Sell on {brand}
        </h1>
        <p className="mt-2 max-w-2xl text-base text-ink-muted">
          Reach customers across Nepal with cash on delivery, bank payouts and a
          seller console that matches the mobile app.
        </p>
        <Link
          to="/auth"
          className="mt-5 inline-block rounded-md bg-brand px-6 py-2.5 text-base font-semibold text-white hover:bg-brand-strong"
        >
          Start selling
        </Link>
      </header>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-ink">How it works</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-md border border-line bg-raised p-4">
              <div className="flex items-center gap-2.5">
                <span className="tnum grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand-strong">
                  {i + 1}
                </span>
                <Icon name={s.icon} size={19} className="text-ink-muted" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-ink">{s.title}</h3>
              <p className="mt-1 text-sm leading-snug text-ink-muted">{s.copy}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-ink">Why sell here</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => (
            <li key={b.title} className="rounded-md border border-line bg-raised p-4">
              <Icon name={b.icon} size={20} className="text-brand" />
              <h3 className="mt-2.5 text-sm font-semibold text-ink">{b.title}</h3>
              <p className="mt-1 text-sm leading-snug text-ink-muted">{b.copy}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-ink">Estimate your payout</h2>
        <p className="mb-4 mt-1 text-sm text-ink-muted">
          An estimate for one delivered order. Enter the commission rate you have
          been quoted — this calculator does not set it.
        </p>

        <div className="grid gap-4 rounded-md border border-line bg-raised p-5 lg:grid-cols-2">
          <div className="space-y-5">
            <div>
              <label htmlFor={`${id}-price`} className="block text-sm font-medium text-ink">
                Selling price
              </label>
              <input
                id={`${id}-price`}
                type="range"
                min={200}
                max={50000}
                step={50}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="mt-2 w-full accent-[var(--color-brand)]"
              />
              <output className="tnum mt-1 block text-base font-semibold text-ink">
                {rs(price)}
              </output>
            </div>

            <div>
              <label htmlFor={`${id}-commission`} className="block text-sm font-medium text-ink">
                Commission rate
              </label>
              <input
                id={`${id}-commission`}
                type="range"
                min={1}
                max={12}
                step={0.5}
                value={commission}
                onChange={(e) => setCommission(Number(e.target.value))}
                className="mt-2 w-full accent-[var(--color-brand)]"
              />
              <output className="tnum mt-1 block text-base font-semibold text-ink">
                {commission}%
              </output>
            </div>

            <div>
              <label htmlFor={`${id}-shipping`} className="block text-sm font-medium text-ink">
                Delivery cost you cover
              </label>
              <input
                id={`${id}-shipping`}
                type="number"
                min={0}
                value={shipping}
                onChange={(e) => setShipping(Math.max(0, Number(e.target.value) || 0))}
                className="tnum mt-2 w-40 rounded-md border border-line bg-raised px-3 py-2 text-base text-ink outline-none focus:border-brand"
              />
            </div>
          </div>

          <dl className="tnum flex flex-col justify-center gap-2.5 rounded-md bg-sunken p-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Sale</dt>
              <dd className="text-ink">{rs(price)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Commission ({commission}%)</dt>
              <dd className="text-ink">− {rs(fee)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Delivery</dt>
              <dd className="text-ink">− {rs(shipping)}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt className="text-base font-semibold text-ink">You keep</dt>
              <dd className="text-2xl font-semibold text-brand">{rs(payout)}</dd>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Before any tax withholding that applies to you.
            </p>
          </dl>
        </div>
      </section>

      <section className="max-w-3xl">
        <h2 className="mb-3 text-xl font-semibold text-ink">Questions</h2>
        <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-raised">
          {FAQS.map((f) => (
            <li key={f.q}>
              <details className="group px-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-sm font-medium text-ink">
                  {f.q}
                  <Icon
                    name="chevronDown"
                    size={16}
                    className="shrink-0 text-ink-muted transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="pb-4 text-sm leading-relaxed text-ink-muted">{f.a}</p>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-md border border-line bg-raised p-6 text-center">
        <h2 className="text-xl font-semibold text-ink">Ready to open your store?</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">
          Create an account and we will take you through verification.
        </p>
        <Link
          to="/auth"
          className="mt-4 inline-block rounded-md bg-brand px-6 py-2.5 text-base font-semibold text-white hover:bg-brand-strong"
        >
          Apply to sell
        </Link>
      </section>
    </div>
  );
}
