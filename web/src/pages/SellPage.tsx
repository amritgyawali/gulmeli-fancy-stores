import { useState } from "react";
import { Link } from "react-router-dom";
import { rs } from "@/lib/format";

/*
 * Become-a-seller page rebuilt from
 * ../web ui ux design/daraz_nepal_become_a_seller/code.html: hero, 4 steps,
 * store types, live fee calculator, payout tiles, district coverage, FAQ.
 */

const STEPS = [
  { icon: "fa-file-lines", title: "Apply online", copy: "Submit your citizenship, PAN/ward registration and a bank account in 15 minutes." },
  { icon: "fa-id-card", title: "Get verified", copy: "Our KYC maker-checker queue approves sellers within 2 working days." },
  { icon: "fa-boxes-stacked", title: "List products", copy: "Upload photos and stock from the seller console or the mobile app." },
  { icon: "fa-sack-dollar", title: "Get paid", copy: "Weekly NCHL-IPS payouts, straight to your Nepali bank account." },
];

const STORE_TYPES = [
  { name: "Individual Seller", fee: "2–8% commission", copy: "Citizenship + PAN. Best for handmade, reselling and side income.", tone: "border-emerald-200 bg-emerald-50" },
  { name: "Registered Business", fee: "1.5–6% commission", copy: "Company registration + VAT. Branded storefront, campaign priority.", tone: "border-orange-200 bg-orange-50" },
  { name: "Flagship (Mall)", fee: "3–10% commission", copy: "Brand owner or authorised distributor. Verified badge + mall placement.", tone: "border-indigo-200 bg-indigo-50" },
];

const FAQS = [
  { q: "What does it cost to start?", a: "Zero upfront. There is no listing fee, no monthly rent and no deposit — we earn commission only when you sell." },
  { q: "Which documents do I need?", a: "Citizenship certificate (individuals) or company registration + PAN/VAT certificate, plus a bank passbook page in the same name." },
  { q: "How do customers get my products?", a: "Our DEX hub network covers all 77 districts; overflow rides on partner couriers like Pathao and DHL with COD collection returned weekly." },
  { q: "When do I get paid?", a: "Every Wednesday batch: delivered-order revenue minus commission, net of COD handling, wired through NCHL-IPS within 24 hours." },
];

export default function SellPage() {
  const [price, setPrice] = useState(1500);
  const [commission, setCommission] = useState(5);
  const [shipping, setShipping] = useState(90);
  const fee = Math.round((price * commission) / 100);
  const payout = Math.max(0, price - fee - shipping);

  return (
    <div className="space-y-10 pb-12">
      <header className="overflow-hidden rounded-[2px] bg-[#161616] text-white shadow">
        <div className="bg-gradient-to-r from-[#d82a0b] via-[#f85606] to-[#fc8621] px-8 py-12">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-200">
            Grow your business
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Sell on Gulmeli — nationwide, zero upfront cost
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/90">
            Reach shoppers in all 77 districts with cash on delivery, weekly
            bank payouts and a seller console that syncs with the mobile app.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="rounded-full bg-[var(--store-surface)] px-6 py-2.5 text-sm font-black text-[var(--store-primary-text)] shadow-lg hover:bg-yellow-50"
            >
              Start Selling
            </Link>
            <a
              href="#calculator"
              className="rounded-full border border-white/50 px-6 py-2.5 text-sm font-bold text-white hover:bg-[var(--store-surface)]/10"
            >
              Try the fee calculator
            </a>
          </div>
        </div>
      </header>

      {/* Steps */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-gray-800">Start Selling in 4 Easy Steps</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="daraz-card relative rounded-[2px] border border-gray-200 bg-[var(--store-surface)] p-4 shadow-sm">
              <span className="absolute -top-3 left-4 grid h-6 w-6 place-items-center rounded-full bg-[var(--store-primary)] text-xs font-black text-white">
                {i + 1}
              </span>
              <i className={`fa-solid ${s.icon} mt-2 text-xl text-[var(--store-primary-text)]`} />
              <h3 className="mt-2 text-sm font-black text-gray-800">{s.title}</h3>
              <p className="mt-1 text-[11px] leading-snug text-gray-500">{s.copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Store types */}
      <section>
        <h2 className="mb-1 text-lg font-bold text-gray-800">Choose the Right Store Type</h2>
        <p className="mb-4 text-xs text-gray-500">Switch or upgrade any time from the seller console.</p>
        <div className="grid gap-3 md:grid-cols-3">
          {STORE_TYPES.map((t) => (
            <div key={t.name} className={`rounded-[2px] border-2 p-5 ${t.tone}`}>
              <h3 className="text-sm font-black text-gray-800">{t.name}</h3>
              <p className="mt-1 text-xl font-black text-[#d04402]">{t.fee}</p>
              <p className="mt-2 text-xs leading-relaxed text-gray-600">{t.copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fee calculator */}
      <section id="calculator" className="grid gap-4 rounded-[2px] border border-gray-200 bg-[var(--store-surface)] p-6 shadow-sm lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Seller Fee Calculator</h2>
          <p className="mb-4 text-xs text-gray-500">
            Estimate what lands in your bank account for a typical delivered order.
          </p>
          <label className="block text-xs font-semibold text-gray-500">
            Product selling price (NPR)
            <input
              type="range"
              min={200}
              max={50000}
              step={50}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="mt-2 w-full accent-[#f85606]"
            />
            <span className="mt-1 block text-sm font-black text-gray-800">{rs(price)}</span>
          </label>
          <label className="mt-4 block text-xs font-semibold text-gray-500">
            Commission rate (%)
            <input
              type="range"
              min={1}
              max={12}
              step={0.5}
              value={commission}
              onChange={(e) => setCommission(Number(e.target.value))}
              className="mt-2 w-full accent-[#f85606]"
            />
            <span className="mt-1 block text-sm font-black text-gray-800">{commission}%</span>
          </label>
          <label className="mt-4 block text-xs font-semibold text-gray-500">
            Courier / COD cost you cover (NPR)
            <input
              type="number"
              min={0}
              value={shipping}
              onChange={(e) => setShipping(Math.max(0, Number(e.target.value) || 0))}
              className="mt-1 w-40 rounded border border-gray-200 px-3 py-1.5 text-sm font-normal outline-none focus:border-[var(--store-primary)]"
            />
          </label>
        </div>
        <div className="flex flex-col justify-center gap-2 rounded-[2px] bg-gray-50 p-5 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Gross sale</span>
            <span>{rs(price)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Marketplace commission</span>
            <span>− {rs(fee)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Delivery &amp; COD handling</span>
            <span>− {rs(shipping)}</span>
          </div>
          <hr className="border-gray-200" />
          <div className="flex items-baseline justify-between">
            <span className="font-black text-gray-800">You keep per order</span>
            <span className="text-2xl font-black text-[var(--store-primary-text)]">{rs(payout)}</span>
          </div>
          <p className="text-[10px] text-gray-400">
            Weekly disbursal via NCHL-IPS. VAT/IRD withholding applies to
            commissions above registration thresholds.
          </p>
        </div>
      </section>

      {/* Why sell tiles */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: "fa-wallet", title: "Weekly Bank Payouts", copy: "NCHL-IPS every Wednesday, auto-reconciled with COD." },
          { icon: "fa-map-location-dot", title: "Nationwide 77 Districts", copy: "DEX hubs plus 3PL overflow reach every province." },
          { icon: "fa-graduation-cap", title: "Seller University", copy: "Free courses on listings, photography and growth." },
          { icon: "fa-hand-holding-dollar", title: "Zero Upfront Cost", copy: "No rent, no listing fee — pay only when you sell." },
        ].map((w) => (
          <div key={w.title} className="rounded-[2px] border border-gray-200 bg-[var(--store-surface)] p-4 shadow-sm">
            <i className={`fa-solid ${w.icon} text-lg text-[var(--store-primary-text)]`} />
            <h3 className="mt-2 text-sm font-black text-gray-800">{w.title}</h3>
            <p className="mt-1 text-[11px] leading-snug text-gray-500">{w.copy}</p>
          </div>
        ))}
      </section>

      {/* FAQ */}
      <section className="max-w-3xl">
        <h2 className="mb-3 text-lg font-bold text-gray-800">Frequently Asked Questions</h2>
        <div className="divide-y divide-gray-100 rounded-[2px] border border-gray-200 bg-[var(--store-surface)] shadow-sm">
          {FAQS.map((f) => (
            <details key={f.q} className="group px-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-sm font-semibold text-gray-800">
                {f.q}
                <i className="fa-solid fa-chevron-down text-xs text-gray-400 transition-transform group-open:rotate-180" />
              </summary>
              <p className="pb-4 text-sm leading-relaxed text-gray-500">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-[2px] bg-[#161616] px-8 py-10 text-center text-white">
        <h2 className="text-xl font-black">Ready to Expand Your Business Across Nepal?</h2>
        <p className="mx-auto mt-2 max-w-md text-xs text-white/70">
          Join the merchants growing with Gulmeli Fancy Stores today.
        </p>
        <Link
          to="/auth"
          className="mt-5 inline-block rounded-full bg-[var(--store-primary)] px-8 py-3 text-sm font-black uppercase tracking-wide hover:bg-[#d04402]"
        >
          Open your store
        </Link>
      </section>
    </div>
  );
}
