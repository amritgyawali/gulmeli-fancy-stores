import type { Product } from "./types";
import { photoFor } from "../../../mobile/src/services/product-media";

// Keys resolve to files copied into public/img from the mobile asset set.
const IMAGE_KEYS = new Set<string>([
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(
    (i) => `daraz_app_home_screen-${i}`,
  ),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map(
    (i) => `daraz_buy_more_save_more_offer_screen-${i}`,
  ),
]);

export function bundledImage(product: Product): string | null {
  if (product.imageUrl) return product.imageUrl; // already hosted (Cloudinary)
  const photo = photoFor(product);
  if (photo) return photo.url;
  if (product.imageKey && IMAGE_KEYS.has(product.imageKey))
    return `/img/${product.imageKey}.jpg`;
  return null;
}
