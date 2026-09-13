import { useMemo, useState } from "react";
import { Platform, Share, View } from "react-native";
import { AdminShell, Panel } from "@/admin/ui/Shell";
import {
  A,
  Btn,
  Col,
  EmptyState,
  Grid,
  Icon,
  Pill,
  Row,
} from "@/admin/ui/primitives";
import { Picker, TextBox } from "@/admin/ui/inputs";
import { useLayout } from "@/admin/ui/theme";
import { useAdmin } from "@/admin/AdminProvider";
import { useFormat } from "@/admin/ui/useFormat";
import { humanise } from "@/admin/core/format";
import {
  FULFILMENT_FLOW,
  ORDER_STATUSES,
  type AdminOrder,
  type OrderStatus,
} from "@/admin/core/types";
import {
  orderStatusOptions,
  paymentStatusOptions,
} from "@/admin/core/resources/common";
import {
  invoiceHtml,
  packingSlipHtml,
  shippingLabelHtml,
} from "@/admin/core/documents";
import { back, go } from "@/admin/navigate";

function openDocument(
  html: string,
  title: string,
  onFail: (message: string) => void,
) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const preview = window.open("", "_blank");
    if (!preview) {
      onFail("Allow pop-ups for this site to print or download the document.");
      return;
    }
    preview.document.write(html);
    preview.document.close();
    return;
  }
  void Share.share({ message: html, title }).catch(() =>
    onFail("The document could not be shared from this device."),
  );
}

export function OrderScreen({ id }: { id: string }) {
  const { theme, store, write, allowed, notify, published, revision } =
    useAdmin();
  const format = useFormat();
  const layout = useLayout();
  const [note, setNote] = useState("");
  const [refund, setRefund] = useState("");

  const order = useMemo(
    () => store.get<AdminOrder>("orders", id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, id, revision],
  );

  if (!order) {
    return (
      <AdminShell title="Order" onBack={back}>
        <EmptyState
          icon="receipt"
          title="This order no longer exists"
          action={
            <Btn
              title="All orders"
              theme={theme}
              onPress={() => go("/admin/r/orders")}
            />
          }
          theme={theme}
        />
      </AdminShell>
    );
  }

  const canEdit = allowed("orders", "edit");
  const canRefund = allowed("orders", "refund") || allowed("returns", "refund");
  const stageIndex = FULFILMENT_FLOW.indexOf(order.status);
  const nextStage =
    stageIndex >= 0 ? FULFILMENT_FLOW[stageIndex + 1] : undefined;
  const refunded = Number(order.refundedTotal) || 0;
  const outstanding = Math.max(0, (Number(order.total) || 0) - refunded);

  const setStatus = (status: OrderStatus, message?: string) => {
    const entry = {
      at: new Date().toISOString(),
      actor: write.actor?.name ?? "System",
      event: `Status changed to ${humanise(status)}`,
      note: message,
    };
    store.update(
      "orders",
      order.id,
      {
        status,
        deliveredAt:
          status === "delivered" ? new Date().toISOString() : order.deliveredAt,
        paymentStatus:
          status === "delivered" &&
          order.paymentMethod.toLowerCase().includes("cash")
            ? "paid"
            : order.paymentStatus,
        timeline: [...(order.timeline ?? []), entry],
      },
      write,
    );
    notify(
      `Order ${order.number} is now ${humanise(status).toLowerCase()}.`,
      "success",
    );
  };

  const patch = (values: Partial<AdminOrder>, message: string) => {
    store.update("orders", order.id, values, write);
    notify(message, "success");
  };

  const applyRefund = (full: boolean) => {
    const amount = full ? outstanding : Number(refund);
    if (!Number.isFinite(amount) || amount <= 0) {
      notify("Enter the amount to refund.", "danger");
      return;
    }
    if (amount > outstanding) {
      notify(
        `The most that can be refunded is ${format.money(outstanding)}.`,
        "danger",
      );
      return;
    }
    const total = refunded + amount;
    store.update(
      "orders",
      order.id,
      {
        refundedTotal: total,
        paymentStatus:
          total >= Number(order.total) ? "refunded" : "partially_refunded",
        status: total >= Number(order.total) ? "refunded" : order.status,
        timeline: [
          ...(order.timeline ?? []),
          {
            at: new Date().toISOString(),
            actor: write.actor?.name ?? "System",
            event: `${full ? "Full" : "Partial"} refund of ${format.money(amount)}`,
          },
        ],
      },
      write,
    );
    store.create(
      "transactions",
      {
        reference: `RFD-${order.number}-${Date.now().toString(36)}`,
        orderId: order.id,
        gateway: order.paymentMethod.toLowerCase().replace(/\s+/g, "_"),
        type: "refund",
        status: "successful",
        amount,
        fee: 0,
        currency: published.localisation.defaultCurrency,
        reconciled: false,
        failureReason: "",
      },
      write,
    );
    store.log(
      "refund",
      "orders",
      `${format.money(amount)} refunded on ${order.number}`,
      write.actor,
    );
    setRefund("");
    notify(`${format.money(amount)} refunded.`, "success");
  };

  const restock = () => {
    for (const line of order.lines ?? []) {
      const product = store.get("products", line.productId);
      if (!product) continue;
      const resulting =
        (Number(product.stock) || 0) + (Number(line.quantity) || 0);
      store.update(
        "products",
        product.id,
        { stock: resulting },
        { ...write, silent: true },
      );
      store.create(
        "inventory_movements",
        {
          productId: product.id,
          type: "returned",
          quantity: line.quantity,
          resultingStock: resulting,
          warehouse: String(product.warehouse ?? "Main"),
          reason: `Returned from order ${order.number}`,
          note: "",
        },
        { ...write, silent: true },
      );
    }
    notify("Items returned to stock.", "success");
  };

  const cost = (order.lines ?? []).reduce(
    (total, line) =>
      total + (Number(line.costPrice) || 0) * (Number(line.quantity) || 0),
    0,
  );

  return (
    <AdminShell
      title={`Order ${order.number}`}
      subtitle={`${order.customerName} · ${format.dateTime(order.placedAt)}`}
      onBack={back}
      actions={
        <Row gap={6} wrap>
          <Btn
            title="Invoice"
            icon="file-invoice"
            small
            theme={theme}
            onPress={() =>
              openDocument(
                invoiceHtml(order, published),
                `Invoice ${order.number}`,
                (message) => notify(message, "danger"),
              )
            }
          />
          <Btn
            title="Packing slip"
            icon="box-open"
            small
            theme={theme}
            onPress={() =>
              openDocument(
                packingSlipHtml(order, published),
                `Packing slip ${order.number}`,
                (message) => notify(message, "danger"),
              )
            }
          />
          <Btn
            title="Shipping label"
            icon="tag"
            small
            theme={theme}
            onPress={() =>
              openDocument(
                shippingLabelHtml(order, published),
                `Label ${order.number}`,
                (message) => notify(message, "danger"),
              )
            }
          />
          <Btn
            title="Edit fields"
            icon="pen"
            small
            theme={theme}
            onPress={() => go(`/admin/r/orders/${order.id}?edit=1`)}
          />
        </Row>
      }
    >
      <Grid columns={layout.columns} gap={12}>
        <Col gap={3}>
          <A size={11} color={theme.muted}>
            Order status
          </A>
          <Pill label={humanise(order.status)} theme={theme} />
        </Col>
        <Col gap={3}>
          <A size={11} color={theme.muted}>
            Payment
          </A>
          <Pill label={humanise(order.paymentStatus)} theme={theme} />
        </Col>
        <Col gap={3}>
          <A size={11} color={theme.muted}>
            Total
          </A>
          <A size={17} weight="700">
            {format.money(order.total)}
          </A>
        </Col>
        <Col gap={3}>
          <A size={11} color={theme.muted}>
            Profit on this order
          </A>
          <A
            size={17}
            weight="700"
            color={outstanding - cost >= 0 ? theme.success : theme.danger}
          >
            {format.money(outstanding - cost)}
          </A>
        </Col>
      </Grid>

      {canEdit && (
        <Panel
          title="Move the order forward"
          subtitle="Each change is recorded on the timeline below"
        >
          <Row gap={8} wrap>
            {!!nextStage && (
              <Btn
                title={`Mark ${humanise(nextStage).toLowerCase()}`}
                icon="arrow-right"
                tone="primary"
                small
                theme={theme}
                onPress={() => setStatus(nextStage)}
              />
            )}
            <View style={{ minWidth: 190 }}>
              <Picker
                value={order.status}
                options={orderStatusOptions}
                onChange={(next) => next && setStatus(next as OrderStatus)}
                theme={theme}
                label="Order status"
                allowClear={false}
              />
            </View>
            <View style={{ minWidth: 190 }}>
              <Picker
                value={order.paymentStatus}
                options={paymentStatusOptions}
                onChange={(next) =>
                  next &&
                  patch(
                    { paymentStatus: next as AdminOrder["paymentStatus"] },
                    "Payment status updated.",
                  )
                }
                theme={theme}
                label="Payment status"
                allowClear={false}
              />
            </View>
            {order.status !== "cancelled" && (
              <Btn
                title="Cancel order"
                icon="ban"
                small
                tone="danger"
                theme={theme}
                onPress={() => setStatus("cancelled")}
              />
            )}
            {(order.status === "cancelled" || order.status === "returned") && (
              <Btn
                title="Restore to pending"
                icon="rotate-left"
                small
                theme={theme}
                onPress={() => setStatus("pending")}
              />
            )}
          </Row>
          <Row gap={6} wrap>
            {ORDER_STATUSES.filter((status) =>
              FULFILMENT_FLOW.includes(status),
            ).map((status, index) => {
              const done = stageIndex >= index && stageIndex >= 0;
              return (
                <Row key={status} gap={4}>
                  <Icon
                    name={done ? "circle-check" : "circle"}
                    size={11}
                    color={done ? theme.success : theme.border}
                  />
                  <A size={11} color={done ? theme.text : theme.muted}>
                    {humanise(status)}
                  </A>
                </Row>
              );
            })}
          </Row>
        </Panel>
      )}

      <Panel title="Items" subtitle={`${(order.lines ?? []).length} line(s)`}>
        {(order.lines ?? []).map((line, index) => (
          <Row
            key={`${line.productId}-${index}`}
            justify="space-between"
            gap={10}
            style={{ paddingVertical: 6 }}
          >
            <View style={{ flex: 1 }}>
              <A size={12.5} weight="600" numberOfLines={2}>
                {line.name}
              </A>
              <A size={11} color={theme.muted}>
                {`${line.sku} · ${line.quantity} × ${format.money(line.unitPrice)}`}
              </A>
            </View>
            <A size={12.5} weight="600">
              {format.money(
                line.unitPrice * line.quantity - (Number(line.discount) || 0),
              )}
            </A>
          </Row>
        ))}
        <View
          style={{
            height: 1,
            backgroundColor: theme.border,
            marginVertical: 6,
          }}
        />
        {[
          ["Subtotal", order.subtotal],
          ["Discount", -(Number(order.discountTotal) || 0)],
          ["Shipping", order.shippingTotal],
          ["Tax", order.taxTotal],
          ["Refunded", -refunded],
        ]
          .filter(([, value]) => Number(value) !== 0)
          .map(([label, value]) => (
            <Row key={String(label)} justify="space-between">
              <A size={12} color={theme.muted}>
                {String(label)}
              </A>
              <A size={12}>{format.money(value)}</A>
            </Row>
          ))}
        <Row justify="space-between">
          <A size={13} weight="700">
            Total
          </A>
          <A size={13} weight="700">
            {format.money(outstanding)}
          </A>
        </Row>
      </Panel>

      <Grid columns={layout.wide ? 2 : 1} gap={12}>
        <Panel title="Customer">
          <A size={13} weight="600">
            {order.customerName}
          </A>
          <A size={12} color={theme.muted}>
            {order.customerEmail}
          </A>
          {order.guest && <Pill label="Guest checkout" theme={theme} small />}
          {!!order.customerId && (
            <Btn
              title="Open customer"
              icon="user"
              small
              theme={theme}
              onPress={() => go(`/admin/r/customers/${order.customerId}`)}
            />
          )}
        </Panel>

        <Panel title="Delivery">
          <A size={12}>
            {[
              order.shippingAddress?.fullName,
              order.shippingAddress?.line1,
              order.shippingAddress?.city,
              order.shippingAddress?.district,
              order.shippingAddress?.province,
              order.shippingAddress?.phone,
            ]
              .filter(Boolean)
              .join("\n")}
          </A>
          {canEdit && (
            <Col gap={8}>
              <TextBox
                value={String(order.courier ?? "")}
                onChange={(value) =>
                  store.update(
                    "orders",
                    order.id,
                    { courier: value },
                    { ...write, silent: true },
                  )
                }
                placeholder="Courier"
                theme={theme}
                label="Courier"
              />
              <TextBox
                value={String(order.trackingNumber ?? "")}
                onChange={(value) =>
                  store.update(
                    "orders",
                    order.id,
                    { trackingNumber: value },
                    { ...write, silent: true },
                  )
                }
                placeholder="Tracking number"
                theme={theme}
                label="Tracking number"
              />
              <TextBox
                value={String(order.expectedDeliveryDate ?? "")}
                onChange={(value) =>
                  store.update(
                    "orders",
                    order.id,
                    { expectedDeliveryDate: value },
                    { ...write, silent: true },
                  )
                }
                placeholder="Expected delivery (YYYY-MM-DD)"
                theme={theme}
                label="Expected delivery date"
              />
            </Col>
          )}
        </Panel>
      </Grid>

      {canRefund && (
        <Panel
          title="Refunds"
          subtitle={
            refunded
              ? `${format.money(refunded)} already refunded, ${format.money(outstanding)} remaining`
              : `Up to ${format.money(outstanding)} can be refunded`
          }
        >
          <Row gap={8} wrap>
            <View style={{ flex: 1, minWidth: 160 }}>
              <TextBox
                value={refund}
                onChange={setRefund}
                placeholder="Partial amount"
                keyboard="numeric"
                theme={theme}
                label="Refund amount"
              />
            </View>
            <Btn
              title="Partial refund"
              icon="rotate-left"
              small
              theme={theme}
              onPress={() => applyRefund(false)}
            />
            <Btn
              title="Full refund"
              icon="money-bill-transfer"
              small
              tone="danger"
              theme={theme}
              onPress={() => applyRefund(true)}
            />
            <Btn
              title="Return items to stock"
              icon="boxes-stacked"
              small
              theme={theme}
              onPress={restock}
            />
          </Row>
        </Panel>
      )}

      <Panel title="Notes">
        <Col gap={8}>
          <A size={11} color={theme.muted}>
            Customer note
          </A>
          <A size={12}>{order.customerNote || "None"}</A>
          {canEdit && (
            <>
              <A size={11} color={theme.muted}>
                Internal note — never shown to the customer
              </A>
              <TextBox
                value={String(order.internalNote ?? "")}
                onChange={(value) =>
                  store.update(
                    "orders",
                    order.id,
                    { internalNote: value },
                    { ...write, silent: true },
                  )
                }
                multiline
                rows={3}
                theme={theme}
                label="Internal note"
              />
            </>
          )}
        </Col>
      </Panel>

      <Panel
        title="Timeline"
        subtitle="Everything that has happened to this order"
      >
        <Col gap={10}>
          {[...(order.timeline ?? [])].reverse().map((entry, index) => (
            <Row key={`${entry.at}-${index}`} gap={10} align="flex-start">
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  marginTop: 5,
                  backgroundColor: theme.primary,
                }}
              />
              <View style={{ flex: 1 }}>
                <A size={12.5}>{entry.event}</A>
                <A size={11} color={theme.muted}>
                  {`${entry.actor} · ${format.dateTime(entry.at)}`}
                </A>
                {!!entry.note && (
                  <A size={11} color={theme.muted}>
                    {entry.note}
                  </A>
                )}
              </View>
            </Row>
          ))}
          {!(order.timeline ?? []).length && (
            <A size={12} color={theme.muted}>
              No events recorded yet.
            </A>
          )}
        </Col>
        {canEdit && (
          <Row gap={8}>
            <View style={{ flex: 1 }}>
              <TextBox
                value={note}
                onChange={setNote}
                placeholder="Add a timeline note"
                theme={theme}
                label="Timeline note"
              />
            </View>
            <Btn
              title="Add"
              icon="plus"
              small
              theme={theme}
              onPress={() => {
                if (!note.trim()) return;
                store.update(
                  "orders",
                  order.id,
                  {
                    timeline: [
                      ...(order.timeline ?? []),
                      {
                        at: new Date().toISOString(),
                        actor: write.actor?.name ?? "System",
                        event: note.trim(),
                      },
                    ],
                  },
                  write,
                );
                setNote("");
              }}
            />
          </Row>
        )}
      </Panel>
    </AdminShell>
  );
}
