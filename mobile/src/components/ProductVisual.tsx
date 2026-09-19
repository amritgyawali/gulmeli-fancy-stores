import { Image, type ImageStyle } from "expo-image";
import { View, type StyleProp } from "react-native";
import { stitchImages, type StitchImageKey } from "@/data/stitch-images";
import type { Product } from "@/types/shop";
import { T } from "./ui";
import { FontIcon } from "./FontIcon";
import { colors, shared } from "@/theme/tokens";
import { photoFor } from "@/services/product-media";
import { useMediaUrl } from "@/services/media-library";

export function StitchImage({
  imageKey,
  fit = "cover",
  style,
}: {
  imageKey: string;
  fit?: "contain" | "cover";
  style?: StyleProp<ImageStyle>;
}) {
  const mediaUrl = useMediaUrl(imageKey);
  return (
    <Image
      source={
        mediaUrl ? { uri: mediaUrl } : stitchImages[imageKey as StitchImageKey]
      }
      contentFit={fit}
      cachePolicy="memory-disk"
      style={[{ width: "100%", height: "100%" }, style]}
    />
  );
}
// Photos come from the hosted media library, the bundled Stitch assets, or
// neither - in which case a neutral placeholder says so.
export function ProductVisual({
  product,
  small = false,
}: {
  product: Product;
  small?: boolean;
}) {
  const photo = photoFor(product);
  const imageUrl = product.imageUrl || photo?.url;
  if (imageUrl)
    return (
      <View style={{ width: "100%", height: "100%" }}>
        <Image
          source={{ uri: imageUrl }}
          accessibilityLabel={product.name}
          contentFit="cover"
          cachePolicy="memory-disk"
          style={{ width: "100%", height: "100%" }}
        />
        {(product.imageIllustrative ||
          (!product.imageUrl && photo?.illustrative)) && (
          <View
            style={{
              position: "absolute",
              bottom: 0,
              backgroundColor: "#ffffffdd",
              padding: 3,
            }}
          >
            <T size={9}>Illustrative photo</T>
          </View>
        )}
      </View>
    );
  if (product.imageKey)
    return (
      <StitchImage
        imageKey={product.imageKey}
        fit={
          product.group === "offer" &&
          ["offer-0", "offer-1", "offer-4", "offer-5"].includes(product.id)
            ? "contain"
            : "cover"
        }
      />
    );
  /*
   * Placeholder for a product with no photo.
   *
   * What was here: roughly 270 lines drawing fake packaging out of coloured
   * <View>s — a green "Glucose-D 500 Gm" carton, a blue "HORLICKS 1 KG" tub,
   * a "Didian High Energy" box, a "GYAN Chiura" packet, a navy
   * "Vartex 24" Frameless" monitor. Real brands, invented packaging, shown to
   * customers as though it were the product they were buying. The web
   * storefront had the same problem in a different form (an emoji picked from
   * a switch on the same `illustration` field), and both are gone.
   *
   * One honest placeholder replaces them: a neutral surface saying there is
   * no photo, which is the true statement.
   */
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`No photo available for ${product.name}`}
      style={[
        shared.media,
        { flex: 1, width: "100%", height: "100%" },
      ]}
    >
      <FontIcon
        name="image"
        size={small ? 18 : 28}
        color={colors.faint}
      />
      {!small && (
        <T size={11} color={colors.muted} style={{ marginTop: 6 }}>
          No photo
        </T>
      )}
    </View>
  );
}
