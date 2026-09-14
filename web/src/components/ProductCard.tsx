import type { Product } from "@/lib/types";
import { bundledImage } from "@/lib/images";
import { Icon } from "./Icon";

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
      <img
        src={src}
        alt={product.name}
        loading="lazy"
        className={`h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"} ${className}`}
      />
    );
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-1 bg-slate-50 p-2 text-center ${className}`}
    >
      <span className="text-3xl">{illustrationEmoji(product.illustration)}</span>
      <span className="line-clamp-2 text-[10px] font-semibold text-slate-500">
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

export function Price({ product, size = "md" }: { product: Product; size?: "md" | "lg" }) {
  return (
    <span className="flex items-baseline gap-2 whitespace-nowrap">
      <span
        className={`font-extrabold text-[#f5222d] ${size === "lg" ? "text-3xl" : "text-lg"}`}
      >
        Rs.{product.price.toLocaleString("en-US")}
      </span>
      {product.originalPrice != null && product.originalPrice > product.price && (
        <span className={`text-slate-400 line-through ${size === "lg" ? "text-base" : "text-xs"}`}>
          Rs.{product.originalPrice.toLocaleString("en-US")}
        </span>
      )}
      {product.discount && (
        <span className="rounded bg-[#ff4d4f] px-1.5 py-0.5 text-[10px] font-bold text-white">
          {product.discount}
        </span>
      )}
    </span>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const out = product.stock < 1;
  return (
    <article className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <a href={`#/product/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-slate-100">
          <ProductVisual product={product} className="transition duration-300 group-hover:scale-[1.03]" />
          {product.badge && (
            <span className="absolute left-1 top-1 rounded bg-[#c29961] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {product.badge}
            </span>
          )}
          {out && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-white">
                Out of stock
              </span>
            </div>
          )}
        </div>
        <div className="space-y-1 p-3">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] font-medium text-slate-800">
            {product.name}
          </h3>
          <Price product={product} />
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
            {product.rating && (
              <span className="flex items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 font-semibold text-rose-600">
                <Icon name="star" size={10} className="fill-rose-500 text-rose-500" />
                {product.rating}
              </span>
            )}
            {product.sold != null && (
              <span className="text-slate-400">{product.sold} sold</span>
            )}
            {!!product.gems && (
              <span className="flex items-center gap-0.5 rounded bg-teal-50 px-1.5 py-0.5 font-semibold text-teal-700">
                <Icon name="gem" size={10} />
                {product.gems}
              </span>
            )}
            {product.fastDelivery && (
              <span className="flex items-center gap-0.5 rounded bg-sky-50 px-1.5 py-0.5 font-semibold text-sky-700">
                <Icon name="truck" size={10} />
                Fast Delivery
              </span>
            )}
            {product.voucher && (
              <span className="flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-700">
                <Icon name="ticket" size={10} />
                Voucher
              </span>
            )}
          </div>
        </div>
      </a>
    </article>
  );
}
