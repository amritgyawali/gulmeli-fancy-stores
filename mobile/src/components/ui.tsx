import type { PropsWithChildren } from "react";
import {
  Platform,
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
import { useStorefront, useStorefrontTheme } from "@/store/StorefrontProvider";
import { appearanceColor } from "@/admin/core/appearance";
import { themedStyle } from "./store-ui";
import { FontIcon } from "./FontIcon";
import { colors, fontFamily, radius, shared, TOUCH_SIZE } from "@/theme/tokens";

export function T({
  size = 12,
  bold = false,
  color,
  style,
  preserveColor = false,
  ...props
}: TextProps & {
  size?: number;
  bold?: boolean;
  color?: string;
  preserveColor?: boolean;
}) {
  const theme = useStorefrontTheme();
  const { config } = useStorefront();
  size = Math.max(
    11,
    (size >= 20 ? (size * theme.headingScale) / 1.25 : size) +
      theme.baseFontSize -
      12,
  );
  color =
    color === undefined
      ? theme.text
      : preserveColor
        ? color
        : appearanceColor(color, theme);
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily:
            config.theme.fontFamily === "serif"
              ? Platform.OS === "ios"
                ? "Georgia"
                : "serif"
              : config.theme.fontFamily === "rounded"
                ? Platform.OS === "ios"
                  ? "Arial Rounded MT Bold"
                  : "sans-serif"
                : config.theme.fontFamily === "monospace"
                  ? Platform.OS === "ios"
                    ? "Menlo"
                    : "monospace"
                  : fontFamily,
          fontSize: size,
          lineHeight: size * 1.45,
          color,
          fontWeight: bold ? theme.headingWeight : "400",
          includeFontPadding: false,
        },
        preserveColor ? style : themedStyle(style, theme),
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
  const theme = useStorefrontTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{
        disabled: !!disabled,
        selected: role === "tab" ? selected : undefined,
        checked: role === "checkbox" ? selected : undefined,
      }}
      aria-disabled={disabled}
      aria-selected={role === "tab" ? selected : undefined}
      aria-checked={role === "checkbox" ? selected : undefined}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        themedStyle(style, theme),
        pressed && { opacity: 0.72 },
      ]}
    >
      {children}
    </Pressable>
  );
}
export function Button({
  title,
  onPress,
  outline = false,
  color,
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
  const theme = useStorefrontTheme();
  color = color
    ? appearanceColor(color, theme, "backgroundColor")
    : theme.buttonColor;
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
          minHeight: 48,
          borderRadius: theme.buttonRadius,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <T
        preserveColor
        bold
        color={outline ? theme.primaryText : theme.buttonTextColor}
        style={textStyle}
      >
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
          backgroundColor: colors.brand,
          borderColor: colors.brand,
        },
        disabled && { backgroundColor: colors.line },
      ]}
    >
      {/* A real glyph, not the "✓" character: the text checkmark rendered
          at a different weight and baseline on every Android font. */}
      {checked && <FontIcon name="check" size={11} color={colors.white} />}
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
            <T color={colors.muted}>{action}</T>
            <SourceIcon index={7} size={14} color={colors.muted} />
          </Row>
        </Tap>
      )}
    </Row>
  );
}
const styles = StyleSheet.create({
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: TOUCH_SIZE,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -7,
    backgroundColor: colors.critical,
    borderWidth: 1.5,
    borderColor: colors.white,
    borderRadius: 99,
    paddingHorizontal: 3,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderColor: colors.lineStrong,
    borderWidth: 1.5,
    borderRadius: radius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
});
