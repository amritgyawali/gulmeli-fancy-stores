import { Platform, StyleSheet } from "react-native";

/*
 * Static design tokens for the app.
 *
 * Runtime colour still comes from `resolveAppearance` (the admin console can
 * repaint the storefront), so this file holds what does not change: the
 * neutral ramp behind the themed colours, the type ramp, the spacing rhythm,
 * the radii and the elevation steps.
 *
 * It replaces a flat list of nine hex values with no relationship to each
 * other — three near-identical greys named after the screens that happened to
 * use them (`accountBackground`, `messagesBackground`) — plus the hardcoded
 * `#f3f4f6`, `#c7c7cc`, `#e5e7eb` and `#6b7280` that screens reached for when
 * the list came up short. Same palette as the web storefront, so a customer
 * moving between the two sees one product.
 */

export const colors = {
  /* brand — the runtime theme overrides these; they are the defaults */
  brand: "#e2540b",
  brandStrong: "#b83f05",
  brandSoft: "#fff1e9",

  /* neutral ramp, warm, light to dark */
  canvas: "#f4f4f5",
  surface: "#ffffff",
  sunken: "#fafafa",
  line: "#e8e8ea",
  lineStrong: "#d6d7da",
  faint: "#a5a9af",
  muted: "#6e7278",
  soft: "#4a4d52",
  text: "#17181a",

  /* status */
  positive: "#1a7f4b",
  positiveSoft: "#e8f6ee",
  caution: "#9a6100",
  cautionSoft: "#fdf3e2",
  critical: "#c02626",
  criticalSoft: "#fdeceb",
  info: "#10646e",
  infoSoft: "#e7f3f5",
  star: "#f0a018",

  white: "#ffffff",

  /* Retained so older screens keep compiling; prefer `brand` and the ramp. */
  orange: "#e2540b",
  offerOrange: "#e2540b",
  offerPrice: "#b83f05",
  background: "#f4f4f5",
  accountBackground: "#f4f4f5",
  messagesBackground: "#f4f4f5",
  border: "#e8e8ea",
};

/* 4pt rhythm. Screens previously mixed 6/7/10/14/18/22/28 arbitrarily. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
} as const;

/*
 * Type ramp. Sizes are the rendered size before the admin console's
 * `baseFontSize` offset is applied in <T/>. Nothing below 12 carries content;
 * 11 is for counters and badges only.
 */
export const type = {
  badge: 11,
  caption: 12,
  body: 14,
  bodyLarge: 15,
  title: 17,
  heading: 20,
  display: 26,
} as const;

/* Minimum comfortable touch target, used by every tappable control. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const TOUCH_SIZE = 48;

export const fontFamily = Platform.select({
  ios: "System",
  android: "sans-serif",
  web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
});

/*
 * Elevation. React Native needs `elevation` on Android and a shadow on iOS;
 * screens that set only `boxShadow` rendered flat on Android, which is why
 * cards looked different between the two platforms.
 */
export const elevation = (level: 0 | 1 | 2 | 3) =>
  level === 0
    ? {}
    : Platform.select({
        android: { elevation: level * 2 },
        default: {
          shadowColor: "#14161a",
          shadowOpacity: 0.04 + level * 0.03,
          shadowRadius: level * 4,
          shadowOffset: { width: 0, height: level },
        },
      });

export const shared = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  center: { alignItems: "center", justifyContent: "center" },
  fill: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  /* Media placeholder behind a product photo while it loads or when missing. */
  media: {
    backgroundColor: colors.sunken,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
