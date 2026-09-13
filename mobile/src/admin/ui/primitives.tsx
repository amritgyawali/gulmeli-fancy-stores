import type { ComponentProps, PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { adminTheme, statusColor, type AdminTheme } from "./theme";
import { fontFamily } from "@/theme/tokens";

export type IconName = ComponentProps<typeof FontAwesome6>["name"];

const base = adminTheme();

export function Icon({
  name,
  size = 15,
  color = base.text,
  solid = true,
}: {
  name: string;
  size?: number;
  color?: string;
  solid?: boolean;
}) {
  return (
    <FontAwesome6
      name={name as IconName}
      size={size}
      color={color}
      solid={solid}
    />
  );
}

export function A({
  size = 13,
  weight = "400",
  color = base.text,
  style,
  numberOfLines,
  children,
  ...rest
}: PropsWithChildren<{
  size?: number;
  weight?: "400" | "500" | "600" | "700" | "800";
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  accessibilityRole?: "header" | "alert" | "text";
  testID?: string;
}>) {
  return (
    <Text
      {...rest}
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily,
          fontSize: size,
          lineHeight: Math.round(size * 1.45),
          color,
          fontWeight: weight,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Row({
  gap = 8,
  wrap = false,
  align = "center",
  justify,
  style,
  children,
}: PropsWithChildren<{
  gap?: number;
  wrap?: boolean;
  align?: ViewStyle["alignItems"];
  justify?: ViewStyle["justifyContent"];
  style?: StyleProp<ViewStyle>;
}>) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: align,
          justifyContent: justify,
          gap,
          flexWrap: wrap ? "wrap" : "nowrap",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Col({
  gap = 8,
  style,
  children,
}: PropsWithChildren<{ gap?: number; style?: StyleProp<ViewStyle> }>) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

export function Card({
  theme = base,
  padded = true,
  style,
  children,
}: PropsWithChildren<{
  theme?: AdminTheme;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}>) {
  return (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderRadius: theme.cardRadius,
          borderWidth: 1,
          borderColor: theme.border,
          padding: padded ? 14 : 0,
          boxShadow: theme.shadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionHeading({
  title,
  subtitle,
  right,
  theme = base,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  theme?: AdminTheme;
}) {
  return (
    <Row
      justify="space-between"
      align="flex-start"
      style={{ marginBottom: 10 }}
      gap={10}
    >
      <View style={{ flexShrink: 1 }}>
        <A size={15} weight="700" accessibilityRole="header">
          {title}
        </A>
        {!!subtitle && (
          <A size={12} color={theme.muted}>
            {subtitle}
          </A>
        )}
      </View>
      {right}
    </Row>
  );
}

export type ButtonTone = "primary" | "neutral" | "ghost" | "danger" | "success";

export function Btn({
  title,
  onPress,
  icon,
  tone = "neutral",
  small = false,
  disabled = false,
  busy = false,
  theme = base,
  style,
  testID,
}: {
  title: string;
  onPress: () => void;
  icon?: string;
  tone?: ButtonTone;
  small?: boolean;
  disabled?: boolean;
  busy?: boolean;
  theme?: AdminTheme;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const palette: Record<
    ButtonTone,
    { background: string; border: string; text: string }
  > = {
    primary: {
      background: theme.primary,
      border: theme.primary,
      text: "#ffffff",
    },
    neutral: {
      background: theme.surface,
      border: theme.border,
      text: theme.text,
    },
    ghost: {
      background: "transparent",
      border: "transparent",
      text: theme.muted,
    },
    danger: { background: "#fef2f2", border: "#fecaca", text: theme.danger },
    success: { background: "#f0fdf4", border: "#bbf7d0", text: theme.success },
  };
  const colors = palette[tone];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      aria-disabled={disabled || busy}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          paddingVertical: small ? 6 : 9,
          paddingHorizontal: small ? 10 : 14,
          borderRadius: theme.radius,
          borderWidth: 1,
          backgroundColor: colors.background,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : pressed ? 0.82 : 1,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        !!icon && (
          <Icon name={icon} size={small ? 12 : 13} color={colors.text} />
        )
      )}
      <A size={small ? 12 : 13} weight="600" color={colors.text}>
        {title}
      </A>
    </Pressable>
  );
}

export function IconBtn({
  icon,
  label,
  onPress,
  theme = base,
  tone = "neutral",
  disabled = false,
  size = 30,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  theme?: AdminTheme;
  tone?: "neutral" | "danger" | "primary";
  disabled?: boolean;
  size?: number;
}) {
  const color =
    tone === "danger"
      ? theme.danger
      : tone === "primary"
        ? theme.primary
        : theme.muted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: theme.radius,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <Icon name={icon} size={13} color={color} />
    </Pressable>
  );
}

export function Pill({
  label,
  color,
  theme = base,
  small = false,
}: {
  label: string;
  color?: string;
  theme?: AdminTheme;
  small?: boolean;
}) {
  const tint = color ?? statusColor(label, theme.muted);
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingVertical: small ? 1 : 3,
        paddingHorizontal: small ? 6 : 8,
        borderRadius: 999,
        backgroundColor: `${tint}1a`,
        borderWidth: 1,
        borderColor: `${tint}40`,
      }}
    >
      <A size={small ? 10 : 11} weight="600" color={tint}>
        {label}
      </A>
    </View>
  );
}

export function Divider({ theme = base }: { theme?: AdminTheme }) {
  return <View style={{ height: 1, backgroundColor: theme.border }} />;
}

export function Tabs({
  tabs,
  active,
  onChange,
  theme = base,
}: {
  tabs: { key: string; label: string; badge?: number }[];
  active: string;
  onChange: (key: string) => void;
  theme?: AdminTheme;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            aria-selected={selected}
            onPress={() => onChange(tab.key)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingVertical: 7,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: selected ? theme.text : theme.surface,
              borderWidth: 1,
              borderColor: selected ? theme.text : theme.border,
            }}
          >
            <A
              size={12}
              weight="600"
              color={selected ? "#ffffff" : theme.muted}
            >
              {tab.label}
            </A>
            {tab.badge !== undefined && tab.badge > 0 && (
              <View
                style={{
                  minWidth: 18,
                  paddingHorizontal: 5,
                  borderRadius: 999,
                  backgroundColor: selected ? "#ffffff33" : theme.background,
                }}
              >
                <A
                  size={10}
                  weight="700"
                  color={selected ? "#ffffff" : theme.muted}
                >
                  {tab.badge}
                </A>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function EmptyState({
  icon = "inbox",
  title,
  detail,
  action,
  theme = base,
}: {
  icon?: string;
  title: string;
  detail?: string;
  action?: ReactNode;
  theme?: AdminTheme;
}) {
  return (
    <View style={{ alignItems: "center", padding: 28, gap: 8 }}>
      <Icon name={icon} size={22} color={theme.border} />
      <A size={14} weight="600">
        {title}
      </A>
      {!!detail && (
        <A
          size={12}
          color={theme.muted}
          style={{ textAlign: "center", maxWidth: 380 }}
        >
          {detail}
        </A>
      )}
      {action}
    </View>
  );
}

export function Banner({
  tone = "info",
  title,
  detail,
  action,
  theme = base,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  title: string;
  detail?: string;
  action?: ReactNode;
  theme?: AdminTheme;
}) {
  const tint =
    tone === "danger"
      ? theme.danger
      : tone === "warning"
        ? theme.warning
        : tone === "success"
          ? theme.success
          : theme.info;
  return (
    <View
      accessibilityRole={tone === "danger" ? "alert" : undefined}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 12,
        borderRadius: theme.cardRadius,
        backgroundColor: `${tint}12`,
        borderWidth: 1,
        borderColor: `${tint}33`,
      }}
    >
      <Icon
        name={
          tone === "success"
            ? "circle-check"
            : tone === "info"
              ? "circle-info"
              : "triangle-exclamation"
        }
        size={15}
        color={tint}
      />
      <View style={{ flex: 1 }}>
        <A size={13} weight="600" color={theme.text}>
          {title}
        </A>
        {!!detail && (
          <A size={12} color={theme.muted}>
            {detail}
          </A>
        )}
      </View>
      {action}
    </View>
  );
}

export function StatTile({
  label,
  value,
  hint,
  delta,
  icon,
  tone,
  onPress,
  theme = base,
  style,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number;
  icon?: string;
  tone?: string;
  onPress?: () => void;
  theme?: AdminTheme;
  style?: StyleProp<ViewStyle>;
}) {
  const body = (
    <Card theme={theme} style={[{ gap: 6 }, style]}>
      <Row justify="space-between" align="flex-start">
        <A
          size={12}
          color={theme.muted}
          numberOfLines={2}
          style={{ flexShrink: 1 }}
        >
          {label}
        </A>
        {!!icon && <Icon name={icon} size={13} color={tone ?? theme.muted} />}
      </Row>
      <A size={20} weight="700" color={tone ?? theme.text} numberOfLines={1}>
        {value}
      </A>
      {(hint !== undefined || delta !== undefined) && (
        <Row gap={5}>
          {delta !== undefined && Number.isFinite(delta) && (
            <Row gap={3}>
              <Icon
                name={delta >= 0 ? "arrow-trend-up" : "arrow-trend-down"}
                size={10}
                color={delta >= 0 ? theme.success : theme.danger}
              />
              <A
                size={11}
                weight="600"
                color={delta >= 0 ? theme.success : theme.danger}
              >
                {`${Math.abs(delta).toFixed(1)}%`}
              </A>
            </Row>
          )}
          {!!hint && (
            <A
              size={11}
              color={theme.muted}
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {hint}
            </A>
          )}
        </Row>
      )}
    </Card>
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }, style]}
    >
      {body}
    </Pressable>
  );
}

/** Lays children out in a responsive grid without a dependency. */
export function Grid({
  columns,
  gap = 12,
  children,
}: PropsWithChildren<{ columns: number; gap?: number }>) {
  const items = Array.isArray(children) ? children.flat() : [children];
  const width = `${100 / Math.max(1, columns)}%` as const;
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        marginHorizontal: -gap / 2,
      }}
    >
      {items.map((child, index) => (
        <View
          key={index}
          style={{ width, paddingHorizontal: gap / 2, paddingBottom: gap }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

export const adminStyles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 14, gap: 14, paddingBottom: 48 },
});
