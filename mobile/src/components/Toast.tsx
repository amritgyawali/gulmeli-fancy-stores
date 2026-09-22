import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeInDown, FadeOutDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { T } from "./ui";
import { FontIcon } from "./FontIcon";

/*
 * Snackbar confirmations: added to cart, saved to wishlist, link copied.
 *
 * The screens used to confirm an action by inserting a notice box at the top
 * of a scroll view, which the customer often could not see because they had
 * scrolled down to the button they pressed. A toast appears by the thumb,
 * above the tab bar, says what happened, offers the obvious next step (View
 * cart, Undo) and leaves on its own. Screen readers hear it through a polite
 * live region.
 */

export interface ToastInput {
  message: string;
  tone?: "success" | "info" | "error";
  image?: string | null;
  action?: { label: string; onPress: () => void };
}

interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = createContext<(toast: ToastInput) => void>(() => undefined);

export const useToast = () => useContext(ToastContext);

/* Clears the tab bar or a screen's own action bar. */
const BAR_CLEARANCE = 84;

export function ToastProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const { bottom } = useSafeAreaInsets();

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++;
      setItems((list) => [...list, { ...toast, id }].slice(-2));
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), toast.action ? 4500 : 2800),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <View
        pointerEvents="box-none"
        accessibilityLiveRegion="polite"
        style={{
          position: "absolute",
          left: 12,
          right: 12,
          bottom: BAR_CLEARANCE + bottom,
          alignItems: "center",
          gap: 8,
        }}
      >
        {items.map((t) => (
          <Animated.View
            key={t.id}
            entering={FadeInDown.springify().damping(18).stiffness(220)}
            exiting={FadeOutDown.duration(160)}
            layout={LinearTransition.springify()}
            accessibilityRole="alert"
            style={{
              width: "100%",
              maxWidth: 480,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingVertical: 10,
              paddingLeft: 10,
              paddingRight: 6,
              borderRadius: 14,
              backgroundColor: "#1f2126",
              boxShadow: "0 8px 24px rgba(20,22,26,0.25)",
            }}
          >
            {t.image ? (
              <Image
                source={{ uri: t.image }}
                contentFit="cover"
                style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: "#fff" }}
              />
            ) : (
              <View style={{ paddingLeft: 4 }}>
                <FontIcon
                  name={
                    t.tone === "error"
                      ? "circle-exclamation"
                      : t.tone === "info"
                        ? "circle-info"
                        : "circle-check"
                  }
                  solid
                  size={20}
                  color={t.tone === "error" ? "#ff8a80" : "#7ee2a8"}
                />
              </View>
            )}
            <T preserveColor size={14} bold color="#ffffff" style={{ flex: 1 }}>
              {t.message}
            </T>
            {t.action && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.action.label}
                hitSlop={6}
                onPress={() => {
                  t.action?.onPress();
                  dismiss(t.id);
                }}
                style={({ pressed }) => ({
                  paddingHorizontal: 10,
                  minHeight: 40,
                  justifyContent: "center",
                  borderRadius: 8,
                  backgroundColor: pressed ? "rgba(255,255,255,0.12)" : "transparent",
                })}
              >
                <T preserveColor size={14} bold color="#ffb68c">
                  {t.action.label}
                </T>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
              hitSlop={6}
              onPress={() => dismiss(t.id)}
              style={{ width: 36, height: 40, alignItems: "center", justifyContent: "center" }}
            >
              <FontIcon name="xmark" size={14} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}
