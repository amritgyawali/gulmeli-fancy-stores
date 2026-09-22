import { useCallback, useEffect, useRef, useState } from "react";
import { useShop } from "@/store/ShopContext";
import type { Product } from "./types";

/*
 * Small storefront hooks shared by the card, the product page and the home
 * page. Each wraps one browser API or one slice of shop state so the pages do
 * not each carry their own copy of the same observer or toggle.
 */

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/*
 * True while the element is on screen. Used for the sticky buy bar and for
 * loading the next page of a feed before the customer reaches the end.
 *
 * Returns a callback ref rather than taking a ref object, so the observer
 * attaches whenever the element actually mounts — the elements watched here
 * usually appear only after the catalogue loads, long after the first
 * render, and an effect keyed on a ref object never saw them arrive.
 */
export function useInView<T extends Element>({
  rootMargin = "0px",
  initial = false,
}: { rootMargin?: string; initial?: boolean } = {}) {
  const [el, setEl] = useState<T | null>(null);
  const [inView, setInView] = useState(initial);
  useEffect(() => {
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [el, rootMargin]);
  return [setEl, inView] as const;
}

/* Wishlist membership and toggle, from the customer's saved commerce state. */
export function useWishlist() {
  const { commerce, updateCommerce } = useShop();
  const has = useCallback((id: string) => commerce.wishlist.includes(id), [commerce.wishlist]);
  const toggle = useCallback(
    (product: Product) => {
      const adding = !commerce.wishlist.includes(product.id);
      updateCommerce((current) => ({
        ...current,
        wishlist: current.wishlist.includes(product.id)
          ? current.wishlist.filter((x) => x !== product.id)
          : [...current.wishlist, product.id],
      }));
      return adding;
    },
    [commerce.wishlist, updateCommerce],
  );
  return { has, toggle, count: commerce.wishlist.length };
}

/* Records a product view, most recent first, capped. Same list and cap as the
   app, so a product browsed on the phone appears here for a signed-in
   customer and vice versa. */
export const RECENT_LIMIT = 30;

export function useRecordView(product: Product | undefined) {
  const { updateCommerce } = useShop();
  const recorded = useRef<string | null>(null);
  useEffect(() => {
    if (!product || recorded.current === product.id) return;
    recorded.current = product.id;
    updateCommerce((current) =>
      current.recent[0] === product.id
        ? current
        : {
            ...current,
            recent: [product.id, ...current.recent.filter((id) => id !== product.id)].slice(
              0,
              RECENT_LIMIT,
            ),
          },
    );
  }, [product, updateCommerce]);
}

/* Recently viewed products that are still in the catalogue. */
export function useRecentlyViewed(excludeId?: string, limit = 12) {
  const { commerce, productById } = useShop();
  return commerce.recent
    .filter((id) => id !== excludeId)
    .map((id) => productById[id])
    .filter((p): p is Product => Boolean(p))
    .slice(0, limit);
}

/*
 * Title, description and social-card tags for the current page, restored on
 * unmount. The storefront is a single-page app, so without this every shared
 * link previews as the site name.
 */
export function useDocumentMeta({
  title,
  description,
  image,
  jsonLd,
}: {
  title?: string;
  description?: string;
  image?: string | null;
  jsonLd?: Record<string, unknown> | null;
}) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : "";
  useEffect(() => {
    const previousTitle = document.title;
    if (title) document.title = title;

    const touched: { el: HTMLMetaElement; previous: string | null; created: boolean }[] = [];
    const setMeta = (attr: "name" | "property", key: string, value?: string | null) => {
      if (!value) return;
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      const created = !el;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      touched.push({ el, previous: el.getAttribute("content"), created });
      el.setAttribute("content", value);
    };
    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:image", image);
    setMeta("name", "twitter:card", image ? "summary_large_image" : undefined);

    let script: HTMLScriptElement | null = null;
    if (ld) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = ld;
      document.head.appendChild(script);
    }

    return () => {
      document.title = previousTitle;
      for (const t of touched) {
        if (t.created) t.el.remove();
        else if (t.previous != null) t.el.setAttribute("content", t.previous);
      }
      script?.remove();
    };
  }, [title, description, image, ld]);
}

/* Locks page scroll while an overlay is open, restoring the exact previous
   value so two overlays opening in sequence cannot leave the page locked. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}

/* Delivery window as calendar dates, from an estimate like "2–4 days". */
export function deliveryWindow(estimate: string, from = new Date()) {
  const nums = (estimate.match(/\d+/g) ?? []).map(Number).filter(Number.isFinite);
  if (!nums.length) return null;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const at = (days: number) => {
    const d = new Date(from);
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
  };
  return min === max ? at(min) : `${at(min)} – ${at(max)}`;
}
