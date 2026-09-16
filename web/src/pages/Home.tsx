import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { usePublishedConfig } from "@/lib/config-api";
import {
  useContent,
  useTheme,
  defaultSections,
  sectionVisible,
  safeStoreLink,
  plainText,
  type ContentRecord,
} from "@/lib/storefront";
import { ProductCard } from "@/components/ProductCard";

/*
 * Home page ported from ../web ui ux design/daraz_nepal_homepage_clone/
 * code.html: hero carousel with app-download side card, sale ribbon, Flash
 * Sale white card with countdown, Categories card grid, and a Just-For-You
 * product grid with LOAD MORE. Section ordering/visibility still honors the
 * admin homepage_config so the storefront console keeps working.
 */

function useCountdown() {
  const [left, setLeft] = useState(() => msToEod());
  useEffect(() => {
    const t = setInterval(() => setLeft(msToEod()), 1000);
    return () => clearInterval(t);
  }, []);
  const total = Math.max(0, left);
  const hh = String(Math.floor(total / 3_600_000)).padStart(2, "0");
  const mm = String(Math.floor((total % 3_600_000) / 60_000)).padStart(2, "0");
  const ss = String(Math.floor((total % 60_000) / 1000)).padStart(2, "0");
  return [hh, mm, ss];
}
function msToEod() {
  const now = new Date();
  return (
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime() -
    now.getTime()
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <div className="mb-2 text-lg font-bold text-gray-800">{children}</div>;
}

export function Home() {
  const [failedBanners, setFailedBanners] = useState<string[]>([]);
  const { products } = useShop();
  const config = usePublishedConfig();
  const theme = useTheme();
  const content = useContent();
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  const [visible, setVisible] = useState(24);
  const [hh, mm, ss] = useCountdown();
  useEffect(() => {
    const update = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const sections = (
    content("homepage_config")[0]?.configured
      ? content("homepage_sections")
      : defaultSections
  )
    .filter((s) => sectionVisible(s, mobile))
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  const follow = (url: unknown, label: ReactNode) => {
    const target = safeStoreLink(url);
    return target ? (
      target.startsWith("/") ? (
        <Link to={target}>{label}</Link>
      ) : (
        <a href={target}>{label}</a>
      )
    ) : (
      label
    );
  };
  const banners = content("banners")
    .filter(
      (b) =>
        !failedBanners.includes(b.id) && !!(b.image || b.mobileImage),
    )
    .filter((b) => !!b.image || !!b.mobileImage);
  const heroBanner = banners[0];
  const flashProducts = useMemo(
    () => products.filter((p) => (p.originalPrice ?? 0) > p.price).slice(0, 6),
    [products],
  );
  const categories = useMemo(() => {
    const rows = content("categories");
    const entries = rows.length
      ? rows
      : [...new Set(products.map((p) => p.category))].map(
          (name) => ({ id: name, name }) as ContentRecord,
        );
    return entries.slice(0, 16);
  }, [content, products]);
  const feed = useMemo(() => {
    const list = [...products].sort(
      (a, b) => (b.sold ?? 0) - (a.sold ?? 0),
    );
    return list.slice(0, visible);
  }, [products, visible]);
  const hasMore = feed.length < products.length;

  return (
    <div className="space-y-6">
      {/* BEGIN: HeroCarouselAndAppDownload */}
      <section className="grid grid-cols-12 gap-3">
        <div className="hero-gradient relative col-span-12 flex min-h-[340px] items-center overflow-hidden rounded-[2px] p-6 text-white shadow-sm lg:col-span-10">
          {heroBanner ? (
            <Link
              to={
                heroBanner.productId
                  ? `/product/${String(heroBanner.productId)}`
                  : safeStoreLink(heroBanner.ctaLink) || "/search"
              }
              className="relative z-10 max-w-[65%]"
            >
              <img
                onError={() =>
                  setFailedBanners((c) => [...c, String(heroBanner.id)])
                }
                src={String(
                  mobile
                    ? heroBanner.mobileImage || heroBanner.image
                    : heroBanner.image || heroBanner.mobileImage,
                )}
                alt={String(heroBanner.heading || heroBanner.name || "Collection")}
                className="max-h-[300px] w-full rounded object-contain"
              />
              {!!heroBanner.heading && (
                <p className="mt-3 text-2xl font-black leading-tight drop-shadow-md">
                  {String(heroBanner.heading)}
                </p>
              )}
            </Link>
          ) : (
            <div className="relative z-10 max-w-[65%]">
              <div className="mb-2 inline-flex items-center gap-2">
                <span className="rounded-full bg-black/30 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                  8 SEP (8PM) - 15 SEP
                </span>
              </div>
              <h1 className="mb-1 text-4xl font-black leading-none tracking-tight drop-shadow-md sm:text-5xl">
                {String(config.text.homeHeading || "9.9")}{" "}
                <span className="text-yellow-300">SALE</span>
              </h1>
              <p className="mb-4 text-lg font-bold tracking-wide text-yellow-100">
                {config.branding.tagline || "BIGGEST SALE OF THE SEASON"}
              </p>
              <div className="mb-5 flex flex-wrap gap-2">
                {[
                  ["UP TO", "Rs. 50L OFF"],
                  ["ENJOY", "FREE DELIVERY"],
                  ["EXTRA", "70% OFF"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded border border-white/30 bg-white/20 px-3 py-1.5 text-center backdrop-blur-md"
                  >
                    <span className="block text-xs font-bold uppercase text-yellow-200">
                      {k}
                    </span>
                    <span className="text-sm font-extrabold">{v}</span>
                  </div>
                ))}
              </div>
              <Link
                to="/search"
                className="inline-block rounded-full bg-white px-7 py-2.5 text-sm font-black text-[#f85606] shadow-lg transition hover:bg-yellow-50"
              >
                Shop Now
              </Link>
            </div>
          )}
          {/* Banner right graphic embellishment */}
          <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 items-center justify-center opacity-95 md:flex">
            <div className="relative flex h-72 w-72 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-inner">
              <i className="fa-solid fa-bag-shopping text-8xl text-yellow-300/40" />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <span className="text-xs uppercase tracking-widest text-white/90">
                  Exclusive Brands
                </span>
                <span className="text-2xl font-black text-white">
                  MEGA DEALS
                </span>
                <span className="mt-1 rounded bg-yellow-400 px-2 py-0.5 text-xs font-extrabold text-black">
                  LIMITED STOCK
                </span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-white" />
            <span className="h-2 w-2 rounded-full bg-white/50" />
            <span className="h-2 w-2 rounded-full bg-white/50" />
            <span className="h-2 w-2 rounded-full bg-white/50" />
            <span className="h-2 w-2 rounded-full bg-white/50" />
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
            {config.footer.showAppLinks && (
              <>
                <a
                  href={safeStoreLink(config.app.appStoreUrl) || "#"}
                  className="flex w-full items-center justify-center gap-2 rounded bg-black px-2 py-1.5 text-[10px] text-white transition hover:bg-gray-800"
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
                  href={safeStoreLink(config.app.playStoreUrl) || "#"}
                  className="flex w-full items-center justify-center gap-2 rounded bg-black px-2 py-1.5 text-[10px] text-white transition hover:bg-gray-800"
                >
                  <i className="fa-brands fa-google-play text-xs text-yellow-400" />
                  <span className="text-left leading-tight">
                    <span className="block text-[8px] leading-none text-gray-400">
                      GET IT ON
                    </span>
                    <span className="font-bold">Google Play</span>
                  </span>
                </a>
              </>
            )}
          </div>
        </div>
      </section>
      {/* END: HeroCarouselAndAppDownload */}
      {/* Secondary promotional ribbon */}
      <Link
        to="/offers"
        className="ribbon-gradient flex w-full cursor-pointer items-center justify-between rounded-[2px] px-2 py-2.5 text-white shadow-sm transition hover:opacity-95"
      >
        <span className="flex items-center gap-3 pl-2">
          <span className="text-xl font-black italic tracking-wide text-yellow-300">
            9.9 SALE
          </span>
          <span className="text-sm font-bold uppercase tracking-wide sm:text-base">
            9.9 Sale is LIVE NOW
          </span>
        </span>
        <span className="flex items-center gap-1 rounded bg-yellow-400 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-black shadow transition hover:bg-yellow-300">
          Shop Now <i className="fa-solid fa-chevron-right text-[10px]" />
        </span>
      </Link>
      {/* BEGIN: FlashSaleSection */}
      {config.features.flashSales && flashProducts.length > 0 && (
        <section>
          <SectionHeading>Flash Sale</SectionHeading>
          <div className="rounded-[2px] border border-gray-100 bg-white p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-[#f85606]">
                  On Sale Now
                </span>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span>Ending in</span>
                  <div className="flex items-center gap-1 font-mono font-bold text-white">
                    {[hh, ":", mm, ":", ss].map((c, i) =>
                      c === ":" ? (
                        <span key={i} className="text-[#d04402]">
                          :
                        </span>
                      ) : (
                        <span
                          key={i}
                          className="rounded-[2px] bg-[#d04402] px-1.5 py-0.5"
                        >
                          {c}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>
              <Link
                to="/offers"
                className="rounded-[2px] border border-[#f85606] px-3.5 py-1.5 text-xs font-semibold uppercase text-[#f85606] transition hover:bg-[#fff6f2]"
              >
                SHOP ALL PRODUCTS
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
              {flashProducts.map((p) => (
                <ProductCard key={p.id} product={p} variant="flash" />
              ))}
            </div>
          </div>
        </section>
      )}
      {/* END: FlashSaleSection */}
      {/* BEGIN: CategoriesSection */}
      {categories.length > 0 && (
        <section>
          <SectionHeading>Categories</SectionHeading>
          <div className="divide-y divide-gray-100 rounded-[2px] border border-gray-200 bg-white shadow-sm">
            {[0, 8].map((start) => (
              <div
                key={start}
                className="grid grid-cols-4 divide-x divide-gray-100 sm:grid-cols-8"
              >
                {categories.slice(start, start + 8).map((c) => (
                  <Link
                    key={c.id}
                    to={`/search?q=${encodeURIComponent(String(c.name))}`}
                    className="category-item flex flex-col items-center p-3 text-center transition hover:bg-gray-50"
                  >
                    <div className="mb-2 flex h-16 w-16 items-center justify-center">
                      {c.image ? (
                        <img
                          src={String(c.image)}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <i className="fa-solid fa-bag-shopping text-3xl text-gray-300" />
                      )}
                    </div>
                    <span className="text-xs leading-tight text-gray-700">
                      {String(c.name)}
                    </span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}
      {/* END: CategoriesSection */}
      {/* Remaining admin-configured non-grid sections (newsletter, blog, etc.) */}
      {sections
        .filter((s) =>
          [
            "newsletter",
            "brands",
            "blog",
            "social",
            "rich_text",
            "video",
            "banner",
            "promo_banner",
            "gallery",
          ].includes(String(s.type)),
        )
        .map((section) => {
          const type = String(section.type);
          let body: ReactNode;
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
              .slice(1);
            body = items.length ? (
              <div className="flex snap-x gap-3 overflow-x-auto">
                {items.map((b) => (
                  <div
                    key={b.id}
                    className="w-full shrink-0 snap-start overflow-hidden rounded-[2px] border border-gray-200 bg-white shadow-sm"
                  >
                    {follow(
                      b.productId ? `/product/${String(b.productId)}` : b.ctaLink,
                      <img
                        onError={() =>
                          setFailedBanners((c) => [...c, String(b.id)])
                        }
                        src={String(
                          mobile
                            ? b.mobileImage || b.image
                            : b.image || b.mobileImage,
                        )}
                        alt={String(b.heading || b.name || "Collection")}
                        className="aspect-[2/1] w-full object-cover"
                      />,
                    )}
                  </div>
                ))}
              </div>
            ) : null;
          } else if (type === "blog")
            body = (
              <div className="space-y-6 rounded-[2px] border border-gray-200 bg-white p-4 shadow-sm">
                {content("blog_posts").map((p) => (
                  <article key={p.id}>
                    <h3 className="text-lg font-bold text-gray-800">
                      {String(p.title)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {plainText(p.body || p.content)}
                    </p>
                  </article>
                ))}
              </div>
            );
          else
            body = (
              <div className="space-y-3 rounded-[2px] border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm">
                <p className="whitespace-pre-line">
                  {plainText(section.body || section.html)}
                </p>
                {type === "video" &&
                  follow(section.videoUrl, "Watch video")}
              </div>
            );
          if (!body) return null;
          return (
            <section key={section.id}>
              {section.title ? <SectionHeading>{String(section.title)}</SectionHeading> : null}
              {body}
            </section>
          );
        })}
      {/* BEGIN: JustForYouSection */}
      <section>
        <SectionHeading>Just For You</SectionHeading>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {feed.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        {hasMore && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setVisible((v) => v + 24)}
              className="w-96 max-w-full rounded-[2px] border border-[#f85606] bg-white py-3 text-xs font-bold uppercase tracking-wider text-[#f85606] shadow-sm transition hover:bg-[#fff0eb]"
            >
              LOAD MORE
            </button>
          </div>
        )}
      </section>
      {/* END: JustForYouSection */}
      {/* Theme hook retained for admin appearance overrides */}
      <span className="hidden" aria-hidden style={{ color: theme.primary }} />
    </div>
  );
}
