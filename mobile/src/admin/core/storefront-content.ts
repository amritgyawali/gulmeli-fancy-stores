export type ContentRecord = Record<string, unknown> & { id: string };
export const defaultSections: ContentRecord[] = [
  { id: "default-hero", type: "hero_slider", title: "", enabled: true },
  {
    id: "default-categories",
    type: "categories",
    title: "Shop by category",
    enabled: true,
  },
  {
    id: "default-products",
    type: "featured_products",
    title: "Find your next favourite",
    enabled: true,
    itemLimit: 30,
    layout: "grid",
  },
];
export function sectionVisible(
  section: ContentRecord,
  mobile: boolean,
  now = Date.now(),
) {
  if (section.enabled === false || section.deletedAt) return false;
  if (mobile ? section.showOnMobile === false : section.showOnDesktop === false)
    return false;
  if (section.startsAt && Date.parse(String(section.startsAt)) > now)
    return false;
  if (section.endsAt && Date.parse(String(section.endsAt)) <= now) return false;
  return true;
}
export function safeStoreLink(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (/^https:\/\//i.test(value)) return value;
  if (/^\/(?!\/)[^\\]*$/.test(value)) return value;
  return null;
}
export function plainText(value: unknown) {
  return String(value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
}
