import { useState } from "react";
import { Link } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { Icon } from "@/components/Icon";
import { sendSupportMessage, useSupportTickets } from "@/lib/support";

/*
 * Messages.
 *
 * This page led with three hardcoded promotional notifications — "ALERT: HIGH
 * TEMPERATURE", "40% OFF — shopping?", each with an emoji tile and a made-up
 * timestamp ("43 minutes ago", "13:30 PM") that never changed. They were not
 * messages; nobody sent them and no discount stood behind them. They are
 * gone.
 *
 * What the store actually has is a support thread per customer, already
 * wired through `send_support_message` and `my_support_tickets`, which was
 * buried in a sidebar under a textarea. That is the page now.
 */
export function MessagesPage() {
  const { commerce, updateCommerce, session } = useShop();
  const { tickets, error: ticketError } = useSupportTickets(session?.user.id);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [text, setText] = useState("");

  const drafts = [...commerce.drafts].reverse();

  const send = async () => {
    if (busy || !text.trim()) return;
    setBusy(true);
    setNotice("");
    try {
      await sendSupportMessage(text.trim());
      setText("");
      setNotice("Message sent. The store usually replies within a working day.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Message could not be sent.");
    } finally {
      setBusy(false);
    }
  };

  const when = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? ""
      : d.toLocaleString("en-GB", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
  };

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-ink">Messages</h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          Your conversations with the store, shared with the mobile app.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-4">
          {!session ? (
            <div className="rounded-md border border-line bg-raised px-6 py-12 text-center">
              <Icon name="message" size={32} strokeWidth={1.4} className="mx-auto text-ink-faint" />
              <h2 className="mt-3 text-base font-semibold text-ink">Sign in to see your messages</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Your conversations are tied to your account.
              </p>
              <Link
                to="/auth"
                className="mt-4 inline-block rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
              >
                Sign in
              </Link>
            </div>
          ) : ticketError ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md border border-critical/30 bg-critical-soft px-3 py-2.5 text-sm text-critical"
            >
              <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
              {ticketError}
            </p>
          ) : tickets.length === 0 ? (
            <div className="rounded-md border border-line bg-raised px-6 py-12 text-center">
              <Icon name="messages" size={32} strokeWidth={1.4} className="mx-auto text-ink-faint" />
              <h2 className="mt-3 text-base font-semibold text-ink">No messages yet</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Ask about an order, a product or a delivery and the reply appears here.
              </p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <article key={ticket.id} className="rounded-md border border-line bg-raised">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                  <h2 className="text-base font-semibold text-ink">{ticket.subject}</h2>
                  <span
                    className={`rounded-sm px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide ${
                      /open|pending/i.test(ticket.status)
                        ? "bg-caution-soft text-caution"
                        : "bg-positive-soft text-positive"
                    }`}
                  >
                    {ticket.status}
                  </span>
                </header>
                <ul className="space-y-3 p-4">
                  {ticket.messages.map((message, i) => {
                    const fromStore = message.author === "agent";
                    return (
                      <li
                        key={i}
                        className={`flex ${fromStore ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                            fromStore
                              ? "bg-sunken text-ink"
                              : "bg-brand-soft text-brand-strong"
                          }`}
                        >
                          <p className="mb-0.5 text-2xs font-semibold uppercase tracking-wide opacity-70">
                            {fromStore ? "Store" : "You"}
                            {message.at && <span className="ml-1.5 font-normal">{when(message.at)}</span>}
                          </p>
                          <p className="whitespace-pre-line">{message.body}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="rounded-md border border-line bg-raised p-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
              <Icon name="message" size={17} className="text-ink-muted" />
              Write to the store
            </h2>
            <label htmlFor="support-message" className="sr-only">
              Your message
            </label>
            <textarea
              id="support-message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              disabled={!session}
              placeholder="Ask about an order, product or delivery…"
              className="mt-3 w-full resize-y rounded-md border border-line bg-raised p-3 text-base text-ink outline-none placeholder:text-ink-faint focus:border-brand disabled:bg-sunken"
            />
            <button
              type="button"
              disabled={busy || !session || !text.trim()}
              onClick={() => void send()}
              className="mt-2 w-full rounded-md bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-strong disabled:bg-line-strong disabled:text-ink-faint"
            >
              {busy ? "Sending…" : session ? "Send message" : "Sign in to send"}
            </button>
            <div aria-live="polite">
              {notice && <p className="mt-2 text-sm text-ink-muted">{notice}</p>}
            </div>
          </section>

          {drafts.length > 0 && (
            <section className="rounded-md border border-line bg-raised p-4">
              <h2 className="mb-3 text-base font-semibold text-ink">Drafts</h2>
              <ul className="space-y-2.5">
                {drafts.map((draft) => (
                  <li key={draft.id} className="flex items-start gap-2 text-sm">
                    <span className="flex-1 text-ink-soft">{draft.text}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateCommerce((current) => ({
                          ...current,
                          drafts: current.drafts.filter((d) => d.id !== draft.id),
                        }))
                      }
                      aria-label="Delete draft"
                      className="shrink-0 rounded-sm p-1 text-ink-faint hover:text-critical"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
