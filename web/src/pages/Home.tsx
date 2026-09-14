import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { ProductVisual } from "@/components/ProductCard";
import type { Product } from "@/lib/types";

/*
 * Homepage rebuilt from ../web ui ux design/daraz_nepal_homepage_clone/code.html:
 * hero + app-download card (10/2 grid), campaign ribbon, Flash Sale rail with
 * countdown, Categories grid, Just For You 6-column product wall. All sections
 * render the live Supabase catalog; the design's demo tiles became catalog
 * slices. FEEDS tabs keep the previous filtering behaviour.
 */

const FEEDS = ["For You", "Voucher Max", "Hot deals", "Fast Delivery"];

const CATEGORY_TILES = [
  { label: "Fashion", emoji: "👗", q: "Fashion" },
  { label: "Electronics", emoji: "🖥️", q: "Electronics" },
  { label: "Groceries", emoji: "🥫", q: "Groceries" },
  { label: "Lifestyle", emoji: "🧺", q: "Lifestyle" },
  { label: "Jewelry", emoji: "💍", q: "Jewelry" },
  { label: "Health & Beauty", emoji: "🧴", q: "Lifestyle" },
  { label: "Home Living", emoji: "🛋️", q: "Lifestyle" },
  { label: "Daily Deals", emoji: "⚡", q: "" },
];

function useCountdown(initialSeconds = 4 * 3600 + 28 * 60 + 45) {
  const [remaining, setRemaining] = useState(initialSeconds);
  useEffect(() => {
    const timer = setInterval(
      () => setRemaining((s) => (s > 0 ? s - 1 : initialSeconds)),
      1000,
    );
    return () => clearInterval(timer);
  }, [initialSeconds]);
  const parts = [
    Math.floor(remaining / 3600),
    Math.floor(remaining / 60) % 60,
    remaining % 60,
  ].map((n) => `${n}`.padStart(2, "0"));
  return parts;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-lg font-bold text-gray-800">{children}</div>;
}

function FlashCard({ product }: { product: Product }) {
  const pct =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : null;
  return (
    <Link
      to={`/product/${product.id}`}
      className="flash-card flex flex-col justify-between bg-white p-2 transition"
    >
      <div>
        <div className="mb-2 flex aspect-square w-full items-center justify-center overflow-hidden rounded bg-gray-50 p-2">
          <ProductVisual product={product} fit="contain" />
        </div>
        <h3 className="line-clamp-2 mb-1 text-xs leading-snug text-gray-800">
          {product.name}
        </h3>
      </div>
      <div>
        <div className="text-base font-bold text-[#f85606]">
          Rs. {product.price.toLocaleString("en-US")}
        </div>
        {product.originalPrice != null && product.originalPrice > product.price && (
          <div className="text-[11px] text-gray-400">
            <span className="line-through">
              Rs. {product.originalPrice.toLocaleString("en-US")}
            </span>
            {pct != null && (
              <span className="ml-1 font-semibold text-gray-800">-{pct}%</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

function JustForYouCard({ product }: { product: Product }) {
  const pct =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : null;
  const rating = Number.parseFloat(product.rating ?? "0") || 0;
  const stars = Math.round(rating);
  return (
    <Link
      to={`/product/${product.id}`}
      className="daraz-card flex flex-col justify-between rounded-[2px] border border-transparent bg-white p-2 hover:border-gray-200"
    >
      <div>
        <div className="mb-2 aspect-square w-full overflow-hidden bg-gray-50">
          <ProductVisual product={product} fit="contain" />
        </div>
        <h4 className="line-clamp-2 mb-1 text-xs leading-snug text-gray-800">
          {product.name}
        </h4>
      </div>
      <div>
        <div className="text-sm font-bold text-[#f85606]">
          Rs. {product.price.toLocaleString("en-US")}{" "}
          {pct != null && (
            <span className="text-[10px] font-normal text-gray-400">-{pct}%</span>
          )}
        </div>
        <div className="mt-1 flex items-center text-[10px] text-yellow-500">
          {Array.from({ length: 5 }).map((_, i) => (
            <i
              key={i}
              className={
                i < stars ? "fa-solid fa-star" : "fa-regular fa-star"
              }
            />
          ))}
          {product.sold != null && (
            <span className="ml-1 text-gray-400">({product.sold})</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function Home() {
  const {
    homeProducts,
    offerProducts,
    recommendations,
    catalogReady,
    ui,
    setFilter,
    backendError,
    retryBackend,
  } = useShop();
  const [slide, setSlide] = useState(0);
  const [tab, setTab] = useState(ui.homeFeed);
  const [hh, mm, ss] = useCountdown();

  useEffect(() => {
    const timer = setInterval(() => setSlide((s) => (s + 1) % 5), 6000);
    return () => clearInterval(timer);
  }, []);

  const heroCopy = [
    { badge: "UP TO", big: "Rs. 50L OFF" },
    { badge: "ENJOY", big: "FREE DELIVERY" },
    { badge: "EXTRA", big: "70% OFF" },
  ];

  const feed = useMemo(() => {
    const list = [...(tab === "For You" ? homeProducts : recommendations.length ? recommendations : homeProducts)];
    if (tab === "Voucher Max") return list.filter((p) => p.voucher);
    if (tab === "Fast Delivery") return list.filter((p) => p.fastDelivery);
    if (tab === "Hot deals")
      return list.sort(
        (a, b) =>
          Number.parseInt(b.discount ?? "0", 10) -
          Number.parseInt(a.discount ?? "0", 10),
      );
    return list;
  }, [homeProducts, recommendations, tab]);

  const flash = offerProducts.length ? offerProducts : homeProducts;

  if (backendError)
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
        <p className="mb-4 font-semibold text-rose-700">{backendError}</p>
        <button
          onClick={retryBackend}
          className="rounded-lg bg-rose-600 px-6 py-2.5 text-sm font-bold text-white"
        >
          Retry
        </button>
      </div>
    );
  if (!catalogReady)
    return (
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded bg-gray-200" />
        ))}
      </div>
    );

  return (
    <div>
      {/* ===== Hero carousel + app download (10/2 grid) ===== */}
      <section className="mb-4 grid grid-cols-12 gap-3">
        <div className="relative col-span-12 flex min-h-[340px] items-center overflow-hidden rounded-[2px] bg-gradient-to-r from-[#d82a0b] via-[#f85606] to-[#fc8621] p-6 text-white shadow-sm lg:col-span-10">
          <div className="z-10 max-w-[65%]">
            <div className="mb-2 inline-flex items-center gap-2">
              <span className="rounded-full bg-black/30 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                8 SEP (8PM) - 15 SEP
              </span>
            </div>
            <h1 className="mb-1 text-4xl font-black leading-none tracking-tight drop-shadow-md sm:text-5xl">
              9.9 <span className="text-yellow-300">SALE</span>
            </h1>
            <p className="mb-4 text-lg font-bold tracking-wide text-yellow-100">
              BIGGEST SALE OF THE SEASON
            </p>
            <div className="mb-5 flex flex-wrap gap-2">
              {heroCopy.map((h) => (
                <div
                  key={h.big}
                  className="rounded border border-white/30 bg-white/20 px-3 py-1.5 text-center backdrop-blur-md"
                >
                  <span className="block text-xs font-bold uppercase text-yellow-200">
                    {h.badge}
                  </span>
                  <span className="text-sm font-extrabold">{h.big}</span>
                </div>
              ))}
            </div>
            <Link
              to="/offers"
              className="inline-block rounded-full bg-white px-7 py-2.5 text-sm font-black text-[#f85606] shadow-lg transition hover:bg-yellow-50"
            >
              Shop Now
            </Link>
          </div>
          <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center justify-center opacity-95">
            <div className="relative flex h-72 w-72 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-inner">
              <i className="fa-solid fa-bag-shopping text-8xl text-yellow-300/40" />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <span className="text-xs uppercase tracking-widest text-white/90">
                  Exclusive Brands
                </span>
                <span className="text-2xl font-black text-white">MEGA DEALS</span>
                <span className="mt-1 rounded bg-yellow-400 px-2 py-0.5 text-xs font-extrabold text-black">
                  LIMITED STOCK
                </span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 space-x-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full ${
                  i === slide ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Download App side promo card */}
        <div className="col-span-12 flex flex-col items-center justify-between rounded-[2px] border border-gray-200 bg-white p-3.5 text-center shadow-sm lg:col-span-2">
          <div className="w-full">
            <div className="mb-1 flex items-center justify-center gap-1 text-xs font-bold text-[#f85606]">
              <i className="fa-solid fa-mobile-screen-button" />
              <span>Download the App</span>
            </div>
            <p className="mb-2 text-[11px] text-gray-500">
              Free Delivery &amp; Limited Deals
            </p>
            <div className="mx-auto mb-2 flex h-32 w-32 flex-col items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 p-2">
              <i className="fa-solid fa-qrcode text-6xl text-gray-800" />
              <span className="mt-1 font-mono text-[9px] text-gray-500">
                SCAN TO GET APP
              </span>
            </div>
          </div>
          <div className="w-full space-y-1.5 pt-1">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="flex w-full items-center justify-center gap-2 rounded bg-black px-2 py-1.5 text-[10px] text-white hover:bg-gray-800"
            >
              <i className="fa-brands fa-apple text-sm" />
              <span className="text-left leading-tight">
                <span className="block text-[8px] leading-none text-gray-400">
                  Download on
                </span>
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
                <span className="block text-[8px] leading-none text-gray-400">
                  GET IT ON
                </span>
                <span className="font-bold">Google Play</span>
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Secondary promotional ribbon */}
      <Link
        to="/offers"
        className="mb-6 flex w-full cursor-pointer items-center justify-between rounded-[2px] bg-gradient-to-r from-[#d82a0b] via-[#f85606] to-[#f42e12] p-2.5 text-white shadow-sm transition hover:opacity-95"
      >
        <span className="flex items-center space-x-3 pl-4">
          <span className="text-xl font-black italic tracking-wide text-yellow-300">
            9.9 SALE
          </span>
          <span className="text-sm font-bold uppercase tracking-wide sm:text-base">
            9.9 Sale is LIVE NOW
          </span>
        </span>
        <span className="flex items-center pr-3">
          <span className="flex items-center gap-1 rounded bg-yellow-400 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-black shadow hover:bg-yellow-300">
            Shop Now <i className="fa-solid fa-chevron-right text-[10px]" />
          </span>
        </span>
      </Link>

      {/* ===== Flash Sale section ===== */}
      <section className="mb-6">
        <SectionTitle>Flash Sale</SectionTitle>
        <div className="rounded-[2px] border border-gray-100 bg-white p-3 shadow-sm">
          <div className="mb-3 border-b border-gray-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-[#f85606]">
                  On Sale Now
                </span>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span>Ending in</span>
                  <div className="flex items-center gap-1 font-mono font-bold text-white">
                    <span className="rounded-[2px] bg-[#d04402] px-1.5 py-0.5">{hh}</span>:
                    <span className="rounded-[2px] bg-[#d04402] px-1.5 py-0.5">{mm}</span>:
                    <span className="rounded-[2px] bg-[#d04402] px-1.5 py-0.5">{ss}</span>
                  </div>
                </div>
              </div>
              <Link
                to="/offers"
                className="rounded-[2px] border border-[#f85606] px-3.5 py-1.5 text-xs font-semibold uppercase text-[#f85606] transition hover:bg-[#fff6f2]"
              >
                Shop all products
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
            {flash.slice(0, 6).map((p) => (
              <FlashCard key={p.id} product={p} />
            ))}
          </div>
          {/* stock burn bars like the design */}
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
            {flash.slice(0, 6).map((p) => {
              const sold = Math.min(100, Math.round((p.sold ?? 20) % 100));
              return (
                <div key={p.id} className="px-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#f85606] to-[#fc8621]"
                      style={{ width: `${Math.max(12, sold)}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-center text-[9px] text-gray-400">
                    {Math.max(12, sold)}% sold
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Categories section ===== */}
      <section className="mb-6">
        <SectionTitle>Categories</SectionTitle>
        <div className="divide-y divide-gray-100 rounded-[2px] border border-gray-200 bg-white shadow-sm">
          <div className="grid grid-cols-4 divide-x divide-gray-100 sm:grid-cols-8">
            {CATEGORY_TILES.map((c) => (
              <Link
                key={c.label}
                to={c.q ? `/search?q=${encodeURIComponent(c.q)}` : "/offers"}
                className="flex flex-col items-center p-3 text-center transition hover:bg-gray-50"
              >
                <span className="mb-2 flex h-16 w-16 items-center justify-center text-4xl">
                  {c.emoji}
                </span>
                <span className="text-xs leading-tight text-gray-700">
                  {c.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Just For You ===== */}
      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <SectionTitle>
            <span className="mb-0 inline-block">Just For You</span>
          </SectionTitle>
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            {FEEDS.map((f) => (
              <button
                key={f}
                onClick={() => {
                  setTab(f);
                  setFilter("homeFeed", f);
                }}
                className={`rounded-lg px-4 py-1.5 text-sm font-bold transition ${
                  tab === f
                    ? "bg-white text-[#f85606] shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {feed.map((p) => (
            <JustForYouCard key={p.id} product={p} />
          ))}
          {!feed.length && (
            <p className="col-span-full py-14 text-center text-sm text-gray-400">
              Nothing in this feed right now.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
