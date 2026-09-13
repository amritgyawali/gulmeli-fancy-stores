import { productGridRows, type ProductGridRow } from "@/utils/product-grid";
import { useMemo, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Button, Row, SourceIcon, T, Tap, Badge } from "@/components/ui";
import { StitchImage } from "@/components/ProductVisual";
import { ProductCard } from "@/components/ProductCard";
import { useShop, useCatalog } from "@/store/ShopProvider";
import { openDestination } from "@/services/navigation";
import { colors, fontFamily } from "@/theme/tokens";

const categories = [
  "Fashion",
  "Motor",
  "Outdoor Sports",
  "Jewelry",
  "Electronics",
];
const tabs = ["Hot deals", "Recommend", "Electronics", "Fashion"];
export default function OffersScreen() {
  const { offerProducts, productById } = useCatalog();
  const router = useRouter();
  const { state, setFilter, select } = useShop();
  const [query, setQuery] = useState(state.offerQuery);
  const input = useRef<TextInput>(null);
  const list = useRef<FlatList<ProductGridRow>>(null);
  const visible = useMemo(
    () =>
      offerProducts.filter(
        (p) =>
          (!state.offerQuery.trim() ||
            p.name
              .toLowerCase()
              .includes(state.offerQuery.trim().toLowerCase())) &&
          (["Hot deals", "Recommend"].includes(state.offerCategory) ||
            p.category === state.offerCategory),
      ),
    [state.offerQuery, state.offerCategory, offerProducts],
  );
  const items = state.cart.filter(
    (i) => productById[i.productId]?.group === "offer",
  );
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = items.reduce(
    (n, i) => n + productById[i.productId].price * i.quantity,
    0,
  );
  const search = () => {
    setFilter("offerQuery", query);
    Keyboard.dismiss();
  };
  const feedTabs = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ backgroundColor: "#fff", marginBottom: 8 }}
      contentContainerStyle={{ paddingHorizontal: 12, gap: 20 }}
    >
      {tabs.map((t, i) => (
        <Tap
          key={t}
          label={t}
          role="tab"
          selected={state.offerCategory === t}
          onPress={() => setFilter("offerCategory", t)}
          style={{
            paddingVertical: 10,
            borderBottomWidth: state.offerCategory === t ? 2 : 0,
            borderColor: colors.offerOrange,
          }}
        >
          <T
            size={12}
            bold
            color={state.offerCategory === t ? colors.offerOrange : "#374151"}
          >
            {["🔥", "❤️", "⌚", "👗"][i]} {t}
          </T>
        </Tap>
      ))}
    </ScrollView>
  );
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f4f4f6" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlatList<ProductGridRow>
        ref={list}
        data={productGridRows(visible)}
        stickyHeaderIndices={[1]}
        keyExtractor={(row) => row.id}
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
                  variant="offer"
                />
              ))}
              {item.products.length === 1 && <View style={{ flex: 1 }} />}
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          visible.length === 0 ? (
            <T color="#6b7280" style={{ padding: 16, textAlign: "center" }}>
              No matching products.
            </T>
          ) : null
        }
        ListHeaderComponent={
          <>
            <LinearGradient
              colors={["#FF4600", "#FF5500", "#FF6200"]}
              style={{
                paddingHorizontal: 12,
                paddingTop: 8,
                paddingBottom: 12,
              }}
            >
              <Row style={{ justifyContent: "space-between", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <T
                    size={20}
                    bold
                    color="#fff"
                    style={{ letterSpacing: -0.5, lineHeight: 22 }}
                  >
                    BuyMoreSaveMore
                  </T>
                  <T size={11} color="#ffedd5" style={{ marginTop: 2 }}>
                    261k+ users bought
                  </T>
                </View>
                <Tap
                  label="Focus offer search"
                  onPress={() => input.current?.focus()}
                  style={{ padding: 4 }}
                >
                  <SourceIcon source="offer" index={2} size={24} color="#fff" />
                </Tap>
                <Tap
                  label="More options"
                  onPress={() => openDestination("Offer menu")}
                  style={{ padding: 4 }}
                >
                  <SourceIcon source="offer" index={3} size={24} color="#fff" />
                </Tap>
              </Row>
              <Row
                style={{
                  marginTop: 8,
                  backgroundColor: "#fff",
                  borderRadius: 8,
                  padding: 4,
                  paddingLeft: 8,
                }}
              >
                <T
                  size={10}
                  bold
                  color="#FF4700"
                  style={{
                    backgroundColor: "#FFEFE8",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    marginRight: 6,
                  }}
                >
                  Buy More Save More
                </T>
                <TextInput
                  ref={input}
                  accessibilityLabel="Search offers"
                  placeholder="search here"
                  placeholderTextColor="#9ca3af"
                  value={query}
                  onChangeText={(text) => {
                    setQuery(text);
                    if (!text) setFilter("offerQuery", "");
                  }}
                  onSubmitEditing={search}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                  style={{
                    fontFamily,
                    fontSize: 12,
                    padding: 0,
                    flex: 1,
                    minWidth: 20,
                  }}
                />
                <Tap
                  label="Offer visual search"
                  onPress={() => openDestination("Visual search")}
                  style={{ padding: 4 }}
                >
                  <SourceIcon
                    source="offer"
                    index={4}
                    size={18}
                    color="#9ca3af"
                  />
                </Tap>
                <Button
                  title="Search"
                  onPress={search}
                  color={colors.offerOrange}
                  style={{ paddingHorizontal: 14, paddingVertical: 5 }}
                />
              </Row>
              <T
                size={20}
                bold
                color="#fff"
                style={{ textAlign: "center", marginTop: 10, marginBottom: 4 }}
              >
                Buy 2 save{" "}
                <T size={24} bold color="#FFE600">
                  5%
                </T>
              </T>
              <Row style={{ justifyContent: "center", gap: 12 }}>
                <Row style={{ gap: 4 }}>
                  <SourceIcon source="offer" index={5} size={12} color="#fff" />
                  <T size={11} color="#fff">
                    14-Day Free Return
                  </T>
                </Row>
                <T size={11} color="#ffffff99">
                  |
                </T>
                <Row style={{ gap: 4 }}>
                  <SourceIcon source="offer" index={6} size={12} color="#fff" />
                  <T size={11} color="#fff">
                    On-time Guarantee
                  </T>
                </Row>
              </Row>
            </LinearGradient>
            <Row
              style={{
                backgroundColor: "#fff",
                paddingVertical: 12,
                paddingHorizontal: 8,
                justifyContent: "space-around",
                marginBottom: 8,
              }}
            >
              {categories.map((c, i) => (
                <Tap
                  key={c}
                  role="tab"
                  selected={state.offerCategory === c}
                  label={c}
                  onPress={() => setFilter("offerCategory", c)}
                  style={{ flex: 1, alignItems: "center", gap: 4 }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 99,
                      backgroundColor: "#FFA07A40",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: state.offerCategory === c ? 1 : 0,
                      borderColor: "#FF5722",
                    }}
                  >
                    <SourceIcon
                      source="offer"
                      index={7 + i}
                      size={22}
                      color="#FF5722"
                    />
                  </View>
                  <T
                    size={10}
                    style={{
                      textAlign: "center",
                      lineHeight: 12,
                      maxWidth: 62,
                    }}
                  >
                    {c === "Electronics" ? "Electro..." : c}
                  </T>
                </Tap>
              ))}
            </Row>
            <View
              style={{
                backgroundColor: "#fff",
                padding: 12,
                paddingBottom: 14,
                marginBottom: 8,
              }}
            >
              <T size={15} bold style={{ marginBottom: 10 }}>
                Pick You Like
              </T>
              <Row style={{ gap: 8 }}>
                {["Fashion", "Electronics", "Lifestyle"].map((c, i) => (
                  <Tap
                    key={c}
                    label={`Pick ${c}`}
                    onPress={() =>
                      setFilter(
                        "offerCategory",
                        c === "Lifestyle" ? "Recommend" : c,
                      )
                    }
                    style={{
                      flex: 1,
                      height: 176,
                      padding: 6,
                      borderRadius: 12,
                      backgroundColor: ["#E9E4DC", "#DCE7F3", "#EFE9E2"][i],
                      borderWidth: 1,
                      borderColor: "#fef3c7",
                    }}
                  >
                    <View
                      style={{ flex: 1, borderRadius: 8, overflow: "hidden" }}
                    >
                      <StitchImage
                        imageKey={`daraz_buy_more_save_more_offer_screen-background-${i}`}
                      />
                      <View
                        style={{
                          position: "absolute",
                          inset: 0,
                          backgroundColor: "#00000026",
                        }}
                      />
                      <View
                        style={{
                          position: "absolute",
                          bottom: 8,
                          left: 8,
                          right: 8,
                          backgroundColor: "#ffffffd9",
                          borderRadius: 99,
                          paddingVertical: 4,
                        }}
                      >
                        <T size={11} bold style={{ textAlign: "center" }}>
                          {c}
                        </T>
                      </View>
                    </View>
                  </Tap>
                ))}
              </Row>
            </View>
          </>
        }
      />
      <Tap
        label="Scroll offers to top"
        onPress={() =>
          list.current?.scrollToOffset({ offset: 0, animated: true })
        }
        style={{
          position: "absolute",
          bottom: 102,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: 99,
          backgroundColor: "#0009",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SourceIcon source="offer" index={20} size={20} color="#fff" />
      </Tap>
      <View style={{ paddingHorizontal: 8, paddingBottom: 4 }}>
        <T
          size={11}
          bold
          color="#D97706"
          style={{
            textAlign: "center",
            paddingVertical: 4,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            borderWidth: 1,
            borderColor: "#fde68a",
            backgroundColor: "#FFF8E6",
          }}
        >
          Any 2 for 5% Off
        </T>
        <Row
          style={{
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            justifyContent: "space-between",
          }}
        >
          <Tap
            label="View offer items in cart"
            onPress={() => router.navigate("/cart")}
          >
            <Row style={{ gap: 12 }}>
              <View>
                <SourceIcon
                  source="offer"
                  index={21}
                  size={32}
                  color={colors.offerOrange}
                />
                <Badge count={count} />
              </View>
              <T size={16} bold color={colors.offerPrice}>
                Rs.{subtotal.toLocaleString("en-US")}
              </T>
            </Row>
          </Tap>
          <Button
            title={`Check Out(${count})`}
            color={colors.offerOrange}
            onPress={() => {
              select(
                state.cart.map((i) => i.productId),
                false,
              );
              select(
                items.map((i) => i.productId),
                true,
              );
              openDestination("Checkout");
            }}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 10,
              borderRadius: 8,
            }}
            textStyle={{ fontSize: 14 }}
          />
        </Row>
      </View>
    </KeyboardAvoidingView>
  );
}
