import { toCsv } from "./csv.ts";
import {
  earningOrders,
  inRange,
  orderCost,
  orderRevenue,
  sumBy,
  type DashboardData,
  type DateRange,
} from "./metrics.ts";
import type { AdminOrder } from "./types.ts";

export interface ReportColumn {
  key: string;
  label: string;
  format?: "text" | "number" | "currency" | "percent" | "date";
}

export interface ReportTable {
  key: string;
  title: string;
  description: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  totals?: Record<string, unknown>;
}

export interface ReportDefinition {
  key: string;
  label: string;
  icon: string;
  description: string;
  build(data: DashboardData, range: DateRange): ReportTable;
}

const money = (key: string, label: string): ReportColumn => ({
  key,
  label,
  format: "currency",
});
const count = (key: string, label: string): ReportColumn => ({
  key,
  label,
  format: "number",
});

function rangeOrders(data: DashboardData, range: DateRange): AdminOrder[] {
  return data.orders.filter((order) => inRange(order.placedAt, range));
}

function dayKey(value: unknown): string {
  const time = Date.parse(String(value ?? ""));
  return Number.isNaN(time) ? "-" : new Date(time).toISOString().slice(0, 10);
}

export const REPORTS: ReportDefinition[] = [
  {
    key: "sales",
    label: "Sales report",
    icon: "chart-line",
    description: "Revenue, orders and average order value per day.",
    build(data, range) {
      const orders = earningOrders(rangeOrders(data, range));
      const byDay = new Map<
        string,
        { orders: number; revenue: number; discount: number }
      >();
      for (const order of orders) {
        const key = dayKey(order.placedAt);
        const entry = byDay.get(key) ?? { orders: 0, revenue: 0, discount: 0 };
        entry.orders += 1;
        entry.revenue += orderRevenue(order);
        entry.discount += Number(order.discountTotal) || 0;
        byDay.set(key, entry);
      }
      const rows = [...byDay.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, entry]) => ({
          date,
          orders: entry.orders,
          revenue: Math.round(entry.revenue),
          discount: Math.round(entry.discount),
          averageOrderValue: entry.orders
            ? Math.round(entry.revenue / entry.orders)
            : 0,
        }));
      return {
        key: "sales",
        title: "Sales report",
        description: "Revenue, orders and average order value per day.",
        columns: [
          { key: "date", label: "Date", format: "date" },
          count("orders", "Orders"),
          money("revenue", "Revenue"),
          money("discount", "Discounts"),
          money("averageOrderValue", "Average order"),
        ],
        rows,
        totals: {
          date: "Total",
          orders: sumBy(rows, (row) => row.orders),
          revenue: sumBy(rows, (row) => row.revenue),
          discount: sumBy(rows, (row) => row.discount),
          averageOrderValue: rows.length
            ? Math.round(
                sumBy(rows, (row) => row.revenue) /
                  Math.max(
                    1,
                    sumBy(rows, (row) => row.orders),
                  ),
              )
            : 0,
        },
      };
    },
  },
  {
    key: "profit",
    label: "Profit report",
    icon: "sack-dollar",
    description: "Revenue against cost of goods, refunds, fees and expenses.",
    build(data, range) {
      const orders = earningOrders(rangeOrders(data, range));
      const revenue = sumBy(orders, orderRevenue);
      const cost = sumBy(orders, orderCost);
      const refunds = sumBy(
        data.returns.filter((entry) => inRange(entry.createdAt, range)),
        (entry) => Number(entry.refundAmount) || 0,
      );
      const fees = sumBy(
        data.transactions.filter((entry) => inRange(entry.createdAt, range)),
        (entry) => Number(entry.fee) || 0,
      );
      const expenses = sumBy(
        data.expenses.filter((entry) =>
          inRange(entry.spentAt ?? entry.createdAt, range),
        ),
        (entry) => Number(entry.amount) || 0,
      );
      const rows = [
        { line: "Revenue", amount: Math.round(revenue) },
        { line: "Cost of goods", amount: -Math.round(cost) },
        { line: "Gross profit", amount: Math.round(revenue - cost) },
        { line: "Refunds", amount: -Math.round(refunds) },
        { line: "Payment fees", amount: -Math.round(fees) },
        { line: "Expenses", amount: -Math.round(expenses) },
        {
          line: "Net profit",
          amount: Math.round(revenue - cost - refunds - fees - expenses),
        },
      ];
      return {
        key: "profit",
        title: "Profit report",
        description:
          "Revenue against cost of goods, refunds, fees and expenses.",
        columns: [{ key: "line", label: "Line" }, money("amount", "Amount")],
        rows,
      };
    },
  },
  {
    key: "orders",
    label: "Order report",
    icon: "receipt",
    description: "Every order in the period with its status and totals.",
    build(data, range) {
      const rows = rangeOrders(data, range).map((order) => ({
        number: order.number,
        date: dayKey(order.placedAt),
        customer: order.customerName,
        status: order.status,
        payment: order.paymentStatus,
        method: order.paymentMethod,
        items: (order.lines ?? []).length,
        total: Math.round(Number(order.total) || 0),
      }));
      return {
        key: "orders",
        title: "Order report",
        description: "Every order in the period with its status and totals.",
        columns: [
          { key: "number", label: "Order" },
          { key: "date", label: "Date", format: "date" },
          { key: "customer", label: "Customer" },
          { key: "status", label: "Status" },
          { key: "payment", label: "Payment" },
          { key: "method", label: "Method" },
          count("items", "Items"),
          money("total", "Total"),
        ],
        rows,
        totals: { number: "Total", total: sumBy(rows, (row) => row.total) },
      };
    },
  },
  {
    key: "products",
    label: "Product report",
    icon: "tag",
    description: "Units sold, revenue and margin per product.",
    build(data, range) {
      const orders = earningOrders(rangeOrders(data, range));
      const byProduct = new Map<
        string,
        { name: string; units: number; revenue: number; cost: number }
      >();
      for (const order of orders) {
        for (const line of order.lines ?? []) {
          const entry = byProduct.get(line.productId) ?? {
            name: line.name,
            units: 0,
            revenue: 0,
            cost: 0,
          };
          entry.units += Number(line.quantity) || 0;
          entry.revenue +=
            (Number(line.unitPrice) || 0) * (Number(line.quantity) || 0);
          entry.cost +=
            (Number(line.costPrice) || 0) * (Number(line.quantity) || 0);
          byProduct.set(line.productId, entry);
        }
      }
      const rows = [...byProduct.values()]
        .map((entry) => ({
          product: entry.name,
          units: entry.units,
          revenue: Math.round(entry.revenue),
          cost: Math.round(entry.cost),
          profit: Math.round(entry.revenue - entry.cost),
          margin: entry.revenue
            ? Math.round(
                ((entry.revenue - entry.cost) / entry.revenue) * 1000,
              ) / 10
            : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue);
      return {
        key: "products",
        title: "Product report",
        description: "Units sold, revenue and margin per product.",
        columns: [
          { key: "product", label: "Product" },
          count("units", "Units"),
          money("revenue", "Revenue"),
          money("cost", "Cost"),
          money("profit", "Profit"),
          { key: "margin", label: "Margin", format: "percent" },
        ],
        rows,
        totals: {
          product: "Total",
          units: sumBy(rows, (row) => row.units),
          revenue: sumBy(rows, (row) => row.revenue),
          cost: sumBy(rows, (row) => row.cost),
          profit: sumBy(rows, (row) => row.profit),
        },
      };
    },
  },
  {
    key: "inventory",
    label: "Inventory report",
    icon: "boxes-stacked",
    description: "Stock on hand and what it is worth.",
    build(data) {
      const rows = data.products
        .filter((product) => !product.deletedAt)
        .map((product) => ({
          product: product.name,
          sku: product.sku,
          stock: Number(product.stock) || 0,
          threshold: Number(product.lowStockThreshold ?? 0),
          costValue: Math.round(
            (Number(product.costPrice) || 0) * (Number(product.stock) || 0),
          ),
          retailValue: Math.round(
            (Number(product.price) || 0) * (Number(product.stock) || 0),
          ),
        }))
        .sort((a, b) => a.stock - b.stock);
      return {
        key: "inventory",
        title: "Inventory report",
        description: "Stock on hand and what it is worth.",
        columns: [
          { key: "product", label: "Product" },
          { key: "sku", label: "SKU" },
          count("stock", "On hand"),
          count("threshold", "Alert at"),
          money("costValue", "Cost value"),
          money("retailValue", "Retail value"),
        ],
        rows,
        totals: {
          product: "Total",
          stock: sumBy(rows, (row) => row.stock),
          costValue: sumBy(rows, (row) => row.costValue),
          retailValue: sumBy(rows, (row) => row.retailValue),
        },
      };
    },
  },
  {
    key: "low_stock",
    label: "Low-stock report",
    icon: "triangle-exclamation",
    description: "Products at or below their alert level.",
    build(data) {
      const rows = data.products
        .filter(
          (product) =>
            !product.deletedAt &&
            !product.unlimitedStock &&
            Number(product.stock) <= Number(product.lowStockThreshold ?? 5),
        )
        .map((product) => ({
          product: product.name,
          sku: product.sku,
          stock: Number(product.stock) || 0,
          threshold: Number(product.lowStockThreshold ?? 0),
          reorderValue: Math.round(
            (Number(product.costPrice) || 0) *
              Math.max(
                0,
                Number(product.lowStockThreshold ?? 0) * 3 -
                  (Number(product.stock) || 0),
              ),
          ),
        }))
        .sort((a, b) => a.stock - b.stock);
      return {
        key: "low_stock",
        title: "Low-stock report",
        description: "Products at or below their alert level.",
        columns: [
          { key: "product", label: "Product" },
          { key: "sku", label: "SKU" },
          count("stock", "On hand"),
          count("threshold", "Alert at"),
          money("reorderValue", "Suggested reorder cost"),
        ],
        rows,
      };
    },
  },
  {
    key: "customers",
    label: "Customer report",
    icon: "users",
    description: "Lifetime value, order count and last order per customer.",
    build(data) {
      const rows = data.customers
        .filter((customer) => !customer.deletedAt)
        .map((customer) => ({
          customer: String(customer.name ?? ""),
          email: String(customer.email ?? ""),
          orders: Number(customer.orderCount) || 0,
          spent: Math.round(Number(customer.totalSpent) || 0),
          average: Number(customer.orderCount)
            ? Math.round(
                (Number(customer.totalSpent) || 0) /
                  Number(customer.orderCount),
              )
            : 0,
          lastOrder: customer.lastOrderAt ? dayKey(customer.lastOrderAt) : "-",
        }))
        .sort((a, b) => b.spent - a.spent);
      return {
        key: "customers",
        title: "Customer report",
        description: "Lifetime value, order count and last order per customer.",
        columns: [
          { key: "customer", label: "Customer" },
          { key: "email", label: "Email" },
          count("orders", "Orders"),
          money("spent", "Lifetime value"),
          money("average", "Average order"),
          { key: "lastOrder", label: "Last order", format: "date" },
        ],
        rows,
        totals: { customer: "Total", spent: sumBy(rows, (row) => row.spent) },
      };
    },
  },
  {
    key: "tax",
    label: "Tax report",
    icon: "percent",
    description: "Tax collected per day.",
    build(data, range) {
      const byDay = new Map<string, number>();
      for (const order of earningOrders(rangeOrders(data, range))) {
        const key = dayKey(order.placedAt);
        byDay.set(key, (byDay.get(key) ?? 0) + (Number(order.taxTotal) || 0));
      }
      const rows = [...byDay.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, tax]) => ({ date, tax: Math.round(tax) }));
      return {
        key: "tax",
        title: "Tax report",
        description: "Tax collected per day.",
        columns: [
          { key: "date", label: "Date", format: "date" },
          money("tax", "Tax collected"),
        ],
        rows,
        totals: { date: "Total", tax: sumBy(rows, (row) => row.tax) },
      };
    },
  },
  {
    key: "shipping",
    label: "Shipping report",
    icon: "truck",
    description: "Shipping fees collected, by courier.",
    build(data, range) {
      const byCourier = new Map<
        string,
        { orders: number; collected: number }
      >();
      for (const order of earningOrders(rangeOrders(data, range))) {
        const key = String(order.courier || "Unassigned");
        const entry = byCourier.get(key) ?? { orders: 0, collected: 0 };
        entry.orders += 1;
        entry.collected += Number(order.shippingTotal) || 0;
        byCourier.set(key, entry);
      }
      const rows = [...byCourier.entries()].map(([courier, entry]) => ({
        courier,
        orders: entry.orders,
        collected: Math.round(entry.collected),
      }));
      return {
        key: "shipping",
        title: "Shipping report",
        description: "Shipping fees collected, by courier.",
        columns: [
          { key: "courier", label: "Courier" },
          count("orders", "Orders"),
          money("collected", "Shipping collected"),
        ],
        rows,
        totals: {
          courier: "Total",
          collected: sumBy(rows, (row) => row.collected),
        },
      };
    },
  },
  {
    key: "coupons",
    label: "Coupon report",
    icon: "ticket",
    description: "How much each coupon was used and what it cost.",
    build(data, range) {
      const byCoupon = new Map<
        string,
        { uses: number; discount: number; revenue: number }
      >();
      for (const order of earningOrders(rangeOrders(data, range))) {
        const code = String(order.couponCode || "");
        if (!code) continue;
        const entry = byCoupon.get(code) ?? {
          uses: 0,
          discount: 0,
          revenue: 0,
        };
        entry.uses += 1;
        entry.discount += Number(order.discountTotal) || 0;
        entry.revenue += orderRevenue(order);
        byCoupon.set(code, entry);
      }
      const rows = [...byCoupon.entries()].map(([code, entry]) => ({
        code,
        uses: entry.uses,
        discount: Math.round(entry.discount),
        revenue: Math.round(entry.revenue),
      }));
      return {
        key: "coupons",
        title: "Coupon report",
        description: "How much each coupon was used and what it cost.",
        columns: [
          { key: "code", label: "Coupon" },
          count("uses", "Uses"),
          money("discount", "Discount given"),
          money("revenue", "Revenue influenced"),
        ],
        rows,
        totals: {
          code: "Total",
          uses: sumBy(rows, (row) => row.uses),
          discount: sumBy(rows, (row) => row.discount),
          revenue: sumBy(rows, (row) => row.revenue),
        },
      };
    },
  },
  {
    key: "returns",
    label: "Return & refund report",
    icon: "rotate-left",
    description: "Returns by reason, with the refunds paid out.",
    build(data, range) {
      const byReason = new Map<string, { count: number; refund: number }>();
      for (const entry of data.returns.filter((item) =>
        inRange(item.createdAt, range),
      )) {
        const key = String(entry.reason || "other");
        const bucket = byReason.get(key) ?? { count: 0, refund: 0 };
        bucket.count += 1;
        bucket.refund += Number(entry.refundAmount) || 0;
        byReason.set(key, bucket);
      }
      const rows = [...byReason.entries()].map(([reason, entry]) => ({
        reason,
        count: entry.count,
        refund: Math.round(entry.refund),
      }));
      return {
        key: "returns",
        title: "Return & refund report",
        description: "Returns by reason, with the refunds paid out.",
        columns: [
          { key: "reason", label: "Reason" },
          count("count", "Returns"),
          money("refund", "Refunded"),
        ],
        rows,
        totals: {
          reason: "Total",
          count: sumBy(rows, (row) => row.count),
          refund: sumBy(rows, (row) => row.refund),
        },
      };
    },
  },
  {
    key: "payments",
    label: "Payment report",
    icon: "credit-card",
    description: "Settlements and failures per gateway.",
    build(data, range) {
      const byGateway = new Map<
        string,
        { successful: number; failed: number; amount: number; fee: number }
      >();
      for (const entry of data.transactions.filter((item) =>
        inRange(item.createdAt, range),
      )) {
        const key = String(entry.gateway || "unknown");
        const bucket = byGateway.get(key) ?? {
          successful: 0,
          failed: 0,
          amount: 0,
          fee: 0,
        };
        if (entry.status === "failed") bucket.failed += 1;
        else bucket.successful += 1;
        if (entry.status === "successful")
          bucket.amount += Number(entry.amount) || 0;
        bucket.fee += Number(entry.fee) || 0;
        byGateway.set(key, bucket);
      }
      const rows = [...byGateway.entries()].map(([gateway, entry]) => ({
        gateway,
        successful: entry.successful,
        failed: entry.failed,
        amount: Math.round(entry.amount),
        fee: Math.round(entry.fee),
      }));
      return {
        key: "payments",
        title: "Payment report",
        description: "Settlements and failures per gateway.",
        columns: [
          { key: "gateway", label: "Gateway" },
          count("successful", "Successful"),
          count("failed", "Failed"),
          money("amount", "Settled"),
          money("fee", "Fees"),
        ],
        rows,
        totals: {
          gateway: "Total",
          successful: sumBy(rows, (row) => row.successful),
          failed: sumBy(rows, (row) => row.failed),
          amount: sumBy(rows, (row) => row.amount),
          fee: sumBy(rows, (row) => row.fee),
        },
      };
    },
  },
  {
    key: "expenses",
    label: "Expense report",
    icon: "money-bill",
    description: "Business costs grouped by category.",
    build(data, range) {
      const byCategory = new Map<string, number>();
      for (const entry of data.expenses.filter((item) =>
        inRange(item.spentAt ?? item.createdAt, range),
      )) {
        const key = String(entry.category || "other");
        byCategory.set(
          key,
          (byCategory.get(key) ?? 0) + (Number(entry.amount) || 0),
        );
      }
      const rows = [...byCategory.entries()]
        .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
        .sort((a, b) => b.amount - a.amount);
      return {
        key: "expenses",
        title: "Expense report",
        description: "Business costs grouped by category.",
        columns: [
          { key: "category", label: "Category" },
          money("amount", "Amount"),
        ],
        rows,
        totals: { category: "Total", amount: sumBy(rows, (row) => row.amount) },
      };
    },
  },
];

export function reportByKey(key: string): ReportDefinition | null {
  return REPORTS.find((report) => report.key === key) ?? null;
}

export function reportToCsv(table: ReportTable): string {
  const columns = table.columns.map((column) => column.key);
  const rows = [...table.rows];
  if (table.totals) rows.push(table.totals);
  return toCsv(rows, columns);
}

/** Printable HTML for the browser's "save as PDF" dialog. */
export function reportToHtml(
  table: ReportTable,
  storeName: string,
  rangeLabel: string,
): string {
  const escape = (value: unknown) =>
    String(value ?? "").replace(
      /[&<>"]/g,
      (character) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[
          character
        ] ?? character,
    );
  const header = table.columns
    .map((column) => `<th>${escape(column.label)}</th>`)
    .join("");
  const body = table.rows
    .map(
      (row) =>
        `<tr>${table.columns.map((column) => `<td>${escape(row[column.key])}</td>`).join("")}</tr>`,
    )
    .join("");
  const totals = table.totals
    ? `<tr class="totals">${table.columns
        .map((column) => `<td>${escape(table.totals?.[column.key] ?? "")}</td>`)
        .join("")}</tr>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(table.title)}</title>
<style>
body{font:13px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:#212121;padding:24px}
h1{font-size:18px;margin:0 0 4px}p{color:#757575;margin:0 0 16px}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #eaeaea;padding:6px 8px;text-align:left}
th{background:#f4f4f4}tr.totals td{font-weight:700;background:#fafafa}
</style></head><body>
<h1>${escape(table.title)}</h1>
<p>${escape(storeName)} — ${escape(rangeLabel)} — ${escape(table.description)}</p>
<table><thead><tr>${header}</tr></thead><tbody>${body}${totals}</tbody></table>
</body></html>`;
}
