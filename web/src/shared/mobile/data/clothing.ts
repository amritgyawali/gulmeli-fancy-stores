// Copied from mobile/src/data/clothing.ts by web/scripts/sync-shared.mjs. Edit the source, not this file.
/*
 * Clothing-store vocabulary shared by the app, the website and the database
 * scripts: the department list, size guides, and the helpers that turn a
 * product's sizes and colours into choices a shopper can make.
 *
 * Everything here is plain data with no React or platform imports, so the
 * website copies this file as-is (web/scripts/sync-shared.mjs).
 */

/* Departments, in the order the storefront shows them. */
export const CLOTHING_CATEGORIES = [
  "Men",
  "Women",
  "Kids",
  "Ethnic Wear",
  "Winter Wear",
  "Activewear",
  "Accessories",
] as const;
export type ClothingCategory = (typeof CLOTHING_CATEGORIES)[number];

/* One line about each department, for category pages and the dashboard. */
export const CATEGORY_BLURBS: Record<string, string> = {
  Men: "Shirts, T-shirts, polos, jeans and chinos for every day.",
  Women: "Dresses, tops, blouses, jeans and skirts.",
  Kids: "Comfortable, easy-wash clothing for ages 2 to 11.",
  "Ethnic Wear":
    "Daura suruwal, kurtis, sarees, lehengas and Dhaka topi for festivals and weddings.",
  "Winter Wear": "Jackets, hoodies, sweaters, shawls and woollens.",
  Activewear: "Training, running and yoga wear that moves with you.",
  Accessories: "Caps, belts, socks, scarves and sun protection.",
};

export interface ColorOption {
  name: string;
  hex: string;
}

/* Which size guide a product uses. "free" means one size fits most. */
export type SizeChartKey =
  | "men-tops"
  | "women-tops"
  | "men-bottoms"
  | "women-bottoms"
  | "kids"
  | "ethnic-men"
  | "topi"
  | "free";

export interface SizeChart {
  title: string;
  /* Column headings after the size column, measurements in cm unless noted. */
  columns: string[];
  rows: { size: string; values: string[] }[];
  howToMeasure: string[];
}

export const SIZE_CHARTS: Record<Exclude<SizeChartKey, "free">, SizeChart> = {
  "men-tops": {
    title: "Men's tops",
    columns: ["Chest (cm)", "Length (cm)", "Shoulder (cm)"],
    rows: [
      { size: "S", values: ["91–96", "69", "43"] },
      { size: "M", values: ["97–102", "71", "45"] },
      { size: "L", values: ["103–108", "73", "47"] },
      { size: "XL", values: ["109–114", "75", "49"] },
      { size: "XXL", values: ["115–120", "77", "51"] },
    ],
    howToMeasure: [
      "Chest: around the fullest part, under the arms, tape level.",
      "Length: from the highest point of the shoulder down to the hem.",
    ],
  },
  "women-tops": {
    title: "Women's tops and dresses",
    columns: ["Bust (cm)", "Waist (cm)", "Hip (cm)"],
    rows: [
      { size: "XS", values: ["78–81", "61–64", "86–89"] },
      { size: "S", values: ["82–86", "65–69", "90–94"] },
      { size: "M", values: ["87–91", "70–74", "95–99"] },
      { size: "L", values: ["92–97", "75–80", "100–105"] },
      { size: "XL", values: ["98–104", "81–87", "106–112"] },
    ],
    howToMeasure: [
      "Bust: around the fullest part of the bust, tape level.",
      "Waist: around the narrowest part of the waist.",
      "Hip: around the fullest part of the hips.",
    ],
  },
  "men-bottoms": {
    title: "Men's jeans and trousers",
    columns: ["Waist (cm)", "Hip (cm)", "Inseam (cm)"],
    rows: [
      { size: "28", values: ["71", "89", "78"] },
      { size: "30", values: ["76", "94", "79"] },
      { size: "32", values: ["81", "99", "80"] },
      { size: "34", values: ["86", "104", "81"] },
      { size: "36", values: ["91", "109", "81"] },
    ],
    howToMeasure: [
      "Waist: where you usually wear your trousers.",
      "Inseam: from the crotch seam down to the ankle.",
    ],
  },
  "women-bottoms": {
    title: "Women's jeans, skirts and leggings",
    columns: ["Waist (cm)", "Hip (cm)", "Inseam (cm)"],
    rows: [
      { size: "26", values: ["66", "91", "74"] },
      { size: "28", values: ["71", "96", "75"] },
      { size: "30", values: ["76", "101", "75"] },
      { size: "32", values: ["81", "106", "76"] },
      { size: "34", values: ["86", "111", "76"] },
    ],
    howToMeasure: [
      "Waist: around the narrowest part of the waist.",
      "Hip: around the fullest part of the hips.",
    ],
  },
  kids: {
    title: "Kids",
    columns: ["Height (cm)", "Chest (cm)", "Waist (cm)"],
    rows: [
      { size: "2-3Y", values: ["92–98", "53", "51"] },
      { size: "4-5Y", values: ["104–110", "57", "53"] },
      { size: "6-7Y", values: ["116–122", "61", "55"] },
      { size: "8-9Y", values: ["128–134", "66", "58"] },
      { size: "10-11Y", values: ["140–146", "71", "61"] },
    ],
    howToMeasure: [
      "Height is the best guide: measure without shoes, back to a wall.",
      "Between two sizes, choose the larger one so it lasts longer.",
    ],
  },
  "ethnic-men": {
    title: "Daura suruwal and kurta",
    columns: ["Chest (cm)", "Daura length (cm)", "Suruwal waist (cm)"],
    rows: [
      { size: "36", values: ["91", "96", "71–86"] },
      { size: "38", values: ["97", "99", "76–91"] },
      { size: "40", values: ["102", "102", "81–96"] },
      { size: "42", values: ["107", "105", "86–101"] },
      { size: "44", values: ["112", "108", "91–106"] },
    ],
    howToMeasure: [
      "Size is your chest in inches (38 = 38 in / 97 cm).",
      "Suruwal has a drawstring waist, so it fits a range.",
    ],
  },
  topi: {
    title: "Dhaka topi",
    columns: ["Head (cm)", "Head (in)"],
    rows: [
      { size: '21"', values: ["53", "21"] },
      { size: '22"', values: ["56", "22"] },
      { size: '23"', values: ["58", "23"] },
    ],
    howToMeasure: [
      "Wrap the tape around your head just above the ears and eyebrows.",
    ],
  },
};

/* Details a clothing product can carry. Every field is optional, so products
   added from the dashboard without them still display. */
export interface ClothingDetails {
  sizes?: string[];
  colors?: ColorOption[];
  sizeChart?: SizeChartKey;
  fabric?: string;
  fit?: string;
  care?: string[];
  highlights?: string[];
  gender?: string;
}

interface VariantSource extends ClothingDetails {
  variants?: unknown;
}

const text = (value: unknown, max = 40) =>
  typeof value === "string" && value.trim() && value.trim().length <= max
    ? value.trim()
    : "";

const HEX = /^#[0-9a-f]{6}$/i;

/* Sizes the shopper can choose: the product's own list, else the sizes of
   the variants the dashboard defines. "Free Size" alone is not a choice. */
export function sizeOptions(product: VariantSource): string[] {
  const own = Array.isArray(product.sizes) ? product.sizes.map((s) => text(s)) : [];
  const fromVariants = Array.isArray(product.variants)
    ? product.variants.map((v) => text((v as { size?: unknown })?.size))
    : [];
  const list = [...new Set((own.some(Boolean) ? own : fromVariants).filter(Boolean))];
  return list.length === 1 && /^free/i.test(list[0]) ? [] : list.slice(0, 20);
}

/* Colours the shopper can choose, with a swatch colour where one is known. */
export function colorOptions(product: VariantSource): ColorOption[] {
  const own = Array.isArray(product.colors)
    ? product.colors
        .map((c) => ({
          name: text((c as ColorOption)?.name),
          hex: HEX.test(String((c as ColorOption)?.hex)) ? String((c as ColorOption).hex) : "",
        }))
        .filter((c) => c.name)
    : [];
  const fromVariants = Array.isArray(product.variants)
    ? product.variants
        .map((v) => ({ name: text((v as { color?: unknown })?.color), hex: "" }))
        .filter((c) => c.name)
    : [];
  const list = own.length ? own : fromVariants;
  const seen = new Set<string>();
  return list
    .filter((c) => !seen.has(c.name.toLowerCase()) && seen.add(c.name.toLowerCase()))
    .slice(0, 12);
}

export function sizeChartFor(product: VariantSource): SizeChart | null {
  const key = product.sizeChart;
  return key && key !== "free" && key in SIZE_CHARTS
    ? SIZE_CHARTS[key as Exclude<SizeChartKey, "free">]
    : null;
}

/* Chosen size and colour, as a cart line or order line carries them. */
export interface VariantChoice {
  size?: string;
  color?: string;
}

/* Cart lines are identified by product plus chosen variant. A product with no
   variant keeps its plain id, so older saved carts and links still match. */
export function lineKey(item: { productId: string } & VariantChoice) {
  return item.size || item.color
    ? `${item.productId}|${item.size ?? ""}|${item.color ?? ""}`
    : item.productId;
}

/* "Size M · Navy", or "" when no variant was chosen. */
export function variantLabel(item: VariantChoice) {
  return [item.size ? `Size ${item.size}` : "", item.color ?? ""]
    .filter(Boolean)
    .join(" · ");
}

/* Keeps only a well-formed size/colour from saved or remote data. */
export function cleanVariant(value: unknown): VariantChoice {
  const v = (value ?? {}) as Record<string, unknown>;
  const size = text(v.size, 20);
  const color = text(v.color, 40);
  return { ...(size ? { size } : {}), ...(color ? { color } : {}) };
}

/* What the shopper still has to choose before the product can go in the bag. */
export function missingChoice(
  product: VariantSource,
  choice: VariantChoice,
): "size" | "color" | null {
  const sizes = sizeOptions(product);
  if (sizes.length && !(choice.size && sizes.includes(choice.size))) return "size";
  const colors = colorOptions(product);
  if (colors.length > 1 && !(choice.color && colors.some((c) => c.name === choice.color)))
    return "color";
  return null;
}

/* The colour to preselect: the only one there is. */
export function defaultColor(product: VariantSource) {
  const colors = colorOptions(product);
  return colors.length === 1 ? colors[0].name : undefined;
}

/* True when the lines of each product together stay within its stock. */
export function unitsCheck(
  lines: { productId: string; quantity: number }[],
  catalog: Record<string, { stock: number } | undefined>,
) {
  const units: Record<string, number> = {};
  for (const line of lines) units[line.productId] = (units[line.productId] ?? 0) + line.quantity;
  return Object.entries(units).every(([id, n]) => n <= (catalog[id]?.stock ?? 0));
}
