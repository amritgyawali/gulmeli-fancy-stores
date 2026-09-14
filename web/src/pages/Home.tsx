import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { ProductCard, ProductVisual, Price } from "@/components/ProductCard";
import { Icon } from "@/components/Icon";
import { DEALS } from "@/components/StoreLayout";
import type { Product } from "@/lib/types";

const FEEDS = ["For You", "Voucher Max", "Hot deals", "Fast Delivery"];

function SectionCard({
  icon,
  title,
  subtitle,
  action,
  children,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; to: string };
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon && (
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-50 text-[#f85606]">
              <Icon name={icon} size={18} />
            </span>
          )}
          <div>
            <h2 className="text-lg font-black leading-tight">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>
        </div>
        {action && (
          <Link
            to={action.to}
            className="flex shrink-0 items-center gap-1 text-sm font-bold text-[#f85606] hover:underline"
          >
            {action.label} <Icon name="chevron" size={13} />
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}

const HERO_SLIDES = [
  {
    tag: "9.9 SALE",
    title: "HOUSE OF BRANDS",
    copy: "Up to 60% off across fashion, home & living — free delivery on 9.9 orders.",
    cta: "Shop the sale",
    to: "/offers",
    from: "#0d0f12",
    to2: "#341a02",
    emoji: "🛍️",
  },
  {
    tag: "GROCERIES",
    title: "Daily Bachat Bazar",
    copy: "Choice picks from Rs. 110 — Dabur, Horlicks, biscuits and more, delivered.",
    cta: "Stock your kitchen",
    to: "/search?q=Groceries",
    from: "#052e16",
    to2: "#14532d",
    emoji: "🥫",
  },
  {
    tag: "TECH",
    title: "Electronics Fest",
    copy: "Watches, audio, wearables and screen guards with up to 50% instant savings.",
    cta: "Browse electronics",
    to: "/search?q=Electronics",
    from: "#0c1a3d",
    to2: "#1e3a8a",
    emoji: "🖥️",
  },
];

export function Home() {
  const shop = useShop();
  const { homeProducts, offerProducts, recommendations, catalogReady, ui, setFilter, collectVouchers, backendError, retryBackend } = shop;
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(timer);
  }, []);

  const [tab, setTab] = useState(ui.homeFeed);
  const feed = useMemo(() => {
    const list = [...homeProducts];
    if (tab === "Voucher Max") return list.filter((p) => p.voucher);
    if (tab === "Fast Delivery") return list.filter((p) => p.fastDelivery);
    if (tab === "Hot deals")
      return list.sort(
        (a, b) =>
          Number.parseInt(a.discount ?? "0", 10) -
          Number.parseInt(b.discount ?? "0", 10),
      );
    return list;
  }, [homeProducts, tab]);

  const choose = (f: string) => {
    setTab(f);
    setFilter("homeFeed", f);
  };

  if (backendError)
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
        <p className="mb-4 font-semibold text-rose-700">{backendError}</p>
        <button onClick={retryBackend} className="rounded-lg bg-rose-600 px-6 py-2.5 text-sm font-bold text-white">
          Retry
        </button>
      </div>
    );
  if (!catalogReady)
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
    );

  const hero = HERO_SLIDES[slide];

  return (
    <div className="space-y-5">
      {/* Hero + promo grid */}
      <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
        <div
          className="relative min-h-[340px] overflow-hidden rounded-2xl p-8 text-white shadow-md lg:p-12"
          style={{ background: `linear-gradient(120deg, ${hero.from}, ${hero.to2})` }}
        >
          <div className="max-w-xl">
            <span className="rounded-full bg-[#f85606] px-3 py-1 text-xs font-black tracking-widest">
              {hero.tag}
            </span>
            <h1 className="mt-4 text-4xl font-black leading-tight lg:text-5xl">{hero.title}</h1>
            <p className="mt-3 text-white/80">{hero.copy}</p>
            <Link
              to={hero.to}
              className="mt-6 inline-block rounded-full bg-white px-7 py-3 text-sm font-black text-slate-900 shadow-lg transition hover:scale-[1.03]"
            >
              {hero.cta} →
            </Link>
          </div>
          <span className="pointer-events-none absolute -right-8 bottom-6 select-none text-[220px] leading-none opacity-20 lg:opacity-30">
            {hero.emoji}
          </span>
          <div className="absolute bottom-5 right-6 flex gap-1.5">
            {HERO_SLIDES.map((s, i) => (
              <button
                key={s.title}
                aria-label={`Show ${s.title}`}
                onClick={() => setSlide(i)}
                className={`h-2 rounded-full transition-all ${i === slide ? "w-7 bg-white" : "w-2 bg-white/40"}`}
              />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {DEALS.map((deal) => (
            <Link
              key={deal.label}
              to={deal.to}
              className={`flex flex-col justify-between rounded-2xl bg-gradient-to-br ${deal.tone} p-4 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
            >
              <span className="text-xs font-black uppercase tracking-wider opacity-90">
                Explore
              </span>
              <span className="mt-6 text-sm font-black leading-tight">{deal.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Vouchers strip */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
        <span className="flex items-center gap-2 font-black">
          <Icon name="ticket" size={18} className="text-[#f85606]" /> Claim vouchers to save more
        </span>
        <span className="rounded-lg border border-dashed border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-bold text-rose-600">
          4% OFF · Voucher Max
        </span>
        <span className="rounded-lg border border-dashed border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-bold text-teal-700">
          Rs.150 · Free shipping
        </span>
        <span className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-700">
          GULMELI10 · 10% off Rs. 500+
        </span>
        <button
          onClick={collectVouchers}
          disabled={ui.vouchersCollected}
          className="ml-auto rounded-xl bg-[#f85606] px-6 py-2.5 text-sm font-black text-white disabled:bg-emerald-500"
        >
          {ui.vouchersCollected ? "Collected ✓" : "Collect all"}
        </button>
      </div>

      {/* Flash sale rail */}
      <SectionCard
        icon="bolt"
        title="Flash Sale"
        subtitle="Limited stock · ends when the timer runs out"
        action={{ label: "Shop more", to: "/offers" }}
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {(offerProducts.length ? offerProducts : recommendations).slice(0, 6).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </SectionCard>

      {/* Choice mini + ranking side-by-side */}
      <div className="grid gap-5 lg:grid-cols-2">
        <MiniRail
          title="Daily Bachat Bazar"
          badge="CHOICE"
          products={shop.choiceProducts.slice(0, 4)}
        />
        <MiniRail
          title="Top Ranking"
          badge="HOT"
          products={recommendations.slice(0, 4)}
        />
      </div>

      {/* Main feed */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Recommendations for you</h2>
            <p className="text-xs text-slate-400">
              Live from the store catalogue — updates the moment the shop edits it.
            </p>
          </div>
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {FEEDS.map((f) => (
              <button
                key={f}
                onClick={() => choose(f)}
                className={`rounded-lg px-4 py-1.5 text-sm font-bold transition ${
                  tab === f ? "bg-white text-[#f85606] shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </header>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {feed.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
          {!feed.length && (
            <p className="col-span-full py-14 text-center text-sm text-slate-400">
              Nothing in this feed right now.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function MiniRail({
  title,
  badge,
  products,
}: {
  title: string;
  badge: string;
  products: Product[];
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-lg font-black">{title}</h2>
        <span className="rounded bg-yellow-300 px-1.5 py-0.5 text-[9px] font-black tracking-wider">
          {badge}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {products.map((p) => (
          <Link key={p.id} to={`/product/${p.id}`} className="group">
            <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">
              <ProductVisual product={p} fit="contain" />
            </div>
            <p className="mt-1.5 line-clamp-1 text-[11px] font-medium text-slate-600 group-hover:text-[#f85606]">
              {p.name}
            </p>
            <Price product={p} />
          </Link>
        ))}
      </div>
    </section>
  );
}
