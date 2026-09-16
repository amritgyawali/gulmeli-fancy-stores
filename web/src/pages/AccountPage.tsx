import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { Icon } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { uploadAvatar } from "@/lib/media";
import { profileError } from "@/lib/commerce";
import { errorMessage, rs, shortDate } from "@/lib/format";

const NAV = [
  { key: "orders", label: "My orders", icon: "box" },
  { key: "wishlist", label: "Wishlist", icon: "heart" },
  { key: "profile", label: "Profile & settings", icon: "user" },
];

export function AccountPage() {
  const {
    session,
    commerce,
    updateCommerce,
    productById,
    syncStatus,
    cancelOrder,
    signOut,
    cart,
  } = useShop();
  const navigate = useNavigate();
  const [panel, setPanel] = useState("orders");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(commerce.profile);

  if (!session)
    return (
      <div className="mx-auto max-w-md rounded-2xl bg-[var(--store-surface)] p-12 text-center shadow-sm">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-orange-50 text-3xl">
          👤
        </span>
        <h1 className="mt-4 text-xl font-black">Sign in to your account</h1>
        <p className="mt-1 text-sm text-[var(--store-muted)]">
          Keep your cart, wishlist and orders in sync with the mobile app.
        </p>
        <Link
          to="/auth"
          className="mt-5 inline-block rounded-xl bg-[var(--store-primary)] px-8 py-3 text-sm font-bold text-white"
        >
          Sign in / Create account
        </Link>
      </div>
    );

  const wishlist = commerce.wishlist
    .map((id) => productById[id])
    .filter(Boolean);
  const checkInToday =
    commerce.lastCheckIn.slice(0, 10) === new Date().toISOString().slice(0, 10);

  const checkIn = () => {
    if (checkInToday) return;
    updateCommerce((current) => ({
      ...current,
      lastCheckIn: new Date().toISOString(),
      gems: current.gems + 5,
    }));
    setNotice("Checked in: +5 gems.");
  };

  const saveProfile = async (avatarData: string | null) => {
    setError("");
    const err = profileError(form);
    if (err) {
      setError(err);
      return;
    }
    try {
      setBusy(avatarData ? "Uploading photo to Cloudinary…" : "Saving…");
      let avatar = form.avatar;
      if (avatarData) avatar = await uploadAvatar(avatarData, session.user.id);
      updateCommerce((current) => ({
        ...current,
        profile: { ...form, avatar },
      }));
      setBusy("");
      setEditing(false);
      setNotice("Account saved — synced to the app.");
    } catch (e) {
      setBusy("");
      setError(errorMessage(e));
    }
  };

  const pickAvatar = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 1.5 * 1024 * 1024) {
        setError("Choose a profile photo under 1.5 MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => void saveProfile(String(reader.result));
      reader.onerror = () => setError("The photo could not be read.");
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* Account sidebar */}
      <aside className="h-fit space-y-4 lg:sticky lg:top-40">
        <section className="rounded-2xl bg-gradient-to-br from-[#161616] to-[#2b2b2b] p-5 text-center text-white shadow-sm">
          <span className="mx-auto grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-[var(--store-surface)]/10 text-3xl ring-2 ring-[#f85606]">
            {commerce.profile.avatar ? (
              <img src={commerce.profile.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              "🙂"
            )}
          </span>
          <h1 className="mt-3 truncate text-lg font-black">
            {commerce.profile.name || "Your account"}
          </h1>
          <p className="truncate text-xs text-white/60">{session.user.email}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Metric n={commerce.orders.length} label="Orders" onClick={() => setPanel("orders")} />
            <Metric n={wishlist.length} label="Wishes" onClick={() => setPanel("wishlist")} />
            <Metric n={commerce.gems} label="Gems" onClick={checkIn} />
          </div>
          <button
            onClick={checkIn}
            disabled={checkInToday}
            className="mt-4 w-full rounded-xl bg-amber-400 py-2 text-xs font-black text-amber-950 disabled:bg-[var(--store-surface)]/10 disabled:text-white/50"
          >
            {checkInToday ? "Checked in today" : "Daily check-in · +5 gems 💎"}
          </button>
          {notice && <p className="mt-2 text-xs font-bold text-emerald-300">{notice}</p>}
        </section>
        <nav className="rounded-2xl bg-[var(--store-surface)] p-2 shadow-sm">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => setPanel(item.key)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-bold transition ${
                panel === item.key
                  ? "bg-orange-50 text-[var(--store-primary-text)]"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
            </button>
          ))}
          <button
            onClick={() =>
              void signOut().then(() => navigate("/")).catch((e) => setError(errorMessage(e)))
            }
            className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[var(--store-muted)] hover:bg-rose-50 hover:text-rose-600"
          >
            <Icon name="logout" size={16} /> Sign out
          </button>
          <Link
            to="/admin"
            className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[var(--store-muted)] hover:bg-slate-50"
          >
            <Icon name="gauge" size={16} /> Admin dashboard
          </Link>
        </nav>
        {syncStatus && (
          <p className="px-2 text-center text-xs text-slate-400">{syncStatus}</p>
        )}
      </aside>

      {/* Panels */}
      <div className="min-w-0 space-y-6">
        {panel === "orders" && (
          <section className="rounded-2xl bg-[var(--store-surface)] p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black">
              <Icon name="box" size={18} className="text-[var(--store-primary-text)]" /> My orders
            </h2>
            {commerce.orders.length ? (
              <ul className="divide-y divide-slate-100">
                {commerce.orders.map((order) => (
                  <li key={order.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <p className="truncate font-bold">
                        {order.items.map((i) => i.name).join(", ") || "Order"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {shortDate(order.createdAt)} ·{" "}
                        <span className="font-mono">{order.id}</span> ·{" "}
                        {order.items.reduce((n, i) => n + i.quantity, 0)} items ·{" "}
                        {order.profile.name} · {order.profile.phone}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {order.items.map((i) => {
                          const p = productById[i.productId];
                          return (
                            <Link
                              key={i.productId}
                              to={`/product/${i.productId}`}
                              className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-orange-50 hover:text-[var(--store-primary-text)]"
                            >
                              {p ? p.name.slice(0, 30) : i.name.slice(0, 30)} ×{i.quantity}
                            </Link>
                          );
                        })}
                      </div>
                      {order.discount > 0 && (
                        <p className="mt-1 text-xs font-bold text-emerald-600">
                          Voucher saved Rs.{order.discount}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-row items-center gap-4 sm:flex-col sm:items-end">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-black ${
                          order.status === "Cancelled"
                            ? "bg-rose-50 text-rose-600"
                            : order.status === "Delivered"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {order.status}
                      </span>
                      <span className="text-lg font-black">{rs(order.total)}</span>
                      {order.status === "Placed" && (
                        <button
                          onClick={() =>
                            void cancelOrder(order.id).catch((e) => setError(errorMessage(e)))
                          }
                          className="text-xs font-bold text-slate-400 underline hover:text-rose-600"
                        >
                          Cancel order
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-16 text-center">
                <p className="text-4xl">🧾</p>
                <p className="mt-3 font-bold text-slate-600">No orders yet</p>
                <Link to="/" className="mt-3 inline-block rounded-xl bg-[var(--store-primary)] px-6 py-2.5 text-sm font-bold text-white">
                  Start shopping
                </Link>
              </div>
            )}
          </section>
        )}

        {panel === "wishlist" && (
          <section className="rounded-2xl bg-[var(--store-surface)] p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black">
              <Icon name="heart" size={18} className="text-rose-500" /> Wishlist ({wishlist.length})
            </h2>
            {wishlist.length ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {wishlist.map((p) => (
                  <div key={p.id} className="space-y-1">
                    <ProductCard product={p} />
                    <button
                      onClick={() =>
                        updateCommerce((current) => ({
                          ...current,
                          wishlist: current.wishlist.filter((x) => x !== p.id),
                        }))
                      }
                      className="text-xs font-bold text-slate-400 hover:text-rose-600"
                    >
                      Remove from wishlist
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-16 text-center text-sm text-slate-400">
                Tap the heart on any product to save it here and in the app.
              </p>
            )}
          </section>
        )}

        {panel === "profile" && (
          <section className="rounded-2xl bg-[var(--store-surface)] p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-black">
                <Icon name="settings" size={18} className="text-[var(--store-primary-text)]" /> Profile &amp; settings
              </h2>
              {!editing && (
                <button
                  onClick={() => {
                    setForm(commerce.profile);
                    setEditing(true);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Edit
                </button>
              )}
            </div>
            {editing ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["name", "Full name"],
                    ["phone", "Phone number"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="mb-1 block text-xs font-bold text-[var(--store-muted)]">{label}</span>
                    <input
                      value={form[key]}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, [key]: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[var(--store-primary)]"
                    />
                  </label>
                ))}
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs font-bold text-[var(--store-muted)]">
                    Delivery address
                  </span>
                  <textarea
                    value={form.address}
                    rows={2}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, address: event.target.value }))
                    }
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[var(--store-primary)]"
                  />
                </label>
                {error && (
                  <p className="text-sm font-bold text-rose-600 sm:col-span-2">{error}</p>
                )}
                <div className="flex gap-3 sm:col-span-2">
                  <button
                    disabled={Boolean(busy)}
                    onClick={() => void saveProfile(null)}
                    className="rounded-xl bg-[var(--store-primary)] px-6 py-3 text-sm font-black text-white disabled:opacity-60"
                  >
                    {busy || "Save profile"}
                  </button>
                  <button
                    disabled={Boolean(busy)}
                    onClick={pickAvatar}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-600 disabled:opacity-60"
                  >
                    <Icon name="camera" size={14} /> Photo → Cloudinary
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setError("");
                    }}
                    className="ml-auto text-sm font-bold text-[var(--store-muted)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
                <Row label="Name" value={commerce.profile.name || "—"} />
                <Row label="Email" value={session.user.email ?? ""} />
                <Row label="Phone" value={commerce.profile.phone || "—"} />
                <Row label="Address" value={commerce.profile.address || "—"} />
                <Row label="Cart items" value={String(cart.length)} />
                <Row label="Gems" value={String(commerce.gems)} />
              </dl>
            )}
            <label className="mt-6 flex w-fit cursor-pointer items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-600">
              <input
                type="checkbox"
                checked={commerce.notifications}
                onChange={(event) =>
                  updateCommerce((current) => ({
                    ...current,
                    notifications: event.target.checked,
                  }))
                }
                className="accent-[#f85606]"
              />
              Receive promo messages
            </label>
            {error && !editing && (
              <p className="mt-3 text-sm font-bold text-rose-600">{error}</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function Metric({ n, label, onClick }: { n: number; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="rounded-xl bg-[var(--store-surface)]/5 py-2 hover:bg-[var(--store-surface)]/10">
      <span className="block text-lg font-black">{n}</span>
      <span className="text-[9px] uppercase tracking-wide text-white/50">{label}</span>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-semibold text-slate-700">{value}</dd>
    </div>
  );
}
