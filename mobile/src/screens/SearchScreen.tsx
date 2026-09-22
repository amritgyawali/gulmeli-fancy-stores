import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  TextInput as NativeTextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { FadeIn, FadeInDown, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCatalog } from "@/store/ShopProvider";
import { useStorefront, useStorefrontTheme } from "@/store/StorefrontProvider";
import { Row, T } from "@/components/ui";
import { TextInput } from "@/components/store-ui";
import { FontIcon, type FontIconName } from "@/components/FontIcon";
import { ProductCard, discountPercent } from "@/components/ProductCard";
import { PressableScale, haptic } from "@/components/motion";
import { openDestination } from "@/services/navigation";
import type { Product } from "@/types/shop";

/*
 * Search, as its own screen.
 *
 * Search used to be a text field inside a card on the generic feature
 * screen, beside six hardcoded category buttons ("Fashion", "Electronics"…)
 * that did not come from the catalogue, four sort words and a plain count,
 * with results in a non-virtualised grid under all of it.
 *
 * Now it behaves like the search in a marketplace app:
 *
 * - The field is at the top and focused when there is nothing to show yet.
 * - Before typing: recent searches (kept on this device, clearable) and the
 *   store's most-shopped categories.
 * - Results in a virtualised grid, with quick filters as chips (category,
 *   on sale, in stock, rating) and sorting in a bottom sheet.
 * - Matching is word-based: every word must appear somewhere in the name,
 *   category, brand or seller, in any order, and name matches rank first.
 */

type SortKey = "best" | "popular" | "price-asc" | "price-desc" | "discount" | "rating";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "best", label: "Best match" },
  { key: "popular", label: "Most popular" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
  { key: "discount", label: "Biggest discount" },
  { key: "rating", label: "Top rated" },
];

const RECENT_KEY = "gulmeli:recent-searches:v1";
const ratingOf = (p: Product) => Number.parseFloat(p.rating ?? "") || 0;
const fold = (s: unknown) => String(s ?? "").toLowerCase();

export function searchProducts(products: Product[], query: string) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return products;
  const scored: { p: Product; score: number }[] = [];
  for (const p of products) {
    const name = fold(p.name);
    const rest = `${fold(p.category)} ${fold(p.brand)} ${fold(p.store)}`;
    let score = 0;
    let all = true;
    for (const w of words) {
      if (name.includes(w)) score += name.startsWith(w) || name.includes(` ${w}`) ? 3 : 2;
      else if (rest.includes(w)) score += 1;
      else {
        all = false;
        break;
      }
    }
    if (all) scored.push({ p, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.p);
}

export default function SearchScreen() {
  const params = useLocalSearchParams<{ query?: string; category?: string }>();
  const router = useRouter();
  const theme = useStorefrontTheme();
  const { config } = useStorefront();
  const { products } = useCatalog();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const input = useRef<NativeTextInput>(null);

  const [draft, setDraft] = useState(params.query ?? "");
  const [query, setQuery] = useState(params.query ?? "");
  const [category, setCategory] = useState<string | null>(
    params.category && params.category !== "All" ? params.category : null,
  );
  const [onSale, setOnSale] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [topRated, setTopRated] = useState(false);
  const [sort, setSort] = useState<SortKey>("best");
  const [sortOpen, setSortOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(RECENT_KEY)
      .then((raw) => {
        const list = JSON.parse(raw ?? "[]");
        if (Array.isArray(list)) setRecent(list.filter((x) => typeof x === "string").slice(0, 8));
      })
      .catch(() => undefined);
  }, []);

  const remember = (term: string) =>
    setRecent((current) => {
      const next = [term, ...current.filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(
        0,
        8,
      );
      void AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });

  const submit = (term = draft) => {
    const t = term.trim();
    setDraft(t);
    setQuery(t);
    if (t) remember(t);
    Keyboard.dismiss();
  };

  /* Categories from the catalogue, most stocked first. */
  const categories = useMemo(() => {
    const counted = new Map<string, number>();
    for (const p of products) counted.set(p.category, (counted.get(p.category) ?? 0) + 1);
    return [...counted.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [products]);

  const matched = useMemo(() => searchProducts(products, query), [products, query]);

  const results = useMemo(() => {
    let list = matched;
    if (category) list = list.filter((p) => p.category === category);
    if (onSale) list = list.filter((p) => discountPercent(p) > 0);
    if (inStock) list = list.filter((p) => p.stock > 0);
    if (topRated) list = list.filter((p) => ratingOf(p) >= 4);
    const sorted = [...list];
    if (sort === "popular") sorted.sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0));
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    if (sort === "discount") sorted.sort((a, b) => discountPercent(b) - discountPercent(a));
    if (sort === "rating") sorted.sort((a, b) => ratingOf(b) - ratingOf(a));
    /* "Best match" with no words typed means most popular. */
    if (sort === "best" && !query) sorted.sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0));
    return sorted.sort((a, b) => Number(a.stock < 1) - Number(b.stock < 1));
  }, [matched, category, onSale, inStock, topRated, sort, query]);

  const columns = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const showSuggestions = focused && !draft.trim() && !query;
  const activeFilters = [category, onSale, inStock, topRated].filter(Boolean).length;

  const chip = (label: string, active: boolean, onPress: () => void, icon?: FontIconName) => (
    <PressableScale
      key={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      scaleTo={0.94}
      onPress={() => {
        void haptic("selection");
        onPress();
      }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        minHeight: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: active ? theme.text : theme.border,
        backgroundColor: active ? theme.text : theme.surface,
      }}
    >
      {icon && <FontIcon name={icon} size={11} color={active ? theme.surface : theme.text} />}
      <T preserveColor size={13} bold={active} color={active ? theme.surface : theme.text}>
        {label}
      </T>
    </PressableScale>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Search bar */}
      <Row
        style={{
          gap: 8,
          paddingHorizontal: 10,
          paddingVertical: 8,
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={6}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
        >
          <FontIcon name="arrow-left" size={18} color={theme.text} />
        </PressableScale>
        <Row
          style={{
            flex: 1,
            gap: 8,
            paddingLeft: 12,
            borderRadius: 22,
            backgroundColor: theme.background,
            borderWidth: 1.5,
            borderColor: focused ? theme.primary : "transparent",
          }}
        >
          <FontIcon name="magnifying-glass" size={15} color={theme.muted} />
          <TextInput
            ref={input}
            accessibilityLabel="Search products"
            value={draft}
            onChangeText={setDraft}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoFocus={!params.query && !params.category}
            placeholder={config.header.searchPlaceholder || "Search products"}
            returnKeyType="search"
            onSubmitEditing={() => submit()}
            style={{ flex: 1, fontSize: 15, minHeight: 44 }}
          />
          {!!draft && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={8}
              onPress={() => {
                setDraft("");
                setQuery("");
                input.current?.focus();
              }}
              style={{ width: 36, height: 40, alignItems: "center", justifyContent: "center" }}
            >
              <FontIcon name="circle-xmark" solid size={16} color={theme.muted} />
            </Pressable>
          )}
        </Row>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Search"
          onPress={() => submit()}
          style={{
            paddingHorizontal: 14,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.buttonColor,
          }}
        >
          <T preserveColor bold size={14} color={theme.buttonTextColor}>
            Search
          </T>
        </PressableScale>
      </Row>

      {showSuggestions ? (
        <Animated.ScrollView
          entering={FadeIn.duration(160)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, gap: 22 }}
        >
          {recent.length > 0 && (
            <View style={{ gap: 10 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <T preserveColor size={15} bold>
                  Recent searches
                </T>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setRecent([]);
                    void AsyncStorage.removeItem(RECENT_KEY).catch(() => undefined);
                  }}
                  hitSlop={8}
                >
                  <T preserveColor size={13} color={theme.muted}>
                    Clear
                  </T>
                </Pressable>
              </Row>
              <Row style={{ flexWrap: "wrap", gap: 8 }}>
                {recent.map((t) =>
                  chip(t, false, () => submit(t), "clock-rotate-left"),
                )}
              </Row>
            </View>
          )}
          <View style={{ gap: 10 }}>
            <T preserveColor size={15} bold>
              Popular categories
            </T>
            <Row style={{ flexWrap: "wrap", gap: 8 }}>
              {categories.slice(0, 10).map((c) =>
                chip(c, false, () => {
                  setCategory(c);
                  setQuery("");
                  Keyboard.dismiss();
                }),
              )}
            </Row>
          </View>
        </Animated.ScrollView>
      ) : (
        <FlatList
          key={columns}
          data={results}
          numColumns={columns}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={8}
          windowSize={7}
          columnWrapperStyle={{ gap: 10, paddingHorizontal: 12 }}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 + insets.bottom }}
          ListHeaderComponent={
            <View style={{ gap: 10, paddingTop: 10 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}
              >
                {chip(
                  SORTS.find((s) => s.key === sort)!.label,
                  sort !== "best",
                  () => setSortOpen(true),
                  "arrow-down-wide-short",
                )}
                {chip("On sale", onSale, () => setOnSale((v) => !v), "tag")}
                {chip("In stock", inStock, () => setInStock((v) => !v))}
                {chip("4★ & up", topRated, () => setTopRated((v) => !v))}
              </ScrollView>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}
              >
                {chip("All", !category, () => setCategory(null))}
                {categories.map((c) =>
                  chip(c, category === c, () => setCategory(category === c ? null : c)),
                )}
              </ScrollView>
              <Row style={{ justifyContent: "space-between", paddingHorizontal: 16 }}>
                <T preserveColor size={13} color={theme.muted} accessibilityLiveRegion="polite">
                  {query ? `“${query}” · ` : ""}
                  {results.length} {results.length === 1 ? "product" : "products"}
                </T>
                {activeFilters > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => {
                      setCategory(null);
                      setOnSale(false);
                      setInStock(false);
                      setTopRated(false);
                    }}
                  >
                    <T preserveColor size={13} bold color={theme.primaryText}>
                      Clear filters
                    </T>
                  </Pressable>
                )}
              </Row>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={index < 8 ? FadeInDown.delay(index * 40).duration(260) : undefined}
              style={{ flex: 1 / columns }}
            >
              <ProductCard product={item} />
            </Animated.View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", padding: 32, gap: 10 }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.surface,
                }}
              >
                <FontIcon name="magnifying-glass" size={26} color={theme.muted} />
              </View>
              <T preserveColor size={17} bold>
                No products found
              </T>
              <T preserveColor size={14} color={theme.muted} style={{ textAlign: "center" }}>
                {activeFilters
                  ? "No product matches every filter. Try removing one."
                  : "Check the spelling, or try a shorter or more general word."}
              </T>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Browse all products"
                onPress={() => {
                  setDraft("");
                  setQuery("");
                  setCategory(null);
                  setOnSale(false);
                  setInStock(false);
                  setTopRated(false);
                }}
                style={{
                  marginTop: 6,
                  paddingHorizontal: 20,
                  minHeight: 44,
                  justifyContent: "center",
                  borderRadius: 22,
                  backgroundColor: theme.buttonColor,
                }}
              >
                <T preserveColor bold color={theme.buttonTextColor}>
                  Browse all products
                </T>
              </PressableScale>
              <Pressable
                accessibilityRole="button"
                onPress={() => openDestination("Visual search")}
                hitSlop={8}
                style={{ marginTop: 4 }}
              >
                <T preserveColor size={13} color={theme.primaryText} bold>
                  Search with a photo instead
                </T>
              </Pressable>
            </View>
          }
        />
      )}

      {/* Sort sheet */}
      <Modal
        visible={sortOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSortOpen(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close sort options"
          onPress={() => setSortOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
        />
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 12),
          }}
        >
          <View
            style={{
              alignSelf: "center",
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.border,
              marginBottom: 8,
            }}
          />
          <T preserveColor size={16} bold style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
            Sort by
          </T>
          {SORTS.map((s) => (
            <Pressable
              key={s.key}
              accessibilityRole="radio"
              accessibilityState={{ checked: sort === s.key }}
              onPress={() => {
                void haptic("selection");
                setSort(s.key);
                setSortOpen(false);
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                minHeight: 52,
                backgroundColor: pressed ? theme.background : "transparent",
              })}
            >
              <T preserveColor size={15} bold={sort === s.key}>
                {s.label}
              </T>
              {sort === s.key && <FontIcon name="check" size={15} color={theme.primaryText} />}
            </Pressable>
          ))}
        </Animated.View>
      </Modal>
    </View>
  );
}
