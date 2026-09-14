import { useMemo, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import { useShop } from "@/store/ShopContext";
import { usePublishedConfig } from "@/lib/config-api";

const CATEGORIES = [
  "Fashion",
  "Electronics",
  "Groceries",
  "Lifestyle",
  "Jewelry",
];

const DEALS = [
  { label: "9.9 Mega Sale", to: "/offers", tone: "from-rose-600 to-orange-500" },
  { label: "Buy More Save More", to: "/offers", tone: "from-indigo-600 to-sky-500" },
  { label: "Free Shipping Vouchers", to: "/account", tone: "from-emerald-600 to-teal-500" },
  { label: "Gems Treasure Chest", to: "/messages", tone: "from-amber-500 to-yellow-400" },
  { label: "Choice Picks", to: "/search?q=Groceries", tone: "from-fuchsia-600 to-pink-500" },
  { label: "Flash Deals", to: "/offers", tone: "from-orange-600 to-red-500" },
];

export function StoreLayout() {
  const { cartCount, session, commerce, products } = useShop();
  const config = usePublishedConfig();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const brand = String(config.branding?.companyName || "Gulmeli Fancy Stores");
  const primary = String(config.theme?.primaryColor || "#f85606");

  // Popular searches from the live catalog so the header feels like a mall.
  const popular = useMemo(
    () => products.slice(0, 6).map((p) => p.name.split(" ").slice(0, 3).join(" ")),
    [products],
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f4f4]">
      {/* Utility strip */}
      <div className="bg-[#161616] text-[11px] text-slate-300">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-1.5">
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Icon name="shield" size={11} className="text-[#ffba00]" /> Safe Payment
            </span>
            <span className="flex items-center gap-1">
              <Icon name="truck" size={11} className="text-[#38bdf8]" /> Fast Delivery
            </span>
            <span className="flex items-center gap-1">
              <Icon name="box" size={11} className="text-[#fb923c]" /> Free Return
            </span>
          </span>
          <span className="flex items-center gap-4">
            <Link to="/offers" className="hover:text-white">Sell on Gulmeli</Link>
            <Link to="/admin" className="hover:text-white">Store Admin</Link>
            <Link to="/messages" className="hover:text-white">Help</Link>
            {session ? (
              <Link to="/account" className="font-bold text-[#ffba00] hover:text-amber-300">
                Hi, {commerce.profile.name.split(" ")[0] || session.user.email?.split("@")[0]}
              </Link>
            ) : (
              <Link to="/auth" className="font-bold text-[#ffba00] hover:text-amber-300">
                Sign in / Register
              </Link>
            )}
          </span>
        </div>
      </div>

      {/* Main header */}
      <header className="sticky top-0 z-40 shadow-md" style={{ background: primary }}>
        <div className="mx-auto flex max-w-[1280px] items-center gap-6 px-4 py-3">
          <Link to="/" className="flex shrink-0 items-center gap-2.5 text-white">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 text-2xl">
              🛍️
            </span>
            <span className="leading-tight">
              <span className="block text-xl font-black tracking-tight">{brand}</span>
              <span className="block text-[10px] tracking-[0.3em] opacity-80">
                ONLINE MALL
              </span>
            </span>
          </Link>
          <div className="min-w-0 flex-1">
            <form
              className="flex items-center overflow-hidden rounded-lg bg-white"
              onSubmit={(event) => {
                event.preventDefault();
                navigate(`/search?q=${encodeURIComponent(query.trim())}`);
              }}
            >
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search for products, brands and categories…"
                aria-label="Search products"
                className="min-w-0 flex-1 px-4 py-2.5 text-sm outline-none"
              />
              <button
                type="button"
                aria-label="Camera visual search"
                className="border-l border-slate-100 px-3 py-2.5 text-slate-500 hover:text-slate-800"
              >
                <Icon name="camera" size={18} />
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 bg-[#161616] px-6 py-2.5 text-sm font-bold text-white hover:bg-black"
              >
                <Icon name="search" size={16} /> Search
              </button>
            </form>
            <p className="mt-1 hidden truncate text-[11px] text-white/75 xl:block">
              Popular:{" "}
              {popular.map((p, i) => (
                <span key={p}>
                  {i > 0 && " · "}
                  <button className="hover:text-white hover:underline" onClick={() => navigate(`/search?q=${encodeURIComponent(p)}`)}>
                    {p}
                  </button>
                </span>
              ))}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/cart"
              className="relative flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:shadow-lg"
            >
              <Icon name="cart" size={18} />
              Cart
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#f5222d] px-1 text-[10px] font-black text-white">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link
              to="/account"
              className="hidden items-center gap-2 rounded-lg border border-white/40 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15 md:flex"
            >
              <Icon name="user" size={18} /> Account
            </Link>
          </div>
        </div>

        {/* Category strip */}
        <nav className="border-t border-white/15 bg-black/10">
          <div className="mx-auto flex max-w-[1280px] items-stretch gap-1 px-4">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-white/90 hover:bg-white/10 ${isActive ? "bg-white/15" : ""}`
              }
            >
              <Icon name="home" size={14} /> Home
            </NavLink>
            {CATEGORIES.map((c) => (
              <NavLink
                key={c}
                to={`/search?q=${encodeURIComponent(c)}`}
                className="px-4 py-2 text-[13px] font-semibold text-white/85 hover:bg-white/10"
              >
                {c}
              </NavLink>
            ))}
            <NavLink
              to="/offers"
              className={({ isActive }) =>
                `px-4 py-2 text-[13px] font-bold hover:bg-white/10 ${
                  isActive ? "bg-white/15 text-white" : "text-[#ffd166]"
                }`
              }
            >
              🔥 Daily Deals
            </NavLink>
            <div className="ml-auto flex items-stretch">
              <NavLink
                to="/messages"
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white/85 hover:bg-white/10"
              >
                <Icon name="message" size={14} /> Messages
              </NavLink>
              <NavLink
                to="/admin"
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white/85 hover:bg-white/10"
              >
                <Icon name="gauge" size={14} /> Admin
              </NavLink>
            </div>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-5">
        <Outlet />
      </main>

      {/* Mega footer */}
      <footer className="mt-10 border-t-4 bg-white" style={{ borderColor: primary }}>
        <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-10 text-sm md:grid-cols-5">
          <div className="md:col-span-2">
            <h4 className="text-base font-black">{brand}</h4>
            <p className="mt-2 max-w-md text-slate-500">
              Nepal's neighbourhood store gone digital — groceries, fashion,
              electronics, jewellery and daily essentials delivered with cash on
              delivery across Kathmandu Valley and beyond. Every order syncs with
              our mobile app in real time.
            </p>
            <div className="mt-4 flex gap-2 text-2xl">
              <span aria-hidden>📦</span>
              <span aria-hidden>💳</span>
              <span aria-hidden>🚚</span>
              <span aria-hidden>💎</span>
            </div>
          </div>
          <div>
            <h5 className="mb-2 font-black uppercase tracking-wide text-slate-800">Shop</h5>
            <ul className="space-y-1.5 text-slate-500">
              <li><Link className="hover:text-[#f85606]" to="/">Home feed</Link></li>
              <li><Link className="hover:text-[#f85606]" to="/offers">Daily deals</Link></li>
              <li><Link className="hover:text-[#f85606]" to="/cart">My cart</Link></li>
              <li><Link className="hover:text-[#f85606]" to="/search?q=Fashion">Fashion</Link></li>
              <li><Link className="hover:text-[#f85606]" to="/search?q=Electronics">Electronics</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="mb-2 font-black uppercase tracking-wide text-slate-800">Account</h5>
            <ul className="space-y-1.5 text-slate-500">
              <li><Link className="hover:text-[#f85606]" to="/account">Profile &amp; orders</Link></li>
              <li><Link className="hover:text-[#f85606]" to="/account">Wishlist</Link></li>
              <li><Link className="hover:text-[#f85606]" to="/messages">Messages</Link></li>
              <li><Link className="hover:text-[#f85606]" to="/auth">Sign in</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="mb-2 font-black uppercase tracking-wide text-slate-800">Store team</h5>
            <ul className="space-y-1.5 text-slate-500">
              <li><Link className="hover:text-[#f85606]" to="/admin">Admin dashboard</Link></li>
              <li>Cash on delivery · Rs. 0 shipping</li>
              <li>GULMELI10 → 10% off Rs. 500+</li>
              <li>Mon–Sat, 8 AM – 8 PM</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100 py-3 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} {brand} · Gulmeli, Gulmi District, Lumbini Province · Data in Supabase, media in Cloudinary
        </div>
      </footer>
    </div>
  );
}

export { DEALS };
