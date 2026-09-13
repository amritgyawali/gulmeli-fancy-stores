import { f, options } from "../fields.ts";
import type { ResourceDefinition } from "../resource.ts";
import {
  audienceOptions,
  publishFields,
  publishOptions,
  scheduleFields,
} from "./common.ts";

export const campaigns: ResourceDefinition = {
  key: "campaigns",
  label: "Campaigns",
  singular: "Campaign",
  icon: "bullhorn",
  module: "marketing",
  labelField: "name",
  description: "Email, SMS, push and coupon campaigns with their performance.",
  sections: ["General", "Audience", "Content", "Schedule", "Performance"],
  fields: [
    f.text("name", "Campaign name", {
      required: true,
      section: "General",
      width: "half",
    }),
    f.select(
      "channel",
      "Channel",
      options(
        ["email", "Email"],
        ["sms", "SMS"],
        ["push", "Push"],
        ["coupon", "Coupon"],
      ),
      {
        required: true,
        section: "General",
        defaultValue: "email",
        width: "half",
      },
    ),
    f.select(
      "status",
      "Status",
      options("draft", "scheduled", "sending", "sent", "paused"),
      {
        section: "General",
        defaultValue: "draft",
        width: "half",
      },
    ),
    f.select("audience", "Audience", audienceOptions, {
      section: "Audience",
      defaultValue: "all",
      width: "half",
    }),
    f.relation("segmentId", "Segment", "segments", {
      section: "Audience",
      width: "half",
      showIf: (values) => values.audience === "segment",
    }),
    f.readonly("recipients", "Recipients", {
      section: "Audience",
      width: "half",
    }),
    f.text("subject", "Subject / title", { section: "Content" }),
    f.textarea("body", "Message", { section: "Content", rows: 6 }),
    f.image("image", "Image", { section: "Content", width: "half" }),
    f.url("link", "Destination URL", { section: "Content", width: "half" }),
    f.relation("couponId", "Coupon", "coupons", {
      section: "Content",
      width: "half",
    }),
    ...scheduleFields(),
    f.readonly("sent", "Sent", { section: "Performance", width: "third" }),
    f.readonly("clicks", "Clicks", { section: "Performance", width: "third" }),
    f.readonly("conversions", "Conversions", {
      section: "Performance",
      width: "third",
    }),
    f.readonly("revenue", "Revenue", {
      section: "Performance",
      width: "third",
    }),
  ],
  columns: [
    { field: "name", label: "Campaign" },
    { field: "channel", label: "Channel", format: "badge" },
    { field: "status", label: "Status", format: "badge" },
    { field: "sent", label: "Sent", format: "number", compact: true },
    { field: "clicks", label: "Clicks", format: "number", compact: true },
    { field: "revenue", label: "Revenue", format: "currency" },
  ],
  searchFields: ["name", "subject", "body"],
  filters: [
    {
      field: "channel",
      label: "Channel",
      type: "select",
      options: options("email", "sms", "push", "coupon"),
    },
    {
      field: "status",
      label: "Status",
      type: "select",
      options: options("draft", "scheduled", "sending", "sent", "paused"),
    },
  ],
  defaultSort: { field: "createdAt", direction: "desc" },
  features: { duplicate: true },
};

export const segments: ResourceDefinition = {
  key: "segments",
  label: "Customer segments",
  singular: "Segment",
  icon: "filter",
  module: "marketing",
  labelField: "name",
  description:
    "Saved audience rules used by campaigns, coupons and automations.",
  fields: [
    f.text("name", "Segment name", { required: true, width: "half" }),
    f.select("preset", "Preset", audienceOptions, {
      defaultValue: "all",
      width: "half",
    }),
    f.textarea("description", "Description", { rows: 2 }),
    f.repeater(
      "rules",
      "Rules",
      [
        f.select(
          "field",
          "Field",
          options(
            "totalSpent",
            "orderCount",
            "lastOrderAt",
            "createdAt",
            "tags",
            "vip",
            "city",
            "acceptsMarketing",
          ),
        ),
        f.select(
          "operator",
          "Operator",
          options("eq", "ne", "gt", "gte", "lt", "lte", "contains", "exists"),
        ),
        f.text("value", "Value"),
      ],
      {},
    ),
    f.readonly("memberCount", "Members", { width: "half" }),
  ],
  columns: [
    { field: "name", label: "Segment" },
    { field: "preset", label: "Preset", format: "badge" },
    { field: "memberCount", label: "Members", format: "number" },
    { field: "updatedAt", label: "Updated", format: "date", compact: true },
  ],
  searchFields: ["name", "description"],
  features: { duplicate: true },
};

export const popups: ResourceDefinition = {
  key: "popups",
  label: "Popups",
  singular: "Popup",
  icon: "window-maximize",
  module: "marketing",
  labelField: "name",
  sections: ["General", "Content", "Targeting", "Publishing"],
  fields: [
    f.text("name", "Popup name", {
      required: true,
      section: "General",
      width: "half",
    }),
    f.select(
      "kind",
      "Type",
      options(
        ["newsletter", "Newsletter"],
        ["coupon", "Coupon"],
        ["exit_intent", "Exit intent"],
        ["promotional", "Promotional"],
        ["mobile", "Mobile only"],
      ),
      { section: "General", defaultValue: "promotional", width: "half" },
    ),
    f.text("heading", "Heading", { section: "Content" }),
    f.textarea("body", "Body text", { section: "Content", rows: 3 }),
    f.image("image", "Image", { section: "Content", width: "half" }),
    f.text("ctaLabel", "Button label", { section: "Content", width: "half" }),
    f.url("ctaLink", "Button link", { section: "Content", width: "half" }),
    f.text("couponCode", "Coupon code to show", {
      section: "Content",
      width: "half",
    }),
    f.multiselect(
      "targetPages",
      "Target pages",
      options("home", "category", "product", "cart", "checkout", "any"),
      {
        section: "Targeting",
        defaultValue: ["home"],
      },
    ),
    f.select(
      "trigger",
      "Trigger",
      options(
        ["time", "After a delay"],
        ["scroll", "On scroll"],
        ["exit", "On exit intent"],
      ),
      {
        section: "Targeting",
        defaultValue: "time",
        width: "half",
      },
    ),
    f.number("delaySeconds", "Delay (seconds)", {
      section: "Targeting",
      width: "half",
      min: 0,
      defaultValue: 5,
    }),
    f.number("scrollPercent", "Scroll depth %", {
      section: "Targeting",
      width: "half",
      min: 0,
      max: 100,
    }),
    f.select(
      "frequency",
      "Frequency",
      options(
        ["once", "Once per visitor"],
        ["session", "Once per session"],
        ["always", "Every visit"],
      ),
      { section: "Targeting", defaultValue: "session", width: "half" },
    ),
    f.multiselect("devices", "Devices", options("mobile", "desktop"), {
      section: "Targeting",
      defaultValue: ["mobile", "desktop"],
    }),
    ...publishFields,
  ],
  columns: [
    { field: "name", label: "Popup" },
    { field: "kind", label: "Type", format: "badge" },
    { field: "trigger", label: "Trigger", format: "badge", compact: true },
    {
      field: "status",
      label: "Status",
      format: "badge",
      options: publishOptions,
    },
  ],
  searchFields: ["name", "heading", "body"],
  features: { publish: true, duplicate: true },
};

export const referrals: ResourceDefinition = {
  key: "referrals",
  label: "Referral program",
  singular: "Referral",
  icon: "share-nodes",
  module: "marketing",
  labelField: "code",
  fields: [
    f.text("code", "Referral code", { required: true, width: "half" }),
    f.relation("referrerId", "Referrer", "customers", { width: "half" }),
    f.url("link", "Referral link"),
    f.currency("referrerReward", "Referrer reward", { width: "third", min: 0 }),
    f.currency("newCustomerReward", "New-customer reward", {
      width: "third",
      min: 0,
    }),
    f.number("usageLimit", "Usage limit", { width: "third", min: 0 }),
    f.readonly("signups", "Signups", { width: "third" }),
    f.readonly("orders", "Orders", { width: "third" }),
    f.readonly("revenue", "Revenue", { width: "third" }),
    f.boolean("enabled", "Enabled", { defaultValue: true, width: "half" }),
  ],
  columns: [
    { field: "code", label: "Code" },
    {
      field: "referrerId",
      label: "Referrer",
      format: "relation",
      resource: "customers",
    },
    { field: "signups", label: "Signups", format: "number" },
    { field: "revenue", label: "Revenue", format: "currency" },
    { field: "enabled", label: "Enabled", format: "boolean" },
  ],
  searchFields: ["code"],
};

export const loyaltyRules: ResourceDefinition = {
  key: "loyalty_rules",
  label: "Loyalty & rewards",
  singular: "Loyalty rule",
  icon: "medal",
  module: "marketing",
  labelField: "name",
  fields: [
    f.text("name", "Rule name", { required: true, width: "half" }),
    f.select(
      "trigger",
      "Awarded for",
      options(
        ["purchase", "Every purchase"],
        ["signup", "Signing up"],
        ["referral", "A referral"],
        ["birthday", "A birthday"],
        ["review", "Writing a review"],
        ["bonus", "A manual bonus"],
      ),
      { defaultValue: "purchase", width: "half" },
    ),
    f.number("pointsPerUnit", "Points per Rs. 100 spent", {
      width: "third",
      min: 0,
    }),
    f.number("fixedPoints", "Fixed points", { width: "third", min: 0 }),
    f.number("pointValue", "Rupees per point when redeemed", {
      width: "third",
      min: 0,
    }),
    f.number("minRedemption", "Minimum redemption", { width: "third", min: 0 }),
    f.number("maxRedemption", "Maximum redemption", { width: "third", min: 0 }),
    f.number("expiryDays", "Points expire after (days)", {
      width: "third",
      min: 0,
    }),
    f.boolean("enabled", "Enabled", { defaultValue: true, width: "half" }),
  ],
  columns: [
    { field: "name", label: "Rule" },
    { field: "trigger", label: "Trigger", format: "badge" },
    {
      field: "pointsPerUnit",
      label: "Points / Rs.100",
      format: "number",
      compact: true,
    },
    {
      field: "fixedPoints",
      label: "Fixed points",
      format: "number",
      compact: true,
    },
    { field: "enabled", label: "Enabled", format: "boolean" },
  ],
  searchFields: ["name"],
};

export const backInStock: ResourceDefinition = {
  key: "back_in_stock",
  label: "Back-in-stock alerts",
  singular: "Back-in-stock request",
  icon: "bell",
  module: "marketing",
  labelField: "email",
  fields: [
    f.relation("productId", "Product", "products", {
      required: true,
      width: "half",
    }),
    f.relation("customerId", "Customer", "customers", { width: "half" }),
    f.email("email", "Email", { width: "half" }),
    f.select(
      "status",
      "Status",
      options("waiting", "notified", "converted", "cancelled"),
      {
        defaultValue: "waiting",
        width: "half",
      },
    ),
    f.datetime("notifiedAt", "Notified at", { width: "half" }),
  ],
  columns: [
    {
      field: "productId",
      label: "Product",
      format: "relation",
      resource: "products",
    },
    { field: "email", label: "Customer" },
    { field: "status", label: "Status", format: "badge" },
    { field: "createdAt", label: "Requested", format: "date", compact: true },
  ],
  searchFields: ["email"],
  filters: [
    {
      field: "status",
      label: "Status",
      type: "select",
      options: options("waiting", "notified", "converted", "cancelled"),
    },
  ],
  defaultSort: { field: "createdAt", direction: "desc" },
  features: { create: false, revisions: false },
};

export const priceAlerts: ResourceDefinition = {
  key: "price_alerts",
  label: "Price-drop alerts",
  singular: "Price alert",
  icon: "arrow-trend-down",
  module: "marketing",
  labelField: "email",
  fields: [
    f.relation("productId", "Product", "products", {
      required: true,
      width: "half",
    }),
    f.relation("customerId", "Customer", "customers", { width: "half" }),
    f.email("email", "Email", { width: "half" }),
    f.currency("targetPrice", "Notify below", { width: "half", min: 0 }),
    f.select(
      "status",
      "Status",
      options("watching", "notified", "converted", "cancelled"),
      {
        defaultValue: "watching",
        width: "half",
      },
    ),
  ],
  columns: [
    {
      field: "productId",
      label: "Product",
      format: "relation",
      resource: "products",
    },
    { field: "email", label: "Customer" },
    { field: "targetPrice", label: "Target", format: "currency" },
    { field: "status", label: "Status", format: "badge" },
  ],
  searchFields: ["email"],
  defaultSort: { field: "createdAt", direction: "desc" },
  features: { create: false, revisions: false },
};

export const notifications: ResourceDefinition = {
  key: "notifications",
  label: "Notification history",
  singular: "Notification",
  icon: "paper-plane",
  module: "notifications",
  labelField: "title",
  description: "Everything queued, scheduled or sent, across every channel.",
  fields: [
    f.text("title", "Title", { required: true }),
    f.textarea("body", "Message", { rows: 3 }),
    f.multiselect(
      "channels",
      "Channels",
      options("push", "email", "sms", "whatsapp", "in_app"),
      {
        defaultValue: ["push"],
      },
    ),
    f.select(
      "topic",
      "Topic",
      options(
        "order",
        "promotion",
        "new_product",
        "abandoned_cart",
        "back_in_stock",
        "price_drop",
        "system",
      ),
      { defaultValue: "promotion", width: "half" },
    ),
    f.select("audience", "Audience", audienceOptions, {
      defaultValue: "all",
      width: "half",
    }),
    f.relation("segmentId", "Segment", "segments", {
      width: "half",
      showIf: (values) => values.audience === "segment",
    }),
    f.image("image", "Image", { width: "half" }),
    f.url("link", "Destination URL", { width: "half" }),
    f.relation("productId", "Product link", "products", { width: "half" }),
    f.relation("categoryId", "Category link", "categories", { width: "half" }),
    f.select(
      "status",
      "Status",
      options("draft", "scheduled", "sent", "failed"),
      {
        defaultValue: "draft",
        width: "half",
      },
    ),
    f.datetime("scheduledFor", "Send at", { width: "half" }),
    f.readonly("sentAt", "Sent at", { width: "half" }),
    f.readonly("recipients", "Recipients", { width: "half" }),
    f.readonly("opens", "Opens", { width: "half" }),
  ],
  columns: [
    { field: "title", label: "Notification" },
    { field: "channels", label: "Channels", format: "tags", compact: true },
    { field: "audience", label: "Audience", format: "badge", compact: true },
    { field: "status", label: "Status", format: "badge" },
    { field: "scheduledFor", label: "Scheduled", format: "datetime" },
    { field: "recipients", label: "Sent to", format: "number", compact: true },
  ],
  searchFields: ["title", "body"],
  filters: [
    {
      field: "status",
      label: "Status",
      type: "select",
      options: options("draft", "scheduled", "sent", "failed"),
    },
    {
      field: "topic",
      label: "Topic",
      type: "select",
      options: options(
        "order",
        "promotion",
        "new_product",
        "abandoned_cart",
        "back_in_stock",
        "price_drop",
        "system",
      ),
    },
  ],
  defaultSort: { field: "createdAt", direction: "desc" },
  features: { duplicate: true },
};

const templateBrandFields = [
  f.color("accentColor", "Accent colour", {
    section: "Branding",
    defaultValue: "#f85606",
    width: "third",
  }),
  f.color("backgroundColor", "Background", {
    section: "Branding",
    defaultValue: "#ffffff",
    width: "third",
  }),
  f.color("textColor", "Text colour", {
    section: "Branding",
    defaultValue: "#212121",
    width: "third",
  }),
  f.image("logo", "Logo", { section: "Branding", width: "half" }),
  f.text("buttonLabel", "Button label", { section: "Branding", width: "half" }),
  f.url("buttonLink", "Button link", { section: "Branding", width: "half" }),
  f.textarea("footer", "Footer text", { section: "Branding", rows: 3 }),
];

export const emailTemplates: ResourceDefinition = {
  key: "email_templates",
  label: "Email templates",
  singular: "Email template",
  icon: "envelope",
  module: "notifications",
  labelField: "name",
  description:
    "Subject, body, colours, logo, buttons and footer for every transactional email.",
  sections: ["General", "Content", "Branding"],
  fields: [
    f.text("name", "Template name", {
      required: true,
      section: "General",
      width: "half",
    }),
    f.select(
      "event",
      "Sent when",
      options(
        "welcome",
        "email_verification",
        "password_reset",
        "order_received",
        "order_confirmed",
        "shipped",
        "delivered",
        "cancelled",
        "return",
        "refund",
        "abandoned_cart",
        "promotion",
        "invoice",
      ),
      { required: true, section: "General", width: "half" },
    ),
    f.boolean("enabled", "Enabled", {
      section: "General",
      defaultValue: true,
      width: "half",
    }),
    f.text("subject", "Subject", { required: true, section: "Content" }),
    f.textarea("preheader", "Preview text", { section: "Content", rows: 2 }),
    f.richtext("body", "Body", {
      section: "Content",
      rows: 10,
      help: "Placeholders: {{customer}}, {{order}}, {{total}}, {{store}}, {{link}}.",
    }),
    ...templateBrandFields,
  ],
  columns: [
    { field: "name", label: "Template" },
    { field: "event", label: "Event", format: "badge" },
    { field: "subject", label: "Subject", compact: true },
    { field: "enabled", label: "Enabled", format: "boolean" },
  ],
  searchFields: ["name", "subject", "body"],
  features: { duplicate: true },
};

export const smsTemplates: ResourceDefinition = {
  key: "sms_templates",
  label: "SMS templates",
  singular: "SMS template",
  icon: "comment-sms",
  module: "notifications",
  labelField: "name",
  fields: [
    f.text("name", "Template name", { required: true, width: "half" }),
    f.select(
      "event",
      "Sent when",
      options(
        "otp",
        "order_confirmation",
        "shipping",
        "delivery",
        "cancellation",
        "marketing",
      ),
      { required: true, width: "half" },
    ),
    f.textarea("body", "Message", {
      required: true,
      rows: 4,
      help: "Placeholders: {{customer}}, {{order}}, {{code}}, {{store}}. Keep under 160 characters per part.",
    }),
    f.text("senderId", "Sender ID", { width: "half" }),
    f.boolean("enabled", "Enabled", { defaultValue: true, width: "half" }),
  ],
  columns: [
    { field: "name", label: "Template" },
    { field: "event", label: "Event", format: "badge" },
    { field: "enabled", label: "Enabled", format: "boolean" },
  ],
  searchFields: ["name", "body"],
  features: { duplicate: true },
};

export const pushTemplates: ResourceDefinition = {
  key: "push_templates",
  label: "Push templates",
  singular: "Push template",
  icon: "mobile-screen",
  module: "notifications",
  labelField: "name",
  fields: [
    f.text("name", "Template name", { required: true, width: "half" }),
    f.text("title", "Title", { required: true, width: "half" }),
    f.textarea("body", "Description", { rows: 3 }),
    f.image("image", "Image", { width: "half" }),
    f.select(
      "linkType",
      "Destination",
      options(
        ["url", "Custom link"],
        ["product", "Product"],
        ["category", "Category"],
      ),
      {
        defaultValue: "url",
        width: "half",
      },
    ),
    f.url("link", "Destination URL", {
      width: "half",
      showIf: (values) => values.linkType === "url",
    }),
    f.relation("productId", "Product", "products", {
      width: "half",
      showIf: (values) => values.linkType === "product",
    }),
    f.relation("categoryId", "Category", "categories", {
      width: "half",
      showIf: (values) => values.linkType === "category",
    }),
    f.select("audience", "Audience", audienceOptions, {
      defaultValue: "all",
      width: "half",
    }),
    f.datetime("scheduledFor", "Schedule", { width: "half" }),
    f.boolean("enabled", "Enabled", { defaultValue: true, width: "half" }),
  ],
  columns: [
    { field: "name", label: "Template" },
    { field: "title", label: "Title" },
    { field: "audience", label: "Audience", format: "badge", compact: true },
    { field: "enabled", label: "Enabled", format: "boolean" },
  ],
  searchFields: ["name", "title", "body"],
  features: { duplicate: true },
};

export const marketingResources = [
  campaigns,
  segments,
  popups,
  referrals,
  loyaltyRules,
  backInStock,
  priceAlerts,
  notifications,
  emailTemplates,
  smsTemplates,
  pushTemplates,
];
