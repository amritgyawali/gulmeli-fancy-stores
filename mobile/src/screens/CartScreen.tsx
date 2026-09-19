import { View, TextInput, FlatList } from "@/components/store-ui";
import { useRef, useState, type ReactNode } from "react";
import { Keyboard, KeyboardAvoidingView, Platform } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Button, CheckBox, Row, T, Tap } from "@/components/ui";
import { FontIcon } from "@/components/FontIcon";
import { ProductVisual } from "@/components/ProductVisual";
import { ProductCard } from "@/components/ProductCard";
import { useShop, useCatalog } from "@/store/ShopProvider";
import { openDestination } from "@/services/navigation";
import { colors, fontFamily } from "@/theme/tokens";
import type { CartItem } from "@/types/shop";

function SwipeToDelete({
  onDelete,
  label,
  children,
}: {
  onDelete: () => void;
  label: string;
  children: ReactNode;
}) {
  if (Platform.OS === "web") return <>{children}</>;
  return (
    <Swipeable
      renderRightActions={() => (
        <Tap
          label={`Remove ${label}`}
          onPress={onDelete}
          style={{
            backgroundColor: "#fee2e2",
            justifyContent: "center",
            paddingHorizontal: 18,
          }}
        >
          <T color="#b91c1c" bold>
            Delete
          </T>
        </Tap>
      )}
    >
      {children}
    </Swipeable>
  );
}

function CartRow({ item }: { item: CartItem }) {
  const { productById } = useCatalog();
  const { quantity, toggle, remove } = useShop();
  const p = productById[item.productId];
  if (!p) return null;
  return (
    <SwipeToDelete label={p.name} onDelete={() => remove(p.id)}>
      <Row
        style={{
          alignItems: "flex-start",
          gap: 10,
          paddingTop: 16,
          marginTop: 16,
          borderTopWidth: 1,
          borderColor: "#f3f4f6",
        }}
      >
        <View style={{ marginTop: 32 }}>
          <CheckBox
            checked={item.selected}
            onPress={() => toggle(p.id)}
            label={`Select ${p.name}`}
          />
        </View>
        <Tap
          label={`Open ${p.name}`}
          onPress={() => openDestination("Product details", { id: p.id })}
          style={{
            width: 80,
            height: 80,
            borderRadius: 4,
            borderWidth: 1,
            borderColor: "#f3f4f6",
            overflow: "hidden",
          }}
        >
          <ProductVisual product={p} />
        </Tap>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Tap
            label={`View ${p.name}`}
            onPress={() => openDestination("Product details", { id: p.id })}
          >
            <T size={13} numberOfLines={2} style={{ lineHeight: 18 }}>
              {p.name}
            </T>
          </Tap>
          <T size={11} color="#9ca3af" style={{ marginTop: 2 }}>
            {p.brand ?? p.category}
          </T>
          {p.stock < 1 ? (
            <T size={11} color={colors.critical} style={{ marginTop: 2 }}>
              Out of stock
            </T>
          ) : p.stock < 10 ? (
            <T size={11} color={colors.caution} style={{ marginTop: 2 }}>
              Only {p.stock} left
            </T>
          ) : null}
          <Row
            style={{
              justifyContent: "space-between",
              marginTop: 4,
              flexWrap: "wrap",
              gap: 4,
            }}
          >
            <Row style={{ gap: 6, flexWrap: "wrap" }}>
              <T size={14} bold color={colors.orange}>
                Rs. {p.price.toLocaleString("en-US")}
              </T>
              {p.originalPrice && (
                <T
                  color="#9ca3af"
                  style={{ textDecorationLine: "line-through" }}
                >
                  Rs. {p.originalPrice.toLocaleString("en-US")}
                </T>
              )}
            </Row>
            <Row
              style={{
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 4,
              }}
            >
              <Tap
                label={`Decrease ${p.name}`}
                disabled={item.quantity <= 1}
                onPress={() => quantity(p, item.quantity - 1)}
                style={{ paddingHorizontal: 8, paddingVertical: 2 }}
              >
                <T color={item.quantity <= 1 ? "#d1d5db" : "#4b5563"}>-</T>
              </Tap>
              <T style={{ paddingHorizontal: 6 }}>{item.quantity}</T>
              <Tap
                label={`Increase ${p.name}`}
                disabled={item.quantity >= p.stock}
                onPress={() => quantity(p, item.quantity + 1)}
                style={{ paddingHorizontal: 8, paddingVertical: 2 }}
              >
                <T color="#4b5563">+</T>
              </Tap>
            </Row>
          </Row>
          <Tap
            label={`Open ${p.store ?? "seller"}`}
            onPress={() =>
              openDestination("Seller storefront", {
                store: p.store || "Gulmeli Fancy Stores",
              })
            }
            style={{ marginTop: 8 }}
          >
            <Row style={{ gap: 4 }}>
              <FontIcon name="store" color="#9ca3af" size={12} />
              <T size={11} color={colors.muted} style={{ flexShrink: 1 }}>
                {p.store ?? p.brand ?? p.category}
              </T>
              <FontIcon name="chevron-right" size={8} color="#9ca3af" />
            </Row>
          </Tap>
        </View>
      </Row>
    </SwipeToDelete>
  );
}
export default function CartScreen() {
  const { choiceProducts, productById, recommendations } = useCatalog();
  const { state, select, removeSelected, count, subtotal } = useShop();
  const [expanded, setExpanded] = useState(false);
  const [voucher, setVoucher] = useState("");
  const list = useRef<FlatList>(null);
  const ids = state.cart.map((i) => i.productId);
  const all = ids.length > 0 && state.cart.every((i) => i.selected);
  const choiceIds = state.cart
    .filter((i) => productById[i.productId]?.group === "choice")
    .map((i) => i.productId);
  const choiceSelected =
    choiceIds.length > 0 &&
    state.cart
      .filter((i) => choiceIds.includes(i.productId))
      .every((i) => i.selected);
  const choiceLines = state.cart.filter((i) => choiceIds.includes(i.productId));
  const otherLines = state.cart.filter((i) => !choiceIds.includes(i.productId));
  const shown = expanded ? otherLines : otherLines.slice(0, 3);
  const unavailable = choiceProducts.find((p) => p.stock === 0);
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Row style={{ backgroundColor: "#fff", padding: 16, gap: 12 }}>
        <T size={20} bold>
          My Cart
        </T>
        <Tap
          label="View my voucher"
          onPress={() => openDestination("Voucher wallet")}
          style={{
            flex: 1,
            borderRadius: 99,
            backgroundColor: "#f1f2f6",
            paddingVertical: 6,
            paddingHorizontal: 12,
          }}
        >
          <Row style={{ justifyContent: "space-between" }}>
            <T size={12} color="#4b5563">
              View my voucher
            </T>
            <FontIcon name="chevron-right" color="#9ca3af" size={10} />
          </Row>
        </Tap>
        <Tap
          label="Delete selected cart items"
          onPress={removeSelected}
          disabled={!count}
          style={{ padding: 4 }}
        >
          <FontIcon name="trash-can" size={18} color="#1f2937" />
        </Tap>
      </Row>
      <FlatList
        ref={list}
        data={recommendations}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 8, marginHorizontal: 10, marginBottom: 8 }}
        renderItem={({ item }) => (
          <ProductCard product={item} variant="recommendation" />
        )}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 12 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 10, gap: 10, marginBottom: 18 }}>
            <View
              style={{ backgroundColor: "#fff", borderRadius: 8, padding: 12 }}
            >
              {/*
                Was: a yellow "CHOICE" chip next to "1-3 Days Delivery",
                naming a delivery tier the store does not offer, shown above
                the cart lines whether or not the cart had any. What the
                checkbox actually does is select every line, so that is what
                it says now, and it only appears when there is something to
                select.
              */}
              {!!choiceIds.length && (
                <Row
                  style={{
                    gap: 8,
                    paddingBottom: 10,
                    borderBottomWidth: 1,
                    borderColor: colors.line,
                  }}
                >
                  <CheckBox
                    checked={choiceSelected}
                    onPress={() => select(choiceIds, !choiceSelected)}
                    label="Select all items"
                  />
                  <T size={14} bold>
                    Select all
                  </T>
                </Row>
              )}
              {/*
                Removed from here: a strip of three product thumbnails with a
                "+" tile captioned "Buy 3 for free shipping", and beneath it
                "Add 4 more for 1 Free Gift | End in <countdown>" with a
                "Pick" link. No bundle, gift or countdown of that kind exists
                in the store; the free-shipping rule is the spend threshold in
                the config. Worse, all of it rendered above "Your cart is
                empty.", so an empty cart advertised progress toward a reward
                nobody could collect.
              */}
              {choiceLines.map((item) => (
                <CartRow key={item.productId} item={item} />
              ))}
              {!state.cart.length && (
                <View style={{ alignItems: "center", gap: 10, paddingVertical: 28 }}>
                  <FontIcon name="cart-shopping" size={34} color={colors.faint} />
                  <T bold size={16}>
                    Your cart is empty
                  </T>
                  <T color={colors.muted} style={{ textAlign: "center" }}>
                    Items you add appear here, on every device you sign in on.
                  </T>
                  <Button
                    title="Browse products"
                    onPress={() => openDestination("Search results", { query: "" })}
                  />
                </View>
              )}
            </View>
            {shown.length > 0 && (
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <Row
                  style={{
                    gap: 8,
                    paddingBottom: 10,
                    borderBottomWidth: 1,
                    borderColor: "#f3f4f6",
                  }}
                >
                  <CheckBox
                    label="Select other cart items"
                    checked={otherLines.every((i) => i.selected)}
                    onPress={() =>
                      select(
                        otherLines.map((i) => i.productId),
                        !otherLines.every((i) => i.selected),
                      )
                    }
                  />
                  <T size={14} bold>
                    {otherLines.every(
                      (i) => productById[i.productId]?.group === "offer",
                    )
                      ? "Buy More Save More"
                      : "My Cart"}
                  </T>
                </Row>
                {shown.map((item) => (
                  <CartRow key={item.productId} item={item} />
                ))}
              </View>
            )}
            {unavailable && (
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <Row
                  style={{
                    gap: 8,
                    paddingBottom: 10,
                    borderBottomWidth: 1,
                    borderColor: "#f3f4f6",
                  }}
                >
                  <CheckBox
                    checked={false}
                    disabled
                    onPress={() => undefined}
                    label="Unavailable seller items"
                  />
                  <Tap
                    label="ZenFusion Grocer"
                    onPress={() =>
                      openDestination("Seller storefront", {
                        store: "ZenFusion Grocer",
                      })
                    }
                  >
                    <Row style={{ gap: 6 }}>
                      <FontIcon name="store" color="#6b7280" size={12} />
                      <T size={14} bold>
                        ZenFusion Grocer
                      </T>
                      <FontIcon
                        name="chevron-right"
                        color="#9ca3af"
                        size={10}
                      />
                    </Row>
                  </Tap>
                </Row>
                <Row
                  style={{
                    gap: 10,
                    paddingTop: 12,
                    alignItems: "flex-start",
                    opacity: 0.75,
                  }}
                >
                  <View style={{ marginTop: 32 }}>
                    <CheckBox
                      label="Gyan Chiura unavailable"
                      checked={false}
                      disabled
                      onPress={() => undefined}
                    />
                  </View>
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 4,
                      overflow: "hidden",
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                    }}
                  >
                    <ProductVisual product={unavailable} />
                    <T
                      size={9}
                      bold
                      color="#fff"
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: "#0009",
                        textAlign: "center",
                        paddingVertical: 2,
                      }}
                    >
                      Not available
                    </T>
                  </View>
                  <View style={{ flex: 1 }}>
                    <T numberOfLines={1}>
                      <T
                        size={9}
                        bold
                        color="#fff"
                        style={{ backgroundColor: colors.orange }}
                      >
                        {" "}
                        9.9{" "}
                      </T>{" "}
                      Gyan Chiura 800Gm
                    </T>
                    <T size={11} color="#9ca3af">
                      GYAN
                    </T>
                    <Row
                      style={{
                        justifyContent: "space-between",
                        marginTop: 8,
                        flexWrap: "wrap",
                        gap: 4,
                      }}
                    >
                      <T size={14} bold color="#6b7280">
                        Rs. 110
                      </T>
                      <Button
                        title="Find Similar"
                        outline
                        onPress={() =>
                          openDestination("Similar products", {
                            category: "Groceries",
                          })
                        }
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 2,
                          borderRadius: 4,
                        }}
                      />
                    </Row>
                  </View>
                </Row>
              </View>
            )}
            {otherLines.length > 3 && (
              <Tap
                label={expanded ? "View less" : "View all"}
                onPress={() => setExpanded((x) => !x)}
                style={{ alignSelf: "center", paddingVertical: 4 }}
              >
                <Row style={{ gap: 4 }}>
                  <T color={colors.muted}>
                    {expanded ? "View less" : `View all ${otherLines.length}`}
                  </T>
                  <FontIcon
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={10}
                    color={colors.muted}
                  />
                </Row>
              </Tap>
            )}
            {!!state.cart.length && (
            <View
              style={{ backgroundColor: "#fff", borderRadius: 8, padding: 12 }}
            >
              <TextInput
                value={voucher}
                onChangeText={setVoucher}
                accessibilityLabel="Enter Voucher Code"
                placeholder="Enter Voucher Code"
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
                returnKeyType="done"
                onSubmitEditing={() => {
                  Keyboard.dismiss();
                  if (voucher.trim())
                    openDestination("Voucher validation", {
                      code: voucher.trim(),
                    });
                }}
                style={{
                  fontFamily,
                  fontSize: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  backgroundColor: "#f4f4f6",
                  color: "#374151",
                  borderRadius: 6,
                }}
              />
              <Button
                title="Apply voucher code"
                outline
                onPress={() =>
                  openDestination("Voucher validation", {
                    code: voucher.trim(),
                  })
                }
              />
            </View>
            )}
          </View>
        }
      />
      <Tap
        label="Scroll cart to top"
        onPress={() =>
          list.current?.scrollToOffset({ offset: 0, animated: true })
        }
        style={{
          position: "absolute",
          bottom: 72,
          right: 16,
          width: 36,
          height: 36,
          borderWidth: 1,
          borderColor: "#e5e7eb",
          backgroundColor: "#fff",
          borderRadius: 99,
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 4px #0002",
        }}
      >
        <FontIcon name="arrow-up" size={16} />
      </Tap>
      {/* The order bar only exists once there is an order. It used to sit
          under an empty cart reading "Subtotal: Rs. 0" beside a
          "Check Out(0)" button that led to a screen telling you to go back
          and select an item. */}
      {!!state.cart.length && (
        <Row
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderColor: colors.line,
            gap: 10,
          }}
        >
          <CheckBox
            checked={all}
            onPress={() => select(ids, !all)}
            label="Select all cart items"
          />
          <T size={14}>All</T>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <T>
              Subtotal:{" "}
              <T size={15} bold color={colors.brand}>
                Rs. {subtotal.toLocaleString("en-US")}
              </T>
            </T>
            <T size={11} color={colors.muted}>
              Delivery calculated at checkout
            </T>
          </View>
          <Button
            title={`Checkout (${count})`}
            disabled={!count}
            onPress={() => openDestination("Checkout")}
            style={{ paddingHorizontal: 16, paddingVertical: 10 }}
          />
        </Row>
      )}
    </KeyboardAvoidingView>
  );
}
