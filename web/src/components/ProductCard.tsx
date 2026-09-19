import { useState } from "react";
import { Link } from "react-router-dom";
import type { Product } from "@/lib/types";
import { bundledImage } from "@/lib/images";
import { rs } from "@/lib/format";
import { Icon, Stars } from "./Icon";
import { photoFor } from "../../../mobile/src/services/product-media";

/*
 * The product card, and the pieces of it reused on the product page.
 *
 * Two things were wrong with the old card and both were visible on every
 * grid. First, a product without a photo fell back to an emoji chosen from a
 * hardcoded switch (a saucepan for groceries, a laptop for film) which
 * rendered at a different size and colour on every OS. Second, the whole card
 * lifted 4px and grew a large soft shadow on hover, so moving the pointer
 * across a grid of twenty made the page appear to ripple.
 *
 * The replacement: a neutral placeholder built from the same icon set as the
 * rest of the UI, and a hover state that changes the border and the title
 * colour only. Nothing moves.
 */

export function ProductVisual({
  product,
  className = "",
  fit = "cover",
  sizes,
}: {
  product: Product;
  className?: string;
  fit?: "cover" | "contain";
  sizes?: string;
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
        src={src}
        alt={product.name}
        loading="lazy"
        decoding="async"
        sizes={sizes}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`${fit === "cover" ? "object-cover" : "object-contain"} transition-opacity duration-200 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
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
  const was = product.originalPrice;
  const saving = was && was > product.price ? Math.round((1 - product.price / was) * 100) : 0;
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
          <span className={`text-ink-faint line-through ${scale.was}`}>{rs(was!)}</span>
          <span className={`font-semibold text-positive ${scale.was}`}>-{saving}%</span>
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
  if (product.gems)
    chips.push({ icon: "gem", label: `${product.gems} gems`, tone: "text-ink-muted" });
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

  return (
    <article className="group relative flex h-full flex-col rounded-md border border-line bg-raised transition-colors hover:border-line-strong focus-within:border-brand">
      <div className="media aspect-square w-full rounded-t-md">
        <ProductVisual
          product={product}
          sizes={priority ? undefined : "(max-width: 640px) 50vw, 200px"}
        />
        {product.badge && !out && (
          <span className="absolute left-2 top-2 rounded-xs bg-brand px-1.5 py-0.5 text-2xs font-bold uppercase tracking-wide text-white">
            {product.badge}
          </span>
        )}
        {out && (
          <div className="absolute inset-0 grid place-items-center bg-raised/75">
            <span className="rounded-sm bg-ink px-2.5 py-1 text-2xs font-semibold text-white">
              Out of stock
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-2.5">
        <h3 className="clamp-2 text-sm leading-snug text-ink-soft group-hover:text-brand">
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
              {Number.isFinite(rating) && <Stars value={rating} size={12} />}
              {product.sold != null && (
                <span className="tnum text-2xs text-ink-faint">
                  {product.sold.toLocaleString("en-US")} sold
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

/*
 * A denser variant for horizontal rails, where the card competes with the
 * scroll affordance and cannot afford the attribute chips.
 */
export function ProductCardCompact({ product }: { product: Product }) {
  return (
    <article className="group relative flex h-full w-[150px] flex-col rounded-md border border-line bg-raised transition-colors hover:border-line-strong">
      <div className="media aspect-square w-full rounded-t-md">
        <ProductVisual product={product} sizes="150px" />
      </div>
      <div className="flex flex-1 flex-col p-2">
        <h3 className="clamp-2 text-xs leading-snug text-ink-soft group-hover:text-brand">
          <Link
            to={`/product/${product.id}`}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto pt-1.5">
          <Price product={product} size="sm" />
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
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 5} />
      ))}
      {children}
    </div>
  );
}
