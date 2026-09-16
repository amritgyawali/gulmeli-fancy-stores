import { usePathname, useRouter, type Href } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Badge, T, Tap } from "./ui";
import { FontIcon } from "./FontIcon";
import { useShop } from "@/store/ShopProvider";
import { useStorefront, useStorefrontTheme } from "@/store/StorefrontProvider";

export function BottomNavigation() {
  const path = usePathname(),
    router = useRouter(),
    { bottom } = useSafeAreaInsets();
  const { cartCount } = useShop();
  const { feature } = useStorefront();
  const theme = useStorefrontTheme();
  const items = [
    { label: "Home", route: "/", icon: "house" },
    ...(feature("flashSales")
      ? [{ label: "Offers", route: "/offers", icon: "tag" }]
      : []),
    ...(feature("chat")
      ? [{ label: "Messages", route: "/messages", icon: "comment-dots" }]
      : []),
    { label: "Cart", route: "/cart", icon: "cart-shopping" },
    { label: "Account", route: "/account", icon: "user" },
  ];
  return (
    <View
      accessibilityRole="tablist"
      style={{
        backgroundColor: theme.surface,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingBottom: Math.max(bottom, 8),
        paddingTop: 8,
        flexDirection: "row",
        minHeight: 64 + bottom,
      }}
    >
      {items.map((item) => {
        const selected = path === item.route;
        const color = selected ? theme.primaryText : theme.muted;
        return (
          <Tap
            key={item.route}
            label={item.label}
            role="tab"
            selected={selected}
            onPress={() => router.navigate(item.route as Href)}
            style={{
              flex: 1,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <View
              style={{
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 4,
                backgroundColor: selected ? theme.background : "transparent",
              }}
            >
              <FontIcon name={item.icon} size={21} color={color} />
              {item.route === "/cart" && <Badge count={cartCount} />}
            </View>
            <T size={11} color={color} bold={selected}>
              {item.label}
            </T>
          </Tap>
        );
      })}
    </View>
  );
}
