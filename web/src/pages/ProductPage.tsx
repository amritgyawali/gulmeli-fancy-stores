import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { ProductVisual, Price, ProductCard } from "@/components/ProductCard";
import { Icon, Stars } from "@/components/Icon";
import { bundledImage } from "@/lib/images";
import { rs } from "@/lib/format";
import { useDeliveryTerms, freeDeliveryCopy } from "@/lib/shipping";
import { voucherTerms } from "@/lib/commerce";

/*
 * Product details.
 *
 * This page carried more invented content than any other, all of it phrased
 * as fact about the specific product on screen:
 *
 * - "Mall Verified Seller" and "100% Authentic Brand Guarantee" on every
 *   product, regardless of seller.
 * - A seller scorecard reading "Positive Rating 94% · Ship on Time 98% ·
 *   Chat Rate 96%" — the same three numbers for every store in the catalogue.
 * - A five-bar rating histogram generated from `rating * 17`, captioned
 *   "Verified Customer Ratings", above a review list that was empty.
 * - A review count of `sold`, or `rating * 40` when `sold` was missing.
 * - A default rating of 4.5 for products with no rating at all.
 * - Two vouchers ("Min. spend Rs. 2,500 capped at Rs. 250", "Free delivery
 *   over Rs. 2,000") that checkout does not honour.
 * - "Standard Delivery Rs. 50 / Express Rs. 100" to "Bagmati, Kathmandu",
 *   none of it from config or from the customer's address.
 * - "14 Days Free Return", where the footer promised 7.
 * - A "Hover to zoom" badge over an image that scales 5% and does not zoom.
 *
 * Everything above is gone. What is left is what the catalogue actually
 * knows, plus delivery and voucher terms read from the same modules the cart
 * and checkout use. A product with no rating now shows no rating.
 */

const TABS = ["Details", "Specifications", "Reviews"] as const;
type Tab = (typeof TABS)[number];

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
  const terms = useDeliveryTerms();

  const product = id ? productById[id] : undefined;
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<Tab>("Details");
  const [notice, setNotice] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setQty(1);
    setNotice("");
    setActiveImage(0);
    setTab("Details");
  }, [id]);

  useEffect(() => {
    if (product) document.title = product.name;
  }, [product]);

  const gallery = useMemo(() => {
    if (!product) return [] as string[];
    const own = [...(product.images ?? []), ...(product.imageUrl ? [product.imageUrl] : [])];
    const main = bundledImage(product);
    return [...new Set([main, ...own].filter((x): x is string => Boolean(x)))].slice(0, 6);
  }, [product]);

  /* Undefined, not 4.5, when the catalogue has no rating for this product. */
  const rating = useMemo(() => {
    const parsed = Number.parseFloat(product?.rating ?? "");
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [product]);

  const myReviews = useMemo(
    () => (product ? commerce.reviews.filter((r) => r.productId === product.id) : []),
    [commerce.reviews, product],
  );

  const related = useMemo(
    () =>
      products
        .filter((p) => p.id !== product?.id && p.category === product?.category && p.stock > 0)
        .slice(0, 5),
    [products, product],
  );

  if (!catalogReady && !product)
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="skeleton aspect-square rounded-md" />
        <div className="space-y-3">
          <div className="skeleton h-7 w-3/4 rounded-sm" />
          <div className="skeleton h-5 w-1/3 rounded-sm" />
          <div className="skeleton h-12 w-1/2 rounded-sm" />
          <div className="skeleton h-11 w-full rounded-md" />
        </div>
      </div>
    );

  if (!product)
    return (
      <div className="rounded-md border border-line bg-raised px-6 py-16 text-center">
        <Icon name="box" size={34} strokeWidth={1.4} className="mx-auto text-ink-faint" />
        <h1 className="mt-3 text-xl font-semibold text-ink">Product not available</h1>
        <p className="mt-1 text-sm text-ink-muted">
          This item may have been removed from the catalogue.
        </p>
        <Link
          to="/search"
          className="mt-4 inline-block rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
        >
          Browse products
        </Link>
      </div>
    );

  const out = product.stock < 1;
  const inCart = cart.find((i) => i.productId === product.id)?.quantity ?? 0;
  const remaining = Math.max(0, product.stock - inCart);
  const wished = commerce.wishlist.includes(product.id);

  const addToCart = () => {
    for (let i = 0; i < qty; i += 1) add(product);
    setNotice(`${qty} added to your cart.`);
    window.setTimeout(() => setNotice(""), 4000);
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
  const share = async () => {
    const url = window.location.href;
    /* Use the platform sheet when there is one; fall back to the clipboard
       rather than showing three share buttons that did nothing. */
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url });
        return;
      } catch {
        /* dismissed */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Gallery */}
        <div>
          <div className="media aspect-square w-full rounded-md border border-line">
            {gallery[activeImage] ? (
              <img
                src={gallery[activeImage]}
                alt={`${product.name}${gallery.length > 1 ? `, image ${activeImage + 1} of ${gallery.length}` : ""}`}
                className="object-contain"
              />
            ) : (
              <ProductVisual product={product} fit="contain" />
            )}
            {product.badge && !out && (
              <span className="absolute left-3 top-3 rounded-xs bg-brand px-2 py-1 text-2xs font-bold uppercase tracking-wide text-white">
                {product.badge}
              </span>
            )}
          </div>

          {gallery.length > 1 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {gallery.map((src, i) => (
                <li key={src + i}>
                  <button
                    type="button"
                    onClick={() => setActiveImage(i)}
                    aria-label={`Show image ${i + 1}`}
                    aria-current={activeImage === i}
                    className={`media h-16 w-16 rounded-sm border-2 ${
                      activeImage === i ? "border-brand" : "border-line hover:border-line-strong"
                    }`}
                  >
                    <img src={src} alt="" loading="lazy" className="object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleWish}
              aria-pressed={wished}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${
                wished
                  ? "border-brand bg-brand-soft text-brand-strong"
                  : "border-line text-ink-soft hover:border-line-strong"
              }`}
            >
              <Icon name={wished ? "heartFilled" : "heart"} size={16} />
              {wished ? "Saved" : "Save"}
            </button>
            <button
              type="button"
              onClick={share}
              className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium text-ink-soft hover:border-line-strong"
            >
              <Icon name={copied ? "check" : "share"} size={16} />
              {copied ? "Link copied" : "Share"}
            </button>
          </div>
        </div>

        {/* Buy panel */}
        <div>
          <h1 className="text-2xl font-semibold leading-snug text-ink">{product.name}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
            {rating !== undefined && (
              <span className="flex items-center gap-1.5">
                <Stars value={rating} size={14} />
                <span className="tnum font-medium text-ink">{rating.toFixed(1)}</span>
              </span>
            )}
            {product.sold != null && (
              <span className="tnum">{product.sold.toLocaleString("en-US")} sold</span>
            )}
            {(product.brand || product.store) && (
              <span>
                by{" "}
                <Link
                  to={`/search?q=${encodeURIComponent(product.store ?? product.brand!)}`}
                  className="font-medium text-ink hover:text-brand"
                >
                  {product.store ?? product.brand}
                </Link>
              </span>
            )}
          </div>

          <div className="mt-4 rounded-md border border-line bg-sunken p-4">
            <Price product={product} size="lg" />
            <p className="mt-1 text-xs text-ink-muted">Inclusive of all taxes</p>
            {!!product.gems && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft">
                <Icon name="gem" size={15} className="text-info" />
                Earn {product.gems} gems on this order
              </p>
            )}
          </div>

          {/* One voucher line, describing the voucher checkout actually
              applies, instead of two invented ones. */}
          {product.voucher && (
            <p className="mt-3 flex items-start gap-2 rounded-md border border-brand-border bg-brand-soft px-3 py-2.5 text-sm text-brand-strong">
              <Icon name="ticket" size={16} className="mt-0.5 shrink-0" />
              {voucherTerms()}
            </p>
          )}

          {/* Availability */}
          <p className="mt-4 flex items-center gap-2 text-sm">
            {out ? (
              <span className="flex items-center gap-2 font-medium text-critical">
                <Icon name="close" size={15} />
                Out of stock
              </span>
            ) : product.stock <= 10 ? (
              <span className="tnum flex items-center gap-2 font-medium text-caution">
                <Icon name="alert" size={15} />
                Only {product.stock} left
              </span>
            ) : (
              <span className="flex items-center gap-2 font-medium text-positive">
                <Icon name="checkCircle" size={15} />
                In stock
              </span>
            )}
          </p>

          {!out && (
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <span id="qty-label" className="text-sm text-ink-muted">
                  Quantity
                </span>
                <div
                  className="flex items-center rounded-md border border-line"
                  role="group"
                  aria-labelledby="qty-label"
                >
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    className="grid h-10 w-10 place-items-center text-ink-soft hover:bg-sunken disabled:opacity-30"
                  >
                    <Icon name="minus" size={15} />
                  </button>
                  <input
                    type="number"
                    value={qty}
                    min={1}
                    max={Math.max(1, remaining)}
                    aria-label="Quantity"
                    onChange={(e) => {
                      const n = Number.parseInt(e.target.value, 10);
                      if (Number.isFinite(n))
                        setQty(Math.min(Math.max(1, n), Math.max(1, remaining)));
                    }}
                    className="tnum h-10 w-12 border-x border-line bg-transparent text-center text-sm font-semibold text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQty((q) => Math.min(remaining, q + 1))}
                    disabled={qty >= remaining}
                    className="grid h-10 w-10 place-items-center text-ink-soft hover:bg-sunken disabled:opacity-30"
                  >
                    <Icon name="plus" size={15} />
                  </button>
                </div>
              </div>
              {inCart > 0 && (
                <p className="tnum text-sm text-ink-muted">{inCart} already in your cart</p>
              )}
            </div>
          )}

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              disabled={out || remaining < 1}
              onClick={buyNow}
              className="flex h-12 items-center justify-center gap-2 rounded-md bg-brand text-base font-semibold text-white hover:bg-brand-strong disabled:bg-line-strong disabled:text-ink-faint"
            >
              Buy now
            </button>
            <button
              type="button"
              disabled={out || remaining < 1}
              onClick={addToCart}
              className="flex h-12 items-center justify-center gap-2 rounded-md border border-brand bg-brand-soft text-base font-semibold text-brand-strong hover:bg-brand-border disabled:border-line disabled:bg-sunken disabled:text-ink-faint"
            >
              <Icon name="cartPlus" size={18} />
              Add to cart
            </button>
          </div>

          {/* Status messages announce themselves rather than appearing only
              visually — the old toast had no live region. */}
          <div aria-live="polite">
            {notice && (
              <p className="mt-3 flex items-center gap-2 rounded-md border border-positive/30 bg-positive-soft px-3 py-2.5 text-sm font-medium text-positive">
                <Icon name="checkCircle" size={16} />
                {notice}
                <Link to="/cart" className="ml-auto underline">
                  View cart
                </Link>
              </p>
            )}
          </div>

          {/* Delivery and returns, from the shared terms module. */}
          <ul className="mt-5 divide-y divide-line rounded-md border border-line">
            <li className="flex items-start gap-3 p-3.5">
              <Icon name="truck" size={19} className="mt-0.5 shrink-0 text-ink-muted" />
              <div className="text-sm">
                <p className="font-medium text-ink">Delivery {terms.estimate}</p>
                <p className="text-ink-muted">{freeDeliveryCopy(terms)}</p>
              </div>
            </li>
            <li className="flex items-start gap-3 p-3.5">
              <Icon name="undo" size={19} className="mt-0.5 shrink-0 text-ink-muted" />
              <div className="text-sm">
                <p className="font-medium text-ink">{terms.returnDays}-day returns</p>
                <p className="text-ink-muted">
                  Unused items in original packaging, from the delivery date.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 p-3.5">
              <Icon name="shieldCheck" size={19} className="mt-0.5 shrink-0 text-ink-muted" />
              <div className="text-sm">
                <p className="font-medium text-ink">Secure payment</p>
                <p className="text-ink-muted">Card, wallet or cash on delivery.</p>
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
      <section className="mt-10">
        <div role="tablist" aria-label="Product information" className="flex border-b border-line">
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
              className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium ${
                tab === t
                  ? "border-brand text-brand"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          className="pt-5"
        >
          {tab === "Details" && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
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
                    className="flex items-start gap-3 rounded-md border border-line bg-raised p-3.5"
                  >
                    <Icon name={h.icon} size={19} className="mt-0.5 shrink-0 text-brand" />
                    <span>
                      <span className="block text-sm font-medium text-ink">{h.title}</span>
                      <span className="block text-sm text-ink-muted">{h.note}</span>
                    </span>
                  </li>
                ))}
            </ul>
          )}

          {tab === "Specifications" && (
            <div className="overflow-hidden rounded-md border border-line">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-line">
                  {(
                    [
                      ["Product ID", product.id],
                      ["Brand", product.brand],
                      ["Category", product.category],
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
            <div>
              {/* No histogram, because there is no review data to build one
                  from. The average is shown only when the catalogue has one. */}
              {rating !== undefined && (
                <div className="mb-5 flex items-center gap-4 rounded-md border border-line bg-raised p-4">
                  <span className="tnum text-4xl font-semibold text-ink">
                    {rating.toFixed(1)}
                  </span>
                  <span>
                    <Stars value={rating} size={16} />
                    <span className="mt-1 block text-sm text-ink-muted">
                      Average rating out of 5
                    </span>
                  </span>
                </div>
              )}

              {myReviews.length > 0 ? (
                <ul className="space-y-3">
                  {myReviews.map((r, i) => (
                    <li key={i} className="rounded-md border border-line bg-raised p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-ink">
                          {commerce.profile.name || "You"}
                        </span>
                        <Stars value={r.rating} size={13} />
                      </div>
                      <p className="mt-2 text-sm text-ink-soft">{r.text}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-md border border-line bg-raised px-6 py-10 text-center">
                  <Icon
                    name="message"
                    size={30}
                    strokeWidth={1.4}
                    className="mx-auto text-ink-faint"
                  />
                  <p className="mt-3 text-sm font-medium text-ink">No written reviews yet</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Reviews appear here once customers who bought this item write one.
                  </p>
                  {!session && (
                    <Link
                      to="/auth"
                      className="mt-4 inline-block rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-brand hover:text-brand"
                    >
                      Sign in to review
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-end justify-between gap-4">
            <h2 className="text-xl font-semibold text-ink">More in {product.category}</h2>
            <Link
              to={`/search?q=${encodeURIComponent(product.category)}`}
              className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:text-brand-strong"
            >
              See all
              <Icon name="chevronRight" size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
