import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { sized, srcSetFor } from "@/lib/images";
import { useScrollLock } from "@/lib/hooks";
import { ProductVisual, discountPercent } from "./ProductCard";
import { Icon } from "./Icon";

/*
 * Product photos.
 *
 * The previous page had a "Hover to zoom" badge over an image that scaled 5%,
 * and then nothing at all. This gallery does what large catalogues do:
 *
 * - With a pointer, hovering the photo magnifies the area under the cursor
 *   (2.2x, following the pointer), and thumbnails sit in a column beside it.
 * - On touch, the photos are a swipeable strip with a position counter and
 *   dots, because a thumbnail column does not fit beside a phone photo.
 * - Either way, tapping or clicking opens a full-screen viewer with arrow-key
 *   and swipe navigation, where the browser's own pinch-zoom works.
 */

export function ProductGallery({ product, images }: { product: Product; images: string[] }) {
  const [active, setActive] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const out = product.stock < 1;
  const saving = discountPercent(product);

  useEffect(() => setActive(0), [product.id]);

  /* Keep the dot and counter in step with a swipe. */
  const onStripScroll = () => {
    const el = strip.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
    if (i !== active) setActive(i);
  };

  const showOnStrip = (i: number) => {
    setActive(i);
    const el = strip.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  const badges = !out && (saving > 0 || product.badge) && (
    <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col items-start gap-1">
      {saving > 0 && (
        <span className="tnum rounded-sm bg-brand px-2 py-1 text-xs font-bold text-white">
          -{saving}%
        </span>
      )}
      {product.badge && (
        <span className="rounded-sm bg-ink px-2 py-1 text-2xs font-bold uppercase tracking-wide text-raised">
          {product.badge}
        </span>
      )}
    </div>
  );

  if (!images.length)
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-line bg-raised">
        <ProductVisual product={product} fit="contain" />
        {badges}
      </div>
    );

  return (
    <>
      {/* Pointer layout: thumbnail column + magnifying stage. */}
      <div className="hidden gap-3 [@media(hover:hover)]:flex">
        {images.length > 1 && (
          <ul className="flex w-16 shrink-0 flex-col gap-2" aria-label="Product photos">
            {images.map((src, i) => (
              <li key={src + i}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  aria-label={`Show photo ${i + 1} of ${images.length}`}
                  aria-current={active === i}
                  className={`media block aspect-square w-16 overflow-hidden rounded-md border-2 transition-colors ${
                    active === i ? "border-brand" : "border-line hover:border-line-strong"
                  }`}
                >
                  <img
                    src={sized(src, 80)}
                    srcSet={srcSetFor(src, 80)}
                    alt=""
                    loading="lazy"
                    className="object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => setViewer(active)}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({
              x: ((e.clientX - r.left) / r.width) * 100,
              y: ((e.clientY - r.top) / r.height) * 100,
            });
          }}
          onMouseLeave={() => setZoom(null)}
          aria-label={`Open photo ${active + 1} of ${images.length} full screen`}
          className="media relative aspect-square min-w-0 flex-1 cursor-zoom-in overflow-hidden rounded-xl border border-line bg-raised"
        >
          <img
            key={images[active]}
            src={sized(images[active], 900)}
            srcSet={srcSetFor(images[active], 900)}
            alt={`${product.name}${images.length > 1 ? `, photo ${active + 1} of ${images.length}` : ""}`}
            fetchPriority="high"
            className="animate-fade-in object-contain transition-transform duration-200 ease-out"
            style={
              zoom
                ? { transform: "scale(2.2)", transformOrigin: `${zoom.x}% ${zoom.y}%` }
                : undefined
            }
          />
          {badges}
          <span
            className={`pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-raised/90 px-2.5 py-1 text-xs font-medium text-ink-soft shadow-e1 backdrop-blur transition-opacity ${
              zoom ? "opacity-0" : "opacity-100"
            }`}
          >
            <Icon name="search" size={13} />
            Hover to zoom · click to expand
          </span>
        </button>
      </div>

      {/* Touch layout: swipeable strip. */}
      <div className="relative -mx-[var(--page-gutter)] sm:mx-0 [@media(hover:hover)]:hidden">
        <div
          ref={strip}
          onScroll={onStripScroll}
          className="rail aspect-square w-full bg-raised sm:rounded-xl sm:border sm:border-line"
        >
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setViewer(i)}
              aria-label={`Open photo ${i + 1} of ${images.length} full screen`}
              className="media h-full w-full shrink-0 bg-raised"
            >
              <img
                src={sized(src, 600)}
                srcSet={srcSetFor(src, 600)}
                alt={`${product.name}${images.length > 1 ? `, photo ${i + 1} of ${images.length}` : ""}`}
                loading={i === 0 ? "eager" : "lazy"}
                className="object-contain"
              />
            </button>
          ))}
        </div>
        {badges}
        {images.length > 1 && (
          <>
            <span className="tnum pointer-events-none absolute right-3 top-3 rounded-full bg-ink/60 px-2.5 py-0.5 text-xs font-medium text-white">
              {active + 1}/{images.length}
            </span>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {images.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => showOnStrip(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={active === i}
                  className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${
                    active === i ? "w-5 bg-brand" : "w-1.5 bg-ink/25"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {viewer !== null && (
        <Lightbox
          images={images}
          start={viewer}
          name={product.name}
          onClose={(last) => {
            setViewer(null);
            setActive(last);
          }}
        />
      )}
    </>
  );
}

function Lightbox({
  images,
  start,
  name,
  onClose,
}: {
  images: string[];
  start: number;
  name: string;
  onClose: (last: number) => void;
}) {
  const [index, setIndex] = useState(start);
  const track = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const indexRef = useRef(index);
  indexRef.current = index;
  useScrollLock(true);

  const go = (i: number) => {
    const next = (i + images.length) % images.length;
    setIndex(next);
    const el = track.current;
    if (el) el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  useEffect(() => {
    const el = track.current;
    if (el) el.scrollLeft = start * el.clientWidth;
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    return () => previous?.focus?.();
  }, [start]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(indexRef.current);
      if (e.key === "ArrowRight") go(indexRef.current + 1);
      if (e.key === "ArrowLeft") go(indexRef.current - 1);
      /* Focus stays inside the viewer: its controls are the only stops. */
      if (e.key === "Tab") {
        const items = [...document.querySelectorAll<HTMLElement>("[data-lightbox] button")];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);

  return (
    <div
      data-lightbox
      role="dialog"
      aria-modal="true"
      aria-label={`${name} photos`}
      className="animate-fade-in fixed inset-0 z-[90] flex flex-col bg-black/95 text-white"
    >
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <p className="tnum text-sm text-white/70">
          {index + 1} / {images.length}
        </p>
        <button
          ref={closeButton}
          type="button"
          onClick={() => onClose(index)}
          aria-label="Close photos"
          className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10"
        >
          <Icon name="close" size={22} />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={track}
          onScroll={() => {
            const el = track.current;
            if (!el) return;
            const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
            if (i !== index) setIndex(i);
          }}
          className="rail h-full"
        >
          {images.map((src, i) => (
            <div key={src + i} className="grid h-full w-full shrink-0 place-items-center p-2 sm:p-8">
              <img
                src={sized(src, 1600)}
                alt={`${name}, photo ${i + 1} of ${images.length}`}
                className="max-h-full max-w-full touch-pinch-zoom object-contain"
                draggable={false}
              />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:grid"
            >
              <Icon name="chevronLeft" size={24} />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:grid"
            >
              <Icon name="chevronRight" size={24} />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex shrink-0 justify-center gap-2 overflow-x-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={index === i}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition-[border-color,opacity] ${
                index === i ? "border-white opacity-100" : "border-transparent opacity-50 hover:opacity-80"
              }`}
            >
              <img src={sized(src, 112)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
