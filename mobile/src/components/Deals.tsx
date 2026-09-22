import { useEffect, useState } from "react";
import { View } from "react-native";
import type { Product } from "@/types/shop";
import { useStorefront, useStorefrontTheme } from "@/store/StorefrontProvider";
import { openProduct } from "@/services/navigation";
import { ProductVisual } from "./ProductVisual";
import { Row, T } from "./ui";
import { PressableScale } from "./motion";
import { compactCount, discountPercent, money } from "./ProductCard";

/*
 * Flash-deal pieces for the home screen: a countdown to the end of the
 * customer's day, and a compact deal card with a sold-through bar.
 *
 * Both are computed from real data. The countdown ends at local midnight,
 * when the day's deals turn over; the bar is the product's sold count over
 * sold plus stock, so it cannot claim "almost gone" for something with
 * plenty left.
 */

export function useEndOfDayCountdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const left = Math.max(0, end.getTime() - now);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    h: pad(Math.floor(left / 3_600_000)),
    m: pad(Math.floor((left % 3_600_000) / 60_000)),
    s: pad(Math.floor((left % 60_000) / 1000)),
  };
}

export function Countdown() {
  const { h, m, s } = useEndOfDayCountdown();
  const box = (v: string) => (
    <View
      style={{
        minWidth: 26,
        height: 24,
        borderRadius: 6,
        paddingHorizontal: 4,
        backgroundColor: "#17181a",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <T preserveColor size={12} bold color="#ffffff" style={{ fontVariant: ["tabular-nums"] }}>
        {v}
      </T>
    </View>
  );
  return (
    <View accessible accessibilityLabel={`Ends in ${Number(h)} hours ${Number(m)} minutes`}>
      <Row style={{ gap: 3 }}>
        {box(h)}
        <T preserveColor bold>
          :
        </T>
        {box(m)}
        <T preserveColor bold>
          :
        </T>
        {box(s)}
      </Row>
    </View>
  );
}

export function DealCard({ product, width = 132 }: { product: Product; width?: number }) {
  const theme = useStorefrontTheme();
  const { config } = useStorefront();
  const off = discountPercent(product);
  const sold = product.sold ?? 0;
  const share = sold + product.stock > 0 ? sold / (sold + product.stock) : 0;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Open ${product.name}`}
      scaleTo={0.96}
      onPress={() => openProduct(product.id)}
      style={{
        width,
        backgroundColor: theme.surface,
        borderRadius: theme.cardRadius,
        overflow: "hidden",
      }}
    >
      <View style={{ width, height: width, backgroundColor: theme.background }}>
        <ProductVisual product={product} width={width} />
        {off > 0 && (
          <View
            style={{
              position: "absolute",
              top: 6,
              left: 6,
              backgroundColor: theme.primary,
              borderRadius: 6,
              paddingHorizontal: 5,
              paddingVertical: 1,
            }}
          >
            <T preserveColor size={11} bold color={theme.onPrimary}>
              -{off}%
            </T>
          </View>
        )}
      </View>
      <View style={{ padding: 8, gap: 5 }}>
        <T preserveColor size={15} bold color={theme.primaryText}>
          {money(config.localisation.currencySymbol, product.price)}
        </T>
        {off > 0 && (
          <T
            preserveColor
            size={11}
            color={theme.muted}
            style={{ textDecorationLine: "line-through", marginTop: -4 }}
          >
            {money(config.localisation.currencySymbol, product.originalPrice!)}
          </T>
        )}
        {sold > 0 && (
          <View style={{ gap: 3 }}>
            <View
              style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: `${theme.primary}26`,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${Math.max(6, Math.round(share * 100))}%`,
                  height: "100%",
                  borderRadius: 3,
                  backgroundColor: theme.primary,
                }}
              />
            </View>
            <T preserveColor size={11} color={theme.muted}>
              {compactCount(sold)} sold
            </T>
          </View>
        )}
      </View>
    </PressableScale>
  );
}
