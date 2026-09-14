import { useMemo, useState, type ReactNode } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";
import {
  A,
  Btn,
  Card,
  Col,
  Divider,
  EmptyState,
  Icon,
  IconBtn,
  Pill,
  Row,
} from "./primitives";
import { adminTheme, type AdminTheme } from "./theme";
import { fontFamily } from "@/theme/tokens";
import type { FieldDef, Option } from "@/admin/core/fields";
import { humanise } from "@/admin/core/format";
import { slugify } from "@/admin/core/ids";

const base = adminTheme();

export function FieldShell({
  label,
  help,
  error,
  required,
  action,
  theme = base,
  children,
}: {
  label?: string;
  help?: string;
  error?: string;
  required?: boolean;
  action?: ReactNode;
  theme?: AdminTheme;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: 5 }}>
      {!!label && (
        <Row justify="space-between" gap={8}>
          <A size={12} weight="600" color={theme.text}>
            {label}
            {required ? " *" : ""}
          </A>
          {action}
        </Row>
      )}
      {children}
      {!!help && !error && (
        <A size={11} color={theme.muted}>
          {help}
        </A>
      )}
      {!!error && (
        <A size={11} color={theme.danger} accessibilityRole="alert">
          {error}
        </A>
      )}
    </View>
  );
}

export function TextBox({
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 3,
  keyboard = "default",
  secure = false,
  disabled = false,
  theme = base,
  label,
  testID,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  keyboard?: "default" | "numeric" | "email-address" | "phone-pad" | "url";
  secure?: boolean;
  disabled?: boolean;
  theme?: AdminTheme;
  label?: string;
  testID?: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <TextInput
      testID={testID}
      accessibilityLabel={label}
      value={value}
      editable={!disabled}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.muted}
      multiline={multiline}
      numberOfLines={multiline ? rows : 1}
      keyboardType={keyboard}
      secureTextEntry={secure}
      style={[
        {
          fontFamily,
          fontSize: 13,
          color: disabled ? theme.muted : theme.text,
          backgroundColor: disabled ? theme.background : theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: theme.radius,
          paddingHorizontal: 10,
          paddingVertical: multiline ? 10 : 9,
          minHeight: multiline ? rows * 20 + 16 : 38,
          textAlignVertical: multiline ? "top" : "center",
          ...(Platform.OS === "web" ? { outlineStyle: "none" as never } : null),
        },
        style,
      ]}
    />
  );
}

/** A modal picker; a plain list is easier to use on a phone than a wheel. */
export function Picker({
  value,
  options,
  onChange,
  placeholder = "Select",
  allowClear = true,
  searchable = false,
  theme = base,
  label,
  disabled = false,
}: {
  value: string | null;
  options: Option[];
  onChange: (value: string | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  searchable?: boolean;
  theme?: AdminTheme;
  label?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return needle
      ? options.filter((option) => option.label.toLowerCase().includes(needle))
      : options;
  }, [options, term]);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          label ? `${label}: ${selected?.label ?? placeholder}` : placeholder
        }
        aria-disabled={disabled}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          minHeight: 38,
          paddingHorizontal: 10,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: theme.radius,
          backgroundColor: disabled ? theme.background : theme.surface,
        }}
      >
        <A
          size={13}
          color={selected ? theme.text : theme.muted}
          numberOfLines={1}
          style={{ flex: 1 }}
        >
          {selected?.label ?? placeholder}
        </A>
        <Icon name="chevron-down" size={11} color={theme.muted} />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "#00000055",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <Pressable
            accessibilityRole="none"
            onPress={() => undefined}
            style={{
              backgroundColor: theme.surface,
              borderRadius: theme.cardRadius,
              maxHeight: "80%",
              overflow: "hidden",
              alignSelf: "center",
              width: "100%",
              maxWidth: 520,
            }}
          >
            <View style={{ padding: 12, gap: 8 }}>
              <A size={14} weight="700">
                {label ?? placeholder}
              </A>
              {searchable && (
                <TextBox
                  value={term}
                  onChange={setTerm}
                  placeholder="Search"
                  theme={theme}
                  label="Search options"
                />
              )}
            </View>
            <Divider theme={theme} />
            <ScrollView style={{ maxHeight: 380 }}>
              {allowClear && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear selection"
                  onPress={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  style={{ padding: 12 }}
                >
                  <A size={13} color={theme.muted}>
                    None
                  </A>
                </Pressable>
              )}
              {filtered.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  aria-selected={option.value === value}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={{
                    padding: 12,
                    backgroundColor:
                      option.value === value ? theme.background : "transparent",
                  }}
                >
                  <A size={13}>{option.label}</A>
                </Pressable>
              ))}
              {!filtered.length && (
                <EmptyState
                  title="Nothing matched"
                  detail="Try a different search."
                  theme={theme}
                />
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function MultiPicker({
  values,
  options,
  onChange,
  theme = base,
  label,
  searchable = false,
}: {
  values: string[];
  options: Option[];
  onChange: (values: string[]) => void;
  theme?: AdminTheme;
  label?: string;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return needle
      ? options.filter((option) => option.label.toLowerCase().includes(needle))
      : options;
  }, [options, term]);
  const toggle = (value: string) =>
    onChange(
      values.includes(value)
        ? values.filter((entry) => entry !== value)
        : [...values, value],
    );

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? "Select options"}
        onPress={() => setOpen(true)}
        style={{
          minHeight: 38,
          paddingHorizontal: 10,
          paddingVertical: 7,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: theme.radius,
          backgroundColor: theme.surface,
        }}
      >
        {values.length ? (
          <Row gap={5} wrap>
            {values.slice(0, 8).map((value) => (
              <Pill
                key={value}
                small
                label={
                  options.find((option) => option.value === value)?.label ??
                  value
                }
                color={theme.info}
                theme={theme}
              />
            ))}
            {values.length > 8 && (
              <Pill small label={`+${values.length - 8}`} theme={theme} />
            )}
          </Row>
        ) : (
          <A size={13} color={theme.muted}>
            Select
          </A>
        )}
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "#00000055",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <Pressable
            accessibilityRole="none"
            onPress={() => undefined}
            style={{
              backgroundColor: theme.surface,
              borderRadius: theme.cardRadius,
              maxHeight: "80%",
              alignSelf: "center",
              width: "100%",
              maxWidth: 520,
              overflow: "hidden",
            }}
          >
            <View style={{ padding: 12, gap: 8 }}>
              <Row justify="space-between">
                <A size={14} weight="700">
                  {label ?? "Select"}
                </A>
                <A
                  size={12}
                  color={theme.muted}
                >{`${values.length} selected`}</A>
              </Row>
              {searchable && (
                <TextBox
                  value={term}
                  onChange={setTerm}
                  placeholder="Search"
                  theme={theme}
                  label="Search options"
                />
              )}
            </View>
            <Divider theme={theme} />
            <ScrollView style={{ maxHeight: 360 }}>
              {filtered.map((option) => {
                const checked = values.includes(option.value);
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="checkbox"
                    accessibilityLabel={option.label}
                    aria-checked={checked}
                    onPress={() => toggle(option.value)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      padding: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        borderWidth: 1,
                        borderColor: checked ? theme.primary : theme.border,
                        backgroundColor: checked
                          ? theme.primary
                          : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {checked && (
                        <Icon name="check" size={10} color="#ffffff" />
                      )}
                    </View>
                    <A size={13}>{option.label}</A>
                  </Pressable>
                );
              })}
              {!filtered.length && (
                <EmptyState title="Nothing matched" theme={theme} />
              )}
            </ScrollView>
            <Divider theme={theme} />
            <View style={{ padding: 12 }}>
              <Btn
                title="Done"
                tone="primary"
                theme={theme}
                onPress={() => setOpen(false)}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function Toggle({
  value,
  onChange,
  label,
  theme = base,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
  theme?: AdminTheme;
}) {
  return (
    <Row gap={10} justify="space-between">
      <A size={13} style={{ flexShrink: 1 }}>
        {label}
      </A>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.primary, false: theme.border }}
        thumbColor="#ffffff"
      />
    </Row>
  );
}

export function TagInput({
  values,
  onChange,
  theme = base,
  label,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  theme?: AdminTheme;
  label?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const entry = draft.trim();
    if (!entry) return;
    if (!values.includes(entry)) onChange([...values, entry]);
    setDraft("");
  };
  return (
    <Col gap={6}>
      <Row gap={6}>
        <View style={{ flex: 1 }}>
          <TextBox
            value={draft}
            onChange={setDraft}
            placeholder="Type and press Add"
            theme={theme}
            label={label ? `${label} entry` : "New tag"}
          />
        </View>
        <Btn title="Add" icon="plus" small theme={theme} onPress={add} />
      </Row>
      {!!values.length && (
        <Row gap={6} wrap>
          {values.map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${value}`}
              onPress={() =>
                onChange(values.filter((entry) => entry !== value))
              }
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingVertical: 3,
                paddingHorizontal: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.background,
              }}
            >
              <A size={11}>{value}</A>
              <Icon name="xmark" size={9} color={theme.muted} />
            </Pressable>
          ))}
        </Row>
      )}
    </Col>
  );
}

const SWATCHES = [
  "#f85606",
  "#ff4600",
  "#ffba00",
  "#dc2626",
  "#be123c",
  "#7c3aed",
  "#2563eb",
  "#0891b2",
  "#16a34a",
  "#15803d",
  "#d97706",
  "#111113",
  "#374151",
  "#6b7280",
  "#e5e7eb",
  "#ffffff",
];

export function ColorInput({
  value,
  onChange,
  theme = base,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  theme?: AdminTheme;
  label?: string;
}) {
  return (
    <Col gap={6}>
      <Row gap={8}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: theme.radius,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: /^#[0-9a-fA-F]{6}$/.test(value)
              ? value
              : theme.background,
          }}
        />
        <View style={{ flex: 1 }}>
          <TextBox
            value={value}
            onChange={(next) =>
              onChange(next.startsWith("#") ? next : `#${next}`)
            }
            placeholder="#f85606"
            theme={theme}
            label={label ?? "Colour"}
          />
        </View>
      </Row>
      <Row gap={5} wrap>
        {SWATCHES.map((swatch) => (
          <Pressable
            key={swatch}
            accessibilityRole="button"
            accessibilityLabel={`Use ${swatch}`}
            onPress={() => onChange(swatch)}
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              backgroundColor: swatch,
              borderWidth: value.toLowerCase() === swatch ? 2 : 1,
              borderColor:
                value.toLowerCase() === swatch ? theme.text : theme.border,
            }}
          />
        ))}
      </Row>
    </Col>
  );
}

export function ImageInput({
  value,
  onChange,
  onPick,
  theme = base,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  onPick?: () => void;
  theme?: AdminTheme;
  label?: string;
}) {
  return (
    <Row gap={8} align="flex-start">
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: theme.radius,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.background,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {value ? (
          <Image
            source={{ uri: value }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <Icon name="image" size={16} color={theme.border} />
        )}
      </View>
      <Col gap={6} style={{ flex: 1 }}>
        <TextBox
          value={value}
          onChange={onChange}
          placeholder="https://…"
          theme={theme}
          label={label ?? "Image URL"}
        />
        {!!onPick && (
          <Btn
            title="Upload from this device"
            icon="camera"
            small
            theme={theme}
            onPress={onPick}
          />
        )}
      </Col>
    </Row>
  );
}

export function ImageListInput({
  values,
  onChange,
  onPick,
  theme = base,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  onPick?: () => void;
  theme?: AdminTheme;
}) {
  const [draft, setDraft] = useState("");
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= values.length) return;
    const copy = [...values];
    const [moved] = copy.splice(index, 1);
    if (moved === undefined) return;
    copy.splice(target, 0, moved);
    onChange(copy);
  };

  return (
    <Col gap={8}>
      <Row gap={6}>
        <View style={{ flex: 1 }}>
          <TextBox
            value={draft}
            onChange={setDraft}
            placeholder="https://…"
            theme={theme}
            label="Image URL"
          />
        </View>
        <Btn
          title="Add"
          icon="plus"
          small
          theme={theme}
          onPress={() => {
            if (!draft.trim()) return;
            onChange([...values, draft.trim()]);
            setDraft("");
          }}
        />
        {!!onPick && (
          <Btn
            title="Upload"
            icon="camera"
            small
            theme={theme}
            onPress={onPick}
          />
        )}
      </Row>
      {values.map((url, index) => (
        <Row key={`${url}-${index}`} gap={8}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: theme.radius,
              borderWidth: 1,
              borderColor: theme.border,
              overflow: "hidden",
              backgroundColor: theme.background,
            }}
          >
            <Image
              source={{ uri: url }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          </View>
          <A
            size={11}
            color={theme.muted}
            numberOfLines={2}
            style={{ flex: 1 }}
          >
            {index === 0 ? "Featured — " : ""}
            {url}
          </A>
          <IconBtn
            icon="arrow-up"
            label="Move up"
            theme={theme}
            onPress={() => move(index, -1)}
          />
          <IconBtn
            icon="arrow-down"
            label="Move down"
            theme={theme}
            onPress={() => move(index, 1)}
          />
          <IconBtn
            icon="trash-can"
            label="Remove image"
            tone="danger"
            theme={theme}
            onPress={() =>
              onChange(values.filter((_, position) => position !== index))
            }
          />
        </Row>
      ))}
      {!values.length && (
        <A size={11} color={theme.muted}>
          No images yet. The first image becomes the featured image.
        </A>
      )}
    </Col>
  );
}

export function RepeaterInput({
  fields,
  values,
  onChange,
  theme = base,
  renderField,
}: {
  fields: FieldDef[];
  values: Record<string, unknown>[];
  onChange: (values: Record<string, unknown>[]) => void;
  theme?: AdminTheme;
  renderField: (
    field: FieldDef,
    value: unknown,
    onFieldChange: (next: unknown) => void,
  ) => ReactNode;
}) {
  const update = (index: number, name: string, next: unknown) => {
    const copy = values.map((entry, position) =>
      position === index ? { ...entry, [name]: next } : entry,
    );
    onChange(copy);
  };
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= values.length) return;
    const copy = [...values];
    const [moved] = copy.splice(index, 1);
    if (moved === undefined) return;
    copy.splice(target, 0, moved);
    onChange(copy);
  };

  return (
    <Col gap={10}>
      {values.map((entry, index) => (
        <Card
          key={index}
          theme={theme}
          style={{ gap: 10, backgroundColor: theme.raised }}
        >
          <Row justify="space-between">
            <A size={12} weight="700" color={theme.muted}>
              {`#${index + 1}`}
            </A>
            <Row gap={6}>
              <IconBtn
                icon="arrow-up"
                label="Move up"
                theme={theme}
                onPress={() => move(index, -1)}
              />
              <IconBtn
                icon="arrow-down"
                label="Move down"
                theme={theme}
                onPress={() => move(index, 1)}
              />
              <IconBtn
                icon="trash-can"
                label="Remove row"
                tone="danger"
                theme={theme}
                onPress={() =>
                  onChange(values.filter((_, position) => position !== index))
                }
              />
            </Row>
          </Row>
          {fields.map((field) => (
            <FieldShell
              key={field.name}
              label={field.label}
              help={field.help}
              theme={theme}
            >
              {renderField(field, entry[field.name], (next) =>
                update(index, field.name, next),
              )}
            </FieldShell>
          ))}
        </Card>
      ))}
      <Btn
        title="Add row"
        icon="plus"
        small
        theme={theme}
        onPress={() => onChange([...values, {}])}
      />
    </Col>
  );
}

export function SecretInput({
  value,
  onChange,
  theme = base,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  theme?: AdminTheme;
  label?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <Row gap={6}>
      <View style={{ flex: 1 }}>
        <TextBox
          value={value}
          onChange={onChange}
          secure={!visible}
          placeholder="••••••••"
          theme={theme}
          label={label ?? "Secret"}
        />
      </View>
      <IconBtn
        icon={visible ? "eye-slash" : "eye"}
        label={visible ? "Hide value" : "Reveal value"}
        theme={theme}
        onPress={() => setVisible(!visible)}
      />
    </Row>
  );
}

/** Slug fields track their source until the operator types their own. */
export function deriveSlug(source: unknown, current: unknown): string {
  if (typeof current === "string" && current.trim()) return current;
  return slugify(String(source ?? "")).slice(0, 60);
}

export function optionLabel(
  options: Option[] | undefined,
  value: unknown,
): string {
  const match = options?.find((option) => option.value === String(value));
  return match?.label ?? humanise(value);
}
