import type { Product } from "@/lib/types";
import { bundledImage } from "@/lib/images";
import { Icon } from "./Icon";
import { photoFor } from "../../../mobile/src/services/product-media";

export function ProductVisual({
  product,
  className = "",
  fit = "cover",
}: {
  product: Product;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const src = bundledImage(product);
  if (src)
    return (
      <div className="relative h-full w-full">
        <img
          src={src}
          alt={product.name}
          loading="lazy"
          className={`h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"} ${className}`}
        />
        {(product.imageIllustrative ||
          (!product.imageUrl && photoFor(product)?.illustrative)) && (
          <span className="absolute bottom-0 left-0 bg-white/90 p-1 text-[9px]">
            Illustrative photo
          </span>
        )}
      </div>
    );
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-1 bg-gray-50 p-2 text-center ${className}`}
    >
      <span className="text-3xl">
        {illustrationEmoji(product.illustration)}
      </span>
      <span className="line-clamp-2 text-[10px] font-semibold text-gray-400">
        {product.brand ?? product.name}
      </span>
    </div>
  );
}

function illustrationEmoji(kind?: string) {
  switch (kind) {
    case "dabur":
    case "didian":
    case "horlicks":
    case "gyan":
      return "🥫";
    case "monitor":
      return "🖥️";
    case "speaker":
      return "🔊";
    case "posters":
      return "🖼️";
    case "film":
      return "💻";
    case "balaclava":
      return "🧣";
    default:
      return "🛍️";
  }
}

/*
 * Price block per the marketplace design spec: prominent orange price, then
 * original price struck through in gray plus a small discount indicator.
 */
export function Price({
  product,
  size = "md",
}: {
  product: Product;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span className="flex items-baseline gap-2 whitespace-nowrap">
      <span
        className={`font-bold text-[var(--store-primary-text)] ${
          size === "lg" ? "text-3xl" : size === "sm" ? "text-sm" : "text-base"
        }`}
      >
        Rs.{product.price.toLocaleString("en-US")}
      </span>
      {product.originalPrice != null &&
        product.originalPrice > product.price && (
          <span
            className={`text-gray-400 line-through ${
              size === "lg" ? "text-sm" : "text-[11px]"
            }`}
          >
            Rs.{product.originalPrice.toLocaleString("en-US")}
          </span>
        )}
      {product.discount && (
        <span
          className={`font-semibold text-gray-800 ${size === "lg" ? "text-sm" : "text-[10px] font-normal"}`}
        >
          {product.discount}
        </span>
      )}
    </span>
  );
}

/* Yellow star row with review count, as in the Just-For-You grid. */
function RatingRow({ product }: { product: Product }) {
  const rating = Number.parseFloat(product.rating ?? "");
  const full = Number.isFinite(rating) ? Math.round(rating) : 0;
  if (!product.rating && product.sold == null) return null;
  return (
    <div className="mt-1 flex items-center text-[10px] text-[#faca15]">
      {Array.from({ length: 5 }).map((_, i) => (
        <i
          key={i}
          className={`fa-${i < full ? "solid" : "regular"} fa-star`}
        />
      ))}
      <span className="ml-1 text-gray-400">
        ({product.sold ?? Math.max(0, Math.round((rating || 0) * 40))})
      </span>
    </div>
  );
}

/*
 * Product card ported from the Just-For-You / Flash-Sale markup in
 * ../web ui ux design/daraz_nepal_homepage_clone/code.html: flat white card,
 * 2px radius, square media, two-line title, orange price + discount, star
 * row, hover elevation via .daraz-card.
 */
export function ProductCard({
  product,
  variant = "default",
}: {
  product: Product;
  variant?: "default" | "flash";
}) {
  const out = product.stock < 1;
  return (
    <article
      className={`flex flex-col justify-between rounded-[2px] border border-transparent bg-white p-2 hover:border-gray-200 ${
        variant === "flash" ? "flash-card" : "daraz-card"
      } cursor-pointer`}
    >
      <a href={`#/product/${product.id}`} className="flex flex-1 flex-col justify-between">
        <div>
          <div className="relative mb-2 aspect-square w-full overflow-hidden rounded bg-gray-50">
            <ProductVisual product={product} fit={variant === "flash" ? "contain" : "cover"} />
            {product.badge && (
              <span className="absolute left-1 top-1 rounded-[2px] bg-[#f85606] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {product.badge}
              </span>
            )}
            {out && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-semibold text-white">
                  Out of stock
                </span>
              </div>
            )}
          </div>
          <h3 className="mb-1 line-clamp-2 text-xs leading-snug text-gray-800">
            {product.name}
          </h3>
        </div>
        <div>
          <Price product={product} size={variant === "flash" ? "md" : "sm"} />
          <RatingRow product={product} />
          {(product.fastDelivery || product.voucher || !!product.gems) && (
            <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
              {product.fastDelivery && (
                <span className="flex items-center gap-0.5 rounded-[2px] bg-sky-50 px-1 py-0.5 font-semibold text-sky-700">
                  <Icon name="truck" size={10} />
                  Fast Delivery
                </span>
              )}
              {product.voucher && (
                <span className="flex items-center gap-0.5 rounded-[2px] border border-dashed border-[#f85606] bg-[#fff5f1] px-1 py-0.5 font-semibold text-[#f85606]">
                  <Icon name="ticket" size={10} />
                  Voucher
                </span>
              )}
              {!!product.gems && (
                <span className="flex items-center gap-0.5 rounded-[2px] bg-teal-50 px-1 py-0.5 font-semibold text-teal-700">
                  <Icon name="gem" size={10} />
                  {product.gems}
                </span>
              )}
            </div>
          )}
        </div>
      </a>
    </article>
  );
}
