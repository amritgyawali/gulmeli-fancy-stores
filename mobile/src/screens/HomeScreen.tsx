import { productGridRows, type ProductGridRow } from "@/utils/product-grid";
import { useRef, useState } from "react";
import { FlatList, Keyboard, ScrollView, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Button, Row, T, Tap } from "@/components/ui";
import { FontIcon } from "@/components/FontIcon";
import { StitchImage } from "@/components/ProductVisual";
import { ProductCard } from "@/components/ProductCard";
import { useShop, useCatalog } from "@/store/ShopProvider";
import { openDestination } from "@/services/navigation";
import { colors, fontFamily, shared } from "@/theme/tokens";

const shortcuts = [
  { label: "Sale is Live!", text: "9.9\nSALE", color: "#f59e0b" },
  { label: "Buy Any 3", text: "CHOICE", color: "#facc15" },
  { label: "Gulmeli Fancy Stores Freebie", text: "FREE", color: "#9333ea" },
  { label: "Buy More Save More", text: "BUY+\nSAVE+", color: "#f85606" },
  { label: "Gulmeli Fancy Stores Mall", text: "100% AUT", color: "#0f1466" },
  { label: "Gulmeli Fancy Stores Land", text: "", color: "#10b981" },
  { label: "Voucher", text: "", color: "#6366f1" },
];
const feeds = ["For You", "Voucher Max", "Hot deals", "Fast Delivery"];
function MiniProducts({
  start,
  prices,
  discounts,
  yellow = false,
}: {
  start: number;
  prices: number[];
  discounts: string[];
  yellow?: boolean;
}) {
  const { products } = useCatalog();
  const { live } = useShop();
  if (live)
    return (
      <Row style={{ gap: 8 }}>
        {products
          .filter((p) => p.group === "home")
          .slice(start, start + prices.length)
          .map((product) => (
            <View key={product.id} style={{ flex: 1 }}>
              <ProductCard product={product} variant="recommendation" />
            </View>
          ))}
      </Row>
    );
  return (
    <Row style={{ gap: 8 }}>
      {prices.map((p, i) => (
        <Tap
          label={`View ${["product", "product", "product"][i]} priced Rs.${p}`}
          key={`${start}-${i}`}
          onPress={() =>
            openDestination("Product details", { id: `campaign-${start + i}` })
          }
          style={{ flex: 1, minWidth: 0 }}
        >
          <View
            style={{
              width: "100%",
              aspectRatio: 1,
              borderRadius: 8,
              overflow: "hidden",
              backgroundColor: "#f3f4f6",
            }}
          >
            <StitchImage
              imageKey={`daraz_app_home_screen-${start + i}`}
              fit={yellow ? "contain" : "cover"}
            />
            {start === 3 && i === 1 && (
              <T
                size={7}
                bold
                color="#fff"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  backgroundColor: "#c29961",
                  paddingHorizontal: 4,
                }}
              >
                NEW PACK
              </T>
            )}
          </View>
          <Row
            style={{
              justifyContent: "space-between",
              marginTop: 4,
              backgroundColor: yellow ? "#fffbeb" : "#fff",
              borderRadius: 4,
            }}
          >
            <T size={12} color={yellow ? "#111827" : "#f5222d"} bold>
              Rs.{p.toLocaleString("en-US")}
            </T>
            <T
              size={9}
              bold
              color={yellow ? "#111827" : "#fff"}
              style={{
                backgroundColor: yellow ? "#facc15" : "#ff4d4f",
                paddingHorizontal: 3,
                borderRadius: 3,
              }}
            >
              {discounts[i]}
            </T>
          </Row>
        </Tap>
      ))}
    </Row>
  );
}
export default function HomeScreen() {
  const { homeProducts } = useCatalog();
  const router = useRouter();
  const { state, collect, setFilter } = useShop();
  const [query, setQuery] = useState("dim light for bedroom");
  const list = useRef<FlatList<ProductGridRow>>(null);
  const filtered = homeProducts.filter((p) =>
    state.homeFeed === "Voucher Max"
      ? p.voucher
      : state.homeFeed === "Fast Delivery"
        ? p.fastDelivery
        : true,
  );
  if (state.homeFeed === "Hot deals") {
    filtered.sort(
      (a, b) =>
        Number.parseInt(a.discount ?? "0", 10) -
        Number.parseInt(b.discount ?? "0", 10),
    );
  }
  const feedTabs = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{
        marginTop: 10,
        marginBottom: 8,
        backgroundColor: "#fff",
      }}
      contentContainerStyle={{ gap: 14, paddingHorizontal: 8 }}
    >
      {feeds.map((f, i) => (
        <Tap
          role="tab"
          selected={state.homeFeed === f}
          key={f}
          label={f}
          onPress={() => setFilter("homeFeed", f)}
          style={{
            paddingVertical: 10,
            borderBottomWidth: state.homeFeed === f ? 2 : 0,
            borderColor: colors.orange,
          }}
        >
          <Row style={{ gap: 4 }}>
            <FontIcon
              name={["cubes-stacked", "ticket", "fire", "truck-fast"][i]}
              color={["#f85606", "#e11d48", "#ef4444", "#0d9488"][i]}
              size={11}
            />
            <T
              size={11}
              bold
              color={state.homeFeed === f ? colors.orange : "#374151"}
            >
              {f}
            </T>
          </Row>
        </Tap>
      ))}
    </ScrollView>
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          backgroundColor: "#161616",
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: 8,
        }}
      >
        <Row style={{ gap: 8 }}>
          <Row
            style={{
              flex: 1,
              backgroundColor: "#fff",
              borderRadius: 8,
              paddingLeft: 12,
              paddingRight: 4,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: "#e5e7eb",
            }}
          >
            <TextInput
              accessibilityLabel="Search products"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => {
                Keyboard.dismiss();
                openDestination("Search results", { query });
              }}
              returnKeyType="search"
              style={{
                flex: 1,
                minWidth: 0,
                fontFamily,
                fontSize: 12,
                color: "#1f2937",
                padding: 0,
              }}
            />
            <Tap
              label="Camera visual search"
              onPress={() => openDestination("Visual search")}
              style={{ paddingHorizontal: 8 }}
            >
              <FontIcon name="camera" size={16} color="#6b7280" />
            </Tap>
            <Button
              title="Search"
              onPress={() => {
                Keyboard.dismiss();
                openDestination("Search results", { query });
              }}
              style={{ paddingVertical: 5 }}
            />
          </Row>
          <Tap
            label="Digital Goods"
            onPress={() => openDestination("Digital goods")}
            style={{ paddingHorizontal: 4 }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderWidth: 1,
                borderColor: colors.orange,
                borderRadius: 4,
                backgroundColor: "#fff",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <T size={6.5} bold color={colors.orange}>
                DIGITAL
              </T>
              <T size={6} bold>
                GOODS
              </T>
            </View>
          </Tap>
        </Row>
      </View>
      <FlatList<ProductGridRow>
        ref={list}
        data={productGridRows(filtered)}
        keyExtractor={(row) => row.id}
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 48 }}
        renderItem={({ item }) =>
          item.kind === "tabs" ? (
            feedTabs
          ) : (
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                paddingHorizontal: 8,
                marginBottom: 8,
              }}
            >
              {item.products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  variant="home"
                />
              ))}
              {item.products.length === 1 && <View style={{ flex: 1 }} />}
            </View>
          )
        }
        ListHeaderComponent={
          <>
            <LinearGradient
              colors={["#000", "#1c1d22", "#0d0f12"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                height: 180,
                paddingHorizontal: 16,
                paddingVertical: 8,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View style={{ width: "55%", zIndex: 2 }}>
                <Row style={{ gap: 6, marginBottom: 6 }}>
                  <T
                    size={9}
                    bold
                    color="#fff"
                    style={{
                      backgroundColor: colors.orange,
                      paddingHorizontal: 4,
                      borderRadius: 4,
                    }}
                  >
                    9.9
                  </T>
                  <T
                    size={8}
                    bold
                    color="#fff"
                    style={{
                      borderWidth: 1,
                      borderColor: "#ffffff66",
                      paddingHorizontal: 6,
                      borderRadius: 4,
                      letterSpacing: 1,
                    }}
                  >
                    BRANDHOUSE
                  </T>
                </Row>
                <T
                  size={20}
                  bold
                  color="#fff"
                  style={{
                    lineHeight: 24,
                    letterSpacing: -0.5,
                    fontWeight: "900",
                  }}
                >
                  HOUSE OF BRANDS
                </T>
                <Row
                  style={{
                    backgroundColor: "#ffffff1a",
                    alignSelf: "flex-start",
                    borderRadius: 4,
                    paddingHorizontal: 6,
                    marginTop: 4,
                    gap: 4,
                  }}
                >
                  <FontIcon name="truck-fast" color="#22c55e" size={9} />
                  <T size={9} bold color="#22c55e">
                    Free Delivery*
                  </T>
                </Row>
                <Button
                  title="Shop Now"
                  onPress={() => openDestination("Brandhouse")}
                  style={{
                    marginTop: 10,
                    alignSelf: "flex-start",
                    borderRadius: 99,
                    paddingVertical: 3,
                  }}
                  textStyle={{ fontSize: 11 }}
                />
              </View>
              <View
                style={{
                  width: "45%",
                  height: "100%",
                  justifyContent: "center",
                }}
              >
                <Row
                  style={{
                    gap: 4,
                    alignItems: "flex-end",
                    justifyContent: "flex-end",
                  }}
                >
                  <LinearGradient
                    colors={["#0284c7", "#1e3a8a"]}
                    style={{
                      width: 80,
                      height: 112,
                      borderRadius: 8,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FontIcon name="vest" color="#fff" size={30} />
                  </LinearGradient>
                  <View
                    style={{
                      width: 64,
                      height: 96,
                      borderRadius: 8,
                      backgroundColor: "#232323",
                      borderWidth: 1,
                      borderColor: "#ffffff33",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FontIcon name="bag-shopping" color="#eab308" size={24} />
                  </View>
                </Row>
                <View
                  style={{
                    position: "absolute",
                    left: -20,
                    top: 32,
                    borderRadius: 99,
                    backgroundColor: colors.orange,
                    borderWidth: 2,
                    borderColor: "#fff",
                    padding: 4,
                    alignItems: "center",
                  }}
                >
                  <T size={7} bold color="#fff" style={{ lineHeight: 8 }}>
                    UP TO
                  </T>
                  <T size={12} bold color="#fff" style={{ lineHeight: 12 }}>
                    60%
                  </T>
                  <T size={6} bold color="#fff" style={{ lineHeight: 7 }}>
                    OFF
                  </T>
                </View>
                <T
                  size={9}
                  color="#ffffffcc"
                  style={{
                    position: "absolute",
                    right: 4,
                    bottom: 4,
                    paddingHorizontal: 6,
                    borderRadius: 4,
                    backgroundColor: "#0009",
                  }}
                >
                  5/13
                </T>
              </View>
            </LinearGradient>
            <Row
              style={{
                justifyContent: "space-between",
                backgroundColor: "#212121",
                paddingVertical: 6,
                paddingHorizontal: 12,
              }}
            >
              {[
                {
                  label: "Safe Payment",
                  icon: "credit-card",
                  color: "#ffba00",
                },
                {
                  label: "Fast Delivery",
                  icon: "truck-fast",
                  color: "#38bdf8",
                },
                { label: "Free Return", icon: "box-open", color: "#fb923c" },
              ].map((x, i) => (
                <Row key={x.label} style={{ gap: 4 }}>
                  {i > 0 && (
                    <T size={10} color="#6b7280" style={{ marginRight: 8 }}>
                      |
                    </T>
                  )}
                  <FontIcon name={x.icon} color={x.color} size={10} />
                  <T size={10} color="#e5e7eb">
                    {x.label}
                  </T>
                </Row>
              ))}
            </Row>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ backgroundColor: "#fff" }}
              contentContainerStyle={{
                padding: 12,
                gap: 12,
                alignItems: "center",
              }}
            >
              <Tap
                label="Win Free Gifts"
                onPress={() => openDestination("Gems treasure chest")}
              >
                <LinearGradient
                  colors={["#ffedd5", "#fffbeb"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    width: 144,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    padding: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#fed7aa",
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      backgroundColor: "#f59e0b",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <T
                      size={7.5}
                      bold
                      color="#fff"
                      style={{ textAlign: "center", lineHeight: 8.5 }}
                    >
                      GEMS{"\n"}TREASURE{"\n"}CHEST
                    </T>
                  </View>
                  <View>
                    <T size={11} bold>
                      Win Free Gifts
                    </T>
                    <T size={9} bold color={colors.orange}>
                      Play Now ›
                    </T>
                  </View>
                </LinearGradient>
              </Tap>
              {shortcuts.map((x, i) => (
                <Tap
                  key={x.label}
                  label={x.label}
                  onPress={() =>
                    x.label === "Buy More Save More"
                      ? router.navigate("/offers")
                      : openDestination(x.label)
                  }
                  style={{ width: 90, alignItems: "center", gap: 4 }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: x.color,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {i === 2 && (
                      <FontIcon name="gift" color="#fde047" size={14} />
                    )}
                    {i === 4 && (
                      <FontIcon name="shield" color="#facc15" size={12} />
                    )}
                    {i > 4 ? (
                      <FontIcon
                        name={i === 5 ? "tree" : "ticket"}
                        color="#fff"
                        size={18}
                      />
                    ) : (
                      <T
                        size={i === 0 ? 12 : 8}
                        bold
                        color={i === 1 ? "#000" : "#fff"}
                        style={{ textAlign: "center", lineHeight: 10 }}
                      >
                        {x.text}
                      </T>
                    )}
                  </View>
                  <T
                    size={10}
                    color="#374151"
                    style={{ textAlign: "center", lineHeight: 12 }}
                  >
                    {x.label}
                  </T>
                </Tap>
              ))}
            </ScrollView>
            <View
              style={{
                marginTop: 10,
                marginHorizontal: 8,
                padding: 12,
                backgroundColor: "#fff",
                borderRadius: 12,
              }}
            >
              <Row
                style={{
                  justifyContent: "space-between",
                  marginBottom: 8,
                  gap: 4,
                }}
              >
                <T size={14} bold style={{ flexShrink: 1 }}>
                  Claim Vouchers to Save More
                </T>
                <Tap
                  label="More vouchers"
                  onPress={() => openDestination("Voucher wallet")}
                >
                  <T size={12} color={colors.orange}>
                    ₉.₉ More vouchers ›
                  </T>
                </Tap>
              </Row>
              <Row
                style={{
                  borderRadius: 8,
                  backgroundColor: "#fdf2f8",
                  borderWidth: 1,
                  borderColor: "#fce7f3",
                  padding: 10,
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{
                    paddingRight: 8,
                    borderRightWidth: 1,
                    borderStyle: "dashed",
                    borderColor: "#d1d5db",
                  }}
                >
                  <T bold color={colors.orange}>
                    4% OFF
                  </T>
                  <T size={10} color="#6b7280">
                    Voucher Max
                  </T>
                </View>
                <View style={{ paddingHorizontal: 8, flex: 1 }}>
                  <T bold color="#0d9488">
                    Rs.150
                  </T>
                  <T size={10} color="#6b7280">
                    Free shipping
                  </T>
                </View>
                <Button
                  title={state.vouchersCollected ? "Collected" : "Collect All"}
                  onPress={collect}
                  disabled={state.vouchersCollected}
                  style={{ borderRadius: 8 }}
                />
              </Row>
            </View>
            <LinearGradient
              colors={["#f85606", "#ff6f00", "#f97316"]}
              style={{
                marginTop: 10,
                padding: 10,
                paddingTop: 12,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
              }}
            >
              <Row
                style={{
                  justifyContent: "center",
                  marginBottom: 12,
                  paddingVertical: 4,
                  gap: 8,
                }}
              >
                <View
                  style={{
                    backgroundColor: "#fff",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}
                >
                  <T size={10} bold color={colors.orange}>
                    9.9 SALE
                  </T>
                  <T size={7.5}>8 SEP (8 PM) - 15 SEP</T>
                </View>
                <T bold color="#fff" style={{ letterSpacing: 0.5 }}>
                  9.9 SALE IS LIVE NOW
                </T>
              </Row>
              <Row style={{ gap: 8 }}>
                {["Home & Living", "9.9 Campaign", "Electronics"].map(
                  (name, i) => (
                    <Tap
                      key={name}
                      label={name}
                      onPress={() => openDestination(name)}
                      style={{
                        flex: 1,
                        backgroundColor: i === 1 ? "#fde68a" : "#fff",
                        padding: 8,
                        borderRadius: 12,
                        justifyContent: "space-between",
                      }}
                    >
                      <View
                        style={{
                          aspectRatio: 1,
                          backgroundColor: i === 1 ? "#fff" : "#f3f4f6",
                          borderRadius: 8,
                          overflow: "hidden",
                          marginBottom: 6,
                          padding: 4,
                        }}
                      >
                        <StitchImage
                          imageKey={`daraz_app_home_screen-${i}`}
                          fit="contain"
                        />
                        {i === 2 && (
                          <T
                            size={6}
                            bold
                            color="#fff"
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              textAlign: "center",
                              backgroundColor: "#dc2626",
                            }}
                          >
                            12 MONTHS GUARANTEE
                          </T>
                        )}
                      </View>
                      {i === 1 ? (
                        <Row style={{ justifyContent: "space-between" }}>
                          <T
                            size={10}
                            bold
                            color="#78350f"
                            style={{ lineHeight: 12 }}
                          >
                            {"9.9\nCampaign"}
                          </T>
                          <View
                            style={[
                              shared.center,
                              {
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                backgroundColor: "#fff",
                              },
                            ]}
                          >
                            <FontIcon
                              name="chevron-right"
                              size={9}
                              color={colors.orange}
                            />
                          </View>
                        </Row>
                      ) : (
                        <T size={11} bold style={{ textAlign: "center" }}>
                          {name}
                        </T>
                      )}
                    </Tap>
                  ),
                )}
              </Row>
            </LinearGradient>
            <View
              style={{ backgroundColor: "#fff", marginTop: 10, padding: 12 }}
            >
              <Row
                style={{ justifyContent: "space-between", marginBottom: 10 }}
              >
                <Row>
                  <T size={16} bold>
                    Fla
                  </T>
                  <FontIcon name="bolt" size={14} color={colors.orange} />
                  <T size={16} bold>
                    h Sale
                  </T>
                </Row>
                <Tap
                  label="Shop more Flash Sale"
                  onPress={() => openDestination("Flash Sale")}
                >
                  <T bold color={colors.orange}>
                    ₉.₉ SHOP MORE ›
                  </T>
                </Tap>
              </Row>
              <MiniProducts
                start={3}
                prices={[499, 603, 1499]}
                discounts={["-50%", "-4%", "-25%"]}
              />
            </View>
            <View
              style={{ backgroundColor: "#fff", marginTop: 10, padding: 12 }}
            >
              <Row
                style={{ justifyContent: "space-between", marginBottom: 10 }}
              >
                <Row style={{ gap: 4 }}>
                  <T size={14} bold>
                    Daily Bachat Bazar
                  </T>
                  <T
                    size={8}
                    bold
                    style={{ backgroundColor: "#facc15", paddingHorizontal: 3 }}
                  >
                    CHOICE
                  </T>
                </Row>
                <Tap
                  label="Shop Now Free Gift"
                  onPress={() => openDestination("Daily Bachat / Choice")}
                >
                  <T size={10} color={colors.orange}>
                    Shop Now | Free Gift! ›
                  </T>
                </Tap>
              </Row>
              <MiniProducts
                start={6}
                prices={[854, 175, 517]}
                discounts={["-14%", "HOT", "-9%"]}
                yellow
              />
            </View>
            <View
              style={{ backgroundColor: "#fff", marginTop: 10, padding: 12 }}
            >
              <Row
                style={{ justifyContent: "space-between", marginBottom: 10 }}
              >
                <T size={16} bold>
                  Top{" "}
                  <T size={16} bold color={colors.orange}>
                    Ranking
                  </T>
                </T>
                <Tap
                  label="Discover More Rankings"
                  onPress={() => openDestination("Rankings")}
                >
                  <T size={11} color="#6b7280">
                    Discover More Rankings ›
                  </T>
                </Tap>
              </Row>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {["Smartwatches", "Belts", "Garden Planters", "Wall Light"].map(
                  (name, i) => (
                    <Tap
                      key={name}
                      label={name}
                      onPress={() => openDestination("Category rankings")}
                      style={{
                        width: 112,
                        padding: 8,
                        borderWidth: 1,
                        borderColor: "#ffedd5",
                        borderRadius: 12,
                        backgroundColor: "#fff7ed",
                      }}
                    >
                      <T
                        size={11}
                        bold
                        style={{ textAlign: "center", marginBottom: 4 }}
                      >
                        {name}
                      </T>
                      <View
                        style={{
                          aspectRatio: 1,
                          borderRadius: 6,
                          overflow: "hidden",
                          backgroundColor: "#fff",
                        }}
                      >
                        <StitchImage
                          imageKey={`daraz_app_home_screen-${9 + i}`}
                          fit="contain"
                        />
                        <T
                          size={9}
                          color="#fff"
                          style={{
                            position: "absolute",
                            top: 2,
                            left: 2,
                            width: 16,
                            height: 16,
                            borderRadius: 8,
                            backgroundColor: "#fbbf24",
                            textAlign: "center",
                          }}
                        >
                          1
                        </T>
                      </View>
                    </Tap>
                  ),
                )}
              </ScrollView>
            </View>
          </>
        }
      />
      <Tap
        label="Buy More Save More offer"
        onPress={() => router.navigate("/offers")}
        style={{ position: "absolute", bottom: 12, left: 12 }}
      >
        <LinearGradient
          colors={["#fbbf24", "#f85606"]}
          style={{
            width: 56,
            height: 56,
            borderRadius: 99,
            borderWidth: 2,
            borderColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 14px #f8560673",
          }}
        >
          <T size={9} color="#fff" bold style={{ lineHeight: 10 }}>
            UP TO
          </T>
          <T size={12} color="#fff" bold style={{ lineHeight: 14 }}>
            70% OFF
          </T>
        </LinearGradient>
      </Tap>
    </View>
  );
}
