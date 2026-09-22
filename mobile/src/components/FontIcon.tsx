import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import type { ComponentProps } from "react";

export type FontIconName = ComponentProps<typeof FontAwesome6>["name"];

// Stitch Home/Cart use Font Awesome 6.4. Keep the same glyph family.
// Glyphs render in the outline ("regular") style where one exists; `solid`
// selects the filled one, which is how a saved heart or a rated star differs
// from an empty one.
export function FontIcon({
  name,
  size = 16,
  color = "#212121",
  solid = false,
}: {
  name: FontIconName;
  size?: number;
  color?: string;
  solid?: boolean;
}) {
  return <FontAwesome6 name={name} size={size} color={color} solid={solid} />;
}
