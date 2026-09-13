import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
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
  StatTile,
  Tabs,
} from "@/admin/ui/primitives";
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
  computeAlerts,
  computeMetrics,
  rangeFor,
  RANGE_PRESETS,
} from "@/admin/core/metrics";
import {
  answerQuestion,
  SAMPLE_QUESTIONS,
  salesNarrative,
} from "@/admin/core/assist";
import { COMMAND_ACTIONS } from "@/admin/core/search";
import { humanise } from "@/admin/core/format";
import { ORDER_STATUSES } from "@/admin/core/types";
import { TextBox } from "@/admin/ui/inputs";
import { go } from "@/admin/navigate";

export function OverviewScreen() {
  const { theme, data, allowed, published } = useAdmin();
  const format = useFormat();
  const layout = useLayout();
  const [preset, setPreset] = useState("30d");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<ReturnType<
    typeof answerQuestion
  > | null>(null);

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
  const alerts = useMemo(() => computeAlerts(data), [data]);
  const narrative = useMemo(() => salesNarrative(data, preset), [data, preset]);

  const recentOrders = useMemo(
    () =>
      [...data.orders]
        .sort((a, b) => String(b.placedAt).localeCompare(String(a.placedAt)))
        .slice(0, 6),
    [data.orders],
  );
  const recentCustomers = useMemo(
    () =>
      [...data.customers]
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, 5),
    [data.customers],
  );
  const recentReviews = useMemo(
    () =>
      [...data.reviews]
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, 5),
    [data.reviews],
  );
  const recentTickets = useMemo(
    () =>
      [...data.tickets]
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
        .slice(0, 5),
    [data.tickets],
  );

  const quickActions = COMMAND_ACTIONS.filter((action) =>
    [
      "new-product",
      "new-order",
      "new-coupon",
      "new-customer",
      "new-banner",
      "send-notification",
    ].includes(action.id),
  ).filter((action) => allowed(action.module, "create"));

  const statusTiles = ORDER_STATUSES.filter(
    (status) => (metrics.ordersByStatus[status] ?? 0) > 0,
  );

  return (
    <AdminShell
      title="Dashboard"
      subtitle={`${published.branding.companyName} — ${RANGE_PRESETS.find((entry) => entry.key === preset)?.label ?? ""}`}
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
          label="Total sales"
          value={format.compact(metrics.totalSales)}
          hint="All time, net of refunds"
          icon="sack-dollar"
          theme={theme}
        />
        <StatTile
          label="Sales in this period"
          value={format.compact(metrics.rangeSales)}
          delta={metrics.salesChangePercent}
          hint="vs the period before"
          icon="chart-line"
          tone={theme.primary}
          theme={theme}
        />
        <StatTile
          label="Today"
          value={format.compact(metrics.todaySales)}
          icon="calendar-day"
          theme={theme}
        />
        <StatTile
          label="This week"
          value={format.compact(metrics.weekSales)}
          icon="calendar-week"
          theme={theme}
        />
        <StatTile
          label="Last 30 days"
          value={format.compact(metrics.monthSales)}
          icon="calendar"
          theme={theme}
        />
        <StatTile
          label="This year"
          value={format.compact(metrics.yearSales)}
          icon="calendar-days"
          theme={theme}
        />
        <StatTile
          label="Average order value"
          value={format.money(metrics.averageOrderValue)}
          icon="receipt"
          theme={theme}
        />
        <StatTile
          label="Total inventory value"
          value={format.compact(metrics.inventoryValue)}
          hint={`Retail ${format.compact(metrics.inventoryRetailValue)}`}
          icon="boxes-stacked"
          theme={theme}
          onPress={() => go("/admin/inventory")}
        />
      </Grid>

      <Grid columns={layout.columns} gap={12}>
        <StatTile
          label="Total orders"
          value={format.number(metrics.totalOrders)}
          hint={`${format.number(metrics.rangeOrders)} in this period`}
          icon="receipt"
          theme={theme}
          onPress={() => go("/admin/r/orders")}
        />
        <StatTile
          label="Total customers"
          value={format.number(metrics.totalCustomers)}
          hint={`${format.number(metrics.newCustomers)} new, ${format.number(metrics.returningCustomers)} returning`}
          icon="users"
          theme={theme}
          onPress={() => go("/admin/r/customers")}
        />
        <StatTile
          label="Products"
          value={format.number(metrics.totalProducts)}
          hint={`${metrics.activeProducts} active, ${metrics.inactiveProducts} inactive`}
          icon="tag"
          theme={theme}
          onPress={() => go("/admin/r/products")}
        />
        <StatTile
          label="Stock warnings"
          value={format.number(
            metrics.outOfStockProducts + metrics.lowStockProducts,
          )}
          hint={`${metrics.outOfStockProducts} out of stock, ${metrics.lowStockProducts} low`}
          icon="triangle-exclamation"
          tone={metrics.outOfStockProducts ? theme.danger : theme.warning}
          theme={theme}
          onPress={() => go("/admin/inventory")}
        />
        <StatTile
          label="Conversion rate"
          value={`${metrics.conversionRate.toFixed(2)}%`}
          hint="Purchases per product view"
          icon="bullseye"
          theme={theme}
        />
        <StatTile
          label="Cart abandonment"
          value={`${metrics.cartAbandonmentRate.toFixed(1)}%`}
          icon="cart-shopping"
          tone={metrics.cartAbandonmentRate > 60 ? theme.danger : undefined}
          theme={theme}
          onPress={() => go("/admin/r/carts")}
        />
        <StatTile
          label="Repeat purchase rate"
          value={`${metrics.repeatPurchaseRate.toFixed(1)}%`}
          icon="rotate"
          theme={theme}
        />
        <StatTile
          label="Net profit"
          value={format.compact(metrics.netProfit)}
          hint={`${metrics.marginPercent.toFixed(1)}% margin`}
          icon="chart-pie"
          tone={metrics.netProfit >= 0 ? theme.success : theme.danger}
          theme={theme}
          onPress={() => go("/admin/finance")}
        />
      </Grid>

      {!!quickActions.length && (
        <Panel
          title="Quick actions"
          subtitle="The jobs you do most, one tap away"
        >
          <Row gap={8} wrap>
            {quickActions.map((action) => (
              <Btn
                key={action.id}
                title={action.label}
                icon={action.icon}
                small
                theme={theme}
                onPress={() => go(action.route)}
              />
            ))}
          </Row>
        </Panel>
      )}

      <Panel
        title="Order pipeline"
        subtitle="Every order by the stage it is at"
      >
        <Row gap={8} wrap>
          {statusTiles.map((status) => (
            <Pressable
              key={status}
              accessibilityRole="button"
              accessibilityLabel={`${humanise(status)}: ${metrics.ordersByStatus[status]} orders`}
              onPress={() => go("/admin/r/orders")}
              style={({ pressed }) => ({
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: theme.radius,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: pressed ? theme.background : theme.raised,
                minWidth: 118,
                gap: 3,
              })}
            >
              <A size={11} color={theme.muted}>
                {humanise(status)}
              </A>
              <A size={17} weight="700">
                {format.number(metrics.ordersByStatus[status] ?? 0)}
              </A>
            </Pressable>
          ))}
          {!statusTiles.length && (
            <A size={12} color={theme.muted}>
              No orders yet.
            </A>
          )}
        </Row>
      </Panel>

      <Panel title="Revenue" subtitle={narrative}>
        <LineChart
          series={metrics.revenueSeries}
          theme={theme}
          label="Revenue over time"
        />
      </Panel>

      <Grid columns={layout.wide ? 2 : 1} gap={12}>
        <Panel title="Orders">
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
            label="New customers over time"
          />
        </Panel>
      </Grid>

      <Grid columns={layout.wide ? 2 : 1} gap={12}>
        <Panel
          title="Top-selling products"
          subtitle="By revenue in this period"
        >
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
        <Panel
          title="Low-performing products"
          subtitle="Viewed but never bought in this period"
        >
          <RankBars
            items={metrics.lowPerformers}
            theme={theme}
            format={(value) => `${format.number(value)} views`}
            color={theme.muted}
          />
        </Panel>
        <Panel title="Conversion funnel">
          <Funnel steps={metrics.funnel} theme={theme} />
        </Panel>
      </Grid>

      <Panel
        title="Ask about your shop"
        subtitle="Plain-language questions answered from your own data"
      >
        <Row gap={8}>
          <View style={{ flex: 1 }}>
            <TextBox
              value={question}
              onChange={setQuestion}
              placeholder="Show products with low stock."
              theme={theme}
              label="Question"
            />
          </View>
          <Btn
            title="Ask"
            icon="wand-magic-sparkles"
            small
            tone="primary"
            theme={theme}
            onPress={() =>
              setAnswer(answerQuestion(question || SAMPLE_QUESTIONS[0]!, data))
            }
          />
        </Row>
        <Row gap={6} wrap>
          {SAMPLE_QUESTIONS.map((sample) => (
            <Pressable
              key={sample}
              accessibilityRole="button"
              accessibilityLabel={sample}
              onPress={() => {
                setQuestion(sample);
                setAnswer(answerQuestion(sample, data));
              }}
              style={{
                paddingVertical: 5,
                paddingHorizontal: 9,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.raised,
              }}
            >
              <A size={11} color={theme.muted}>
                {sample}
              </A>
            </Pressable>
          ))}
        </Row>
        {!!answer && (
          <Col gap={8}>
            <A size={13} weight="600">
              {answer.answer}
            </A>
            {answer.rows.slice(0, 8).map((row) => (
              <Row key={row.label} justify="space-between" gap={8}>
                <A size={12} numberOfLines={1} style={{ flex: 1 }}>
                  {row.label}
                </A>
                <A size={12} weight="600" color={theme.muted}>
                  {row.value}
                </A>
              </Row>
            ))}
            {!!answer.route && (
              <Btn
                title="Open the full view"
                icon="arrow-right"
                small
                theme={theme}
                onPress={() => go(answer.route!)}
              />
            )}
          </Col>
        )}
      </Panel>

      <Panel
        title="Needs attention"
        subtitle="Low stock, failed payments, returns, reviews and urgent tickets"
        actions={
          <Pill
            label={String(alerts.length)}
            color={alerts.length ? theme.danger : theme.success}
            theme={theme}
          />
        }
      >
        {alerts.length ? (
          <Col gap={8}>
            {alerts.slice(0, 10).map((alert) => (
              <Pressable
                key={alert.id}
                accessibilityRole="button"
                accessibilityLabel={alert.title}
                onPress={() => alert.route && go(alert.route)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  padding: 10,
                  borderRadius: theme.radius,
                  backgroundColor: pressed ? theme.background : theme.raised,
                  borderWidth: 1,
                  borderColor: theme.border,
                })}
              >
                <Icon
                  name={
                    alert.severity === "critical"
                      ? "circle-exclamation"
                      : alert.severity === "warning"
                        ? "triangle-exclamation"
                        : "circle-info"
                  }
                  size={14}
                  color={
                    alert.severity === "critical"
                      ? theme.danger
                      : alert.severity === "warning"
                        ? theme.warning
                        : theme.info
                  }
                />
                <View style={{ flex: 1 }}>
                  <A size={12.5} weight="600" numberOfLines={1}>
                    {alert.title}
                  </A>
                  <A size={11} color={theme.muted} numberOfLines={1}>
                    {alert.detail}
                  </A>
                </View>
                <Icon name="chevron-right" size={11} color={theme.muted} />
              </Pressable>
            ))}
          </Col>
        ) : (
          <EmptyState
            icon="circle-check"
            title="Nothing needs your attention"
            theme={theme}
          />
        )}
      </Panel>

      <Grid columns={layout.wide ? 2 : 1} gap={12}>
        <Panel
          title="Recent orders"
          actions={
            <Btn
              title="All orders"
              small
              theme={theme}
              onPress={() => go("/admin/r/orders")}
            />
          }
        >
          {recentOrders.length ? (
            recentOrders.map((order) => (
              <Pressable
                key={order.id}
                accessibilityRole="button"
                accessibilityLabel={`Open order ${order.number}`}
                onPress={() => go(`/admin/r/orders/${order.id}`)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Row
                  justify="space-between"
                  gap={8}
                  style={{ paddingVertical: 5 }}
                >
                  <View style={{ flex: 1 }}>
                    <A size={12.5} weight="600">
                      {order.number}
                    </A>
                    <A size={11} color={theme.muted} numberOfLines={1}>
                      {`${order.customerName} · ${format.date(order.placedAt)}`}
                    </A>
                  </View>
                  <Col gap={3} style={{ alignItems: "flex-end" }}>
                    <A size={12.5} weight="600">
                      {format.money(order.total)}
                    </A>
                    <Pill label={humanise(order.status)} theme={theme} small />
                  </Col>
                </Row>
              </Pressable>
            ))
          ) : (
            <EmptyState icon="receipt" title="No orders yet" theme={theme} />
          )}
        </Panel>

        <Panel
          title="Recent customers"
          actions={
            <Btn
              title="All customers"
              small
              theme={theme}
              onPress={() => go("/admin/r/customers")}
            />
          }
        >
          {recentCustomers.length ? (
            recentCustomers.map((customer) => (
              <Pressable
                key={customer.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${String(customer.name)}`}
                onPress={() => go(`/admin/r/customers/${customer.id}`)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Row
                  justify="space-between"
                  gap={8}
                  style={{ paddingVertical: 5 }}
                >
                  <View style={{ flex: 1 }}>
                    <A size={12.5} weight="600" numberOfLines={1}>
                      {String(customer.name)}
                    </A>
                    <A size={11} color={theme.muted} numberOfLines={1}>
                      {String(customer.email)}
                    </A>
                  </View>
                  <A size={12} color={theme.muted}>
                    {format.money(customer.totalSpent)}
                  </A>
                </Row>
              </Pressable>
            ))
          ) : (
            <EmptyState icon="users" title="No customers yet" theme={theme} />
          )}
        </Panel>

        <Panel
          title="Recent reviews"
          actions={
            <Btn
              title="Moderate"
              small
              theme={theme}
              onPress={() => go("/admin/r/reviews")}
            />
          }
        >
          {recentReviews.length ? (
            recentReviews.map((review) => (
              <Row
                key={review.id}
                justify="space-between"
                gap={8}
                style={{ paddingVertical: 5 }}
              >
                <View style={{ flex: 1 }}>
                  <A size={12.5} numberOfLines={1}>
                    {String(review.title || review.body || "Review")}
                  </A>
                  <A size={11} color={theme.muted}>
                    {format.resolve("products", review.productId)}
                  </A>
                </View>
                <Row gap={6}>
                  <A size={12} weight="600">{`${review.rating}★`}</A>
                  <Pill label={humanise(review.status)} theme={theme} small />
                </Row>
              </Row>
            ))
          ) : (
            <EmptyState icon="star" title="No reviews yet" theme={theme} />
          )}
        </Panel>

        <Panel
          title="Recent support requests"
          actions={
            <Btn
              title="Support"
              small
              theme={theme}
              onPress={() => go("/admin/r/tickets")}
            />
          }
        >
          {recentTickets.length ? (
            recentTickets.map((ticket) => (
              <Pressable
                key={ticket.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${String(ticket.subject)}`}
                onPress={() => go(`/admin/r/tickets/${ticket.id}`)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Row
                  justify="space-between"
                  gap={8}
                  style={{ paddingVertical: 5 }}
                >
                  <A size={12.5} numberOfLines={1} style={{ flex: 1 }}>
                    {String(ticket.subject)}
                  </A>
                  <Pill label={humanise(ticket.priority)} theme={theme} small />
                </Row>
              </Pressable>
            ))
          ) : (
            <EmptyState
              icon="headset"
              title="No support requests"
              theme={theme}
            />
          )}
        </Panel>
      </Grid>

      <Panel
        title="Payment mix"
        subtitle="Revenue by payment method in this period"
      >
        <DonutChart
          items={metrics.paymentMix}
          theme={theme}
          label="Revenue by payment method"
        />
      </Panel>
    </AdminShell>
  );
}
