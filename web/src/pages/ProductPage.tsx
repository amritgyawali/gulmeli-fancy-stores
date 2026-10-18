import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { usePublishedConfig } from "@/lib/config-api";
import {
  ProductCard,
  ProductCardCompact,
  Price,
  WishlistButton,
  discountPercent,
  useQuickAdd,
} from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
import { Rail } from "@/components/Rail";
import { Icon, Stars } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { bundledImage } from "@/lib/images";
import { rs } from "@/lib/format";
import { useDeliveryTerms, freeDeliveryCopy } from "@/lib/shipping";
import { voucherTerms } from "@/lib/commerce";
import { unitsInCart } from "@/lib/cart";
import {
  colorOptions,
  defaultColor,
  lineKey,
  missingChoice,
  sizeChartFor,
  sizeOptions,
  type SizeChart,
} from "@/shared/mobile/data/clothing";
import {
  deliveryWindow,
  useDocumentMeta,
  useInView,
  useRecentlyViewed,
  useRecordView,
} from "@/lib/hooks";

/*
 * Product details.
 *
 * An earlier round removed everything this page used to invent: a "Mall
 * Verified Seller" badge on every product, one seller scorecard shared by the
 * whole catalogue, a rating histogram generated from `rating * 17`, review
 * counts made up from `sold`, a default 4.5 rating, vouchers checkout did not
 * honour and a "Hover to zoom" badge over an image that did not zoom. None of
 * that is back. The page still shows only what the catalogue knows, plus
 * delivery and voucher terms read from the same modules the cart and
 * checkout use.
 *
 * What changed is how it is arranged and how it responds:
 *
 * - The gallery magnifies under the pointer, swipes on touch and opens a
 *   full-screen viewer (components/ProductGallery).
 * - The buy box always has an action in reach. On a phone Add to cart and Buy
 *   now live in a bar fixed to the bottom of the screen, where the tab bar
 *   was; on a desktop the same bar slides up once the in-page buttons scroll
 *   out of view.
 * - Delivery is a date range computed from the published estimate, not a
 *   number of days the customer has to count forward from.
 * - Adding to the cart confirms in a toast with a route to the cart, and
 *   the photo flies to the cart icon.
 * - Customers can write a review from the Reviews tab. It is saved to their
 *   own account, exactly as in the app, and is labelled as theirs.
 * - The page records itself in recently viewed and publishes Product
 *   structured data, so search engines can show the price and availability.
 */

const TABS = ["Details", "Specifications", "Reviews"] as const;
type Tab = (typeof TABS)[number];

export function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    productById,
    catalogReady,
    cart,
    commerce,
    updateCommerce,
    session,
    products,
    add: addSilently,
    select,
  } = useShop();
  const config = usePublishedConfig();
  const terms = useDeliveryTerms();
  const toast = useToast();
  const { add } = useQuickAdd();

  const product = id ? productById[id] : undefined;
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<Tab>("Details");
  const [size, setSize] = useState<string>();
  const [color, setColor] = useState<string>();
  const [needChoice, setNeedChoice] = useState<"size" | "color" | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const choiceRef = useRef<HTMLDivElement>(null);

  const galleryRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLElement>(null);
  const [actions, actionsVisible] = useInView<HTMLDivElement>({ initial: true });

  useRecordView(product);
  const recentlyViewed = useRecentlyViewed(product?.id, 12);

  useEffect(() => {
    setQty(1);
    setTab("Details");
    setSize(undefined);
    setColor(undefined);
    setNeedChoice(null);
  }, [id]);

  const gallery = useMemo(() => {
    if (!product) return [] as string[];
    const main = bundledImage(product);
    const own = [...(product.images ?? []), ...(product.imageUrl ? [product.imageUrl] : [])];
    return [...new Set([main, ...own].filter((x): x is string => Boolean(x)))].slice(0, 8);
  }, [product]);

  /* Undefined, not 4.5, when the catalogue has no rating for this product. */
  const rating = useMemo(() => {
    const parsed = Number.parseFloat(product?.rating ?? "");
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [product]);

  const myReview = useMemo(
    () => (product ? commerce.reviews.find((r) => r.productId === product.id) : undefined),
    [commerce.reviews, product],
  );

  const related = useMemo(() => {
    if (!product) return [];
    const sameCategory = products.filter(
      (p) => p.id !== product.id && p.category === product.category && p.stock > 0,
    );
    /* Nearest in price first: someone looking at a Rs.500 watch is better
       served by other Rs.500 watches than by the most expensive one. */
    return sameCategory
      .sort((a, b) => Math.abs(a.price - product.price) - Math.abs(b.price - product.price))
      .slice(0, 10);
  }, [products, product]);

  const url = typeof window !== "undefined" ? window.location.href : "";
  useDocumentMeta({
    title: product ? `${product.name} | ${config.branding.companyName}` : undefined,
    description: product
      ? (product.description?.slice(0, 160) ??
        `${product.name} — ${rs(product.price)} at ${config.branding.companyName}. ${freeDeliveryCopy(terms)}.`)
      : undefined,
    image: gallery[0],
    jsonLd:
      product && config.seo.productSchema
        ? {
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Product",
                name: product.name,
                sku: product.id,
                image: gallery,
                description: product.description || product.name,
                category: product.category,
                ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
                offers: {
                  "@type": "Offer",
                  url,
                  priceCurrency: "NPR",
                  price: product.price,
                  availability:
                    product.stock > 0
                      ? "https://schema.org/InStock"
                      : "https://schema.org/OutOfStock",
                  itemCondition: "https://schema.org/NewCondition",
                  seller: {
                    "@type": "Organization",
                    name: product.store || config.branding.companyName,
                  },
                },
              },
              ...(config.seo.breadcrumbSchema
                ? [
                    {
                      "@type": "BreadcrumbList",
                      itemListElement: [
                        { "@type": "ListItem", position: 1, name: "Home", item: `${location.origin}/` },
                        {
                          "@type": "ListItem",
                          position: 2,
                          name: product.category,
                          item: `${location.origin}/#/search?q=${encodeURIComponent(product.category)}`,
                        },
                        { "@type": "ListItem", position: 3, name: product.name, item: url },
                      ],
                    },
                  ]
                : []),
            ],
          }
        : null,
  });

  if (!catalogReady && !product)
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]" aria-busy="true">
        <div className="skeleton aspect-square rounded-xl" />
        <div className="space-y-3">
          <div className="skeleton h-4 w-1/4 rounded-sm" />
          <div className="skeleton h-7 w-3/4 rounded-sm" />
          <div className="skeleton h-5 w-1/3 rounded-sm" />
          <div className="skeleton h-24 w-full rounded-lg" />
          <div className="skeleton h-12 w-full rounded-lg" />
          <div className="skeleton h-32 w-full rounded-lg" />
        </div>
      </div>
    );

  if (!product)
    return (
      <div className="rounded-xl border border-line bg-raised px-6 py-16 text-center">
        <Icon name="box" size={34} strokeWidth={1.4} className="mx-auto text-ink-faint" />
        <h1 className="mt-3 text-xl font-semibold text-ink">Product not available</h1>
        <p className="mt-1 text-sm text-ink-muted">
          This item may have been removed from the catalogue.
        </p>
        <Link
          to="/search"
          className="mt-4 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
        >
          Browse products
        </Link>
      </div>
    );

  const out = product.stock < 1;
  const inCart = unitsInCart(cart, product.id);
  const sizes = sizeOptions(product);
  const colorList = colorOptions(product);
  const chosenColor = color ?? defaultColor(product);
  const choice = { size, color: chosenColor };
  const chart = sizeChartFor(product);
  const freeSize = !sizes.length && (product.sizes ?? []).some((x) => /^free/i.test(x));
  /* A shirt without a size is not an order: ask, and show where. */
  const confirmChoice = () => {
    const missing = missingChoice(product, choice);
    if (!missing) return true;
    setNeedChoice(missing);
    choiceRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    toast({
      message: missing === "size" ? "Choose your size first" : "Choose a colour first",
      tone: "info",
    });
    return false;
  };
  const remaining = Math.max(0, product.stock - inCart);
  const saving = discountPercent(product);
  const cannotAdd = out || remaining < 1;
  const eta = deliveryWindow(terms.estimate);

  const addToCart = () => {
    if (cannotAdd || !confirmChoice()) return;
    const n = Math.min(qty, remaining);
    add(product, galleryRef.current, n, choice);
    setQty(1);
  };
  const buyNow = () => {
    if (cannotAdd || !confirmChoice()) return;
    const n = Math.min(qty, remaining);
    /* No toast: the customer is leaving for checkout, where the item is.
       Buy now checks out this line alone; the rest of the cart stays. */
    for (let i = 0; i < n; i += 1) addSilently(product, choice);
    const key = lineKey({ productId: product.id, ...choice });
    const others = cart.map(lineKey).filter((k) => k !== key);
    if (others.length) select(others, false);
    select([key], true);
    navigate("/checkout");
  };

  const share = async () => {
    const link = window.location.href;
    /* Use the platform sheet when there is one; fall back to the clipboard
       rather than showing three share buttons that did nothing. */
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url: link });
        return;
      } catch {
        /* dismissed */
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      toast({ message: "Link copied", tone: "info" });
    } catch {
      toast({ message: "Could not copy the link", tone: "error" });
    }
  };

  const openReviews = () => {
    setTab("Reviews");
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const seller = product.store || config.branding.companyName;

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-xs text-ink-muted">
          <li>
            <Link to="/" className="hover:text-brand">
              Home
            </Link>
          </li>
          <li aria-hidden="true">
            <Icon name="chevronRight" size={12} />
          </li>
          <li>
            <Link
              to={`/search?q=${encodeURIComponent(product.category)}`}
              className="hover:text-brand"
            >
              {product.category}
            </Link>
          </li>
          <li aria-hidden="true">
            <Icon name="chevronRight" size={12} />
          </li>
          <li className="clamp-1 max-w-[50vw] text-ink" aria-current="page">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-10">
        {/* Gallery — stays in view on a desktop while the buy box scrolls. */}
        <div ref={galleryRef} className="lg:sticky lg:top-40 lg:self-start">
          <ProductGallery product={product} images={gallery} />
        </div>

        {/* Buy box */}
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {(product.brand || product.store) && (
                <Link
                  to={`/search?q=${encodeURIComponent(product.brand ?? seller)}`}
                  className="text-sm font-medium text-brand hover:text-brand-strong"
                >
                  {product.brand ?? seller}
                </Link>
              )}
              <h1 className="mt-0.5 text-2xl font-semibold leading-snug tracking-tight text-ink">
                {product.name}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <WishlistButton
                product={product}
                size={20}
                className="h-11 w-11 border border-line bg-raised hover:border-line-strong"
              />
              <button
                type="button"
                onClick={() => void share()}
                aria-label="Share this product"
                className="grid h-11 w-11 place-items-center rounded-full border border-line bg-raised text-ink-soft hover:border-line-strong hover:text-ink"
              >
                <Icon name="share" size={18} />
              </button>
            </div>
          </div>

          {(rating !== undefined || product.sold != null) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
              {rating !== undefined && (
                <button
                  type="button"
                  onClick={openReviews}
                  className="flex items-center gap-1.5 hover:text-ink"
                >
                  <Stars value={rating} size={15} />
                  <span className="tnum font-semibold text-ink">{rating.toFixed(1)}</span>
                  <span className="sr-only">out of 5. Show reviews</span>
                </button>
              )}
              {rating !== undefined && product.sold != null && (
                <span aria-hidden="true" className="h-3.5 w-px bg-line-strong" />
              )}
              {product.sold != null && (
                <span className="tnum">{product.sold.toLocaleString("en-US")} sold</span>
              )}
            </div>
          )}

          {/* Price */}
          <div className="mt-4 rounded-xl border border-line bg-raised p-4">
            <Price product={product} size="lg" />
            {saving > 0 && (
              <p className="tnum mt-1 inline-flex items-center gap-1.5 rounded-full bg-positive-soft px-2.5 py-0.5 text-sm font-medium text-positive">
                <Icon name="tag" size={13} />
                You save {rs(product.originalPrice! - product.price)}
              </p>
            )}
            <p className="mt-1.5 text-xs text-ink-muted">Inclusive of all taxes</p>
            {!!product.gems && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft">
                <Icon name="gem" size={15} className="text-info" />
                Earn {product.gems} gems when this order is delivered
              </p>
            )}
          </div>

          {/* One voucher line, describing the voucher checkout applies. */}
          {product.voucher && (
            <p className="mt-3 flex items-start gap-2 rounded-lg border border-dashed border-brand bg-brand-soft px-3 py-2.5 text-sm text-brand-strong">
              <Icon name="ticket" size={16} className="mt-0.5 shrink-0" />
              {voucherTerms()}
            </p>
          )}

          {/* Availability */}
          <div className="mt-4 text-sm">
            {out ? (
              <p className="flex items-center gap-2 font-medium text-critical">
                <Icon name="close" size={15} />
                Out of stock
              </p>
            ) : product.stock <= 10 ? (
              <div>
                <p className="tnum flex items-center gap-2 font-medium text-caution">
                  <Icon name="flame" size={15} />
                  Only {product.stock} left in stock
                </p>
                <div className="mt-1.5 h-1.5 max-w-xs overflow-hidden rounded-full bg-caution-soft">
                  <div
                    className="h-full rounded-full bg-caution"
                    style={{ width: `${Math.max(8, product.stock * 10)}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="flex items-center gap-2 font-medium text-positive">
                <Icon name="checkCircle" size={15} />
                In stock
              </p>
            )}
          </div>

          {/* Size and colour */}
          {(sizes.length > 0 || colorList.length > 0 || freeSize) && (
            <div
              ref={choiceRef}
              className={`mt-4 space-y-4 rounded-xl border bg-raised p-4 transition-colors ${
                needChoice ? "border-critical" : "border-line"
              }`}
            >
              {colorList.length > 0 && (
                <fieldset>
                  <legend className="text-sm font-semibold text-ink">
                    Colour
                    <span className="ml-2 font-normal text-ink-muted">
                      {chosenColor ?? (colorList.length > 1 ? "Choose one" : "")}
                    </span>
                  </legend>
                  <div className="mt-2.5 flex flex-wrap gap-2.5">
                    {colorList.map((option) => {
                      const active = option.name === chosenColor;
                      return (
                        <button
                          key={option.name}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          aria-label={`Colour ${option.name}`}
                          title={option.name}
                          onClick={() => {
                            setColor(option.name);
                            if (needChoice === "color") setNeedChoice(null);
                          }}
                          className={`grid h-10 w-10 place-items-center rounded-full border-2 transition-colors ${
                            active ? "border-ink" : "border-transparent hover:border-line-strong"
                          }`}
                        >
                          <span
                            className="h-8 w-8 rounded-full border border-black/10"
                            style={{ backgroundColor: option.hex || "var(--color-line)" }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}
              {sizes.length > 0 && (
                <fieldset>
                  <div className="flex items-center justify-between gap-3">
                    <legend className="text-sm font-semibold text-ink">
                      Size
                      <span
                        className={`ml-2 font-normal ${
                          needChoice === "size" ? "text-critical" : "text-ink-muted"
                        }`}
                      >
                        {size ?? "Choose your size"}
                      </span>
                    </legend>
                    {chart && (
                      <button
                        type="button"
                        onClick={() => setGuideOpen(true)}
                        className="flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-strong"
                      >
                        <Icon name="ruler" size={15} />
                        Size guide
                      </button>
                    )}
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {sizes.map((option) => {
                      const active = option === size;
                      return (
                        <button
                          key={option}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          aria-label={`Size ${option}`}
                          onClick={() => {
                            setSize(option);
                            if (needChoice === "size") setNeedChoice(null);
                          }}
                          className={`tnum h-11 min-w-[52px] rounded-lg border px-3 text-sm transition-colors ${
                            active
                              ? "border-2 border-ink bg-sunken font-semibold text-ink"
                              : "border-line bg-raised text-ink hover:border-line-strong"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  {product.fit && (
                    <p className="mt-2.5 flex items-center gap-1.5 text-sm text-ink-muted">
                      <Icon name="shirt" size={14} />
                      Fit: {product.fit}
                    </p>
                  )}
                </fieldset>
              )}
              {freeSize && (
                <p className="flex items-start gap-2 text-sm">
                  <Icon name="ruler" size={16} className="mt-0.5 shrink-0 text-brand" />
                  <span>
                    <span className="block font-medium text-ink">Free size</span>
                    <span className="block text-ink-muted">{product.fit || "One size fits most."}</span>
                  </span>
                </p>
              )}
            </div>
          )}

          {!out && (
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <span id="qty-label" className="text-sm text-ink-muted">
                  Quantity
                </span>
                <QuantityStepper
                  value={qty}
                  max={Math.max(1, remaining)}
                  onChange={setQty}
                  labelledBy="qty-label"
                />
              </div>
              {inCart > 0 && (
                <Link to="/cart" className="tnum text-sm text-ink-muted hover:text-brand">
                  {inCart} already in your cart
                </Link>
              )}
            </div>
          )}

          <div ref={actions} className="mt-5 hidden gap-2.5 lg:grid lg:grid-cols-2">
            <button
              type="button"
              disabled={cannotAdd}
              onClick={addToCart}
              className="flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-brand bg-raised text-base font-semibold text-brand transition-colors hover:bg-brand-soft active:scale-[0.98] disabled:border-line disabled:bg-sunken disabled:text-ink-faint"
            >
              <Icon name="cartPlus" size={18} />
              {remaining < 1 && !out
                ? "All in your cart"
                : sizes.length && !size
                  ? "Select size"
                  : "Add to cart"}
            </button>
            <button
              type="button"
              disabled={cannotAdd}
              onClick={buyNow}
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-brand text-base font-semibold text-white shadow-e1 transition-colors hover:bg-brand-strong active:scale-[0.98] disabled:bg-line-strong disabled:text-ink-faint"
            >
              <Icon name="bolt" size={17} />
              Buy now
            </button>
          </div>

          {/* Delivery and returns, from the shared terms module. */}
          <ul className="mt-5 divide-y divide-line rounded-xl border border-line bg-raised">
            <li className="flex items-start gap-3 p-3.5">
              <Icon name="truck" size={19} className="mt-0.5 shrink-0 text-brand" />
              <div className="text-sm">
                <p className="font-medium text-ink">
                  {eta ? (
                    <>
                      Arrives <span className="text-positive">{eta}</span>
                    </>
                  ) : (
                    `Delivery ${terms.estimate}`
                  )}
                </p>
                <p className="text-ink-muted">
                  {freeDeliveryCopy(terms)} · Cash on delivery available
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 p-3.5">
              <Icon name="undo" size={19} className="mt-0.5 shrink-0 text-brand" />
              <div className="text-sm">
                <p className="font-medium text-ink">
                  {terms.returnDays}-day returns and size exchange
                </p>
                <p className="text-ink-muted">
                  Wrong size? Exchange or return it unworn, with tags attached, from the delivery
                  date.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 p-3.5">
              <Icon name="store" size={19} className="mt-0.5 shrink-0 text-brand" />
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="text-ink-muted">Sold by</p>
                  <p className="clamp-1 font-medium text-ink">{seller}</p>
                </div>
                <Link
                  to={`/search?q=${encodeURIComponent(seller)}`}
                  className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-brand hover:text-brand"
                >
                  Visit store
                </Link>
              </div>
            </li>
          </ul>

          {!session && !out && (
            <p className="mt-4 text-sm text-ink-muted">
              <Link to="/auth" className="font-medium text-brand hover:text-brand-strong">
                Sign in
              </Link>{" "}
              to keep your cart and orders in sync with the app.
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <section ref={tabsRef} className="mt-10 scroll-mt-40">
        <div
          role="tablist"
          aria-label="Product information"
          className="flex gap-1 overflow-x-auto border-b border-line"
        >
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              id={`tab-${t}`}
              aria-selected={tab === t}
              aria-controls={`panel-${t}`}
              tabIndex={tab === t ? 0 : -1}
              onClick={() => setTab(t)}
              onKeyDown={(e) => {
                const i = TABS.indexOf(tab);
                if (e.key === "ArrowRight") setTab(TABS[(i + 1) % TABS.length]);
                if (e.key === "ArrowLeft") setTab(TABS[(i - 1 + TABS.length) % TABS.length]);
              }}
              className={`relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                tab === t ? "text-brand" : "text-ink-muted hover:text-ink"
              }`}
            >
              {t}
              {t === "Reviews" && myReview && (
                <span className="ml-1.5 rounded-full bg-sunken px-1.5 text-2xs text-ink-muted">1</span>
              )}
              <span
                aria-hidden="true"
                className={`absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand transition-transform duration-300 ease-out-quint ${
                  tab === t ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </button>
          ))}
        </div>

        <div
          key={tab}
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          className="animate-fade-in pt-5"
        >
          {tab === "Details" && (
            <div className="space-y-4">
              {product.description && (
                <p className="max-w-3xl whitespace-pre-line text-base leading-relaxed text-ink-soft">
                  {product.description}
                </p>
              )}
              {!!product.highlights?.length && (
                <ul className="grid max-w-3xl gap-2 sm:grid-cols-2">
                  {product.highlights.map((line) => (
                    <li key={line} className="flex items-start gap-2 text-sm text-ink">
                      <Icon name="check" size={16} className="mt-0.5 shrink-0 text-positive" />
                      {line}
                    </li>
                  ))}
                </ul>
              )}
              {!!product.care?.length && (
                <div className="max-w-3xl rounded-lg border border-line bg-raised p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Icon name="droplet" size={16} className="text-brand" />
                    Wash and care
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                    {product.care.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
              <ul className="grid gap-3 sm:grid-cols-2">
                {[
                  product.fabric && {
                    icon: "shirt",
                    title: product.fabric,
                    note: product.fit ? `Fit: ${product.fit}` : "Fabric as listed by the store.",
                  },
                  product.brand && {
                    icon: "badgeCheck",
                    title: product.brand,
                    note: "Brand as listed by the seller.",
                  },
                  product.fastDelivery && {
                    icon: "truckFast",
                    title: "Fast delivery eligible",
                    note: "Dispatched ahead of standard orders.",
                  },
                  product.voucher && {
                    icon: "ticket",
                    title: "Voucher eligible",
                    note: voucherTerms(),
                  },
                  product.gems && {
                    icon: "gem",
                    title: `${product.gems} gems`,
                    note: "Credited after the order is delivered.",
                  },
                  !out && {
                    icon: "box",
                    title: `${product.stock} in stock`,
                    note: "Ships from the store's Nepal warehouse.",
                  },
                ]
                  .filter((x): x is { icon: string; title: string; note: string } => Boolean(x))
                  .map((h) => (
                    <li
                      key={h.title}
                      className="flex items-start gap-3 rounded-lg border border-line bg-raised p-3.5"
                    >
                      <Icon name={h.icon} size={19} className="mt-0.5 shrink-0 text-brand" />
                      <span>
                        <span className="block text-sm font-medium text-ink">{h.title}</span>
                        <span className="block text-sm text-ink-muted">{h.note}</span>
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {tab === "Specifications" && (
            <div className="max-w-3xl overflow-hidden rounded-lg border border-line">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-line">
                  {(
                    [
                      ["Product ID", product.id],
                      ["Brand", product.brand],
                      ["Category", product.category],
                      ["For", product.gender],
                      ["Fabric", product.fabric],
                      ["Fit", product.fit],
                      ["Sizes", product.sizes?.join(", ")],
                      ["Colours", colorList.map((c) => c.name).join(", ")],
                      ["Seller", product.store],
                      ["Availability", out ? "Out of stock" : `${product.stock} in stock`],
                      ["Price", rs(product.price)],
                      rating !== undefined && ["Rating", `${rating.toFixed(1)} out of 5`],
                    ] as ([string, string | undefined] | false)[]
                  )
                    .filter((row): row is [string, string] => Boolean(row && row[1]))
                    .map(([k, v]) => (
                      <tr key={k} className="odd:bg-raised even:bg-sunken">
                        <th scope="row" className="w-2/5 px-4 py-2.5 text-left font-medium text-ink-muted">
                          {k}
                        </th>
                        <td className="px-4 py-2.5 text-ink">{v}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "Reviews" && (
            <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
              {/* No histogram, because there is no review data to build one
                  from. The average is shown only when the catalogue has one. */}
              <div>
                {rating !== undefined ? (
                  <div className="rounded-lg border border-line bg-raised p-4">
                    <p className="tnum text-4xl font-semibold text-ink">{rating.toFixed(1)}</p>
                    <Stars value={rating} size={18} className="mt-1" />
                    <p className="mt-1 text-sm text-ink-muted">Average rating out of 5</p>
                  </div>
                ) : (
                  <p className="rounded-lg border border-line bg-raised p-4 text-sm text-ink-muted">
                    This product has no rating yet.
                  </p>
                )}
              </div>
              <ReviewPanel
                key={product.id}
                productId={product.id}
                existing={myReview}
                signedIn={!!session}
                authorName={commerce.profile.name || "You"}
                onSave={(review) =>
                  updateCommerce((current) => ({
                    ...current,
                    reviews: [
                      ...current.reviews.filter((r) => r.productId !== product.id),
                      { productId: product.id, ...review },
                    ],
                  }))
                }
                onDelete={() =>
                  updateCommerce((current) => ({
                    ...current,
                    reviews: current.reviews.filter((r) => r.productId !== product.id),
                  }))
                }
              />
            </div>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="reveal mt-10">
          <div className="mb-3 flex items-end justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight text-ink">
              Similar in {product.category}
            </h2>
            <Link
              to={`/search?q=${encodeURIComponent(product.category)}`}
              className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:text-brand-strong"
            >
              See all
              <Icon name="chevronRight" size={14} />
            </Link>
          </div>
          <Rail label={`Similar in ${product.category}`}>
            {related.map((p) => (
              <li key={p.id} className="w-[168px] sm:w-[200px]">
                <ProductCard product={p} />
              </li>
            ))}
          </Rail>
        </section>
      )}

      {recentlyViewed.length > 0 && (
        <section className="reveal mt-10">
          <h2 className="mb-3 text-xl font-semibold tracking-tight text-ink">Recently viewed</h2>
          <Rail label="Recently viewed">
            {recentlyViewed.map((p) => (
              <li key={p.id}>
                <ProductCardCompact product={p} />
              </li>
            ))}
          </Rail>
        </section>
      )}

      {chart && guideOpen && (
        <SizeGuideDialog
          chart={chart}
          selected={size}
          onPick={(value) => {
            setSize(value);
            setNeedChoice(null);
            setGuideOpen(false);
          }}
          onClose={() => setGuideOpen(false)}
        />
      )}

      {/* The action bar. Always present on phones and tablets, where it takes
          the tab bar's place; on a desktop it rises only once the in-page
          buttons have scrolled away. */}
      <div
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-raised/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgb(20_22_26/0.06)] backdrop-blur-md transition-transform duration-300 ease-out-quint ${
          actionsVisible ? "lg:translate-y-full" : "lg:translate-y-0"
        }`}
        aria-hidden={false}
      >
        <div className="page flex items-center gap-3 py-2.5">
          <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
            {gallery[0] && (
              <img
                src={gallery[0]}
                alt=""
                className="h-11 w-11 shrink-0 rounded-md border border-line object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="clamp-1 text-sm font-medium text-ink">{product.name}</p>
              <p className="tnum text-sm font-bold text-brand">{rs(product.price)}</p>
            </div>
          </div>
          <Link
            to="/cart"
            aria-label="Go to cart"
            className="relative grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-line text-ink lg:hidden"
          >
            <Icon name="cart" size={20} />
          </Link>
          <button
            type="button"
            disabled={cannotAdd}
            onClick={addToCart}
            className="flex h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg border-2 border-brand bg-raised px-2 text-sm font-semibold text-brand active:scale-[0.98] disabled:border-line disabled:text-ink-faint sm:px-4 lg:w-48 lg:flex-none"
          >
            <Icon name="cartPlus" size={17} className="hidden sm:block" />
            {out
              ? "Out of stock"
              : remaining < 1
                ? "All in cart"
                : sizes.length && !size
                  ? "Select size"
                  : "Add to cart"}
          </button>
          <button
            type="button"
            disabled={cannotAdd}
            onClick={buyNow}
            className="flex h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand px-2 text-sm font-semibold text-white active:scale-[0.98] sm:px-4 disabled:bg-line-strong disabled:text-ink-faint lg:w-48 lg:flex-none"
          >
            Buy now
          </button>
        </div>
      </div>
    </div>
  );
}

/* The product's size chart. Choosing a row picks that size. */
function SizeGuideDialog({
  chart,
  selected,
  onPick,
  onClose,
}: {
  chart: SizeChart;
  selected?: string;
  onPick: (size: string) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close size guide"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-guide-title"
        className="relative max-h-[88vh] w-full overflow-y-auto rounded-t-2xl bg-raised p-5 shadow-e3 sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="size-guide-title" className="text-lg font-semibold text-ink">
            Size guide · {chart.title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 place-items-center rounded-full text-ink-soft hover:bg-sunken"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border border-line">
          <table className="w-full text-center text-sm">
            <thead className="bg-sunken text-xs text-ink-muted">
              <tr>
                {["Size", ...chart.columns].map((h) => (
                  <th key={h} scope="col" className="px-2 py-2.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {chart.rows.map((row) => (
                <tr
                  key={row.size}
                  className={`cursor-pointer hover:bg-brand-soft ${row.size === selected ? "bg-brand-soft" : ""}`}
                  onClick={() => onPick(row.size)}
                >
                  <th scope="row" className="px-2 py-2.5 font-semibold text-ink">
                    <button type="button" onClick={() => onPick(row.size)} className="w-full">
                      {row.size}
                    </button>
                  </th>
                  {row.values.map((v, i) => (
                    <td key={i} className="tnum px-2 py-2.5 text-ink-soft">
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="mt-4 text-sm font-semibold text-ink">How to measure</h3>
        <ul className="mt-1.5 space-y-1 text-sm text-ink-muted">
          {chart.howToMeasure.map((line) => (
            <li key={line} className="flex gap-2">
              <Icon name="ruler" size={14} className="mt-0.5 shrink-0" />
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-muted">
          Measurements are of the body, not the garment. Between sizes? Pick the larger for a
          relaxed fit.
        </p>
      </div>
    </div>
  );
}

export function QuantityStepper({
  value,
  max,
  onChange,
  labelledBy,
  size = "md",
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  labelledBy?: string;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <div
      className="flex items-center rounded-lg border border-line bg-raised"
      role="group"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        className={`grid ${box} place-items-center rounded-l-lg text-ink-soft hover:bg-sunken active:bg-line disabled:opacity-30`}
      >
        <Icon name="minus" size={15} />
      </button>
      <input
        type="number"
        value={value}
        min={1}
        max={max}
        aria-label="Quantity"
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10);
          if (Number.isFinite(n)) onChange(Math.min(Math.max(1, n), max));
        }}
        className={`tnum ${size === "sm" ? "h-8 w-9" : "h-10 w-12"} border-x border-line bg-transparent text-center text-sm font-semibold text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
      />
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={`grid ${box} place-items-center rounded-r-lg text-ink-soft hover:bg-sunken active:bg-line disabled:opacity-30`}
      >
        <Icon name="plus" size={15} />
      </button>
    </div>
  );
}

function ReviewPanel({
  productId,
  existing,
  signedIn,
  authorName,
  onSave,
  onDelete,
}: {
  productId: string;
  existing?: { rating: number; text: string };
  signedIn: boolean;
  authorName: string;
  onSave: (review: { rating: number; text: string }) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(!existing);
  const [stars, setStars] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState(existing?.text ?? "");
  const [error, setError] = useState("");
  const toast = useToast();
  const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

  if (!signedIn)
    return (
      <div className="rounded-lg border border-line bg-raised px-6 py-10 text-center">
        <Icon name="message" size={30} strokeWidth={1.4} className="mx-auto text-ink-faint" />
        <p className="mt-3 text-sm font-medium text-ink">Bought this item?</p>
        <p className="mt-1 text-sm text-ink-muted">Sign in to rate it and write a review.</p>
        <Link
          to="/auth"
          className="mt-4 inline-block rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-brand hover:text-brand"
        >
          Sign in to review
        </Link>
      </div>
    );

  if (existing && !editing)
    return (
      <div className="rounded-lg border border-line bg-raised p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand-strong">
              {authorName.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <p className="text-sm font-medium text-ink">{authorName}</p>
              <p className="text-xs text-ink-muted">Your review · saved to your account</p>
            </div>
          </div>
          <Stars value={existing.rating} size={14} />
        </div>
        <p className="mt-3 whitespace-pre-line text-sm text-ink-soft">{existing.text}</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:border-line-strong"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              onDelete();
              setStars(0);
              setText("");
              setEditing(true);
              toast({ message: "Review deleted", tone: "info" });
            }}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted hover:text-critical"
          >
            Delete
          </button>
        </div>
      </div>
    );

  const shown = hover || stars;
  return (
    <form
      className="rounded-lg border border-line bg-raised p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!stars) return setError("Choose a star rating.");
        if (text.trim().length < 5) return setError("Write at least 5 characters about the product.");
        setError("");
        onSave({ rating: stars, text: text.trim() });
        setEditing(false);
        toast({ message: "Thanks — your review is saved" });
      }}
    >
      <h3 className="text-base font-semibold text-ink">
        {existing ? "Edit your review" : "Rate this product"}
      </h3>
      <fieldset className="mt-3">
        <legend className="sr-only">Rating</legend>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
              <input
                type="radio"
                name={`rating-${productId}`}
                value={n}
                checked={stars === n}
                onChange={() => setStars(n)}
                className="peer sr-only"
              />
              <span className="sr-only">
                {n} star{n === 1 ? "" : "s"}
              </span>
              <Icon
                name={n <= shown ? "starFilled" : "star"}
                size={30}
                className={`rounded-sm transition-transform duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-brand hover:scale-110 ${
                  n <= shown ? "text-star" : "text-ink-faint"
                }`}
              />
            </label>
          ))}
          <span className="ml-2 text-sm font-medium text-ink-muted" aria-live="polite">
            {LABELS[shown]}
          </span>
        </div>
      </fieldset>
      <label htmlFor={`review-${productId}`} className="mt-4 block text-sm font-medium text-ink">
        Your review
      </label>
      <textarea
        id={`review-${productId}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={1000}
        placeholder="What did you like or dislike? How was the quality?"
        className="mt-1 w-full rounded-lg border border-line bg-raised px-3 py-2.5 text-base text-ink outline-none placeholder:text-ink-faint focus:border-brand"
      />
      <div className="mt-1 flex justify-between text-xs text-ink-muted">
        <span>Saved privately to your account.</span>
        <span className="tnum">{text.length}/1000</span>
      </div>
      {error && (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-critical">
          <Icon name="alert" size={14} />
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
        >
          Save review
        </button>
        {existing && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink hover:border-line-strong"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
