import manifest from "../data/hosted-media.json";
type Photo = { url: string; illustrative?: boolean };
export const hostedPhotos: Record<string, Photo> = manifest;
export function photoFor(product: {
  id: string;
  imageKey?: string;
}): Photo | undefined {
  const id = product.id.replace(/^prod_/, "");
  let key = product.imageKey ?? "";
  if (!key && id.startsWith("home-"))
    key = `daraz_app_home_screen-${Number(id.slice(5)) + 13}`;
  if (!key && id.startsWith("offer-"))
    key = `daraz_buy_more_save_more_offer_screen-${id.slice(6)}`;
  if (!key && id.startsWith("campaign-"))
    key = `daraz_app_home_screen-${id.slice(9)}`;
  return hostedPhotos[id] ?? hostedPhotos[key];
}

/*
 * A Cloudinary delivery URL sized for where it is shown.
 *
 * Catalogue photos were served as uploaded — full size, original format — to
 * a 150px card as much as to a full-screen viewer. Cloudinary resizes and
 * transcodes on the fly when the URL asks it to: `f_auto` picks WebP/AVIF for
 * browsers and phones that support them, `q_auto` picks the quality, and
 * `c_limit,w_N` caps the width without ever upscaling. A typical card photo
 * drops to a fraction of its original bytes.
 *
 * URLs that are not Cloudinary uploads, or that already carry a
 * transformation, are returned untouched.
 */
export function sizedImage(url: string, width: number): string;
export function sizedImage(url: string | null | undefined, width: number): string | null;
export function sizedImage(url: string | null | undefined, width: number) {
  if (!url) return url ?? null;
  const match = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/.exec(url);
  if (!match) return url;
  const [, base, rest] = match;
  /* Already transformed: the first segment holds commas or a known prefix. */
  if (/^(?:[a-z]{1,3}_[^/]+,?)+\//.test(rest) && !/^v\d+\//.test(rest)) return url;
  const w = Math.max(16, Math.round(width));
  return `${base}f_auto,q_auto,c_limit,w_${w}/${rest}`;
}

/* The photo a product is shown with, sized for its slot. */
export function productImage(
  product: { id: string; imageKey?: string; imageUrl?: string },
  width: number,
) {
  return sizedImage(product.imageUrl || photoFor(product)?.url, width);
}
