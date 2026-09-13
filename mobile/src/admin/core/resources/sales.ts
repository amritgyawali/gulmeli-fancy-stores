import { f, options } from "../fields.ts";
import type { ResourceDefinition } from "../resource.ts";
import {
  orderStatusOptions,
  paymentStatusOptions,
  publishFields,
  publishOptions,
} from "./common.ts";

export const orders: ResourceDefinition = {
  key: "orders",
  label: "Orders",
  singular: "Order",
  icon: "receipt",
  module: "orders",
  labelField: "number",
  description:
    "Every order with its full lifecycle, fulfilment and money trail.",
  sections: [
    "General",
    "Customer",
    "Addresses",
    "Fulfilment",
    "Money",
    "Notes",
  ],
  fields: [
    f.text("number", "Order number", {
      required: true,
      section: "General",
      width: "half",
    }),
    f.select("status", "Order status", orderStatusOptions, {
      required: true,
      section: "General",
      width: "half",
    }),
    f.select("paymentStatus", "Payment status", paymentStatusOptions, {
      section: "General",
      width: "half",
    }),
    f.text("paymentMethod", "Payment method", {
      section: "General",
      width: "half",
    }),
    f.select(
      "channel",
      "Channel",
      options(["app", "App"], ["web", "Website"], ["manual", "Manual"]),
      {
        section: "General",
        width: "half",
        defaultValue: "manual",
      },
    ),
    f.datetime("placedAt", "Placed at", { section: "General", width: "half" }),

    f.relation("customerId", "Customer", "customers", {
      section: "Customer",
      width: "half",
    }),
    f.text("customerName", "Customer name", {
      section: "Customer",
      width: "half",
    }),
    f.email("customerEmail", "Email", { section: "Customer", width: "half" }),
    f.boolean("guest", "Guest checkout", {
      section: "Customer",
      width: "half",
    }),

    f.json("shippingAddress", "Delivery address", { section: "Addresses" }),
    f.json("billingAddress", "Billing address", { section: "Addresses" }),

    f.text("courier", "Courier", { section: "Fulfilment", width: "half" }),
    f.text("trackingNumber", "Tracking number", {
      section: "Fulfilment",
      width: "half",
    }),
    f.date("expectedDeliveryDate", "Expected delivery", {
      section: "Fulfilment",
      width: "half",
    }),
    f.datetime("deliveredAt", "Delivered at", {
      section: "Fulfilment",
      width: "half",
    }),

    f.repeater(
      "lines",
      "Items",
      [
        f.text("name", "Product"),
        f.text("sku", "SKU", { width: "third" }),
        f.number("quantity", "Qty", { width: "third", min: 1 }),
        f.currency("unitPrice", "Unit price", { width: "third", min: 0 }),
        f.currency("discount", "Discount", { width: "third", min: 0 }),
        f.currency("tax", "Tax", { width: "third", min: 0 }),
        f.currency("costPrice", "Cost", { width: "third", min: 0 }),
      ],
      { section: "Money" },
    ),
    f.text("couponCode", "Coupon code", { section: "Money", width: "half" }),
    f.currency("subtotal", "Subtotal", {
      section: "Money",
      width: "third",
      min: 0,
    }),
    f.currency("discountTotal", "Discount", {
      section: "Money",
      width: "third",
      min: 0,
    }),
    f.currency("shippingTotal", "Shipping fee", {
      section: "Money",
      width: "third",
      min: 0,
    }),
    f.currency("taxTotal", "Tax", { section: "Money", width: "third", min: 0 }),
    f.currency("refundedTotal", "Refunded", {
      section: "Money",
      width: "third",
      min: 0,
    }),
    f.currency("total", "Total", { section: "Money", width: "third", min: 0 }),

    f.textarea("customerNote", "Customer note", { section: "Notes", rows: 3 }),
    f.textarea("internalNote", "Internal note", {
      section: "Notes",
      rows: 3,
      help: "Never shown to the customer.",
    }),
  ],
  columns: [
    { field: "number", label: "Order" },
    { field: "customerName", label: "Customer" },
    { field: "total", label: "Total", format: "currency" },
    {
      field: "status",
      label: "Status",
      format: "badge",
      options: orderStatusOptions,
    },
    {
      field: "paymentStatus",
      label: "Payment",
      format: "badge",
      options: paymentStatusOptions,
      compact: true,
    },
    { field: "placedAt", label: "Placed", format: "datetime", compact: true },
  ],
  searchFields: ["number", "customerName", "customerEmail", "trackingNumber"],
  filters: [
    {
      field: "status",
      label: "Status",
      type: "select",
      options: orderStatusOptions,
    },
    {
      field: "paymentStatus",
      label: "Payment",
      type: "select",
      options: paymentStatusOptions,
    },
    {
      field: "channel",
      label: "Channel",
      type: "select",
      options: options("app", "web", "manual"),
    },
    { field: "placedAt", label: "Placed", type: "dateRange" },
    { field: "total", label: "Total", type: "numberRange" },
  ],
  defaultSort: { field: "placedAt", direction: "desc" },
};

export const returns: ResourceDefinition = {
  key: "returns",
  label: "Returns & refunds",
  singular: "Return",
  icon: "rotate-left",
  module: "returns",
  labelField: "number",
  description:
    "Return requests, approvals, replacements, store credit and refunds.",
  sections: ["General", "Resolution", "Evidence", "Notes"],
  fields: [
    f.text("number", "Return number", {
      required: true,
      section: "General",
      width: "half",
    }),
    f.relation("orderId", "Order", "orders", {
      required: true,
      section: "General",
      width: "half",
    }),
    f.relation("customerId", "Customer", "customers", {
      section: "General",
      width: "half",
    }),
    f.select(
      "status",
      "Status",
      options(
        "requested",
        "approved",
        "rejected",
        "in_transit",
        "received",
        "completed",
        "cancelled",
      ),
      { section: "General", defaultValue: "requested", width: "half" },
    ),
    f.select(
      "reason",
      "Reason",
      options(
        "damaged",
        "wrong_item",
        "not_as_described",
        "size_issue",
        "changed_mind",
        "late_delivery",
        "other",
      ),
      { section: "General", required: true, width: "half" },
    ),
    f.select(
      "condition",
      "Item condition",
      options("unopened", "opened", "used", "damaged"),
      {
        section: "General",
        width: "half",
      },
    ),
    f.select(
      "resolution",
      "Resolution",
      options(
        "refund",
        "partial_refund",
        "replacement",
        "exchange",
        "store_credit",
        "none",
      ),
      { section: "Resolution", defaultValue: "refund", width: "half" },
    ),
    f.currency("refundAmount", "Refund amount", {
      section: "Resolution",
      width: "half",
      min: 0,
    }),
    f.boolean("restock", "Return items to inventory", {
      section: "Resolution",
      defaultValue: true,
      width: "half",
    }),
    f.select(
      "shippingStatus",
      "Return shipping",
      options("not_shipped", "in_transit", "delivered"),
      {
        section: "Resolution",
        width: "half",
      },
    ),
    f.images("images", "Customer photos", { section: "Evidence" }),
    f.textarea("customerNote", "Customer explanation", {
      section: "Evidence",
      rows: 3,
    }),
    f.textarea("internalNote", "Internal note", { section: "Notes", rows: 3 }),
  ],
  columns: [
    { field: "number", label: "Return" },
    {
      field: "orderId",
      label: "Order",
      format: "relation",
      resource: "orders",
    },
    { field: "reason", label: "Reason", format: "badge" },
    { field: "status", label: "Status", format: "badge" },
    { field: "refundAmount", label: "Refund", format: "currency" },
    { field: "createdAt", label: "Requested", format: "date", compact: true },
  ],
  searchFields: ["number", "customerNote"],
  filters: [
    {
      field: "status",
      label: "Status",
      type: "select",
      options: options(
        "requested",
        "approved",
        "rejected",
        "in_transit",
        "received",
        "completed",
        "cancelled",
      ),
    },
    {
      field: "resolution",
      label: "Resolution",
      type: "select",
      options: options(
        "refund",
        "partial_refund",
        "replacement",
        "exchange",
        "store_credit",
        "none",
      ),
    },
    { field: "createdAt", label: "Requested", type: "dateRange" },
  ],
  defaultSort: { field: "createdAt", direction: "desc" },
};

export const transactions: ResourceDefinition = {
  key: "transactions",
  label: "Transactions",
  singular: "Transaction",
  icon: "credit-card",
  module: "payments",
  labelField: "reference",
  description: "Gateway settlements, failures and refunds for reconciliation.",
  fields: [
    f.text("reference", "Transaction ID", { required: true, width: "half" }),
    f.relation("orderId", "Order", "orders", { width: "half" }),
    f.text("gateway", "Gateway", { width: "half" }),
    f.select(
      "type",
      "Type",
      options("payment", "refund", "chargeback", "payout"),
      {
        defaultValue: "payment",
        width: "half",
      },
    ),
    f.select(
      "status",
      "Status",
      options("successful", "pending", "failed", "refunded"),
      {
        defaultValue: "successful",
        width: "half",
      },
    ),
    f.currency("amount", "Amount", { width: "half", min: 0 }),
    f.currency("fee", "Gateway fee", { width: "half", min: 0 }),
    f.text("currency", "Currency", { defaultValue: "NPR", width: "half" }),
    f.boolean("reconciled", "Reconciled", { width: "half" }),
    f.textarea("failureReason", "Failure reason", { rows: 2 }),
  ],
  columns: [
    { field: "reference", label: "Reference" },
    { field: "gateway", label: "Gateway" },
    { field: "type", label: "Type", format: "badge", compact: true },
    { field: "amount", label: "Amount", format: "currency" },
    { field: "status", label: "Status", format: "badge" },
    { field: "createdAt", label: "When", format: "datetime", compact: true },
  ],
  searchFields: ["reference", "gateway"],
  filters: [
    {
      field: "status",
      label: "Status",
      type: "select",
      options: options("successful", "pending", "failed", "refunded"),
    },
    {
      field: "gateway",
      label: "Gateway",
      type: "select",
      options: options(
        "khalti",
        "esewa",
        "fonepay",
        "stripe",
        "paypal",
        "cod",
        "bank_transfer",
      ),
    },
    { field: "reconciled", label: "Reconciled", type: "boolean" },
    { field: "createdAt", label: "Date", type: "dateRange" },
  ],
  defaultSort: { field: "createdAt", direction: "desc" },
  features: { revisions: false },
};

export const paymentMethods: ResourceDefinition = {
  key: "payment_methods",
  label: "Payment methods",
  singular: "Payment method",
  icon: "wallet",
  module: "payments",
  labelField: "name",
  description:
    "Which gateways the storefront offers, and how each is configured.",
  sections: ["General", "Configuration", "Rules"],
  fields: [
    f.text("name", "Display name", {
      required: true,
      section: "General",
      width: "half",
    }),
    f.select(
      "provider",
      "Provider",
      options(
        "cod",
        "card",
        "wallet",
        "bank_transfer",
        "khalti",
        "esewa",
        "fonepay",
        "stripe",
        "paypal",
        "other",
      ),
      { required: true, section: "General", width: "half" },
    ),
    f.boolean("enabled", "Enabled", {
      section: "General",
      defaultValue: true,
      width: "half",
    }),
    f.number("sortOrder", "Sort order", { section: "General", width: "half" }),
    f.image("icon", "Icon", { section: "General", width: "half" }),
    f.textarea("instructions", "Customer instructions", {
      section: "General",
      rows: 3,
    }),
    f.select("mode", "Mode", options(["test", "Test"], ["live", "Live"]), {
      section: "Configuration",
      defaultValue: "test",
      width: "half",
    }),
    f.text("publicKey", "Public key", {
      section: "Configuration",
      width: "half",
    }),
    f.secret("secretKey", "Secret key", {
      section: "Configuration",
      width: "half",
      help: "Masked in the dashboard and never bundled into the customer app.",
    }),
    f.url("webhookUrl", "Webhook URL", {
      section: "Configuration",
      width: "half",
    }),
    f.currency("minOrderTotal", "Minimum order total", {
      section: "Rules",
      width: "third",
      min: 0,
    }),
    f.currency("maxOrderTotal", "Maximum order total", {
      section: "Rules",
      width: "third",
      min: 0,
    }),
    f.currency("extraFee", "Extra fee", {
      section: "Rules",
      width: "third",
      min: 0,
    }),
  ],
  columns: [
    { field: "name", label: "Method" },
    { field: "provider", label: "Provider", format: "badge" },
    { field: "mode", label: "Mode", format: "badge", compact: true },
    { field: "enabled", label: "Enabled", format: "boolean" },
    { field: "sortOrder", label: "Order", format: "number", compact: true },
  ],
  searchFields: ["name", "provider"],
  filters: [{ field: "enabled", label: "Enabled", type: "boolean" }],
  defaultSort: { field: "sortOrder", direction: "asc" },
  features: { reorder: true },
};

export const shippingZones: ResourceDefinition = {
  key: "shipping_zones",
  label: "Shipping zones",
  singular: "Shipping zone",
  icon: "map",
  module: "shipping",
  labelField: "name",
  fields: [
    f.text("name", "Zone name", { required: true, width: "half" }),
    f.boolean("enabled", "Enabled", { defaultValue: true, width: "half" }),
    f.tags("countries", "Countries", { defaultValue: ["Nepal"] }),
    f.tags("provinces", "Provinces / states"),
    f.tags("districts", "Districts"),
    f.tags("cities", "Cities"),
    f.tags("postalCodes", "Postal codes"),
    f.currency("freeShippingThreshold", "Free shipping above", {
      width: "half",
      min: 0,
    }),
    f.number("sortOrder", "Sort order", { width: "half" }),
  ],
  columns: [
    { field: "name", label: "Zone" },
    { field: "countries", label: "Countries", format: "tags", compact: true },
    { field: "freeShippingThreshold", label: "Free above", format: "currency" },
    { field: "enabled", label: "Enabled", format: "boolean" },
  ],
  searchFields: ["name", "cities", "districts"],
  defaultSort: { field: "sortOrder", direction: "asc" },
  features: { reorder: true, duplicate: true },
};

export const shippingRates: ResourceDefinition = {
  key: "shipping_rates",
  label: "Shipping rates",
  singular: "Shipping rate",
  icon: "truck",
  module: "shipping",
  labelField: "name",
  fields: [
    f.text("name", "Rate name", { required: true, width: "half" }),
    f.relation("zoneId", "Zone", "shipping_zones", {
      required: true,
      width: "half",
    }),
    f.select(
      "method",
      "Delivery method",
      options("standard", "express", "same_day", "next_day", "pickup"),
      {
        defaultValue: "standard",
        width: "half",
      },
    ),
    f.select(
      "basis",
      "Priced by",
      options(
        ["flat", "Flat rate"],
        ["weight", "Weight"],
        ["price", "Order value"],
        ["product", "Per product"],
        ["category", "Category"],
      ),
      { defaultValue: "flat", width: "half" },
    ),
    f.currency("amount", "Amount", { width: "third", min: 0 }),
    f.number("minValue", "From (kg or amount)", { width: "third", min: 0 }),
    f.number("maxValue", "To (kg or amount)", { width: "third", min: 0 }),
    f.relation("categoryId", "Category", "categories", {
      width: "half",
      showIf: (values) => values.basis === "category",
    }),
    f.text("estimate", "Delivery estimate", {
      placeholder: "2-4 business days",
      width: "half",
    }),
    f.boolean("enabled", "Enabled", { defaultValue: true, width: "half" }),
    f.number("sortOrder", "Sort order", { width: "half" }),
  ],
  columns: [
    { field: "name", label: "Rate" },
    {
      field: "zoneId",
      label: "Zone",
      format: "relation",
      resource: "shipping_zones",
    },
    { field: "method", label: "Method", format: "badge" },
    { field: "amount", label: "Amount", format: "currency" },
    { field: "enabled", label: "Enabled", format: "boolean", compact: true },
  ],
  searchFields: ["name", "estimate"],
  filters: [
    {
      field: "method",
      label: "Method",
      type: "select",
      options: options("standard", "express", "same_day", "next_day", "pickup"),
    },
  ],
  defaultSort: { field: "sortOrder", direction: "asc" },
  features: { reorder: true, duplicate: true },
};

export const couriers: ResourceDefinition = {
  key: "couriers",
  label: "Couriers",
  singular: "Courier",
  icon: "motorcycle",
  module: "shipping",
  labelField: "name",
  fields: [
    f.text("name", "Courier name", { required: true, width: "half" }),
    f.phone("phone", "Contact number", { width: "half" }),
    f.url("trackingUrlTemplate", "Tracking URL template", {
      placeholder: "https://courier.example/track/{tracking}",
      help: "{tracking} is replaced with the order's tracking number.",
    }),
    f.secret("apiKey", "API key"),
    f.boolean("enabled", "Enabled", { defaultValue: true, width: "half" }),
    f.number("sortOrder", "Sort order", { width: "half" }),
  ],
  columns: [
    { field: "name", label: "Courier" },
    { field: "phone", label: "Phone", compact: true },
    { field: "enabled", label: "Enabled", format: "boolean" },
  ],
  searchFields: ["name"],
  defaultSort: { field: "sortOrder", direction: "asc" },
  features: { reorder: true },
};

export const deliveries: ResourceDefinition = {
  key: "deliveries",
  label: "Deliveries",
  singular: "Delivery",
  icon: "location-dot",
  module: "shipping",
  labelField: "trackingNumber",
  description: "Rider assignment, delivery proof and failed-attempt reasons.",
  fields: [
    f.relation("orderId", "Order", "orders", { required: true, width: "half" }),
    f.relation("courierId", "Courier", "couriers", { width: "half" }),
    f.text("rider", "Rider", { width: "half" }),
    f.text("trackingNumber", "Tracking number", { width: "half" }),
    f.select(
      "status",
      "Delivery status",
      options(
        "assigned",
        "picked_up",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "failed",
        "returned",
      ),
      { defaultValue: "assigned", width: "half" },
    ),
    f.datetime("scheduledFor", "Scheduled for", { width: "half" }),
    f.datetime("deliveredAt", "Delivered at", { width: "half" }),
    f.number("attempts", "Attempts", {
      defaultValue: 1,
      width: "half",
      min: 0,
    }),
    f.image("proofImage", "Delivery proof", { width: "half" }),
    f.textarea("failureReason", "Failed delivery reason", { rows: 2 }),
    f.textarea("note", "Delivery notes", { rows: 2 }),
  ],
  columns: [
    {
      field: "orderId",
      label: "Order",
      format: "relation",
      resource: "orders",
    },
    { field: "rider", label: "Rider" },
    { field: "status", label: "Status", format: "badge" },
    {
      field: "scheduledFor",
      label: "Scheduled",
      format: "datetime",
      compact: true,
    },
    { field: "attempts", label: "Attempts", format: "number", compact: true },
  ],
  searchFields: ["trackingNumber", "rider"],
  filters: [
    {
      field: "status",
      label: "Status",
      type: "select",
      options: options(
        "assigned",
        "picked_up",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "failed",
        "returned",
      ),
    },
  ],
  defaultSort: { field: "createdAt", direction: "desc" },
};

export const taxRates: ResourceDefinition = {
  key: "tax_rates",
  label: "Tax rates",
  singular: "Tax rate",
  icon: "percent",
  module: "finance",
  labelField: "name",
  fields: [
    f.text("name", "Name", { required: true, width: "half" }),
    f.percent("rate", "Rate %", {
      required: true,
      min: 0,
      max: 100,
      width: "half",
    }),
    f.select(
      "scope",
      "Applies to",
      options(
        ["global", "Everything"],
        ["category", "A category"],
        ["product", "A product"],
        ["location", "A location"],
      ),
      { defaultValue: "global", width: "half" },
    ),
    f.relation("categoryId", "Category", "categories", {
      width: "half",
      showIf: (values) => values.scope === "category",
    }),
    f.relation("productId", "Product", "products", {
      width: "half",
      showIf: (values) => values.scope === "product",
    }),
    f.text("region", "Region", {
      width: "half",
      showIf: (values) => values.scope === "location",
    }),
    f.text("taxCode", "Tax label on invoices", {
      width: "half",
      defaultValue: "VAT",
    }),
    f.boolean("inclusive", "Prices already include this tax", {
      width: "half",
    }),
    f.boolean("enabled", "Enabled", { defaultValue: true, width: "half" }),
  ],
  columns: [
    { field: "name", label: "Tax" },
    { field: "rate", label: "Rate", format: "percent" },
    { field: "scope", label: "Scope", format: "badge" },
    {
      field: "inclusive",
      label: "Inclusive",
      format: "boolean",
      compact: true,
    },
    { field: "enabled", label: "Enabled", format: "boolean" },
  ],
  searchFields: ["name", "taxCode"],
  defaultSort: { field: "name", direction: "asc" },
};

export const coupons: ResourceDefinition = {
  key: "coupons",
  label: "Coupons",
  singular: "Coupon",
  icon: "ticket",
  module: "discounts",
  labelField: "code",
  description:
    "Manual codes and automatic discounts with full eligibility rules.",
  sections: [
    "General",
    "Discount",
    "Eligibility",
    "Limits",
    "Schedule",
    "Performance",
  ],
  fields: [
    f.text("code", "Coupon code", {
      required: true,
      section: "General",
      width: "half",
    }),
    f.text("title", "Internal title", { section: "General", width: "half" }),
    f.textarea("description", "Customer-facing description", {
      section: "General",
      rows: 2,
    }),
    f.boolean("automatic", "Apply automatically, without a code", {
      section: "General",
    }),
    f.boolean("enabled", "Enabled", {
      section: "General",
      defaultValue: true,
      width: "half",
    }),

    f.select(
      "type",
      "Discount type",
      options(
        ["percentage", "Percentage"],
        ["fixed", "Fixed amount"],
        ["free_shipping", "Free shipping"],
        ["bxgy", "Buy X get Y"],
      ),
      {
        section: "Discount",
        defaultValue: "percentage",
        width: "half",
        required: true,
      },
    ),
    f.number("value", "Discount value", {
      section: "Discount",
      width: "half",
      min: 0,
    }),
    f.currency("maxDiscount", "Maximum discount", {
      section: "Discount",
      width: "half",
      min: 0,
    }),
    f.number("buyQuantity", "Buy quantity", {
      section: "Discount",
      width: "half",
      min: 1,
      showIf: (values) => values.type === "bxgy",
    }),
    f.number("getQuantity", "Get quantity free", {
      section: "Discount",
      width: "half",
      min: 1,
      showIf: (values) => values.type === "bxgy",
    }),

    f.select(
      "appliesTo",
      "Applies to",
      options(
        ["all", "The entire order"],
        ["products", "Specific products"],
        ["categories", "Categories"],
        ["collections", "Collections"],
      ),
      { section: "Eligibility", defaultValue: "all", width: "half" },
    ),
    f.relation("productIds", "Products", "products", {
      section: "Eligibility",
      multiple: true,
      showIf: (values) => values.appliesTo === "products",
    }),
    f.relation("categoryIds", "Categories", "categories", {
      section: "Eligibility",
      multiple: true,
      showIf: (values) => values.appliesTo === "categories",
    }),
    f.relation("collectionIds", "Collections", "collections", {
      section: "Eligibility",
      multiple: true,
      showIf: (values) => values.appliesTo === "collections",
    }),
    f.currency("minPurchase", "Minimum purchase", {
      section: "Eligibility",
      width: "half",
      min: 0,
    }),
    f.relation("customerIds", "Specific customers", "customers", {
      section: "Eligibility",
      multiple: true,
    }),
    f.relation("customerGroupIds", "Customer groups", "customer_groups", {
      section: "Eligibility",
      multiple: true,
    }),
    f.boolean("firstOrderOnly", "First order only", {
      section: "Eligibility",
      width: "half",
    }),
    f.boolean("birthdayOnly", "Birthday coupon", {
      section: "Eligibility",
      width: "half",
    }),

    f.number("usageLimit", "Total usage limit", {
      section: "Limits",
      width: "half",
      min: 0,
    }),
    f.number("perCustomerLimit", "Per-customer limit", {
      section: "Limits",
      width: "half",
      defaultValue: 1,
      min: 0,
    }),
    f.boolean("oneTime", "Single use only", {
      section: "Limits",
      width: "half",
    }),

    f.datetime("startsAt", "Starts", { section: "Schedule", width: "half" }),
    f.datetime("endsAt", "Ends", { section: "Schedule", width: "half" }),

    f.readonly("usageCount", "Times used", {
      section: "Performance",
      width: "third",
    }),
    f.readonly("revenue", "Revenue influenced", {
      section: "Performance",
      width: "third",
    }),
    f.readonly("discountGiven", "Discount given", {
      section: "Performance",
      width: "third",
    }),
  ],
  columns: [
    { field: "code", label: "Code" },
    { field: "type", label: "Type", format: "badge" },
    { field: "value", label: "Value", format: "number" },
    { field: "usageCount", label: "Used", format: "number" },
    { field: "endsAt", label: "Ends", format: "date", compact: true },
    { field: "enabled", label: "Enabled", format: "boolean" },
  ],
  searchFields: ["code", "title", "description"],
  filters: [
    {
      field: "type",
      label: "Type",
      type: "select",
      options: options("percentage", "fixed", "free_shipping", "bxgy"),
    },
    { field: "enabled", label: "Enabled", type: "boolean" },
    { field: "automatic", label: "Automatic", type: "boolean" },
  ],
  defaultSort: { field: "createdAt", direction: "desc" },
  features: { duplicate: true },
};

export const flashSales: ResourceDefinition = {
  key: "flash_sales",
  label: "Flash sales",
  singular: "Flash sale",
  icon: "bolt",
  module: "discounts",
  labelField: "name",
  fields: [
    f.text("name", "Sale name", { required: true, width: "half" }),
    f.boolean("enabled", "Enabled", { defaultValue: true, width: "half" }),
    f.datetime("startsAt", "Start time", { required: true, width: "half" }),
    f.datetime("endsAt", "End time", { required: true, width: "half" }),
    f.select(
      "discountType",
      "Discount type",
      options(["percentage", "Percentage"], ["fixed", "Fixed amount"]),
      {
        defaultValue: "percentage",
        width: "half",
      },
    ),
    f.number("discountValue", "Discount amount", { width: "half", min: 0 }),
    f.relation("productIds", "Products", "products", { multiple: true }),
    f.relation("categoryIds", "Categories", "categories", { multiple: true }),
    f.number("stockLimit", "Stock limit for the sale", {
      width: "half",
      min: 0,
    }),
    f.boolean("showCountdown", "Show the countdown timer", {
      defaultValue: true,
      width: "half",
    }),
    f.image("banner", "Flash-sale banner", { section: "Media" }),
    f.readonly("unitsSold", "Units sold", {
      section: "Performance",
      width: "half",
    }),
    f.readonly("revenue", "Revenue", { section: "Performance", width: "half" }),
  ],
  columns: [
    { field: "name", label: "Flash sale" },
    { field: "startsAt", label: "Starts", format: "datetime" },
    { field: "endsAt", label: "Ends", format: "datetime" },
    { field: "discountValue", label: "Discount", format: "number" },
    { field: "enabled", label: "Enabled", format: "boolean" },
  ],
  searchFields: ["name"],
  defaultSort: { field: "startsAt", direction: "desc" },
  features: { duplicate: true },
};

export const promotions: ResourceDefinition = {
  key: "promotions",
  label: "Offers & promotions",
  singular: "Promotion",
  icon: "gift",
  module: "discounts",
  labelField: "name",
  fields: [
    f.text("name", "Promotion name", { required: true, width: "half" }),
    f.select(
      "kind",
      "Promotion type",
      options(
        "festival",
        "combo",
        "bundle",
        "free_gift",
        "spend_get",
        "category",
        "customer_specific",
      ),
      { defaultValue: "festival", width: "half" },
    ),
    f.textarea("description", "Description", { rows: 3 }),
    f.currency("spendThreshold", "Spend at least", { width: "half", min: 0 }),
    f.relation("giftProductId", "Free gift product", "products", {
      width: "half",
    }),
    f.relation("productIds", "Products", "products", { multiple: true }),
    f.relation("categoryIds", "Categories", "categories", { multiple: true }),
    f.relation("customerGroupIds", "Customer groups", "customer_groups", {
      multiple: true,
    }),
    f.number("discountValue", "Discount value", { width: "half", min: 0 }),
    f.image("banner", "Banner", { section: "Media" }),
    ...publishFields,
  ],
  columns: [
    { field: "name", label: "Promotion" },
    { field: "kind", label: "Type", format: "badge" },
    {
      field: "status",
      label: "Status",
      format: "badge",
      options: publishOptions,
    },
    { field: "publishAt", label: "Starts", format: "date", compact: true },
  ],
  searchFields: ["name", "description"],
  features: { publish: true, duplicate: true },
};

export const giftCards: ResourceDefinition = {
  key: "gift_cards",
  label: "Gift cards & credit",
  singular: "Gift card",
  icon: "gift",
  module: "discounts",
  labelField: "code",
  fields: [
    f.text("code", "Gift card code", { required: true, width: "half" }),
    f.currency("initialValue", "Initial value", {
      required: true,
      width: "half",
      min: 0,
    }),
    f.currency("balance", "Current balance", { width: "half", min: 0 }),
    f.relation("customerId", "Assigned to", "customers", { width: "half" }),
    f.date("expiresAt", "Expires", { width: "half" }),
    f.boolean("enabled", "Active", { defaultValue: true, width: "half" }),
    f.repeater(
      "usage",
      "Usage history",
      [
        f.datetime("at", "When"),
        f.currency("amount", "Amount"),
        f.text("orderNumber", "Order"),
      ],
      {},
    ),
    f.textarea("note", "Note", { rows: 2 }),
  ],
  columns: [
    { field: "code", label: "Code" },
    { field: "balance", label: "Balance", format: "currency" },
    {
      field: "customerId",
      label: "Customer",
      format: "relation",
      resource: "customers",
      compact: true,
    },
    { field: "expiresAt", label: "Expires", format: "date" },
    { field: "enabled", label: "Active", format: "boolean" },
  ],
  searchFields: ["code", "note"],
  defaultSort: { field: "createdAt", direction: "desc" },
};

export const salesResources = [
  orders,
  returns,
  transactions,
  paymentMethods,
  shippingZones,
  shippingRates,
  couriers,
  deliveries,
  taxRates,
  coupons,
  flashSales,
  promotions,
  giftCards,
];
