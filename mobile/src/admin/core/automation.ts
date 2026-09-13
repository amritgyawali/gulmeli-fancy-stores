import { inRange, type DashboardData } from "./metrics.ts";
import type { AdminRecord } from "./types.ts";

export type AutomationTrigger =
  | "stock_below"
  | "order_placed"
  | "order_shipped"
  | "order_delivered"
  | "cart_abandoned"
  | "back_in_stock"
  | "customer_spend"
  | "order_total_above"
  | "payment_failed"
  | "refund_approved"
  | "review_created";

export type AutomationAction =
  | "notify_admin"
  | "email_customer"
  | "push_customer"
  | "sms_customer"
  | "tag_customer"
  | "assign_vip"
  | "free_shipping"
  | "create_ticket"
  | "webhook";

export interface AutomationRule extends AdminRecord {
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  threshold?: number;
  action: AutomationAction;
  actionValue?: string;
  delayMinutes?: number;
  description?: string;
  lastRunAt?: string | null;
  runCount?: number;
}

export interface AutomationMatch {
  ruleId: string;
  ruleName: string;
  action: AutomationAction;
  actionValue: string;
  /** Collection and id of the record that triggered the rule. */
  subject: { resource: string; id: string; label: string };
  message: string;
}

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  stock_below: "Stock falls below a threshold",
  order_placed: "An order is placed",
  order_shipped: "An order is shipped",
  order_delivered: "An order is delivered",
  cart_abandoned: "A cart is abandoned",
  back_in_stock: "A product is back in stock",
  customer_spend: "A customer's lifetime spend passes an amount",
  order_total_above: "An order total passes an amount",
  payment_failed: "A payment fails",
  refund_approved: "A refund is approved",
  review_created: "A review is submitted",
};

export const ACTION_LABELS: Record<AutomationAction, string> = {
  notify_admin: "Notify the admin team",
  email_customer: "Email the customer",
  push_customer: "Send a push notification",
  sms_customer: "Send an SMS",
  tag_customer: "Tag the customer",
  assign_vip: "Make the customer VIP",
  free_shipping: "Give free shipping",
  create_ticket: "Open a support ticket",
  webhook: "Call a webhook",
};

function subjectOf(resource: string, record: AdminRecord, label: string) {
  return { resource, id: record.id, label };
}

/**
 * Evaluates every enabled rule against the current data and returns what would
 * happen. The dashboard shows these as a preview, and running a rule records
 * the outcome in the run log - delivery itself is the provider's job.
 */
export function evaluateAutomations(
  rules: AutomationRule[],
  data: DashboardData,
  now = new Date(),
): AutomationMatch[] {
  const matches: AutomationMatch[] = [];
  const since = { from: new Date(now.getTime() - 7 * 86_400_000), to: now };

  for (const rule of rules) {
    if (!rule.enabled || rule.deletedAt) continue;
    const threshold = Number(rule.threshold ?? 0);
    const actionValue = String(rule.actionValue ?? "");
    const add = (subject: AutomationMatch["subject"], message: string) =>
      matches.push({
        ruleId: rule.id,
        ruleName: rule.name,
        action: rule.action,
        actionValue,
        subject,
        message,
      });

    switch (rule.trigger) {
      case "stock_below":
        for (const product of data.products) {
          if (product.deletedAt || product.unlimitedStock) continue;
          const stock = Number(product.stock) || 0;
          const limit = threshold || Number(product.lowStockThreshold ?? 5);
          if (stock <= limit)
            add(
              subjectOf("products", product, String(product.name)),
              `${product.name} has ${stock} left, at or below ${limit}.`,
            );
        }
        break;
      case "order_placed":
        for (const order of data.orders) {
          if (!inRange(order.placedAt, since)) continue;
          add(
            subjectOf("orders", order, order.number),
            `Order ${order.number} was placed.`,
          );
        }
        break;
      case "order_shipped":
        for (const order of data.orders) {
          if (order.status !== "shipped" && order.status !== "out_for_delivery")
            continue;
          add(
            subjectOf("orders", order, order.number),
            `Order ${order.number} is on its way.`,
          );
        }
        break;
      case "order_delivered":
        for (const order of data.orders) {
          if (order.status !== "delivered") continue;
          add(
            subjectOf("orders", order, order.number),
            `Order ${order.number} was delivered.`,
          );
        }
        break;
      case "cart_abandoned":
        for (const cart of data.carts) {
          if (cart.state !== "abandoned") continue;
          add(
            subjectOf("carts", cart, String(cart.email ?? cart.id)),
            `${cart.email ?? "A shopper"} left a cart worth ${cart.value}.`,
          );
        }
        break;
      case "back_in_stock":
        for (const product of data.products) {
          if (product.deletedAt) continue;
          if ((Number(product.stock) || 0) <= 0) continue;
          const waiting = Number(product.backInStockRequests ?? 0);
          if (waiting > 0)
            add(
              subjectOf("products", product, String(product.name)),
              `${product.name} is back in stock and ${waiting} customer(s) asked to be told.`,
            );
        }
        break;
      case "customer_spend":
        for (const customer of data.customers) {
          if ((Number(customer.totalSpent) || 0) < threshold) continue;
          add(
            subjectOf("customers", customer, String(customer.name)),
            `${customer.name} has spent ${customer.totalSpent}, past ${threshold}.`,
          );
        }
        break;
      case "order_total_above":
        for (const order of data.orders) {
          if ((Number(order.total) || 0) < threshold) continue;
          add(
            subjectOf("orders", order, order.number),
            `Order ${order.number} totals ${order.total}, past ${threshold}.`,
          );
        }
        break;
      case "payment_failed":
        for (const transaction of data.transactions) {
          if (transaction.status !== "failed") continue;
          add(
            subjectOf(
              "transactions",
              transaction,
              String(transaction.reference),
            ),
            `Payment ${transaction.reference} failed on ${transaction.gateway}.`,
          );
        }
        break;
      case "refund_approved":
        for (const entry of data.returns) {
          if (entry.status !== "approved" && entry.status !== "completed")
            continue;
          add(
            subjectOf("returns", entry, String(entry.number)),
            `Return ${entry.number} was approved for ${entry.refundAmount}.`,
          );
        }
        break;
      case "review_created":
        for (const review of data.reviews) {
          if (!inRange(review.createdAt, since)) continue;
          add(
            subjectOf("reviews", review, String(review.title ?? review.id)),
            `A ${review.rating}-star review was submitted.`,
          );
        }
        break;
      default:
        break;
    }
  }

  return matches;
}

/** A concise preview line for the Automation screen. */
export function describeRule(rule: AutomationRule): string {
  const trigger = TRIGGER_LABELS[rule.trigger] ?? rule.trigger;
  const action = ACTION_LABELS[rule.action] ?? rule.action;
  const threshold = rule.threshold ? ` (${rule.threshold})` : "";
  const detail = rule.actionValue ? ` → ${rule.actionValue}` : "";
  return `When ${trigger.toLowerCase()}${threshold}, ${action.toLowerCase()}${detail}.`;
}
