import { Image, type ImageStyle } from "expo-image";
import { View, type StyleProp } from "react-native";
import { stitchImages, type StitchImageKey } from "@/data/stitch-images";
import type { Product } from "@/types/shop";
import { T } from "./ui";
import { FontIcon } from "./FontIcon";
import { shared } from "@/theme/tokens";
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
// The Cart export supplies CSS illustrations, not product photograph assets.
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
  const p = product.illustration;
  const scale = small ? 0.5 : 1;
  return (
    <View
      style={[
        shared.center,
        {
          flex: 1,
          width: "100%",
          backgroundColor: "#f9fafb",
          overflow: "hidden",
        },
      ]}
    >
      <View
        style={[
          shared.center,
          {
            transform: [{ scale }],
            width: small ? 64 : "100%",
            height: small ? 80 : "100%",
          },
        ]}
      >
        {p === "dabur" && (
          <View
            style={[
              shared.center,
              {
                width: 56,
                height: 64,
                backgroundColor: "#dcfce7",
                borderRadius: 6,
                padding: 4,
              },
            ]}
          >
            <View
              style={{
                width: 40,
                height: 12,
                backgroundColor: "#16a34a",
                marginBottom: 4,
              }}
            />
            <T size={8} bold color="#14532d">
              Glucose-D
            </T>
            <T size={6} color="#15803d">
              500 Gm
            </T>
          </View>
        )}
        {p === "didian" && (
          <View
            style={[
              shared.center,
              {
                width: 56,
                height: 64,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: "#78350f33",
                backgroundColor: "#78350f1a",
                padding: 3,
              },
            ]}
          >
            <FontIcon name="cookie" size={16} color="#92400e" />
            <T
              size={7}
              bold
              color="#78350f"
              style={{ textAlign: "center", marginTop: 4 }}
            >
              Didian High Energy
            </T>
          </View>
        )}
        {p === "horlicks" && (
          <View
            style={{
              width: 40,
              height: 64,
              borderRadius: 4,
              backgroundColor: "#2563eb",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 4,
            }}
          >
            <T size={6} bold color="#fff">
              HORLICKS
            </T>
            <FontIcon name="wheat-awn" color="#fcd34d" size={10} />
            <T
              size={5}
              bold
              color="#1d4ed8"
              style={{
                backgroundColor: "#fff",
                borderRadius: 2,
                paddingHorizontal: 2,
              }}
            >
              1 KG
            </T>
          </View>
        )}
        {p === "gyan" && (
          <View
            style={[
              shared.center,
              {
                width: 48,
                height: 64,
                backgroundColor: "#fee2e2",
                borderWidth: 1,
                borderColor: "#fca5a5",
              },
            ]}
          >
            <T size={7} bold color="#b91c1c">
              GYAN
            </T>
            <T size={7} color="#b91c1c">
              Chiura
            </T>
          </View>
        )}
        {p === "monitor" && (
          <View
            style={[
              shared.center,
              {
                width: "90%",
                height: "90%",
                backgroundColor: "#0f172a",
                borderColor: "#d1d5db",
                borderWidth: 1,
                borderRadius: 4,
              },
            ]}
          >
            <FontIcon name="desktop" size={24} color="#22d3ee" />
            <T size={8} bold color="#d1d5db" style={{ marginTop: 4 }}>
              Vartex 24&quot; Frameless
            </T>
          </View>
        )}
        {p === "restricted" && (
          <>
            <View
              style={[
                shared.center,
                {
                  width: 40,
                  height: 40,
                  borderRadius: 99,
                  borderWidth: 2,
                  borderColor: "#9ca3af",
                  marginBottom: 4,
                },
              ]}
            >
              <T size={12} bold color="#6b7280">
                18+
              </T>
            </View>
            <T size={9} bold color="#374151">
              Restricted Content
            </T>
            <T
              size={6}
              color="#9ca3af"
              style={{ textAlign: "center", paddingHorizontal: 8 }}
            >
              This item contains sexually explicit images and contents.
            </T>
          </>
        )}
        {p === "balaclava" && (
          <View
            style={[
              shared.center,
              {
                width: 80,
                height: 112,
                borderRadius: 99,
                backgroundColor: "#171717",
              },
            ]}
          >
            <View
              style={{
                width: 32,
                height: 12,
                borderRadius: 99,
                backgroundColor: "#262626",
                marginBottom: 4,
              }}
            />
            <T size={7} color="#a3a3a3">
              Balaclava
            </T>
          </View>
        )}
        {p === "speaker" && (
          <View
            style={[
              shared.center,
              {
                width: 80,
                height: 80,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#404040",
                backgroundColor: "#262626",
                gap: 4,
              },
            ]}
          >
            <T size={14} bold color="#d97706" style={{ letterSpacing: 2 }}>
              JBL
            </T>
            <FontIcon name="volume-high" size={12} color="#9ca3af" />
          </View>
        )}
        {p === "posters" && (
          <View
            style={[
              shared.center,
              {
                width: 96,
                height: 112,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: "#fcd34d",
                backgroundColor: "#fef3c7",
                gap: 4,
              },
            ]}
          >
            <FontIcon name="image" size={20} color="#b45309" />
            <T size={8} bold>
              AOT Poster Set
            </T>
          </View>
        )}
        {p === "film" && (
          <View
            style={[
              shared.center,
              {
                width: 96,
                height: 80,
                backgroundColor: "#e5e7eb",
                borderWidth: 1,
                borderColor: "#9ca3af",
                borderRadius: 4,
                gap: 5,
              },
            ]}
          >
            <FontIcon name="laptop" color="#4b5563" size={24} />
            <T size={7} color="#6b7280">
              Screen Film
            </T>
          </View>
        )}
      </View>
    </View>
  );
}
