import { useState, useMemo } from "react";
import { FlatList, Linking, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useRouter, type Href } from "expo-router";
import { Button, Row, T, Tap } from "@/components/ui";
import { ScrollView } from "@/components/store-ui";
import { BrandIdentity } from "@/components/BrandIdentity";
import { FontIcon } from "@/components/FontIcon";
import { ProductCard, ProductCardSkeleton, discountPercent } from "@/components/ProductCard";
import { HeroCarousel } from "@/components/HeroCarousel";
import { Countdown, DealCard } from "@/components/Deals";
import { PressableScale } from "@/components/motion";
import { sizedImage, productImage } from "@/services/product-media";
import { useCatalog, useShop } from "@/store/ShopProvider";
import { useStorefront, useStorefrontTheme } from "@/store/StorefrontProvider";
import {
  usePublicContent,
  refreshPublicContent,
} from "@/services/public-content";
import { openDestination } from "@/services/navigation";
import {
  defaultSections,
  sectionVisible,
  safeStoreLink,
  plainText,
  type ContentRecord,
} from "@/admin/core/storefront-content";
import { hexColor, readableColor } from "@/admin/core/appearance";
import { TOUCH_SIZE } from "@/theme/tokens";
import type { Product } from "@/types/shop";

/*
 * Pick a category icon from the category name rather than its position in the
 * list. The previous version indexed a five-icon array by array position, so
 * "Groceries" was a shirt on one screen and a gem on the next as soon as the
 * sort order changed, and the sixth category onwards repeated the first five.
 */
/* One shape for every header action, so the wishlist, bag and account
   controls line up instead of one carrying a border the others lack. */
const headerAction = {
  width: TOUCH_SIZE,
  height: TOUCH_SIZE,
  alignItems: "center",
  justifyContent: "center",
} as const;

const CATEGORY_ICONS: [RegExp, string][] = [
  [/cloth|fashion|wear|shirt|dress|apparel/i, "shirt"],
  [/shoe|footwear|sandal|sneaker/i, "shoe-prints"],
  [/watch|jewel|gem|ring|ornament/i, "gem"],
  [/phone|mobile|electronic|laptop|computer|gadget/i, "mobile-screen"],
  [/audio|headphone|speaker|music/i, "headphones"],
  [/home|furniture|kitchen|decor|lifestyle/i, "house"],
  [/beauty|cosmetic|care|health/i, "spray-can-sparkles"],
  [/grocer|food|snack|drink|pantry/i, "basket-shopping"],
  [/baby|toy|kid|child/i, "baby-carriage"],
  [/sport|outdoor|fitness|gym/i, "dumbbell"],
  [/book|stationery|paper/i, "book"],
  [/auto|bike|motor|car/i, "car"],
];
function categoryIcon(name: string) {
  return CATEGORY_ICONS.find(([pattern]) => pattern.test(name))?.[1] ?? "tag";
}

export default function HomeScreen({
  previewWidth,
}: { previewWidth?: number } = {}) {
  const router = useRouter();
  const theme = useStorefrontTheme();
  const { config, feature } = useStorefront();
  const { products, productById } = useCatalog();
  const { retryBackend, state, catalogReady, live } = useShop();
  const dimensions = useWindowDimensions();
  const width = previewWidth ?? dimensions.width;
  const [failedBanners, setFailedBanners] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const blocks = usePublicContent("homepage_sections"),
    layout = usePublicContent("homepage_config"),
    banners = usePublicContent("banners"),
    categories = usePublicContent("categories"),
    collections = usePublicContent("collections"),
    brands = usePublicContent("brands"),
    posts = usePublicContent("blog_posts"),
    menus = usePublicContent("menu_items"),
    pages = usePublicContent("pages");
  const socialLinks = config.social.enabled
    .map((key) => ({
      key,
      url: config.social[key as keyof typeof config.social],
    }))
    .filter((item) => safeStoreLink(item.url));
  const footerBackground = hexColor(
      config.footer.backgroundColor,
      theme.surface,
    ),
    footerText = readableColor(footerBackground, config.footer.textColor);
  /*
   * Sections come from the homepage builder when it has been configured. The
   * built-in layout (hero, categories, product grid) gains two sections every
   * marketplace home carries, both computed rather than authored: today's
   * flash deals, when anything is discounted, and the customer's recently
   * viewed products. Recently viewed is personal, not content, so it is
   * added after the categories either way.
   */
  const sections = useMemo(() => {
    const configured = !!layout[0]?.configured;
    const base = (configured ? blocks : defaultSections)
      .filter((s) => sectionVisible(s, width < 768))
      .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
    const out: ContentRecord[] = [];
    for (const s of base) {
      out.push(s);
      if (s.type === "categories") {
        if (!configured)
          out.push({ id: "auto-flash", type: "flash_sale", title: "Flash deals", layout: "deals" });
        out.push({ id: "auto-recent", type: "recently_viewed", title: "Continue browsing" });
      }
    }
    return out;
  }, [blocks, layout, width]);
  const recentlyViewed = state.commerce.recent
    .map((id) => productById[id])
    .filter((p): p is Product => Boolean(p))
    .slice(0, 12);
  const loadingCatalog = live && !catalogReady && products.length === 0;
  const columns = Math.max(
    1,
    Math.min(
      width < 600 ? 2 : 4,
      Math.round(
        width < 768
          ? config.catalog.gridColumnsMobile
          : config.catalog.gridColumnsDesktop,
      ) || 2,
    ),
  );
  const search = (value = "") =>
    openDestination("Search results", value.trim() ? { query: value.trim() } : {});
  const follow = (target: unknown) => {
    const link = safeStoreLink(target);
    if (link?.startsWith("https://")) void Linking.openURL(link);
    else if (link?.startsWith("/product/"))
      openDestination("Product details", {
        id: decodeURIComponent(link.slice(9)),
      });
    else if (link?.startsWith("/search"))
      search(new URL(link, "https://store.local").searchParams.get("q") || "");
    else if (link) router.push(link as Href);
  };
  const openBanner = (b: ContentRecord) =>
    b.productId
      ? openDestination("Product details", { id: String(b.productId) })
      : b.categoryId
        ? search(
            String(categories.find((c) => c.id === b.categoryId)?.name ?? ""),
          )
        : follow(b.ctaLink);
  const categoryList = categories.length
    ? categories
    : [...new Set(products.map((p) => p.category))].map(
        (name) => ({ id: name, name }) as ContentRecord,
      );
  function productList(section: ContentRecord) {
    let list = [...products];
    const ids = Array.isArray(section.productIds) ? section.productIds : [];
    if (ids.length) list = list.filter((p) => ids.includes(p.id));
    const selected = collections.find((c) => c.id === section.collectionId);
    if (selected && Array.isArray(selected.productIds))
      list = list.filter((p) =>
        (selected.productIds as unknown[]).includes(p.id),
      );
    if (section.type === "new_arrivals")
      list.sort(
        (a, b) =>
          (Date.parse(b.createdAt ?? "") || 0) -
          (Date.parse(a.createdAt ?? "") || 0),
      );
    if (section.type === "best_sellers")
      list.sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0));
    if (section.type === "flash_sale")
      list = list.filter((p) => (p.originalPrice ?? 0) > p.price);
    if (config.catalog.defaultSort === "price_asc")
      list.sort((a, b) => a.price - b.price);
    if (config.catalog.defaultSort === "price_desc")
      list.sort((a, b) => b.price - a.price);
    return list.slice(
      0,
      Math.max(
        1,
        Math.min(
          100,
          Number(section.itemLimit) || config.catalog.productsPerPage,
        ),
      ),
    );
  }
  const cardGrid = (list: Product[], section: ContentRecord) =>
    section.layout === "carousel" ? (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
      >
        {list.map((p) => (
          <View key={p.id} style={{ width: Math.min(220, width * 0.55) }}>
            <ProductCard product={p} />
          </View>
        ))}
      </ScrollView>
    ) : (
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          marginHorizontal: -6,
          rowGap: 12,
        }}
      >
        {list.map((p) => (
          <View
            key={p.id}
            style={{
              width: `${100 / (section.layout === "list" ? 1 : columns)}%`,
              paddingHorizontal: 6,
            }}
          >
            <ProductCard product={p} />
          </View>
        ))}
      </View>
    );
  function renderSection(section: ContentRecord) {
    const type = String(section.type);
    if (type === "newsletter" && !safeStoreLink(section.ctaLink)) return null;
    if (type === "flash_sale" && !feature("flashSales")) return null;
    const selectedBanners = banners
      .filter(
        (b) => !failedBanners.includes(b.id) && !!(b.mobileImage || b.image),
      )
      .filter(
        (b) =>
          !Array.isArray(section.bannerIds) ||
          !section.bannerIds.length ||
          section.bannerIds.includes(b.id),
      );
    const photo = selectedBanners[0];
    let content;
    if (type === "hero_slider") {
      content = photo ? (
        <HeroCarousel
          banners={selectedBanners}
          width={Math.max(240, Math.min(width, 1100) - theme.spacing * 2)}
          radius={theme.cardRadius}
          color={theme.primary}
          onOpen={openBanner}
          onFailed={(id) => setFailedBanners((current) => [...current, id])}
        />
      ) : (
        <View
          style={{
            backgroundColor: theme.primary,
            borderRadius: theme.cardRadius + 6,
            padding: 22,
            gap: 18,
            overflow: "hidden",
          }}
        >
          <T
            preserveColor
            accessibilityRole="header"
            size={29}
            bold
            color={theme.onPrimary}
            style={{ letterSpacing: -1, maxWidth: 360 }}
          >
            {String(section.title || config.text.homeHeading)}
          </T>
          <T preserveColor size={14} color={theme.onPrimary}>
            {String(
              section.subtitle ||
                config.text.homeSubheading ||
                config.branding.tagline,
            )}
          </T>
          <Button
            title={String(section.ctaLabel || "Explore the store")}
            onPress={() =>
              section.ctaLink ? follow(section.ctaLink) : search("")
            }
            color={theme.surface}
            textStyle={{ color: theme.text }}
            style={{ alignSelf: "flex-start" }}
          />
        </View>
      );
    } else if (type === "categories") {
      const entries = categoryList.filter(
        (c) =>
          !Array.isArray(section.categoryIds) ||
          !section.categoryIds.length ||
          section.categoryIds.includes(c.id),
      );
      /* Round photo or icon over a label, the category row shoppers know
         from every marketplace app. A category without its own image
         borrows its best-selling product's photo. */
      const leadPhoto = (name: string) => {
        const lead = products
          .filter((p) => p.category === name)
          .sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0))[0];
        return lead ? productImage(lead, 128) : null;
      };
      content = (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 14, paddingRight: 8 }}
        >
          {entries.map((c) => {
            const image = c.image ? sizedImage(String(c.image), 128) : leadPhoto(String(c.name));
            return (
              <PressableScale
                key={c.id}
                accessibilityRole="button"
                accessibilityLabel={String(c.name)}
                scaleTo={0.92}
                onPress={() => openDestination("Search results", { category: String(c.name) })}
                style={{ width: 72, alignItems: "center", gap: 7 }}
              >
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.surface,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  {image ? (
                    // Category images are wide product photos, not square
                    // icons; cropping to a circle fills the tile the way the
                    // web storefront does.
                    <Image
                      source={{ uri: image }}
                      contentFit="cover"
                      transition={200}
                      accessibilityLabel=""
                      style={{ width: 64, height: 64 }}
                    />
                  ) : (
                    <FontIcon
                      name={categoryIcon(String(c.name))}
                      size={24}
                      color={theme.primaryText}
                    />
                  )}
                </View>
                <T
                  preserveColor
                  size={12}
                  numberOfLines={2}
                  style={{ textAlign: "center", lineHeight: 15 }}
                >
                  {String(c.name)}
                </T>
              </PressableScale>
            );
          })}
        </ScrollView>
      );
    } else if (type === "recently_viewed") {
      if (!recentlyViewed.length) return null;
      content = (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
        >
          {recentlyViewed.map((p) => (
            <DealCard key={p.id} product={p} width={120} />
          ))}
        </ScrollView>
      );
    } else if (type === "flash_sale" && section.layout === "deals") {
      const deals = products
        .filter((p) => discountPercent(p) > 0 && p.stock > 0)
        .sort((a, b) => discountPercent(b) - discountPercent(a))
        .slice(0, 12);
      if (!deals.length) return null;
      content = (
        <View
          style={{
            backgroundColor: theme.surface,
            borderRadius: theme.cardRadius + 4,
            paddingVertical: 14,
            gap: 12,
            borderWidth: 1,
            borderColor: `${theme.primary}33`,
          }}
        >
          <Row style={{ paddingHorizontal: 14, gap: 10, justifyContent: "space-between" }}>
            <Row style={{ gap: 8, flexShrink: 1 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.primary,
                }}
              >
                <FontIcon name="bolt" size={13} color={theme.onPrimary} />
              </View>
              <T preserveColor accessibilityRole="header" bold size={18}>
                {String(section.title || "Flash deals")}
              </T>
            </Row>
            <Countdown />
          </Row>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingHorizontal: 14 }}
          >
            {deals.map((p) => (
              <DealCard key={p.id} product={p} />
            ))}
          </ScrollView>
          <Tap
            label="See all deals"
            onPress={() => router.push("/offers")}
            style={{ alignSelf: "center", minHeight: 36, justifyContent: "center" }}
          >
            <Row style={{ gap: 6 }}>
              <T preserveColor bold color={theme.primaryText}>
                See all deals
              </T>
              <FontIcon name="chevron-right" size={11} color={theme.primaryText} />
            </Row>
          </Tap>
        </View>
      );
    } else if (
      [
        "featured_products",
        "best_sellers",
        "new_arrivals",
        "flash_sale",
        "collection",
      ].includes(type)
    ) {
      const items = productList(section);
      content = items.length ? (
        cardGrid(items, section)
      ) : loadingCatalog ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6, rowGap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={{ width: `${100 / columns}%`, paddingHorizontal: 6 }}>
              <ProductCardSkeleton />
            </View>
          ))}
        </View>
      ) : (
        <T preserveColor color={theme.muted}>
          New finds are on their way. Check back soon.
        </T>
      );
    } else if (["banner", "promo_banner", "gallery"].includes(type)) {
      content = (
        <View style={{ gap: 12 }}>
          {selectedBanners.map((b) => (
            <Tap
              key={b.id}
              label={String(b.heading || b.name || "Explore")}
              onPress={() => openBanner(b)}
            >
              <Image
                source={{ uri: String(b.mobileImage || b.image) }}
                style={{
                  width: "100%",
                  aspectRatio: 1.8,
                  borderRadius: theme.cardRadius,
                }}
                contentFit="cover"
                accessibilityLabel={String(b.heading || b.name || "")}
              />
            </Tap>
          ))}
        </View>
      );
    } else if (type === "brands") {
      content = (
        <ScrollView horizontal contentContainerStyle={{ gap: 12 }}>
          {brands.map((brand) => (
            <View
              key={brand.id}
              style={{
                width: 150,
                padding: 16,
                gap: 12,
                backgroundColor: theme.surface,
                borderRadius: theme.cardRadius,
              }}
            >
              {!!brand.logo && (
                <Image
                  source={{ uri: String(brand.logo) }}
                  contentFit="contain"
                  style={{ height: 60, width: "100%" }}
                />
              )}
              <T preserveColor bold>
                {String(brand.name)}
              </T>
              <T preserveColor color={theme.muted}>
                {plainText(brand.description)}
              </T>
            </View>
          ))}
        </ScrollView>
      );
    } else if (type === "blog") {
      content = (
        <View style={{ gap: 16 }}>
          {posts.slice(0, Number(section.itemLimit) || 4).map((post) => (
            <View
              key={post.id}
              style={{
                padding: 18,
                gap: 12,
                backgroundColor: theme.surface,
                borderRadius: theme.cardRadius,
              }}
            >
              {!!post.featuredImage && (
                <Image
                  source={{ uri: String(post.featuredImage) }}
                  contentFit="cover"
                  style={{
                    width: "100%",
                    aspectRatio: 1.8,
                    borderRadius: theme.inputRadius,
                  }}
                />
              )}
              <T preserveColor size={18} bold>
                {String(post.title)}
              </T>
              <T preserveColor size={14}>
                {plainText(post.body || post.content || post.description)}
              </T>
            </View>
          ))}
        </View>
      );
    } else if (type === "social") {
      content = (
        <View style={{ gap: 8 }}>
          {socialLinks.map((item) => (
            <Button
              key={item.key}
              title={`Follow us on ${item.key}`}
              outline
              onPress={() => follow(item.url)}
            />
          ))}
        </View>
      );
    } else {
      content = (
        <View style={{ gap: 12 }}>
          <T preserveColor size={15}>
            {plainText(section.body || section.html || section.subtitle)}
          </T>
          {type === "video" && safeStoreLink(section.videoUrl) && (
            <Button
              title="Watch video"
              onPress={() => follow(section.videoUrl)}
            />
          )}{" "}
          {!!section.ctaLabel && safeStoreLink(section.ctaLink) && (
            <Button
              title={String(section.ctaLabel)}
              onPress={() => follow(section.ctaLink)}
            />
          )}
        </View>
      );
    }
    return (
      <View
        testID={`home-section-${section.id}`}
        style={{
          paddingHorizontal: theme.spacing,
          paddingVertical: 14,
          gap: 14,
          backgroundColor: section.backgroundColor
            ? String(section.backgroundColor)
            : undefined,
        }}
      >
        {type !== "hero_slider" && section.layout !== "deals" && !!section.title && (
          <Row style={{ justifyContent: "space-between", gap: 12 }}>
            <T
              preserveColor
              accessibilityRole="header"
              bold
              size={21}
              style={{ letterSpacing: -0.5, flex: 1 }}
            >
              {String(section.title)}
            </T>
            {!!section.ctaLabel && safeStoreLink(section.ctaLink) && (
              <Tap
                label={String(section.ctaLabel)}
                onPress={() => follow(section.ctaLink)}
                style={{ minHeight: 48, justifyContent: "center" }}
              >
                <T preserveColor color={theme.primaryText} bold>
                  {String(section.ctaLabel)}
                </T>
              </Tap>
            )}
          </Row>
        )}
        {type !== "hero_slider" && !!section.subtitle && (
          <T preserveColor size={14} color={theme.muted}>
            {String(section.subtitle)}
          </T>
        )}
        {content}
      </View>
    );
  }
  return (
    <FlatList
      data={sections}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => renderSection(item)}
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void Promise.all([retryBackend(), refreshPublicContent()]).finally(() =>
          setRefreshing(false),
        );
      }}
      stickyHeaderIndices={config.header.sticky ? [0] : undefined}
      ListHeaderComponent={
        <View
          style={{
            padding: theme.spacing,
            gap: 14,
            backgroundColor: theme.headerBackground,
          }}
        >
          <Row style={{ gap: 8 }}>
            {config.header.showLogo ? (
              <BrandIdentity color={theme.headerText} />
            ) : (
              <View style={{ flex: 1 }} />
            )}
            {config.header.showWishlist && feature("wishlist") && (
              <Tap
                label="Wishlist"
                onPress={() => openDestination("Wishlist")}
                style={headerAction}
              >
                <FontIcon name="heart" size={20} color={theme.headerText} />
              </Tap>
            )}
            {config.header.showCart && (
              <Tap
                label="Shopping cart"
                onPress={() => router.push("/cart")}
                style={headerAction}
              >
                <FontIcon
                  name="bag-shopping"
                  size={20}
                  color={theme.headerText}
                />
              </Tap>
            )}
            {config.header.showProfile && (
              <Tap
                label="Your account"
                onPress={() => router.push("/account")}
                style={headerAction}
              >
                <FontIcon name="user" size={20} color={theme.headerText} />
              </Tap>
            )}
          </Row>
          {config.header.showContactNumber && !!config.contact.phone && (
            <Tap
              label="Call the store"
              onPress={() =>
                void Linking.openURL(`tel:${config.contact.phone}`)
              }
              style={{ minHeight: 48, justifyContent: "center" }}
            >
              <T preserveColor color={theme.headerText}>
                {config.contact.phone}
              </T>
            </Tap>
          )}
          {config.header.showSocialIcons && (
            <Row style={{ gap: 12, flexWrap: "wrap" }}>
              {socialLinks.map((item) => (
                <Tap
                  key={item.key}
                  label={item.key}
                  onPress={() => follow(item.url)}
                  style={{ minHeight: 48, justifyContent: "center" }}
                >
                  <T preserveColor color={theme.headerText}>
                    {item.key}
                  </T>
                </Tap>
              ))}
            </Row>
          )}
          {/* The search field opens the search screen, where recent
              searches and categories are waiting, rather than taking typing
              here — the pattern every marketplace app uses. The camera opens
              photo search. */}
          {config.header.showSearch && (
            <Row style={{ gap: 8 }}>
              <PressableScale
                accessibilityRole="search"
                accessibilityLabel="Search products"
                scaleTo={0.985}
                onPress={() => search()}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  minHeight: 46,
                  paddingHorizontal: 14,
                  backgroundColor: theme.surface,
                  borderRadius: 23,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <FontIcon name="magnifying-glass" size={16} color={theme.muted} />
                <T preserveColor size={15} color={theme.muted} numberOfLines={1} style={{ flex: 1 }}>
                  {config.header.searchPlaceholder || config.text.search}
                </T>
                <Tap
                  label="Search with a photo"
                  onPress={() => openDestination("Visual search")}
                  style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
                >
                  <FontIcon name="camera" size={16} color={theme.text} />
                </Tap>
              </PressableScale>
            </Row>
          )}
        </View>
      }
      ListFooterComponent={
        config.footer.enabled ? (
          <View
            style={{
              padding: 24,
              marginTop: 12,
              gap: 10,
              backgroundColor: footerBackground,
            }}
          >
            <BrandIdentity compact footer color={footerText} />
            {config.footer.showQuickLinks &&
              menus
                .filter((menu) => menu.menu === "footer")
                .map(
                  (menu) =>
                    safeStoreLink(menu.url) && (
                      <Tap
                        key={menu.id}
                        label={String(menu.label || menu.title || menu.name)}
                        onPress={() => follow(menu.url)}
                        style={{ minHeight: 48, justifyContent: "center" }}
                      >
                        <T preserveColor color={footerText}>
                          {String(menu.label || menu.title || menu.name)}
                        </T>
                      </Tap>
                    ),
                )}
            {config.footer.showPolicies &&
              pages.map((page) => (
                <View key={page.id} style={{ gap: 6, paddingVertical: 8 }}>
                  <T preserveColor color={footerText} bold>
                    {String(page.title || page.name)}
                  </T>
                  <T preserveColor color={footerText}>
                    {plainText(page.body || page.content)}
                  </T>
                </View>
              ))}
            {config.footer.showSocial &&
              socialLinks.map((item) => (
                <Tap
                  key={item.key}
                  label={`Follow on ${item.key}`}
                  onPress={() => follow(item.url)}
                  style={{ minHeight: 48, justifyContent: "center" }}
                >
                  <T preserveColor color={footerText}>
                    {item.key}
                  </T>
                </Tap>
              ))}
            {!!config.footer.aboutText && (
              <T preserveColor color={footerText}>
                {config.footer.aboutText}
              </T>
            )}
            {!!config.contact.supportEmail && (
              <T preserveColor color={footerText}>
                {config.contact.supportEmail}
              </T>
            )}
            <T preserveColor size={11} color={footerText}>
              {config.footer.copyright
                .replace("{year}", String(new Date().getFullYear()))
                .replace("{company}", config.branding.companyName)}
            </T>
          </View>
        ) : null
      }
    />
  );
}
