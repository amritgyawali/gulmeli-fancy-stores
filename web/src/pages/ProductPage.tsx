import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { ProductVisual } from "@/components/ProductCard";
import { bundledImage } from "@/lib/images";
import { rs } from "@/lib/format";
import type { Product } from "@/lib/types";

/*
 * Product details ported from ../web ui ux design/daraz_nepal_product_details_page_1
 * (and _2): breadcrumb rail, 4/5/3-column grid (gallery card with thumbnails,
 * share & wishlist row, buy panel with Mall badge, rating meta, flash-sale
 * banner, price block, vouchers, qty + stock urgency, Buy Now / Add to Cart
 * CTAs, right rail with Delivery Options / Return & Warranty / seller card),
 * tabbed details (Key Highlights bento, Technical Specifications, Ratings &
 * Customer Reviews with bar breakdown, Q&A), and the
 * "People Who Viewed This Also Bought" rail.
 */

function useCountdown() {
  const [left, setLeft] = useState(() => msToEod());
  useEffect(() => {
    const t = setInterval(() => setLeft(msToEod()), 1000);
    return () => clearInterval(t);
  }, []);
  const total = Math.max(0, left);
  const h = String(Math.floor(total / 3_600_000)).padStart(2, "0");
  const m = String(Math.floor((total % 3_600_000) / 60_000)).padStart(2, "0");
  const s = String(Math.floor((total % 60_000) / 1000)).padStart(2, "0");
  return [h, m, s];
}
function msToEod() {
  const now = new Date();
  return (
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime() -
    now.getTime()
  );
}

function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const px = size === "lg" ? "text-[22px]" : size === "md" ? "text-[16px]" : "text-[13px]";
  const full = Math.floor(value);
  const half = value - full >= 0.25 && value - full <= 0.75;
  return (
    <span className={`flex items-center text-[#facc15] ${px}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <i
          key={i}
          className={
            i < full
              ? "fa-solid fa-star"
              : i === full && half
                ? "fa-solid fa-star-half-stroke"
                : "fa-regular fa-star"
          }
        />
      ))}
    </span>
  );
}

const TABS = ["Product Details", "Specifications", "Ratings & Reviews", "Q&A"] as const;
type Tab = (typeof TABS)[number];

function InfoRow({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-xs text-on-surface-variant">
      <i className={`fa-solid ${icon} mt-0.5 shrink-0 text-tertiary`} />
      <span>{children}</span>
    </div>
  );
}

export function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    productById,
    catalogReady,
    add,
    cart,
    commerce,
    updateCommerce,
    session,
    products,
  } = useShop();
  const product = id ? productById[id] : undefined;
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<Tab>("Product Details");
  const [notice, setNotice] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [hh, mm, ss] = useCountdown();
  useEffect(() => {
    setQty(1);
    setNotice("");
    setActiveImage(0);
  }, [id]);

  const cartItem = product ? cart.find((i) => i.productId === product.id) : undefined;
  const wished = Boolean(product && commerce.wishlist.includes(product.id));
  const gallery = useMemo(() => {
    if (!product) return [] as string[];
    const own = [
      ...(product.images ?? []),
      ...(product.imageUrl ? [product.imageUrl] : []),
    ];
    const main = bundledImage(product);
    return [...new Set([main, ...own].filter((x): x is string => Boolean(x)))]
      .slice(0, 5);
  }, [product]);
  const rating = useMemo(() => {
    if (!product) return 0;
    const parsed = Number.parseFloat(product.rating ?? "");
    return Number.isFinite(parsed) ? parsed : 4.5;
  }, [product]);
  const reviewCount = useMemo(() => {
    if (!product) return 0;
    if (product.sold != null) return product.sold;
    return Math.max(0, Math.round((rating || 0) * 40));
  }, [product, rating]);
  const distribution = useMemo(() => {
    // Deterministic star split weighted toward the product's own rating.
    const p5 = Math.min(95, Math.round(rating * 17));
    const p4 = Math.round((100 - p5) * 0.6);
    const p3 = Math.round((100 - p5 - p4) * 0.5);
    const p2 = Math.round((100 - p5 - p4 - p3) * 0.5);
    const p1 = 100 - p5 - p4 - p3 - p2;
    return [p5, p4, p3, p2, p1];
  }, [rating]);
  const myReviews = useMemo(
    () => (product ? commerce.reviews.filter((r) => r.productId === product.id) : []),
    [commerce.reviews, product],
  );
  const related = useMemo(
    () =>
      products
        .filter(
          (p) =>
            p.id !== product?.id &&
            p.category === product?.category &&
            p.stock > 0,
        )
        .slice(0, 5),
    [products, product],
  );

  if (!catalogReady)
    return <div className="h-[540px] w-full animate-pulse rounded-lg bg-slate-200" />;
  if (!product)
    return (
      <div className="rounded-lg bg-white p-16 text-center shadow-sm">
        <p className="text-3xl">🫥</p>
        <p className="mt-3 text-lg font-bold text-on-surface">
          This product is no longer available.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block rounded bg-[#f85606] px-6 py-3 text-sm font-bold text-white"
        >
          Back to shop
        </Link>
      </div>
    );

  const out = product.stock < 1;
  const discountPct =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;
  const addToCart = () => {
    for (let i = 0; i < qty; i += 1) add(product);
    setNotice(`Added ${qty} item${qty > 1 ? "s" : ""} to your cart.`);
    setTimeout(() => setNotice(""), 2500);
  };
  const buyNow = () => {
    for (let i = 0; i < qty; i += 1) add(product);
    navigate("/cart");
  };
  const toggleWish = () =>
    updateCommerce((current) => ({
      ...current,
      wishlist: current.wishlist.includes(product.id)
        ? current.wishlist.filter((x) => x !== product.id)
        : [...current.wishlist, product.id],
    }));

  return (
    <div className="pb-2 text-on-surface">
      {/* Breadcrumbs */}
      <nav className="mb-3 flex items-center gap-1 overflow-x-auto whitespace-nowrap text-xs text-on-surface-variant">
        <Link to="/" className="hover:text-[#f85606]">
          Home
        </Link>
        <i className="fa-solid fa-chevron-right px-1 text-[10px]" />
        <Link
          to={`/search?q=${encodeURIComponent(product.category)}`}
          className="hover:text-[#f85606]"
        >
          {product.category}
        </Link>
        <i className="fa-solid fa-chevron-right px-1 text-[10px]" />
        <span className="max-w-[280px] truncate font-medium text-on-surface">
          {product.name}
        </span>
      </nav>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
        {/* COLUMN 1: Gallery */}
        <div className="flex flex-col gap-3 rounded bg-white p-3 shadow-sm lg:col-span-4">
          <div className="group relative aspect-square w-full cursor-crosshair overflow-hidden rounded bg-surface-container-low">
            {activeImage < gallery.length ? (
              <img
                src={gallery[activeImage]}
                alt={`${product.name} — view ${activeImage + 1}`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <ProductVisual product={product} fit="contain" />
            )}
            <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-white/80 px-2 py-1 text-[11px] font-semibold text-on-surface-variant backdrop-blur">
              <i className="fa-solid fa-magnifying-glass-plus" /> Hover to zoom
            </span>
            {product.badge && (
              <span className="absolute left-2 top-2 rounded bg-[#f85606] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                {product.badge}
              </span>
            )}
          </div>
          {/* Thumbnails */}
          {gallery.length > 1 && (
            <div className="grid grid-cols-5 gap-1">
              {gallery.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`aspect-square overflow-hidden rounded p-0.5 transition-all ${
                    activeImage === i
                      ? "bg-[#f85606]/10 shadow-sm ring-2 ring-[#f85606]"
                      : "opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full rounded object-cover" />
                </button>
              ))}
            </div>
          )}
          {/* Share & wishlist row */}
          <div className="flex items-center justify-between pt-1 text-xs text-on-surface-variant">
            <div className="flex items-center gap-2">
              <span className="text-xs">Share:</span>
              {["fa-solid fa-link", "fa-brands fa-whatsapp", "fa-solid fa-share-nodes"].map(
                (ic) => (
                  <button
                    key={ic}
                    type="button"
                    aria-label="Share"
                    className="grid h-7 w-7 place-items-center rounded-full bg-surface-container hover:text-[#f85606]"
                  >
                    <i className={`${ic} text-[13px]`} />
                  </button>
                ),
              )}
            </div>
            <button
              type="button"
              onClick={toggleWish}
              className="flex items-center gap-1.5 rounded bg-surface-container px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
            >
              <i
                className={`fa-${wished ? "solid" : "regular"} fa-heart text-sm ${
                  wished ? "text-[#f85606]" : "text-[#f85606]/70"
                }`}
              />
              {wished ? "Wishlisted" : `${products.length > 99 ? "1.2k" : "Add to"} favorites`}
            </button>
          </div>
        </div>

        {/* COLUMN 2: Buy panel */}
        <div className="flex flex-col gap-2 rounded bg-white p-3 shadow-sm lg:col-span-5">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              {product.store && (
                <span className="inline-flex items-center gap-1 rounded bg-[#ba1a1a] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  <i className="fa-solid fa-badge-check text-[10px]" /> Mall Verified Seller
                </span>
              )}
              <span className="text-[11px] font-semibold text-tertiary">
                100% Authentic Brand Guarantee
              </span>
            </div>
            <h1 className="font-headline-md text-headline-md leading-tight">{product.name}</h1>
          </div>
          {/* Rating & brand meta */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-1 text-[11px] font-semibold text-on-surface-variant">
            <span className="flex items-center gap-1">
              <Stars value={rating} size="md" />
              <span className="font-bold text-on-surface">{rating.toFixed(1)}</span>
              <a href="#reviews-tab" className="text-tertiary hover:underline">
                ({reviewCount.toLocaleString()} Ratings)
              </a>
            </span>
            <span className="text-surface-container-highest">|</span>
            {product.sold != null && (
              <span>{product.sold.toLocaleString()} Sold</span>
            )}
            <span>Brand:{" "}
              <Link
                to={`/search?q=${encodeURIComponent(product.brand ?? product.category)}`}
                className="font-medium text-tertiary hover:underline"
              >
                {product.brand ?? product.category}
              </Link>
            </span>
          </div>
          {/* Flash Sale promo banner */}
          {discountPct != null && (
            <div className="flex items-center justify-between rounded bg-gradient-to-r from-[#aa3700] via-[#cf4500] to-[#f57224] p-2 text-white shadow-sm">
              <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-tight">
                <i className="fa-solid fa-bolt animate-pulse" /> Mega Sale
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-bold">
                <span className="opacity-90">Ends in</span>
                {[`${hh}h`, `${mm}m`, `${ss}s`].map((c) => (
                  <span key={c} className="rounded bg-black/30 px-1.5 py-0.5 font-mono">
                    {c}
                  </span>
                ))}
              </span>
            </div>
          )}
          {/* Price block */}
          <div className="flex flex-col gap-1.5 rounded bg-surface-container-low p-4">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-price-hero text-price-hero leading-none tracking-tight text-[#f85606]">
                {rs(product.price)}
              </span>
              {product.originalPrice != null && product.originalPrice > product.price && (
                <>
                  <span className="font-price-strikethrough text-price-strikethrough line-through text-on-surface-variant">
                    {rs(product.originalPrice)}
                  </span>
                  <span className="rounded bg-[#f85606] px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white">
                    -{discountPct}% OFF
                  </span>
                </>
              )}
            </div>
            <p className="text-[11px] text-on-surface-variant">Inclusive of all taxes</p>
            {!!product.gems && (
              <div className="flex items-center gap-1 pt-1 text-[11px] font-semibold text-secondary">
                <i className="fa-solid fa-coins text-sm text-[#fccc19]" />
                <span>Earn {product.gems} coins on this purchase</span>
              </div>
            )}
          </div>
          {/* Vouchers */}
          {product.voucher && (
            <div className="flex flex-col gap-2 pt-1">
              <span className="flex items-center gap-1 text-[13px] font-bold">
                <i className="fa-solid fa-tag text-sm text-[#f85606]" /> Promotions &amp; Store
                Vouchers
              </span>
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center gap-2 rounded bg-[#fff5f1] px-3 py-1.5 text-[11px] font-semibold text-[#f85606] shadow-sm">
                  <span>Min. spend Rs. 2,500 capped at Rs. 250</span>
                  <span className="rounded bg-[#f85606] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    Collect
                  </span>
                </span>
                <span className="flex items-center gap-2 rounded bg-[#fff5f1] px-3 py-1.5 text-[11px] font-semibold text-[#f85606] shadow-sm">
                  <span>Free delivery over Rs. 2,000</span>
                  <span className="rounded bg-[#f85606] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    Collect
                  </span>
                </span>
              </div>
            </div>
          )}
          {/* Quantity selector & stock urgency */}
          <div className="flex items-center gap-4 pt-2">
            <span className="shrink-0 text-[13px] text-on-surface-variant">Quantity:</span>
            <div className="flex items-center rounded bg-surface-container">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={out || qty <= 1}
                className="grid h-8 w-8 place-items-center hover:bg-surface-container-highest disabled:opacity-30"
              >
                <i className="fa-solid fa-minus text-xs" />
              </button>
              <span className="h-8 w-12 border-x border-surface-container-high text-center text-[13px] font-bold leading-8">
                {qty}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                disabled={out || qty >= product.stock}
                className="grid h-8 w-8 place-items-center hover:bg-surface-container-highest disabled:opacity-30"
              >
                <i className="fa-solid fa-plus text-xs" />
              </button>
            </div>
            {!out && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-[#aa3700]">
                <i className="fa-solid fa-hourglass-half text-[10px]" />
                {product.stock <= 15
                  ? `Only ${product.stock} items left in stock — order soon!`
                  : `${Math.max(0, product.stock - (cartItem?.quantity ?? 0))} available`}
              </span>
            )}
            {out && (
              <span className="text-[11px] font-semibold text-error">
                Currently out of stock
              </span>
            )}
          </div>
          {/* Action CTAs */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              disabled={out}
              onClick={buyNow}
              className="flex h-11 items-center justify-center gap-2 rounded bg-[#f85606] font-headline-sm text-headline-sm uppercase tracking-wide text-white shadow transition-all hover:bg-[#d94500] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <i className="fa-solid fa-bolt" /> Buy Now
            </button>
            <button
              type="button"
              disabled={out}
              onClick={addToCart}
              className="flex h-11 items-center justify-center gap-2 rounded bg-[#ffeee8] font-headline-sm text-headline-sm uppercase tracking-wide text-[#f85606] shadow-sm transition-all hover:bg-[#fde2d7] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              <i className="fa-solid fa-cart-plus" /> Add to Cart
            </button>
          </div>
          <div className="flex items-center justify-between px-1 pt-1 text-xs text-on-surface-variant">
            <span className="flex items-center gap-1">
              <i className="fa-solid fa-lock text-tertiary" /> Safe &amp; Encrypted Payments
            </span>
            <span className="flex items-center gap-1">
              <i className="fa-solid fa-circle-check text-tertiary" /> 100% Genuine Guarantee
            </span>
          </div>
          {notice && (
            <p className="flex items-center gap-2 rounded bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
              <i className="fa-solid fa-check" /> {notice}
              <Link to="/cart" className="ml-auto underline">
                Go to cart →
              </Link>
            </p>
          )}
          {!session && !out && (
            <p className="pt-1 text-xs text-on-surface-variant">
              <Link to="/auth" className="font-bold text-[#f85606]">
                Sign in
              </Link>{" "}
              to keep your cart, wishlist and orders in sync with the mobile app.
            </p>
          )}
        </div>

        {/* COLUMN 3: Delivery, warranty & seller */}
        <div className="flex flex-col gap-3 lg:col-span-3">
          <div className="flex flex-col gap-2 rounded bg-white p-3 shadow-sm">
            <span className="flex items-center justify-between pb-1 text-[13px] font-bold uppercase">
              Delivery Options <i className="fa-solid fa-circle-info text-sm text-on-surface-variant" />
            </span>
            <div className="flex items-start justify-between gap-1.5 rounded bg-surface-container-low p-2">
              <div className="flex items-start gap-1.5">
                <i className="fa-solid fa-location-dot mt-0.5 text-sm text-[#f85606]" />
                <span className="flex flex-col">
                  <span className="text-[13px] font-semibold">Bagmati, Kathmandu</span>
                  <span className="text-xs text-on-surface-variant">
                    Inside Ring Road, Kathmandu
                  </span>
                </span>
              </div>
              <Link to="/checkout" className="shrink-0 text-[11px] font-bold uppercase text-tertiary hover:text-[#006578]">
                Change
              </Link>
            </div>
            <div className="flex flex-col gap-2.5 pt-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <i className="fa-solid fa-truck mt-0.5 shrink-0 text-on-surface-variant" />
                  <span className="flex flex-col">
                    <span className="text-[13px] font-semibold">Standard Delivery</span>
                    <span className="text-xs text-on-surface-variant">
                      Est. delivery: 2–4 days
                    </span>
                  </span>
                </div>
                <span className="shrink-0 text-[13px] font-bold">Rs. 50</span>
              </div>
              {product.fastDelivery && (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <i className="fa-solid fa-rocket mt-0.5 shrink-0 text-[#f85606]" />
                    <span className="flex flex-col">
                      <span className="text-[13px] font-semibold">Express Delivery</span>
                      <span className="text-xs text-on-surface-variant">
                        Guaranteed next-day delivery
                      </span>
                    </span>
                  </div>
                  <span className="shrink-0 text-[13px] font-bold">Rs. 100</span>
                </div>
              )}
              <div className="flex items-center gap-2 pt-1 text-xs">
                <i className="fa-solid fa-money-bill-wave text-tertiary" />
                <span>Cash on Delivery Available</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded bg-surface-container-low/60 p-2 pt-1">
              <span className="text-[11px] font-bold uppercase">Return &amp; Warranty</span>
              <InfoRow icon="fa-rotate-left">
                14 Days Free Return{" "}
                <span className="block text-[11px] opacity-80">
                  (Change of mind not applicable)
                </span>
              </InfoRow>
              <InfoRow icon="fa-shield-halved">
                Brand warranty where applicable{" "}
                <span className="block text-[11px] opacity-80">
                  (Authorized service across 77 districts)
                </span>
              </InfoRow>
            </div>
          </div>
          {/* Seller profile card */}
          <div className="flex flex-col gap-2 rounded bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-on-surface-variant">Sold by</span>
              <span className="rounded bg-[#ba1a1a] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                Official Store
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-surface-container-high font-headline-md text-headline-md text-[#aa3700] shadow-inner">
                {(product.store ?? "Gulmeli").trim().charAt(0).toUpperCase()}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-headline-sm text-headline-sm font-semibold">
                  {product.store ?? "Gulmeli Fancy Stores"}
                </span>
                <span className="flex items-center gap-0.5 text-xs text-tertiary">
                  <i className="fa-solid fa-circle-check text-[10px]" /> Verified Merchant
                </span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded bg-surface-container-low py-1 text-center">
              {[
                ["Positive Rating", "94%"],
                ["Ship on Time", "98%"],
                ["Chat Rate", "96%"],
              ].map(([k, v]) => (
                <span key={k} className="flex flex-col p-1">
                  <span className="text-xs text-on-surface-variant">{k}</span>
                  <span className="font-headline-sm text-headline-sm font-bold">{v}</span>
                </span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                to={`/search?q=${encodeURIComponent(product.store ?? product.brand ?? product.category)}`}
                className="flex items-center justify-center gap-1 rounded bg-surface-container py-1.5 text-[11px] font-bold uppercase text-tertiary hover:bg-surface-container-high"
              >
                <i className="fa-solid fa-store" /> Visit Store
              </Link>
              <Link
                to="/help"
                className="flex items-center justify-center gap-1 rounded bg-surface-container py-1.5 text-[11px] font-bold uppercase text-tertiary hover:bg-surface-container-high"
              >
                <i className="fa-regular fa-comment" /> Chat Now
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: tabs */}
      <div className="mt-6 overflow-hidden rounded bg-white shadow-sm" id="reviews-tab">
        <div className="flex items-center overflow-x-auto whitespace-nowrap border-b border-surface-container bg-surface-container-low">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-[13px] uppercase tracking-wider transition-all ${
                tab === t
                  ? "border-[#f85606] bg-white font-bold text-[#aa3700]"
                  : "border-transparent font-medium text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t}
              {t === "Ratings & Reviews" && (
                <span className="rounded bg-surface-container px-1.5 text-[10px] font-bold">
                  {reviewCount.toLocaleString()}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "Product Details" && (
          <div className="flex flex-col gap-6 p-4">
            <div>
              <h2 className="font-headline-md text-headline-md mb-2 font-bold">Key Highlights</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {[
                  {
                    icon: "fa-solid fa-circle-check",
                    title: product.name,
                    note: `Genuine ${product.brand ?? ""} product sourced from verified distributors in Nepal.`.trim(),
                  },
                  {
                    icon: "fa-solid fa-tag",
                    title:
                      discountPct != null
                        ? `${discountPct}% off — ${rs(product.originalPrice ?? product.price)} → ${rs(product.price)}`
                        : "Best market price",
                    note: "Price includes all taxes; compare before you buy.",
                  },
                  {
                    icon: "fa-solid fa-truck-fast",
                    title: product.fastDelivery ? "Fast Delivery eligible" : "Delivery across all 77 districts",
                    note: "Daraz Express & courier partners reach every hub; cash on delivery available.",
                  },
                  {
                    icon: "fa-solid fa-ticket",
                    title: product.voucher ? "Voucher eligible" : "Bundle & save deals",
                    note: product.voucher
                      ? "Apply store vouchers at checkout for extra savings."
                      : "Check the Flash Sale rail for seasonal offers.",
                  },
                  ...(product.gems
                    ? [
                        {
                          icon: "fa-solid fa-coins",
                          title: `Earn ${product.gems} coins on purchase`,
                          note: "Coins convert to discounts on future orders.",
                        },
                      ]
                    : []),
                  {
                    icon: "fa-solid fa-box-open",
                    title: "In stock and ready to ship",
                    note: out
                      ? "Restock in progress — wishlist to get notified."
                      : `${product.stock} units available; dispatch within 24 hours.`,
                  },
                ].map((h) => (
                  <div
                    key={h.title}
                    className="flex items-start gap-2 rounded bg-surface-container-low p-2"
                  >
                    <i className={`${h.icon} mt-1 shrink-0 text-[#aa3700]`} />
                    <span className="flex flex-col">
                      <span className="font-headline-sm text-headline-sm">{h.title}</span>
                      <span className="text-[13px] text-on-surface-variant">{h.note}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                ["Delivery across Nepal", "fa-truck-fast"],
                ["Cash on delivery", "fa-money-bill-wave"],
                ["Easy returns", "fa-rotate-left"],
              ].map(([label, icon]) => (
                <div
                  key={label}
                  className="relative flex h-24 items-end overflow-hidden rounded bg-surface-container"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <span className="flex items-center gap-2 p-3 text-sm font-semibold text-white">
                    <i className={`fa-solid ${icon}`} /> {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "Specifications" && (
          <div className="p-4">
            <h2 className="font-headline-md text-headline-md mb-4 font-bold">Technical Specifications</h2>
            <div className="overflow-hidden rounded">
              {(
                [
                  ["Product ID", product.id.toUpperCase()],
                  ["Brand", product.brand ?? "—"],
                  ["Category", product.category],
                  ["Store", product.store ?? "Gulmeli Fancy Stores"],
                  ["Availability", out ? "Out of stock" : `In stock (${product.stock})`],
                  ["Price", rs(product.price)],
                  [
                    "Rating",
                    `${rating.toFixed(1)} of 5${reviewCount ? ` (${reviewCount.toLocaleString()} ratings)` : ""}`,
                  ],
                  ...(product.badge ? [["Highlight", product.badge] as const] : []),
                ] as const
              ).map(([k, v], i) => (
                <div
                  key={k}
                  className={`grid grid-cols-1 gap-1 p-2 md:grid-cols-3 ${
                    i % 2 === 0 ? "bg-white" : "bg-surface-container-low"
                  }`}
                >
                  <span className="text-[13px] font-bold text-on-surface-variant">{k}</span>
                  <span className="text-[13px] md:col-span-2">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "Ratings & Reviews" && (
          <div className="flex flex-col gap-6 p-4">
            <h2 className="font-headline-md text-headline-md font-bold">Ratings &amp; Customer Reviews</h2>
            <div className="grid grid-cols-1 items-center gap-6 rounded bg-surface-container-low p-4 md:grid-cols-12">
              <div className="flex flex-col items-center justify-center text-center md:col-span-4">
                <span className="font-headline-xl text-headline-xl leading-none font-bold">
                  {rating.toFixed(1)}
                </span>
                <span className="my-1">
                  <Stars value={rating} size="lg" />
                </span>
                <span className="text-xs text-on-surface-variant">
                  {reviewCount.toLocaleString()} Verified Customer Ratings
                </span>
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-8">
                {distribution.map((pct, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] font-semibold">
                    <span className="w-12 text-on-surface-variant">
                      {5 - i} {i === 4 ? "Star" : "Stars"}
                    </span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-container">
                      <span
                        className="block h-full rounded-full bg-[#f85606]"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="w-10 text-right text-on-surface-variant">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {myReviews.length ? (
                myReviews.map((r, i) => (
                  <div key={i} className="flex flex-col gap-2 rounded bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#aa3700]/20 text-[11px] font-bold text-[#aa3700]">
                          {(commerce.profile.name || "Yo").slice(0, 2).toUpperCase()}
                        </span>
                        <span className="flex flex-col">
                          <span className="flex items-center gap-1.5">
                            <span className="font-headline-sm text-headline-sm">{commerce.profile.name || "You"}</span>
                            <span className="flex items-center gap-0.5 rounded bg-[#e8f5e9] px-1.5 py-0.5 text-[10px] font-bold text-[#2e7d32]">
                              <i className="fa-solid fa-badge-check text-[10px]" /> Your Review
                            </span>
                          </span>
                        </span>
                      </span>
                      <Stars value={r.rating} size="md" />
                    </div>
                    <p className="text-[13px]">{r.text}</p>
                  </div>
                ))
              ) : (
                <div className="rounded bg-surface-container-low p-6 text-center">
                  <p className="text-sm font-semibold text-on-surface">
                    {reviewCount > 0
                      ? `Most buyers rate this ${rating.toFixed(1)}★ — write yours to help the community.`
                      : "No written reviews yet."}
                  </p>
                  {!session ? (
                    <Link
                      to="/auth"
                      className="mt-3 inline-block rounded bg-[#f85606] px-4 py-2 text-[11px] font-bold uppercase text-white"
                    >
                      Sign in to write a review
                    </Link>
                  ) : (
                    <p className="mt-2 text-xs text-on-surface-variant">
                      Reviews can be posted from your account.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "Q&A" && (
          <div className="p-4">
            <h2 className="font-headline-md text-headline-md mb-3 font-bold">Questions About This Product</h2>
            <div className="relative mb-3 w-full">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-on-surface-variant" />
              <input
                type="text"
                placeholder="Search in Q&A"
                className="w-full rounded bg-surface-container py-2.5 pl-10 pr-4 text-[13px] outline-none placeholder:text-on-surface-variant"
              />
            </div>
            <div className="rounded bg-surface-container-low p-6 text-center text-sm text-on-surface-variant">
              No questions yet — be the first to ask about {product.name}.
            </div>
          </div>
        )}
      </div>

      {/* SECTION: People who viewed this also bought */}
      {related.length > 0 && (
        <div className="mt-6 w-full">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="h-6 w-1.5 rounded-full bg-[#aa3700]" />
              <h2 className="font-headline-md text-headline-md font-bold">
                People Who Viewed This Also Bought
              </h2>
            </span>
            <Link
              to={`/search?q=${encodeURIComponent(product.category)}`}
              className="flex items-center gap-0.5 text-[13px] font-bold uppercase text-[#aa3700] hover:underline"
            >
              View More <i className="fa-solid fa-chevron-right text-[10px]" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {related.map((p: Product) => (
              <Link
                key={p.id}
                to={`/product/${p.id}`}
                className="group flex flex-col overflow-hidden rounded bg-white shadow-sm transition-all hover:shadow-md"
              >
                <span className="relative aspect-square overflow-hidden bg-surface-container-low">
                  {p.discount && (
                    <span className="absolute left-1.5 top-1.5 z-10 rounded bg-[#f85606] px-1 text-[10px] font-bold text-white">
                      {p.discount}
                    </span>
                  )}
                  <ProductVisual product={p} />
                </span>
                <span className="flex flex-1 flex-col justify-between gap-1 p-2">
                  <span className="line-clamp-2 text-[13px] group-hover:text-[#aa3700]">
                    {p.name}
                  </span>
                  <span className="flex flex-col">
                    <span className="font-price-card text-price-card font-bold text-[#f85606]">
                      {rs(p.price)}
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      {p.originalPrice != null && (
                        <span className="text-[11px] line-through text-on-surface-variant">
                          {rs(p.originalPrice)}
                        </span>
                      )}
                      <Stars value={Number.parseFloat(p.rating ?? "") || 4.5} />
                    </span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
