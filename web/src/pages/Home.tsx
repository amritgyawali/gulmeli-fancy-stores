import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { usePublishedConfig } from "@/lib/config-api";
import {
  useContent,
  defaultSections,
  sectionVisible,
  safeStoreLink,
  plainText,
  type ContentRecord,
} from "@/lib/storefront";
import {
  ProductCardCompact,
  ProductGrid,
  ProductGridSkeleton,
} from "@/components/ProductCard";
import { discountOf } from "@/components/Listing";
import { Rail } from "@/components/Rail";
import { Icon } from "@/components/Icon";
import { useDocumentMeta, useInView, useMediaQuery, useRecentlyViewed } from "@/lib/hooks";
import type { Product } from "@/lib/types";
import { bundledImage, sized } from "@/lib/images";

/*
 * Home.
 *
 * Earlier rounds took out a hero hardcoded to one sale date, a drawing of a QR
 * code, and carousel dots attached to a single banner. The principle stays:
 * every section renders only from real content — published banners, the
 * catalogue, the customer's own browsing — and disappears when it has none.
 *
 * What this version adds is the structure large marketplaces converge on:
 *
 * 1. A hero that slides, swipes on touch and shows how long until it moves on.
 * 2. Flash deals with a real countdown (to the end of the visitor's day) and a
 *    sold-through bar computed from each product's sold count and stock.
 * 3. "Continue browsing", from the customer's recently viewed products.
 * 4. A feed with tabs — Popular, New, Top rated, Lowest price — that loads
 *    more as the customer scrolls instead of making them press a button.
 */

function useCountdown(target: Date | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (!target) return null;
  const left = target.getTime() - now;
  if (left <= 0) return null;
  return {
    h: String(Math.floor(left / 3_600_000)).padStart(2, "0"),
    m: String(Math.floor((left % 3_600_000) / 60_000)).padStart(2, "0"),
    s: String(Math.floor((left % 60_000) / 1000)).padStart(2, "0"),
  };
}

function Section({
  title,
  eyebrow,
  action,
  children,
  aside,
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  action?: { to: string; label: string };
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="reveal mb-8">
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            {title && <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>}
            {eyebrow}
          </div>
          <div className="flex items-center gap-3">
            {aside}
            {action && (
              <Link
                to={action.to}
                className="group flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:text-brand-strong"
              >
                {action.label}
                <Icon
                  name="chevronRight"
                  size={14}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
            )}
          </div>
        </div>
      )}
      {children}
    </section>
  );
}

/* ---------------------------------------------------------------- carousel */

const SLIDE_MS = 6000;

function HeroCarousel({
  banners,
  onFailed,
  mobile,
}: {
  banners: ContentRecord[];
  onFailed: (id: string) => void;
  mobile: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [drag, setDrag] = useState(0);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const moved = useRef(false);
  const count = banners.length;
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  /* Auto-advance, paused on hover, focus, an in-progress swipe, a hidden tab
     and for reduced-motion users. */
  useEffect(() => {
    if (count < 2 || paused || reduced) return;
    const t = setTimeout(() => {
      if (document.visibilityState === "visible") setIndex((i) => (i + 1) % count);
    }, SLIDE_MS);
    return () => clearTimeout(t);
  }, [count, paused, reduced, index]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  if (!count) return null;

  const hrefFor = (banner: ContentRecord) =>
    banner.productId
      ? `/product/${String(banner.productId)}`
      : safeStoreLink(banner.ctaLink) || "/search";

  const onPointerDown = (e: React.PointerEvent) => {
    if (count < 2 || e.pointerType === "mouse") return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
    moved.current = false;
    setPaused(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current || start.current.id !== e.pointerId) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    /* A mostly vertical gesture is the page scrolling, not a swipe. */
    if (!moved.current && Math.abs(dy) > Math.abs(dx)) {
      start.current = null;
      setPaused(false);
      return;
    }
    if (Math.abs(dx) > 6) moved.current = true;
    setDrag(dx);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!start.current) return;
    const width = (e.currentTarget as HTMLElement).clientWidth || 1;
    if (Math.abs(drag) > width * 0.18) go(index + (drag < 0 ? 1 : -1));
    start.current = null;
    setDrag(0);
    setPaused(false);
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-line bg-raised shadow-e1"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured collections"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      <div
        className="flex touch-pan-y"
        style={{
          transform: `translateX(calc(${-index * 100}% + ${drag}px))`,
          transition: drag || reduced ? "none" : "transform 560ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {banners.map((banner, i) => (
          <Link
            key={banner.id}
            to={hrefFor(banner)}
            draggable={false}
            onClick={(e) => moved.current && e.preventDefault()}
            aria-label={String(banner.heading || banner.name || "View collection")}
            aria-hidden={i !== index}
            tabIndex={i === index ? 0 : -1}
            className="relative block w-full shrink-0"
          >
            <div className="media aspect-[16/8] w-full sm:aspect-[24/7]">
              <img
                src={sized(
                  String(
                    mobile ? banner.mobileImage || banner.image : banner.image || banner.mobileImage,
                  ),
                  mobile ? 900 : 1600,
                )}
                alt={String(banner.heading || banner.name || "")}
                draggable={false}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : undefined}
                onError={() => onFailed(String(banner.id))}
                className={`object-cover transition-transform duration-[6000ms] ease-linear ${
                  i === index && !reduced ? "scale-[1.04]" : "scale-100"
                }`}
              />
              {!!banner.heading && (
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-black/10 to-transparent p-4 sm:p-6">
                  <div
                    key={i === index ? `in-${index}` : "out"}
                    className={i === index ? "animate-fade-up" : "opacity-0"}
                  >
                    <p className="text-xl font-bold tracking-tight text-white drop-shadow sm:text-3xl">
                      {String(banner.heading)}
                    </p>
                    {!!banner.subheading && (
                      <p className="mt-1 max-w-lg text-sm text-white/85 sm:text-base">
                        {String(banner.subheading)}
                      </p>
                    )}
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#17181a] shadow-e2">
                      {String(banner.ctaLabel || "Shop now")}
                      <Icon name="arrowRight" size={15} />
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous banner"
            className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#17181a] shadow-e2 backdrop-blur transition-transform hover:scale-105 hover:bg-white sm:grid"
          >
            <Icon name="chevronLeft" size={18} />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next banner"
            className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#17181a] shadow-e2 backdrop-blur transition-transform hover:scale-105 hover:bg-white sm:grid"
          >
            <Icon name="chevronRight" size={18} />
          </button>
          {/* One indicator per banner; the lit one fills over the time until
              the next slide, so the customer can see the carousel will move. */}
          <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to banner ${i + 1} of ${count}`}
                aria-current={i === index}
                className={`relative h-1.5 overflow-hidden rounded-full bg-white/50 transition-[width] duration-300 hover:bg-white/80 ${
                  i === index ? "w-7" : "w-1.5"
                }`}
              >
                {i === index && (
                  <span
                    key={`${index}-${paused}`}
                    className="absolute inset-y-0 left-0 bg-white"
                    style={{
                      width: paused || reduced ? "100%" : undefined,
                      animation:
                        paused || reduced ? undefined : `hero-progress ${SLIDE_MS}ms linear both`,
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- feed */

const FEEDS = [
  { key: "popular", label: "Popular" },
  { key: "new", label: "New arrivals" },
  { key: "rated", label: "Top rated" },
  { key: "value", label: "Lowest price" },
] as const;
type FeedKey = (typeof FEEDS)[number]["key"];

const rating = (p: Product) => Number.parseFloat(p.rating ?? "") || 0;

const FEED_SORT: Record<FeedKey, (a: Product, b: Product) => number> = {
  popular: (a, b) => (b.sold ?? 0) - (a.sold ?? 0),
  new: (a, b) =>
    (Date.parse(b.createdAt ?? "") || 0) - (Date.parse(a.createdAt ?? "") || 0) ||
    String(b.id).localeCompare(String(a.id)),
  rated: (a, b) => rating(b) - rating(a) || (b.sold ?? 0) - (a.sold ?? 0),
  value: (a, b) => a.price - b.price,
};

const PAGE = 20;

function Feed({ products }: { products: Product[] }) {
  const [feed, setFeed] = useState<FeedKey>("popular");
  const [visible, setVisible] = useState(PAGE);
  const [sentinel, near] = useInView<HTMLDivElement>({ rootMargin: "600px" });

  /* Whatever the tab, sold-out products sink to the end rather than
     vanishing, so the feed never looks emptier than the catalogue is. */
  const sorted = useMemo(
    () =>
      [...products].sort(
        (a, b) => Number(a.stock < 1) - Number(b.stock < 1) || FEED_SORT[feed](a, b),
      ),
    [products, feed],
  );
  const shown = sorted.slice(0, visible);
  const hasMore = shown.length < sorted.length;

  /* Load the next page as the end approaches. The button below stays as the
     keyboard and no-observer fallback. */
  useEffect(() => {
    if (near && hasMore) setVisible((v) => v + PAGE);
  }, [near, hasMore]);

  return (
    <Section
      title="Just for you"
      eyebrow={
        <div
          role="tablist"
          aria-label="Sort the feed"
          className="rail -mx-1 gap-1 px-1"
        >
          {FEEDS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={feed === f.key}
              onClick={() => {
                setFeed(f.key);
                setVisible(PAGE);
              }}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                feed === f.key
                  ? "bg-ink text-raised"
                  : "bg-raised text-ink-soft ring-1 ring-line hover:text-ink hover:ring-line-strong"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      }
    >
      {shown.length > 0 ? (
        <div key={feed} className="animate-fade-in">
          <ProductGrid products={shown} />
          <div ref={sentinel} aria-hidden="true" />
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE)}
                className="rounded-full border border-line bg-raised px-8 py-2.5 text-sm font-semibold text-ink hover:border-brand hover:text-brand"
              >
                Show more
              </button>
            </div>
          )}
          {!hasMore && sorted.length > PAGE && (
            <p className="mt-6 text-center text-sm text-ink-muted">
              You have seen all {sorted.length} products.{" "}
              <Link to="/search" className="font-medium text-brand hover:text-brand-strong">
                Browse with filters
              </Link>
            </p>
          )}
        </div>
      ) : (
        <p className="rounded-lg border border-line bg-raised p-8 text-center text-sm text-ink-muted">
          No products are listed yet.
        </p>
      )}
    </Section>
  );
}

/* -------------------------------------------------------------------- page */

export function Home() {
  const [failedBanners, setFailedBanners] = useState<string[]>([]);
  const { products, catalogReady } = useShop();
  const config = usePublishedConfig();
  const content = useContent();
  const mobile = useMediaQuery("(max-width: 767px)");
  const recentlyViewed = useRecentlyViewed(undefined, 16);

  useDocumentMeta({
    title: config.branding.companyName,
    description:
      config.seo.metaDescription ||
      config.branding.tagline ||
      `Shop online at ${config.branding.companyName}.`,
  });

  const sections = (
    content("homepage_config")[0]?.configured ? content("homepage_sections") : defaultSections
  )
    .filter((s) => sectionVisible(s, mobile))
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));

  const banners = content("banners").filter(
    (b) => !failedBanners.includes(b.id) && !!(b.image || b.mobileImage),
  );

  const flashProducts = useMemo(
    () =>
      products
        .filter((p) => discountOf(p) > 0 && p.stock > 0)
        .sort((a, b) => discountOf(b) - discountOf(a))
        .slice(0, 16),
    [products],
  );

  const counts = useMemo(() => {
    const counted = new Map<string, number>();
    for (const p of products) counted.set(p.category, (counted.get(p.category) ?? 0) + 1);
    return counted;
  }, [products]);

  const categories = useMemo(() => {
    const rows = content("categories");
    if (rows.length) return rows.slice(0, 12);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name]) => {
        /* A category without its own image borrows its best seller's. */
        const lead = products
          .filter((p) => p.category === name)
          .sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0))[0];
        return { id: name, name, image: lead ? bundledImage(lead) : undefined } as ContentRecord;
      });
  }, [content, counts, products]);

  /* Flash sale ends at the end of the day in the visitor's own timezone. */
  const endOfDay = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);
  const countdown = useCountdown(flashProducts.length ? endOfDay : null);

  /* Extra admin-authored blocks that are not one of the fixed sections. */
  const extraSections = sections.filter((s) =>
    ["newsletter", "brands", "blog", "social", "rich_text", "video", "banner", "promo_banner", "gallery"].includes(
      String(s.type),
    ),
  );

  if (!catalogReady && products.length === 0)
    return (
      <div className="space-y-8" aria-busy="true">
        <div className="skeleton aspect-[16/8] w-full rounded-xl sm:aspect-[24/7]" />
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="skeleton h-16 w-16 rounded-full" />
              <div className="skeleton h-3 w-14 rounded-sm" />
            </div>
          ))}
        </div>
        <ProductGridSkeleton />
      </div>
    );

  return (
    <>
      <h1 className="sr-only">{config.branding.companyName}</h1>

      {banners.length > 0 && (
        <div className="mb-6">
          <HeroCarousel
            banners={banners}
            mobile={mobile}
            onFailed={(id) => setFailedBanners((c) => [...c, id])}
          />
        </div>
      )}

      {categories.length > 0 && (
        <Section title="Shop by category" action={{ to: "/search", label: "All products" }}>
          <ul className="rail gap-2 sm:grid sm:grid-cols-6 sm:gap-3 lg:grid-cols-8">
            {categories.map((c) => {
              const n = counts.get(String(c.name));
              return (
                <li key={c.id} className="w-[84px] sm:w-auto">
                  <Link
                    to={`/search?q=${encodeURIComponent(String(c.name))}`}
                    className="group flex h-full flex-col items-center gap-2 rounded-lg p-2 text-center transition-colors hover:bg-raised"
                  >
                    <span className="media grid h-16 w-16 place-items-center rounded-full bg-raised ring-1 ring-line transition-[box-shadow] duration-200 group-hover:ring-2 group-hover:ring-brand sm:h-20 sm:w-20">
                      {c.image ? (
                        <img
                          src={sized(String(c.image), 160)}
                          alt=""
                          loading="lazy"
                          className="h-full w-full rounded-full object-cover transition-transform duration-500 ease-out-quint group-hover:scale-110"
                        />
                      ) : (
                        <Icon name="tag" size={22} className="text-ink-faint" />
                      )}
                    </span>
                    <span className="clamp-2 text-xs font-medium leading-tight text-ink-soft group-hover:text-ink">
                      {String(c.name)}
                    </span>
                    {n != null && (
                      <span className="tnum -mt-1 text-2xs text-ink-faint">
                        {n} {n === 1 ? "item" : "items"}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {config.features.flashSales && flashProducts.length > 0 && (
        <section className="reveal mb-8 overflow-hidden rounded-xl border border-brand-border bg-gradient-to-br from-brand-soft via-raised to-raised">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-2 pt-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-ink">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-white">
                  <Icon name="bolt" size={17} />
                </span>
                Flash deals
              </h2>
              {countdown && (
                <p className="flex items-center gap-1.5 text-sm text-ink-muted">
                  <span>Ends in</span>
                  <span className="sr-only">
                    {countdown.h} hours {countdown.m} minutes
                  </span>
                  <span aria-hidden="true" className="flex items-center gap-1">
                    <span className="digit">{countdown.h}</span>:
                    <span className="digit">{countdown.m}</span>:
                    <span className="digit">{countdown.s}</span>
                  </span>
                </p>
              )}
            </div>
            <Link
              to="/offers"
              className="group flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-strong"
            >
              Shop all deals
              <Icon
                name="chevronRight"
                size={14}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
          <div className="px-4 pb-4">
            <Rail label="Flash deals">
              {flashProducts.map((p) => (
                <li key={p.id}>
                  <ProductCardCompact product={p} progress />
                </li>
              ))}
            </Rail>
          </div>
        </section>
      )}

      {recentlyViewed.length > 0 && (
        <Section title="Continue browsing" action={{ to: "/wishlist", label: "Saved & viewed" }}>
          <Rail label="Recently viewed">
            {recentlyViewed.map((p) => (
              <li key={p.id}>
                <ProductCardCompact product={p} />
              </li>
            ))}
          </Rail>
        </Section>
      )}

      {extraSections.map((section) => {
        const type = String(section.type);
        let body: ReactNode = null;

        if (["banner", "promo_banner", "gallery"].includes(type)) {
          const items = content("banners")
            .filter(
              (b) =>
                !failedBanners.includes(b.id) &&
                !!(b.image || b.mobileImage) &&
                (!Array.isArray(section.bannerIds) ||
                  !section.bannerIds.length ||
                  section.bannerIds.includes(b.id)),
            )
            .slice(banners.length ? 1 : 0);
          if (items.length)
            body = (
              <Rail label={String(section.title || "Promotions")}>
                {items.map((b) => {
                  const to = b.productId
                    ? `/product/${String(b.productId)}`
                    : safeStoreLink(b.ctaLink);
                  const img = (
                    <div className="media group aspect-[2/1] w-[min(84vw,520px)] overflow-hidden rounded-xl border border-line">
                      <img
                        src={String(mobile ? b.mobileImage || b.image : b.image || b.mobileImage)}
                        alt={String(b.heading || b.name || "")}
                        loading="lazy"
                        onError={() => setFailedBanners((c) => [...c, String(b.id)])}
                        className="object-cover transition-transform duration-500 ease-out-quint group-hover:scale-[1.03]"
                      />
                    </div>
                  );
                  return <li key={b.id}>{to ? <Link to={to}>{img}</Link> : img}</li>;
                })}
              </Rail>
            );
        } else if (type === "blog") {
          const posts = content("blog_posts");
          if (posts.length)
            body = (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {posts.slice(0, 6).map((p) => (
                  <li
                    key={p.id}
                    className="overflow-hidden rounded-lg border border-line bg-raised"
                  >
                    {!!p.featuredImage && (
                      <div className="media aspect-[16/9]">
                        <img
                          src={String(p.featuredImage)}
                          alt=""
                          loading="lazy"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-base font-semibold text-ink">{String(p.title)}</h3>
                      <p className="clamp-3 mt-1 text-sm text-ink-muted">
                        {plainText(p.body || p.content)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            );
        } else {
          const text = plainText(section.body || section.html);
          const video = safeStoreLink(section.videoUrl);
          if (text || video)
            body = (
              <div className="rounded-lg border border-line bg-raised p-4">
                {text && (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                    {text}
                  </p>
                )}
                {video && (
                  <a
                    href={video}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand"
                  >
                    Watch video
                    <Icon name="arrowUpRight" size={14} />
                  </a>
                )}
              </div>
            );
        }

        if (!body) return null;
        return (
          <Section key={section.id} title={section.title ? String(section.title) : undefined}>
            {body}
          </Section>
        );
      })}

      <Feed products={products} />
    </>
  );
}
