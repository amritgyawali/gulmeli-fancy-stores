import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { usePublishedConfig } from "@/lib/config-api";
import { useTheme, safeStoreLink } from "@/lib/storefront";
import { rs } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { CartDrawer } from "@/components/CartDrawer";

/*
 * The storefront shell — one chrome for every customer-facing route.
 *
 * It used to be two: an orange "homepage" header for /, /cart, /offers and a
 * separate Material-3 header for /product, /checkout, /account. A customer
 * tapping a product from the home grid landed on a page with a different
 * logo, a different search field and a different footer, which read as two
 * websites stitched together. There is one header now, and it is the same
 * header everywhere.
 *
 * Responsiveness is the other thing that changed. The old header laid out a
 * row of utility links, a 760px search field and an icon cluster with no
 * breakpoints at all, so on a phone the three fought for the same 360px. Now
 * the search field owns the top bar on small screens, navigation moves into a
 * drawer, and primary destinations move to a bottom bar within thumb reach.
 */

const MAX_RECENT = 6;
const RECENT_KEY = "gulmeli:recent-searches";

function readRecent(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

/* Destinations that belong in the phone bottom bar, in reach order. */
const BOTTOM_NAV = [
  { to: "/", label: "Home", icon: "home", end: true },
  { to: "/offers", label: "Offers", icon: "percent" },
  { to: "/search", label: "Browse", icon: "grid" },
  { to: "/messages", label: "Inbox", icon: "message" },
  { to: "/account", label: "Account", icon: "user" },
] as const;

export function StoreLayout() {
  const { cartCount, session, backendError, retryBackend, products } = useShop();
  const config = usePublishedConfig();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [query, setQuery] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>(readRecent);

  const searchWrap = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const brand = config.branding.companyName;
  const logo =
    (theme.dark ? config.branding.logoDark : config.branding.logoLight) ||
    config.branding.logo;

  /* Categories come from the catalogue rather than a hardcoded list, so the
     nav can never advertise a department the store does not stock. */
  const categories = useMemo(() => {
    const counted = new Map<string, number>();
    for (const p of products) counted.set(p.category, (counted.get(p.category) ?? 0) + 1);
    return [...counted.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .filter(Boolean);
  }, [products]);

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

  /* Close transient surfaces on navigation — a drawer left open across a route
     change was the most common way the old layout ended up covering content. */
  useEffect(() => {
    setNavOpen(false);
    setSuggestOpen(false);
  }, [location.pathname, location.search]);

  /* Lock the page behind the mobile drawer so the body does not scroll under
     it, and restore the exact previous value rather than clearing it. */
  useEffect(() => {
    if (!navOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [navOpen]);

  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (searchWrap.current && !searchWrap.current.contains(e.target as Node))
        setSuggestOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSuggestOpen(false);
        setNavOpen(false);
      }
      /* "/" focuses search, the convention on every catalogue site, but not
         while the caret is already inside a field. */
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchInput.current?.focus();
      }
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", key);
    };
  }, []);

  const submitSearch = (raw: string) => {
    const term = raw.trim();
    if (!term) return;
    setSuggestOpen(false);
    setQuery("");
    searchInput.current?.blur();
    setRecent((current) => {
      const next = [term, ...current.filter((t) => t !== term)].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* private browsing — recent searches simply do not persist */
      }
      return next;
    });
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const needle = query.trim().toLowerCase();
  const termMatches = needle
    ? [...new Set(products.flatMap((p) => [p.name, p.category, p.brand ?? ""]))]
        .filter((t) => t && t.toLowerCase().includes(needle))
        .slice(0, 5)
    : [];
  const productMatches = needle
    ? products
        .filter((p) =>
          [p.name, p.category, p.brand].some((f) =>
            String(f ?? "").toLowerCase().includes(needle),
          ),
        )
        .slice(0, 4)
    : [];
  const trending = useMemo(
    () =>
      [...new Set([...products].sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0)).map((p) => p.category))]
        .filter(Boolean)
        .slice(0, 6),
    [products],
  );

  /*
   * The full token set the stylesheet reads, derived from the published
   * appearance so the admin console's colours and colour scheme reach every
   * element — not just the handful that used to read these variables
   * directly. Selecting the dark scheme previously repainted the page
   * background and left every card, table and label in its light-mode
   * colour, because those came from hardcoded classes.
   *
   * The blends are computed rather than hand-picked so any brand colour an
   * operator sets produces a consistent soft tint, hairline and muted text.
   */
  const blend = (color: string, pct: number, towards: string) =>
    `color-mix(in srgb, ${color} ${pct}%, ${towards})`;

  const vars = {
    "--brand": theme.primary,
    "--brand-strong": blend(theme.primary, 82, theme.dark ? "#ffffff" : "#000000"),
    "--brand-soft": blend(theme.primary, theme.dark ? 20 : 8, theme.surface),
    "--brand-border": blend(theme.primary, theme.dark ? 38 : 26, theme.surface),
    "--brand-ink": theme.onPrimary,
    "--surface": theme.surface,
    "--sunken": blend(theme.surface, 96, theme.text),
    "--page": theme.background,
    "--ink": theme.text,
    "--ink-soft": blend(theme.text, 78, theme.surface),
    "--ink-muted": theme.muted,
    "--ink-faint": blend(theme.muted, 68, theme.surface),
    "--line": theme.border,
    "--line-strong": blend(theme.border, 72, theme.text),
    colorScheme: theme.dark ? "dark" : "light",
  } as CSSProperties;

  const searchField = (
    <div ref={searchWrap} className="relative flex-1">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submitSearch(query);
        }}
        className="flex h-11 items-center rounded-md border border-line bg-raised focus-within:border-brand"
      >
        <Icon name="search" size={18} className="ml-3 shrink-0 text-ink-muted" />
        <input
          ref={searchInput}
          type="search"
          value={query}
          role="combobox"
          aria-expanded={suggestOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-label={`Search ${brand}`}
          placeholder={config.header.searchPlaceholder || "Search products"}
          onFocus={() => setSuggestOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setSuggestOpen(true);
          }}
          className="h-full w-full bg-transparent px-2.5 text-base text-ink outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              searchInput.current?.focus();
            }}
            className="grid h-8 w-8 place-items-center rounded-sm text-ink-muted hover:bg-sunken hover:text-ink"
          >
            <Icon name="close" size={15} />
          </button>
        )}
        <button
          type="submit"
          className="mr-1 grid h-9 w-11 shrink-0 place-items-center rounded-sm bg-brand text-white hover:bg-brand-strong"
          aria-label="Search"
        >
          <Icon name="search" size={17} />
        </button>
      </form>

      {suggestOpen && (needle || recent.length > 0 || trending.length > 0) && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-md border border-line bg-raised shadow-e3"
        >
          {needle ? (
            <>
              {termMatches.length > 0 && (
                <ul className="py-1">
                  {termMatches.map((t) => (
                    <li key={t}>
                      <button
                        type="button"
                        role="option"
                        aria-selected="false"
                        onClick={() => submitSearch(t)}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink hover:bg-sunken"
                      >
                        <Icon name="search" size={14} className="shrink-0 text-ink-faint" />
                        <span className="clamp-1">{t}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {productMatches.length > 0 && (
                <div className="border-t border-line p-1.5">
                  <p className="px-1.5 pb-1 pt-1 text-2xs font-semibold uppercase tracking-wide text-ink-faint">
                    Products
                  </p>
                  {productMatches.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSuggestOpen(false);
                        setQuery("");
                        navigate(`/product/${p.id}`);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-sm p-1.5 text-left hover:bg-sunken"
                    >
                      <span className="media grid h-10 w-10 shrink-0 place-items-center rounded-xs border border-line">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="object-contain" />
                        ) : (
                          <Icon name="bag" size={16} className="text-ink-faint" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="clamp-1 block text-sm text-ink">{p.name}</span>
                        <span className="tnum block text-sm font-semibold text-brand">
                          {rs(p.price)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {termMatches.length === 0 && productMatches.length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-ink-muted">
                  Nothing matches “{query.trim()}”. Press Enter to search anyway.
                </p>
              )}
            </>
          ) : (
            <div className="space-y-3 p-3">
              {recent.length > 0 && (
                <section>
                  <div className="mb-1.5 flex items-center justify-between">
                    <h3 className="text-2xs font-semibold uppercase tracking-wide text-ink-faint">
                      Recent
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setRecent([]);
                        try {
                          localStorage.removeItem(RECENT_KEY);
                        } catch {
                          /* nothing stored to clear */
                        }
                      }}
                      className="text-xs text-ink-muted hover:text-brand"
                    >
                      Clear
                    </button>
                  </div>
                  <ul className="flex flex-wrap gap-1.5">
                    {recent.map((t) => (
                      <li key={t}>
                        <button
                          type="button"
                          onClick={() => submitSearch(t)}
                          className="rounded-sm border border-line px-2.5 py-1 text-xs text-ink-soft hover:border-brand hover:text-brand"
                        >
                          {t}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {trending.length > 0 && (
                <section>
                  <h3 className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-faint">
                    Popular categories
                  </h3>
                  <ul className="flex flex-wrap gap-1.5">
                    {trending.map((c) => (
                      <li key={c}>
                        <button
                          type="button"
                          onClick={() => submitSearch(c)}
                          className="rounded-sm bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-strong hover:bg-brand-border"
                        >
                          {c}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="storefront flex min-h-screen flex-col bg-canvas text-ink"
      style={{ ...vars, background: theme.background, color: theme.text }}
    >
      <a
        href="#store-main"
        className="sr-only left-2 top-2 z-[60] rounded-sm bg-raised px-3 py-2 text-sm font-medium shadow-e2 focus:not-sr-only focus:absolute"
      >
        Skip to content
      </a>

      {config.announcement.enabled && config.announcement.text ? (
        <div
          className="px-4 py-1.5 text-center text-xs font-medium"
          style={{
            background: config.announcement.backgroundColor || theme.primary,
            color: config.announcement.textColor || theme.onPrimary,
          }}
        >
          {config.announcement.text}
        </div>
      ) : null}

      <header
        className={`${config.header.sticky ? "sticky top-0" : ""} z-40 border-b border-line bg-raised`}
      >
        {/* Utility strip — desktop only. On a phone these five links cost more
            vertical space than they are worth and are reachable from the menu. */}
        <div className="hidden border-b border-line bg-sunken md:block">
          <div className="page flex h-8 items-center justify-between text-xs text-ink-muted">
            <nav aria-label="Secondary" className="flex items-center gap-5">
              <Link to="/sell" className="hover:text-brand">
                Sell on {brand}
              </Link>
              <Link to="/help" className="hover:text-brand">
                Help &amp; support
              </Link>
              {config.contact.phone && (
                <a
                  href={`tel:${config.contact.phone}`}
                  className="flex items-center gap-1.5 hover:text-brand"
                >
                  <Icon name="phone" size={13} />
                  {config.contact.phone}
                </a>
              )}
            </nav>
            <div className="flex items-center gap-5">
              <Link to="/messages" className="hover:text-brand">
                Notifications
              </Link>
              <Link
                to={session ? "/account" : "/auth"}
                className="font-medium text-ink-soft hover:text-brand"
              >
                {session ? "My account" : "Sign in"}
              </Link>
            </div>
          </div>
        </div>

        {/* Primary bar */}
        <div className="page flex h-[var(--header-height)] items-center gap-3">
          <button
            type="button"
            className="hit -ml-2 grid place-items-center rounded-sm text-ink lg:hidden"
            aria-label="Open menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(true)}
          >
            <Icon name="menu" size={22} />
          </button>

          <Link
            to="/"
            aria-label={`${brand} home`}
            className={`shrink-0 ${config.header.showLogo ? "" : "hidden"}`}
          >
            {logo ? (
              <img src={logo} alt={brand} className="h-8 w-auto max-w-[160px] object-contain" />
            ) : (
              <span className="text-xl font-bold tracking-tight text-brand">{brand}</span>
            )}
          </Link>

          <div className={`hidden flex-1 md:flex ${config.header.showSearch ? "" : "md:hidden"}`}>
            {searchField}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            {config.header.showProfile && (
              <Link
                to={session ? "/account" : "/auth"}
                className="hit hidden place-items-center rounded-sm text-ink hover:bg-sunken md:grid"
                aria-label={session ? "My account" : "Sign in"}
              >
                <Icon name="user" size={21} />
              </Link>
            )}
            {config.header.showCart && (
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="hit relative grid place-items-center rounded-sm text-ink hover:bg-sunken"
                aria-label={
                  cartCount ? `Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}` : "Cart, empty"
                }
              >
                <Icon name="cart" size={21} />
                {cartCount > 0 && (
                  <span className="tnum absolute right-0.5 top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-brand px-1 text-2xs font-bold text-white ring-2 ring-raised">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Phone search sits on its own row so it gets the full width. */}
        {config.header.showSearch && (
          <div className="page pb-2.5 md:hidden">{searchField}</div>
        )}

        {/* Category rail. Real categories, horizontally scrollable, with the
            active one marked — the previous nav was a fixed list of twelve
            department names that had nothing to do with the catalogue. */}
        {categories.length > 0 && (
          <nav aria-label="Categories" className="hidden border-t border-line lg:block">
            <div className="page">
              <ul className="rail gap-1 py-1">
                <li>
                  <NavLink
                    to="/offers"
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 whitespace-nowrap rounded-sm px-2.5 py-1.5 text-sm font-medium ${
                        isActive ? "text-brand" : "text-ink-soft hover:text-brand"
                      }`
                    }
                  >
                    <Icon name="percent" size={14} />
                    Deals
                  </NavLink>
                </li>
                {categories.map((c) => (
                  <li key={c}>
                    <Link
                      to={`/search?q=${encodeURIComponent(c)}`}
                      className="block whitespace-nowrap rounded-sm px-2.5 py-1.5 text-sm text-ink-soft hover:text-brand"
                    >
                      {c}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        )}
      </header>

      {/* Mobile navigation drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setNavOpen(false)}
          />
          <nav
            aria-label="Main"
            className="absolute inset-y-0 left-0 flex w-[min(320px,85vw)] flex-col bg-raised shadow-e3"
          >
            <div className="flex h-[var(--header-height)] shrink-0 items-center justify-between border-b border-line px-4">
              <span className="text-lg font-bold text-brand">{brand}</span>
              <button
                type="button"
                onClick={() => setNavOpen(false)}
                className="hit -mr-2 grid place-items-center rounded-sm text-ink-muted hover:text-ink"
                aria-label="Close menu"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <ul className="border-b border-line p-2">
                {[
                  { to: session ? "/account" : "/auth", icon: "user", label: session ? "My account" : "Sign in" },
                  { to: "/offers", icon: "percent", label: "Deals" },
                  { to: "/messages", icon: "message", label: "Notifications" },
                  { to: "/help", icon: "headset", label: "Help & support" },
                  { to: "/sell", icon: "store", label: `Sell on ${brand}` },
                ].map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-base text-ink hover:bg-sunken"
                    >
                      <Icon name={item.icon} size={19} className="text-ink-muted" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              {categories.length > 0 && (
                <div className="p-2">
                  <h2 className="px-3 py-2 text-2xs font-semibold uppercase tracking-wide text-ink-faint">
                    Shop by category
                  </h2>
                  <ul>
                    {categories.map((c) => (
                      <li key={c}>
                        <Link
                          to={`/search?q=${encodeURIComponent(c)}`}
                          className="flex items-center justify-between rounded-sm px-3 py-2.5 text-base text-ink hover:bg-sunken"
                        >
                          {c}
                          <Icon name="chevronRight" size={15} className="text-ink-faint" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}

      {backendError && (
        <div role="alert" className="border-b border-caution/30 bg-caution-soft">
          <div className="page flex flex-wrap items-center gap-3 py-2.5 text-sm text-caution">
            <Icon name="alert" size={16} className="shrink-0" />
            <span className="flex-1">{backendError}</span>
            <button
              type="button"
              onClick={retryBackend}
              className="rounded-sm border border-caution/40 px-2.5 py-1 text-xs font-medium hover:bg-caution/10"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <main id="store-main" className="page flex-1 py-4 pb-24 lg:pb-8">
        <Outlet />
      </main>

      <StoreFooter brand={brand} />

      {/* Phone bottom bar. Kept out of the tab order of the page content and
          padded for the home indicator on iOS. */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-raised pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {BOTTOM_NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={"end" in item ? item.end : false}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2 text-2xs font-medium ${
                    isActive ? "text-brand" : "text-ink-muted"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      name={item.icon}
                      size={21}
                      strokeWidth={isActive ? 2 : 1.6}
                    />
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

/* ------------------------------------------------------------------ footer */

function StoreFooter({ brand }: { brand: string }) {
  const config = usePublishedConfig();
  if (!config.footer.enabled) return null;

  const columns = [
    {
      title: "Customer care",
      links: [
        ["Help centre", "/help"],
        ["How to buy", "/help"],
        ["Returns & refunds", "/help"],
        ["Track your order", "/account"],
        ["Contact us", "/help"],
      ],
    },
    {
      title: brand,
      links: [
        [`About ${brand}`, "/help"],
        ["Terms & conditions", "/help"],
        ["Privacy policy", "/help"],
        [`Sell on ${brand}`, "/sell"],
        ["Offers & vouchers", "/offers"],
      ],
    },
  ];

  const socials: { key: string; icon: string }[] = [
    { key: "facebook", icon: "facebook" },
    { key: "instagram", icon: "instagram" },
    { key: "youtube", icon: "youtube" },
    { key: "tiktok", icon: "tiktok" },
    { key: "whatsapp", icon: "whatsapp" },
  ];

  return (
    <footer className="no-print mt-8 border-t border-line bg-raised">
      {/* Service promises. Three facts, stated once — not repeated in a ribbon
          at the top of the page and again here. */}
      <div className="border-b border-line bg-sunken">
        <ul className="page grid gap-3 py-4 sm:grid-cols-3">
          {[
            { icon: "truckFast", title: "Nationwide delivery", note: "All 77 districts" },
            { icon: "shieldCheck", title: "Secure checkout", note: "Card, wallet or cash" },
            { icon: "undo", title: "Easy returns", note: "7 days from delivery" },
          ].map((item) => (
            <li key={item.title} className="flex items-center gap-3">
              <Icon name={item.icon} size={22} className="shrink-0 text-brand" />
              <span>
                <span className="block text-sm font-semibold text-ink">{item.title}</span>
                <span className="block text-xs text-ink-muted">{item.note}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="page grid gap-8 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-3 text-sm font-semibold text-ink">{col.title}</h2>
            <ul className="space-y-2">
              {col.links.map(([label, to]) => (
                <li key={label}>
                  <Link to={to} className="text-sm text-ink-muted hover:text-brand">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink">Payment methods</h2>
          <ul className="flex flex-wrap gap-1.5">
            {["Visa", "Mastercard", "eSewa", "Khalti", "Cash on delivery"].map((m) => (
              <li
                key={m}
                className="rounded-xs border border-line px-2 py-1 text-xs text-ink-soft"
              >
                {m}
              </li>
            ))}
          </ul>
          {config.contact.address && (
            <address className="mt-4 text-sm not-italic leading-relaxed text-ink-muted">
              {config.contact.address}
            </address>
          )}
          {config.contact.email && (
            <a
              href={`mailto:${config.contact.email}`}
              className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-brand"
            >
              <Icon name="mail" size={14} />
              {config.contact.email}
            </a>
          )}
        </div>

        <div>
          {config.footer.showAppLinks &&
            (config.app.appStoreUrl || config.app.playStoreUrl) && (
              <>
                <h2 className="mb-3 text-sm font-semibold text-ink">Get the app</h2>
                <ul className="mb-6 flex flex-wrap gap-2">
                  {[
                    { href: safeStoreLink(config.app.appStoreUrl), icon: "apple", name: "App Store" },
                    {
                      href: safeStoreLink(config.app.playStoreUrl),
                      icon: "googlePlay",
                      name: "Google Play",
                    },
                  ]
                    .filter((a) => a.href)
                    .map((a) => (
                      <li key={a.name}>
                        <a
                          href={a.href ?? "#"}
                          className="flex items-center gap-2 rounded-sm border border-line px-3 py-2 text-sm text-ink hover:border-ink-faint"
                        >
                          <Icon name={a.icon} size={18} />
                          {a.name}
                        </a>
                      </li>
                    ))}
                </ul>
              </>
            )}
          {config.footer.showSocial && (
            <>
              <h2 className="mb-3 text-sm font-semibold text-ink">Follow us</h2>
              <ul className="flex flex-wrap gap-1">
                {socials
                  .map((s) => ({
                    ...s,
                    url: safeStoreLink(
                      config.social[s.key as keyof typeof config.social] as unknown,
                    ),
                  }))
                  .filter((s) => s.url && config.social.enabled.includes(s.key))
                  .map((s) => (
                    <li key={s.key}>
                      <a
                        href={s.url ?? "#"}
                        aria-label={s.key}
                        className="hit grid place-items-center rounded-sm text-ink-muted hover:bg-sunken hover:text-ink"
                      >
                        <Icon name={s.icon} size={19} />
                      </a>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {config.footer.aboutText && (
        <div className="border-t border-line">
          <p className="page py-5 text-xs leading-relaxed text-ink-muted">
            {config.footer.aboutText}
          </p>
        </div>
      )}

      <div className="border-t border-line">
        <p className="page py-4 text-xs text-ink-muted">
          {config.footer.copyright
            .replace("{year}", String(new Date().getFullYear()))
            .replace("{company}", brand)}
        </p>
      </div>
    </footer>
  );
}
