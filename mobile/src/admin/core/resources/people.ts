import { f, options } from "../fields.ts";
import type { ResourceDefinition } from "../resource.ts";

export const customers: ResourceDefinition = {
  key: "customers",
  label: "Customers",
  singular: "Customer",
  icon: "users",
  module: "customers",
  labelField: "name",
  description: "Profiles, lifetime value, loyalty balance and account state.",
  sections: ["General", "Addresses", "Segmentation", "Account", "Value"],
  fields: [
    f.text("name", "Full name", {
      required: true,
      section: "General",
      width: "half",
    }),
    f.email("email", "Email", {
      required: true,
      section: "General",
      width: "half",
    }),
    f.phone("phone", "Phone", { section: "General", width: "half" }),
    f.date("birthday", "Birthday", { section: "General", width: "half" }),
    f.boolean("guest", "Guest checkout account", {
      section: "General",
      width: "half",
    }),
    f.textarea("note", "Customer notes", { section: "General", rows: 3 }),

    f.repeater(
      "addresses",
      "Addresses",
      [
        f.text("fullName", "Recipient", { width: "half" }),
        f.phone("phone", "Phone", { width: "half" }),
        f.text("line1", "Address line 1"),
        f.text("line2", "Address line 2"),
        f.text("city", "City", { width: "third" }),
        f.text("district", "District", { width: "third" }),
        f.text("province", "Province", { width: "third" }),
        f.text("postalCode", "Postal code", { width: "half" }),
        f.text("country", "Country", { width: "half", defaultValue: "Nepal" }),
      ],
      { section: "Addresses" },
    ),

    f.relation("groupId", "Customer group", "customer_groups", {
      section: "Segmentation",
      width: "half",
    }),
    f.tags("tags", "Tags", { section: "Segmentation" }),
    f.boolean("vip", "VIP customer", {
      section: "Segmentation",
      width: "half",
    }),
    f.boolean("acceptsMarketing", "Accepts marketing", {
      section: "Segmentation",
      defaultValue: true,
      width: "half",
    }),

    f.boolean("active", "Account active", {
      section: "Account",
      defaultValue: true,
      width: "half",
    }),
    f.boolean("verified", "Verified", { section: "Account", width: "half" }),
    f.boolean("blocked", "Blocked", { section: "Account", width: "half" }),
    f.readonly("lastLoginAt", "Last login", {
      section: "Account",
      width: "half",
    }),
    f.repeater(
      "loginHistory",
      "Login history",
      [
        f.datetime("at", "When"),
        f.text("ip", "IP", { width: "half" }),
        f.text("device", "Device", { width: "half" }),
      ],
      { section: "Account" },
    ),

    f.number("loyaltyPoints", "Loyalty points", {
      section: "Value",
      width: "third",
      min: 0,
    }),
    f.currency("storeCredit", "Store credit", {
      section: "Value",
      width: "third",
      min: 0,
    }),
    f.readonly("totalSpent", "Lifetime value", {
      section: "Value",
      width: "third",
    }),
    f.readonly("orderCount", "Orders", { section: "Value", width: "third" }),
    f.readonly("lastOrderAt", "Last order", {
      section: "Value",
      width: "third",
    }),
  ],
  columns: [
    { field: "name", label: "Customer" },
    { field: "email", label: "Email", compact: true },
    { field: "orderCount", label: "Orders", format: "number" },
    { field: "totalSpent", label: "Lifetime value", format: "currency" },
    { field: "vip", label: "VIP", format: "boolean", compact: true },
    { field: "active", label: "Active", format: "boolean" },
  ],
  searchFields: ["name", "email", "phone", "tags"],
  filters: [
    { field: "vip", label: "VIP", type: "boolean" },
    { field: "blocked", label: "Blocked", type: "boolean" },
    { field: "active", label: "Active", type: "boolean" },
    { field: "guest", label: "Guest", type: "boolean" },
    {
      field: "groupId",
      label: "Group",
      type: "select",
      resource: "customer_groups",
    },
    { field: "totalSpent", label: "Lifetime value", type: "numberRange" },
    { field: "createdAt", label: "Joined", type: "dateRange" },
  ],
  defaultSort: { field: "createdAt", direction: "desc" },
};

export const customerGroups: ResourceDefinition = {
  key: "customer_groups",
  label: "Customer groups",
  singular: "Customer group",
  icon: "user-group",
  module: "customers",
  labelField: "name",
  fields: [
    f.text("name", "Group name", { required: true, width: "half" }),
    f.percent("discountPercent", "Group discount %", {
      min: 0,
      max: 100,
      width: "half",
    }),
    f.textarea("description", "Description", { rows: 2 }),
    f.boolean("taxExempt", "Tax exempt", { width: "half" }),
    f.boolean("enabled", "Enabled", { defaultValue: true, width: "half" }),
  ],
  columns: [
    { field: "name", label: "Group" },
    { field: "discountPercent", label: "Discount", format: "percent" },
    {
      field: "taxExempt",
      label: "Tax exempt",
      format: "boolean",
      compact: true,
    },
    { field: "enabled", label: "Enabled", format: "boolean" },
  ],
  searchFields: ["name"],
};

export const carts: ResourceDefinition = {
  key: "carts",
  label: "Carts",
  singular: "Cart",
  icon: "cart-shopping",
  module: "customers",
  labelField: "email",
  description:
    "Live and abandoned carts, with recovery links and reminder counts.",
  fields: [
    f.relation("customerId", "Customer", "customers", { width: "half" }),
    f.email("email", "Email", { width: "half" }),
    f.select(
      "state",
      "State",
      options(
        ["active", "Active"],
        ["abandoned", "Abandoned"],
        ["recovered", "Recovered"],
        ["converted", "Converted"],
      ),
      { defaultValue: "active", width: "half" },
    ),
    f.currency("value", "Cart value", { width: "half", min: 0 }),
    f.number("itemCount", "Items", { width: "half", min: 0 }),
    f.datetime("lastActivityAt", "Last activity", { width: "half" }),
    f.repeater(
      "lines",
      "Cart products",
      [
        f.text("name", "Product"),
        f.number("quantity", "Qty", { width: "half", min: 1 }),
        f.currency("unitPrice", "Price", { width: "half", min: 0 }),
      ],
      {},
    ),
    f.url("recoveryLink", "Recovery link"),
    f.number("remindersSent", "Reminders sent", { width: "half", min: 0 }),
  ],
  columns: [
    { field: "email", label: "Customer" },
    { field: "state", label: "State", format: "badge" },
    { field: "value", label: "Value", format: "currency" },
    { field: "itemCount", label: "Items", format: "number", compact: true },
    { field: "lastActivityAt", label: "Last activity", format: "datetime" },
    {
      field: "remindersSent",
      label: "Reminders",
      format: "number",
      compact: true,
    },
  ],
  searchFields: ["email"],
  filters: [
    {
      field: "state",
      label: "State",
      type: "select",
      options: options("active", "abandoned", "recovered", "converted"),
    },
    { field: "value", label: "Value", type: "numberRange" },
  ],
  defaultSort: { field: "lastActivityAt", direction: "desc" },
  features: { create: false, revisions: false },
};

export const wishlists: ResourceDefinition = {
  key: "wishlists",
  label: "Wishlists",
  singular: "Wishlist entry",
  icon: "heart",
  module: "customers",
  labelField: "id",
  fields: [
    f.relation("customerId", "Customer", "customers", { width: "half" }),
    f.relation("productId", "Product", "products", { width: "half" }),
    f.datetime("addedAt", "Added at", { width: "half" }),
    f.boolean("notifyOnPriceDrop", "Notify on price drop", { width: "half" }),
  ],
  columns: [
    {
      field: "customerId",
      label: "Customer",
      format: "relation",
      resource: "customers",
    },
    {
      field: "productId",
      label: "Product",
      format: "relation",
      resource: "products",
    },
    { field: "addedAt", label: "Added", format: "date" },
    {
      field: "notifyOnPriceDrop",
      label: "Price alerts",
      format: "boolean",
      compact: true,
    },
  ],
  searchFields: [],
  defaultSort: { field: "addedAt", direction: "desc" },
  features: { create: false, revisions: false },
};

export const reviews: ResourceDefinition = {
  key: "reviews",
  label: "Reviews",
  singular: "Review",
  icon: "star",
  module: "reviews",
  labelField: "title",
  description: "Moderate ratings, photos and publish admin replies.",
  fields: [
    f.relation("productId", "Product", "products", {
      required: true,
      width: "half",
    }),
    f.relation("customerId", "Customer", "customers", { width: "half" }),
    f.text("authorName", "Author name", { width: "half" }),
    f.number("rating", "Rating", {
      required: true,
      min: 1,
      max: 5,
      width: "half",
    }),
    f.text("title", "Title"),
    f.textarea("body", "Review", { rows: 4 }),
    f.images("images", "Review photos"),
    f.url("videoUrl", "Review video"),
    f.select(
      "status",
      "Status",
      options(
        ["pending", "Pending"],
        ["approved", "Approved"],
        ["rejected", "Rejected"],
      ),
      {
        defaultValue: "pending",
        width: "half",
      },
    ),
    f.boolean("verifiedPurchase", "Verified purchase", { width: "half" }),
    f.boolean("reported", "Reported", { width: "half" }),
    f.textarea("adminResponse", "Admin response", { rows: 3 }),
  ],
  columns: [
    {
      field: "productId",
      label: "Product",
      format: "relation",
      resource: "products",
    },
    { field: "rating", label: "Rating", format: "number" },
    { field: "title", label: "Title", compact: true },
    { field: "status", label: "Status", format: "badge" },
    {
      field: "verifiedPurchase",
      label: "Verified",
      format: "boolean",
      compact: true,
    },
    { field: "createdAt", label: "Received", format: "date", compact: true },
  ],
  searchFields: ["title", "body", "authorName"],
  filters: [
    {
      field: "status",
      label: "Status",
      type: "select",
      options: options("pending", "approved", "rejected"),
    },
    {
      field: "rating",
      label: "Rating",
      type: "select",
      options: options("1", "2", "3", "4", "5"),
    },
    { field: "reported", label: "Reported", type: "boolean" },
    { field: "verifiedPurchase", label: "Verified", type: "boolean" },
  ],
  defaultSort: { field: "createdAt", direction: "desc" },
  features: { create: false },
};

export const questions: ResourceDefinition = {
  key: "questions",
  label: "Questions & answers",
  singular: "Question",
  icon: "circle-question",
  module: "reviews",
  labelField: "question",
  fields: [
    f.relation("productId", "Product", "products", {
      required: true,
      width: "half",
    }),
    f.relation("customerId", "Asked by", "customers", { width: "half" }),
    f.textarea("question", "Question", { required: true, rows: 2 }),
    f.textarea("answer", "Admin answer", { rows: 3 }),
    f.select(
      "status",
      "Status",
      options(
        ["pending", "Pending"],
        ["approved", "Approved"],
        ["rejected", "Rejected"],
      ),
      {
        defaultValue: "pending",
        width: "half",
      },
    ),
    f.boolean("notifyCustomer", "Notify the customer when answered", {
      defaultValue: true,
      width: "half",
    }),
  ],
  columns: [
    { field: "question", label: "Question" },
    {
      field: "productId",
      label: "Product",
      format: "relation",
      resource: "products",
      compact: true,
    },
    { field: "status", label: "Status", format: "badge" },
    { field: "createdAt", label: "Asked", format: "date", compact: true },
  ],
  searchFields: ["question", "answer"],
  filters: [
    {
      field: "status",
      label: "Status",
      type: "select",
      options: options("pending", "approved", "rejected"),
    },
  ],
  defaultSort: { field: "createdAt", direction: "desc" },
  features: { create: false },
};

export const tickets: ResourceDefinition = {
  key: "tickets",
  label: "Support tickets",
  singular: "Ticket",
  icon: "headset",
  module: "support",
  labelField: "subject",
  description:
    "Complaints, order issues and payment problems with the full thread.",
  sections: ["General", "Conversation", "Internal"],
  fields: [
    f.text("subject", "Subject", { required: true, section: "General" }),
    f.relation("customerId", "Customer", "customers", {
      section: "General",
      width: "half",
    }),
    f.email("email", "Email", { section: "General", width: "half" }),
    f.relation("orderId", "Related order", "orders", {
      section: "General",
      width: "half",
    }),
    f.select(
      "category",
      "Category",
      options(
        "order_issue",
        "payment_issue",
        "return_request",
        "complaint",
        "product_question",
        "other",
      ),
      { section: "General", defaultValue: "other", width: "half" },
    ),
    f.select(
      "priority",
      "Priority",
      options("low", "normal", "high", "urgent"),
      {
        section: "General",
        defaultValue: "normal",
        width: "half",
      },
    ),
    f.select(
      "status",
      "Status",
      options("open", "pending", "on_hold", "resolved", "closed"),
      {
        section: "General",
        defaultValue: "open",
        width: "half",
      },
    ),
    f.relation("assigneeId", "Assigned to", "admin_users", {
      section: "General",
      width: "half",
    }),
    f.repeater(
      "messages",
      "Conversation history",
      [
        f.select(
          "author",
          "From",
          options(["customer", "Customer"], ["agent", "Agent"]),
        ),
        f.textarea("body", "Message", { rows: 3 }),
        f.datetime("at", "Sent at"),
      ],
      { section: "Conversation" },
    ),
    f.images("attachments", "Attachments", { section: "Conversation" }),
    f.textarea("internalNote", "Internal notes", {
      section: "Internal",
      rows: 3,
    }),
    f.tags("tags", "Tags", { section: "Internal" }),
  ],
  columns: [
    { field: "subject", label: "Subject" },
    { field: "category", label: "Category", format: "badge", compact: true },
    { field: "priority", label: "Priority", format: "badge" },
    { field: "status", label: "Status", format: "badge" },
    {
      field: "assigneeId",
      label: "Assignee",
      format: "relation",
      resource: "admin_users",
      compact: true,
    },
    { field: "updatedAt", label: "Updated", format: "datetime", compact: true },
  ],
  searchFields: ["subject", "email"],
  filters: [
    {
      field: "status",
      label: "Status",
      type: "select",
      options: options("open", "pending", "on_hold", "resolved", "closed"),
    },
    {
      field: "priority",
      label: "Priority",
      type: "select",
      options: options("low", "normal", "high", "urgent"),
    },
    {
      field: "category",
      label: "Category",
      type: "select",
      options: options(
        "order_issue",
        "payment_issue",
        "return_request",
        "complaint",
        "product_question",
        "other",
      ),
    },
    {
      field: "assigneeId",
      label: "Assignee",
      type: "select",
      resource: "admin_users",
    },
  ],
  defaultSort: { field: "updatedAt", direction: "desc" },
};

export const contactSubmissions: ResourceDefinition = {
  key: "contact_submissions",
  label: "Contact form",
  singular: "Submission",
  icon: "envelope-open",
  module: "support",
  labelField: "name",
  fields: [
    f.text("name", "Name", { width: "half" }),
    f.email("email", "Email", { width: "half" }),
    f.phone("phone", "Phone", { width: "half" }),
    f.text("subject", "Subject", { width: "half" }),
    f.textarea("message", "Message", { rows: 4 }),
    f.select(
      "status",
      "Status",
      options("new", "in_progress", "replied", "closed"),
      {
        defaultValue: "new",
        width: "half",
      },
    ),
    f.textarea("reply", "Reply", { rows: 3 }),
    f.textarea("internalNote", "Internal note", { rows: 2 }),
  ],
  columns: [
    { field: "name", label: "From" },
    { field: "subject", label: "Subject" },
    { field: "status", label: "Status", format: "badge" },
    {
      field: "createdAt",
      label: "Received",
      format: "datetime",
      compact: true,
    },
  ],
  searchFields: ["name", "email", "subject", "message"],
  filters: [
    {
      field: "status",
      label: "Status",
      type: "select",
      options: options("new", "in_progress", "replied", "closed"),
    },
  ],
  defaultSort: { field: "createdAt", direction: "desc" },
  features: { create: false },
};

export const adminUsers: ResourceDefinition = {
  key: "admin_users",
  label: "Admin users",
  singular: "Admin user",
  icon: "user-shield",
  module: "users",
  labelField: "name",
  fields: [
    f.text("name", "Name", { required: true, width: "half" }),
    f.email("email", "Email", { required: true, width: "half" }),
    f.phone("phone", "Phone", { width: "half" }),
    f.relation("roleId", "Role", "roles", { required: true, width: "half" }),
    f.image("avatar", "Avatar", { width: "half" }),
    f.boolean("active", "Active", { defaultValue: true, width: "half" }),
    f.boolean("twoFactorEnabled", "Two-factor authentication", {
      width: "half",
    }),
    f.readonly("lastLoginAt", "Last login", { width: "half" }),
    f.readonly("lastLoginIp", "Last login IP", { width: "half" }),
    f.textarea("note", "Note", { rows: 2 }),
  ],
  columns: [
    { field: "avatar", label: "", format: "image", width: 46 },
    { field: "name", label: "Name" },
    { field: "email", label: "Email", compact: true },
    { field: "roleId", label: "Role", format: "relation", resource: "roles" },
    {
      field: "twoFactorEnabled",
      label: "2FA",
      format: "boolean",
      compact: true,
    },
    { field: "active", label: "Active", format: "boolean" },
  ],
  searchFields: ["name", "email"],
  filters: [
    { field: "roleId", label: "Role", type: "select", resource: "roles" },
    { field: "active", label: "Active", type: "boolean" },
  ],
};

export const roles: ResourceDefinition = {
  key: "roles",
  label: "Roles & permissions",
  singular: "Role",
  icon: "key",
  module: "users",
  labelField: "name",
  description:
    "Per-module view, create, edit, delete, export, publish and refund rights.",
  fields: [
    f.text("name", "Role name", { required: true, width: "half" }),
    f.slug("key", "Key", {
      required: true,
      derivedFrom: "name",
      width: "half",
    }),
    f.textarea("description", "Description", { rows: 2 }),
    f.boolean("builtIn", "Built-in role", { readOnly: true, width: "half" }),
    f.json("permissions", "Permissions", {
      help: "Edited with the permission grid on the Users & roles screen.",
    }),
  ],
  columns: [
    { field: "name", label: "Role" },
    { field: "key", label: "Key", compact: true },
    { field: "description", label: "Description", compact: true },
    { field: "builtIn", label: "Built-in", format: "boolean" },
  ],
  searchFields: ["name", "key"],
  features: { duplicate: true },
};

export const peopleResources = [
  customers,
  customerGroups,
  carts,
  wishlists,
  reviews,
  questions,
  tickets,
  contactSubmissions,
  adminUsers,
  roles,
];
