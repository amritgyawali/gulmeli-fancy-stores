import { useMemo } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { A, Col, Icon, Pill, Row } from "./primitives";
import { statusColor, type AdminTheme } from "./theme";
import type { ColumnDef } from "@/admin/core/resource";
import type { AdminRecord } from "@/admin/core/types";
import { getPath, type SortDirection } from "@/admin/core/query";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatPercent,
  humanise,
} from "@/admin/core/format";
import type { StorefrontConfig } from "@/admin/core/config";

export interface DataTableProps {
  columns: ColumnDef[];
  rows: AdminRecord[];
  theme: AdminTheme;
  config: StorefrontConfig;
  /** Resolves a relation id to its label. */
  resolve: (resource: string, id: unknown) => string;
  onOpen?: (record: AdminRecord) => void;
  selected?: string[];
  onToggleSelect?: (id: string) => void;
  onToggleAll?: () => void;
  sort?: string;
  direction?: SortDirection;
  onSort?: (field: string) => void;
  /** Drops `compact` columns; the list screen sets this on a phone. */
  narrow?: boolean;
  rowActions?: (record: AdminRecord) => React.ReactNode;
}

function Cell({
  column,
  record,
  theme,
  config,
  resolve,
}: {
  column: ColumnDef;
  record: AdminRecord;
  theme: AdminTheme;
  config: StorefrontConfig;
  resolve: (resource: string, id: unknown) => string;
}) {
  const value = getPath(record, column.field);

  switch (column.format) {
    case "image":
      return (
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 6,
            overflow: "hidden",
            backgroundColor: theme.background,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {typeof value === "string" && value ? (
            <Image
              source={{ uri: value }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <Icon name="image" size={12} color={theme.border} />
          )}
        </View>
      );
    case "currency":
      return <A size={12}>{formatMoney(value, config.localisation)}</A>;
    case "number":
      return (
        <A size={12}>
          {value === null || value === undefined
            ? "—"
            : formatNumber(value, config.localisation)}
        </A>
      );
    case "percent":
      return <A size={12}>{formatPercent(value)}</A>;
    case "date":
      return (
        <A size={12} color={theme.muted}>
          {value ? formatDate(value, config.localisation) : "—"}
        </A>
      );
    case "datetime":
      return (
        <A size={12} color={theme.muted}>
          {value ? formatDateTime(value, config.localisation) : "—"}
        </A>
      );
    case "badge": {
      if (value === null || value === undefined || value === "")
        return (
          <A size={12} color={theme.muted}>
            —
          </A>
        );
      const label =
        column.options?.find((option) => option.value === String(value))
          ?.label ?? humanise(value);
      return (
        <Pill
          label={label}
          color={statusColor(value, theme.muted)}
          theme={theme}
          small
        />
      );
    }
    case "boolean":
      return (
        <Icon
          name={value ? "circle-check" : "circle-xmark"}
          size={13}
          color={value ? theme.success : theme.border}
        />
      );
    case "relation":
      return (
        <A size={12} numberOfLines={1}>
          {value ? resolve(column.resource ?? "", value) : "—"}
        </A>
      );
    case "tags": {
      const entries = Array.isArray(value) ? value.map(String) : [];
      if (!entries.length)
        return (
          <A size={12} color={theme.muted}>
            —
          </A>
        );
      return (
        <Row gap={4} wrap>
          {entries.slice(0, 3).map((entry) => (
            <Pill
              key={entry}
              label={entry}
              color={theme.muted}
              theme={theme}
              small
            />
          ))}
          {entries.length > 3 && (
            <A size={11} color={theme.muted}>{`+${entries.length - 3}`}</A>
          )}
        </Row>
      );
    }
    default:
      return (
        <A size={12} numberOfLines={2}>
          {value === null || value === undefined || value === ""
            ? "—"
            : String(value)}
        </A>
      );
  }
}

function Check({
  checked,
  onPress,
  label,
  theme,
}: {
  checked: boolean;
  onPress: () => void;
  label: string;
  theme: AdminTheme;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      aria-checked={checked}
      onPress={onPress}
      hitSlop={8}
      style={{
        width: 17,
        height: 17,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: checked ? theme.primary : theme.border,
        backgroundColor: checked ? theme.primary : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {checked && <Icon name="check" size={9} color="#ffffff" />}
    </Pressable>
  );
}

/**
 * A table on wide screens and a stack of cards on a phone, from one column
 * definition. The admin has to be usable from the shop floor, not only a desk.
 */
export function DataTable({
  columns,
  rows,
  theme,
  config,
  resolve,
  onOpen,
  selected = [],
  onToggleSelect,
  onToggleAll,
  sort,
  direction,
  onSort,
  narrow = false,
  rowActions,
}: DataTableProps) {
  const visible = useMemo(
    () => (narrow ? columns.filter((column) => !column.compact) : columns),
    [columns, narrow],
  );
  const allSelected =
    rows.length > 0 && rows.every((row) => selected.includes(row.id));

  if (narrow) {
    return (
      <Col gap={8}>
        {rows.map((record) => {
          const [primary, ...rest] = visible.filter(
            (column) => column.format !== "image",
          );
          const image = visible.find((column) => column.format === "image");
          return (
            <Pressable
              key={record.id}
              accessibilityRole="button"
              accessibilityLabel={String(
                getPath(record, primary?.field ?? "id") ?? record.id,
              )}
              onPress={() => onOpen?.(record)}
              style={({ pressed }) => ({
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: selected.includes(record.id)
                  ? theme.primary
                  : theme.border,
                borderRadius: theme.cardRadius,
                padding: 12,
                gap: 8,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Row gap={10} align="flex-start">
                {!!onToggleSelect && (
                  <Check
                    checked={selected.includes(record.id)}
                    onPress={() => onToggleSelect(record.id)}
                    label={`Select ${record.id}`}
                    theme={theme}
                  />
                )}
                {!!image && (
                  <Cell
                    column={image}
                    record={record}
                    theme={theme}
                    config={config}
                    resolve={resolve}
                  />
                )}
                <View style={{ flex: 1, gap: 4 }}>
                  {!!primary && (
                    <A size={13} weight="600" numberOfLines={2}>
                      {String(getPath(record, primary.field) ?? "—")}
                    </A>
                  )}
                  <Row gap={10} wrap>
                    {rest.slice(0, 4).map((column) => (
                      <Row key={column.field} gap={4}>
                        <A size={11} color={theme.muted}>
                          {column.label}
                        </A>
                        <Cell
                          column={column}
                          record={record}
                          theme={theme}
                          config={config}
                          resolve={resolve}
                        />
                      </Row>
                    ))}
                  </Row>
                </View>
              </Row>
              {!!rowActions && <Row gap={6}>{rowActions(record)}</Row>}
            </Pressable>
          );
        })}
      </Col>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View style={{ minWidth: "100%" }}>
        <Row
          gap={12}
          style={{
            paddingVertical: 9,
            paddingHorizontal: 12,
            backgroundColor: theme.raised,
            borderTopLeftRadius: theme.cardRadius,
            borderTopRightRadius: theme.cardRadius,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          {!!onToggleAll && (
            <Check
              checked={allSelected}
              onPress={onToggleAll}
              label="Select all rows"
              theme={theme}
            />
          )}
          {visible.map((column) => (
            <Pressable
              key={column.field}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${column.label || column.field}`}
              disabled={!onSort || !column.label}
              onPress={() => onSort?.(column.field)}
              style={{
                width: column.width ?? 150,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <A size={11} weight="700" color={theme.muted}>
                {column.label}
              </A>
              {sort === column.field && (
                <Icon
                  name={direction === "asc" ? "arrow-up" : "arrow-down"}
                  size={9}
                  color={theme.muted}
                />
              )}
            </Pressable>
          ))}
          {!!rowActions && <View style={{ width: 120 }} />}
        </Row>
        {rows.map((record, index) => (
          <Pressable
            key={record.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${record.id}`}
            onPress={() => onOpen?.(record)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 9,
              paddingHorizontal: 12,
              backgroundColor: pressed
                ? theme.background
                : selected.includes(record.id)
                  ? `${theme.primary}0d`
                  : index % 2
                    ? theme.raised
                    : theme.surface,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            })}
          >
            {!!onToggleSelect && (
              <Check
                checked={selected.includes(record.id)}
                onPress={() => onToggleSelect(record.id)}
                label={`Select ${record.id}`}
                theme={theme}
              />
            )}
            {visible.map((column) => (
              <View key={column.field} style={{ width: column.width ?? 150 }}>
                <Cell
                  column={column}
                  record={record}
                  theme={theme}
                  config={config}
                  resolve={resolve}
                />
              </View>
            ))}
            {!!rowActions && (
              <Row gap={6} style={{ width: 120 }}>
                {rowActions(record)}
              </Row>
            )}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
