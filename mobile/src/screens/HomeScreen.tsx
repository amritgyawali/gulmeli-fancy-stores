import { useState, useMemo } from "react";
import { FlatList, Linking, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useRouter, type Href } from "expo-router";
import { Button, Row, T, Tap } from "@/components/ui";
import { TextInput, ScrollView } from "@/components/store-ui";
import { BrandIdentity } from "@/components/BrandIdentity";
import { FontIcon } from "@/components/FontIcon";
import { ProductCard } from "@/components/ProductCard";
import { ProductVisual } from "@/components/ProductVisual";
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
import type { Product } from "@/types/shop";

export default function HomeScreen({
  previewWidth,
}: { previewWidth?: number } = {}) {
  const router = useRouter();
  const theme = useStorefrontTheme();
  const { config, feature } = useStorefront();
  const { products } = useCatalog();
  const { retryBackend } = useShop();
  const dimensions = useWindowDimensions();
  const width = previewWidth ?? dimensions.width;
  const [query, setQuery] = useState("");
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
  const sections = useMemo(
    () =>
      (layout[0]?.configured ? blocks : defaultSections)
        .filter((s) => sectionVisible(s, width < 768))
        .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)),
    [blocks, layout, width],
  );
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
  const search = (value = query) =>
    openDestination("Search results", { query: value.trim() });
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
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator
          contentContainerStyle={{ gap: 12 }}
        >
          {selectedBanners.map((b) => (
            <Tap
              key={b.id}
              label={String(b.heading || b.name || "Explore collection")}
              onPress={() => openBanner(b)}
              style={{
                width: Math.max(240, Math.min(width, 1100) - theme.spacing * 2),
                borderRadius: theme.cardRadius,
                overflow: "hidden",
                backgroundColor: theme.surface,
              }}
            >
              <Image
                source={{ uri: String(b.mobileImage || b.image) }}
                onError={() =>
                  setFailedBanners((current) => [...current, b.id])
                }
                contentFit="cover"
                accessibilityLabel={String(b.heading || b.name || "")}
                style={{ width: "100%", aspectRatio: 1.85 }}
              />
              {!!b.heading && (
                <T preserveColor size={20} bold style={{ padding: 14 }}>
                  {String(b.heading)}
                </T>
              )}
            </Tap>
          ))}
        </ScrollView>
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
            size={11}
            bold
            color={theme.onPrimary}
            style={{ letterSpacing: 2 }}
          >
            CURATED FOR EVERY DAY
          </T>
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
          {!!products[0] && (
            <View
              style={{
                position: "absolute",
                right: -30,
                bottom: -32,
                width: 125,
                height: 125,
                borderRadius: 64,
                overflow: "hidden",
                opacity: 0.16,
              }}
              pointerEvents="none"
            >
              <ProductVisual product={products[0]} />
            </View>
          )}
        </View>
      );
    } else if (type === "categories") {
      const entries = categoryList.filter(
        (c) =>
          !Array.isArray(section.categoryIds) ||
          !section.categoryIds.length ||
          section.categoryIds.includes(c.id),
      );
      content = (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
        >
          {entries.map((c, i) => (
            <Tap
              key={c.id}
              label={String(c.name)}
              onPress={() => search(String(c.name))}
              style={{
                width: 100,
                minHeight: 100,
                padding: 12,
                alignItems: "center",
                gap: 10,
                backgroundColor: theme.surface,
                borderRadius: theme.cardRadius,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              {c.image ? (
                <Image
                  source={{ uri: String(c.image) }}
                  contentFit="contain"
                  style={{ width: 36, height: 36 }}
                />
              ) : (
                <FontIcon
                  name={
                    ["shirt", "bag-shopping", "gem", "house", "headphones"][
                      i % 5
                    ]
                  }
                  size={26}
                  color={theme.primaryText}
                />
              )}
              <T preserveColor size={12} bold style={{ textAlign: "center" }}>
                {String(c.name)}
              </T>
            </Tap>
          ))}
        </ScrollView>
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
        {type !== "hero_slider" && !!section.title && (
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
            paddingTop: 20,
            gap: 20,
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
                style={{
                  width: 48,
                  height: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 16,
                }}
              >
                <FontIcon name="heart" size={20} color={theme.headerText} />
              </Tap>
            )}
            {config.header.showCart && (
              <Tap
                label="Shopping cart"
                onPress={() => router.push("/cart")}
                style={{
                  width: 48,
                  height: 48,
                  alignItems: "center",
                  justifyContent: "center",
                }}
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
                style={{
                  width: 48,
                  height: 48,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FontIcon name="user" size={18} color={theme.headerText} />
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
          {config.header.showSearch && (
            <Row
              style={{
                gap: 10,
                backgroundColor: theme.background,
                borderRadius: theme.inputRadius,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <FontIcon name="magnifying-glass" size={18} color={theme.muted} />
              <TextInput
                accessibilityLabel="Search products"
                value={query}
                onChangeText={setQuery}
                placeholder={
                  config.header.searchPlaceholder || config.text.search
                }
                onSubmitEditing={() => search()}
                returnKeyType="search"
                style={{ flex: 1, fontSize: 15, minHeight: 52 }}
              />
              <Tap
                label="Search"
                onPress={() => search()}
                style={{
                  width: 48,
                  height: 48,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FontIcon
                  name="arrow-right"
                  color={theme.primaryText}
                  size={17}
                />
              </Tap>
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
