// Public policy pages, hosted with the web storefront. The Play Console store
// listing points at the same addresses.
const site = (
  process.env.EXPO_PUBLIC_SITE_URL || "https://gulmeli-fancy-stores.vercel.app"
).replace(/\/+$/, "");

export const legalLinks = {
  privacy: `${site}/privacy`,
  terms: `${site}/terms`,
  deleteAccount: `${site}/delete-account`,
};
export const supportEmail = "amritgyawali999@gmail.com";
