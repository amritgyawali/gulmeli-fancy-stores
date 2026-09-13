import { memo } from "react";
import { View } from "react-native";
import type { Product } from "@/types/shop";
import { useShop } from "@/store/ShopProvider";
import { openDestination } from "@/services/navigation";
import { ProductVisual } from "./ProductVisual";
import { Row, SourceIcon, T, Tap } from "./ui";
import { FontIcon } from "./FontIcon";
import { colors } from "@/theme/tokens";

export const ProductCard = memo(function ProductCard({
  product,
  variant = "home",
}: {
  product: Product;
  variant?: "home" | "offer" | "recommendation";
}) {
  const { add, state } = useShop();
  const offer = variant === "offer";
  const rec = variant === "recommendation";
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: "#fff",
        borderWidth: rec || offer ? 1 : 0,
        borderColor: "#f3f4f6",
      }}
    >
      <Tap
        label={`Open ${product.name}`}
        onPress={() => openDestination("Product details", { id: product.id })}
        style={{
          width: "100%",
          aspectRatio: rec ? undefined : 1,
          height: rec ? 144 : undefined,
          backgroundColor: "#f9fafb",
        }}
      >
        <ProductVisual product={product} />
        {!!product.badge && (
          <T
            size={8}
            bold
            color="#fff"
            style={{
              position: "absolute",
              top: product.id === "offer-0" ? undefined : 4,
              bottom: product.id === "offer-0" ? 4 : undefined,
              right: product.id === "offer-0" ? 4 : undefined,
              left: product.id === "offer-0" ? undefined : 4,
              backgroundColor: product.id === "offer-0" ? "#dc2626" : "#374151",
              paddingHorizontal: 4,
              borderRadius: 2,
            }}
          >
            {product.badge}
          </T>
        )}
        {product.id === "balaclava" && (
          <T
            size={8}
            bold
            color="#fff"
            style={{
              position: "absolute",
              top: 4,
              left: 4,
              backgroundColor: "#dc2626",
              paddingHorizontal: 4,
            }}
          >
            Summer Upgrade
          </T>
        )}
        {!offer && product.id !== "speaker" && (
          <Row style={{ position: "absolute", bottom: 4, left: 4 }}>
            <T
              size={8}
              bold
              color="#fff"
              style={{
                backgroundColor: rec ? "#00a699" : "#047857",
                paddingHorizontal: 4,
              }}
            >
              FREE DELIVERY
            </T>
            {!rec && (
              <T
                size={7}
                bold
                color="#fff"
                style={{
                  backgroundColor: product.voucher ? "#e11d48" : "#9333ea",
                  paddingHorizontal: 4,
                }}
              >
                {product.voucher ? "VOUCHER MAX" : "GEMS"}
              </T>
            )}
          </Row>
        )}
      </Tap>
      <View style={{ padding: 8, flex: 1, justifyContent: "space-between" }}>
        <View>
          {offer && (
            <Row style={{ gap: 4, marginBottom: 4 }}>
              {["offer-0", "offer-1"].includes(product.id) && (
                <T
                  size={9}
                  color="#fff"
                  bold
                  style={{
                    backgroundColor: colors.offerOrange,
                    paddingHorizontal: 4,
                  }}
                >
                  9.9
                </T>
              )}
              <T
                size={9}
                color={colors.offerOrange}
                bold
                style={{ backgroundColor: "#FFF0EB", paddingHorizontal: 4 }}
              >
                Buy More Save More
              </T>
            </Row>
          )}
          <Tap
            label={`View ${product.name}`}
            onPress={() =>
              openDestination("Product details", { id: product.id })
            }
          >
            <T
              size={12}
              numberOfLines={2}
              style={{ lineHeight: 16, minHeight: offer ? 32 : undefined }}
            >
              {!offer && product.id !== "home-3" && product.id !== "speaker" ? (
                <T
                  size={8}
                  color="#fff"
                  bold
                  style={{ backgroundColor: colors.orange }}
                >
                  {" "}
                  9.9{" "}
                </T>
              ) : null}{" "}
              {product.name}
            </T>
          </Tap>
        </View>
        <View style={{ marginTop: offer ? 8 : 4 }}>
          <Row style={{ gap: 4, flexWrap: "wrap" }}>
            <T
              size={offer ? 14 : 12}
              bold
              color={offer ? colors.offerPrice : colors.orange}
            >
              Rs.{offer ? " " : ""}
              {product.price.toLocaleString("en-US")}
            </T>
            <T
              size={10}
              color={offer ? "#fff" : rec ? "#9ca3af" : colors.orange}
              style={
                offer
                  ? {
                      backgroundColor: colors.offerOrange,
                      paddingHorizontal: 2,
                    }
                  : undefined
              }
            >
              {product.discount}
            </T>
          </Row>
          {offer && (
            <T
              size={10}
              color="#9ca3af"
              style={{ textDecorationLine: "line-through" }}
            >
              Rs. {product.originalPrice?.toLocaleString("en-US")}
            </T>
          )}
          {offer && (
            <T
              size={10}
              bold
              color="#D97706"
              style={{
                backgroundColor: "#FEF8E7",
                paddingHorizontal: 6,
                paddingVertical: 2,
                alignSelf: "flex-start",
                marginTop: 4,
                borderRadius: 4,
              }}
            >
              Any 2 for 5% Off
            </T>
          )}
          {!!product.gems && (
            <T
              size={9}
              color="#7e22ce"
              style={{
                backgroundColor: "#faf5ff",
                alignSelf: "flex-start",
                paddingHorizontal: 4,
                borderRadius: 2,
                marginTop: 4,
              }}
            >
              Gems save Rs.{product.gems}
            </T>
          )}
          {product.fastDelivery && (
            <T
              size={9}
              color="#047857"
              style={{
                backgroundColor: "#ecfdf5",
                alignSelf: "flex-start",
                paddingHorizontal: 4,
                marginTop: 4,
              }}
            >
              ϟ Fast delivery
            </T>
          )}
          <Row
            style={{
              justifyContent: "space-between",
              marginTop: offer || rec ? 8 : 6,
              gap: 2,
              paddingTop: offer ? 4 : 0,
              borderTopWidth: offer ? 1 : 0,
              borderColor: "#f9fafb",
            }}
          >
            <T
              size={offer || rec ? 10 : 9}
              color="#9ca3af"
              style={{ flexShrink: 1 }}
            >
              {product.rating && (
                <T size={9} color="#fbbf24">
                  ★{" "}
                </T>
              )}
              {product.rating}
              {offer
                ? `${product.rating ? " | " : ""}Hot deals`
                : product.sold
                  ? ` · ${product.sold} sold`
                  : ""}
            </T>
            {(offer || rec) && (
              <Tap
                label={`Add ${product.name} to cart`}
                disabled={
                  product.stock < 1 ||
                  (state.cart.find((i) => i.productId === product.id)
                    ?.quantity || 0) >= product.stock
                }
                onPress={() => add(product)}
                style={{
                  width: offer ? 28 : 24,
                  height: offer ? 28 : 24,
                  backgroundColor: offer ? colors.offerOrange : colors.orange,
                  borderRadius: 99,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {offer ? (
                  <SourceIcon
                    source="offer"
                    index={12}
                    size={14}
                    color="#fff"
                  />
                ) : (
                  <FontIcon name="cart-shopping" size={10} color="#fff" />
                )}
              </Tap>
            )}
          </Row>
        </View>
      </View>
    </View>
  );
});
