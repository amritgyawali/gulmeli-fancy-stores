import { sendSupportMessage } from "@/lib/support";
import { useState } from "react";
import { Link } from "react-router-dom";
import { dexHubs } from "@/lib/demo-data";

/*
 * Help center rebuilt from
 * ../web ui ux design/daraz_nepal_contact_us_help_center/code.html: chat card,
 * FAQ accordion, contact form, DEX drop-off table, helpline tiles.
 */

const FAQS = [
  {
    q: "How long does delivery take inside Kathmandu Valley?",
    a: "Orders confirmed before 2 PM dispatch the same day from our Kathmandu hub; standard delivery lands in 1–2 days. Express next-day is available at checkout.",
  },
  {
    q: "Which payment methods are supported?",
    a: "Cash on delivery is the default across all 77 districts. eSewa, Khalti and Connect IPS are enabled in select zones, and card payments turn on once the store activates its gateway.",
  },
  {
    q: "Can I return a product?",
    a: "Yes — 7-day easy returns on unopened items through your Account → Orders panel. Refunds settle to the original payment method within 3 working days.",
  },
  {
    q: "How do vouchers and gems work?",
    a: "Collect vouchers from the home page or the offers rail; they stack at checkout up to the cap printed on each coupon. Check in daily to earn gems redeemable against future baskets.",
  },
  {
    q: "Are my orders shared with the mobile app?",
    a: "Every cart, order and profile change syncs live between this website and the Gulmeli app through the same account — no re-entry needed.",
  },
];

const CHANNELS = [
  {
    icon: "fa-comments",
    title: "Chat with Support",
    note: "Live, 8 AM – 8 PM (Mon–Sat)",
    cta: "Open chat",
    to: "/messages",
  },
  {
    icon: "fa-phone-volume",
    title: "Helpline",
    note: "+977 1-4XXXXXX · toll-free 1660-X",
    cta: "Call now",
    to: "/help",
  },
  {
    icon: "fa-envelope",
    title: "Email & Ticket Desk",
    note: "support@gulmelifancystore.np · replies < 24h",
    cta: "Send message",
    to: "/help",
  },
  {
    icon: "fa-store",
    title: "Experience Center",
    note: "Gulmeli bazaar counter, walk-ins welcome",
    cta: "Visit us",
    to: "/",
  },
];

export default function HelpPage() {
  const [open, setOpen] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: "Orders & delivery",
    message: "",
  });

  return (
    <div className="space-y-8 pb-10">
      <header className="rounded-[2px] bg-gradient-to-r from-[#d82a0b] via-[#f85606] to-[#fc8621] p-8 text-white shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-yellow-200">
          Help &amp; Support
        </p>
        <h1 className="mt-1 text-3xl font-black">How can we help you today?</h1>
        <p className="mt-2 max-w-xl text-sm text-white/85">
          Search the FAQs, chat with our team, or drop by the experience center.
          Merchant selling on {">"} the store?{" "}
          <Link to="/sell" className="font-bold text-yellow-300 underline">
            Become a seller
          </Link>
          .
        </p>
      </header>

      {/* Channel tiles */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CHANNELS.map((c) => (
          <div
            key={c.title}
            className="daraz-card flex flex-col justify-between rounded-[2px] border border-gray-200 bg-[var(--store-surface)] p-4 shadow-sm"
          >
            <div>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-orange-50 text-[var(--store-primary-text)]">
                <i className={`fa-solid ${c.icon}`} />
              </span>
              <h3 className="mt-3 text-sm font-black text-gray-800">
                {c.title}
              </h3>
              <p className="mt-1 text-[11px] leading-snug text-gray-500">
                {c.note}
              </p>
            </div>
            <Link
              to={c.to}
              className="mt-3 inline-block rounded-[2px] border border-[var(--store-primary)] px-3 py-1.5 text-center text-[11px] font-bold uppercase text-[var(--store-primary-text)] hover:bg-orange-50"
            >
              {c.cta}
            </Link>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* FAQ accordion */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold text-gray-800">
            Top FAQs &amp; Solutions
          </h2>
          <div className="divide-y divide-gray-100 rounded-[2px] border border-gray-200 bg-[var(--store-surface)] shadow-sm">
            {FAQS.map((f, i) => (
              <div key={f.q}>
                <button
                  type="button"
                  aria-expanded={open === i}
                  onClick={() => setOpen(open === i ? -1 : i)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                >
                  <span className="text-sm font-semibold text-gray-800">
                    {f.q}
                  </span>
                  <i
                    className={`fa-solid fa-chevron-down text-xs text-gray-400 transition-transform ${
                      open === i ? "rotate-180 text-[var(--store-primary-text)]" : ""
                    }`}
                  />
                </button>
                {open === i && (
                  <p className="px-4 pb-4 text-sm leading-relaxed text-gray-500">
                    {f.a}
                  </p>
                )}
              </div>
            ))}
          </div>

          <h2 className="mb-3 mt-8 text-lg font-bold text-gray-800">
            DEX Hubs &amp; Drop-off Points
          </h2>
          <div className="overflow-x-auto rounded-[2px] border border-gray-200 bg-[var(--store-surface)] shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-2.5 font-bold">Hub</th>
                  <th className="px-4 py-2.5 font-bold">Province</th>
                  <th className="px-4 py-2.5 font-bold">Code</th>
                  <th className="px-4 py-2.5 font-bold">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dexHubs.map((h) => (
                  <tr key={h.code} className="hover:bg-orange-50/40">
                    <td className="px-4 py-2.5 font-semibold text-gray-800">
                      {h.hub}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{h.province}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-500">
                      {h.code}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      8:00 – 18:00, Sun–Fri
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Contact form */}
        <section>
          <h2 className="mb-3 text-lg font-bold text-gray-800">
            Send Us a Direct Message
          </h2>
          <form
            className="space-y-3 rounded-[2px] border border-gray-200 bg-[var(--store-surface)] p-4 shadow-sm"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              setError("");
              try {
                await sendSupportMessage(form.message, form.topic);
                setSent(true);
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : "Message could not be sent.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {!!error && (
              <p role="alert" className="text-red-600">
                {error}
              </p>
            )}
            {sent ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <i className="fa-regular fa-circle-check text-4xl text-emerald-500" />
                <p className="text-sm font-black text-gray-800">
                  Message dispatched!
                </p>
                <p className="text-xs text-gray-500">
                  Our team replies within 24 working hours.
                </p>
              </div>
            ) : (
              <>
                <label className="block text-xs font-semibold text-gray-500">
                  Your name
                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm font-normal outline-none focus:border-[var(--store-primary)]"
                  />
                </label>
                <label className="block text-xs font-semibold text-gray-500">
                  Email
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm font-normal outline-none focus:border-[var(--store-primary)]"
                  />
                </label>
                <label className="block text-xs font-semibold text-gray-500">
                  Topic
                  <select
                    value={form.topic}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, topic: e.target.value }))
                    }
                    className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm font-normal outline-none focus:border-[var(--store-primary)]"
                  >
                    {[
                      "Orders & delivery",
                      "Returns & refunds",
                      "Payments",
                      "Selling on the store",
                      "Other",
                    ].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-gray-500">
                  Message
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, message: e.target.value }))
                    }
                    className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm font-normal outline-none focus:border-[var(--store-primary)]"
                  />
                </label>
                <button
                  type="submit"
                  className="w-full rounded-[2px] bg-[var(--store-primary)] py-2.5 text-sm font-black uppercase text-white hover:bg-[#d04402]"
                >
                  Send message
                </button>
              </>
            )}
          </form>

          <div className="mt-4 rounded-[2px] border border-gray-200 bg-[var(--store-surface)] p-4 text-xs text-gray-500 shadow-sm">
            <p className="mb-1 font-black text-gray-800">Join the team</p>
            Riders, warehouse staff and engineers build the store every day.
            Mail careers with “DEX” in the subject line.
          </div>
        </section>
      </div>
    </div>
  );
}
