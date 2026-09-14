import { useState } from "react";
import { Link } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { Icon } from "@/components/Icon";

const MESSAGES = [
  {
    id: "early",
    emoji: "🛒🏃",
    title: "छिट्टो गर्नुहोस् — Hurry!",
    time: "43 minutes ago",
    footer: "Be the first to save up to 35% OFF on best deals 🤩",
    type: "Promos",
  },
  {
    id: "hot",
    emoji: "🔥",
    title: "ALERT: HIGH TEMPERATURE",
    time: "13:30 PM",
    footer: "Enjoy up to 55% OFF on deals 🛒 Shop your favorites now ✅",
    type: "Promos",
  },
  {
    id: "gems",
    emoji: "💎🛍️",
    title: "40% OFF — shopping?",
    time: "09:10 AM",
    footer: "Free gifts & 40% OFF coupons waiting in Gems!",
    type: "Alerts",
  },
];

export function MessagesPage() {
  const { commerce, updateCommerce, ui, markMessagesRead, session } = useShop();
  const [category, setCategory] = useState("All");
  const [text, setText] = useState("");
  const drafts = [...commerce.drafts].reverse();

  const visible = (
    category === "All" ? MESSAGES : MESSAGES.filter((m) => m.type === category)
  ).filter((m) => commerce.notifications || m.type !== "Promos");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* Inbox */}
      <div className="space-y-5">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Messages</h1>
            <p className="text-sm text-slate-400">
              Store announcements, delivered to web and app together.
            </p>
          </div>
          <button
            onClick={markMessagesRead}
            className={`text-xs font-bold ${ui.messagesRead ? "text-slate-400" : "text-[#f85606]"}`}
          >
            {ui.messagesRead ? "All read ✓" : "Mark all as read"}
          </button>
        </header>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {["All", "Promos", "Alerts"].map((tab) => (
            <button
              key={tab}
              onClick={() => setCategory(tab)}
              className={`rounded-lg px-4 py-1.5 text-sm font-bold ${
                category === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {visible.map((message) => (
            <article
              key={message.id}
              className="flex gap-4 rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 text-2xl">
                {message.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="truncate font-bold">{message.title}</h2>
                  <span className="shrink-0 text-[11px] text-slate-400">{message.time}</span>
                </div>
                <p className="mt-0.5 text-sm text-slate-500">{message.footer}</p>
                <span className="mt-2 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                  {message.type}
                </span>
              </div>
            </article>
          ))}
          {!visible.length && (
            <p className="rounded-2xl bg-white p-16 text-center text-sm text-slate-400 shadow-sm">
              Turn notifications on to see promos.
            </p>
          )}
        </div>
      </div>

      {/* Compose */}
      <aside className="h-fit space-y-4 lg:sticky lg:top-40">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-black">
            <Icon name="message" size={16} className="text-[#f85606]" /> Write to the store
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Saved as a draft on your account and synced to the mobile app.
            Support chats are not sent automatically.
          </p>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
            placeholder="Ask about an order, product or delivery…"
            className="mt-3 w-full resize-none rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-[#f85606]"
          />
          <button
            disabled={!session || !text.trim()}
            onClick={() => {
              updateCommerce((current) => ({
                ...current,
                drafts: [
                  ...current.drafts,
                  {
                    id: `draft-${Date.now()}`,
                    text: text.trim(),
                    createdAt: new Date().toISOString(),
                  },
                ].slice(-20),
              }));
              setText("");
            }}
            className="mt-2 w-full rounded-lg bg-slate-800 py-2.5 text-sm font-bold text-white disabled:bg-slate-300"
          >
            {session ? "Save draft" : "Sign in to save drafts"}
          </button>
          {!session && (
            <Link to="/auth" className="mt-1 block text-center text-xs font-bold text-[#f85606]">
              Sign in →
            </Link>
          )}
        </section>
        {drafts.length > 0 && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-black">Your drafts</h3>
            <ul className="space-y-3">
              {drafts.map((draft) => (
                <li key={draft.id} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                    DRAFT
                  </span>
                  <span className="flex-1 text-slate-600">{draft.text}</span>
                  <button
                    onClick={() =>
                      updateCommerce((current) => ({
                        ...current,
                        drafts: current.drafts.filter((d) => d.id !== draft.id),
                      }))
                    }
                    className="text-slate-300 hover:text-rose-500"
                    aria-label="Delete draft"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
