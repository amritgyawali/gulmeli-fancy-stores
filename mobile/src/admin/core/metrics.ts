import {
  REVENUE_STATUSES,
  type AdminOrder,
  type AdminProduct,
  type AdminRecord,
} from "./types.ts";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface SeriesPoint {
  label: string;
  /** Bucket start, so a chart can sort without re-parsing the label. */
  at: string;
  value: number;
}

export interface RankedItem {
  id: string;
  label: string;
  value: number;
  secondary?: number;
}

export interface DashboardData {
  orders: AdminOrder[];
  products: AdminProduct[];
  customers: AdminRecord[];
  carts: AdminRecord[];
  returns: AdminRecord[];
  transactions: AdminRecord[];
  reviews: AdminRecord[];
  tickets: AdminRecord[];
  categories: AdminRecord[];
  expenses: AdminRecord[];
}

export const emptyDashboardData: DashboardData = {
  orders: [],
  products: [],
  customers: [],
  carts: [],
  returns: [],
  transactions: [],
  reviews: [],
  tickets: [],
  categories: [],
  expenses: [],
};

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function daysAgo(days: number, from = new Date()): Date {
  const copy = new Date(from);
  copy.setDate(copy.getDate() - days);
  return startOfDay(copy);
}

export function rangeFor(preset: string, now = new Date()): DateRange {
  const to = endOfDay(now);
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to };
    case "yesterday": {
      const day = daysAgo(1, now);
      return { from: day, to: endOfDay(day) };
    }
    case "7d":
      return { from: daysAgo(6, now), to };
    case "90d":
      return { from: daysAgo(89, now), to };
    case "year": {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from: startOfDay(from), to };
    }
    case "all":
      return { from: new Date(0), to };
    case "30d":
    default:
      return { from: daysAgo(29, now), to };
  }
}

export const RANGE_PRESETS: { key: string; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
];

function timeOf(value: unknown): number {
  const time = Date.parse(String(value ?? ""));
  return Number.isNaN(time) ? 0 : time;
}

export function inRange(value: unknown, range: DateRange): boolean {
  const time = timeOf(value);
  return time >= range.from.getTime() && time <= range.to.getTime();
}

/** Orders that count as earned revenue: not cancelled, failed or refunded. */
export function earningOrders(orders: AdminOrder[]): AdminOrder[] {
  return orders.filter((order) => REVENUE_STATUSES.includes(order.status));
}

export function sumBy<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => {
    const value = pick(item);
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);
}

export function orderRevenue(order: AdminOrder): number {
  const total = Number(order.total) || 0;
  const refunded = Number(order.refundedTotal) || 0;
  return Math.max(0, total - refunded);
}

export function orderCost(order: AdminOrder): number {
  return sumBy(
    order.lines ?? [],
    (line) => (Number(line.costPrice) || 0) * (Number(line.quantity) || 0),
  );
}

/** Buckets a series by day, week or month, filling gaps with zero. */
export function buildSeries(
  records: { at: unknown; value: number }[],
  range: DateRange,
  bucket: "day" | "week" | "month" = "day",
): SeriesPoint[] {
  const points = new Map<string, { at: Date; value: number }>();
  const keyFor = (date: Date): string => {
    if (bucket === "month")
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (bucket === "week") {
      const monday = new Date(date);
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      return monday.toISOString().slice(0, 10);
    }
    return date.toISOString().slice(0, 10);
  };
  const startOfBucket = (date: Date): Date => {
    if (bucket === "month")
      return new Date(date.getFullYear(), date.getMonth(), 1);
    if (bucket === "week") {
      const monday = startOfDay(date);
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      return monday;
    }
    return startOfDay(date);
  };

  const span = range.to.getTime() - range.from.getTime();
  const start =
    span > 0 && span < 30 * 365 * 86_400_000 ? new Date(range.from) : null;
  if (start) {
    let cursor = startOfBucket(start);
    let guard = 0;
    while (cursor.getTime() <= range.to.getTime() && guard < 400) {
      points.set(keyFor(cursor), { at: new Date(cursor), value: 0 });
      if (bucket === "month")
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      else if (bucket === "week")
        cursor = new Date(cursor.getTime() + 7 * 86_400_000);
      else cursor = new Date(cursor.getTime() + 86_400_000);
      guard += 1;
    }
  }

  for (const record of records) {
    const time = timeOf(record.at);
    if (!time) continue;
    const date = new Date(time);
    if (date < range.from || date > range.to) continue;
    const key = keyFor(date);
    const existing = points.get(key) ?? { at: startOfBucket(date), value: 0 };
    existing.value += record.value;
    points.set(key, existing);
  }

  return [...points.entries()]
    .sort((a, b) => a[1].at.getTime() - b[1].at.getTime())
    .map(([key, point]) => ({
      at: point.at.toISOString(),
      label: bucket === "month" ? key : key.slice(5),
      value: Math.round(point.value * 100) / 100,
    }));
}

export interface Metrics {
  totalSales: number;
  todaySales: number;
  weekSales: number;
  monthSales: number;
  yearSales: number;
  rangeSales: number;
  previousRangeSales: number;
  salesChangePercent: number;

  totalOrders: number;
  rangeOrders: number;
  ordersByStatus: Record<string, number>;

  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  blockedCustomers: number;

  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  outOfStockProducts: number;
  lowStockProducts: number;
  inventoryValue: number;
  inventoryRetailValue: number;

  averageOrderValue: number;
  conversionRate: number;
  cartAbandonmentRate: number;
  repeatPurchaseRate: number;

  grossRevenue: number;
  costOfGoods: number;
  grossProfit: number;
  discountsGiven: number;
  shippingCollected: number;
  taxCollected: number;
  refundsIssued: number;
  paymentFees: number;
  expensesTotal: number;
  netProfit: number;
  marginPercent: number;

  revenueSeries: SeriesPoint[];
  ordersSeries: SeriesPoint[];
  customerSeries: SeriesPoint[];

  topProducts: RankedItem[];
  lowPerformers: RankedItem[];
  topCategories: RankedItem[];
  paymentMix: RankedItem[];
  channelMix: RankedItem[];

  funnel: { label: string; value: number }[];
}

const ZERO_STATUSES: Record<string, number> = {};

/** Everything the Overview, Analytics and Finance screens show. */
export function computeMetrics(
  data: DashboardData,
  range: DateRange,
  now = new Date(),
  bucket: "day" | "week" | "month" = "day",
): Metrics {
  const {
    orders,
    products,
    customers,
    carts,
    returns,
    transactions,
    categories,
    expenses,
  } = data;

  const earning = earningOrders(orders);
  const rangeOrdersList = orders.filter((order) =>
    inRange(order.placedAt, range),
  );
  const rangeEarning = earningOrders(rangeOrdersList);

  const span = Math.max(1, range.to.getTime() - range.from.getTime());
  const previousRange: DateRange = {
    from: new Date(range.from.getTime() - span),
    to: new Date(range.from.getTime() - 1),
  };
  const previousEarning = earningOrders(
    orders.filter((order) => inRange(order.placedAt, previousRange)),
  );

  const today = { from: startOfDay(now), to: endOfDay(now) };
  const week = { from: daysAgo(6, now), to: endOfDay(now) };
  const month = { from: daysAgo(29, now), to: endOfDay(now) };
  const year = {
    from: startOfDay(new Date(now.getFullYear(), 0, 1)),
    to: endOfDay(now),
  };

  const ordersByStatus: Record<string, number> = { ...ZERO_STATUSES };
  for (const order of orders) {
    const status = String(order.status);
    ordersByStatus[status] = (ordersByStatus[status] ?? 0) + 1;
  }

  const totalSales = sumBy(earning, orderRevenue);
  const rangeSales = sumBy(rangeEarning, orderRevenue);
  const previousRangeSales = sumBy(previousEarning, orderRevenue);

  const liveProducts = products.filter((product) => !product.deletedAt);
  const activeProducts = liveProducts.filter(
    (product) => product.status === "published",
  );
  const outOfStock = liveProducts.filter(
    (product) => !product.unlimitedStock && Number(product.stock) <= 0,
  );
  const lowStock = liveProducts.filter(
    (product) =>
      !product.unlimitedStock &&
      Number(product.stock) > 0 &&
      Number(product.stock) <= Number(product.lowStockThreshold ?? 5),
  );

  const customerOrderCounts = new Map<string, number>();
  for (const order of earning) {
    const key = order.customerId ?? order.customerEmail;
    if (!key) continue;
    customerOrderCounts.set(key, (customerOrderCounts.get(key) ?? 0) + 1);
  }
  const repeatCustomers = [...customerOrderCounts.values()].filter(
    (count) => count > 1,
  ).length;

  const abandonedCarts = carts.filter(
    (cart) => cart.state === "abandoned",
  ).length;
  const totalCarts = carts.length;

  const productViews = sumBy(
    liveProducts,
    (product) => Number(product.views) || 0,
  );

  const revenueByProduct = new Map<
    string,
    { label: string; value: number; units: number }
  >();
  for (const order of rangeEarning) {
    for (const line of order.lines ?? []) {
      const entry = revenueByProduct.get(line.productId) ?? {
        label: line.name,
        value: 0,
        units: 0,
      };
      entry.value +=
        (Number(line.unitPrice) || 0) * (Number(line.quantity) || 0);
      entry.units += Number(line.quantity) || 0;
      revenueByProduct.set(line.productId, entry);
    }
  }

  const categoryNames = new Map(
    categories.map((category) => [category.id, String(category.name ?? "")]),
  );
  const productCategory = new Map(
    liveProducts.map((product) => [product.id, product.categoryId]),
  );
  const revenueByCategory = new Map<string, number>();
  for (const [productId, entry] of revenueByProduct) {
    const categoryId = productCategory.get(productId);
    const key = typeof categoryId === "string" ? categoryId : "uncategorised";
    revenueByCategory.set(key, (revenueByCategory.get(key) ?? 0) + entry.value);
  }

  const paymentMix = new Map<string, number>();
  for (const order of rangeEarning) {
    const key = String(order.paymentMethod || "Unspecified");
    paymentMix.set(key, (paymentMix.get(key) ?? 0) + orderRevenue(order));
  }

  const channelMix = new Map<string, number>();
  for (const order of rangeEarning) {
    const key = String(order.channel || "app");
    channelMix.set(key, (channelMix.get(key) ?? 0) + 1);
  }

  const costOfGoods = sumBy(rangeEarning, orderCost);
  const discountsGiven = sumBy(
    rangeEarning,
    (order) => Number(order.discountTotal) || 0,
  );
  const shippingCollected = sumBy(
    rangeEarning,
    (order) => Number(order.shippingTotal) || 0,
  );
  const taxCollected = sumBy(
    rangeEarning,
    (order) => Number(order.taxTotal) || 0,
  );
  const refundsIssued =
    sumBy(rangeOrdersList, (order) => Number(order.refundedTotal) || 0) +
    sumBy(
      returns.filter(
        (entry) =>
          inRange(entry.createdAt, range) && entry.status === "completed",
      ),
      (entry) => Number(entry.refundAmount) || 0,
    );
  const paymentFees = sumBy(
    transactions.filter((entry) => inRange(entry.createdAt, range)),
    (entry) => Number(entry.fee) || 0,
  );
  const expensesTotal = sumBy(
    expenses.filter((entry) =>
      inRange(entry.spentAt ?? entry.createdAt, range),
    ),
    (entry) => Number(entry.amount) || 0,
  );
  const grossProfit = rangeSales - costOfGoods;
  const netProfit = grossProfit - refundsIssued - paymentFees - expensesTotal;

  const ranked = (
    map: Map<string, { label: string; value: number; units: number }>,
  ) =>
    [...map.entries()].map(([id, entry]) => ({
      id,
      label: entry.label,
      value: Math.round(entry.value),
      secondary: entry.units,
    }));

  const rankedProducts = ranked(revenueByProduct).sort(
    (a, b) => b.value - a.value,
  );
  const sellingProductIds = new Set(rankedProducts.map((entry) => entry.id));
  const lowPerformers: RankedItem[] = liveProducts
    .filter((product) => !sellingProductIds.has(product.id))
    .map((product) => ({
      id: product.id,
      label: String(product.name),
      value: Number(product.views) || 0,
      secondary: Number(product.addToCartCount) || 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const addToCart = sumBy(
    liveProducts,
    (product) => Number(product.addToCartCount) || 0,
  );
  const purchases = rangeEarning.length;

  return {
    totalSales,
    todaySales: sumBy(
      earningOrders(orders.filter((order) => inRange(order.placedAt, today))),
      orderRevenue,
    ),
    weekSales: sumBy(
      earningOrders(orders.filter((order) => inRange(order.placedAt, week))),
      orderRevenue,
    ),
    monthSales: sumBy(
      earningOrders(orders.filter((order) => inRange(order.placedAt, month))),
      orderRevenue,
    ),
    yearSales: sumBy(
      earningOrders(orders.filter((order) => inRange(order.placedAt, year))),
      orderRevenue,
    ),
    rangeSales,
    previousRangeSales,
    salesChangePercent:
      previousRangeSales > 0
        ? ((rangeSales - previousRangeSales) / previousRangeSales) * 100
        : rangeSales > 0
          ? 100
          : 0,

    totalOrders: orders.length,
    rangeOrders: rangeOrdersList.length,
    ordersByStatus,

    totalCustomers: customers.length,
    newCustomers: customers.filter((customer) =>
      inRange(customer.createdAt, range),
    ).length,
    returningCustomers: repeatCustomers,
    blockedCustomers: customers.filter((customer) => customer.blocked === true)
      .length,

    totalProducts: liveProducts.length,
    activeProducts: activeProducts.length,
    inactiveProducts: liveProducts.length - activeProducts.length,
    outOfStockProducts: outOfStock.length,
    lowStockProducts: lowStock.length,
    inventoryValue: sumBy(
      liveProducts,
      (product) =>
        (Number(product.costPrice) || 0) *
        Math.max(0, Number(product.stock) || 0),
    ),
    inventoryRetailValue: sumBy(
      liveProducts,
      (product) =>
        (Number(product.price) || 0) * Math.max(0, Number(product.stock) || 0),
    ),

    averageOrderValue: rangeEarning.length
      ? rangeSales / rangeEarning.length
      : 0,
    conversionRate: productViews > 0 ? (purchases / productViews) * 100 : 0,
    cartAbandonmentRate:
      totalCarts > 0 ? (abandonedCarts / totalCarts) * 100 : 0,
    repeatPurchaseRate: customerOrderCounts.size
      ? (repeatCustomers / customerOrderCounts.size) * 100
      : 0,

    grossRevenue: rangeSales,
    costOfGoods,
    grossProfit,
    discountsGiven,
    shippingCollected,
    taxCollected,
    refundsIssued,
    paymentFees,
    expensesTotal,
    netProfit,
    marginPercent: rangeSales > 0 ? (netProfit / rangeSales) * 100 : 0,

    revenueSeries: buildSeries(
      rangeEarning.map((order) => ({
        at: order.placedAt,
        value: orderRevenue(order),
      })),
      range,
      bucket,
    ),
    ordersSeries: buildSeries(
      rangeOrdersList.map((order) => ({ at: order.placedAt, value: 1 })),
      range,
      bucket,
    ),
    customerSeries: buildSeries(
      customers.map((customer) => ({ at: customer.createdAt, value: 1 })),
      range,
      bucket,
    ),

    topProducts: rankedProducts.slice(0, 8),
    lowPerformers,
    topCategories: [...revenueByCategory.entries()]
      .map(([id, value]) => ({
        id,
        label: categoryNames.get(id) ?? "Uncategorised",
        value: Math.round(value),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    paymentMix: [...paymentMix.entries()]
      .map(([id, value]) => ({ id, label: id, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value),
    channelMix: [...channelMix.entries()]
      .map(([id, value]) => ({ id, label: id, value }))
      .sort((a, b) => b.value - a.value),

    funnel: [
      { label: "Product views", value: productViews },
      { label: "Added to cart", value: addToCart },
      { label: "Checkout started", value: totalCarts },
      { label: "Purchased", value: purchases },
    ],
  };
}

export interface Alert {
  id: string;
  kind:
    | "low_stock"
    | "out_of_stock"
    | "failed_payment"
    | "return"
    | "review"
    | "ticket"
    | "error";
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  route?: string;
}

/** The alert feed on the Overview screen. */
export function computeAlerts(data: DashboardData): Alert[] {
  const alerts: Alert[] = [];

  for (const product of data.products) {
    if (product.deletedAt || product.unlimitedStock) continue;
    const stock = Number(product.stock) || 0;
    const threshold = Number(product.lowStockThreshold ?? 5);
    if (stock <= 0) {
      alerts.push({
        id: `oos-${product.id}`,
        kind: "out_of_stock",
        severity: "critical",
        title: `${product.name} is out of stock`,
        detail: "Customers cannot order it until it is restocked.",
        route: `/admin/r/products/${product.id}`,
      });
    } else if (stock <= threshold) {
      alerts.push({
        id: `low-${product.id}`,
        kind: "low_stock",
        severity: "warning",
        title: `${product.name} is low on stock`,
        detail: `${stock} left, alert set at ${threshold}.`,
        route: `/admin/r/products/${product.id}`,
      });
    }
  }

  for (const transaction of data.transactions) {
    if (transaction.status !== "failed") continue;
    alerts.push({
      id: `pay-${transaction.id}`,
      kind: "failed_payment",
      severity: "critical",
      title: `Payment failed on ${String(transaction.gateway ?? "a gateway")}`,
      detail: String(
        transaction.failureReason || "No reason was returned by the gateway.",
      ),
      route: `/admin/r/transactions/${transaction.id}`,
    });
  }

  for (const entry of data.returns) {
    if (entry.status !== "requested") continue;
    alerts.push({
      id: `ret-${entry.id}`,
      kind: "return",
      severity: "warning",
      title: `Return ${String(entry.number ?? "")} needs a decision`,
      detail: `Reason: ${String(entry.reason ?? "unspecified")}.`,
      route: `/admin/r/returns/${entry.id}`,
    });
  }

  for (const review of data.reviews) {
    if (review.status !== "pending") continue;
    alerts.push({
      id: `rev-${review.id}`,
      kind: "review",
      severity: "info",
      title: "A review is waiting for moderation",
      detail: String(review.title || review.body || ""),
      route: `/admin/r/reviews/${review.id}`,
    });
  }

  for (const ticket of data.tickets) {
    if (ticket.status !== "open" || ticket.priority !== "urgent") continue;
    alerts.push({
      id: `tic-${ticket.id}`,
      kind: "ticket",
      severity: "critical",
      title: `Urgent ticket: ${String(ticket.subject ?? "")}`,
      detail: "Marked urgent and still open.",
      route: `/admin/r/tickets/${ticket.id}`,
    });
  }

  const weight = { critical: 0, warning: 1, info: 2 } as const;
  return alerts
    .sort((a, b) => weight[a.severity] - weight[b.severity])
    .slice(0, 40);
}
