import { memo } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import type { Product } from "@/types/shop";
import { useShop } from "@/store/ShopProvider";
import { useStorefront, useStorefrontTheme } from "@/store/StorefrontProvider";
import { openCart, openProduct, openDestination } from "@/services/navigation";
import { ProductVisual } from "./ProductVisual";
import { Row, T } from "./ui";
import { FontIcon } from "./FontIcon";
import { PressableScale, haptic, usePop } from "./motion";
import { useToast } from "./Toast";
import { productImage } from "@/services/product-media";

/*
 * The product card.
 *
 * It used to end in a full-width "Add to cart" button on every card, so a
 * two-column grid was half buttons and the photos — what people actually
 * browse by — were small. The card now follows the layout every large
 * marketplace app converges on: a big square photo carrying the discount,
 * a wishlist heart and a round add button; then the title, the price and the
 * facts that help a decision (rating, sold count, low stock).
 *
 * The whole card opens the product; the heart and the add button are their
 * own targets on top of it, each at least 36pt with extra hit slop.
 */

export const money = (symbol: string, amount: number) =>
  `${symbol} ${amount.toLocaleString("en-US")}`;

export const compactCount = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K` : String(n);

export const discountPercent = (p: Product) =>
  p.originalPrice && p.originalPrice > p.price
    ? Math.round((1 - p.price / p.originalPrice) * 100)
    : 0;

/* The heart, shared with the product screen. */
export function WishlistHeart({
  product,
  size = 16,
  style,
  named = true,
}: {
  product: Product;
  size?: number;
  style?: object;
  /* On a grid many hearts share a screen, so each names its product. The
     product screen has one, and its label can be just the action. */
  named?: boolean;
}) {
  const { state, updateCommerce } = useShop();
  const { feature } = useStorefront();
  const theme = useStorefrontTheme();
  const toast = useToast();
  const [popStyle, pop] = usePop();
  if (!feature("wishlist")) return null;
  const saved = state.commerce.wishlist.includes(product.id);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={
        named
          ? saved
            ? `Remove ${product.name} from wishlist`
            : `Save ${product.name} to wishlist`
          : saved
            ? "Remove from wishlist"
            : "Save to wishlist"
      }
      accessibilityState={{ selected: saved }}
      hitSlop={8}
      scaleTo={0.88}
      onPress={() => {
        updateCommerce((s) => ({
          ...s,
          wishlist: s.wishlist.includes(product.id)
            ? s.wishlist.filter((x) => x !== product.id)
            : [...s.wishlist, product.id],
        }));
        void haptic(saved ? "light" : "success");
        if (!saved) pop();
        toast({
          message: saved ? "Removed from your wishlist" : "Saved to your wishlist",
          tone: saved ? "info" : "success",
          action: saved
            ? undefined
            : { label: "View", onPress: () => openDestination("Wishlist") },
        });
      }}
      style={[
        {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.surface,
          boxShadow: "0 1px 4px rgba(20,22,26,0.14)",
        },
        style,
      ]}
    >
      <Animated.View style={popStyle}>
        <FontIcon
          name="heart"
          solid={saved}
          size={size}
          color={saved ? "#e0245e" : theme.muted}
        />
      </Animated.View>
    </PressableScale>
  );
}

export const ProductCard = memo(function ProductCard({
  product,
}: {
  product: Product;
  /* Kept for callers that still pass it; every placement now uses one card. */
  variant?: "home" | "offer" | "recommendation";
}) {
  const { add, state } = useShop();
  const { config, label } = useStorefront();
  const theme = useStorefrontTheme();
  const toast = useToast();
  const [addStyle, popAdd] = usePop(1.18);
  const quantity = state.cart.find((i) => i.productId === product.id)?.quantity ?? 0;
  const out = product.stock < 1;
  const atLimit = !out && quantity >= product.stock;
  const off = discountPercent(product);
  const rating = Number.parseFloat(product.rating ?? "");
  const symbol = config.localisation.currencySymbol;

  const addToCart = () => {
    if (out || atLimit) return;
    add(product);
    popAdd();
    void haptic("medium");
    toast({
      message: "Added to your cart",
      image: productImage(product, 96),
      action: { label: "View cart", onPress: openCart },
    });
  };

  return (
    <PressableScale
      testID="product-card"
      accessibilityRole="button"
      accessibilityLabel={`Open ${product.name}`}
      scaleTo={0.98}
      onPress={() => openProduct(product.id)}
      style={{
        flex: 1,
        minWidth: 0,
        backgroundColor: theme.surface,
        borderRadius: theme.cardRadius,
        borderWidth: theme.borderWidth ? 1 : 0,
        borderColor: theme.border,
        boxShadow: theme.shadowLevel
          ? `0 ${theme.shadowLevel}px ${theme.shadowLevel * 4}px rgba(20,22,26,0.07)`
          : undefined,
        overflow: "hidden",
      }}
    >
      <View style={{ aspectRatio: 1, backgroundColor: theme.background }}>
        <ProductVisual product={product} width={320} />

        {!out && off > 0 && (
          <View
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              backgroundColor: theme.primary,
              borderRadius: 6,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <T preserveColor bold size={11} color={theme.onPrimary}>
              -{off}%
            </T>
          </View>
        )}

        <WishlistHeart product={product} style={{ position: "absolute", top: 6, right: 6 }} />

        {out ? (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(255,255,255,0.7)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                backgroundColor: "#17181a",
                borderRadius: 6,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <T preserveColor bold size={11} color="#ffffff">
                {label("outOfStock")}
              </T>
            </View>
          </View>
        ) : (
          <Animated.View style={[{ position: "absolute", right: 6, bottom: 6 }, addStyle]}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={
                atLimit ? `${product.name} limit reached` : `Add ${product.name} to cart`
              }
              accessibilityState={{ disabled: atLimit }}
              disabled={atLimit}
              hitSlop={8}
              scaleTo={0.86}
              onPress={addToCart}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: atLimit ? theme.muted : theme.buttonColor,
                boxShadow: "0 2px 6px rgba(20,22,26,0.22)",
              }}
            >
              <FontIcon
                name={atLimit ? "check" : "plus"}
                size={15}
                color={theme.buttonTextColor}
              />
            </PressableScale>
          </Animated.View>
        )}
      </View>

      <View style={{ padding: 10, gap: 5, flex: 1 }}>
        <T preserveColor size={13} numberOfLines={2} style={{ minHeight: 36 }}>
          {product.name}
        </T>
        <Row style={{ gap: 6, flexWrap: "wrap", alignItems: "baseline" }}>
          <T preserveColor size={16} bold color={theme.primaryText}>
            {money(symbol, product.price)}
          </T>
          {off > 0 && (
            <T
              preserveColor
              size={11}
              color={theme.muted}
              style={{ textDecorationLine: "line-through" }}
            >
              {money(symbol, product.originalPrice!)}
            </T>
          )}
        </Row>
        {((config.catalog.showRatings && Number.isFinite(rating)) ||
          (config.catalog.showSoldCount && !!product.sold)) && (
          <Row style={{ gap: 4 }}>
            {config.catalog.showRatings && Number.isFinite(rating) && (
              <>
                <FontIcon name="star" solid size={10} color="#f0a018" />
                <T preserveColor size={11} bold>
                  {rating.toFixed(1)}
                </T>
              </>
            )}
            {config.catalog.showSoldCount && !!product.sold && (
              <T preserveColor size={11} color={theme.muted}>
                {config.catalog.showRatings && Number.isFinite(rating) ? "· " : ""}
                {compactCount(product.sold)} sold
              </T>
            )}
          </Row>
        )}
        {product.fastDelivery && (
          <Row style={{ gap: 4 }}>
            <FontIcon name="truck-fast" size={10} color="#10646e" />
            <T preserveColor size={11} color="#10646e">
              Fast delivery
            </T>
          </Row>
        )}
        {!out && product.stock <= 5 ? (
          <T preserveColor size={11} bold color="#c02626">
            Only {product.stock} left
          </T>
        ) : (
          config.catalog.showStockCount && (
            <T preserveColor size={11} color={theme.muted}>
              {out ? label("outOfStock") : `${product.stock} available`}
            </T>
          )
        )}
      </View>
    </PressableScale>
  );
});

/* Loading placeholder with the card's proportions. */
export function ProductCardSkeleton() {
  const theme = useStorefrontTheme();
  const block = (w: string | number, h: number) => (
    <View
      style={{ width: w as never, height: h, borderRadius: 4, backgroundColor: theme.border }}
    />
  );
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.surface,
        borderRadius: theme.cardRadius,
        overflow: "hidden",
        opacity: 0.7,
      }}
    >
      <View style={{ aspectRatio: 1, backgroundColor: theme.border }} />
      <View style={{ padding: 10, gap: 8 }}>
        {block("90%", 10)}
        {block("60%", 10)}
        {block("40%", 14)}
      </View>
    </View>
  );
}
