import { Image } from "expo-image";
import { Linking, View } from "react-native";
import { usePublicContent } from "@/services/public-content";
import { openDestination } from "@/services/navigation";
import { T, Tap } from "./ui";
export function LiveBanners({ placement = "home" }: { placement?: string }) {
  const banners = usePublicContent("banners").filter(
    (b) =>
      (b.placement ?? "home") === placement &&
      (!Array.isArray(b.devices) ||
        !b.devices.length ||
        b.devices.includes("mobile")),
  );
  return (
    <View style={{ gap: 12 }}>
      {banners.map((b) => {
        const url = String(b.mobileImage || b.image || "");
        const heading = String(b.heading || b.name || "");
        return (
          <Tap
            key={b.id}
            label={heading}
            onPress={() => {
              if (b.productId)
                openDestination("Product details", { id: String(b.productId) });
              else if (
                typeof b.ctaLink === "string" &&
                /^https:\/\//.test(b.ctaLink)
              )
                void Linking.openURL(b.ctaLink);
            }}
            style={{ backgroundColor: "#fff", padding: 12, gap: 6 }}
          >
            {url.startsWith("https://") && (
              <Image
                source={{ uri: url }}
                style={{ width: "100%", height: 180 }}
                contentFit="cover"
                accessibilityLabel={heading}
              />
            )}
            {!!heading && (
              <T bold size={18}>
                {heading}
              </T>
            )}
            {!!b.subheading && <T>{String(b.subheading)}</T>}
          </Tap>
        );
      })}
    </View>
  );
}
