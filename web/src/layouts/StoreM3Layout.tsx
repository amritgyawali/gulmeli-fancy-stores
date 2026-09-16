import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { usePublishedConfig } from "@/lib/config-api";
import { safeStoreLink } from "@/lib/storefront";

/*
 * Material-3 storefront chrome for the inner pages (product details,
 * checkout, account, sell, help). Ported from the header + footer markup in
 * ../web ui ux design/daraz_nepal_checkout_buy_now/code.html (the same 3-bar
 * M3 header/footer appears in product_details_page_*, manage_my_account,
 * become_a_seller and contact_us_help_center): fixed header (utility bar +
 * main bar + category nav, total h-36), main pt-36, container
 * max-w-[1200px] px-margin-desktop, Roboto Flex + Material Symbols, M3 color
 * tokens from src/index.css @theme.
 */

const CATEGORIES = [
  "Electronic Devices",
  "Electronic Accessories",
  "TV & Home Appliances",
  "Health & Beauty",
  "Babies & Toys",
  "Groceries & Pets",
  "Home & Lifestyle",
  "Women's Fashion",
  "Men's Fashion",
  "Watches & Accessories",
  "Sports & Outdoor",
  "Automotive & Motorbike",
] as const;

export function M3({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

export function StoreM3Layout() {
  const { cartCount, session } = useShop();
  const config = usePublishedConfig();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const brand = config.branding.companyName;
  const word = brand.split(/\s+/)[0] || brand;
  useEffect(() => {
    document.title = `${word} Nepal - Online Shopping`;
  }, [word]);

  return (
    <div className="m3 min-h-screen bg-background font-body-md text-body-md text-on-surface">
      <header className="fixed top-0 left-0 w-full z-50 bg-surface shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-36">
          {/* Utility bar */}
          <div className="bg-surface-container-low">
            <div className="max-w-[1200px] mx-auto px-margin-desktop h-7 flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
              <div className="flex items-center gap-space-lg">
                {config.app.appStoreUrl && (
                  <a
                    className="hover:text-primary transition-colors uppercase"
                    href={safeStoreLink(config.app.appStoreUrl) ?? "#"}
                  >
                    SAVE MORE ON APP
                  </a>
                )}
                <Link className="hover:text-primary transition-colors uppercase" to="/sell">
                  BECOME A SELLER
                </Link>
                <Link className="hover:text-primary transition-colors uppercase" to="/help">
                  HELP &amp; SUPPORT
                </Link>
              </div>
              <div className="flex items-center gap-space-lg">
                <Link
                  className="hover:text-primary transition-colors uppercase font-label-sm text-label-sm"
                  to={session ? "/account" : "/auth"}
                >
                  {session ? "MY ACCOUNT" : "SIGN UP / LOG IN"}
                </Link>
                <Link
                  className="hover:text-primary transition-colors font-label-sm text-label-sm"
                  to="/help"
                >
                  भाषा परिवर्तन
                </Link>
              </div>
            </div>
          </div>
          {/* Main bar */}
          <div className="bg-surface">
            <div className="max-w-[1200px] mx-auto px-margin-desktop h-20 flex items-center justify-between gap-space-lg">
              <Link className="flex items-center gap-space-xs shrink-0 select-none group" to="/">
                <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-on-primary font-headline-lg text-headline-lg">
                    {word.slice(0, 1).toLowerCase()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-headline-lg text-headline-lg tracking-tight text-primary leading-none">
                    {word.toLowerCase()}
                  </span>
                  <span className="font-badge-micro text-badge-micro tracking-widest uppercase text-tertiary font-bold">
                    Nepal
                  </span>
                </div>
              </Link>
              <div className="flex-1 max-w-2xl">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (term.trim())
                      navigate(`/search?q=${encodeURIComponent(term.trim())}`);
                  }}
                  className="flex items-center bg-surface-container-lowest rounded-lg overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
                >
                  <input
                    className="w-full px-space-md py-space-sm bg-transparent outline-none font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant"
                    placeholder={config.header.searchPlaceholder || "Search in Daraz"}
                    type="text"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                  />
                  <button
                    aria-label="Search"
                    className="bg-primary hover:bg-primary-container px-space-lg py-space-sm flex items-center justify-center transition-colors shrink-0"
                    type="submit"
                  >
                    <M3 className="text-on-primary text-[20px]">search</M3>
                  </button>
                </form>
              </div>
              <div className="flex items-center gap-space-lg shrink-0">
                <Link
                  aria-label="Shopping Cart"
                  className="relative p-space-xs text-on-surface hover:text-primary transition-colors"
                  to="/cart"
                >
                  <M3 className="text-[28px]">shopping_cart</M3>
                  <span className="absolute -top-1 -right-1 bg-primary text-on-primary font-badge-micro text-badge-micro px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {cartCount}
                  </span>
                </Link>
                <Link
                  aria-label="Account"
                  className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
                  to={session ? "/account" : "/auth"}
                >
                  <M3 className="text-on-primary text-[18px]">person</M3>
                </Link>
              </div>
            </div>
          </div>
          {/* Category nav */}
          <div className="bg-surface-container-lowest shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
            <div className="max-w-[1200px] mx-auto px-margin-desktop">
              <nav className="flex items-center gap-space-lg overflow-x-auto whitespace-nowrap py-space-xs">
                {CATEGORIES.map((c) => (
                  <NavLink
                    key={c}
                    className={({ isActive }) =>
                      `transition-colors py-1 font-label-md text-label-md ${
                        isActive
                          ? "text-primary font-bold"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`
                    }
                    to={`/search?q=${encodeURIComponent(c)}`}
                  >
                    {c}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </header>
      <main className="w-full pt-36 bg-background min-h-screen">
        <Outlet />
      </main>
      <footer className="w-full bg-surface-container-low mt-space-xl">
        <div className="bg-surface-container py-space-md">
          <div className="max-w-[1200px] mx-auto px-margin-desktop flex flex-wrap items-center justify-between gap-space-md font-label-md text-label-md">
            <div className="flex items-center gap-space-md text-primary font-bold">
              <M3 className="text-[22px]">local_shipping</M3>
              <span>Free &amp; Fast Shipping Across 77 Districts</span>
            </div>
            <div className="flex items-center gap-space-md text-on-surface">
              <M3 className="text-[22px] text-tertiary">verified</M3>
              <span>100% Authentic Products</span>
            </div>
            <div className="flex items-center gap-space-md text-on-surface">
              <M3 className="text-[22px] text-primary">currency_exchange</M3>
              <span>Cash On Delivery &amp; Easy Returns</span>
            </div>
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto px-margin-desktop py-space-xl grid grid-cols-1 md:grid-cols-4 gap-space-xl">
          <div className="flex flex-col gap-space-sm">
            <span className="font-headline-sm text-headline-sm text-on-surface uppercase">
              Customer Care
            </span>
            {[
              ["Help Center", "/help"],
              ["How to Buy", "/help"],
              ["Returns & Refunds", "/help"],
              ["Contact Us", "/help"],
            ].map(([label, to]) => (
              <Link
                key={label}
                className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors"
                to={to}
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-space-sm">
            <span className="font-headline-sm text-headline-sm text-on-surface uppercase">
              {word}
            </span>
            {[
              [`About ${word}`, "/help"],
              ["Careers", "/help"],
              [`${word} University`, "/sell"],
              [`Sell on ${word}`, "/sell"],
              ["Terms & Conditions", "/account"],
            ].map(([label, to]) => (
              <Link
                key={label}
                className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors"
                to={to}
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-space-md">
            <span className="font-headline-sm text-headline-sm text-on-surface uppercase">
              Download App
            </span>
            <div className="flex items-center gap-space-md bg-surface-container-lowest p-space-sm rounded-lg">
              <div className="w-16 h-16 bg-surface-container flex items-center justify-center rounded">
                <M3 className="text-[36px] text-on-surface-variant">qr_code_2</M3>
              </div>
              <div className="flex flex-col justify-center font-label-sm text-label-sm text-on-surface-variant">
                <span>Scan QR Code</span>
                <span>To Download App</span>
              </div>
            </div>
            {config.footer.showAppLinks && (
              <div className="flex flex-col gap-space-xs">
                {config.app.appStoreUrl && (
                  <a
                    className="px-space-md py-space-xs bg-surface-container-lowest rounded text-center font-label-sm text-label-sm text-on-surface"
                    href={safeStoreLink(config.app.appStoreUrl) ?? "#"}
                  >
                    App Store
                  </a>
                )}
                {config.app.playStoreUrl && (
                  <a
                    className="px-space-md py-space-xs bg-surface-container-lowest rounded text-center font-label-sm text-label-sm text-on-surface"
                    href={safeStoreLink(config.app.playStoreUrl) ?? "#"}
                  >
                    Google Play
                  </a>
                )}
                <div className="px-space-md py-space-xs bg-surface-container-lowest rounded text-center font-label-sm text-label-sm text-on-surface">
                  AppGallery
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-space-md">
            <span className="font-headline-sm text-headline-sm text-on-surface uppercase">
              Payment Methods
            </span>
            <div className="flex flex-wrap gap-space-xs">
              {[
                ["Visa", "text-on-surface font-semibold"],
                ["Mastercard", "text-on-surface font-semibold"],
                ["eSewa", "text-primary font-bold"],
                ["Khalti", "text-tertiary font-bold"],
                ["COD", "text-secondary font-semibold"],
              ].map(([chip, cls]) => (
                <span
                  key={chip}
                  className={`px-2 py-1 bg-surface-container-lowest rounded font-label-sm text-label-sm ${cls}`}
                >
                  {chip}
                </span>
              ))}
            </div>
            <div className="pt-space-sm flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm">
              <M3 className="text-[20px] text-tertiary">verified_user</M3>
              <span>PCI-DSS Compliant Secure Checkout</span>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-high py-space-md">
          <div className="max-w-[1200px] mx-auto px-margin-desktop flex flex-col md:flex-row items-center justify-between gap-space-md text-on-surface-variant font-label-sm text-label-sm">
            <div className="flex items-center gap-space-md flex-wrap">
              <span>{word} International:</span>
              <a className="hover:text-primary transition-colors" href="#">
                Pakistan
              </a>
              <a className="hover:text-primary transition-colors" href="#">
                Bangladesh
              </a>
              <a className="hover:text-primary transition-colors" href="#">
                Sri Lanka
              </a>
              <a className="hover:text-primary transition-colors" href="#">
                Myanmar
              </a>
              <span className="text-primary font-bold">Nepal</span>
            </div>
            <div className="text-right">
              {config.footer.copyright
                .replace("{year}", String(new Date().getFullYear()))
                .replace("{company}", brand)}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
