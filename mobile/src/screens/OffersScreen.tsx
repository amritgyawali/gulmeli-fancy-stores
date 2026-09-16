import { useMemo, useState } from "react";
import { FlatList, View, useWindowDimensions } from "react-native";
import { Row, T, Tap } from "@/components/ui";
import { ProductCard } from "@/components/ProductCard";
import { useCatalog } from "@/store/ShopProvider";
import { useStorefront, useStorefrontTheme } from "@/store/StorefrontProvider";
export default function OffersScreen() {
  const { products } = useCatalog();
  const { config } = useStorefront();
  const theme = useStorefrontTheme();
  const { width } = useWindowDimensions();
  const [sort, setSort] = useState("discount");
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
  const offers = useMemo(
    () =>
      products
        .filter((p) => (p.originalPrice ?? 0) > p.price)
        .sort((a, b) =>
          sort === "price"
            ? a.price - b.price
            : 1 -
              b.price / (b.originalPrice || b.price) -
              (1 - a.price / (a.originalPrice || a.price)),
        ),
    [products, sort],
  );
  return (
    <FlatList
      key={columns}
      data={offers}
      numColumns={columns}
      keyExtractor={(p) => p.id}
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ padding: theme.spacing, paddingBottom: 32 }}
      columnWrapperStyle={columns > 1 ? { gap: 12 } : undefined}
      renderItem={({ item }) => (
        <View style={{ flex: 1 / columns, marginBottom: 12 }}>
          <ProductCard product={item} />
        </View>
      )}
      ListHeaderComponent={
        <View style={{ gap: 12, paddingBottom: 22 }}>
          <T preserveColor accessibilityRole="header" bold size={28}>
            {config.text.offersHeading || "Good finds. Better prices."}
          </T>
          <T preserveColor color={theme.muted} size={15}>
            Explore current reductions from our catalogue.
          </T>
          <Row style={{ gap: 10 }}>
            {[
              { id: "discount", label: "Biggest savings" },
              { id: "price", label: "Lowest price" },
            ].map((option) => (
              <Tap
                key={option.id}
                label={option.label}
                selected={sort === option.id}
                role="tab"
                onPress={() => setSort(option.id)}
                style={{
                  minHeight: 48,
                  paddingHorizontal: 16,
                  justifyContent: "center",
                  borderRadius: theme.buttonRadius,
                  backgroundColor:
                    sort === option.id ? theme.primary : theme.surface,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <T
                  preserveColor
                  bold
                  color={sort === option.id ? theme.onPrimary : theme.text}
                >
                  {option.label}
                </T>
              </Tap>
            ))}
          </Row>
        </View>
      }
      ListEmptyComponent={
        <View
          style={{
            padding: 24,
            backgroundColor: theme.surface,
            borderRadius: theme.cardRadius,
          }}
        >
          <T preserveColor bold size={18}>
            More offers soon
          </T>
          <T preserveColor color={theme.muted}>
            Browse the Home tab for our full collection.
          </T>
        </View>
      }
    />
  );
}
