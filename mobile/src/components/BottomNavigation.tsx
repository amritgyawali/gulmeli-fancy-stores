import { usePathname, useRouter, type Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Badge, SourceIcon, T, Tap } from "./ui";
import { FontIcon } from "./FontIcon";
import { useShop } from "@/store/ShopProvider";
import { useStorefront } from "@/store/StorefrontProvider";
import { colors } from "@/theme/tokens";

export function BottomNavigation() {
  const path = usePathname();
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { cartCount, state } = useShop();
  const { feature, config } = useStorefront();
  const home = path === "/";
  const messages = path === "/messages";
  const offer = path === "/offers";
  // Which tabs exist is an admin decision, not a code one.
  const items = [
    { label: "Home", route: "/", icon: 10, fa: "house" },
    ...(feature("chat")
      ? [
          {
            label: "Messages",
            route: "/messages",
            icon: 11,
            fa: "comment-dots",
          },
        ]
      : []),
    ...(!home && feature("flashSales")
      ? [{ label: "Buy More Save More", route: "/offers", icon: -1, fa: "tag" }]
      : []),
    { label: "Cart", route: "/cart", icon: 12, fa: "cart-shopping" },
    { label: "Account", route: "/account", icon: 13, fa: "user" },
  ];
  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        paddingBottom: Math.max(bottom, 6),
        paddingTop: 6,
        flexDirection: "row",
        alignItems: "center",
        minHeight: 56 + bottom,
      }}
    >
      {items.map((item) => {
        const selected = path === item.route;
        const color = selected ? config.theme.primaryColor : "#4b5563";
        return (
          <Tap
            key={item.route}
            role="tab"
            selected={selected}
            label={item.label}
            onPress={() => router.navigate(item.route as Href)}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 3,
              gap: 3,
            }}
          >
            {item.icon === -1 ? (
              <LinearGradient
                colors={["#ff6e00", "#ff3300"]}
                style={{
                  width: messages ? 48 : 46,
                  height: messages ? 40 : 46,
                  borderRadius: messages ? 16 : 99,
                  marginTop: messages ? 0 : -12,
                  borderWidth: 2,
                  borderColor: "#fff",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 4px #0002",
                }}
              >
                <T
                  size={messages ? 9 : 8}
                  bold
                  color="#fff"
                  style={{ lineHeight: 10 }}
                >
                  {messages ? "BUY+" : "UP TO"}
                </T>
                <T
                  size={messages ? 9 : 12}
                  bold
                  color="#fff"
                  style={{ lineHeight: 12 }}
                >
                  {messages ? "SAVE+" : "50%"}
                </T>
                {!messages && (
                  <T size={7} bold color="#fff" style={{ lineHeight: 8 }}>
                    OFF
                  </T>
                )}
              </LinearGradient>
            ) : (
              <>
                <View>
                  {home || path === "/cart" ? (
                    <FontIcon
                      name={item.fa}
                      size={home ? 20 : 22}
                      color={color}
                    />
                  ) : path === "/account" ? (
                    <View
                      style={
                        item.route === "/account"
                          ? {
                              width: 24,
                              height: 24,
                              borderRadius: 99,
                              backgroundColor: colors.orange,
                              alignItems: "center",
                              justifyContent: "center",
                            }
                          : undefined
                      }
                    >
                      <SourceIcon
                        source="account"
                        index={item.icon + 8}
                        size={item.route === "/account" ? 18 : 24}
                        color={item.route === "/account" ? "#fff" : color}
                      />
                    </View>
                  ) : (
                    <SourceIcon
                      source={offer ? "offer" : "messages"}
                      index={offer ? item.icon + 12 : item.icon}
                      size={offer ? 20 : 24}
                      color={color}
                    />
                  )}
                  {item.route === "/messages" && (
                    <Badge count={state.messagesRead ? 0 : 13} />
                  )}
                  {item.route === "/cart" && <Badge count={cartCount} />}
                </View>
                <T size={home ? 10 : 11} color={color} bold={selected}>
                  {item.label}
                </T>
              </>
            )}
          </Tap>
        );
      })}
    </View>
  );
}
