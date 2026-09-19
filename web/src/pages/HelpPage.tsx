import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { usePublishedConfig } from "@/lib/config-api";
import { useShop } from "@/store/ShopContext";
import { sendSupportMessage } from "@/lib/support";
import { Icon } from "@/components/Icon";
import { voucherTerms } from "@/lib/commerce";
import { freeDeliveryCopy, useDeliveryTerms } from "@/lib/shipping";

/*
 * Help & support.
 *
 * What this page used to tell customers, none of which was true:
 *
 * - A helpline of "+977 1-4XXXXXX · toll-free 1660-X" — a placeholder, shown
 *   as a number to call, next to a "Call now" button.
 * - "support@gulmelifancystore.np · replies < 24h" and an "Experience Center"
 *   with "walk-ins welcome", neither of which exists in the store config.
 * - "Chat with Support — Live, 8 AM – 8 PM (Mon–Sat)": there is no live chat,
 *   only the support thread on /messages.
 * - A "DEX Hubs & Drop-off Points" table of eight branches with opening
 *   hours, rendered from `lib/demo-data`, whose own header says the rows are
 *   seeded sample data for the internal ops consoles.
 * - FAQ answers promising "Express next-day at checkout" and "eSewa, Khalti
 *   and Connect IPS enabled in select zones" — checkout offers neither.
 *
 * Contact details now come from the published config and each channel is
 * shown only when it is configured. The FAQ answers are generated from the
 * same delivery and voucher modules the cart and checkout use, so they cannot
 * promise something the store does not do.
 */

export default function HelpPage() {
  const config = usePublishedConfig();
  const { session } = useShop();
  const terms = useDeliveryTerms();
  const [open, setOpen] = useState<number>(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ topic: "Orders & delivery", message: "" });
  const formId = useId();

  const brand = config.branding.companyName;

  const faqs = [
    {
      q: "How long does delivery take?",
      a: `Orders are delivered in ${terms.estimate} once dispatched. ${freeDeliveryCopy(terms)}.`,
    },
    {
      q: "Which payment methods can I use?",
      a: "Cash on delivery. You pay the courier when the order arrives. Card and wallet payments are not available yet.",
    },
    {
      q: "Can I return something?",
      a: `Yes — within ${terms.returnDays} days of delivery, for unused items in their original packaging. Start a return from Account → Orders.`,
    },
    {
      q: "How do vouchers work?",
      a: `${voucherTerms()} Enter the code in your cart or at checkout; the discount shows in the order summary before you confirm.`,
    },
    {
      q: "Do my orders appear in the app?",
      a: `Your cart, wishlist, profile and orders are tied to your account, so they are the same on this site and in the ${brand} app.`,
    },
  ];

  /* A channel appears only when the store has actually configured it. */
  const channels = [
    {
      icon: "message",
      title: "Message the store",
      note: "Replies appear in your inbox and in the app.",
      to: "/messages",
      cta: "Open messages",
    },
    config.contact.phone && {
      icon: "phone",
      title: "Call us",
      note: config.contact.phone,
      href: `tel:${config.contact.phone}`,
      cta: "Call",
    },
    config.contact.email && {
      icon: "mail",
      title: "Email",
      note: config.contact.email,
      href: `mailto:${config.contact.email}`,
      cta: "Send email",
    },
    config.contact.address && {
      icon: "pin",
      title: "Visit us",
      note: config.contact.address,
      cta: "",
    },
  ].filter(Boolean) as {
    icon: string;
    title: string;
    note: string;
    to?: string;
    href?: string;
    cta: string;
  }[];

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Help &amp; support</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Answers to common questions, and how to reach {brand}.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="sr-only">Contact channels</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {channels.map((c) => (
            <li
              key={c.title}
              className="flex flex-col rounded-md border border-line bg-raised p-4"
            >
              <Icon name={c.icon} size={20} className="text-brand" />
              <h3 className="mt-2.5 text-sm font-semibold text-ink">{c.title}</h3>
              <p className="mt-1 flex-1 text-sm text-ink-muted">{c.note}</p>
              {c.cta &&
                (c.to ? (
                  <Link
                    to={c.to}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-strong"
                  >
                    {c.cta}
                    <Icon name="chevronRight" size={14} />
                  </Link>
                ) : (
                  <a
                    href={c.href}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-strong"
                  >
                    {c.cta}
                    <Icon name="chevronRight" size={14} />
                  </a>
                ))}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          <h2 className="mb-3 text-xl font-semibold text-ink">Common questions</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-raised">
            {faqs.map((f, i) => (
              <li key={f.q}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={open === i}
                    aria-controls={`${formId}-faq-${i}`}
                    onClick={() => setOpen(open === i ? -1 : i)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-medium text-ink hover:bg-sunken"
                  >
                    {f.q}
                    <Icon
                      name="chevronDown"
                      size={16}
                      className={`shrink-0 text-ink-muted transition-transform ${
                        open === i ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </h3>
                <div id={`${formId}-faq-${i}`} hidden={open !== i}>
                  <p className="px-4 pb-4 text-sm leading-relaxed text-ink-muted">{f.a}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="lg:sticky lg:top-24">
          <h2 className="mb-3 text-xl font-semibold text-ink">Send a message</h2>
          <div className="rounded-md border border-line bg-raised p-4">
            {sent ? (
              <div className="py-6 text-center">
                <Icon name="checkCircle" size={30} className="mx-auto text-positive" />
                <p className="mt-3 text-sm font-medium text-ink">Message sent</p>
                <p className="mt-1 text-sm text-ink-muted">
                  The reply arrives in your inbox.
                </p>
                <Link
                  to="/messages"
                  className="mt-4 inline-block rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-brand hover:text-brand"
                >
                  Go to messages
                </Link>
              </div>
            ) : !session ? (
              <div className="py-6 text-center">
                <Icon name="message" size={28} strokeWidth={1.4} className="mx-auto text-ink-faint" />
                <p className="mt-3 text-sm text-ink-muted">
                  Sign in so the store can reply to you.
                </p>
                <Link
                  to="/auth"
                  className="mt-4 inline-block rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
                >
                  Sign in
                </Link>
              </div>
            ) : (
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (busy) return;
                  setBusy(true);
                  setError("");
                  try {
                    await sendSupportMessage(form.message.trim(), form.topic);
                    setSent(true);
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "Message could not be sent.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <div>
                  <label
                    htmlFor={`${formId}-topic`}
                    className="mb-1 block text-sm font-medium text-ink"
                  >
                    Topic
                  </label>
                  <select
                    id={`${formId}-topic`}
                    value={form.topic}
                    onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                    className="w-full rounded-md border border-line bg-raised px-3 py-2.5 text-base text-ink outline-none focus:border-brand"
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
                </div>

                <div>
                  <label
                    htmlFor={`${formId}-message`}
                    className="mb-1 block text-sm font-medium text-ink"
                  >
                    Message
                  </label>
                  <textarea
                    id={`${formId}-message`}
                    required
                    rows={6}
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    className="w-full resize-y rounded-md border border-line bg-raised px-3 py-2.5 text-base text-ink outline-none placeholder:text-ink-faint focus:border-brand"
                    placeholder="Tell us what happened, and include the order number if there is one."
                  />
                </div>

                <div aria-live="assertive">
                  {error && (
                    <p
                      role="alert"
                      className="flex items-start gap-2 rounded-md border border-critical/30 bg-critical-soft px-3 py-2.5 text-sm text-critical"
                    >
                      <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
                      {error}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={busy || !form.message.trim()}
                  className="w-full rounded-md bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-strong disabled:bg-line-strong disabled:text-ink-faint"
                >
                  {busy ? "Sending…" : "Send message"}
                </button>
              </form>
            )}
          </div>

          <p className="mt-4 rounded-md border border-line bg-raised p-4 text-sm text-ink-muted">
            Want to sell here?{" "}
            <Link to="/sell" className="font-medium text-brand hover:text-brand-strong">
              Apply to become a seller
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
