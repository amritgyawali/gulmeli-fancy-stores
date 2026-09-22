import { useCallback, type PropsWithChildren } from "react";
import {
  Platform,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/*
 * Motion and touch feedback shared by the storefront screens.
 *
 * Everything here runs on the UI thread through Reanimated, so a press or a
 * heart pop stays smooth while the JS thread is busy rendering a list, and
 * everything checks the system reduce-motion setting: with it on, controls
 * still respond (opacity, haptics) but nothing scales or bounces.
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/* Press: quick and firm. Release: a little softer, so it settles. */
const PRESS = { damping: 22, stiffness: 420, mass: 0.6 } as const;
const RELEASE = { damping: 14, stiffness: 260, mass: 0.6 } as const;

/*
 * A Pressable that sinks slightly under the finger. Scale is a transform, so
 * it never moves the controls around it.
 */
export function PressableScale({
  children,
  style,
  scaleTo = 0.96,
  onPressIn,
  onPressOut,
  ...rest
}: PropsWithChildren<
  Omit<PressableProps, "style"> & { style?: StyleProp<ViewStyle>; scaleTo?: number }
>) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e: GestureResponderEvent) => {
        if (!reduced) scale.set(withSpring(scaleTo, PRESS));
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        scale.set(withSpring(1, RELEASE));
        onPressOut?.(e);
      }}
      style={[style, animated, rest.disabled ? { opacity: 0.5 } : null]}
    >
      {children}
    </AnimatedPressable>
  );
}

/*
 * A one-shot overshoot for confirmations: the wishlist heart when saved, the
 * cart badge when an item lands. Returns the style to apply and the trigger.
 */
export function usePop(peak = 1.3) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pop = useCallback(() => {
    if (reduced) return;
    scale.set(
      withSequence(withTiming(peak, { duration: 120 }), withSpring(1, { damping: 9, stiffness: 240 })),
    );
  }, [peak, reduced, scale]);
  return [style, pop] as const;
}

/*
 * Haptic feedback. expo-haptics is loaded on first use and every failure is
 * swallowed: on the web, on a device without a vibration motor, or on an
 * older build of the app that predates the module, the tap simply has no
 * haptic rather than an error.
 */
type Haptics = typeof import("expo-haptics");
let haptics: Haptics | null | undefined;

export async function haptic(kind: "light" | "medium" | "success" | "selection" = "light") {
  if (Platform.OS === "web" || haptics === null) return;
  try {
    haptics ??= await import("expo-haptics");
    if (kind === "success")
      await haptics.notificationAsync(haptics.NotificationFeedbackType.Success);
    else if (kind === "selection") await haptics.selectionAsync();
    else
      await haptics.impactAsync(
        kind === "medium"
          ? haptics.ImpactFeedbackStyle.Medium
          : haptics.ImpactFeedbackStyle.Light,
      );
  } catch {
    haptics = null;
  }
}
