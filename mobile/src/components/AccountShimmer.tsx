import { useEffect, useState } from "react";
import { Animated, View, type DimensionValue } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Row } from "./ui";
import { shared } from "@/theme/tokens";

function Bone({
  width,
  height,
  round = 4,
}: {
  width: DimensionValue;
  height: number;
  round?: number;
}) {
  const [x] = useState(() => new Animated.Value(-180));
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(x, {
        toValue: 260,
        duration: 1400,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [x]);
  return (
    <View
      style={{
        width,
        height,
        borderRadius: round,
        backgroundColor: "#f0f0f2",
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={{ width: 180, height, transform: [{ translateX: x }] }}
      >
        <LinearGradient
          colors={["#f0f0f2", "#e2e2e6", "#f6f6f8", "#e2e2e6", "#f0f0f2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}
export function AccountShimmer() {
  return (
    <View accessibilityLabel="Refreshing account" style={{ gap: 12 }}>
      <Row style={{ gap: 10 }}>
        {[0, 1].map((i) => (
          <Row key={i} style={[shared.card, { flex: 1, gap: 10, padding: 10 }]}>
            <Bone width={56} height={56} round={8} />
            <View style={{ flex: 1, gap: 6 }}>
              <Bone width="100%" height={14} />
              <Bone width="70%" height={10} />
              <Bone width="80%" height={16} round={99} />
            </View>
          </Row>
        ))}
      </Row>
      <View style={shared.card}>
        <Row style={{ justifyContent: "space-around" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={{ alignItems: "center", gap: 6 }}>
              <Bone width={36} height={36} round={99} />
              <Bone width={48} height={10} />
            </View>
          ))}
        </Row>
      </View>
      <View style={[shared.card, { gap: 16 }]}>
        <Bone width={96} height={16} />
        <Row style={{ justifyContent: "space-around" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={{ gap: 8, alignItems: "center" }}>
              <Bone width={28} height={28} round={8} />
              <Bone width={40} height={10} />
            </View>
          ))}
        </Row>
        <Row style={{ gap: 10, padding: 10 }}>
          <Bone width={36} height={36} round={99} />
          <View style={{ flex: 1, gap: 6 }}>
            <Bone width="80%" height={14} />
            <Bone width="100%" height={10} />
          </View>
          <Bone width={64} height={24} />
        </Row>
      </View>
      <View style={[shared.card, { gap: 10 }]}>
        <Bone width={112} height={16} />
        <Row style={{ gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flex: 1, gap: 8 }}>
              <Bone width="100%" height={100} round={8} />
              <Bone width={56} height={14} />
            </View>
          ))}
        </Row>
      </View>
      <View
        style={[
          shared.card,
          { flexDirection: "row", flexWrap: "wrap", rowGap: 24 },
        ]}
      >
        {Array.from({ length: 8 }, (_, i) => (
          <View key={i} style={{ width: "25%", alignItems: "center", gap: 8 }}>
            <Bone width={40} height={40} round={12} />
            <Bone width={56} height={10} />
          </View>
        ))}
      </View>
    </View>
  );
}
