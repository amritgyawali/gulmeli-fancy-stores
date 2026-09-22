import { useEffect, useRef, useState } from "react";
import { FlatList, Pressable, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useReducedMotion, withTiming } from "react-native-reanimated";
import { T } from "./ui";
import { FontIcon } from "./FontIcon";
import { sizedImage } from "@/services/product-media";
import type { ContentRecord } from "@/admin/core/storefront-content";

/*
 * The home banner carousel.
 *
 * It was a paging ScrollView whose pages were narrower than the viewport
 * with a 12pt gap between them, so every swipe after the first landed a
 * little further off-centre, and nothing told the customer there were more
 * banners. This one snaps to each banner exactly, shows the next banner
 * peeking at the edge, advances on its own every five seconds (pausing while
 * the customer is touching it, and not at all with reduce-motion on), and
 * marks the current banner with an indicator that widens.
 */

const INTERVAL = 5000;

export function HeroCarousel({
  banners,
  width,
  radius,
  color,
  onOpen,
  onFailed,
}: {
  banners: ContentRecord[];
  width: number;
  radius: number;
  /* The active indicator's colour: the store's primary. */
  color: string;
  onOpen: (banner: ContentRecord) => void;
  onFailed: (id: string) => void;
}) {
  const list = useRef<FlatList<ContentRecord>>(null);
  const [index, setIndex] = useState(0);
  const [touching, setTouching] = useState(false);
  const reduced = useReducedMotion();
  const count = banners.length;
  const gap = 10;
  /* A single banner fills the row; several leave the next one peeking. */
  const item = count > 1 ? width - 28 : width;

  useEffect(() => {
    if (count < 2 || touching || reduced) return;
    const t = setTimeout(() => {
      const next = (index + 1) % count;
      list.current?.scrollToOffset({ offset: next * (item + gap), animated: true });
      setIndex(next);
    }, INTERVAL);
    return () => clearTimeout(t);
  }, [index, count, touching, reduced, item]);

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / (item + gap));
    setIndex(Math.max(0, Math.min(count - 1, i)));
    setTouching(false);
  };

  return (
    <View style={{ gap: 10 }}>
      <FlatList
        ref={list}
        data={banners}
        horizontal
        keyExtractor={(b) => b.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={item + gap}
        decelerationRate="fast"
        disableIntervalMomentum
        contentContainerStyle={{ gap }}
        onScrollBeginDrag={() => setTouching(true)}
        onMomentumScrollEnd={onEnd}
        getItemLayout={(_, i) => ({ length: item + gap, offset: (item + gap) * i, index: i })}
        renderItem={({ item: banner }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={String(banner.heading || banner.name || "Explore collection")}
            onPress={() => onOpen(banner)}
            style={({ pressed }) => ({
              width: item,
              borderRadius: radius + 4,
              overflow: "hidden",
              opacity: pressed ? 0.92 : 1,
            })}
          >
            <Image
              source={{ uri: sizedImage(String(banner.mobileImage || banner.image), item * 2) }}
              onError={() => onFailed(banner.id)}
              contentFit="cover"
              transition={250}
              accessibilityLabel={String(banner.heading || banner.name || "")}
              style={{ width: "100%", aspectRatio: 1.9 }}
            />
            {!!banner.heading && (
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.62)"]}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  paddingHorizontal: 16,
                  paddingTop: 36,
                  paddingBottom: 14,
                  gap: 8,
                }}
              >
                <T preserveColor size={20} bold color="#ffffff" numberOfLines={2}>
                  {String(banner.heading)}
                </T>
                <View
                  style={{
                    alignSelf: "flex-start",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: "#ffffff",
                    borderRadius: 16,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <T preserveColor size={12} bold color="#17181a">
                    {String(banner.ctaLabel || "Shop now")}
                  </T>
                  <FontIcon name="arrow-right" size={10} color="#17181a" />
                </View>
              </LinearGradient>
            )}
          </Pressable>
        )}
      />
      {count > 1 && (
        <View
          style={{ flexDirection: "row", justifyContent: "center", gap: 5 }}
          accessibilityLabel={`Banner ${index + 1} of ${count}`}
        >
          {banners.map((b, i) => (
            <Indicator key={b.id} active={i === index} color={color} />
          ))}
        </View>
      )}
    </View>
  );
}

function Indicator({ active, color }: { active: boolean; color: string }) {
  const style = useAnimatedStyle(() => ({
    width: withTiming(active ? 18 : 6, { duration: 250 }),
    opacity: withTiming(active ? 1 : 0.3, { duration: 250 }),
  }));
  return (
    <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: color }, style]} />
  );
}
