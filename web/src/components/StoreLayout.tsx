import { useMemo, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { usePublishedConfig } from "@/lib/config-api";
import { CartDrawer } from "./CartDrawer";

/*
 * Storefront chrome rebuilt to match
 * ../web ui ux design/daraz_nepal_homepage_clone/code.html — utility strip,
 * orange header with search dropdown, category rail, mega footer, cart drawer.
 * Brand name/theme still come from the published admin config.
 */

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
  const [focused, setFocused] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const brand = String(config.branding?.companyName || "Gulmeli Fancy Stores");
  const primary = String(config.theme?.primaryColor || "#f85606");

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, products]);

  const popular = useMemo(
    () => products.slice(0, 6).map((p) => p.name.split(" ").slice(0, 3).join(" ")),
    [products],
  );

  const submitSearch = (value: string) => {
    setFocused(false);
    navigate(`/search?q=${encodeURIComponent(value.trim())}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f5f5] text-[#212121]">
      {/* ===== TopUtilityHeader (homepage design) ===== */}
      <div className="bg-[#161616] text-white">
        <div className="mx-auto flex max-w-[1188px] items-center justify-between px-2 py-1 text-[11px] font-medium">
          <div className="flex items-center space-x-6">
            <Link className="opacity-95 hover:underline" to="/offers">
              SAVE MORE ON APP
            </Link>
            <Link className="opacity-95 hover:underline" to="/sell">
              BECOME A SELLER
            </Link>
            <Link className="opacity-95 hover:underline" to="/help">
              HELP &amp; SUPPORT
            </Link>
          </div>
          <div className="flex items-center space-x-6">
            {session ? (
              <Link
                to="/account"
                className="uppercase tracking-wide hover:underline"
              >
                {commerce.profile.name.split(" ")[0] || "My"}&rsquo;s Account
              </Link>
            ) : (
              <Link
                to="/auth"
                className="uppercase tracking-wide hover:underline"
              >
                Sign in / Register
              </Link>
            )}
            <button className="hover:underline" type="button">
              भाषा परिवर्तन
            </button>
          </div>
        </div>
      </div>

      {/* Main navigation / search bar */}
      <header
        className="sticky top-0 z-40 shadow-md"
        style={{ background: primary }}
      >
        <div className="mx-auto flex max-w-[1188px] items-center justify-between gap-8 px-2 py-3">
          <Link to="/" className="flex shrink-0 items-center gap-1">
            <span className="flex items-center text-3xl font-extrabold tracking-tight text-white">
              {brand.split(" ")[0]}
              <span className="ml-0.5 mt-2 h-2.5 w-2.5 rounded-full bg-white" />
            </span>
          </Link>

          <div id="search-wrapper" className="relative max-w-[760px] flex-1">
            <form
              className="relative flex items-center"
              onSubmit={(event) => {
                event.preventDefault();
                submitSearch(query);
              }}
            >
              <input
                id="main-search-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => window.setTimeout(() => setFocused(false), 150)}
                aria-label="Search products"
                placeholder={`Search in ${brand}`}
                autoComplete="off"
                type="text"
                className="h-10 w-full rounded-[2px] border-none bg-white pl-4 pr-12 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0"
              />
              <button
                type="submit"
                aria-label="Search"
                className="absolute right-0 top-0 flex h-10 w-11 items-center justify-center rounded-r-[2px] bg-[#ffebe2] text-[#f85606] transition hover:bg-[#fed6c5]"
              >
                <i className="fa-solid fa-magnifying-glass text-base" />
              </button>
            </form>
            {/* Search dropdown */}
            <div
              id="search-dropdown"
              className={`absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-b-md border border-gray-200 bg-white text-xs text-gray-800 shadow-2xl ${
                focused && query.trim() ? "" : "hidden"
              }`}
            >
              <div id="search-dropdown-content" className="p-3">
                {suggestions.length === 0 ? (
                  <p className="px-1 py-2 text-gray-400">
                    No matches — press Enter to search anyway.
                  </p>
                ) : (
                  suggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={() => navigate(`/product/${p.id}`)}
                      className="flex w-full items-center gap-2 rounded px-1 py-2 text-left hover:bg-orange-50"
                    >
                      <i className="fa-solid fa-clock-rotate-left text-gray-300" />
                      <span className="line-clamp-1 flex-1">{p.name}</span>
                      <span className="font-bold text-[#f85606]">
                        Rs. {p.price.toLocaleString("en-US")}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
            <p className="mt-1 hidden truncate text-[11px] text-white/75 xl:block">
              Popular:{" "}
              {popular.map((p, i) => (
                <span key={p}>
                  {i > 0 && " · "}
                  <button
                    className="hover:text-white hover:underline"
                    onClick={() => submitSearch(p)}
                  >
                    {p}
                  </button>
                </span>
              ))}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <NavLink
              to="/account"
              className="hidden text-white hover:text-gray-100 md:block"
              aria-label="Account"
            >
              <i className="fa-regular fa-user text-2xl" />
            </NavLink>
            <div className="relative">
              <button
                id="cart-toggle-btn"
                aria-label="Shopping Cart"
                onClick={() => setDrawerOpen(true)}
                className="p-2 text-white hover:text-gray-100"
              >
                <i className="fa-solid fa-cart-shopping text-2xl" />
                <span className="absolute right-0 top-0 grid h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#f85606] shadow">
                  {cartCount}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Category rail (thin strip like the design's nav) */}
        <nav className="border-t border-white/15 bg-black/10">
          <div className="mx-auto flex max-w-[1188px] items-stretch gap-1 px-2">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white/90 hover:bg-white/10 ${
                  isActive ? "bg-white/15" : ""
                }`
              }
            >
              <i className="fa-solid fa-house text-[10px]" /> Home
            </NavLink>
            {CATEGORIES.map((c) => (
              <NavLink
                key={c}
                to={`/search?q=${encodeURIComponent(c)}`}
                className="px-3 py-1.5 text-[12px] font-semibold text-white/85 hover:bg-white/10"
              >
                {c}
              </NavLink>
            ))}
            <NavLink
              to="/offers"
              className={({ isActive }) =>
                `px-3 py-1.5 text-[12px] font-bold hover:bg-white/10 ${
                  isActive ? "bg-white/15 text-white" : "text-[#ffd166]"
                }`
              }
            >
              <i className="fa-solid fa-bolt" /> Flash Sale
            </NavLink>
            <div className="ml-auto flex items-stretch">
              <NavLink
                to="/messages"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white/85 hover:bg-white/10"
              >
                <i className="fa-regular fa-comment-dots text-[10px]" /> Messages
              </NavLink>
              <NavLink
                to="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white/85 hover:bg-white/10"
              >
                <i className="fa-solid fa-gauge-high text-[10px]" /> Store Admin
              </NavLink>
            </div>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1188px] flex-1 px-2 py-3">
        <Outlet />
      </main>

      {/* ===== ComprehensiveFooter (homepage design) ===== */}
      <footer className="mt-10 bg-white" aria-label="Site footer">
        <div className="mx-auto max-w-[1188px] px-2 py-8">
          <div className="grid grid-cols-1 gap-6 border-b border-gray-200 pb-8 text-[11px] md:grid-cols-5">
            <div>
              <h5 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-800">
                Customer Care
              </h5>
              <ul className="space-y-1.5 text-gray-500">
                <li><Link className="hover:text-[#f85606]" to="/help">Help Center</Link></li>
                <li><Link className="hover:text-[#f85606]" to="/help">How to Buy</Link></li>
                <li><Link className="hover:text-[#f85606]" to="/help">Returns &amp; Refunds</Link></li>
                <li><Link className="hover:text-[#f85606]" to="/help">Contact Us</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-800">
                {brand}
              </h5>
              <ul className="space-y-1.5 text-gray-500">
                <li><Link className="hover:text-[#f85606]" to="/">About {brand}</Link></li>
                <li><Link className="hover:text-[#f85606]" to="/sell">Sell on {brand.split(" ")[0]}</Link></li>
                <li><Link className="hover:text-[#f85606]" to="/sell">Affiliate Program</Link></li>
                <li><Link className="hover:text-[#f85606]" to="/admin">Store Admin</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-800">
                Payments &amp; Delivery
              </h5>
              <ul className="space-y-1.5 text-gray-500">
                <li>Cash on Delivery</li>
                <li>eSewa · Khalti · Connect IPS</li>
                <li>Rs. 0 shipping zone Kathmandu Valley</li>
                <li>GULMELI10 → 10% off Rs. 500+</li>
              </ul>
            </div>
            <div>
              <h5 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-800">
                Shop
              </h5>
              <ul className="space-y-1.5 text-gray-500">
                <li><Link className="hover:text-[#f85606]" to="/offers">Daily deals</Link></li>
                <li><Link className="hover:text-[#f85606]" to="/cart">My cart</Link></li>
                <li><Link className="hover:text-[#f85606]" to="/account">Orders &amp; wishlist</Link></li>
                <li><Link className="hover:text-[#f85606]" to="/search?q=Fashion">Fashion</Link></li>
                <li><Link className="hover:text-[#f85606]" to="/search?q=Electronics">Electronics</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-800">
                Download the App
              </h5>
              <div className="space-y-1.5">
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="flex w-full items-center justify-center gap-2 rounded bg-black px-2 py-1.5 text-[10px] text-white hover:bg-gray-800"
                >
                  <i className="fa-brands fa-apple text-sm" />
                  <span className="text-left leading-tight">
                    <span className="block text-[8px] leading-none text-gray-400">Download on</span>
                    <span className="font-bold">App Store</span>
                  </span>
                </a>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="flex w-full items-center justify-center gap-2 rounded bg-black px-2 py-1.5 text-[10px] text-white hover:bg-gray-800"
                >
                  <i className="fa-brands fa-google-play text-xs text-yellow-400" />
                  <span className="text-left leading-tight">
                    <span className="block text-[8px] leading-none text-gray-400">GET IT ON</span>
                    <span className="font-bold">Google Play</span>
                  </span>
                </a>
              </div>
            </div>
          </div>
          <h6 className="mb-1.5 mt-4 text-xs font-bold text-gray-700">
            Experience Hassle-Free Online Shopping in Nepal with {brand}
          </h6>
          <p className="max-w-4xl text-[11px] leading-relaxed text-gray-400">
            {brand} is your neighbourhood store gone digital — groceries,
            fashion, electronics, jewellery and daily essentials with cash on
            delivery across Kathmandu Valley and beyond. Every order syncs with
            our mobile app in real time. Happy Shopping!
          </p>
        </div>
        <div className="border-t border-gray-100 py-3 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} {brand} · Gulmeli, Gulmi District,
          Lumbini Province · Data in Supabase, media in Cloudinary
        </div>
      </footer>

      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

export { DEALS };
