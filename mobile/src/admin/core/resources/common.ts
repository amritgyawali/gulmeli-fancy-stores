import { f, options, type FieldDef } from "../fields.ts";

export const publishOptions = options(
  ["draft", "Draft"],
  ["scheduled", "Scheduled"],
  ["published", "Published"],
  ["archived", "Archived"],
);

export const orderStatusOptions = options(
  ["pending", "Pending"],
  ["confirmed", "Confirmed"],
  ["processing", "Processing"],
  ["packed", "Packed"],
  ["ready_to_ship", "Ready to ship"],
  ["shipped", "Shipped"],
  ["out_for_delivery", "Out for delivery"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled"],
  ["returned", "Returned"],
  ["refunded", "Refunded"],
  ["failed", "Failed"],
);

export const paymentStatusOptions = options(
  ["unpaid", "Unpaid"],
  ["pending", "Pending"],
  ["paid", "Paid"],
  ["partially_refunded", "Partially refunded"],
  ["refunded", "Refunded"],
  ["failed", "Failed"],
);

export const audienceOptions = options(
  ["all", "Everyone"],
  ["new_customers", "New customers"],
  ["returning_customers", "Returning customers"],
  ["high_value", "High-value customers"],
  ["inactive", "Inactive customers"],
  ["abandoned_cart", "Abandoned-cart customers"],
  ["vip", "VIP customers"],
  ["segment", "A saved segment"],
);

/** The draft → scheduled → published lifecycle shared by schedulable records. */
export const publishFields: FieldDef[] = [
  f.select("status", "Status", publishOptions, {
    section: "Publishing",
    defaultValue: "draft",
    width: "half",
  }),
  f.datetime("publishAt", "Publish at", {
    section: "Publishing",
    width: "half",
    help: "Leave empty to go live as soon as the status is set to Published.",
  }),
  f.datetime("unpublishAt", "Unpublish at", {
    section: "Publishing",
    width: "half",
  }),
];

export const seoFields = (subject = "page"): FieldDef[] => [
  f.text("seoTitle", "SEO title", {
    section: "SEO",
    help: `Shown as the ${subject} title in search results.`,
  }),
  f.textarea("seoDescription", "Meta description", { section: "SEO", rows: 3 }),
  f.tags("seoKeywords", "Keywords", { section: "SEO" }),
  f.image("ogImage", "Social sharing image", { section: "SEO", width: "half" }),
  f.url("canonicalUrl", "Canonical URL", { section: "SEO", width: "half" }),
  f.boolean("searchable", "Visible to search engines", {
    section: "SEO",
    defaultValue: true,
  }),
];

export const scheduleFields = (section = "Schedule"): FieldDef[] => [
  f.datetime("startsAt", "Starts", { section, width: "half" }),
  f.datetime("endsAt", "Ends", { section, width: "half" }),
];
