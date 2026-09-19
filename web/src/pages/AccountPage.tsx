import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { Icon } from "@/components/Icon";
import { ProductCard } from "@/components/ProductCard";
import { uploadAvatar } from "@/lib/media";
import { profileError } from "@/lib/commerce";
import { errorMessage, rs, shortDate } from "@/lib/format";

/*
 * Account.
 *
 * Changes worth naming:
 *
 * - The profile card was a dark gradient panel with a 🙂 emoji standing in
 *   for a missing avatar and a "Daily check-in · +5 gems 💎" button. The
 *   fallback is now the customer's initials, and the check-in button says
 *   what it gives without the emoji.
 * - "Photo → Cloudinary" was the label on the avatar button. Customers do not
 *   have a Cloudinary account; the button says "Change photo".
 * - Order status was three hardcoded colour cases with everything else
 *   falling into amber, so "Refunded" and "Processing" looked identical. The
 *   status map now covers every status in the `LocalOrder` union.
 * - The sidebar linked every signed-in customer to /admin. That link is gone
 *   from the customer surface; staff reach the dashboard from the staff
 *   sign-in.
 */

const NAV = [
  { key: "orders", label: "Orders", icon: "box" },
  { key: "wishlist", label: "Wishlist", icon: "heart" },
  { key: "profile", label: "Profile", icon: "user" },
] as const;

/* Every status the order union can hold, grouped by what it means. */
const STATUS_TONE: Record<string, string> = {
  Delivered: "bg-positive-soft text-positive",
  Confirmed: "bg-positive-soft text-positive",
  Cancelled: "bg-critical-soft text-critical",
  Failed: "bg-critical-soft text-critical",
  Returned: "bg-critical-soft text-critical",
  Refunded: "bg-info-soft text-info",
  Shipped: "bg-info-soft text-info",
  Out_for_delivery: "bg-info-soft text-info",
};
const statusTone = (s: string) => STATUS_TONE[s] ?? "bg-caution-soft text-caution";
const statusLabel = (s: string) => s.replace(/_/g, " ");

const initials = (name: string, email: string) =>
  (name.trim() || email.split("@")[0] || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

export function AccountPage() {
  const {
    session,
    commerce,
    updateCommerce,
    productById,
    syncStatus,
    cancelOrder,
    signOut,
  } = useShop();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<(typeof NAV)[number]["key"]>("orders");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(commerce.profile);

  if (!session)
    return (
      <div className="mx-auto max-w-md rounded-md border border-line bg-raised px-6 py-12 text-center">
        <Icon name="userCircle" size={38} strokeWidth={1.4} className="mx-auto text-ink-faint" />
        <h1 className="mt-3 text-xl font-semibold text-ink">Sign in to your account</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Your orders, wishlist and cart stay in sync with the app.
        </p>
        <Link
          to="/auth"
          className="mt-5 inline-block rounded-md bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
        >
          Sign in
        </Link>
      </div>
    );

  const email = session.user.email ?? "";
  const wishlist = commerce.wishlist.map((id) => productById[id]).filter(Boolean);
  const checkInToday =
    commerce.lastCheckIn.slice(0, 10) === new Date().toISOString().slice(0, 10);

  const checkIn = () => {
    if (checkInToday) return;
    updateCommerce((current) => ({
      ...current,
      lastCheckIn: new Date().toISOString(),
      gems: current.gems + 5,
    }));
    setNotice("Checked in. 5 gems added.");
  };

  const saveProfile = async (avatarData: string | null) => {
    setError("");
    const err = profileError(form);
    if (err) {
      setError(err);
      return;
    }
    try {
      setBusy(avatarData ? "Uploading photo…" : "Saving…");
      let avatar = form.avatar;
      if (avatarData) avatar = await uploadAvatar(avatarData, session.user.id);
      updateCommerce((current) => ({ ...current, profile: { ...form, avatar } }));
      setBusy("");
      setEditing(false);
      setNotice("Profile saved.");
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
        setError("Choose a photo under 1.5 MB.");
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
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <section className="rounded-md border border-line bg-raised p-4 text-center">
          <span className="media mx-auto grid h-16 w-16 place-items-center rounded-full border border-line bg-sunken text-lg font-semibold text-ink-muted">
            {commerce.profile.avatar ? (
              <img src={commerce.profile.avatar} alt="" className="rounded-full object-cover" />
            ) : (
              initials(commerce.profile.name, email)
            )}
          </span>
          <h1 className="clamp-1 mt-2.5 text-base font-semibold text-ink">
            {commerce.profile.name || "Your account"}
          </h1>
          <p className="clamp-1 text-xs text-ink-muted">{email}</p>

          <dl className="mt-4 grid grid-cols-3 divide-x divide-line border-y border-line py-2.5 text-center">
            {[
              ["Orders", commerce.orders.length],
              ["Saved", wishlist.length],
              ["Gems", commerce.gems],
            ].map(([label, n]) => (
              <div key={String(label)}>
                <dd className="tnum text-base font-semibold text-ink">{n}</dd>
                <dt className="text-2xs uppercase tracking-wide text-ink-faint">{label}</dt>
              </div>
            ))}
          </dl>

          <button
            type="button"
            onClick={checkIn}
            disabled={checkInToday}
            className="mt-3 w-full rounded-md border border-line py-2 text-sm font-medium text-ink hover:border-brand hover:text-brand disabled:border-line disabled:text-ink-faint disabled:hover:text-ink-faint"
          >
            {checkInToday ? "Checked in today" : "Daily check-in (+5 gems)"}
          </button>
          <div aria-live="polite">
            {notice && <p className="mt-2 text-xs text-positive">{notice}</p>}
          </div>
        </section>

        <nav aria-label="Account sections" className="rounded-md border border-line bg-raised p-1.5">
          <ul>
            {NAV.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => setPanel(item.key)}
                  aria-current={panel === item.key}
                  className={`flex w-full items-center gap-2.5 rounded-sm px-3 py-2.5 text-sm font-medium ${
                    panel === item.key
                      ? "bg-brand-soft text-brand-strong"
                      : "text-ink-soft hover:bg-sunken"
                  }`}
                >
                  <Icon name={item.icon} size={17} />
                  {item.label}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() =>
                  void signOut()
                    .then(() => navigate("/"))
                    .catch((e) => setError(errorMessage(e)))
                }
                className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-sunken hover:text-critical"
              >
                <Icon name="logout" size={17} />
                Sign out
              </button>
            </li>
          </ul>
        </nav>

        {syncStatus && <p className="px-2 text-center text-xs text-ink-faint">{syncStatus}</p>}
      </aside>

      <div className="min-w-0">
        {panel === "orders" && (
          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">Orders</h2>
            {commerce.orders.length ? (
              <ul className="space-y-3">
                {commerce.orders.map((order) => (
                  <li key={order.id} className="rounded-md border border-line bg-raised p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="tnum text-xs text-ink-muted">
                          {shortDate(order.createdAt)} · {order.id}
                        </p>
                        <p className="tnum mt-1 text-sm text-ink">
                          {order.items.reduce((n, i) => n + i.quantity, 0)} items ·{" "}
                          <span className="font-semibold">{rs(order.total)}</span>
                        </p>
                        {order.discount > 0 && (
                          <p className="tnum mt-0.5 text-xs text-positive">
                            Voucher saved {rs(order.discount)}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span
                          className={`rounded-sm px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide ${statusTone(order.status)}`}
                        >
                          {statusLabel(order.status)}
                        </span>
                        {order.status === "Placed" && (
                          <button
                            type="button"
                            onClick={() =>
                              void cancelOrder(order.id).catch((e) => setError(errorMessage(e)))
                            }
                            className="text-xs text-ink-muted underline hover:text-critical"
                          >
                            Cancel order
                          </button>
                        )}
                      </div>
                    </div>
                    <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
                      {order.items.map((i) => (
                        <li key={i.productId}>
                          <Link
                            to={`/product/${i.productId}`}
                            className="tnum block rounded-sm bg-sunken px-2.5 py-1 text-xs text-ink-soft hover:bg-brand-soft hover:text-brand-strong"
                          >
                            {(productById[i.productId]?.name ?? i.name).slice(0, 40)} ×{i.quantity}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-md border border-line bg-raised px-6 py-14 text-center">
                <Icon name="box" size={32} strokeWidth={1.4} className="mx-auto text-ink-faint" />
                <p className="mt-3 text-base font-medium text-ink">No orders yet</p>
                <Link
                  to="/search"
                  className="mt-4 inline-block rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
                >
                  Start shopping
                </Link>
              </div>
            )}
          </section>
        )}

        {panel === "wishlist" && (
          <section>
            <h2 className="mb-3 text-xl font-semibold text-ink">
              Wishlist
              <span className="tnum ml-2 text-base font-normal text-ink-muted">
                {wishlist.length}
              </span>
            </h2>
            {wishlist.length ? (
              <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                {wishlist.map((p) => (
                  <li key={p.id}>
                    <ProductCard product={p} />
                    <button
                      type="button"
                      onClick={() =>
                        updateCommerce((current) => ({
                          ...current,
                          wishlist: current.wishlist.filter((x) => x !== p.id),
                        }))
                      }
                      className="mt-1.5 w-full text-xs text-ink-muted hover:text-critical"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-md border border-line bg-raised px-6 py-14 text-center">
                <Icon name="heart" size={32} strokeWidth={1.4} className="mx-auto text-ink-faint" />
                <p className="mt-3 text-sm text-ink-muted">
                  Save a product and it appears here and in the app.
                </p>
              </div>
            )}
          </section>
        )}

        {panel === "profile" && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-ink">Profile</h2>
              {!editing && (
                <button
                  type="button"
                  onClick={() => {
                    setForm(commerce.profile);
                    setEditing(true);
                    setError("");
                  }}
                  className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-brand hover:text-brand"
                >
                  Edit
                </button>
              )}
            </div>

            <div className="rounded-md border border-line bg-raised p-4">
              {editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["name", "Full name", "name"],
                      ["phone", "Phone number", "tel"],
                    ] as const
                  ).map(([key, label, ac]) => (
                    <div key={key}>
                      <label
                        htmlFor={`profile-${key}`}
                        className="mb-1 block text-sm font-medium text-ink"
                      >
                        {label}
                      </label>
                      <input
                        id={`profile-${key}`}
                        value={form[key]}
                        autoComplete={ac}
                        onChange={(e) =>
                          setForm((current) => ({ ...current, [key]: e.target.value }))
                        }
                        className="w-full rounded-md border border-line bg-raised px-3 py-2.5 text-base text-ink outline-none focus:border-brand"
                      />
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="profile-address"
                      className="mb-1 block text-sm font-medium text-ink"
                    >
                      Delivery address
                    </label>
                    <textarea
                      id="profile-address"
                      value={form.address}
                      rows={3}
                      autoComplete="street-address"
                      onChange={(e) =>
                        setForm((current) => ({ ...current, address: e.target.value }))
                      }
                      className="w-full resize-y rounded-md border border-line bg-raised px-3 py-2.5 text-base text-ink outline-none focus:border-brand"
                    />
                  </div>

                  <div aria-live="assertive" className="sm:col-span-2 empty:hidden">
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

                  <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => void saveProfile(null)}
                      className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-60"
                    >
                      {busy || "Save"}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={pickAvatar}
                      className="flex items-center gap-2 rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:border-brand hover:text-brand disabled:opacity-60"
                    >
                      <Icon name="camera" size={16} />
                      Change photo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setError("");
                      }}
                      className="ml-auto text-sm text-ink-muted hover:text-ink"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    {[
                      ["Name", commerce.profile.name],
                      ["Email", email],
                      ["Phone", commerce.profile.phone],
                      ["Address", commerce.profile.address],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs uppercase tracking-wide text-ink-faint">{label}</dt>
                        <dd className="mt-0.5 text-sm text-ink">{value || "Not set"}</dd>
                      </div>
                    ))}
                  </dl>
                  {error && (
                    <p role="alert" className="mt-4 text-sm text-critical">
                      {error}
                    </p>
                  )}
                </>
              )}

              <label className="mt-6 flex w-fit cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={commerce.notifications}
                  onChange={(e) =>
                    updateCommerce((current) => ({
                      ...current,
                      notifications: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[var(--color-brand)]"
                />
                Receive promotional messages
              </label>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
