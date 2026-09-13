import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Badge,
  Button,
  Row,
  SectionTitle,
  SourceIcon,
  T,
  Tap,
} from "@/components/ui";
import { FontIcon } from "@/components/FontIcon";
import { ProductVisual } from "@/components/ProductVisual";
import { AccountShimmer } from "@/components/AccountShimmer";
import { useShop, useCatalog } from "@/store/ShopProvider";
import { go } from "@/admin/navigate";
import { openDestination } from "@/services/navigation";
import { colors, shared } from "@/theme/tokens";

const orderTabs = [
  {
    label: "To Pay",
    title: "No pending payments",
    description: "Explore deals and checkout your favorite items.",
    action: "Shop Now",
    emoji: "💳",
  },
  {
    label: "To Ship",
    title: "No items to ship",
    description: "Sellers are preparing pending packages.",
    action: "Check Updates",
    emoji: "📦",
  },
  {
    label: "To Receive",
    title: "No orders on the way",
    description: "Track deliveries and courier details here.",
    action: "Track Order",
    emoji: "🚚",
  },
  {
    label: "To Review",
    title: "Your product reviews",
    description: "Write and manage reviews on this device.",
    action: "Review Now",
    emoji: "💿",
  },
  {
    label: "Returns & Cancellations",
    title: "No returns or cancellations",
    description: "View your completed returns history.",
    action: "History",
    emoji: "🔄",
  },
];
const services = [
  { label: "Help Center", icon: 14, bg: "#ef4444" },
  { label: "Gulmeli Fancy Stores Candy", emoji: "🍭", bg: "#3b82f6" },
  { label: "Pickup Points", icon: 15, bg: "#f59e0b" },
  { label: "Payment Options", icon: 16, bg: "#0d9488" },
  { label: "Contact Customer Care", icon: 17, bg: "#fae8ff" },
  { label: "Buy Any 3", text: "CHOICE", bg: "#fbbf24" },
  { label: "My Reviews", text: "★ ★ ★", bg: "#10b981" },
  { label: "My Affiliates", emoji: "👥", bg: "#fff1f2" },
];
export default function AccountScreen() {
  const { productById } = useCatalog();
  const router = useRouter();
  const { state, refreshAccount } = useShop();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [active, setActive] = useState(3);
  const activePage = useRef(3);
  const [pageWidth, setPageWidth] = useState(340);
  const [compact, setCompact] = useState(false);
  const slider = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const pullStart = useRef<number | null>(null);
  const refreshLock = useRef(false);
  const refresh = useCallback(async () => {
    if (refreshLock.current) return;
    refreshLock.current = true;
    setRefreshing(true);
    setRefreshError(false);
    try {
      await refreshAccount();
    } catch {
      setRefreshError(true);
    } finally {
      refreshLock.current = false;
      setRefreshing(false);
    }
  }, [refreshAccount]);
  useEffect(() => {
    slider.current?.scrollTo({
      x: activePage.current * pageWidth,
      animated: false,
    });
  }, [pageWidth, refreshing]);
  const selectTab = (index: number) => {
    activePage.current = index;
    setActive(index);
    slider.current?.scrollTo({ x: index * pageWidth, animated: true });
  };
  const finishPull = (y: number) => {
    if (pullStart.current !== null && y - pullStart.current > 64)
      void refresh();
    pullStart.current = null;
  };
  const account = state.account;
  return (
    <View style={{ flex: 1, backgroundColor: colors.accountBackground }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.orange}
            colors={[colors.orange]}
          />
        }
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y;
          setCompact(scrollY.current > 130);
        }}
        scrollEventThrottle={32}
        onTouchStart={(e) => {
          if (Platform.OS === "web" && scrollY.current <= 0)
            pullStart.current = e.nativeEvent.pageY;
        }}
        onTouchEnd={(e) => {
          if (Platform.OS === "web") finishPull(e.nativeEvent.pageY);
        }}
        onPointerDown={(e) => {
          if (
            Platform.OS === "web" &&
            e.nativeEvent.pointerType === "mouse" &&
            scrollY.current <= 0
          )
            pullStart.current = e.nativeEvent.pageY;
        }}
        onPointerUp={(e) => {
          if (Platform.OS === "web" && e.nativeEvent.pointerType === "mouse")
            finishPull(e.nativeEvent.pageY);
        }}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <LinearGradient
          colors={["#fceae4", "#fbede8", "#f5f5f7"]}
          style={{
            paddingHorizontal: 20,
            paddingTop: compact ? 8 : 20,
            paddingBottom: 16,
          }}
        >
          <Row style={{ gap: 14 }}>
            <Tap
              label="Edit profile photo"
              onPress={() => openDestination("Profile photo editing")}
              style={{ position: "relative" }}
            >
              <View
                style={[
                  shared.center,
                  {
                    width: compact ? 36 : 56,
                    height: compact ? 36 : 56,
                    borderRadius: 99,
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    backgroundColor: "#fff",
                    boxShadow: "0 1px 2px #0001",
                  },
                ]}
              >
                {state.commerce.profile.avatar ? (
                  <Image
                    source={{ uri: state.commerce.profile.avatar }}
                    style={{
                      width: compact ? 36 : 56,
                      height: compact ? 36 : 56,
                      borderRadius: 99,
                    }}
                  />
                ) : (
                  <SourceIcon index={1} size={compact ? 28 : 40} />
                )}
              </View>
              {!compact && (
                <View
                  style={{
                    position: "absolute",
                    bottom: -4,
                    right: -4,
                    padding: 4,
                    borderRadius: 99,
                    borderWidth: 2,
                    borderColor: "#fff",
                    backgroundColor: "#334155",
                  }}
                >
                  <SourceIcon index={2} size={12} color="#fff" />
                </View>
              )}
            </Tap>
            <View style={{ flex: 1 }}>
              <T
                size={compact ? 19 : 22}
                bold
                style={{
                  color: "#1a1a1a",
                  lineHeight: 26,
                  letterSpacing: -0.5,
                }}
              >
                {account.name}
              </T>
              {!compact && (
                <Row style={{ gap: 5, marginTop: 3 }}>
                  {[
                    {
                      n: account.wishlistCount,
                      label: "WishList",
                      destination: "Wishlist",
                    },
                    {
                      n: account.followedStores,
                      label: "Followed Stores",
                      destination: "Followed stores",
                    },
                    {
                      n:
                        account.voucherCount +
                        (state.vouchersCollected ? 1 : 0),
                      label: "Vouchers",
                      destination: "Voucher wallet",
                    },
                  ].map((x, i) => (
                    <Row key={x.label} style={{ gap: 5, flexShrink: 1 }}>
                      {i > 0 && <T color="#6b7280">•</T>}
                      <Tap
                        label={x.label}
                        onPress={() => openDestination(x.destination)}
                        style={{ flexShrink: 1 }}
                      >
                        <T size={12} color="#6b7280">
                          <T bold>{x.n}</T> {x.label}
                        </T>
                      </Tap>
                    </Row>
                  ))}
                </Row>
              )}
            </View>
            <Row style={{ gap: 10 }}>
              <Tap
                label="Admin dashboard"
                onPress={() => go("/admin")}
                style={{ padding: 4 }}
              >
                <FontIcon name="gauge-high" size={20} color="#4b5563" />
              </Tap>
              <Tap
                label="Settings"
                onPress={() => openDestination("Settings")}
                style={{ padding: 4 }}
              >
                <SourceIcon index={3} size={24} />
              </Tap>
            </Row>
          </Row>
        </LinearGradient>
        <View style={{ paddingHorizontal: 12, paddingTop: 4, gap: 12 }}>
          {refreshError && (
            <T color="#b91c1c">
              Account could not be refreshed. Pull down to retry.
            </T>
          )}
          {refreshing ? (
            <AccountShimmer />
          ) : (
            <>
              <Row style={{ gap: 10 }}>
                {[false, true].map((freebie) => (
                  <Row
                    key={String(freebie)}
                    style={[shared.card, { flex: 1, padding: 10, gap: 10 }]}
                  >
                    <LinearGradient
                      colors={
                        freebie
                          ? ["#7e22ce", "#a855f7"]
                          : ["#f59e0b", "#fb923c"]
                      }
                      start={{ x: 0, y: 1 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 8,
                        padding: 4,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {freebie ? (
                        <>
                          <T size={24}>🎧</T>
                          <T
                            size={9}
                            bold
                            color="#581c87"
                            style={{
                              backgroundColor: "#fbbf24",
                              borderRadius: 4,
                              width: "100%",
                              textAlign: "center",
                            }}
                          >
                            FREE
                          </T>
                        </>
                      ) : (
                        <>
                          <T
                            size={9}
                            bold
                            color="#fef3c7"
                            style={{ lineHeight: 11 }}
                          >
                            UP TO
                          </T>
                          <T
                            size={17}
                            bold
                            color="#fef08a"
                            style={{ lineHeight: 19 }}
                          >
                            40%
                          </T>
                          <T
                            size={10}
                            bold
                            color="#fff"
                            style={{ lineHeight: 12 }}
                          >
                            OFF
                          </T>
                        </>
                      )}
                    </LinearGradient>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Row>
                        <T bold size={11} style={{ flexShrink: 1 }}>
                          {freebie
                            ? "Gulmeli Fancy Stores Freebie"
                            : "Gulmeli Fancy Stores Gems"}
                        </T>
                        <SourceIcon
                          index={freebie ? 5 : 4}
                          size={12}
                          color="#6b7280"
                        />
                      </Row>
                      {freebie ? (
                        <T size={10} bold color="#dc2626" numberOfLines={1}>
                          Invite &amp; Win
                        </T>
                      ) : (
                        <T size={11} color="#6b7280">
                          Get{" "}
                          <T size={11} color="#e11d48" bold>
                            40%
                          </T>{" "}
                          Off
                        </T>
                      )}
                      <Button
                        title={freebie ? "Play Now" : "Use Now"}
                        onPress={() =>
                          openDestination(
                            freebie
                              ? "Gulmeli Fancy Stores Freebie"
                              : "Gems treasure chest",
                          )
                        }
                        color={freebie ? "#ff3b30" : "#ff4d4f"}
                        style={{
                          marginTop: 4,
                          borderRadius: 99,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          alignSelf: "flex-start",
                        }}
                        textStyle={{ fontSize: 10, lineHeight: 12 }}
                      />
                    </View>
                  </Row>
                ))}
              </Row>
              <View style={[shared.card, { paddingHorizontal: 8 }]}>
                <Row style={{ gap: 4 }}>
                  {[
                    "Gulmeli Fancy Stores Land",
                    "Gulmeli Fancy Stores Candy",
                    "BMSM",
                    "Voucher",
                    "Affiliate",
                  ].map((label, i) => (
                    <Tap
                      key={label}
                      label={label}
                      onPress={() =>
                        i === 2
                          ? router.navigate("/offers")
                          : openDestination(label)
                      }
                      style={{ flex: 1, alignItems: "center", gap: 4 }}
                    >
                      <View
                        style={[
                          shared.center,
                          {
                            width: 36,
                            height: 36,
                            borderRadius: 99,
                            backgroundColor: [
                              "#ecfdf5",
                              "#fdf2f8",
                              "#f59e0b",
                              "#faf5ff",
                              "#fff7ed",
                            ][i],
                            borderWidth: 1,
                            borderColor: [
                              "#a7f3d0",
                              "#fbcfe8",
                              "#d97706",
                              "#e9d5ff",
                              "#fed7aa",
                            ][i],
                          },
                        ]}
                      >
                        {i === 2 ? (
                          <T
                            size={8}
                            bold
                            color="#fff"
                            style={{ textAlign: "center", lineHeight: 9 }}
                          >
                            BUY+{"\n"}SAVE+
                          </T>
                        ) : (
                          <T size={18}>{["🌳", "🍬", "", "🎟️", "👤"][i]}</T>
                        )}
                      </View>
                      <T
                        size={11}
                        color="#374151"
                        style={{ textAlign: "center", letterSpacing: -0.25 }}
                      >
                        {label}
                      </T>
                    </Tap>
                  ))}
                </Row>
                <Row
                  style={{ justifyContent: "center", gap: 4, marginTop: 10 }}
                >
                  <View
                    style={{
                      width: 14,
                      height: 4,
                      borderRadius: 99,
                      backgroundColor: colors.orange,
                    }}
                  />
                  <View
                    style={{
                      width: 14,
                      height: 4,
                      borderRadius: 99,
                      backgroundColor: "#e5e7eb",
                    }}
                  />
                </Row>
              </View>
              <View style={shared.card}>
                <View style={{ borderBottomWidth: 1, borderColor: "#f3f4f6" }}>
                  <SectionTitle
                    title="My Orders"
                    action="View All Orders"
                    onPress={() => openDestination("Orders list")}
                  >
                    <Row
                      style={{
                        gap: 2,
                        backgroundColor: "#f3f4f6",
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 99,
                      }}
                    >
                      <SourceIcon index={6} size={10} color="#9ca3af" />
                      <T size={10} color="#9ca3af">
                        Swipe
                      </T>
                    </Row>
                  </SectionTitle>
                </View>
                <Row
                  style={{
                    gap: 4,
                    paddingTop: 12,
                    paddingBottom: 4,
                    alignItems: "stretch",
                  }}
                >
                  {orderTabs.map((tab, i) => (
                    <Tap
                      key={tab.label}
                      label={tab.label}
                      role="tab"
                      selected={active === i}
                      onPress={() => selectTab(i)}
                      style={{
                        flex: 1,
                        alignItems: "center",
                        gap: 6,
                        paddingVertical: 6,
                        paddingHorizontal: 2,
                        borderWidth: 1,
                        borderRadius: 12,
                        borderColor: active === i ? "#f856064d" : "transparent",
                        backgroundColor:
                          active === i ? "#fff7ed" : "transparent",
                      }}
                    >
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <SourceIcon
                          index={8 + i}
                          size={24}
                          color={active === i ? colors.orange : "#ff5722"}
                        />
                        {i === 3 && <Badge count={account.reviewCount} />}
                      </View>
                      <T
                        size={i === 4 ? 10 : 11}
                        bold={active === i}
                        color={active === i ? colors.orange : "#374151"}
                        style={{ textAlign: "center", lineHeight: 15 }}
                      >
                        {tab.label}
                      </T>
                    </Tap>
                  ))}
                </Row>
                <View
                  onLayout={(e) => setPageWidth(e.nativeEvent.layout.width)}
                  style={{ marginTop: 12, overflow: "hidden" }}
                >
                  <ScrollView
                    ref={slider}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    accessibilityLabel="Order summaries"
                    scrollEventThrottle={16}
                    onScroll={(e) => {
                      // React Native Web does not dispatch native momentum events.
                      if (Platform.OS !== "web") return;
                      const index = Math.max(
                        0,
                        Math.min(
                          4,
                          Math.round(e.nativeEvent.contentOffset.x / pageWidth),
                        ),
                      );
                      activePage.current = index;
                      setActive(index);
                    }}
                    onMomentumScrollEnd={(e) => {
                      const index = Math.max(
                        0,
                        Math.min(
                          4,
                          Math.round(e.nativeEvent.contentOffset.x / pageWidth),
                        ),
                      );
                      activePage.current = index;
                      setActive(index);
                    }}
                  >
                    {orderTabs.map((tab, i) => (
                      <View key={tab.label} style={{ width: pageWidth }}>
                        <Row
                          style={{
                            backgroundColor: "#fafaf9",
                            borderWidth: 1,
                            borderColor: "#e7e5e4",
                            borderRadius: 8,
                            padding: 10,
                            gap: 10,
                            minHeight: 62,
                          }}
                        >
                          <View
                            style={[
                              shared.center,
                              {
                                width: 36,
                                height: 36,
                                borderRadius: 99,
                                backgroundColor:
                                  i === 3 ? "#0f172a" : "#fff7ed",
                                borderWidth: 1,
                                borderColor: "#d1d5db",
                              },
                            ]}
                          >
                            <T size={20}>{tab.emoji}</T>
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <T bold numberOfLines={1}>
                              {tab.title}
                            </T>
                            <T size={10.5} color="#6b7280" numberOfLines={1}>
                              {tab.description}
                            </T>
                          </View>
                          <Button
                            title={tab.action}
                            outline
                            color="#ef4444"
                            onPress={() =>
                              i === 0
                                ? router.navigate("/")
                                : openDestination(
                                    i === 1
                                      ? "Order updates"
                                      : i === 2
                                        ? "Order tracking"
                                        : i === 3
                                          ? "Product review"
                                          : "Return history",
                                  )
                            }
                            style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                            textStyle={{ fontSize: 11 }}
                          />
                        </Row>
                      </View>
                    ))}
                  </ScrollView>
                </View>
                <Row
                  style={{ justifyContent: "center", gap: 4, marginTop: 10 }}
                >
                  {orderTabs.map((t, i) => (
                    <Tap
                      key={t.label}
                      label={`Show ${t.label}`}
                      onPress={() => selectTab(i)}
                      style={{
                        width: active === i ? 14 : 6,
                        height: 6,
                        borderRadius: 99,
                        backgroundColor:
                          active === i ? colors.orange : "#e5e7eb",
                      }}
                    />
                  ))}
                </Row>
              </View>
              <View style={shared.card}>
                <SectionTitle
                  title="Recently Viewed"
                  action="View More"
                  onPress={() => openDestination("Recently viewed history")}
                />
                <Row style={{ gap: 10 }}>
                  {state.commerce.recent
                    .slice(0, 3)
                    .filter((id) => productById[id])
                    .map((id) => (
                      <Tap
                        key={id}
                        label={productById[id].name}
                        onPress={() =>
                          openDestination("Product details", { id })
                        }
                        style={{ flex: 1 }}
                      >
                        <View
                          style={{
                            aspectRatio: 1,
                            borderRadius: 8,
                            overflow: "hidden",
                          }}
                        >
                          <ProductVisual product={productById[id]} />
                        </View>
                        <T size={11} numberOfLines={2}>
                          {productById[id].name}
                        </T>
                        <T bold color={colors.orange}>
                          Rs. {productById[id].price.toLocaleString("en-US")}
                        </T>
                      </Tap>
                    ))}
                  {!state.commerce.recent.length && (
                    <T color="#6b7280">Products you open will appear here.</T>
                  )}
                </Row>
              </View>
              <View
                style={[
                  shared.card,
                  {
                    paddingVertical: 14,
                    flexDirection: "row",
                    flexWrap: "wrap",
                    rowGap: 24,
                  },
                ]}
              >
                {services.map((service, i) => (
                  <Tap
                    key={service.label}
                    label={service.label}
                    onPress={() => openDestination(service.label)}
                    style={{
                      width: "25%",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 2,
                    }}
                  >
                    <View
                      style={[
                        shared.center,
                        {
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: service.bg,
                          borderWidth: i === 4 || i === 7 ? 1 : 0,
                          borderColor: "#f5d0fe",
                        },
                      ]}
                    >
                      {service.icon !== undefined ? (
                        <SourceIcon
                          index={service.icon}
                          size={22}
                          color={i === 4 ? "#0891b2" : "#fff"}
                        />
                      ) : service.emoji ? (
                        <T size={22}>{service.emoji}</T>
                      ) : (
                        <T
                          size={i === 6 ? 10 : 9}
                          bold
                          color={i === 6 ? "#fff" : "#000"}
                        >
                          {service.text}
                        </T>
                      )}
                      {i === 7 && (
                        <T size={5} bold color="#e11d48">
                          COMMISSION
                        </T>
                      )}
                    </View>
                    <T
                      size={11}
                      color="#374151"
                      style={{ textAlign: "center", lineHeight: 14 }}
                    >
                      {service.label}
                    </T>
                  </Tap>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
