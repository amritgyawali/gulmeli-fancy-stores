import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import type { ComponentProps } from "react";

// Stitch Home/Cart use Font Awesome 6.4. Keep the same glyph family.
export function FontIcon({
  name,
  size = 16,
  color = "#212121",
}: {
  name: ComponentProps<typeof FontAwesome6>["name"];
  size?: number;
  color?: string;
}) {
  return <FontAwesome6 name={name} size={size} color={color} />;
}
