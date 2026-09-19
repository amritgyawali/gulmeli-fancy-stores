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
import { ProductCard, ProductCardCompact, ProductGrid } from "@/components/ProductCard";
import { Icon } from "@/components/Icon";

/*
 * Home.
 *
 * What came out of this page, and why:
 *
 * - A gradient hero hardcoded to "9.9 SALE", "8 SEP (8PM) - 15 SEP" and
 *   "Rs. 50L OFF". None of it came from the catalogue or the admin console, so
 *   it was wrong on every day of the year except one.
 * - A 288px circle holding a shopping-bag glyph at 40% opacity with "MEGA
 *   DEALS" typed over it, floated on top of the hero.
 * - A dashed box containing a QR-code *icon* captioned "SCAN TO GET APP" — a
 *   drawing of a QR code, which scans as nothing.
 * - Five carousel dots, one of them lit, attached to a carousel that did not
 *   exist: the hero rendered a single banner and the dots never changed.
 * - A second gradient ribbon under the hero repeating the same sale message.
 *
 * What replaced it: a banner carousel that actually pages through the banners
 * the admin console publishes (keyboard-operable, auto-advance that stops on
 * hover, focus and for reduced-motion users), and sections that render only
 * when they have content.
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
  action,
  children,
}: {
  title?: string;
  action?: { to: string; label: string };
  children: ReactNode;
}) {
  return (
    <section className="mb-6">
      {(title || action) && (
        <div className="mb-3 flex items-end justify-between gap-4">
          {title && <h2 className="text-xl font-semibold text-ink">{title}</h2>}
          {action && (
            <Link
              to={action.to}
              className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:text-brand-strong"
            >
              {action.label}
              <Icon name="chevronRight" size={14} />
            </Link>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/* ---------------------------------------------------------------- carousel */

function BannerCarousel({
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
  const count = banners.length;

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(t);
  }, [count, paused]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  if (!count) return null;
  const banner = banners[Math.min(index, count - 1)];
  const href = banner.productId
    ? `/product/${String(banner.productId)}`
    : safeStoreLink(banner.ctaLink) || "/search";

  return (
    <div
      className="relative overflow-hidden rounded-md border border-line bg-raised"
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
      <Link
        to={href}
        aria-label={String(banner.heading || banner.name || "View collection")}
        className="block"
      >
        <div className="media aspect-[16/7] w-full sm:aspect-[24/7]">
          <img
            src={String(mobile ? banner.mobileImage || banner.image : banner.image || banner.mobileImage)}
            alt={String(banner.heading || banner.name || "")}
            onError={() => onFailed(String(banner.id))}
            className="object-cover"
          />
        </div>
        {!!banner.heading && (
          <div className="px-4 py-3">
            <p className="text-lg font-semibold text-ink">{String(banner.heading)}</p>
            {!!banner.subheading && (
              <p className="mt-0.5 text-sm text-ink-muted">{String(banner.subheading)}</p>
            )}
          </div>
        )}
      </Link>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous banner"
            className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-raised/90 text-ink shadow-e2 hover:bg-raised sm:grid"
          >
            <Icon name="chevronLeft" size={18} />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next banner"
            className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-raised/90 text-ink shadow-e2 hover:bg-raised sm:grid"
          >
            <Icon name="chevronRight" size={18} />
          </button>
          {/* One dot per banner, and the lit one is the banner on screen. */}
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to banner ${i + 1} of ${count}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-brand" : "w-1.5 bg-ink/25 hover:bg-ink/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- page */

export function Home() {
  const [failedBanners, setFailedBanners] = useState<string[]>([]);
  const { products, catalogReady } = useShop();
  const config = usePublishedConfig();
  const content = useContent();
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );
  const [visible, setVisible] = useState(20);
  const loadMoreRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

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
        .filter((p) => (p.originalPrice ?? 0) > p.price && p.stock > 0)
        .sort(
          (a, b) =>
            b.originalPrice! / b.price - a.originalPrice! / a.price,
        )
        .slice(0, 12),
    [products],
  );

  const categories = useMemo(() => {
    const rows = content("categories");
    if (rows.length) return rows.slice(0, 12);
    const counted = new Map<string, number>();
    for (const p of products) counted.set(p.category, (counted.get(p.category) ?? 0) + 1);
    return [...counted.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, n]) => ({ id: name, name, count: n }) as ContentRecord);
  }, [content, products]);

  const feed = useMemo(
    () => [...products].sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0)),
    [products],
  );
  const shown = feed.slice(0, visible);
  const hasMore = shown.length < feed.length;

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
      <div className="space-y-6">
        <div className="skeleton aspect-[24/7] w-full rounded-md" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[3/4] rounded-md" />
          ))}
        </div>
      </div>
    );

  return (
    <>
      {banners.length > 0 && (
        <div className="mb-6">
          <BannerCarousel
            banners={banners}
            mobile={mobile}
            onFailed={(id) => setFailedBanners((c) => [...c, id])}
          />
        </div>
      )}

      {categories.length > 0 && (
        <Section title="Shop by category">
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/search?q=${encodeURIComponent(String(c.name))}`}
                  className="flex h-full flex-col items-center gap-2 rounded-md border border-line bg-raised p-3 text-center transition-colors hover:border-brand"
                >
                  <span className="media grid h-14 w-14 place-items-center rounded-full">
                    {c.image ? (
                      <img
                        src={String(c.image)}
                        alt=""
                        loading="lazy"
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <Icon name="tag" size={22} className="text-ink-faint" />
                    )}
                  </span>
                  <span className="clamp-2 text-xs font-medium leading-tight text-ink-soft">
                    {String(c.name)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {config.features.flashSales && flashProducts.length > 0 && (
        <Section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-ink">On sale today</h2>
              {countdown && (
                <p className="tnum flex items-center gap-1 text-sm text-ink-muted">
                  <Icon name="clock" size={14} />
                  <span className="sr-only">Ends in </span>
                  {countdown.h}:{countdown.m}:{countdown.s}
                </p>
              )}
            </div>
            <Link
              to="/offers"
              className="flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-strong"
            >
              All offers
              <Icon name="chevronRight" size={14} />
            </Link>
          </div>
          <ul className="rail gap-2.5 pb-1">
            {flashProducts.map((p) => (
              <li key={p.id}>
                <ProductCardCompact product={p} />
              </li>
            ))}
          </ul>
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
              <ul className="rail gap-3">
                {items.map((b) => {
                  const to = b.productId
                    ? `/product/${String(b.productId)}`
                    : safeStoreLink(b.ctaLink);
                  const img = (
                    <div className="media aspect-[2/1] w-[min(88vw,560px)] rounded-md border border-line">
                      <img
                        src={String(mobile ? b.mobileImage || b.image : b.image || b.mobileImage)}
                        alt={String(b.heading || b.name || "")}
                        loading="lazy"
                        onError={() => setFailedBanners((c) => [...c, String(b.id)])}
                        className="object-cover"
                      />
                    </div>
                  );
                  return <li key={b.id}>{to ? <Link to={to}>{img}</Link> : img}</li>;
                })}
              </ul>
            );
        } else if (type === "blog") {
          const posts = content("blog_posts");
          if (posts.length)
            body = (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {posts.slice(0, 6).map((p) => (
                  <li
                    key={p.id}
                    className="rounded-md border border-line bg-raised p-4"
                  >
                    <h3 className="text-base font-semibold text-ink">{String(p.title)}</h3>
                    <p className="clamp-3 mt-1 text-sm text-ink-muted">
                      {plainText(p.body || p.content)}
                    </p>
                  </li>
                ))}
              </ul>
            );
        } else {
          const text = plainText(section.body || section.html);
          const video = safeStoreLink(section.videoUrl);
          if (text || video)
            body = (
              <div className="rounded-md border border-line bg-raised p-4">
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

      <Section title="Recommended for you">
        {shown.length > 0 ? (
          <>
            <ProductGrid products={shown} />
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  ref={loadMoreRef}
                  type="button"
                  onClick={() => setVisible((v) => v + 20)}
                  className="rounded-md border border-line bg-raised px-8 py-2.5 text-sm font-semibold text-ink hover:border-brand hover:text-brand"
                >
                  Show more
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="rounded-md border border-line bg-raised p-8 text-center text-sm text-ink-muted">
            No products are listed yet.
          </p>
        )}
      </Section>
    </>
  );
}
