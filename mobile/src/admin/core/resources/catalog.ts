import { f, options } from "../fields.ts";
import type { ResourceDefinition } from "../resource.ts";
import { publishFields, publishOptions, seoFields } from "./common.ts";

export const products: ResourceDefinition = {
  key: "products",
  label: "Products",
  singular: "Product",
  icon: "tag",
  module: "products",
  labelField: "name",
  description:
    "Catalogue items: media, pricing, variants, stock and merchandising.",
  sections: [
    "General",
    "Media",
    "Pricing",
    "Organisation",
    "Inventory",
    "Variants",
    "Details",
    "Related",
    "Merchandising",
    "SEO",
    "Publishing",
    "Performance",
  ],
  fields: [
    f.text("name", "Product name", { required: true, section: "General" }),
    f.slug("slug", "Slug", {
      required: true,
      section: "General",
      derivedFrom: "name",
      width: "half",
    }),
    f.text("sku", "SKU", { required: true, section: "General", width: "half" }),
    f.text("barcode", "Barcode", { section: "General", width: "half" }),
    f.text("productCode", "Product code", {
      section: "General",
      width: "half",
    }),
    f.textarea("shortDescription", "Short description", {
      section: "General",
      rows: 2,
    }),
    f.richtext("description", "Full description", {
      section: "General",
      rows: 10,
    }),

    f.images("images", "Product images", {
      section: "Media",
      help: "The first image is the featured image. Reorder with the arrows.",
    }),
    f.text("imageAlt", "Featured image alt text", { section: "Media" }),
    f.url("videoUrl", "Product video", { section: "Media" }),
    f.images("images360", "360° frames", { section: "Media" }),

    f.currency("price", "Base price", {
      required: true,
      section: "Pricing",
      width: "third",
      min: 0,
    }),
    f.currency("salePrice", "Sale price", {
      section: "Pricing",
      width: "third",
      min: 0,
    }),
    f.currency("compareAtPrice", "Compare-at price", {
      section: "Pricing",
      width: "third",
      min: 0,
    }),
    f.currency("costPrice", "Cost price", {
      section: "Pricing",
      width: "third",
      min: 0,
      help: "Feeds margin, profit and inventory-valuation reports.",
    }),
    f.select(
      "taxClass",
      "Tax class",
      options("standard", "reduced", "zero", "exempt"),
      {
        section: "Pricing",
        defaultValue: "standard",
        width: "third",
      },
    ),
    f.percent("discountPercent", "Discount %", {
      section: "Pricing",
      width: "third",
      min: 0,
      max: 100,
    }),
    f.datetime("discountStartsAt", "Discount starts", {
      section: "Pricing",
      width: "half",
    }),
    f.datetime("discountEndsAt", "Discount ends", {
      section: "Pricing",
      width: "half",
    }),

    f.relation("categoryId", "Category", "categories", {
      section: "Organisation",
      width: "half",
    }),
    f.relation("brandId", "Brand", "brands", {
      section: "Organisation",
      width: "half",
    }),
    f.relation("collectionIds", "Collections", "collections", {
      section: "Organisation",
      multiple: true,
    }),
    f.tags("tags", "Tags", { section: "Organisation" }),
    f.select(
      "productType",
      "Product type",
      options(["physical", "Physical"], ["digital", "Digital"]),
      {
        section: "Organisation",
        defaultValue: "physical",
        width: "half",
      },
    ),
    f.number("weight", "Weight (g)", {
      section: "Organisation",
      width: "half",
      min: 0,
      showIf: (values) => values.productType !== "digital",
    }),
    f.text("dimensions", "Dimensions (L×W×H cm)", {
      section: "Organisation",
      width: "half",
    }),
    f.text("shippingClass", "Shipping class", {
      section: "Organisation",
      width: "half",
    }),

    f.number("stock", "Stock on hand", {
      section: "Inventory",
      width: "third",
      min: 0,
    }),
    f.number("reservedStock", "Reserved stock", {
      section: "Inventory",
      width: "third",
      min: 0,
    }),
    f.number("incomingStock", "Incoming stock", {
      section: "Inventory",
      width: "third",
      min: 0,
    }),
    f.number("lowStockThreshold", "Low-stock alert at", {
      section: "Inventory",
      width: "third",
      defaultValue: 5,
      min: 0,
    }),
    f.text("warehouse", "Warehouse", {
      section: "Inventory",
      width: "third",
      defaultValue: "Main",
    }),
    f.boolean("unlimitedStock", "Unlimited stock", {
      section: "Inventory",
      width: "third",
    }),
    f.boolean("allowBackorder", "Allow backorder", {
      section: "Inventory",
      width: "third",
    }),
    f.number("minPurchaseQty", "Minimum purchase qty", {
      section: "Inventory",
      width: "third",
      defaultValue: 1,
      min: 1,
    }),
    f.number("maxPurchaseQty", "Maximum purchase qty", {
      section: "Inventory",
      width: "third",
      defaultValue: 10,
      min: 1,
    }),

    f.repeater(
      "variants",
      "Variants",
      [
        f.text("title", "Variant title", { required: true }),
        f.text("sku", "SKU", { width: "half" }),
        f.currency("price", "Price override", { width: "half", min: 0 }),
        f.number("stock", "Stock", { width: "half", min: 0 }),
        f.number("weight", "Weight (g)", { width: "half", min: 0 }),
        f.text("color", "Colour", { width: "third" }),
        f.text("size", "Size", { width: "third" }),
        f.text("material", "Material", { width: "third" }),
        f.image("image", "Variant image"),
      ],
      {
        section: "Variants",
        help: "Colour, size, material or any custom option, each with its own price, stock, SKU, weight and image.",
      },
    ),

    f.repeater(
      "specifications",
      "Specifications",
      [f.text("label", "Label"), f.text("value", "Value")],
      {
        section: "Details",
      },
    ),
    f.tags("features", "Feature highlights", { section: "Details" }),
    f.textarea("warranty", "Warranty information", {
      section: "Details",
      rows: 3,
    }),
    f.textarea("careInstructions", "Care instructions", {
      section: "Details",
      rows: 3,
    }),
    f.repeater(
      "faqs",
      "Product FAQ",
      [
        f.text("question", "Question"),
        f.textarea("answer", "Answer", { rows: 3 }),
      ],
      { section: "Details" },
    ),

    f.relation("relatedProductIds", "Related products", "products", {
      section: "Related",
      multiple: true,
    }),
    f.relation("boughtTogetherIds", "Frequently bought together", "products", {
      section: "Related",
      multiple: true,
    }),
    f.relation("crossSellIds", "Cross-sell", "products", {
      section: "Related",
      multiple: true,
    }),
    f.relation("upsellIds", "Upsell", "products", {
      section: "Related",
      multiple: true,
    }),

    f.number("sortOrder", "Sort priority", {
      section: "Merchandising",
      width: "third",
    }),
    f.number("searchBoost", "Search boost", {
      section: "Merchandising",
      width: "third",
      defaultValue: 1,
      help: "Higher values rank the product earlier in storefront search.",
    }),
    f.text("badge", "Custom badge", {
      section: "Merchandising",
      width: "third",
    }),
    f.boolean("featured", "Featured product", {
      section: "Merchandising",
      width: "third",
    }),
    f.boolean("bestseller", "Bestseller", {
      section: "Merchandising",
      width: "third",
    }),
    f.boolean("newArrival", "New arrival", {
      section: "Merchandising",
      width: "third",
    }),
    f.boolean("trending", "Trending", {
      section: "Merchandising",
      width: "third",
    }),
    f.select(
      "storefrontGroup",
      "Storefront placement",
      options(
        ["home", "Home feed"],
        ["offer", "Offers"],
        ["choice", "Choice picks"],
        ["recommendation", "Recommendations"],
        ["unavailable", "Unavailable shelf"],
      ),
      { section: "Merchandising", defaultValue: "home", width: "third" },
    ),

    ...seoFields("product"),
    f.textarea("googleProductData", "Google product data", {
      section: "SEO",
      rows: 3,
      help: "GTIN, MPN, condition and Google product category, one per line.",
    }),
    ...publishFields,

    f.readonly("views", "Views", { section: "Performance", width: "third" }),
    f.readonly("addToCartCount", "Add to cart", {
      section: "Performance",
      width: "third",
    }),
    f.readonly("purchaseCount", "Purchases", {
      section: "Performance",
      width: "third",
    }),
    f.readonly("returnCount", "Returns", {
      section: "Performance",
      width: "third",
    }),
  ],
  columns: [
    { field: "images.0", label: "", format: "image", width: 46 },
    { field: "name", label: "Product" },
    { field: "sku", label: "SKU", compact: true },
    { field: "price", label: "Price", format: "currency" },
    { field: "stock", label: "Stock", format: "number" },
    {
      field: "status",
      label: "Status",
      format: "badge",
      options: publishOptions,
    },
    {
      field: "categoryId",
      label: "Category",
      format: "relation",
      resource: "categories",
      compact: true,
    },
    { field: "updatedAt", label: "Updated", format: "date", compact: true },
  ],
  searchFields: ["name", "sku", "barcode", "tags", "slug"],
  filters: [
    {
      field: "status",
      label: "Status",
      type: "select",
      options: publishOptions,
    },
    {
      field: "categoryId",
      label: "Category",
      type: "select",
      resource: "categories",
    },
    { field: "brandId", label: "Brand", type: "select", resource: "brands" },
    { field: "featured", label: "Featured", type: "boolean" },
    { field: "price", label: "Price", type: "numberRange" },
    { field: "stock", label: "Stock", type: "numberRange" },
  ],
  defaultSort: { field: "updatedAt", direction: "desc" },
  features: { duplicate: true, reorder: true, publish: true },
};

export const categories: ResourceDefinition = {
  key: "categories",
  label: "Categories",
  singular: "Category",
  icon: "table-cells",
  module: "products",
  labelField: "name",
  description: "The category tree, its imagery and per-category merchandising.",
  sections: ["General", "Media", "Merchandising", "SEO"],
  fields: [
    f.text("name", "Name", { required: true, section: "General" }),
    f.slug("slug", "Slug", {
      required: true,
      section: "General",
      derivedFrom: "name",
      width: "half",
    }),
    f.relation("parentId", "Parent category", "categories", {
      section: "General",
      width: "half",
    }),
    f.textarea("description", "Description", { section: "General", rows: 4 }),
    f.image("image", "Category image", { section: "Media", width: "third" }),
    f.image("icon", "Icon", { section: "Media", width: "third" }),
    f.image("banner", "Category banner", { section: "Media", width: "third" }),
    f.number("sortOrder", "Sort order", {
      section: "Merchandising",
      width: "third",
    }),
    f.boolean("enabled", "Enabled", {
      section: "Merchandising",
      defaultValue: true,
      width: "third",
    }),
    f.boolean("featured", "Featured category", {
      section: "Merchandising",
      width: "third",
    }),
    f.text("offerText", "Category offer text", { section: "Merchandising" }),
    f.multiselect(
      "filters",
      "Filters shown on this category",
      options(
        "price",
        "brand",
        "size",
        "color",
        "rating",
        "availability",
        "material",
      ),
      { section: "Merchandising" },
    ),
    ...seoFields("category"),
  ],
  columns: [
    { field: "image", label: "", format: "image", width: 46 },
    { field: "name", label: "Category" },
    {
      field: "parentId",
      label: "Parent",
      format: "relation",
      resource: "categories",
      compact: true,
    },
    { field: "sortOrder", label: "Order", format: "number" },
    { field: "enabled", label: "Enabled", format: "boolean" },
    { field: "featured", label: "Featured", format: "boolean", compact: true },
  ],
  searchFields: ["name", "slug"],
  filters: [
    { field: "enabled", label: "Enabled", type: "boolean" },
    { field: "featured", label: "Featured", type: "boolean" },
    {
      field: "parentId",
      label: "Parent",
      type: "select",
      resource: "categories",
    },
  ],
  defaultSort: { field: "sortOrder", direction: "asc" },
  features: { reorder: true, duplicate: true },
};

export const brands: ResourceDefinition = {
  key: "brands",
  label: "Brands",
  singular: "Brand",
  icon: "award",
  module: "products",
  labelField: "name",
  fields: [
    f.text("name", "Brand name", { required: true }),
    f.slug("slug", "Slug", {
      required: true,
      derivedFrom: "name",
      width: "half",
    }),
    f.url("website", "Website", { width: "half" }),
    f.textarea("description", "Description", { rows: 4 }),
    f.image("logo", "Logo", { section: "Media", width: "half" }),
    f.image("banner", "Banner", { section: "Media", width: "half" }),
    f.number("sortOrder", "Sort order", {
      section: "Merchandising",
      width: "half",
    }),
    f.boolean("enabled", "Enabled", {
      section: "Merchandising",
      defaultValue: true,
      width: "half",
    }),
    ...seoFields("brand"),
  ],
  columns: [
    { field: "logo", label: "", format: "image", width: 46 },
    { field: "name", label: "Brand" },
    { field: "sortOrder", label: "Order", format: "number" },
    { field: "enabled", label: "Enabled", format: "boolean" },
  ],
  searchFields: ["name", "slug"],
  filters: [{ field: "enabled", label: "Enabled", type: "boolean" }],
  defaultSort: { field: "sortOrder", direction: "asc" },
  features: { reorder: true },
};

export const collections: ResourceDefinition = {
  key: "collections",
  label: "Collections",
  singular: "Collection",
  icon: "layer-group",
  module: "products",
  labelField: "name",
  description: "New arrivals, best sellers, seasonal and festival groupings.",
  sections: ["General", "Products", "Media", "Publishing", "SEO"],
  fields: [
    f.text("name", "Collection name", { required: true, section: "General" }),
    f.slug("slug", "Slug", {
      required: true,
      section: "General",
      derivedFrom: "name",
      width: "half",
    }),
    f.select(
      "kind",
      "Type",
      options(
        "new_arrivals",
        "best_sellers",
        "trending",
        "featured",
        "seasonal",
        "festival",
        "custom",
      ),
      { section: "General", defaultValue: "custom", width: "half" },
    ),
    f.textarea("description", "Description", { section: "General", rows: 3 }),
    f.select(
      "mode",
      "Selection",
      options(["manual", "Manual selection"], ["automatic", "Automatic rules"]),
      {
        section: "Products",
        defaultValue: "manual",
        width: "half",
      },
    ),
    f.relation("productIds", "Products", "products", {
      section: "Products",
      multiple: true,
      showIf: (values) => values.mode !== "automatic",
    }),
    f.repeater(
      "rules",
      "Automatic rules",
      [
        f.select(
          "field",
          "Field",
          options(
            "tags",
            "categoryId",
            "brandId",
            "price",
            "stock",
            "bestseller",
            "newArrival",
          ),
        ),
        f.select(
          "operator",
          "Operator",
          options("eq", "ne", "contains", "gt", "lt", "gte", "lte"),
        ),
        f.text("value", "Value"),
      ],
      { section: "Products", showIf: (values) => values.mode === "automatic" },
    ),
    f.image("image", "Collection image", { section: "Media", width: "half" }),
    f.image("banner", "Banner", { section: "Media", width: "half" }),
    f.number("sortOrder", "Sort order", {
      section: "Publishing",
      width: "half",
    }),
    ...publishFields,
    ...seoFields("collection"),
  ],
  columns: [
    { field: "image", label: "", format: "image", width: 46 },
    { field: "name", label: "Collection" },
    { field: "kind", label: "Type", format: "badge" },
    {
      field: "status",
      label: "Status",
      format: "badge",
      options: publishOptions,
    },
    { field: "publishAt", label: "Starts", format: "date", compact: true },
    { field: "unpublishAt", label: "Ends", format: "date", compact: true },
  ],
  searchFields: ["name", "slug"],
  filters: [
    {
      field: "kind",
      label: "Type",
      type: "select",
      options: options(
        "new_arrivals",
        "best_sellers",
        "trending",
        "featured",
        "seasonal",
        "festival",
        "custom",
      ),
    },
    {
      field: "status",
      label: "Status",
      type: "select",
      options: publishOptions,
    },
  ],
  defaultSort: { field: "sortOrder", direction: "asc" },
  features: { reorder: true, publish: true, duplicate: true },
};

export const inventoryMovements: ResourceDefinition = {
  key: "inventory_movements",
  label: "Stock movements",
  singular: "Stock movement",
  icon: "repeat",
  module: "inventory",
  labelField: "reason",
  description: "Every increase and decrease, with who made it and why.",
  fields: [
    f.relation("productId", "Product", "products", {
      required: true,
      width: "half",
    }),
    f.text("variantId", "Variant", { width: "half" }),
    f.select(
      "type",
      "Movement type",
      options(
        "restock",
        "sale",
        "manual_increase",
        "manual_decrease",
        "damaged",
        "returned",
        "audit",
        "reserved",
      ),
      { required: true, defaultValue: "restock", width: "half" },
    ),
    f.number("quantity", "Quantity change", {
      required: true,
      width: "half",
      help: "Use a negative number to decrease stock.",
    }),
    f.readonly("resultingStock", "Stock after this movement", {
      width: "half",
    }),
    f.relation("supplierId", "Supplier", "suppliers", { width: "half" }),
    f.currency("unitCost", "Purchase cost per unit", { width: "half", min: 0 }),
    f.text("warehouse", "Warehouse", { width: "half", defaultValue: "Main" }),
    f.text("reason", "Reason", { required: true }),
    f.textarea("note", "Inventory notes", { rows: 3 }),
  ],
  columns: [
    { field: "createdAt", label: "When", format: "datetime" },
    {
      field: "productId",
      label: "Product",
      format: "relation",
      resource: "products",
    },
    { field: "type", label: "Type", format: "badge" },
    { field: "quantity", label: "Change", format: "number" },
    {
      field: "resultingStock",
      label: "On hand",
      format: "number",
      compact: true,
    },
    { field: "warehouse", label: "Warehouse", compact: true },
  ],
  searchFields: ["reason", "note", "warehouse"],
  filters: [
    {
      field: "type",
      label: "Type",
      type: "select",
      options: options(
        "restock",
        "sale",
        "manual_increase",
        "manual_decrease",
        "damaged",
        "returned",
        "audit",
        "reserved",
      ),
    },
    {
      field: "productId",
      label: "Product",
      type: "select",
      resource: "products",
    },
    { field: "createdAt", label: "Date", type: "dateRange" },
  ],
  defaultSort: { field: "createdAt", direction: "desc" },
  features: { revisions: false },
};

export const bundles: ResourceDefinition = {
  key: "bundles",
  label: "Bundles",
  singular: "Bundle",
  icon: "boxes-packing",
  module: "products",
  labelField: "name",
  fields: [
    f.text("name", "Bundle name", { required: true }),
    f.slug("slug", "Slug", { derivedFrom: "name", width: "half" }),
    f.relation("productIds", "Products in the bundle", "products", {
      multiple: true,
      required: true,
    }),
    f.currency("price", "Bundle price", { width: "third", min: 0 }),
    f.percent("discountPercent", "Bundle discount %", {
      width: "third",
      min: 0,
      max: 100,
    }),
    f.number("stock", "Bundle inventory", { width: "third", min: 0 }),
    f.image("image", "Image", { section: "Media" }),
    ...publishFields,
  ],
  columns: [
    { field: "name", label: "Bundle" },
    { field: "price", label: "Price", format: "currency" },
    { field: "stock", label: "Stock", format: "number" },
    {
      field: "status",
      label: "Status",
      format: "badge",
      options: publishOptions,
    },
  ],
  searchFields: ["name"],
  features: { publish: true, duplicate: true },
};

export const preorders: ResourceDefinition = {
  key: "preorders",
  label: "Preorders",
  singular: "Preorder",
  icon: "clock",
  module: "products",
  labelField: "title",
  fields: [
    f.text("title", "Title", { required: true }),
    f.relation("productId", "Product", "products", {
      required: true,
      width: "half",
    }),
    f.boolean("enabled", "Preorder enabled", {
      defaultValue: true,
      width: "half",
    }),
    f.datetime("startsAt", "Preorder opens", { width: "half" }),
    f.datetime("endsAt", "Preorder closes", { width: "half" }),
    f.date("expectedShipDate", "Expected shipping date", { width: "half" }),
    f.select(
      "payment",
      "Payment",
      options(["deposit", "Deposit"], ["full", "Full payment"]),
      {
        defaultValue: "full",
        width: "half",
      },
    ),
    f.currency("depositAmount", "Deposit amount", {
      width: "half",
      min: 0,
      showIf: (values) => values.payment === "deposit",
    }),
    f.number("maxQuantity", "Maximum preorder quantity", {
      width: "half",
      min: 0,
    }),
  ],
  columns: [
    { field: "title", label: "Preorder" },
    {
      field: "productId",
      label: "Product",
      format: "relation",
      resource: "products",
    },
    { field: "expectedShipDate", label: "Ships", format: "date" },
    { field: "enabled", label: "Enabled", format: "boolean" },
  ],
  searchFields: ["title"],
};

export const catalogResources = [
  products,
  categories,
  brands,
  collections,
  inventoryMovements,
  bundles,
  preorders,
];
