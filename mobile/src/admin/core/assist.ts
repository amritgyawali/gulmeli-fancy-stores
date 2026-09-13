/**
 * Writing and analysis helpers for the dashboard.
 *
 * These run entirely on the device with deterministic rules - no model is
 * called and no data leaves the app. `AssistProvider` is the seam: point
 * `setAssistProvider` at a hosted model when you have one and every screen
 * that calls `assist` picks it up, with these rules as the offline fallback.
 */
import { humanise } from "./format.ts";
import {
  earningOrders,
  inRange,
  orderCost,
  orderRevenue,
  rangeFor,
  sumBy,
  type DashboardData,
} from "./metrics.ts";
import type { AdminProduct, AdminRecord } from "./types.ts";

export type AssistTask =
  | "product_description"
  | "seo_title"
  | "meta_description"
  | "image_alt"
  | "tags"
  | "support_reply"
  | "review_summary"
  | "sales_summary"
  | "campaign";

export interface AssistRequest {
  task: AssistTask;
  /** The record the text is about, when there is one. */
  record?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface AssistResult {
  text: string;
  /** Alternative single-line suggestions, such as tags. */
  suggestions?: string[];
  /** True when a hosted model produced the text rather than the local rules. */
  remote: boolean;
}

export interface AssistProvider {
  name: string;
  generate(request: AssistRequest): Promise<AssistResult>;
}

let provider: AssistProvider | null = null;

export function setAssistProvider(next: AssistProvider | null): void {
  provider = next;
}

export function assistProviderName(): string {
  return provider?.name ?? "On-device suggestions";
}

function text(
  record: Record<string, unknown> | undefined,
  key: string,
): string {
  const value = record?.[key];
  return typeof value === "string" ? value : "";
}

function number(
  record: Record<string, unknown> | undefined,
  key: string,
): number {
  const value = Number(record?.[key]);
  return Number.isFinite(value) ? value : 0;
}

function sentenceList(values: string[]): string {
  const clean = values.filter(Boolean);
  if (clean.length <= 1) return clean[0] ?? "";
  return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
}

function keywordsFrom(record: Record<string, unknown> | undefined): string[] {
  const source = [
    text(record, "name"),
    text(record, "shortDescription"),
    text(record, "description"),
  ]
    .join(" ")
    .toLowerCase();
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "this",
    "that",
    "your",
    "our",
    "are",
    "was",
    "has",
    "have",
    "will",
    "you",
    "its",
    "into",
    "over",
    "under",
    "than",
    "then",
    "them",
    "they",
    "when",
    "what",
    "which",
    "a",
    "an",
    "of",
    "in",
    "on",
    "to",
    "by",
    "is",
    "it",
    "at",
    "as",
    "be",
    "or",
    "if",
    "so",
    "we",
  ]);
  const counts = new Map<string, number>();
  for (const word of source.match(/[a-z][a-z0-9-]{2,}/g) ?? []) {
    if (stop.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

function truncate(value: string, limit: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** The deterministic fallback used when no hosted provider is configured. */
export function localAssist(request: AssistRequest): AssistResult {
  const record = request.record;
  const store = String(request.context?.storeName ?? "our store");

  switch (request.task) {
    case "product_description": {
      const name = text(record, "name") || "This product";
      const brand = text(record, "brandName");
      const category = text(record, "categoryName");
      const features = Array.isArray(record?.features)
        ? (record.features as unknown[]).map(String).filter(Boolean)
        : [];
      const specs = Array.isArray(record?.specifications)
        ? (record.specifications as { label?: string; value?: string }[])
        : [];
      const parts = [
        `${name}${brand ? ` from ${brand}` : ""}${category ? `, part of our ${category.toLowerCase()} range` : ""}.`,
        text(record, "shortDescription"),
        features.length ? `Highlights: ${sentenceList(features)}.` : "",
        specs.length
          ? `Specifications: ${sentenceList(
              specs
                .filter((spec) => spec.label)
                .map((spec) => `${spec.label} ${spec.value ?? ""}`.trim()),
            )}.`
          : "",
        text(record, "warranty")
          ? `Warranty: ${text(record, "warranty")}.`
          : "",
        `Order from ${store} for delivery to your door.`,
      ];
      return { text: parts.filter(Boolean).join("\n\n"), remote: false };
    }
    case "seo_title": {
      const name = text(record, "name") || text(record, "title");
      const brand = text(record, "brandName");
      const suffix = brand ? ` | ${brand}` : ` | ${store}`;
      return {
        text: truncate(`Buy ${name}${suffix}`, 60),
        suggestions: [
          truncate(`${name} - Price & Reviews${suffix}`, 60),
          truncate(`${name} Online${suffix}`, 60),
          truncate(`Shop ${name} at the best price${suffix}`, 60),
        ],
        remote: false,
      };
    }
    case "meta_description": {
      const name = text(record, "name") || text(record, "title");
      const base =
        text(record, "shortDescription") ||
        truncate(text(record, "description").replace(/<[^>]+>/g, " "), 120) ||
        `${name} available now`;
      const price = number(record, "price");
      const priceText = price ? ` from Rs. ${Math.round(price)}` : "";
      return {
        text: truncate(
          `${base}${priceText}. Order ${name} from ${store} with fast delivery.`,
          158,
        ),
        remote: false,
      };
    }
    case "image_alt": {
      const name = text(record, "name") || text(record, "title") || "Product";
      const colour = text(record, "color");
      const category = text(record, "categoryName");
      return {
        text: truncate(
          [name, colour, category]
            .filter(Boolean)
            .join(", ")
            .concat(" - product photo"),
          120,
        ),
        remote: false,
      };
    }
    case "tags": {
      const suggestions = [
        ...new Set([
          ...keywordsFrom(record),
          text(record, "categoryName").toLowerCase(),
          text(record, "brandName").toLowerCase(),
        ]),
      ].filter(Boolean);
      return { text: suggestions.join(", "), suggestions, remote: false };
    }
    case "support_reply": {
      const customer = text(record, "customerName") || "there";
      const subject = text(record, "subject") || "your message";
      const category = text(record, "category");
      const body =
        category === "order_issue"
          ? "We have checked the order and are following it up with the delivery team. We will confirm the new delivery date within 24 hours."
          : category === "payment_issue"
            ? "We can see the payment attempt on our side. If the amount was debited, it is released back by the bank within 3 to 5 working days; send us the transaction reference and we will chase it for you."
            : category === "return_request"
              ? "We can accept the return. Keep the item and its packaging as they are, and our courier will collect it. The refund is released once the item reaches us."
              : "Thank you for writing in. We have passed this to the right team and will come back to you shortly.";
      return {
        text: `Hello ${customer},\n\nThank you for contacting ${store} about ${subject.toLowerCase()}.\n\n${body}\n\nIf anything above is not clear, reply to this message and we will help.\n\n${store} support team`,
        remote: false,
      };
    }
    case "review_summary": {
      const reviews = Array.isArray(request.context?.reviews)
        ? (request.context.reviews as AdminRecord[])
        : [];
      if (!reviews.length)
        return {
          text: "There are no reviews to summarise yet.",
          remote: false,
        };
      const average =
        sumBy(reviews, (review) => Number(review.rating) || 0) / reviews.length;
      const positive = reviews.filter(
        (review) => Number(review.rating) >= 4,
      ).length;
      const negative = reviews.filter((review) => Number(review.rating) <= 2);
      const themes = new Map<string, number>();
      for (const review of reviews) {
        for (const word of keywordsFrom(review as Record<string, unknown>)) {
          themes.set(word, (themes.get(word) ?? 0) + 1);
        }
      }
      const top = [...themes.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);
      return {
        text: [
          `${reviews.length} review(s), averaging ${average.toFixed(1)} out of 5.`,
          `${positive} are positive (4 stars or better) and ${negative.length} are negative (2 stars or fewer).`,
          top.length ? `Most mentioned: ${sentenceList(top)}.` : "",
          negative.length
            ? `Worth reading first: ${negative
                .slice(0, 3)
                .map(
                  (review) =>
                    `"${truncate(String(review.title || review.body || ""), 60)}"`,
                )
                .join("; ")}.`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
        remote: false,
      };
    }
    case "sales_summary": {
      const summary = request.context?.summary;
      return {
        text:
          typeof summary === "string"
            ? summary
            : "No sales data for this period.",
        remote: false,
      };
    }
    case "campaign": {
      const subject = text(record, "name") || "our latest offer";
      const audience = humanise(text(record, "audience") || "all");
      return {
        text: [
          `Subject: ${subject} — only at ${store}`,
          "",
          `Hello {{customer}},`,
          "",
          `${subject} is live at ${store}. Stock is limited, and the offer ends soon.`,
          "",
          "Tap through to see the full range and order before it goes.",
          "",
          `Audience: ${audience}.`,
        ].join("\n"),
        remote: false,
      };
    }
    default:
      return { text: "", remote: false };
  }
}

export async function assist(request: AssistRequest): Promise<AssistResult> {
  if (provider) {
    try {
      return await provider.generate(request);
    } catch {
      return localAssist(request);
    }
  }
  return localAssist(request);
}

/** A plain-language summary of the period, used by the Overview screen. */
export function salesNarrative(
  data: DashboardData,
  preset = "30d",
  now = new Date(),
): string {
  const range = rangeFor(preset, now);
  const orders = earningOrders(
    data.orders.filter((order) => inRange(order.placedAt, range)),
  );
  if (!orders.length) return "No orders were placed in this period.";
  const revenue = sumBy(orders, orderRevenue);
  const cost = sumBy(orders, orderCost);
  const average = revenue / orders.length;
  const byProduct = new Map<string, number>();
  for (const order of orders) {
    for (const line of order.lines ?? []) {
      byProduct.set(
        line.name,
        (byProduct.get(line.name) ?? 0) + (Number(line.quantity) || 0),
      );
    }
  }
  const best = [...byProduct.entries()].sort((a, b) => b[1] - a[1])[0];
  const lowStock = data.products.filter(
    (product) =>
      !product.deletedAt &&
      !product.unlimitedStock &&
      Number(product.stock) <= Number(product.lowStockThreshold ?? 5),
  ).length;
  return [
    `${orders.length} order(s) brought in Rs. ${Math.round(revenue)}, averaging Rs. ${Math.round(average)} each.`,
    cost
      ? `Cost of goods was Rs. ${Math.round(cost)}, so gross profit is Rs. ${Math.round(revenue - cost)}.`
      : "",
    best ? `${best[0]} sold the most, at ${best[1]} unit(s).` : "",
    lowStock
      ? `${lowStock} product(s) need restocking.`
      : "Stock levels are healthy.",
  ]
    .filter(Boolean)
    .join(" ");
}

export interface AnalyticsAnswer {
  question: string;
  answer: string;
  /** Rows backing the answer, ready for a small table. */
  rows: { label: string; value: string }[];
  /** Where to go to work on the result. */
  route?: string;
}

/**
 * Natural-language analytics over the loaded data. It recognises the questions
 * an owner actually asks; anything else returns the closest summary it can.
 */
export function answerQuestion(
  question: string,
  data: DashboardData,
  now = new Date(),
): AnalyticsAnswer {
  const text = question.toLowerCase().trim();
  const rows: { label: string; value: string }[] = [];

  const monthRange = rangeFor("30d", now);
  const orders = earningOrders(
    data.orders.filter((order) => inRange(order.placedAt, monthRange)),
  );

  if (/low\s*stock|running out|restock|reorder/.test(text)) {
    const products = data.products
      .filter(
        (product) =>
          !product.deletedAt &&
          !product.unlimitedStock &&
          Number(product.stock) <= Number(product.lowStockThreshold ?? 5),
      )
      .sort((a, b) => Number(a.stock) - Number(b.stock));
    for (const product of products.slice(0, 20))
      rows.push({
        label: String(product.name),
        value: `${product.stock} left`,
      });
    return {
      question,
      answer: products.length
        ? `${products.length} product(s) are at or below their low-stock level.`
        : "No products are low on stock.",
      rows,
      route: "/admin/inventory",
    };
  }

  if (/out of stock|sold out/.test(text)) {
    const products = data.products.filter(
      (product) =>
        !product.deletedAt &&
        !product.unlimitedStock &&
        Number(product.stock) <= 0,
    );
    for (const product of products.slice(0, 20))
      rows.push({ label: String(product.name), value: "0 left" });
    return {
      question,
      answer: products.length
        ? `${products.length} product(s) are out of stock.`
        : "Nothing is out of stock.",
      rows,
      route: "/admin/inventory",
    };
  }

  if (/profit|margin|earned/.test(text)) {
    const byProduct = new Map<string, number>();
    for (const order of orders) {
      for (const line of order.lines ?? []) {
        const profit =
          ((Number(line.unitPrice) || 0) - (Number(line.costPrice) || 0)) *
          (Number(line.quantity) || 0);
        byProduct.set(line.name, (byProduct.get(line.name) ?? 0) + profit);
      }
    }
    const ranked = [...byProduct.entries()].sort((a, b) => b[1] - a[1]);
    for (const [name, profit] of ranked.slice(0, 10))
      rows.push({ label: name, value: `Rs. ${Math.round(profit)}` });
    const total = sumBy(ranked, ([, profit]) => profit);
    return {
      question,
      answer: ranked.length
        ? `Gross profit over the last 30 days is Rs. ${Math.round(total)}. ${ranked[0]?.[0]} contributed the most.`
        : "There is no profit data for the last 30 days.",
      rows,
      route: "/admin/finance",
    };
  }

  if (/pending|waiting|not shipped|more than \d+ day/.test(text)) {
    const days = Number(/more than (\d+)\s*day/.exec(text)?.[1] ?? 2);
    const cutoff = now.getTime() - days * 86_400_000;
    const stuck = data.orders.filter(
      (order) =>
        ["pending", "confirmed", "processing"].includes(String(order.status)) &&
        Date.parse(String(order.placedAt)) < cutoff,
    );
    for (const order of stuck.slice(0, 20))
      rows.push({
        label: `${order.number} — ${order.customerName}`,
        value: String(order.status),
      });
    return {
      question,
      answer: stuck.length
        ? `${stuck.length} order(s) have been waiting more than ${days} day(s).`
        : `No orders have been waiting more than ${days} day(s).`,
      rows,
      route: "/admin/r/orders",
    };
  }

  if (/best|top|most sold|selling/.test(text)) {
    const byProduct = new Map<string, number>();
    for (const order of orders) {
      for (const line of order.lines ?? []) {
        byProduct.set(
          line.name,
          (byProduct.get(line.name) ?? 0) + (Number(line.quantity) || 0),
        );
      }
    }
    const ranked = [...byProduct.entries()].sort((a, b) => b[1] - a[1]);
    for (const [name, units] of ranked.slice(0, 10))
      rows.push({ label: name, value: `${units} sold` });
    return {
      question,
      answer: ranked.length
        ? `${ranked[0]?.[0]} is the best seller over the last 30 days.`
        : "Nothing has sold in the last 30 days.",
      rows,
      route: "/admin/analytics",
    };
  }

  if (/customer|buyer|spend/.test(text)) {
    const ranked = [...data.customers]
      .filter((customer) => !customer.deletedAt)
      .sort(
        (a, b) => (Number(b.totalSpent) || 0) - (Number(a.totalSpent) || 0),
      );
    for (const customer of ranked.slice(0, 10))
      rows.push({
        label: String(customer.name),
        value: `Rs. ${Math.round(Number(customer.totalSpent) || 0)}`,
      });
    return {
      question,
      answer: ranked.length
        ? `${ranked[0]?.name} has spent the most so far.`
        : "There are no customers yet.",
      rows,
      route: "/admin/r/customers",
    };
  }

  if (/refund|return/.test(text)) {
    const open = data.returns.filter((entry) => entry.status === "requested");
    for (const entry of open.slice(0, 20))
      rows.push({
        label: String(entry.number),
        value: String(entry.reason ?? ""),
      });
    return {
      question,
      answer: open.length
        ? `${open.length} return request(s) are waiting for a decision.`
        : "There are no open return requests.",
      rows,
      route: "/admin/r/returns",
    };
  }

  return {
    question,
    answer: salesNarrative(data, "30d", now),
    rows,
    route: "/admin/analytics",
  };
}

export const SAMPLE_QUESTIONS = [
  "Show products with low stock.",
  "Which products generated most profit this month?",
  "Show orders pending more than 2 days.",
  "Who are my best customers?",
  "What is selling best right now?",
  "Are there return requests waiting?",
];

/** Products the store should consider reordering, and by how much. */
export function inventoryForecast(
  data: DashboardData,
  days = 30,
  now = new Date(),
): {
  product: AdminProduct;
  dailyRate: number;
  daysLeft: number;
  suggestedOrder: number;
}[] {
  const range = { from: new Date(now.getTime() - days * 86_400_000), to: now };
  const sold = new Map<string, number>();
  for (const order of earningOrders(
    data.orders.filter((entry) => inRange(entry.placedAt, range)),
  )) {
    for (const line of order.lines ?? []) {
      sold.set(
        line.productId,
        (sold.get(line.productId) ?? 0) + (Number(line.quantity) || 0),
      );
    }
  }
  return data.products
    .filter((product) => !product.deletedAt && !product.unlimitedStock)
    .map((product) => {
      const dailyRate = (sold.get(product.id) ?? 0) / days;
      const stock = Number(product.stock) || 0;
      const daysLeft =
        dailyRate > 0 ? stock / dailyRate : Number.POSITIVE_INFINITY;
      return {
        product,
        dailyRate: Math.round(dailyRate * 100) / 100,
        daysLeft: Number.isFinite(daysLeft)
          ? Math.round(daysLeft)
          : Number.POSITIVE_INFINITY,
        suggestedOrder:
          dailyRate > 0 ? Math.max(0, Math.ceil(dailyRate * days - stock)) : 0,
      };
    })
    .filter((entry) => entry.suggestedOrder > 0 || entry.daysLeft < 14)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/** Orders worth a second look before they are shipped. */
export function fraudSignals(
  data: DashboardData,
): { order: AdminRecord; reasons: string[] }[] {
  const results: { order: AdminRecord; reasons: string[] }[] = [];
  const emailCounts = new Map<string, number>();
  for (const order of data.orders) {
    const email = String(order.customerEmail || "").toLowerCase();
    if (email) emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
  }
  const totals = data.orders
    .map((order) => Number(order.total) || 0)
    .sort((a, b) => a - b);
  const median = totals.length
    ? (totals[Math.floor(totals.length / 2)] ?? 0)
    : 0;

  for (const order of data.orders) {
    const reasons: string[] = [];
    const total = Number(order.total) || 0;
    if (median > 0 && total > median * 6)
      reasons.push("Order value is far above the usual basket.");
    if (order.guest && total > median * 3)
      reasons.push("Large order placed as a guest.");
    if (order.paymentStatus === "failed")
      reasons.push("Payment failed at least once.");
    const address = order.shippingAddress as { line1?: string } | undefined;
    if (!address?.line1) reasons.push("Delivery address is incomplete.");
    const email = String(order.customerEmail || "").toLowerCase();
    if (email && (emailCounts.get(email) ?? 0) > 5)
      reasons.push("Many orders from the same email address.");
    if (reasons.length >= 2) results.push({ order, reasons });
  }
  return results.slice(0, 20);
}
