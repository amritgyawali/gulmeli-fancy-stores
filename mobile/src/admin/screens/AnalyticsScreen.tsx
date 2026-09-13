import { useMemo, useState } from "react";
import { AdminShell, Panel } from "@/admin/ui/Shell";
import { A, Btn, Grid, Row, StatTile, Tabs } from "@/admin/ui/primitives";
import {
  BarChart,
  DonutChart,
  Funnel,
  LineChart,
  RankBars,
} from "@/admin/ui/Charts";
import { useLayout } from "@/admin/ui/theme";
import { useAdmin } from "@/admin/AdminProvider";
import { useFormat } from "@/admin/ui/useFormat";
import {
  computeMetrics,
  rangeFor,
  RANGE_PRESETS,
  sumBy,
} from "@/admin/core/metrics";
import { humanise } from "@/admin/core/format";
import { go } from "@/admin/navigate";

export function AnalyticsScreen() {
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

  const geography = useMemo(() => {
    const byPlace = new Map<string, number>();
    for (const order of data.orders) {
      const place = String(
        order.shippingAddress?.city ||
          order.shippingAddress?.district ||
          "Unknown",
      );
      byPlace.set(
        place,
        (byPlace.get(place) ?? 0) + (Number(order.total) || 0),
      );
    }
    return [...byPlace.entries()]
      .map(([id, value]) => ({ id, label: id, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [data.orders]);

  const discountImpact = useMemo(
    () => sumBy(data.orders, (order) => Number(order.discountTotal) || 0),
    [data.orders],
  );

  return (
    <AdminShell
      title="Analytics"
      subtitle="Revenue, orders, customers, products, geography and the conversion funnel"
      actions={
        <Btn
          title="Reports"
          icon="file-csv"
          small
          theme={theme}
          onPress={() => go("/admin/reports")}
        />
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
          delta={metrics.salesChangePercent}
          icon="chart-line"
          theme={theme}
        />
        <StatTile
          label="Cost of goods"
          value={format.compact(metrics.costOfGoods)}
          icon="boxes-stacked"
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
          label="Orders"
          value={format.number(metrics.rangeOrders)}
          icon="receipt"
          theme={theme}
        />
        <StatTile
          label="New customers"
          value={format.number(metrics.newCustomers)}
          icon="user-plus"
          theme={theme}
        />
        <StatTile
          label="Repeat purchase rate"
          value={`${metrics.repeatPurchaseRate.toFixed(1)}%`}
          icon="rotate"
          theme={theme}
        />
        <StatTile
          label="Discounts given"
          value={format.compact(discountImpact)}
          icon="ticket"
          theme={theme}
        />
        <StatTile
          label="Refunds"
          value={format.compact(metrics.refundsIssued)}
          icon="rotate-left"
          theme={theme}
        />
        <StatTile
          label="Shipping collected"
          value={format.compact(metrics.shippingCollected)}
          icon="truck"
          theme={theme}
        />
        <StatTile
          label="Tax collected"
          value={format.compact(metrics.taxCollected)}
          icon="percent"
          theme={theme}
        />
        <StatTile
          label="Conversion rate"
          value={`${metrics.conversionRate.toFixed(2)}%`}
          icon="bullseye"
          theme={theme}
        />
        <StatTile
          label="Cart abandonment"
          value={`${metrics.cartAbandonmentRate.toFixed(1)}%`}
          icon="cart-shopping"
          theme={theme}
        />
      </Grid>

      <Panel title="Revenue over time">
        <LineChart
          series={metrics.revenueSeries}
          theme={theme}
          label="Revenue over time"
        />
      </Panel>

      <Grid columns={layout.wide ? 2 : 1} gap={12}>
        <Panel title="Orders over time">
          <BarChart
            series={metrics.ordersSeries}
            theme={theme}
            label="Orders over time"
          />
        </Panel>
        <Panel title="Customer growth">
          <LineChart
            series={metrics.customerSeries}
            theme={theme}
            color={theme.info}
            label="Customer growth"
          />
        </Panel>
        <Panel title="Conversion funnel" subtitle="Views to purchase">
          <Funnel steps={metrics.funnel} theme={theme} />
        </Panel>
        <Panel title="Payment methods">
          <DonutChart
            items={metrics.paymentMix}
            theme={theme}
            label="Revenue by payment method"
          />
        </Panel>
        <Panel title="Top products">
          <RankBars
            items={metrics.topProducts}
            theme={theme}
            format={(value) => format.money(value)}
          />
        </Panel>
        <Panel title="Top categories">
          <RankBars
            items={metrics.topCategories}
            theme={theme}
            format={(value) => format.money(value)}
          />
        </Panel>
        <Panel title="Where orders come from" subtitle="By delivery city">
          <RankBars
            items={geography}
            theme={theme}
            format={(value) => format.money(value)}
          />
        </Panel>
        <Panel title="Channels">
          <DonutChart
            items={metrics.channelMix.map((entry) => ({
              ...entry,
              label: humanise(entry.label),
            }))}
            theme={theme}
            label="Orders by channel"
          />
        </Panel>
      </Grid>

      <Panel
        title="Products that need attention"
        subtitle="Seen by customers but not bought in this period"
      >
        <RankBars
          items={metrics.lowPerformers}
          theme={theme}
          format={(value) => `${format.number(value)} views`}
          color={theme.muted}
        />
      </Panel>

      <Row gap={8}>
        <A size={11.5} color={theme.muted}>
          Traffic sources and device breakdown need an analytics integration;
          connect one under Integrations.
        </A>
      </Row>
    </AdminShell>
  );
}
