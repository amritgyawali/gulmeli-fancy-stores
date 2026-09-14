import {
  Suspense,
  lazy,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Button, Row, T, Tap } from "@/components/ui";
import CameraCapture from "@/components/CameraCapture";
import { ProductVisual } from "@/components/ProductVisual";
import { ProductCard } from "@/components/ProductCard";
import { useShop, useCatalog } from "@/store/ShopProvider";
import { openDestination } from "@/services/navigation";
import { voucherDiscount } from "@/store/commerce";
import { uploadAvatar } from "@/services/cloudinary";
import { paymentsAvailable } from "@/services/payments";
import { usePrefs } from "@/store/prefs";
import { currentBrand } from "@/utils/branding";
import type { Product } from "@/types/shop";

// The Stripe SDK only enters the bundle on native builds that are configured.
const StripePayButtonLazy = lazy(
  () => import("@/components/StripePayButton"),
);

const money = (n: number) => `Rs. ${n.toLocaleString("en-US")}`;
const categories = [
  "All",
  "Fashion",
  "Electronics",
  "Groceries",
  "Jewelry",
  "Lifestyle",
];
function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}
function Field({
  label,
  value,
  onChangeText,
  multiline = false,
  phone = false,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  multiline?: boolean;
  phone?: boolean;
}) {
  return (
    <View style={{ gap: 5 }}>
      <T bold>{label}</T>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={phone ? "phone-pad" : "default"}
        style={[
          styles.input,
          multiline && { minHeight: 80, textAlignVertical: "top" },
        ]}
      />
    </View>
  );
}
function Grid({ items }: { items: Product[] }) {
  return items.length ? (
    <View style={styles.grid}>
      {items.map((p) => (
        <View key={p.id} style={{ width: "48.5%" }}>
          <ProductCard product={p} variant="recommendation" />
        </View>
      ))}
    </View>
  ) : (
    <Card>
      <T>No products here yet. Try another category or search.</T>
      <Button
        title="Browse all products"
        onPress={() => openDestination("Search results")}
      />
    </Card>
  );
}
export default function FeatureScreen() {
  const { session, customerReady } = useShop();
  const params = useLocalSearchParams<{
    destination?: string;
    id?: string;
    query?: string;
    category?: string;
    store?: string;
    code?: string;
  }>();
  // A new destination gets a fresh form, including when it is pushed from another feature.
  const renamedParams = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      typeof value === "string" ? currentBrand(value) : value,
    ]),
  );
  return (
    <FeatureContent
      key={`${session?.user.id || "guest"}:${customerReady}:${JSON.stringify(renamedParams)}`}
      params={renamedParams}
    />
  );
}
function FeatureContent({
  params,
}: {
  params: {
    destination?: string;
    id?: string;
    query?: string;
    category?: string;
    store?: string;
    code?: string;
  };
}) {
  const title = params.destination || "Gulmeli Fancy Stores";
  const mode = title.toLowerCase();
  const router = useRouter();
  const {
    state,
    updateCommerce,
    add,
    select,
    checkout,
    cancelOrder,
    live,
    session,
    customerReady,
    signOut,
    subtotal,
    count,
    collect,
    setFilter,
  } = useShop();
  const { products, productById } = useCatalog();
  const c = state.commerce;
  const [query, setQuery] = useState(params.query || "");
  const [category, setCategory] = useState(params.category || "All");
  const [sort, setSort] = useState("Featured");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [profile, setProfile] = useState(c.profile);
  const [code, setCode] = useState(params.code || c.voucher);
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [photo, setPhoto] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [faq, setFaq] = useState(-1);
  const [game, setGame] = useState(0);
  const [answer, setAnswer] = useState(0);
  const biometricsEnabled = usePrefs((s) => s.biometricsEnabled);
  const toggleBiometrics = async (value: boolean) => {
    if (!value) {
      usePrefs.getState().setBiometricsEnabled(false);
      setNotice("Biometric lock turned off.");
      return;
    }
    try {
      const LocalAuthentication = await import("expo-local-authentication");
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!compatible || !enrolled) {
        setNotice(
          "No fingerprint or face unlock is enrolled on this device. Set one up in system settings first.",
        );
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Confirm biometrics to enable the app lock",
      });
      if (result.success) {
        usePrefs.getState().setBiometricsEnabled(true);
        setNotice("Biometric lock enabled. It applies on next launch.");
      } else
        setNotice("Biometric verification failed. The lock stays off.");
    } catch {
      setNotice("Biometrics are unavailable on this device.");
    }
  };
  const product = params.id ? productById[params.id] : undefined;
  const isProduct = mode === "product details";
  const isCheckout = mode.startsWith("checkout");
  const isProfile =
    mode.includes("profile") || mode === "settings" || mode === "pickup points";
  const isOrders = /order|return history/.test(mode);
  const isReviews = /review/.test(mode);
  const isVoucher = /voucher/.test(mode);
  const isRewards = /gems|candy|land|freebie/.test(mode);
  const isHelp = /help|care|chats/.test(mode);
  const isAffiliate = /affiliate/.test(mode);
  const store = params.store || "Gulmeli Fancy Stores";
  useEffect(() => {
    if (isProduct && product)
      updateCommerce((s) => ({
        ...s,
        recent: [
          product.id,
          ...s.recent.filter((id) => id !== product.id),
        ].slice(0, 30),
      }));
  }, [isProduct, product, updateCommerce]);
  async function pickPhoto(camera: boolean, avatar: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      if (camera && Platform.OS !== "web") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setNotice(
            "Camera access was denied. You can choose a photo instead.",
          );
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.3,
        base64: avatar,
      };
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const asset = result.assets[0];
      if (avatar) {
        if (!asset.base64 || asset.base64.length > 2000000) {
          setNotice("Choose a smaller profile photo (under 1.5 MB).");
          return;
        }
        const dataUri = `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`;
        const avatarUrl = live ? await uploadAvatar(dataUri) : dataUri;
        setProfile((p) => ({ ...p, avatar: avatarUrl }));
        setNotice(
          live
            ? "Photo uploaded. Save your profile to use it."
            : "Photo selected. Save your profile to use it.",
        );
      } else setPhoto(asset.uri);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The photo could not be opened. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  const toggleWishlist = (id: string) =>
    updateCommerce((s) => ({
      ...s,
      wishlist: s.wishlist.includes(id)
        ? s.wishlist.filter((x) => x !== id)
        : [...s.wishlist, id],
    }));
  const applyVoucher = () => {
    if (code.trim().toUpperCase() !== "GULMELI10") {
      setNotice(
        "Code not recognized. Use GULMELI10 for 10% off orders of Rs. 500 or more, up to Rs. 100.",
      );
      return;
    }
    collect();
    updateCommerce((s) => ({ ...s, voucher: "GULMELI10" }));
    setNotice(
      "GULMELI10 saved. The discount applies at checkout when your subtotal reaches Rs. 500.",
    );
  };
  let content: ReactNode;
  if (isProduct) {
    content = product ? (
      <>
        <View style={styles.hero}>
          <ProductVisual product={product} />
        </View>
        <Card>
          <T size={21} bold>
            {product.name}
          </T>
          <T size={24} bold color="#f85606">
            {money(product.price)}
          </T>
          <T>
            {product.category} ·{" "}
            {product.stock > 0 ? `${product.stock} available` : "Out of stock"}
          </T>
          {product.originalPrice && (
            <T color="#6b7280">Original price {money(product.originalPrice)}</T>
          )}
          <Tap
            label="Visit seller"
            onPress={() =>
              openDestination("Seller storefront", {
                store: product.store || "Gulmeli Fancy Stores",
              })
            }
          >
            <T color="#f85606">
              Sold by {product.store || "Gulmeli Fancy Stores"} ›
            </T>
          </Tap>
          <Button
            title={
              c.wishlist.includes(product.id)
                ? "Remove from wishlist"
                : "Save to wishlist"
            }
            outline
            onPress={() => toggleWishlist(product.id)}
          />
          <Button
            title="Add to cart"
            disabled={
              product.stock < 1 ||
              (state.cart.find((i) => i.productId === product.id)?.quantity ||
                0) >= product.stock
            }
            onPress={() => {
              add(product);
              setNotice("Added to cart.");
            }}
          />
          <Button
            title="Go to cart"
            outline
            onPress={() => router.navigate("/cart")}
          />
        </Card>
        <Card>
          <T size={17} bold>
            Product reviews
          </T>
          {c.reviews
            .filter((r) => r.productId === product.id)
            .map((r, i) => (
              <T key={i}>
                {"★".repeat(r.rating)} · {r.text}
              </T>
            ))}
          {!c.reviews.some((r) => r.productId === product.id) && (
            <T>
              {live
                ? "No reviews saved in your account."
                : "No reviews saved on this device."}
            </T>
          )}
          <Button
            title="Write a review"
            outline
            onPress={() =>
              openDestination("Product review", { id: product.id })
            }
          />
        </Card>
      </>
    ) : (
      <Card>
        <T>This product could not be found.</T>
        <Button
          title="Browse products"
          onPress={() => openDestination("Search results")}
        />
      </Card>
    );
  } else if (isCheckout) {
    const discount = voucherDiscount(c.voucher, subtotal);
    content = (
      <>
        <Card>
          <T size={19} bold>
            Review your order
          </T>
          <T>
            {live
              ? "Place a cash-on-delivery order with Gulmeli Fancy Stores. Prices and stock are confirmed when you place the order."
              : "This checkout saves an order on this device. It does not send it to Gulmeli Fancy Stores or charge a payment."}
          </T>
        </Card>
        {state.cart
          .filter((i) => i.selected)
          .map((i) => (
            <Card key={i.productId}>
              <T bold>{productById[i.productId]?.name}</T>
              <T>
                {i.quantity} × {money(productById[i.productId]?.price || 0)}
              </T>
            </Card>
          ))}
        {!count ? (
          <Card>
            <T>Select items in your cart before checkout.</T>
            <Button
              title="Open cart"
              onPress={() => router.navigate("/cart")}
            />
          </Card>
        ) : (
          <>
            <Card>
              <T size={17} bold>
                Delivery details
              </T>
              <Field
                label="Full name"
                value={profile.name}
                onChangeText={(name) => setProfile((p) => ({ ...p, name }))}
              />
              <Field
                label="Phone number"
                phone
                value={profile.phone}
                onChangeText={(phone) => setProfile((p) => ({ ...p, phone }))}
              />
              <Field
                label="Delivery address"
                multiline
                value={profile.address}
                onChangeText={(address) =>
                  setProfile((p) => ({ ...p, address }))
                }
              />
            </Card>
            <Card>
              <Field label="Voucher code" value={code} onChangeText={setCode} />
              <Button title="Apply voucher" outline onPress={applyVoucher} />
              <T>Subtotal: {money(subtotal)}</T>
              <T>Discount: −{money(discount)}</T>
              <T>
                {live ? "Shipping: Rs. 0" : "Shipping: Rs. 0 (local estimate)"}
              </T>
              <T size={20} bold>
                Total: {money(subtotal - discount)}
              </T>
              <T>
                Payment preference: Cash on delivery. No payment is collected
                here.
              </T>
              {paymentsAvailable && (
                <Suspense
                  fallback={<T size={11} color="#6b7280">Loading secure payment…</T>}
                >
                  <StripePayButtonLazy
                    total={subtotal - discount}
                    onBusy={setBusy}
                    onError={setNotice}
                    onPaid={() => setNotice("Card payment approved.")}
                  />
                </Suspense>
              )}
              <Button
                title={
                  busy
                    ? "Placing order..."
                    : live
                      ? "Place order - Cash on delivery"
                      : "Save local order"
                }
                disabled={busy}
                onPress={async () => {
                  if (busy) return;
                  setBusy(true);
                  try {
                    const id = await checkout(profile);
                    router.replace({
                      pathname: "/feature",
                      params: { destination: "Order details", id },
                    });
                  } catch (e) {
                    setNotice(
                      e instanceof Error
                        ? e.message
                        : "Order could not be saved.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </Card>
          </>
        )}
      </>
    );
  } else if (isProfile) {
    content = (
      <Card>
        <T size={20} bold>
          {mode === "pickup points"
            ? "Delivery address"
            : "Your Gulmeli Fancy Stores profile"}
        </T>
        {mode === "pickup points" && (
          <T>
            No pickup locations are configured. Save your delivery address for
            checkout.
          </T>
        )}
        {profile.avatar ? (
          <Image source={{ uri: profile.avatar }} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: "#fff0e8",
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <T size={28} bold>
              {profile.name.slice(0, 1)}
            </T>
          </View>
        )}
        <Button
          title={busy ? "Uploading photo..." : "Choose profile photo"}
          disabled={busy}
          outline
          onPress={() => void pickPhoto(false, true)}
        />
        {profile.avatar && (
          <Button
            title="Remove photo"
            outline
            onPress={() => setProfile((p) => ({ ...p, avatar: "" }))}
          />
        )}
        <Field
          label="Full name"
          value={profile.name}
          onChangeText={(name) => setProfile((p) => ({ ...p, name }))}
        />
        <Field
          label="Phone number"
          phone
          value={profile.phone}
          onChangeText={(phone) => setProfile((p) => ({ ...p, phone }))}
        />
        <Field
          label="Delivery address"
          multiline
          value={profile.address}
          onChangeText={(address) => setProfile((p) => ({ ...p, address }))}
        />
        <Button
          title="Save profile"
          disabled={busy}
          onPress={() => {
            if (profile.name.trim().length < 2) {
              setNotice("Enter your full name.");
              return;
            }
            updateCommerce((s) => ({
              ...s,
              profile: { ...profile, name: profile.name.trim() },
            }));
            setNotice(
              live
                ? "Profile updated. Check the account save status above."
                : "Profile saved on this device.",
            );
          }}
        />
        <Row style={{ justifyContent: "space-between" }}>
          <T>Show promotional notifications</T>
          <Switch
            accessibilityLabel="Promotional notifications"
            value={c.notifications}
            onValueChange={(notifications) =>
              updateCommerce((s) => ({ ...s, notifications }))
            }
          />
        </Row>
        {Platform.OS !== "web" && (
          <Row style={{ justifyContent: "space-between" }}>
            <T>Lock app with biometrics</T>
            <Switch
              accessibilityLabel="Biometric app lock"
              value={biometricsEnabled}
              onValueChange={(value) => void toggleBiometrics(value)}
            />
          </Row>
        )}
        {live && session && (
          <>
            <T>Signed in as {session.user.email}</T>
            <Button
              title="Sign out"
              outline
              disabled={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  await signOut();
                  router.replace("/account");
                } catch (error) {
                  setNotice(
                    error instanceof Error
                      ? error.message
                      : "Could not save your account. Retry before signing out.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
          </>
        )}
        <Button
          title="View saved orders"
          outline
          onPress={() => openDestination("Orders list")}
        />
      </Card>
    );
  } else if (isOrders) {
    const orders = c.orders.filter(
      (o) =>
        (!params.id || o.id === params.id) &&
        (!mode.includes("return") || o.status === "Cancelled"),
    );
    content = (
      <>
        <Card>
          <T size={20} bold>
            {params.id ? "Order details" : "Your orders"}
          </T>
          <T>
            {live
              ? "Your orders are saved with the store. Pull down on Account to refresh order updates."
              : "Orders saved here stay on this device. Live shipping and payment updates require a connected store."}
          </T>
        </Card>
        {orders.map((o) => (
          <Card key={o.id}>
            <T bold>{o.id}</T>
            <T>{new Date(o.createdAt).toLocaleString()}</T>
            <T bold color={o.status === "Cancelled" ? "#b91c1c" : "#0f766e"}>
              {o.status}
            </T>
            {o.items.map((i) => (
              <Tap
                key={i.productId}
                label={`Order item ${i.name}`}
                onPress={() =>
                  openDestination("Product details", { id: i.productId })
                }
              >
                <T>
                  {i.quantity} × {i.name} · {money(i.quantity * i.price)}
                </T>
              </Tap>
            ))}
            <T size={18} bold>
              Total {money(o.total)}
            </T>
            {["Saved locally", "Placed"].includes(o.status) && (
              <Button
                title={live ? "Cancel order" : "Cancel local order"}
                disabled={busy}
                outline
                onPress={async () => {
                  setBusy(true);
                  try {
                    await cancelOrder(o.id);
                  } catch (error) {
                    setNotice(
                      error instanceof Error
                        ? error.message
                        : "Cancellation failed. Please try again.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            )}
            <Button
              title="Buy again"
              onPress={() => {
                o.items.forEach((i) => {
                  const p = productById[i.productId];
                  if (p)
                    for (let n = 0; n < Math.min(i.quantity, p.stock); n++)
                      add(p);
                });
                select(
                  o.items.map((i) => i.productId),
                  true,
                );
                router.navigate("/cart");
              }}
            />
          </Card>
        ))}
        {!orders.length && (
          <Card>
            <T>
              No {mode.includes("return") ? "cancelled " : ""}orders saved yet.
            </T>
            <Button
              title="Start shopping"
              onPress={() => router.navigate("/")}
            />
          </Card>
        )}
      </>
    );
  } else if (isReviews) {
    content = (
      <>
        <Card>
          <T size={20} bold>
            Your reviews
          </T>
          <T>
            {live
              ? "Reviews are saved privately in your account."
              : "Reviews are saved on this device."}
          </T>
          {product ? (
            <>
              <T bold>{product.name}</T>
              <Row style={{ gap: 10 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Tap
                    key={n}
                    label={`Rate ${n} stars`}
                    selected={rating === n}
                    role="tab"
                    onPress={() => setRating(n)}
                  >
                    <T size={26} color={n <= rating ? "#eab308" : "#d1d5db"}>
                      ★
                    </T>
                  </Tap>
                ))}
              </Row>
              <Field
                label="Your review"
                multiline
                value={text}
                onChangeText={setText}
              />
              <Button
                title="Save review"
                onPress={() => {
                  if (text.trim().length < 5) {
                    setNotice("Write at least 5 characters about the product.");
                    return;
                  }
                  updateCommerce((s) => ({
                    ...s,
                    reviews: [
                      ...s.reviews.filter((r) => r.productId !== product.id),
                      { productId: product.id, rating, text: text.trim() },
                    ],
                  }));
                  setNotice("Review saved.");
                }}
              />
            </>
          ) : (
            <T>Open a product to write a review.</T>
          )}
        </Card>
        {c.reviews.map((r) => (
          <Card key={r.productId}>
            <T bold>{productById[r.productId]?.name}</T>
            <T>
              {"★".repeat(r.rating)} {r.text}
            </T>
            <Button
              title="Delete review"
              outline
              onPress={() =>
                updateCommerce((s) => ({
                  ...s,
                  reviews: s.reviews.filter((x) => x.productId !== r.productId),
                }))
              }
            />
          </Card>
        ))}
        <Button
          title="Browse products to review"
          onPress={() => openDestination("Search results")}
        />
      </>
    );
  } else if (isVoucher) {
    content = (
      <>
        <Card>
          <T size={25} bold color="#f85606">
            GULMELI10
          </T>
          <T size={17} bold>
            {live ? "10% off your order" : "10% off your local order"}
          </T>
          <T>
            Minimum Rs. 500. Maximum discount Rs. 100.{" "}
            {live
              ? "Validated when you place the order."
              : "Applies to local checkout estimates."}
          </T>
          <Button
            title={
              state.vouchersCollected ? "Voucher collected" : "Collect voucher"
            }
            disabled={state.vouchersCollected}
            onPress={collect}
          />
          <Field label="Voucher code" value={code} onChangeText={setCode} />
          <Button title="Apply voucher" onPress={applyVoucher} />
          {c.voucher && (
            <Button
              title="Remove applied voucher"
              outline
              onPress={() => {
                updateCommerce((s) => ({ ...s, voucher: "" }));
                setCode("");
                setNotice("Voucher removed.");
              }}
            />
          )}
          <Button
            title="Open cart"
            outline
            onPress={() => router.navigate("/cart")}
          />
        </Card>
      </>
    );
  } else if (isRewards) {
    const today = new Date().toLocaleDateString("en-CA");
    content = (
      <>
        <Card>
          <T size={30} bold color="#9333ea">
            {c.gems} Gulmeli Fancy Stores Gems
          </T>
          <T>Local rewards · no cash value</T>
          <T>
            Check in each day to collect 10 gems. Exchange 50 gems for the local
            GULMELI10 voucher.
          </T>
          <Button
            title={
              c.lastCheckIn === today
                ? "Checked in today"
                : "Collect daily gems"
            }
            disabled={c.lastCheckIn === today}
            onPress={() =>
              updateCommerce((s) =>
                s.lastCheckIn === today
                  ? s
                  : { ...s, gems: s.gems + 10, lastCheckIn: today },
              )
            }
          />
          <Button
            title="Redeem 50 gems"
            disabled={c.gems < 50}
            outline
            onPress={() => {
              updateCommerce((s) =>
                s.gems < 50
                  ? s
                  : { ...s, gems: s.gems - 50, voucher: "GULMELI10" },
              );
              collect();
              setNotice("GULMELI10 redeemed and applied.");
            }}
          />
        </Card>
        <Card>
          <T size={19} bold>
            Gulmeli Fancy Stores Candy: count the candies
          </T>
          <T size={26}>{"🍬".repeat((game % 5) + 1)}</T>
          <Row style={{ gap: 12 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Tap
                key={n}
                label={`Answer ${n}`}
                role="tab"
                selected={answer === n}
                onPress={() => setAnswer(n)}
              >
                <T size={22} color={answer === n ? "#f85606" : "#374151"}>
                  {n}
                </T>
              </Tap>
            ))}
          </Row>
          <Button
            title="Check answer"
            onPress={() => {
              if (answer !== (game % 5) + 1) {
                setNotice("Count again and choose the matching number.");
                return;
              }
              setGame((n) => n + 1);
              setAnswer(0);
              setNotice("Correct! Try the next round.");
            }}
          />
          <T>Rounds completed: {game}</T>
        </Card>
        <Button
          title="Browse rewards voucher"
          outline
          onPress={() => openDestination("Voucher wallet")}
        />
      </>
    );
  } else if (isHelp) {
    const faqs = [
      [
        "How do I place an order?",
        live
          ? "Add products to your cart, sign in, enter your delivery details and place a cash-on-delivery order."
          : "Open a product, add it to your cart, select it and checkout. This version saves the order locally; it does not submit it to the store.",
      ],
      [
        "Can I pay online?",
        "Online payments are not connected. No card or wallet details are collected.",
      ],
      [
        "Where is my order?",
        "Open Orders in Account to see saved orders. Live delivery tracking needs a connected store.",
      ],
      [
        "How do vouchers work?",
        "GULMELI10 takes 10% off subtotals of Rs. 500 or more, capped at Rs. 100.",
      ],
    ];
    content = (
      <>
        <Card>
          <T size={20} bold>
            Gulmeli Fancy Stores Help Center
          </T>
          {faqs.map(([q, a], i) => (
            <View key={q} style={{ gap: 8 }}>
              <Tap label={q} onPress={() => setFaq(faq === i ? -1 : i)}>
                <T bold>
                  {q} {faq === i ? "−" : "+"}
                </T>
              </Tap>
              {faq === i && <T>{a}</T>}
            </View>
          ))}
        </Card>
        <Card>
          <T size={18} bold>
            Customer care drafts
          </T>
          <T>
            Write a message and save it for later. These drafts are not sent to
            customer care.
          </T>
          <Field
            label="Message"
            multiline
            value={text}
            onChangeText={setText}
          />
          <Button
            title="Save message draft"
            onPress={() => {
              if (!text.trim()) {
                setNotice("Enter a message first.");
                return;
              }
              updateCommerce((s) => ({
                ...s,
                drafts: [
                  {
                    id: `${Date.now()}`,
                    text: text.trim(),
                    createdAt: new Date().toISOString(),
                  },
                  ...s.drafts,
                ],
              }));
              setText("");
              setNotice("Draft saved. It has not been sent.");
            }}
          />
          {c.drafts.map((d) => (
            <View key={d.id} style={{ gap: 6 }}>
              <T>{d.text}</T>
              <Button
                title="Delete draft"
                outline
                onPress={() =>
                  updateCommerce((s) => ({
                    ...s,
                    drafts: s.drafts.filter((x) => x.id !== d.id),
                  }))
                }
              />
            </View>
          ))}
        </Card>
      </>
    );
  } else if (isAffiliate) {
    content = (
      <Card>
        <T size={20} bold>
          Share Gulmeli Fancy Stores
        </T>
        <T>
          Invite friends to browse Gulmeli Fancy Stores. Referral commissions
          are not configured.
        </T>
        <Button
          title="Share store invitation"
          onPress={() => {
            void Share.share({
              message:
                "Discover Gulmeli Fancy Stores — fashion, everyday essentials and more.",
            }).catch(() =>
              setNotice("Sharing could not be opened on this device."),
            );
          }}
        />
        <T>
          Saved invitations:{" "}
          {
            c.drafts.filter((d) =>
              d.text.startsWith("Gulmeli Fancy Stores invitation:"),
            ).length
          }
        </T>
        <Field label="Invitation note" value={text} onChangeText={setText} />
        <Button
          title="Save invitation"
          outline
          onPress={() => {
            if (!text.trim()) {
              setNotice("Write an invitation note first.");
              return;
            }
            updateCommerce((s) => ({
              ...s,
              drafts: [
                ...s.drafts,
                {
                  id: `${Date.now()}`,
                  text: `Gulmeli Fancy Stores invitation: ${text.trim()}`,
                  createdAt: new Date().toISOString(),
                },
              ],
            }));
            setText("");
            setNotice("Invitation saved.");
          }}
        />
      </Card>
    );
  } else if (mode === "payment options") {
    content = (
      <Card>
        <T size={20} bold>
          Payment options
        </T>
        <T>
          {live
            ? "Orders use cash on delivery. Online card and wallet payments are not enabled."
            : "Cash on delivery is the preference used in local checkout. Online card and wallet payments are not connected."}
        </T>
        <Button
          title="Continue to cart"
          onPress={() => router.navigate("/cart")}
        />
      </Card>
    );
  } else if (mode === "offer menu") {
    content = (
      <Card>
        {[
          "Search results",
          "Voucher wallet",
          "Wishlist",
          "Orders list",
          "Help Center",
        ].map((d) => (
          <Button
            key={d}
            title={d}
            outline
            onPress={() => openDestination(d)}
          />
        ))}
        <Button
          title="Reset offer filters"
          onPress={() => {
            setFilter("offerCategory", "Hot deals");
            setFilter("offerQuery", "");
            router.navigate("/offers");
          }}
        />
      </Card>
    );
  } else if (mode === "followed stores") {
    content = (
      <>
        <Card>
          <T size={20} bold>
            Followed stores
          </T>
          {!c.following.length && (
            <T>Follow a seller from a product page to find it here.</T>
          )}
          {c.following.map((s) => (
            <Button
              key={s}
              title={s}
              outline
              onPress={() => openDestination("Seller storefront", { store: s })}
            />
          ))}
          <Button
            title="Visit Gulmeli Fancy Stores"
            onPress={() =>
              openDestination("Seller storefront", {
                store: "Gulmeli Fancy Stores",
              })
            }
          />
        </Card>
      </>
    );
  } else {
    let list = products.filter((p) => p.stock > 0);
    if (mode === "wishlist")
      list = list.filter((p) => c.wishlist.includes(p.id));
    if (mode.includes("recently"))
      list = c.recent.map((id) => productById[id]).filter(Boolean);
    if (mode.includes("seller"))
      list = list.filter((p) => (p.store || "Gulmeli Fancy Stores") === store);
    if (/choice|bachat|buy any/.test(mode))
      list = list.filter((p) => p.group === "choice");
    if (/flash|sale|promotion/.test(mode))
      list = list.filter((p) => p.discount || p.originalPrice);
    if (mode === "digital goods") list = [];
    list = list.filter(
      (p) =>
        (category === "All" || p.category === category) &&
        (!query.trim() ||
          `${p.name} ${p.category} ${p.store || "Gulmeli Fancy Stores"}`
            .toLowerCase()
            .includes(query.trim().toLowerCase())),
    );
    if (sort === "Price: low to high") list.sort((a, b) => a.price - b.price);
    if (sort === "Price: high to low") list.sort((a, b) => b.price - a.price);
    if (sort === "Top rated" || /ranking/.test(mode))
      list.sort(
        (a, b) => parseFloat(b.rating || "0") - parseFloat(a.rating || "0"),
      );
    content = (
      <>
        {mode === "visual search" && (
          <Card>
            <T size={18} bold>
              Find a product from a photo
            </T>
            <T>
              Choose a reference photo, then select its category or describe it
              below. Automatic image matching is not connected.
            </T>
            <Button
              title="Choose reference photo"
              onPress={() => void pickPhoto(false, false)}
            />
            <Button
              title="Take a photo"
              outline
              onPress={() => void pickPhoto(true, false)}
            />
            {Platform.OS !== "web" && (
              <Button
                title={showCamera ? "Close live camera" : "Open live camera"}
                outline
                onPress={() => setShowCamera(!showCamera)}
              />
            )}
            {showCamera && Platform.OS !== "web" && (
              <View style={{ height: 380 }}>
                <CameraCapture
                  onCapture={(uri) => {
                    setPhoto(uri);
                    setShowCamera(false);
                  }}
                  onClose={() => setShowCamera(false)}
                />
              </View>
            )}
            {photo && <Image source={{ uri: photo }} style={styles.hero} />}
          </Card>
        )}
        {mode.includes("seller") && (
          <Card>
            <T size={22} bold>
              {store}
            </T>
            <Button
              title={
                c.following.includes(store) ? "Unfollow store" : "Follow store"
              }
              onPress={() =>
                updateCommerce((s) => ({
                  ...s,
                  following: s.following.includes(store)
                    ? s.following.filter((x) => x !== store)
                    : [...s.following, store],
                }))
              }
            />
          </Card>
        )}
        {mode === "digital goods" && (
          <Card>
            <T>No digital goods are listed in Gulmeli Fancy Stores yet.</T>
          </Card>
        )}
        <Card>
          <Field
            label="Search products"
            value={query}
            onChangeText={setQuery}
          />
          <Row style={{ flexWrap: "wrap", gap: 8 }}>
            {categories.map((cat) => (
              <Tap
                key={cat}
                role="tab"
                selected={cat === category}
                label={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.chip,
                  cat === category && { backgroundColor: "#fff0e8" },
                ]}
              >
                <T color={cat === category ? "#f85606" : "#374151"}>{cat}</T>
              </Tap>
            ))}
          </Row>
          <Row style={{ flexWrap: "wrap", gap: 8 }}>
            {[
              "Featured",
              "Price: low to high",
              "Price: high to low",
              "Top rated",
            ].map((s) => (
              <Tap
                key={s}
                label={s}
                role="tab"
                selected={sort === s}
                onPress={() => setSort(s)}
              >
                <T bold={sort === s} color={sort === s ? "#f85606" : "#6b7280"}>
                  {s}
                </T>
              </Tap>
            ))}
          </Row>
          <T>{list.length} products</T>
        </Card>
        <Grid items={list} />
      </>
    );
  }
  if (
    live &&
    (isCheckout || isProfile || isOrders || isReviews) &&
    (!session || !customerReady)
  ) {
    content = (
      <Card>
        <T size={20} bold>
          {session ? "Loading your account..." : "Sign in to continue"}
        </T>
        <T>
          {session
            ? "Your saved details will appear shortly."
            : "Use your account to save details and place orders."}
        </T>
        {!session && (
          <Button
            title="Sign in to your account"
            onPress={() => router.push("/auth")}
          />
        )}
      </Card>
    );
  }
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <Row style={styles.header}>
        <Tap
          label="Back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
          style={{ padding: 8 }}
        >
          <T size={24}>‹</T>
        </Tap>
        <View style={{ flex: 1 }}>
          <T size={10} color="#f85606" bold>
            Gulmeli Fancy Stores
          </T>
          <T size={18} bold numberOfLines={2}>
            {title}
          </T>
        </View>
      </Row>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.body}
      >
        {notice && (
          <View accessibilityRole="alert" style={styles.notice}>
            <T>{notice}</T>
            <Tap label="Dismiss message" onPress={() => setNotice("")}>
              <T color="#f85606">Dismiss</T>
            </Tap>
          </View>
        )}
        {content}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  header: {
    backgroundColor: "#fff",
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  body: { padding: 14, gap: 14, paddingBottom: 32 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, gap: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#fff",
    minWidth: 0,
  },
  hero: {
    width: "100%",
    height: 280,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  chip: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  notice: {
    backgroundColor: "#fff0e8",
    borderLeftWidth: 3,
    borderColor: "#f85606",
    padding: 12,
    gap: 8,
  },
});
