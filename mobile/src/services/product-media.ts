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
