import { Platform, StyleSheet } from "react-native";

// Values extracted from the Stitch Tailwind configurations, not a new theme.
export const colors = {
  orange: "#f85606",
  offerOrange: "#FF4600",
  offerPrice: "#F53D17",
  background: "#f4f4f4",
  accountBackground: "#f5f5f7",
  messagesBackground: "#f4f4f6",
  text: "#212121",
  muted: "#757575",
  border: "#eaeaea",
  white: "#ffffff",
};
export const fontFamily = Platform.select({
  ios: "System",
  android: "sans-serif",
  web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
});
export const shared = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  center: { alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    boxShadow: "0px 1px 2px rgba(0,0,0,0.05)",
  },
  divider: { borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
});
