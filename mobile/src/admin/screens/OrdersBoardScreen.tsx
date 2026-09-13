import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { AdminShell } from "@/admin/ui/Shell";
import { A, Btn, Col, Icon, Pill, Row } from "@/admin/ui/primitives";
import { useAdmin } from "@/admin/AdminProvider";
import { useLayout, statusColor } from "@/admin/ui/theme";
import { useFormat } from "@/admin/ui/useFormat";
import { FULFILMENT_FLOW, type AdminOrder } from "@/admin/core/types";
import { humanise } from "@/admin/core/format";
import { go } from "@/admin/navigate";

/** A column-per-stage board, so the whole day's fulfilment is visible at once. */
export function OrdersBoardScreen() {
  const { theme, store, write, data, allowed, notify } = useAdmin();
  const format = useFormat();
  const layout = useLayout();

  const columns = useMemo(
    () =>
      FULFILMENT_FLOW.map((status) => ({
        status,
        orders: data.orders
          .filter((order) => order.status === status)
          .sort((a, b) => String(a.placedAt).localeCompare(String(b.placedAt))),
      })),
    [data.orders],
  );

  const canEdit = allowed("orders", "edit");

  const advance = (order: AdminOrder, delta: number) => {
    const index = FULFILMENT_FLOW.indexOf(order.status);
    const next = FULFILMENT_FLOW[index + delta];
    if (!next) return;
    store.update(
      "orders",
      order.id,
      {
        status: next,
        timeline: [
          ...(order.timeline ?? []),
          {
            at: new Date().toISOString(),
            actor: write.actor?.name ?? "System",
            event: `Status changed to ${humanise(next)}`,
          },
        ],
      },
      write,
    );
    notify(
      `${order.number} moved to ${humanise(next).toLowerCase()}.`,
      "success",
    );
  };

  return (
    <AdminShell
      title="Order board"
      subtitle="Every order in the fulfilment pipeline, ready to move along"
      actions={
        <Btn
          title="List view"
          icon="list"
          small
          theme={theme}
          onPress={() => go("/admin/r/orders")}
        />
      }
      scroll={false}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
      >
        {columns.map((column) => (
          <View
            key={column.status}
            style={{
              width: layout.compact ? 250 : 290,
              backgroundColor: theme.surface,
              borderRadius: theme.cardRadius,
              borderWidth: 1,
              borderColor: theme.border,
              overflow: "hidden",
            }}
          >
            <Row
              justify="space-between"
              style={{
                padding: 10,
                borderBottomWidth: 2,
                borderBottomColor: statusColor(column.status, theme.border),
                backgroundColor: theme.raised,
              }}
            >
              <A size={12.5} weight="700">
                {humanise(column.status)}
              </A>
              <Pill label={String(column.orders.length)} theme={theme} small />
            </Row>
            <ScrollView
              contentContainerStyle={{ padding: 8, gap: 8 }}
              style={{ maxHeight: layout.height - 220 }}
            >
              {column.orders.map((order) => (
                <View
                  key={order.id}
                  style={{
                    borderRadius: theme.radius,
                    borderWidth: 1,
                    borderColor: theme.border,
                    padding: 9,
                    gap: 6,
                    backgroundColor: theme.background,
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open order ${order.number}`}
                    onPress={() => go(`/admin/r/orders/${order.id}`)}
                  >
                    <A size={12.5} weight="600">
                      {order.number}
                    </A>
                    <A size={11} color={theme.muted} numberOfLines={1}>
                      {order.customerName}
                    </A>
                    <Row justify="space-between" style={{ marginTop: 4 }}>
                      <A size={12} weight="600">
                        {format.money(order.total)}
                      </A>
                      <A size={10.5} color={theme.muted}>
                        {format.date(order.placedAt)}
                      </A>
                    </Row>
                  </Pressable>
                  {canEdit && (
                    <Row gap={6}>
                      <Btn
                        title="Back"
                        icon="chevron-left"
                        small
                        tone="ghost"
                        theme={theme}
                        disabled={FULFILMENT_FLOW.indexOf(order.status) <= 0}
                        onPress={() => advance(order, -1)}
                        style={{ flex: 1 }}
                      />
                      <Btn
                        title="Forward"
                        icon="chevron-right"
                        small
                        theme={theme}
                        disabled={
                          FULFILMENT_FLOW.indexOf(order.status) >=
                          FULFILMENT_FLOW.length - 1
                        }
                        onPress={() => advance(order, 1)}
                        style={{ flex: 1 }}
                      />
                    </Row>
                  )}
                </View>
              ))}
              {!column.orders.length && (
                <Col gap={6} style={{ alignItems: "center", padding: 14 }}>
                  <Icon name="inbox" size={16} color={theme.border} />
                  <A size={11} color={theme.muted}>
                    Nothing here
                  </A>
                </Col>
              )}
            </ScrollView>
          </View>
        ))}
      </ScrollView>
    </AdminShell>
  );
}
