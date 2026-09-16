import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { usePublishedConfig } from "@/lib/config-api";
import { useTheme, safeStoreLink } from "@/lib/storefront";
import { rs } from "@/lib/format";
import { CartDrawer } from "@/components/CartDrawer";

/*
 * Storefront chrome ported from the Daraz Nepal marketplace design in
 * ../web ui ux design/daraz_nepal_homepage_clone/code.html: orange utility
 * header with inline search + cart badge, hero-style promo ribbon, and the
 * comprehensive multi-column footer.
 */
export function StoreLayout() {
  const { cartCount, session, backendError, retryBackend, products } =
    useShop();
  const config = usePublishedConfig();
  const theme = useTheme();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("gulmeli-recent-searches") ?? "[]");
    } catch {
      return [] as string[];
    }
  });
  const searchWrap = useRef<HTMLDivElement>(null);
  const brand = config.branding.companyName;
  const logo =
    (theme.dark ? config.branding.logoDark : config.branding.logoLight) ||
    config.branding.logo;
  useEffect(() => {
    document.title = brand;
    let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
    }
    icon.href = safeStoreLink(config.branding.favicon) || "/favicon.ico";
  }, [brand, config.branding.favicon]);
  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (searchWrap.current && !searchWrap.current.contains(e.target as Node))
        setSuggestionsOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setSuggestionsOpen(false);
    document.addEventListener("click", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("click", away);
      document.removeEventListener("keydown", esc);
    };
  }, []);
  const vars = {
    "--store-primary": theme.primary,
    "--store-primary-text": theme.primaryText,
    "--store-bg": theme.background,
    "--store-surface": theme.surface,
    "--store-text": theme.text,
    "--store-muted": theme.muted,
    "--store-border": theme.border,
    "--store-on-primary": theme.onPrimary,
    colorScheme: theme.dark ? "dark" : "light",
  } as CSSProperties;
  const submitSearch = (q: string) => {
    const term = q.trim();
    if (!term) return;
    setSuggestionsOpen(false);
    setQuery("");
    setRecentSearches((current) => {
      const next = [term, ...current.filter((t) => t !== term)].slice(0, 5);
      try {
        localStorage.setItem("gulmeli-recent-searches", JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return next;
    });
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };
  const needle = query.trim().toLowerCase();
  const matchedTerms = needle
    ? [...new Set(products.flatMap((p) => [p.name, p.category, p.brand ?? ""]))]
        .filter((t) => t.toLowerCase().includes(needle))
        .slice(0, 4)
    : [];
  const categoriesForNeedle = needle
    ? [...new Set(products.map((p) => p.category))].slice(0, 2)
    : [];
  const matches = needle
    ? products
        .filter((p) =>
          [p.name, p.category, p.brand].some((f) =>
            String(f ?? "").toLowerCase().includes(needle),
          ),
        )
        .slice(0, 3)
    : [];
  const trending = [...products]
    .sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0))
    .slice(0, 6);
  return (
    <div
      className="storefront flex min-h-screen flex-col text-xs sm:text-sm"
      style={{ ...vars, background: theme.background, color: theme.text }}
    >
      <a href="#store-main" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      {/* BEGIN: TopUtilityHeader */}
      <header
        className={config.header.sticky ? "sticky top-0 z-40" : "relative z-40"}
        style={{ background: theme.headerBackground }}
      >
        {config.announcement.enabled && config.announcement.text ? (
          <div
            className="mx-auto max-w-[1188px] px-2 py-1 text-center text-[11px] font-medium"
            style={{
              color:
                config.announcement.backgroundColor &&
                config.announcement.backgroundColor !== theme.headerBackground
                  ? config.announcement.textColor
                  : undefined,
              background:
                config.announcement.backgroundColor &&
                config.announcement.backgroundColor !== theme.headerBackground
                  ? config.announcement.backgroundColor
                  : undefined,
            }}
          >
            {config.announcement.text}
          </div>
        ) : null}
        {/* Top mini utility bar */}
        <div className="mx-auto flex max-w-[1188px] items-center justify-between px-2 py-1 text-[11px] font-medium tracking-wide">
          <div className="flex items-center gap-6" style={{ color: theme.headerText }}>
            {config.app.appStoreUrl && (
              <a
                href={safeStoreLink(config.app.appStoreUrl) ?? "#"}
                className="hover:underline opacity-95"
              >
                SAVE MORE ON APP
              </a>
            )}
            <Link to="/sell" className="hover:underline opacity-95">
              BECOME A SELLER
            </Link>
            <Link to="/help" className="hover:underline opacity-95">
              HELP &amp; SUPPORT
            </Link>
          </div>
          <div className="flex items-center gap-6" style={{ color: theme.headerText }}>
            <Link
              to={session ? "/account" : "/auth"}
              className="uppercase tracking-wide hover:underline"
            >
              {session ? "My Account" : "Sign Up / Log In"}
            </Link>
            <Link to="/help" className="hover:underline">
              भाषा परिवर्तन
            </Link>
          </div>
        </div>
        {/* Main navigation / search bar */}
        <div className="mx-auto flex max-w-[1188px] items-center justify-between gap-8 px-2 py-3">
          <Link
            to="/"
            className={`shrink-0 ${config.header.showLogo ? "" : "hidden"}`}
            aria-label={brand}
          >
            {logo ? (
              <img
                src={logo}
                alt={brand}
                className="h-10 w-44 object-contain object-left"
              />
            ) : (
              <span
                className="text-2xl font-extrabold tracking-tight"
                style={{ color: theme.headerText }}
              >
                {brand}
                <span className="ml-0.5 mt-1 inline-block h-2 w-2 rounded-full bg-white align-top" />
              </span>
            )}
          </Link>
          <div
            ref={searchWrap}
            className={`relative max-w-[760px] flex-1 ${config.header.showSearch ? "" : "hidden"}`}
            id="search-wrapper"
          >
            <div className="relative flex items-center">
              <input
                id="main-search-input"
                aria-label="Search products"
                value={query}
                onFocus={() => setSuggestionsOpen(true)}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSuggestionsOpen(true);
                }}
                placeholder={config.header.searchPlaceholder || "Search products"}
                className="h-10 w-full rounded-[2px] border-none bg-white pl-4 pr-12 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-0"
                onKeyDown={(e) => e.key === "Enter" && submitSearch(query)}
              />
              <button
                type="button"
                aria-label="Search"
                onClick={() => submitSearch(query)}
                className="absolute right-0 top-0 flex h-10 w-11 items-center justify-center rounded-r-[2px] bg-[#ffebe2] text-[#f85606] transition hover:bg-[#fed6c5]"
              >
                <i className="fa-solid fa-magnifying-glass text-base" />
              </button>
            </div>
            {/* Search suggestions dropdown */}
            {suggestionsOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-b-md border border-gray-200 bg-white text-xs text-gray-800 shadow-2xl">
                {needle ? (
                  <div className="space-y-2 p-3">
                    {matchedTerms.length > 0 && (
                      <div className="divide-y divide-gray-100">
                        {matchedTerms.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => submitSearch(t)}
                            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-gray-700 hover:bg-gray-50"
                          >
                            <span className="flex items-center gap-2">
                              <i className="fa-solid fa-magnifying-glass text-[10px] text-gray-400" />
                              {t}
                            </span>
                            <span className="text-[10px] text-[#f85606]">in {brand}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {categoriesForNeedle.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => submitSearch(`${query} ${c}`)}
                        className="flex w-full items-center justify-between rounded bg-gray-50 px-2 py-1.5 text-left text-gray-700 hover:bg-orange-50"
                      >
                        <span>
                          Search &ldquo;<strong>{needle}</strong>&rdquo; in {c}
                        </span>
                        <i className="fa-solid fa-arrow-right text-[10px] text-gray-400" />
                      </button>
                    ))}
                    {matches.length > 0 && (
                      <div className="space-y-1.5 border-t border-gray-100 pt-2">
                        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                          Products
                        </div>
                        {matches.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSuggestionsOpen(false);
                              navigate(`/product/${p.id}`);
                            }}
                            className="flex w-full items-center gap-2.5 rounded p-1.5 text-left transition hover:bg-gray-50"
                          >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-gray-200 bg-white p-0.5">
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt=""
                                  className="max-h-full max-w-full object-contain"
                                />
                              ) : (
                                <i className="fa-solid fa-bag-shopping text-gray-300" />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-gray-800">
                                {p.name}
                              </span>
                              <span className="block text-xs font-bold text-[#f85606]">
                                {rs(p.price)}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 p-3">
                    {recentSearches.length > 0 && (
                      <div>
                        <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-gray-500">
                          <span>Recent Searches</span>
                          <button
                            type="button"
                            onClick={() => {
                              setRecentSearches([]);
                              try {
                                localStorage.removeItem("gulmeli-recent-searches");
                              } catch {
                                /* private mode */
                              }
                            }}
                            className="text-[10px] font-normal text-gray-400 hover:text-red-500"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {recentSearches.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => submitSearch(t)}
                              className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700 transition hover:bg-orange-50 hover:text-[#f85606]"
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="border-t border-gray-100 pt-2">
                      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                        Trending Searches
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {trending.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => submitSearch(p.category)}
                            className="rounded-full bg-orange-50 px-2.5 py-1 font-medium text-[#f85606] transition hover:bg-orange-100"
                          >
                            🔥 {p.category}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Cart + account icons */}
          <div className="flex shrink-0 items-center gap-1">
            {config.header.showProfile && (
              <Link
                to={session ? "/account" : "/auth"}
                aria-label="Account"
                className="relative p-2 hover:text-gray-100"
                style={{ color: theme.headerText }}
              >
                <i className="fa-regular fa-user text-2xl" />
              </Link>
            )}
            {config.header.showCart && (
              <button
                type="button"
                id="cart-toggle-btn"
                aria-label="Shopping Cart"
                onClick={() => setDrawerOpen(true)}
                className="relative p-2 hover:text-gray-100"
                style={{ color: theme.headerText }}
              >
                <i className="fa-solid fa-cart-shopping text-2xl" />
                <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#f85606] shadow">
                  {cartCount}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>
      {/* END: TopUtilityHeader */}
      {backendError && (
        <div
          role="alert"
          className="mx-auto flex w-full max-w-[1188px] gap-4 p-4 text-sm"
        >
          <span>{backendError}</span>
          <button onClick={retryBackend} className="underline">
            Retry connection
          </button>
        </div>
      )}
      <main
        id="store-main"
        className="mx-auto w-full max-w-[1188px] flex-1 px-2 py-3"
      >
        <Outlet />
      </main>
      {/* BEGIN: ComprehensiveFooter */}
      {config.footer.enabled && (
        <footer className="border-t border-gray-200 bg-white pb-4 pt-8 text-xs text-gray-600">
          <div className="mx-auto max-w-[1188px] px-2">
            <div className="grid grid-cols-1 gap-6 border-b border-gray-200 pb-8 md:grid-cols-4">
              <div>
                <h5 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-800">
                  Customer Care
                </h5>
                <ul className="space-y-1.5 text-[11px]">
                  <li>
                    <Link to="/help" className="hover:text-[#f85606]">
                      Help Center
                    </Link>
                  </li>
                  <li>
                    <Link to="/help" className="hover:text-[#f85606]">
                      How to Buy
                    </Link>
                  </li>
                  <li>
                    <Link to="/help" className="hover:text-[#f85606]">
                      Returns &amp; Refunds
                    </Link>
                  </li>
                  <li>
                    <Link to="/help" className="hover:text-[#f85606]">
                      Contact Us
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h5 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-800">
                  {brand}
                </h5>
                <ul className="space-y-1.5 text-[11px]">
                  {[
                    [`About ${brand}`, "/help"],
                    ["Careers", "/help"],
                    ["Blog", "/help"],
                    ["Terms & Conditions", "/account"],
                    ["Privacy Policy", "/account"],
                    ["Digital Payments", "/checkout"],
                    ["Customer University", "/help"],
                    ["Affiliate Program", "/sell"],
                    ["Review & Win", "/offers"],
                    ["Meet the winners", "/offers"],
                    ["Seller University", "/sell"],
                    [`Sell on ${brand}`, "/sell"],
                    ["Code of Conduct", "/help"],
                  ].map(([label, to]) => (
                    <li key={label}>
                      <Link to={to} className="hover:text-[#f85606]">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col justify-start md:col-span-2">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f85606] text-2xl text-white shadow-sm">
                    <i className="fa-solid fa-bag-shopping" />
                  </div>
                  <div>
                    <div className="text-sm font-bold leading-tight text-[#f85606]">
                      Happy Shopping
                    </div>
                    <div className="text-xs text-gray-500">
                      {config.branding.tagline}
                    </div>
                  </div>
                </div>
                {config.footer.showAppLinks && (
                  <div className="mb-6 flex flex-wrap gap-2">
                    {[
                      {
                        href: safeStoreLink(config.app.appStoreUrl),
                        icon: "fa-brands fa-apple text-base",
                        top: "Download on",
                        name: "App Store",
                      },
                      {
                        href: safeStoreLink(config.app.playStoreUrl),
                        icon: "fa-brands fa-google-play text-sm text-yellow-400",
                        top: "GET IT ON",
                        name: "Google Play",
                      },
                    ]
                      .filter((b) => b.href)
                      .map((b) => (
                        <a
                          key={b.name}
                          href={b.href ?? "#"}
                          className="flex items-center gap-2 rounded bg-black px-3 py-1.5 text-[10px] text-white hover:bg-gray-800"
                        >
                          <i className={b.icon} />
                          <span className="text-left">
                            <span className="block text-[8px] leading-none text-gray-400">
                              {b.top}
                            </span>
                            <span className="font-bold">{b.name}</span>
                          </span>
                        </a>
                      ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <div className="mb-2 text-xs font-bold uppercase text-gray-700">
                      Payment Methods
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded border bg-gray-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800">
                        VISA
                      </span>
                      <span className="rounded border bg-gray-100 px-2 py-0.5 text-[10px] font-extrabold text-red-600">
                        Mastercard
                      </span>
                      <span className="rounded border bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                        eSewa
                      </span>
                      <span className="rounded border bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                        Khalti
                      </span>
                      <span className="rounded border bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                        Cash on Delivery
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-bold uppercase text-gray-700">
                      Verified by
                    </div>
                    <div className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-100 px-2.5 py-1">
                      <i className="fa-solid fa-shield-halved text-sm text-green-600" />
                      <span className="text-[10px] font-bold text-gray-700">
                        Secure Checkout
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* SEO informational block (per homepage mock) */}
            <div className="grid grid-cols-1 gap-6 border-b border-gray-200 py-6 text-[10px] leading-relaxed text-gray-500 md:grid-cols-4">
              <div>
                <h6 className="mb-1.5 text-xs font-bold text-gray-700">
                  Experience Hassle-Free Online Shopping in Nepal with {brand}
                </h6>
                <p className="mb-2">
                  {brand} is the pioneer online shopping platform offering seamless
                  access to hundreds of top brands across smartphones, laptops,
                  electronics, appliances, fashion, home essentials, and groceries.
                </p>
                <h6 className="mb-1.5 mt-3 text-xs font-bold text-gray-700">
                  Convenient Online Shopping in Nepal
                </h6>
                <p>
                  {brand} is the ultimate Nepali eCommerce website offering customer
                  support and high-standard delivery, updated daily with thousands of
                  products catering to all consumer needs.
                </p>
              </div>
              <div>
                <p className="mb-2">
                  Online marketplace delivery across all 77 districts of Nepal.
                </p>
                <p className="mb-1 font-semibold text-gray-700">General Information:</p>
                <p>
                  {brand}
                  <br />
                  {config.contact.address || "Kathmandu, Nepal"}
                </p>
                <p className="mt-2 font-semibold text-gray-700">
                  Grievance handling Information:
                </p>
                <p>
                  {config.contact.phone ? `Phone: ${config.contact.phone}` : ""}
                  {config.contact.phone && config.contact.email ? " · " : ""}
                  {config.contact.email ? `Email: ${config.contact.email}` : ""}
                </p>
                <h6 className="mb-1 mt-3 text-xs font-bold uppercase text-gray-700">
                  TRENDING
                </h6>
                <p className="line-clamp-3">
                  {products
                    .slice(0, 8)
                    .map((p) => p.category)
                    .filter((c, i, a) => a.indexOf(c) === i)
                    .join(", ")}
                  .
                </p>
              </div>
              <div>
                <h6 className="mb-1.5 text-xs font-bold uppercase text-gray-700">
                  Top Categories &amp; Brands
                </h6>
                {[...new Set(products.map((p) => p.category))].slice(0, 8).map((c) => (
                  <div key={c}>
                    <p className="mb-0.5 font-semibold text-gray-600">{c.toUpperCase()}</p>
                    <p className="mb-2 line-clamp-2">
                      {products
                        .filter((p) => p.category === c)
                        .slice(0, 6)
                        .map((p) => p.brand || p.name)
                        .join(", ")}
                      .
                    </p>
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-0.5 font-semibold text-gray-600">CUSTOMER CARE</p>
                <p className="mb-2">
                  Help Center, Track Order, Returns &amp; Refunds, Cash on Delivery,
                  Vouchers.
                </p>
                <p className="mb-0.5 font-semibold text-gray-600">SELL ON {brand.toUpperCase()}</p>
                <p className="mb-2">
                  List your products, receive orders, pack &amp; hand over, get paid
                  weekly via NCHL/IPs.
                </p>
                <p className="mb-0.5 font-semibold text-gray-600">SECURE CHECKOUT</p>
                <p>
                  Visa, Mastercard, eSewa, Khalti, IME and Cash on Delivery — PCI DSS
                  compliant.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center justify-between gap-4 pt-4 text-[11px] text-gray-500 md:flex-row">
              <div className="flex items-center flex-wrap gap-4">
                <span className="font-bold text-gray-700">More from {brand}:</span>
                <Link to="/offers" className="flex items-center gap-1.5 hover:text-[#f85606]">
                  <i className="fa-solid fa-flag text-red-600" /> Nepal
                </Link>
                <Link to="/sell" className="flex items-center gap-1.5 hover:text-[#f85606]">
                  <i className="fa-solid fa-store" /> Sell on {brand}
                </Link>
                <Link to="/help" className="flex items-center gap-1.5 hover:text-[#f85606]">
                  <i className="fa-solid fa-headset" /> Help Center
                </Link>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-xs font-bold text-gray-700">
                    Follow Us:
                  </span>
                  {config.social.enabled.map((key) => {
                    const url = safeStoreLink(
                      config.social[key as keyof typeof config.social],
                    );
                    return url ? (
                      <a
                        key={key}
                        href={url}
                        className="text-blue-600 hover:opacity-80"
                        aria-label={key}
                      >
                        <i
                          className={`fa-brands fa-${
                            key.toLowerCase() === "facebook"
                              ? "facebook"
                              : key.toLowerCase() === "instagram"
                                ? "instagram"
                                : key.toLowerCase() === "youtube"
                                  ? "youtube"
                                  : key.toLowerCase() === "tiktok"
                                    ? "tiktok"
                                    : "share-nodes"
                          }`}
                        />
                      </a>
                    ) : null;
                  })}
                </div>
                <span className="text-gray-400">
                  {config.footer.copyright
                    .replace("{year}", String(new Date().getFullYear()))
                    .replace("{company}", brand)}
                </span>
              </div>
            </div>
          </div>
        </footer>
      )}
      {/* END: ComprehensiveFooter */}
      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
