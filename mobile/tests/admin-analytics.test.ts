import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSeries,
  computeAlerts,
  computeMetrics,
  emptyDashboardData,
  rangeFor,
  type DashboardData,
} from "../src/admin/core/metrics.ts";
import {
  REPORTS,
  reportByKey,
  reportToCsv,
} from "../src/admin/core/reports.ts";
import { parseCsv, toCsv } from "../src/admin/core/csv.ts";
import {
  answerQuestion,
  inventoryForecast,
  localAssist,
} from "../src/admin/core/assist.ts";
import {
  evaluateAutomations,
  type AutomationRule,
} from "../src/admin/core/automation.ts";
import {
  BUILT_IN_ROLES,
  can,
  setModulePermissions,
  togglePermission,
  type PermissionMap,
  type RoleRecord,
} from "../src/admin/core/rbac.ts";
import type {
  AdminOrder,
  AdminProduct,
  AdminRecord,
} from "../src/admin/core/types.ts";

const NOW = new Date("2026-05-20T12:00:00.000Z");

function stamp(daysAgo: number): string {
  return new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString();
}

function bones(id: string, createdAt: string) {
  return { id, createdAt, updatedAt: createdAt, deletedAt: null, revision: 1 };
}

function order(
  id: string,
  daysAgo: number,
  status: AdminOrder["status"],
  total: number,
  cost: number,
): AdminOrder {
  return {
    ...bones(id, stamp(daysAgo)),
    number: id.toUpperCase(),
    customerId: "c1",
    customerName: "Sita Sharma",
    customerEmail: "sita@example.com",
    guest: false,
    status,
    paymentStatus: "paid",
    paymentMethod: "Khalti",
    lines: [
      {
        productId: "p1",
        name: "Belt",
        sku: "SKU1",
        quantity: 1,
        unitPrice: total,
        costPrice: cost,
        discount: 0,
        tax: 0,
      },
    ],
    subtotal: total,
    discountTotal: 0,
    shippingTotal: 0,
    taxTotal: 0,
    refundedTotal: 0,
    total,
    shippingAddress: {},
    billingAddress: {},
    placedAt: stamp(daysAgo),
    timeline: [],
    channel: "app",
  };
}

function product(
  id: string,
  stock: number,
  extra: Partial<AdminProduct> = {},
): AdminProduct {
  return {
    ...bones(id, stamp(100)),
    name: `Product ${id}`,
    slug: id,
    sku: id.toUpperCase(),
    status: "published",
    price: 500,
    costPrice: 300,
    stock,
    lowStockThreshold: 5,
    unlimitedStock: false,
    categoryId: "cat1",
    collectionIds: [],
    images: [],
    variants: [],
    views: 100,
    addToCartCount: 10,
    purchaseCount: 5,
    returnCount: 0,
    ...extra,
  } as AdminProduct;
}

function data(overrides: Partial<DashboardData> = {}): DashboardData {
  return { ...emptyDashboardData, ...overrides };
}

test("revenue only counts orders that were not cancelled, failed or refunded", () => {
  const orders = [
    order("o1", 1, "delivered", 1000, 400),
    order("o2", 2, "shipped", 500, 200),
    order("o3", 3, "cancelled", 900, 300),
    order("o4", 4, "failed", 700, 200),
    order("o5", 5, "refunded", 600, 200),
  ];
  const metrics = computeMetrics(data({ orders }), rangeFor("30d", NOW), NOW);

  assert.equal(metrics.rangeSales, 1500);
  assert.equal(metrics.totalOrders, 5);
  assert.equal(metrics.ordersByStatus.cancelled, 1);
  assert.equal(metrics.averageOrderValue, 750);
  assert.equal(metrics.costOfGoods, 600);
  assert.equal(metrics.grossProfit, 900);
});

test("a partially refunded order only counts the money kept", () => {
  const partial = {
    ...order("o1", 1, "delivered", 1000, 300),
    refundedTotal: 400,
  };
  const metrics = computeMetrics(
    data({ orders: [partial] }),
    rangeFor("30d", NOW),
    NOW,
  );
  assert.equal(metrics.rangeSales, 600);
});

test("today, week, month and year totals use their own windows", () => {
  const orders = [
    order("today", 0, "delivered", 100, 10),
    order("week", 3, "delivered", 200, 10),
    order("month", 20, "delivered", 400, 10),
    order("old", 200, "delivered", 800, 10),
  ];
  const metrics = computeMetrics(data({ orders }), rangeFor("all", NOW), NOW);

  assert.equal(metrics.todaySales, 100);
  assert.equal(metrics.weekSales, 300);
  assert.equal(metrics.monthSales, 700);
  assert.equal(metrics.totalSales, 1500);
});

test("stock, inventory value and low-stock counts reflect the catalogue", () => {
  const products = [
    product("p1", 0),
    product("p2", 3),
    product("p3", 50),
    product("p4", 10, { status: "draft" }),
    product("p5", 999, { unlimitedStock: true }),
  ];
  const metrics = computeMetrics(data({ products }), rangeFor("30d", NOW), NOW);

  assert.equal(metrics.totalProducts, 5);
  assert.equal(metrics.activeProducts, 4);
  assert.equal(metrics.inactiveProducts, 1);
  assert.equal(metrics.outOfStockProducts, 1);
  assert.equal(metrics.lowStockProducts, 1);
  assert.equal(metrics.inventoryValue, (0 + 3 + 50 + 10 + 999) * 300);
});

test("cart abandonment and repeat purchase rates are percentages of the right base", () => {
  const carts: AdminRecord[] = [
    { ...bones("c1", stamp(1)), state: "abandoned" },
    { ...bones("c2", stamp(1)), state: "abandoned" },
    { ...bones("c3", stamp(1)), state: "active" },
    { ...bones("c4", stamp(1)), state: "converted" },
  ];
  const orders = [
    order("o1", 1, "delivered", 100, 10),
    order("o2", 2, "delivered", 100, 10),
  ];
  const metrics = computeMetrics(
    data({ carts, orders }),
    rangeFor("30d", NOW),
    NOW,
  );

  assert.equal(metrics.cartAbandonmentRate, 50);
  assert.equal(
    metrics.repeatPurchaseRate,
    100,
    "the single customer ordered twice",
  );
});

test("metrics survive an empty store without dividing by zero", () => {
  const metrics = computeMetrics(emptyDashboardData, rangeFor("30d", NOW), NOW);
  for (const value of [
    metrics.averageOrderValue,
    metrics.conversionRate,
    metrics.cartAbandonmentRate,
    metrics.repeatPurchaseRate,
    metrics.marginPercent,
    metrics.salesChangePercent,
  ]) {
    assert.equal(Number.isFinite(value), true);
  }
  assert.equal(metrics.totalSales, 0);
});

test("a series fills empty days so the chart has no gaps", () => {
  const range = {
    from: new Date(2026, 4, 1, 0, 0, 0, 0),
    to: new Date(2026, 4, 7, 23, 59, 59, 999),
  };
  const series = buildSeries(
    [
      { at: new Date(2026, 4, 2, 9).toISOString(), value: 100 },
      { at: new Date(2026, 4, 2, 18).toISOString(), value: 50 },
      { at: new Date(2026, 4, 6, 9).toISOString(), value: 25 },
    ],
    range,
    "day",
  );
  assert.equal(series.length, 7);
  assert.equal(series[1]?.value, 150, "same-day values are added together");
  assert.equal(series[2]?.value, 0);
});

test("alerts surface stock, payment, return and moderation problems in severity order", () => {
  const alerts = computeAlerts(
    data({
      products: [product("p1", 0), product("p2", 2)],
      transactions: [
        { ...bones("t1", stamp(1)), status: "failed", gateway: "khalti" },
      ],
      returns: [
        {
          ...bones("r1", stamp(1)),
          status: "requested",
          number: "RET-1",
          reason: "damaged",
        },
      ],
      reviews: [{ ...bones("v1", stamp(1)), status: "pending", title: "Nice" }],
    }),
  );

  assert.deepEqual(
    [...new Set(alerts.map((alert) => alert.severity))],
    ["critical", "warning", "info"],
    "critical alerts come first",
  );
  assert.ok(alerts.some((alert) => alert.kind === "out_of_stock"));
  assert.ok(alerts.some((alert) => alert.kind === "failed_payment"));
});

test("every report builds and exports as CSV, even with no data", () => {
  const filled = data({
    orders: [order("o1", 1, "delivered", 1000, 400)],
    products: [product("p1", 2)],
    customers: [
      {
        ...bones("c1", stamp(10)),
        name: "Sita",
        totalSpent: 1000,
        orderCount: 1,
      },
    ],
  });
  for (const report of REPORTS) {
    const table = report.build(filled, rangeFor("30d", NOW));
    assert.ok(table.columns.length > 0, `${report.key} has no columns`);
    const csv = reportToCsv(table);
    assert.equal(
      csv.split("\n")[0],
      table.columns.map((column) => column.key).join(","),
    );
    assert.doesNotThrow(() =>
      report.build(emptyDashboardData, rangeFor("30d", NOW)),
    );
  }
  assert.equal(reportByKey("sales")?.label, "Sales report");
  assert.equal(reportByKey("nope"), null);
});

test("CSV quoting survives a round trip through commas, quotes and newlines", () => {
  const rows = [
    { name: 'Belt, "heavy duty"', note: "line one\nline two", price: 379 },
  ];
  const csv = toCsv(rows, ["name", "note", "price"]);
  const parsed = parseCsv(csv.replace(/\n(?![a-zA-Z"])/g, "\n"));
  assert.deepEqual(parsed.columns, ["name", "note", "price"]);

  const simple = parseCsv('name,price\n"Belt, heavy",379\nWatch,3200');
  assert.equal(simple.rows.length, 2);
  assert.equal(simple.rows[0]?.values.name, "Belt, heavy");
  assert.equal(simple.rows[1]?.values.price, "3200");
  assert.equal(simple.errors.length, 0);
});

test("a bad import row is reported rather than thrown away silently", () => {
  const result = parseCsv("name,price\nBelt,379\nBroken");
  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.errors, [
    { line: 3, message: "Expected 2 columns but found 1." },
  ]);
  assert.equal(parseCsv("").errors[0]?.message, "The file is empty.");
});

test("built-in roles grant what their description promises", () => {
  const roles = BUILT_IN_ROLES.map((role, index) => ({
    ...bones(`role_${index}`, stamp(0)),
    ...role,
  })) as RoleRecord[];
  const find = (key: string) => roles.find((role) => role.key === key) ?? null;

  assert.equal(can(find("super_admin"), "settings", "delete"), true);
  assert.equal(can(find("support"), "support", "edit"), true);
  assert.equal(can(find("support"), "settings", "edit"), false);
  assert.equal(can(find("product_manager"), "products", "delete"), true);
  assert.equal(can(find("product_manager"), "orders", "edit"), false);
  assert.equal(can(find("product_manager"), "orders", "view"), true);
  assert.equal(can(find("accountant"), "finance", "export"), true);
  assert.equal(can(null, "products", "view"), false);
});

test("permissions can be toggled per action and per module", () => {
  let permissions: PermissionMap = {};
  permissions = togglePermission(permissions, "orders", "view");
  assert.deepEqual(permissions, { orders: ["view"] });
  permissions = togglePermission(permissions, "orders", "view");
  assert.deepEqual(
    permissions,
    {},
    "removing the last action clears the module",
  );

  permissions = setModulePermissions(permissions, "orders", true);
  assert.equal(can({ permissions } as RoleRecord, "orders", "refund"), true);
  permissions = setModulePermissions(permissions, "orders", false);
  assert.equal(can({ permissions } as RoleRecord, "orders", "view"), false);
});

test("automation rules only match while they are enabled", () => {
  const rules: AutomationRule[] = [
    {
      ...bones("a1", stamp(0)),
      name: "Low stock",
      enabled: true,
      trigger: "stock_below",
      threshold: 5,
      action: "notify_admin",
    },
    {
      ...bones("a2", stamp(0)),
      name: "Disabled rule",
      enabled: false,
      trigger: "payment_failed",
      action: "email_customer",
    },
  ];
  const matches = evaluateAutomations(
    rules,
    data({
      products: [product("p1", 2), product("p2", 50)],
      transactions: [
        { ...bones("t1", stamp(1)), status: "failed", gateway: "khalti" },
      ],
    }),
    NOW,
  );

  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.ruleName, "Low stock");
  assert.equal(matches[0]?.subject.id, "p1");
});

test("natural-language questions map to the right answer", () => {
  const dashboard = data({
    products: [product("p1", 1), product("p2", 0)],
    orders: [
      { ...order("o1", 5, "pending", 500, 100) },
      { ...order("o2", 0, "delivered", 900, 300) },
    ],
    customers: [
      {
        ...bones("c1", stamp(30)),
        name: "Sita",
        totalSpent: 5000,
        orderCount: 3,
      },
    ],
  });

  const lowStock = answerQuestion(
    "Show products with low stock.",
    dashboard,
    NOW,
  );
  assert.match(lowStock.answer, /low-stock/);
  assert.equal(lowStock.route, "/admin/inventory");

  const pending = answerQuestion(
    "Show orders pending more than 2 days.",
    dashboard,
    NOW,
  );
  assert.match(pending.answer, /waiting more than 2 day/);
  assert.equal(pending.rows.length, 1);

  const profit = answerQuestion(
    "Which products generated most profit this month?",
    dashboard,
    NOW,
  );
  assert.match(profit.answer, /profit/i);

  const fallback = answerQuestion("something unrelated", dashboard, NOW);
  assert.ok(fallback.answer.length > 0);
});

test("writing helpers stay inside the length search engines allow", () => {
  const record = {
    name: "Summer Stylish Ice Silk Waffle Polo Shirt",
    shortDescription: "Breathable ice silk polo that keeps its shape all day.",
    price: 499,
    brandName: "Shopmee",
    categoryName: "Fashion",
  };

  const title = localAssist({
    task: "seo_title",
    record,
    context: { storeName: "Gulmeli" },
  });
  assert.ok(title.text.length <= 60, title.text);
  assert.ok((title.suggestions ?? []).every((entry) => entry.length <= 60));

  const meta = localAssist({
    task: "meta_description",
    record,
    context: { storeName: "Gulmeli" },
  });
  assert.ok(meta.text.length <= 158, meta.text);

  const alt = localAssist({ task: "image_alt", record });
  assert.ok(alt.text.includes("Summer Stylish"));

  const tags = localAssist({ task: "tags", record });
  assert.ok((tags.suggestions ?? []).length > 0);
  assert.equal(tags.remote, false);
});

test("inventory forecasting suggests reorders for what is actually selling", () => {
  const dashboard = data({
    products: [product("fast", 4), product("idle", 100)],
    orders: Array.from({ length: 10 }, (_, index) => {
      const entry = order(`o${index}`, index, "delivered", 500, 300);
      entry.lines = [
        {
          productId: "fast",
          name: "Fast mover",
          sku: "FAST",
          quantity: 3,
          unitPrice: 500,
          costPrice: 300,
          discount: 0,
          tax: 0,
        },
      ];
      return entry;
    }),
  });

  const forecast = inventoryForecast(dashboard, 30, NOW);
  const fast = forecast.find((entry) => entry.product.id === "fast");
  assert.ok(fast, "a product selling every day should be forecast");
  assert.ok(fast.suggestedOrder > 0);
  assert.ok(fast.daysLeft < 14);
  assert.equal(
    forecast.find((entry) => entry.product.id === "idle"),
    undefined,
    "a product with plenty of stock and no sales is not flagged",
  );
});
