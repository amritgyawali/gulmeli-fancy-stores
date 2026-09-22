import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Product } from "@/lib/types";
import { bundledImage, sized, srcSetFor } from "@/lib/images";
import { rs } from "@/lib/format";
import { useShop } from "@/store/ShopContext";
import { useWishlist } from "@/lib/hooks";
import { Icon, Stars } from "./Icon";
import { flyToCart, useToast } from "./Toast";
import { photoFor } from "../../../mobile/src/services/product-media";

/*
 * The product card, and the pieces of it reused on the product page.
 *
 * Earlier rounds removed an emoji fallback for missing photos and a card that
 * lifted and grew a large soft shadow on hover (moving the pointer across a
 * grid of twenty made the page ripple). Both stay gone: the card itself never
 * moves. What responds to the pointer is inside it — the photo eases in by a
 * few percent within its frame, or crossfades to the second photo when the
 * product has one, which is the convention on every large catalogue.
 *
 * Two actions sit on the photo, the ones customers use from a grid without
 * opening the product: save to wishlist, and add to cart. On a pointer device
 * the add button slides up on hover or focus; on touch it is a small round
 * button that is always visible, because touch has no hover.
 */

export function discountPercent(product: Product) {
  const was = product.originalPrice;
  return was && was > product.price ? Math.round((1 - product.price / was) * 100) : 0;
}

export function ProductVisual({
  product,
  className = "",
  imgClassName = "",
  fit = "cover",
  eager = false,
  width = 400,
}: {
  product: Product;
  className?: string;
  imgClassName?: string;
  fit?: "cover" | "contain";
  eager?: boolean;
  /* Rendered width in CSS pixels; the photo is fetched at this size. */
  width?: number;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const src = bundledImage(product);
  const illustrative =
    product.imageIllustrative || (!product.imageUrl && photoFor(product)?.illustrative);

  if (!src || failed)
    return (
      <div
        className={`media grid h-full w-full place-items-center bg-sunken ${className}`}
        role="img"
        aria-label={`No photo available for ${product.name}`}
      >
        <Icon name="image" size={28} className="text-ink-faint" strokeWidth={1.4} />
      </div>
    );

  return (
    <div className={`media h-full w-full ${className}`}>
      {!loaded && <div className="skeleton absolute inset-0" />}
      <img
        src={sized(src, width)}
        srcSet={srcSetFor(src, width)}
        alt={product.name}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`${fit === "cover" ? "object-cover" : "object-contain"} transition-[opacity,transform] duration-500 ease-out-quint ${
          loaded ? "opacity-100" : "opacity-0"
        } ${imgClassName}`}
      />
      {illustrative && (
        <span className="absolute inset-x-0 bottom-0 bg-ink/55 px-1.5 py-0.5 text-2xs text-white">
          Illustrative photo
        </span>
      )}
    </div>
  );
}

/*
 * Price block. The discount is computed from the two prices rather than read
 * from a free-text `discount` field, so a card can never show "50% off" next
 * to prices that differ by 12%.
 */
export function Price({
  product,
  size = "md",
}: {
  product: Product;
  size?: "sm" | "md" | "lg";
}) {
  const saving = discountPercent(product);
  const scale = {
    sm: { now: "text-base", was: "text-xs" },
    md: { now: "text-lg", was: "text-xs" },
    lg: { now: "text-3xl", was: "text-base" },
  }[size];

  return (
    <div className="tnum flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={`font-bold text-brand ${scale.now}`}>{rs(product.price)}</span>
      {saving > 0 && (
        <>
          <span className={`text-ink-faint line-through ${scale.was}`}>
            {rs(product.originalPrice!)}
          </span>
          {size !== "sm" && (
            <span className={`font-semibold text-positive ${scale.was}`}>-{saving}%</span>
          )}
        </>
      )}
    </div>
  );
}

/* Small factual chips. Only rendered for flags the product actually carries. */
function Attributes({ product }: { product: Product }) {
  const chips: { icon: string; label: string; tone: string }[] = [];
  if (product.fastDelivery)
    chips.push({ icon: "truckFast", label: "Fast delivery", tone: "text-info" });
  if (product.voucher) chips.push({ icon: "ticket", label: "Voucher", tone: "text-brand" });
  if (!chips.length) return null;
  return (
    <ul className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
      {chips.map((c) => (
        <li key={c.label} className={`flex items-center gap-1 text-2xs ${c.tone}`}>
          <Icon name={c.icon} size={12} />
          {c.label}
        </li>
      ))}
    </ul>
  );
}

/* The heart on a card or the product page. */
export function WishlistButton({
  product,
  className = "",
  size = 18,
}: {
  product: Product;
  className?: string;
  size?: number;
}) {
  const { has, toggle } = useWishlist();
  const toast = useToast();
  const [popKey, setPopKey] = useState(0);
  const saved = has(product.id);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const added = toggle(product);
        if (added) setPopKey((k) => k + 1);
        toast({
          message: added ? "Saved to your wishlist" : "Removed from your wishlist",
          tone: added ? "success" : "info",
          action: added ? { label: "View", to: "/wishlist" } : undefined,
        });
      }}
      className={`grid place-items-center rounded-full transition-colors ${
        saved ? "text-critical" : "text-ink-soft hover:text-critical"
      } ${className}`}
    >
      <Icon
        key={popKey}
        name={saved ? "heartFilled" : "heart"}
        size={size}
        className={popKey ? "animate-pop" : undefined}
      />
    </button>
  );
}

/* Adds one unit with the confirmation every add path shares. */
export function useQuickAdd() {
  const { add, cart } = useShop();
  const toast = useToast();
  return {
    inCart: (id: string) => cart.find((i) => i.productId === id)?.quantity ?? 0,
    add: (product: Product, from?: Element | null, quantity = 1) => {
      for (let i = 0; i < quantity; i += 1) add(product);
      flyToCart(from);
      toast({
        message: quantity > 1 ? `${quantity} added to your cart` : "Added to your cart",
        image: sized(bundledImage(product), 96),
        action: { label: "View cart", to: "/cart" },
      });
    },
  };
}

export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  /* The first row of a grid is above the fold; skip lazy-loading there. */
  priority?: boolean;
}) {
  const out = product.stock < 1;
  const rating = Number.parseFloat(product.rating ?? "");
  const lowStock = !out && product.stock <= 5;
  const saving = discountPercent(product);
  const { add, inCart } = useQuickAdd();
  const media = useRef<HTMLDivElement>(null);
  const atLimit = inCart(product.id) >= product.stock;

  /* A second photo, when there is one, is what the pointer reveals. */
  const primary = bundledImage(product);
  const alternate = product.images?.find((src) => src && src !== primary);

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (out || atLimit) return;
    add(product, media.current);
  };

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-raised transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-e2 focus-within:border-brand">
      <div ref={media} className="media aspect-square w-full">
        <ProductVisual
          product={product}
          eager={priority}
          width={280}
          imgClassName={
            alternate
              ? ""
              : "group-hover:scale-[1.045]"
          }
        />
        {alternate && (
          <img
            src={sized(alternate, 280)}
            srcSet={srcSetFor(alternate, 280)}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 [@media(hover:hover)]:group-hover:opacity-100"
          />
        )}

        {/* Badges: the computed discount first, then the catalogue badge. */}
        {!out && (saving > 0 || product.badge) && (
          <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">
            {saving > 0 && (
              <span className="tnum rounded-xs bg-brand px-1.5 py-0.5 text-2xs font-bold text-white">
                -{saving}%
              </span>
            )}
            {product.badge && (
              <span className="rounded-xs bg-ink px-1.5 py-0.5 text-2xs font-bold uppercase tracking-wide text-raised">
                {product.badge}
              </span>
            )}
          </div>
        )}

        <WishlistButton
          product={product}
          size={17}
          className="absolute right-1.5 top-1.5 z-10 h-9 w-9 bg-raised/90 shadow-e1 backdrop-blur-sm"
        />

        {out ? (
          <div className="absolute inset-0 grid place-items-center bg-raised/75">
            <span className="rounded-sm bg-ink px-2.5 py-1 text-2xs font-semibold text-raised">
              Out of stock
            </span>
          </div>
        ) : (
          <>
            {/* Pointer devices: a bar that rises on hover or keyboard focus. */}
            <button
              type="button"
              onClick={quickAdd}
              disabled={atLimit}
              aria-label={`Add ${product.name} to cart`}
              className="absolute inset-x-2 bottom-2 z-10 hidden h-9 translate-y-2 items-center justify-center gap-1.5 rounded-md bg-ink/90 text-sm font-semibold text-raised opacity-0 backdrop-blur-sm transition-[opacity,transform] duration-200 ease-out-quint hover:bg-brand focus-visible:translate-y-0 focus-visible:opacity-100 disabled:bg-ink-faint group-hover:translate-y-0 group-hover:opacity-100 [@media(hover:hover)]:flex"
            >
              <Icon name={atLimit ? "check" : "cartPlus"} size={16} />
              {atLimit ? "In your cart" : "Add to cart"}
            </button>
            {/* Touch: a round button, always visible. */}
            <button
              type="button"
              onClick={quickAdd}
              disabled={atLimit}
              aria-label={`Add ${product.name} to cart`}
              className="absolute bottom-1.5 right-1.5 z-10 grid h-9 w-9 place-items-center rounded-full bg-brand text-white shadow-e2 active:scale-90 disabled:bg-ink-faint [@media(hover:hover)]:hidden"
            >
              <Icon name={atLimit ? "check" : "plus"} size={17} strokeWidth={2.2} />
            </button>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col p-2.5">
        <h3 className="clamp-2 text-sm leading-snug text-ink-soft transition-colors group-hover:text-ink">
          {/* The link covers the whole card via ::after so the entire tile is
              clickable, while the accessible name stays just the title. */}
          <Link
            to={`/product/${product.id}`}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {product.name}
          </Link>
        </h3>

        <div className="mt-auto pt-2">
          <Price product={product} size="sm" />
          {(Number.isFinite(rating) || product.sold != null) && (
            <div className="mt-1 flex items-center gap-1.5">
              {Number.isFinite(rating) && (
                <>
                  <Stars value={rating} size={12} />
                  <span className="tnum text-2xs text-ink-muted">{rating.toFixed(1)}</span>
                </>
              )}
              {product.sold != null && (
                <span className="tnum text-2xs text-ink-faint">
                  {Number.isFinite(rating) && "· "}
                  {compactCount(product.sold)} sold
                </span>
              )}
            </div>
          )}
          <Attributes product={product} />
          {lowStock && (
            <p className="mt-1.5 text-2xs font-medium text-critical">
              Only {product.stock} left
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

/* 1,234 -> 1.2K, the way every marketplace abbreviates sold counts. */
export function compactCount(n: number) {
  return n >= 1000
    ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`
    : n.toLocaleString("en-US");
}

/*
 * A denser variant for horizontal rails, where the card competes with the
 * scroll affordance and cannot afford the attribute chips. With `progress`,
 * it shows how much of the available stock has sold — both numbers come
 * from the catalogue, so the bar is a fact rather than a pressure tactic.
 */
export function ProductCardCompact({
  product,
  progress = false,
  width = "w-[156px]",
}: {
  product: Product;
  progress?: boolean;
  width?: string;
}) {
  const saving = discountPercent(product);
  const sold = product.sold ?? 0;
  const soldShare = sold + product.stock > 0 ? sold / (sold + product.stock) : 0;
  return (
    <article
      className={`group relative flex h-full ${width} flex-col overflow-hidden rounded-lg border border-line bg-raised transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-e2`}
    >
      <div className="media aspect-square w-full">
        <ProductVisual
          product={product}
          width={160}
          imgClassName="group-hover:scale-[1.05]"
        />
        {saving > 0 && (
          <span className="tnum pointer-events-none absolute left-1.5 top-1.5 rounded-xs bg-brand px-1.5 py-0.5 text-2xs font-bold text-white">
            -{saving}%
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-2">
        <h3 className="clamp-2 text-xs leading-snug text-ink-soft group-hover:text-ink">
          <Link
            to={`/product/${product.id}`}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto pt-1.5">
          <Price product={product} size="sm" />
          {progress && sold > 0 && (
            <div className="mt-1.5">
              <div
                className="h-1.5 overflow-hidden rounded-full bg-brand-soft"
                role="img"
                aria-label={`${Math.round(soldShare * 100)}% of stock sold`}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-[#ff8a3d]"
                  style={{ width: `${Math.max(6, Math.round(soldShare * 100))}%` }}
                />
              </div>
              <p className="tnum mt-1 text-2xs text-ink-muted">{compactCount(sold)} sold</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/*
 * The grid wrapper, so every listing on the site uses the same column counts
 * and gutters. Previously Home, Search and Offers each declared their own set
 * of breakpoints and none of them agreed.
 */
export function ProductGrid({
  products,
  children,
}: {
  products: Product[];
  children?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 5} />
      ))}
      {children}
    </div>
  );
}

export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-line bg-raised">
          <div className="skeleton aspect-square" />
          <div className="space-y-2 p-2.5">
            <div className="skeleton h-3 w-11/12 rounded-sm" />
            <div className="skeleton h-3 w-2/3 rounded-sm" />
            <div className="skeleton mt-3 h-4 w-1/3 rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}
