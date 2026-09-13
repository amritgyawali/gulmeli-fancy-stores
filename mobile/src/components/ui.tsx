import type { PropsWithChildren } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SvgXml } from "react-native-svg";
import icons from "@/data/stitch-icons.json";
import { colors, fontFamily, shared } from "@/theme/tokens";

export function T({
  size = 12,
  bold = false,
  color = colors.text,
  style,
  ...props
}: TextProps & { size?: number; bold?: boolean; color?: string }) {
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily,
          fontSize: size,
          lineHeight: size * 1.45,
          color,
          fontWeight: bold ? "700" : "400",
          includeFontPadding: false,
        },
        style,
      ]}
    />
  );
}
export function Row({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[shared.row, style]}>{children}</View>;
}
export function Tap({
  children,
  onPress,
  label,
  style,
  disabled,
  selected,
  role = "button",
  testID,
}: PropsWithChildren<{
  onPress: () => void;
  label: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  selected?: boolean;
  role?: "button" | "tab" | "checkbox";
  testID?: string;
}>) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole={role}
      accessibilityLabel={label}
      aria-disabled={disabled}
      aria-selected={role === "tab" ? selected : undefined}
      aria-checked={role === "checkbox" ? selected : undefined}
      disabled={disabled}
      onPress={onPress}
      hitSlop={5}
      style={({ pressed }) => [style, pressed && { opacity: 0.72 }]}
    >
      {children}
    </Pressable>
  );
}
export function Button({
  title,
  onPress,
  outline = false,
  color = colors.orange,
  style,
  textStyle,
  disabled,
}: {
  title: string;
  onPress: () => void;
  outline?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}) {
  return (
    <Tap
      label={title}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        {
          backgroundColor: outline ? "transparent" : color,
          borderColor: color,
        },
        style,
      ]}
    >
      <T bold color={outline ? color : "#fff"} style={textStyle}>
        {title}
      </T>
    </Tap>
  );
}
export function SourceIcon({
  source = "account",
  index,
  size = 24,
  color = colors.text,
}: {
  source?: "account" | "messages" | "offer";
  index: number;
  size?: number;
  color?: string;
}) {
  const prefix =
    source === "account"
      ? "daraz_app_account_screen_with_swipe_tabs"
      : source === "messages"
        ? "daraz_app_messages_screen"
        : "daraz_buy_more_save_more_offer_screen";
  const xml = icons[`${prefix}-${index}` as keyof typeof icons];
  return <SvgXml xml={xml} width={size} height={size} color={color} />;
}
export function Badge({
  count,
  dot = false,
}: {
  count?: number;
  dot?: boolean;
}) {
  if (!dot && !count) return null;
  return (
    <View
      style={[
        styles.badge,
        dot && { width: 9, height: 9, minWidth: 9, paddingHorizontal: 0 },
      ]}
    >
      {!dot && (
        <T size={9} bold color="#fff" style={{ lineHeight: 12 }}>
          {count}
        </T>
      )}
    </View>
  );
}
export function CheckBox({
  checked,
  onPress,
  label,
  disabled,
}: {
  checked: boolean;
  onPress: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Tap
      label={label}
      role="checkbox"
      selected={checked}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.checkbox,
        checked && {
          backgroundColor: colors.orange,
          borderColor: colors.orange,
        },
        disabled && { backgroundColor: "#e5e7eb" },
      ]}
    >
      {checked && (
        <T color="#fff" size={12} bold>
          ✓
        </T>
      )}
    </Tap>
  );
}
export function SectionTitle({
  title,
  action,
  onPress,
  children,
}: PropsWithChildren<{
  title: string;
  action?: string;
  onPress?: () => void;
}>) {
  return (
    <Row style={{ justifyContent: "space-between", marginBottom: 10, gap: 6 }}>
      <Row style={{ gap: 6, flexShrink: 1 }}>
        <T bold size={15}>
          {title}
        </T>
        {children}
      </Row>
      {action && onPress && (
        <Tap label={action} onPress={onPress}>
          <Row>
            <T color="#6b7280">{action}</T>
            <SourceIcon index={7} size={14} color="#6b7280" />
          </Row>
        </Tap>
      )}
    </Row>
  );
}
const styles = StyleSheet.create({
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -7,
    backgroundColor: "#ff2525",
    borderWidth: 1.5,
    borderColor: "#fff",
    borderRadius: 99,
    paddingHorizontal: 3,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderColor: "#c7c7cc",
    borderWidth: 1,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
