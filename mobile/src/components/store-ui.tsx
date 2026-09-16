// Semantic palette adaptation for the existing storefront screens. Admin UI
// keeps its own palette. Image pixels and explicit promotional colours remain intact.
import { forwardRef, type Ref } from "react";
import {
  View as NativeView,
  ScrollView as NativeScrollView,
  TextInput as NativeTextInput,
  FlatList as NativeFlatList,
  StyleSheet,
  type ViewProps,
  type ScrollViewProps,
  type TextInputProps,
  type FlatListProps,
  type StyleProp,
} from "react-native";
import { useStorefrontTheme } from "@/store/StorefrontProvider";
import { appearanceColor, type Appearance } from "@/admin/core/appearance";
export function themedStyle(style: StyleProp<any>, theme: Appearance) {
  const flat = StyleSheet.flatten(style);
  if (!flat) return style;
  return Object.fromEntries(
    Object.entries(flat).map(([key, value]) => [
      key,
      typeof value === "string" && /color$/i.test(key)
        ? appearanceColor(value, theme, key)
        : value,
    ]),
  );
}
export function View(props: ViewProps) {
  const theme = useStorefrontTheme();
  return <NativeView {...props} style={themedStyle(props.style, theme)} />;
}
export const ScrollView = forwardRef<NativeScrollView, ScrollViewProps>(
  function StoreScrollView(props, ref) {
    const theme = useStorefrontTheme();
    return (
      <NativeScrollView
        {...props}
        ref={ref}
        style={themedStyle(props.style, theme)}
        contentContainerStyle={themedStyle(props.contentContainerStyle, theme)}
      />
    );
  },
);
export const TextInput = forwardRef<NativeTextInput, TextInputProps>(
  function StoreTextInput(props, ref) {
    const theme = useStorefrontTheme();
    return (
      <NativeTextInput
        {...props}
        ref={ref}
        placeholderTextColor={theme.muted}
        selectionColor={theme.primary}
        style={[
          { color: theme.text, minHeight: 48 },
          themedStyle(props.style, theme),
        ]}
      />
    );
  },
);
export function FlatList<T>(
  props: FlatListProps<T> & { ref?: Ref<NativeFlatList<T>> },
) {
  const theme = useStorefrontTheme();
  return (
    <NativeFlatList
      {...props}
      style={themedStyle(props.style, theme)}
      contentContainerStyle={themedStyle(props.contentContainerStyle, theme)}
    />
  );
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type TextInput = NativeTextInput;
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ScrollView = NativeScrollView;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type FlatList<T = any> = NativeFlatList<T>;
