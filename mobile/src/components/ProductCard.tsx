import { memo } from "react";
import { View } from "react-native";
import type { Product } from "@/types/shop";
import { useShop } from "@/store/ShopProvider";
import { useStorefront, useStorefrontTheme } from "@/store/StorefrontProvider";
import { openDestination } from "@/services/navigation";
import { ProductVisual } from "./ProductVisual";
import { Row, T, Tap } from "./ui";
import { FontIcon } from "./FontIcon";

export const ProductCard = memo(function ProductCard({
  product,
  variant = "home",
}: {
  product: Product;
  variant?: "home" | "offer" | "recommendation";
}) {
  const { add, state } = useShop();
  const { config, label } = useStorefront();
  const theme = useStorefrontTheme();
  const quantity =
    state.cart.find((i) => i.productId === product.id)?.quantity ?? 0;
  const disabled = product.stock < 1 || quantity >= product.stock;
  const money = (amount: number) =>
    `${config.localisation.currencySymbol} ${amount.toLocaleString("en-US")}`;
  const sale = !!product.originalPrice && product.originalPrice > product.price;
  return (
    <View
      testID="product-card"
      style={{
        flex: 1,
        minWidth: 0,
        backgroundColor: theme.surface,
        borderRadius: theme.cardRadius,
        borderWidth: theme.borderWidth,
        borderColor: theme.border,
        boxShadow: theme.shadowLevel
          ? `0 ${theme.shadowLevel * 2}px ${theme.shadowLevel * 6}px rgba(0,0,0,0.10)`
          : undefined,
        overflow: "hidden",
      }}
    >
      <Tap
        label={product.name}
        onPress={() => openDestination("Product details", { id: product.id })}
        style={{
          aspectRatio: variant === "recommendation" ? 1.1 : 1,
          backgroundColor: theme.background,
        }}
      >
        <ProductVisual product={product} />
        {sale && (
          <View
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              backgroundColor: theme.surface,
              borderRadius: 8,
              padding: 6,
            }}
          >
            <T preserveColor bold size={11} color={theme.primaryText}>
              {Math.round((1 - product.price / product.originalPrice!) * 100)}%
              off
            </T>
          </View>
        )}
      </Tap>
      <View style={{ padding: 12, gap: 8, flex: 1 }}>
        <T preserveColor size={11} color={theme.muted} numberOfLines={1}>
          {product.category}
        </T>
        <Tap
          label={`View ${product.name}`}
          onPress={() => openDestination("Product details", { id: product.id })}
        >
          <T
            preserveColor
            size={14}
            bold
            numberOfLines={2}
            style={{ minHeight: 40 }}
          >
            {product.name}
          </T>
        </Tap>
        <Row style={{ gap: 6, flexWrap: "wrap" }}>
          <T preserveColor size={16} bold>
            {money(product.price)}
          </T>
          {sale && (
            <T
              preserveColor
              size={11}
              color={theme.muted}
              style={{ textDecorationLine: "line-through" }}
            >
              {money(product.originalPrice!)}
            </T>
          )}
        </Row>
        {(config.catalog.showRatings || config.catalog.showSoldCount) && (
          <Row style={{ gap: 6 }}>
            {config.catalog.showRatings && !!product.rating && (
              <>
                <FontIcon name="star" size={11} color={theme.primaryText} />
                <T preserveColor size={11}>
                  {product.rating}
                </T>
              </>
            )}
            {config.catalog.showSoldCount && !!product.sold && (
              <T preserveColor size={11} color={theme.muted}>
                {product.sold} sold
              </T>
            )}
          </Row>
        )}
        {config.catalog.showStockCount && (
          <T preserveColor size={11} color={theme.muted}>
            {product.stock > 0
              ? `${product.stock} available`
              : label("outOfStock")}
          </T>
        )}
        <Tap
          label={`Add ${product.name} to cart`}
          disabled={disabled}
          onPress={() => add(product)}
          style={{
            marginTop: "auto",
            minHeight: 48,
            backgroundColor: theme.buttonColor,
            borderRadius: theme.buttonRadius,
            alignItems: "center",
            justifyContent: "center",
            opacity: disabled ? 0.45 : 1,
            paddingHorizontal: 6,
          }}
        >
          <Row style={{ gap: 7 }}>
            <FontIcon name="plus" size={13} color={theme.buttonTextColor} />
            <T preserveColor bold size={12} color={theme.buttonTextColor}>
              {product.stock < 1
                ? label("outOfStock")
                : quantity >= product.stock
                  ? "Limit reached"
                  : label("addToCart")}
            </T>
          </Row>
        </Tap>
      </View>
    </View>
  );
});
