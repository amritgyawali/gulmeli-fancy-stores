import { useMemo, useState } from "react";
import { View } from "react-native";
import { AdminShell, Panel } from "@/admin/ui/Shell";
import { A, Btn, Col, Grid, Row, StatTile, Tabs } from "@/admin/ui/primitives";
import { LineChart, RankBars } from "@/admin/ui/Charts";
import { useLayout } from "@/admin/ui/theme";
import { useAdmin } from "@/admin/AdminProvider";
import { useFormat } from "@/admin/ui/useFormat";
import {
  computeMetrics,
  earningOrders,
  inRange,
  orderCost,
  orderRevenue,
  rangeFor,
  RANGE_PRESETS,
  sumBy,
} from "@/admin/core/metrics";
import { go } from "@/admin/navigate";

export function FinanceScreen() {
  const { theme, data } = useAdmin();
  const format = useFormat();
  const layout = useLayout();
  const [preset, setPreset] = useState("30d");

  const range = useMemo(() => rangeFor(preset), [preset]);
  const bucket =
    preset === "year" || preset === "all"
      ? "month"
      : preset === "90d"
        ? "week"
        : "day";
  const metrics = useMemo(
    () => computeMetrics(data, range, new Date(), bucket),
    [data, range, bucket],
  );

  const orders = useMemo(
    () =>
      earningOrders(
        data.orders.filter((order) => inRange(order.placedAt, range)),
      ),
    [data.orders, range],
  );

  const profitByProduct = useMemo(() => {
    const byProduct = new Map<string, { label: string; value: number }>();
    for (const order of orders) {
      for (const line of order.lines ?? []) {
        const entry = byProduct.get(line.productId) ?? {
          label: line.name,
          value: 0,
        };
        entry.value +=
          ((Number(line.unitPrice) || 0) - (Number(line.costPrice) || 0)) *
          (Number(line.quantity) || 0);
        byProduct.set(line.productId, entry);
      }
    }
    return [...byProduct.entries()]
      .map(([id, entry]) => ({
        id,
        label: entry.label,
        value: Math.round(entry.value),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [orders]);

  const profitByCategory = useMemo(() => {
    const productCategory = new Map(
      data.products.map((product) => [product.id, product.categoryId]),
    );
    const names = new Map(
      data.categories.map((category) => [
        category.id,
        String(category.name ?? ""),
      ]),
    );
    const byCategory = new Map<string, number>();
    for (const order of orders) {
      for (const line of order.lines ?? []) {
        const categoryId = String(
          productCategory.get(line.productId) ?? "uncategorised",
        );
        const profit =
          ((Number(line.unitPrice) || 0) - (Number(line.costPrice) || 0)) *
          (Number(line.quantity) || 0);
        byCategory.set(categoryId, (byCategory.get(categoryId) ?? 0) + profit);
      }
    }
    return [...byCategory.entries()]
      .map(([id, value]) => ({
        id,
        label: names.get(id) ?? "Uncategorised",
        value: Math.round(value),
      }))
      .sort((a, b) => b.value - a.value);
  }, [orders, data.products, data.categories]);

  const expensesByCategory = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const expense of data.expenses.filter((entry) =>
      inRange(entry.spentAt ?? entry.createdAt, range),
    )) {
      const key = String(expense.category ?? "other");
      byCategory.set(
        key,
        (byCategory.get(key) ?? 0) + (Number(expense.amount) || 0),
      );
    }
    return [...byCategory.entries()]
      .map(([id, value]) => ({ id, label: id, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [data.expenses, range]);

  const profitSeries = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const order of orders) {
      const key = String(order.placedAt).slice(0, 10);
      byDay.set(
        key,
        (byDay.get(key) ?? 0) + orderRevenue(order) - orderCost(order),
      );
    }
    return [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => ({
        at: key,
        label: key.slice(5),
        value: Math.round(value),
      }));
  }, [orders]);

  const lines: [string, number, string?][] = [
    ["Revenue", metrics.grossRevenue],
    ["Cost of goods", -metrics.costOfGoods],
    ["Gross profit", metrics.grossProfit, "strong"],
    ["Discounts given", -metrics.discountsGiven],
    ["Shipping collected", metrics.shippingCollected],
    ["Tax collected", metrics.taxCollected],
    ["Refunds", -metrics.refundsIssued],
    ["Payment fees", -metrics.paymentFees],
    ["Expenses", -metrics.expensesTotal],
    ["Net profit", metrics.netProfit, "strong"],
  ];

  return (
    <AdminShell
      title="Finance"
      subtitle="Revenue, cost of goods, expenses and what is actually left"
      actions={
        <Row gap={6}>
          <Btn
            title="Expenses"
            icon="money-bill"
            small
            theme={theme}
            onPress={() => go("/admin/r/expenses")}
          />
          <Btn
            title="Reports"
            icon="file-csv"
            small
            theme={theme}
            onPress={() => go("/admin/reports")}
          />
        </Row>
      }
    >
      <Tabs
        tabs={RANGE_PRESETS.map((entry) => ({
          key: entry.key,
          label: entry.label,
        }))}
        active={preset}
        onChange={setPreset}
        theme={theme}
      />

      <Grid columns={layout.columns} gap={12}>
        <StatTile
          label="Revenue"
          value={format.compact(metrics.grossRevenue)}
          icon="chart-line"
          theme={theme}
        />
        <StatTile
          label="Gross profit"
          value={format.compact(metrics.grossProfit)}
          icon="sack-dollar"
          tone={metrics.grossProfit >= 0 ? theme.success : theme.danger}
          theme={theme}
        />
        <StatTile
          label="Net profit"
          value={format.compact(metrics.netProfit)}
          hint={`${metrics.marginPercent.toFixed(1)}% margin`}
          icon="chart-pie"
          tone={metrics.netProfit >= 0 ? theme.success : theme.danger}
          theme={theme}
        />
        <StatTile
          label="Expenses"
          value={format.compact(metrics.expensesTotal)}
          icon="money-bill"
          theme={theme}
        />
      </Grid>

      <Panel
        title="Profit and loss"
        subtitle="Every line that moves the bottom line"
      >
        <Col gap={7}>
          {lines.map(([label, value, strong]) => (
            <Row key={label} justify="space-between">
              <A
                size={strong ? 13 : 12}
                weight={strong ? "700" : "400"}
                color={theme.text}
              >
                {label}
              </A>
              <A
                size={strong ? 13 : 12}
                weight={strong ? "700" : "500"}
                color={
                  value < 0 ? theme.danger : strong ? theme.success : theme.text
                }
              >
                {format.money(value)}
              </A>
            </Row>
          ))}
        </Col>
      </Panel>

      <Panel title="Gross profit over time">
        <LineChart
          series={profitSeries}
          theme={theme}
          color={theme.success}
          label="Gross profit over time"
        />
      </Panel>

      <Grid columns={layout.wide ? 2 : 1} gap={12}>
        <Panel title="Profit per product">
          <RankBars
            items={profitByProduct}
            theme={theme}
            format={(value) => format.money(value)}
          />
        </Panel>
        <Panel title="Profit per category">
          <RankBars
            items={profitByCategory}
            theme={theme}
            format={(value) => format.money(value)}
          />
        </Panel>
        <Panel title="Expenses by category">
          <RankBars
            items={expensesByCategory}
            theme={theme}
            format={(value) => format.money(value)}
            color={theme.warning}
          />
        </Panel>
        <Panel title="Most profitable orders">
          <RankBars
            items={orders
              .map((order) => ({
                id: order.id,
                label: `${order.number} — ${order.customerName}`,
                value: Math.round(orderRevenue(order) - orderCost(order)),
              }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 8)}
            theme={theme}
            format={(value) => format.money(value)}
          />
        </Panel>
      </Grid>

      <Panel title="Inventory position">
        <Row justify="space-between">
          <A size={12} color={theme.muted}>
            Stock at cost
          </A>
          <A size={12} weight="600">
            {format.money(metrics.inventoryValue)}
          </A>
        </Row>
        <Row justify="space-between">
          <A size={12} color={theme.muted}>
            Stock at retail
          </A>
          <A size={12} weight="600">
            {format.money(metrics.inventoryRetailValue)}
          </A>
        </Row>
        <Row justify="space-between">
          <A size={12} color={theme.muted}>
            Unrealised margin
          </A>
          <A size={12} weight="600" color={theme.success}>
            {format.money(
              metrics.inventoryRetailValue - metrics.inventoryValue,
            )}
          </A>
        </Row>
        <Row justify="space-between">
          <A size={12} color={theme.muted}>
            Supplier balances
          </A>
          <A size={12} weight="600">
            {format.money(sumBy(data.expenses, () => 0))}
          </A>
        </Row>
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <Btn
          title="Suppliers & purchase orders"
          icon="industry"
          small
          theme={theme}
          onPress={() => go("/admin/r/suppliers")}
        />
      </Panel>
    </AdminShell>
  );
}
