import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Share,
  StatusBar,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useCatalog, useShop } from "@/store/ShopProvider";
import { useStorefront, useStorefrontTheme } from "@/store/StorefrontProvider";
import { Row, T } from "@/components/ui";
import { FontIcon, type FontIconName } from "@/components/FontIcon";
import {
  ProductCard,
  WishlistHeart,
  compactCount,
  discountPercent,
  money,
} from "@/components/ProductCard";
import { ProductVisual } from "@/components/ProductVisual";
import { PressableScale, haptic, usePop } from "@/components/motion";
import { useToast } from "@/components/Toast";
import { openCart, openDestination } from "@/services/navigation";
import { productImage, sizedImage, photoFor } from "@/services/product-media";
import { VOUCHER_TERMS, deliveryTerms, deliveryWindow } from "@/services/delivery";
import type { Product } from "@/types/shop";

/*
 * Product details, as its own screen.
 *
 * The product used to be one branch of the catch-all feature screen: a
 * 280pt photo in a card, the title, the price in a fixed orange, and then
 * three stacked full-width buttons (Save to wishlist, Add to cart, Go to
 * cart) with a notice box that appeared at the top of the scroll view —
 * usually off screen — when something was added.
 *
 * This screen is laid out the way shoppers expect from a marketplace app:
 *
 * - Edge-to-edge photos that page sideways, with a counter and dots, and a
 *   full-screen viewer on tap.
 * - A floating header (back, share, cart) over the photo that turns solid
 *   and shows the product name once the photo scrolls away.
 * - Price, saving and rating first; then delivery as dates, returns, cash on
 *   delivery and the seller — all from the store's configuration.
 * - Add to cart and Buy now fixed at the bottom within thumb reach, with a
 *   haptic tap, a toast offering the cart, and the cart badge bumping.
 * - Similar products and recently viewed underneath, so the page is never a
 *   dead end.
 *
 * Nothing is invented: no review counts, seller scores or ratings the
 * catalogue does not hold.
 */

const MAX_CONTENT = 1100;

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(windowWidth, MAX_CONTENT);
  const theme = useStorefrontTheme();
  const { config } = useStorefront();
  const { productById, products } = useCatalog();
  const { state, add, select, updateCommerce, cartCount, catalogReady, live } = useShop();
  const toast = useToast();
  const [badgeStyle, bumpBadge] = usePop(1.35);

  const product = id ? productById[id] : undefined;
  const [qty, setQty] = useState(1);
  const [page, setPage] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const scrollY = useSharedValue(0);

  const symbol = config.localisation.currencySymbol;
  const terms = deliveryTerms(config);
  const eta = deliveryWindow(terms.estimate);

  /* Record the view: most recent first, the same list the account and the
     web storefront read. */
  useEffect(() => {
    if (!product) return;
    updateCommerce((s) =>
      s.recent[0] === product.id
        ? s
        : { ...s, recent: [product.id, ...s.recent.filter((x) => x !== product.id)].slice(0, 30) },
    );
  }, [product, updateCommerce]);

  const photos = useMemo(() => {
    if (!product) return [] as string[];
    const main = product.imageUrl || photoFor(product)?.url;
    const extra = (product.images ?? []).filter((u) => u.startsWith("https://"));
    return [...new Set([main, ...extra].filter((u): u is string => Boolean(u)))].slice(0, 8);
  }, [product]);

  const similar = useMemo(() => {
    if (!product) return [];
    return products
      .filter((p) => p.id !== product.id && p.category === product.category && p.stock > 0)
      .sort((a, b) => Math.abs(a.price - product.price) - Math.abs(b.price - product.price))
      .slice(0, 10);
  }, [products, product]);

  const recent = useMemo(
    () =>
      state.commerce.recent
        .filter((x) => x !== product?.id)
        .map((x) => productById[x])
        .filter((p): p is Product => Boolean(p))
        .slice(0, 10),
    [state.commerce.recent, productById, product?.id],
  );

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const headerBg = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [width * 0.55, width * 0.85], [0, 1], Extrapolation.CLAMP),
  }));
  const photoParallax = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(scrollY.value, [-width, 0, width], [-width / 2, 0, width * 0.35]),
      },
      { scale: interpolate(scrollY.value, [-width, 0], [2, 1], Extrapolation.CLAMP) },
    ],
  }));

  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  if (!product)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          gap: 12,
          backgroundColor: theme.background,
        }}
      >
        <FontIcon name="box-open" size={40} color={theme.muted} />
        <T preserveColor size={18} bold>
          {catalogReady || !live ? "This product is not available" : "Loading product…"}
        </T>
        <T preserveColor color={theme.muted} style={{ textAlign: "center" }}>
          {catalogReady || !live
            ? "It may have been removed from the catalogue."
            : "One moment while the catalogue loads."}
        </T>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Browse products"
          onPress={() => openDestination("Search results")}
          style={{
            marginTop: 8,
            paddingHorizontal: 22,
            minHeight: 48,
            justifyContent: "center",
            borderRadius: 24,
            backgroundColor: theme.buttonColor,
          }}
        >
          <T preserveColor bold color={theme.buttonTextColor}>
            Browse products
          </T>
        </PressableScale>
      </View>
    );

  const out = product.stock < 1;
  const inCart = state.cart.find((i) => i.productId === product.id)?.quantity ?? 0;
  const remaining = Math.max(0, product.stock - inCart);
  const cannotAdd = out || remaining < 1;
  const off = discountPercent(product);
  const rating = Number.parseFloat(product.rating ?? "");
  const seller = product.store || config.branding.companyName;
  const myReviews = state.commerce.reviews.filter((r) => r.productId === product.id);

  const addToCart = (andCheckout = false) => {
    if (cannotAdd) return;
    const n = Math.min(qty, remaining);
    for (let i = 0; i < n; i += 1) add(product);
    void haptic(andCheckout ? "medium" : "success");
    bumpBadge();
    setQty(1);
    if (andCheckout) {
      /* Buy now checks out this product alone: everything else in the cart
         stays there, just not selected for this order. */
      const others = state.cart.map((i) => i.productId).filter((x) => x !== product.id);
      if (others.length) select(others, false);
      select([product.id], true);
      openDestination("Checkout");
      return;
    }
    toast({
      message: n > 1 ? `${n} added to your cart` : "Added to your cart",
      image: productImage(product, 96),
      action: { label: "View cart", onPress: openCart },
    });
  };

  const share = async () => {
    void haptic("light");
    try {
      await Share.share({
        message: `${product.name} — ${money(symbol, product.price)} at ${config.branding.companyName}`,
      });
    } catch {
      /* dismissed */
    }
  };

  const onPhotoScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== page) setPage(i);
  };

  const card = {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  } as const;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}
      >
        {/* Photos */}
        <View style={{ width, height: width, overflow: "hidden", backgroundColor: theme.surface }}>
          <Animated.View style={[{ flex: 1 }, photoParallax]}>
            {photos.length ? (
              <FlatList
                data={photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(u) => u}
                onMomentumScrollEnd={onPhotoScroll}
                onScroll={onPhotoScroll}
                scrollEventThrottle={32}
                renderItem={({ item, index }) => (
                  <Pressable
                    accessibilityRole="imagebutton"
                    accessibilityLabel={`${product.name}, photo ${index + 1} of ${photos.length}. Open full screen`}
                    onPress={() => setViewer(index)}
                    style={{ width, height: width }}
                  >
                    <Image
                      source={{ uri: sizedImage(item, width * 2) }}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="memory-disk"
                      style={{ width, height: width }}
                    />
                  </Pressable>
                )}
              />
            ) : (
              <ProductVisual product={product} width={width} />
            )}
          </Animated.View>
          {photos.length > 1 && (
            <>
              <View
                style={{
                  position: "absolute",
                  bottom: 14,
                  alignSelf: "center",
                  flexDirection: "row",
                  gap: 6,
                }}
              >
                {photos.map((u, i) => (
                  <Dot key={u} active={i === page} color={theme.primary} />
                ))}
              </View>
              <View
                style={{
                  position: "absolute",
                  right: 14,
                  bottom: 10,
                  backgroundColor: "rgba(0,0,0,0.55)",
                  borderRadius: 12,
                  paddingHorizontal: 9,
                  paddingVertical: 2,
                }}
              >
                <T preserveColor size={11} bold color="#ffffff">
                  {page + 1}/{photos.length}
                </T>
              </View>
            </>
          )}
        </View>

        <View style={{ padding: 12, gap: 12 }}>
          {/* Price and title */}
          <View style={card}>
            <Row style={{ gap: 8, flexWrap: "wrap", alignItems: "baseline" }}>
              <T preserveColor size={26} bold color={theme.primaryText}>
                {money(symbol, product.price)}
              </T>
              {off > 0 && (
                <>
                  <T
                    preserveColor
                    size={14}
                    color={theme.muted}
                    style={{ textDecorationLine: "line-through" }}
                  >
                    {money(symbol, product.originalPrice!)}
                  </T>
                  <View
                    style={{
                      backgroundColor: theme.primary,
                      borderRadius: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 1,
                    }}
                  >
                    <T preserveColor size={12} bold color={theme.onPrimary}>
                      -{off}%
                    </T>
                  </View>
                </>
              )}
            </Row>
            {off > 0 && (
              <Row style={{ gap: 6 }}>
                <FontIcon name="tag" size={12} color="#1a7f4b" />
                <T preserveColor size={13} bold color="#1a7f4b">
                  You save {money(symbol, product.originalPrice! - product.price)}
                </T>
              </Row>
            )}
            <Row style={{ gap: 12, alignItems: "flex-start" }}>
              <T
                preserveColor
                accessibilityRole="header"
                size={18}
                bold
                style={{ flex: 1, letterSpacing: -0.3 }}
              >
                {product.name}
              </T>
              <WishlistHeart product={product} named={false} size={18} style={{ width: 44, height: 44, borderRadius: 22 }} />
            </Row>
            {(Number.isFinite(rating) || !!product.sold) && (
              <Row style={{ gap: 8 }}>
                {Number.isFinite(rating) && (
                  <Row style={{ gap: 4 }}>
                    <Stars value={rating} />
                    <T preserveColor size={13} bold>
                      {rating.toFixed(1)}
                    </T>
                  </Row>
                )}
                {!!product.sold && (
                  <T preserveColor size={13} color={theme.muted}>
                    {Number.isFinite(rating) ? "· " : ""}
                    {compactCount(product.sold)} sold
                  </T>
                )}
              </Row>
            )}
            {!!product.gems && (
              <Row style={{ gap: 6 }}>
                <FontIcon name="gem" size={12} color="#10646e" />
                <T preserveColor size={13} color="#10646e">
                  Earn {product.gems} gems when this order is delivered
                </T>
              </Row>
            )}
          </View>

          {product.voucher && (
            <View
              style={{
                ...card,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: theme.primary,
                paddingVertical: 12,
              }}
            >
              <FontIcon name="ticket" size={16} color={theme.primaryText} />
              <T preserveColor size={13} bold color={theme.primaryText} style={{ flex: 1 }}>
                {VOUCHER_TERMS}
              </T>
            </View>
          )}

          {/* Availability and quantity */}
          <View style={card}>
            {out ? (
              <InfoRow icon="circle-xmark" tone="#c02626" title="Out of stock" />
            ) : product.stock <= 10 ? (
              <InfoRow
                icon="fire"
                tone="#9a6100"
                title={`Only ${product.stock} left in stock`}
                note="Order soon"
              />
            ) : (
              <InfoRow icon="circle-check" tone="#1a7f4b" title="In stock" />
            )}
            {!out && (
              <Row style={{ justifyContent: "space-between" }}>
                <T preserveColor size={14} color={theme.muted}>
                  Quantity
                  {inCart > 0 ? ` · ${inCart} in cart` : ""}
                </T>
                <Stepper value={qty} max={Math.max(1, remaining)} onChange={setQty} />
              </Row>
            )}
          </View>

          {/* Delivery, returns, seller */}
          <View style={card}>
            <InfoRow
              icon="truck-fast"
              tone={theme.primaryText}
              title={eta ? `Arrives ${eta}` : `Delivery ${terms.estimate}`}
              note={`Free delivery on orders over ${money(symbol, terms.freeOver)} · Cash on delivery`}
            />
            <Divider />
            <InfoRow
              icon="rotate-left"
              tone={theme.primaryText}
              title={`${terms.returnDays}-day returns`}
              note="Unused items in original packaging, from the delivery date."
            />
            <Divider />
            <Row style={{ gap: 12 }}>
              <IconBubble icon="store" tone={theme.primaryText} />
              <View style={{ flex: 1 }}>
                <T preserveColor size={12} color={theme.muted}>
                  Sold by
                </T>
                <T preserveColor size={14} bold numberOfLines={1}>
                  {seller}
                </T>
              </View>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Visit seller"
                onPress={() => openDestination("Seller storefront", { store: seller })}
                style={{
                  paddingHorizontal: 14,
                  minHeight: 36,
                  justifyContent: "center",
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <T preserveColor size={13} bold>
                  Visit store
                </T>
              </PressableScale>
            </Row>
          </View>

          {/* Details */}
          <View style={card}>
            <T preserveColor size={16} bold accessibilityRole="header">
              Product details
            </T>
            {!!product.description && (
              <>
                <T
                  preserveColor
                  size={14}
                  color={theme.text}
                  numberOfLines={expanded ? undefined : 4}
                  style={{ lineHeight: 21 }}
                >
                  {product.description}
                </T>
                {product.description.length > 180 && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setExpanded((e) => !e)}
                    hitSlop={8}
                  >
                    <T preserveColor size={13} bold color={theme.primaryText}>
                      {expanded ? "Show less" : "Read more"}
                    </T>
                  </Pressable>
                )}
              </>
            )}
            {[
              ["Category", product.category],
              ["Brand", product.brand],
              ["Seller", seller],
              ["Availability", out ? "Out of stock" : `${product.stock} in stock`],
              ["Product ID", product.id],
            ]
              .filter((row): row is [string, string] => Boolean(row[1]))
              .map(([k, v]) => (
                <Row key={k} style={{ gap: 12 }}>
                  <T preserveColor size={13} color={theme.muted} style={{ width: 96 }}>
                    {k}
                  </T>
                  <T preserveColor size={13} style={{ flex: 1 }}>
                    {v}
                  </T>
                </Row>
              ))}
          </View>

          {/* Reviews */}
          <View style={card}>
            <Row style={{ justifyContent: "space-between" }}>
              <T preserveColor size={16} bold accessibilityRole="header">
                Reviews
              </T>
              {Number.isFinite(rating) && (
                <Row style={{ gap: 6 }}>
                  <Stars value={rating} />
                  <T preserveColor size={13} bold>
                    {rating.toFixed(1)} / 5
                  </T>
                </Row>
              )}
            </Row>
            {myReviews.length ? (
              myReviews.map((r, i) => (
                <View
                  key={i}
                  style={{ gap: 6, padding: 12, borderRadius: 12, backgroundColor: theme.background }}
                >
                  <Row style={{ justifyContent: "space-between" }}>
                    <T preserveColor size={13} bold>
                      Your review
                    </T>
                    <Stars value={r.rating} />
                  </Row>
                  <T preserveColor size={13}>
                    {r.text}
                  </T>
                </View>
              ))
            ) : (
              <T preserveColor size={13} color={theme.muted}>
                {live
                  ? "No review saved in your account for this product yet."
                  : "No review saved on this device for this product yet."}
              </T>
            )}
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Write a review"
              onPress={() => openDestination("Product review", { id: product.id })}
              style={{
                minHeight: 44,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}
            >
              <FontIcon name="pen-to-square" size={14} color={theme.text} />
              <T preserveColor size={14} bold>
                {myReviews.length ? "Edit your review" : "Write a review"}
              </T>
            </PressableScale>
          </View>
        </View>

        {similar.length > 0 && (
          <ProductRail title={`Similar in ${product.category}`} products={similar} />
        )}
        {recent.length > 0 && <ProductRail title="Recently viewed" products={recent} />}
      </Animated.ScrollView>

      {/* Floating header */}
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: 8 }}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: -8,
              backgroundColor: theme.surface,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            },
            headerBg,
          ]}
        />
        <Row style={{ paddingHorizontal: 10, gap: 8, minHeight: 48 }}>
          <HeaderButton icon="arrow-left" label="Back" onPress={back} />
          <Animated.View style={[{ flex: 1 }, headerBg]}>
            <T preserveColor size={15} bold numberOfLines={1}>
              {product.name}
            </T>
          </Animated.View>
          <HeaderButton icon="share-nodes" label="Share" onPress={() => void share()} />
          <View>
            <HeaderButton icon="bag-shopping" label="Go to cart" onPress={openCart} />
            {cartCount > 0 && (
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: "absolute",
                    top: -2,
                    right: -2,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    paddingHorizontal: 4,
                    backgroundColor: theme.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: theme.surface,
                  },
                  badgeStyle,
                ]}
              >
                <T preserveColor size={10} bold color={theme.onPrimary} style={{ lineHeight: 12 }}>
                  {cartCount > 99 ? "99+" : cartCount}
                </T>
              </Animated.View>
            )}
          </View>
        </Row>
      </View>

      {/* Action bar */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 10),
          backgroundColor: theme.surface,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          flexDirection: "row",
          gap: 10,
          boxShadow: "0 -4px 16px rgba(20,22,26,0.06)",
        }}
      >
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Chat with ${seller}`}
          onPress={() => openDestination("Chats", { store: seller })}
          style={{
            width: 52,
            minHeight: 50,
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <FontIcon name="comment-dots" size={18} color={theme.text} />
          <T preserveColor size={10}>
            Chat
          </T>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Add to cart"
          accessibilityState={{ disabled: cannotAdd }}
          disabled={cannotAdd}
          onPress={() => addToCart(false)}
          style={{
            flex: 1,
            minHeight: 50,
            borderRadius: 25,
            borderWidth: 1.5,
            borderColor: cannotAdd ? theme.border : theme.buttonColor,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <T preserveColor bold size={15} color={cannotAdd ? theme.muted : theme.primaryText}>
            {out ? "Out of stock" : remaining < 1 ? "All in cart" : "Add to cart"}
          </T>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Buy now"
          accessibilityState={{ disabled: cannotAdd }}
          disabled={cannotAdd}
          onPress={() => addToCart(true)}
          style={{
            flex: 1,
            minHeight: 50,
            borderRadius: 25,
            backgroundColor: cannotAdd ? theme.border : theme.buttonColor,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <T preserveColor bold size={15} color={theme.buttonTextColor}>
            Buy now
          </T>
        </PressableScale>
      </View>

      <PhotoViewer
        key={viewer ?? "closed"}
        photos={photos}
        start={viewer}
        name={product.name}
        onClose={() => setViewer(null)}
      />
    </View>
  );
}

/* ------------------------------------------------------------ pieces */

function Dot({ active, color }: { active: boolean; color: string }) {
  const style = useAnimatedStyle(() => ({
    width: withTiming(active ? 18 : 6, { duration: 220 }),
    backgroundColor: active ? color : "rgba(0,0,0,0.25)",
  }));
  return <Animated.View style={[{ height: 6, borderRadius: 3 }, style]} />;
}

function Stars({ value }: { value: number }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <View
      style={{ flexDirection: "row", gap: 1 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <FontIcon
          key={i}
          name={rounded >= i ? "star" : rounded >= i - 0.5 ? "star-half-stroke" : "star"}
          solid={rounded >= i - 0.5}
          size={12}
          color={rounded >= i - 0.5 ? "#f0a018" : "#c9ccd1"}
        />
      ))}
    </View>
  );
}

function IconBubble({ icon, tone }: { icon: FontIconName; tone: string }) {
  return (
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: `${tone}14`,
      }}
    >
      <FontIcon name={icon} size={15} color={tone} />
    </View>
  );
}

function InfoRow({
  icon,
  tone,
  title,
  note,
}: {
  icon: FontIconName;
  tone: string;
  title: string;
  note?: string;
}) {
  const theme = useStorefrontTheme();
  return (
    <Row style={{ gap: 12, alignItems: note ? "flex-start" : "center" }}>
      <IconBubble icon={icon} tone={tone} />
      <View style={{ flex: 1, gap: 2 }}>
        <T preserveColor size={14} bold>
          {title}
        </T>
        {!!note && (
          <T preserveColor size={12} color={theme.muted}>
            {note}
          </T>
        )}
      </View>
    </Row>
  );
}

function Divider() {
  const theme = useStorefrontTheme();
  return <View style={{ height: 1, backgroundColor: theme.border }} />;
}

function HeaderButton({
  icon,
  label,
  onPress,
}: {
  icon: FontIconName;
  label: string;
  onPress: () => void;
}) {
  const theme = useStorefrontTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      scaleTo={0.9}
      onPress={onPress}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.dark ? "rgba(28,28,31,0.9)" : "rgba(255,255,255,0.92)",
        boxShadow: "0 1px 6px rgba(20,22,26,0.16)",
      }}
    >
      <FontIcon name={icon} size={16} color={theme.text} />
    </PressableScale>
  );
}

function Stepper({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const theme = useStorefrontTheme();
  const button = (icon: FontIconName, label: string, next: number, disabled: boolean) => (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={6}
      scaleTo={0.85}
      onPress={() => {
        void haptic("selection");
        onChange(next);
      }}
      style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center" }}
    >
      <FontIcon name={icon} size={12} color={theme.text} />
    </PressableScale>
  );
  return (
    <Row
      style={{
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 19,
      }}
    >
      {button("minus", "Decrease quantity", Math.max(1, value - 1), value <= 1)}
      <T
        preserveColor
        size={15}
        bold
        accessibilityLabel={`Quantity ${value}`}
        style={{ minWidth: 28, textAlign: "center" }}
      >
        {value}
      </T>
      {button("plus", "Increase quantity", Math.min(max, value + 1), value >= max)}
    </Row>
  );
}

function ProductRail({ title, products }: { title: string; products: Product[] }) {
  return (
    <View style={{ paddingVertical: 8, gap: 10 }}>
      <T preserveColor size={17} bold accessibilityRole="header" style={{ paddingHorizontal: 16 }}>
        {title}
      </T>
      <FlatList
        data={products}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
        renderItem={({ item }) => (
          <View style={{ width: 160 }}>
            <ProductCard product={item} />
          </View>
        )}
      />
    </View>
  );
}

function PhotoViewer({
  photos,
  start,
  name,
  onClose,
}: {
  photos: string[];
  start: number | null;
  name: string;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  /* Keyed on `start` by the caller, so each opening begins on the photo
     that was tapped. */
  const [index, setIndex] = useState(start ?? 0);
  const list = useRef<FlatList<string>>(null);
  return (
    <Modal
      visible={start != null}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <FlatList
          ref={list}
          data={photos}
          horizontal
          pagingEnabled
          initialScrollIndex={start ?? 0}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(u) => u}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item, index: i }) => (
            <View style={{ width, height, justifyContent: "center" }}>
              <Image
                source={{ uri: sizedImage(item, 1600) }}
                accessibilityLabel={`${name}, photo ${i + 1} of ${photos.length}`}
                contentFit="contain"
                style={{ width, height: height * 0.8 }}
              />
            </View>
          )}
        />
        <Row
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: 12,
            right: 12,
            justifyContent: "space-between",
          }}
        >
          <T preserveColor size={14} bold color="rgba(255,255,255,0.8)">
            {index + 1} / {photos.length}
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close photos"
            onPress={onClose}
            hitSlop={8}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.14)",
            }}
          >
            <FontIcon name="xmark" size={18} color="#ffffff" />
          </Pressable>
        </Row>
      </View>
    </Modal>
  );
}

