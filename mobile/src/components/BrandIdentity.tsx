import { Image } from "expo-image";
import { View } from "react-native";
import { useStorefront, useStorefrontTheme } from "@/store/StorefrontProvider";
import { T } from "./ui";
export function BrandIdentity({
  compact = false,
  color,
  footer = false,
}: {
  compact?: boolean;
  color?: string;
  footer?: boolean;
}) {
  const { config } = useStorefront();
  const theme = useStorefrontTheme();
  const logo =
    (footer ? config.branding.footerLogo : "") ||
    config.branding.mobileLogo ||
    (theme.dark ? config.branding.logoDark : config.branding.logoLight) ||
    config.branding.logo;
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
      {logo ? (
        <Image
          source={{ uri: logo }}
          accessibilityLabel={config.branding.companyName}
          contentFit="contain"
          contentPosition="left center"
          style={{ width: "100%", maxWidth: 220, height: compact ? 32 : 42 }}
        />
      ) : (
        // A long store name wrapped to two lines and pushed the search field
        // and the first product down the screen. One line, shrinking to fit.
        <T
          preserveColor
          color={color ?? theme.text}
          bold
          size={compact ? 17 : 20}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          style={{ letterSpacing: -0.4 }}
        >
          {config.branding.companyName}
        </T>
      )}
      {!compact && !!config.branding.tagline && (
        <T preserveColor color={color ?? theme.muted} size={12}>
          {config.branding.tagline}
        </T>
      )}
    </View>
  );
}
