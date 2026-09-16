import type { StorefrontConfig } from "./config.ts";

export const clamp = (value: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
export function hexColor(value: string, fallback: string) {
  return /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value) ? value : fallback;
}
function luminance(color: string) {
  const h = hexColor(color, "#000000").slice(1);
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const rgb = [0, 2, 4]
    .map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
export function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function readableColor(background: string, preferred = "#ffffff") {
  if (contrast(background, preferred) >= 4.5) return preferred;
  return contrast(background, "#111111") >= contrast(background, "#ffffff")
    ? "#111111"
    : "#ffffff";
}
export function resolveAppearance(
  config: StorefrontConfig,
  systemDark = false,
) {
  const t = config.theme;
  const dark =
    t.colorScheme === "dark" || (t.colorScheme === "system" && systemDark);
  const palette = dark ? config.darkTheme : t;
  const background = hexColor(
    palette.backgroundColor,
    dark ? "#111113" : "#f5f6f8",
  );
  const surface = hexColor(palette.surfaceColor, dark ? "#1c1c1f" : "#ffffff");
  const primary = hexColor(t.primaryColor, "#f85606");
  // A button left at the original orange follows a new primary colour.
  const buttonColor =
    t.buttonColor === "#f85606" ? primary : hexColor(t.buttonColor, primary);
  return {
    primary,
    primaryText: readableColor(surface, primary),
    secondary: hexColor(t.secondaryColor, primary),
    accent: hexColor(t.accentColor, "#ffba00"),
    background,
    surface,
    text: readableColor(
      surface,
      hexColor(palette.textColor, dark ? "#f5f5f7" : "#212121"),
    ),
    muted: readableColor(
      surface,
      hexColor(palette.mutedTextColor, dark ? "#a1a1aa" : "#666666"),
    ),
    border: hexColor(palette.borderColor, dark ? "#3f3f46" : "#e5e7eb"),
    onPrimary: readableColor(primary),
    buttonColor,
    buttonTextColor: readableColor(
      buttonColor,
      hexColor(t.buttonTextColor, "#ffffff"),
    ),
    buttonRadius: clamp(t.buttonRadius, 0, 40),
    cardRadius: clamp(t.cardRadius, 0, 40),
    inputRadius: clamp(t.inputRadius, 0, 40),
    spacing: clamp(t.spacing, 4, 32),
    baseFontSize: clamp(t.baseFontSize, 12, 20),
    headingScale: clamp(t.headingScale, 1, 2),
    borderWidth: clamp(t.borderWidth, 0, 6),
    shadowLevel: clamp(Number(t.shadowLevel), 0, 3),
    headingWeight: t.headingWeight,
    headerBackground: hexColor(config.header.backgroundColor, primary),
    headerText: readableColor(
      hexColor(config.header.backgroundColor, primary),
      hexColor(config.header.textColor, "#ffffff"),
    ),
    dark,
  };
}
export type Appearance = ReturnType<typeof resolveAppearance>;
const primaryColors = new Set([
  "#f85606",
  "#ff4600",
  "#f53d17",
  "#ff6e00",
  "#ff3300",
  "#ff6600",
]);
const backgrounds = new Set([
  "#f4f4f4",
  "#f5f5f7",
  "#f4f4f6",
  "#f3f4f6",
  "#f5f5f5",
  "#f9fafb",
  "#fceae4",
  "#fff0eb",
  "#fff7ed",
  "#ffebe2",
]);
const texts = new Set([
  "#212121",
  "#111827",
  "#1f2937",
  "#374151",
  "#111",
  "#111111",
  "#000",
  "#000000",
]);
const muted = new Set([
  "#757575",
  "#6b7280",
  "#9ca3af",
  "#64748b",
  "#4b5563",
  "#666",
  "#666666",
  "#888",
  "#888888",
]);
const borders = new Set([
  "#eaeaea",
  "#e5e7eb",
  "#d1d5db",
  "#c7c7cc",
  "#eee",
  "#eeeeee",
]);
export function appearanceColor(
  value: string,
  theme: Appearance,
  property = "color",
) {
  const c = value.toLowerCase();
  if (primaryColors.has(c))
    return property === "color" ? theme.primaryText : theme.primary;
  if (property === "color") {
    if (texts.has(c)) return theme.text;
    if (muted.has(c)) return theme.muted;
    return value;
  }
  if (c === "#fff" || c === "#ffffff" || c === "white") return theme.surface;
  if (backgrounds.has(c)) return theme.background;
  if (borders.has(c)) return theme.border;
  return value;
}
