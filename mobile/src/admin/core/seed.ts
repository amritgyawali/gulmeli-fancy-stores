import { BUILT_IN_ROLES } from "./rbac.ts";
import { nextNumber, slugify } from "./ids.ts";
import type { Snapshot } from "./store.ts";
import type { AdminRecord, OrderStatus, PaymentStatus } from "./types.ts";

/** The shape the customer catalogue already uses, kept loose on purpose. */
export interface SeedSourceProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  group?: string;
  stock: number;
  brand?: string;
  badge?: string;
  imageUrl?: string;
  sold?: number;
  rating?: string;
}

/** Deterministic generator, so demo data and tests never drift. */
function randomiser(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };
}

const CUSTOMER_NAMES = [
  "Arjun Gyawali",
  "Sita Sharma",
  "Bikash Thapa",
  "Puja Karki",
  "Nabin Adhikari",
  "Rita Poudel",
  "Suman Shrestha",
  "Anita Bhandari",
  "Prakash Rai",
  "Kabita Lama",
  "Dipesh Magar",
  "Sunita Gurung",
  "Ramesh Basnet",
  "Manisha Khadka",
  "Hari Subedi",
  "Laxmi Tamang",
];

const CITIES = [
  { city: "Kathmandu", district: "Kathmandu", province: "Bagmati" },
  { city: "Pokhara", district: "Kaski", province: "Gandaki" },
  { city: "Butwal", district: "Rupandehi", province: "Lumbini" },
  { city: "Biratnagar", district: "Morang", province: "Koshi" },
  { city: "Gulmi", district: "Gulmi", province: "Lumbini" },
  { city: "Lalitpur", district: "Lalitpur", province: "Bagmati" },
];

const PAYMENT_METHODS = [
  "Cash on delivery",
  "Khalti",
  "eSewa",
  "Fonepay",
  "Card",
];

const ORDER_FLOW: OrderStatus[] = [
  "delivered",
  "delivered",
  "delivered",
  "shipped",
  "processing",
  "pending",
  "confirmed",
  "out_for_delivery",
  "cancelled",
  "returned",
];

function iso(date: Date): string {
  return date.toISOString();
}

function daysBack(days: number, now: Date): Date {
  return new Date(now.getTime() - days * 86_400_000);
}

function base(
  id: string,
  createdAt: string,
  extra: Record<string, unknown> = {},
): AdminRecord {
  return {
    id,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    revision: 1,
    ...extra,
  };
}

/**
 * Builds a complete starting dataset from the store's own catalogue, so every
 * screen has something real to show on first run. Orders, customers and
 * analytics are generated demo data - the Settings screen can clear them.
 */
export function buildSeed(
  catalog: SeedSourceProduct[],
  now = new Date(),
): Snapshot {
  const random = randomiser(20260913);
  const pick = <T>(values: T[]): T =>
    values[Math.floor(random() * values.length)] as T;
  const between = (min: number, max: number) =>
    Math.floor(random() * (max - min + 1)) + min;
  const stamp = iso(now);

  const roles: AdminRecord[] = BUILT_IN_ROLES.map((role, index) =>
    base(`role_${role.key}`, stamp, { ...role, sortOrder: index }),
  );

  const adminUsers: AdminRecord[] = [
    base("admin_owner", stamp, {
      name: "Store owner",
      email: "owner@gulmelifancystores.com",
      phone: "",
      roleId: "role_super_admin",
      avatar: "",
      active: true,
      twoFactorEnabled: false,
      lastLoginAt: stamp,
      lastLoginIp: "",
      note: "The account that owns the store.",
    }),
  ];

  const categoryNames = [
    ...new Set(catalog.map((product) => product.category)),
  ].filter(Boolean);
  const categories: AdminRecord[] = categoryNames.map((name, index) =>
    base(`cat_${slugify(name)}`, stamp, {
      name,
      slug: slugify(name),
      parentId: null,
      description: `${name} available at Gulmeli Fancy Stores.`,
      image: "",
      icon: "",
      banner: "",
      sortOrder: index,
      enabled: true,
      featured: index < 3,
      offerText: "",
      filters: ["price", "brand", "rating", "availability"],
      seoTitle: `${name} online in Nepal`,
      seoDescription: `Shop ${name.toLowerCase()} with fast delivery.`,
      seoKeywords: [name.toLowerCase()],
      searchable: true,
    }),
  );

  const brandNames = [
    ...new Set(catalog.map((product) => product.brand).filter(Boolean)),
  ] as string[];
  const brands: AdminRecord[] = (
    brandNames.length ? brandNames : ["Gulmeli"]
  ).map((name, index) =>
    base(`brand_${slugify(name)}`, stamp, {
      name,
      slug: slugify(name),
      website: "",
      description: "",
      logo: "",
      banner: "",
      sortOrder: index,
      enabled: true,
      searchable: true,
    }),
  );

  const collections: AdminRecord[] = [
    ["New arrivals", "new_arrivals"],
    ["Best sellers", "best_sellers"],
    ["Trending now", "trending"],
    ["Festival picks", "festival"],
  ].map(([name, kind], index) =>
    base(`coll_${kind}`, stamp, {
      name,
      slug: slugify(String(name)),
      kind,
      description: "",
      mode: "automatic",
      productIds: [],
      rules: [{ field: "tags", operator: "contains", value: String(kind) }],
      image: "",
      banner: "",
      sortOrder: index,
      status: "published",
      publishAt: null,
      unpublishAt: null,
      searchable: true,
    }),
  );

  const products: AdminRecord[] = catalog.map((source, index) => {
    const cost = Math.round(source.price * (0.55 + random() * 0.2));
    const rating = Number(/^([\d.]+)/.exec(source.rating ?? "")?.[1] ?? 0);
    return base(`prod_${source.id}`, iso(daysBack(between(30, 300), now)), {
      name: source.name,
      slug: slugify(source.name).slice(0, 60),
      sku: `GFS-${String(index + 1).padStart(4, "0")}`,
      barcode: "",
      productCode: source.id,
      shortDescription: "",
      description: "",
      images: source.imageUrl ? [source.imageUrl] : [],
      imageAlt: source.name,
      videoUrl: "",
      images360: [],
      price: source.price,
      salePrice:
        source.originalPrice && source.originalPrice > source.price
          ? source.price
          : null,
      compareAtPrice: source.originalPrice ?? null,
      costPrice: cost,
      taxClass: "standard",
      discountPercent: 0,
      discountStartsAt: null,
      discountEndsAt: null,
      categoryId: `cat_${slugify(source.category)}`,
      brandId: source.brand ? `brand_${slugify(source.brand)}` : null,
      collectionIds: [],
      tags: [source.category.toLowerCase()],
      productType: "physical",
      weight: between(100, 1500),
      dimensions: "",
      shippingClass: "",
      stock: source.stock,
      reservedStock: 0,
      incomingStock: 0,
      lowStockThreshold: 5,
      warehouse: "Main",
      unlimitedStock: false,
      allowBackorder: false,
      minPurchaseQty: 1,
      maxPurchaseQty: 10,
      variants: [],
      specifications: [],
      features: [],
      warranty: "",
      careInstructions: "",
      faqs: [],
      relatedProductIds: [],
      boughtTogetherIds: [],
      crossSellIds: [],
      upsellIds: [],
      sortOrder: index,
      searchBoost: 1,
      badge: source.badge ?? "",
      featured: index % 7 === 0,
      bestseller: (source.sold ?? 0) > 500,
      newArrival: index % 5 === 0,
      trending: rating >= 4.5,
      storefrontGroup: source.group ?? "home",
      seoTitle: "",
      seoDescription: "",
      seoKeywords: [],
      ogImage: "",
      canonicalUrl: "",
      searchable: true,
      googleProductData: "",
      status: source.group === "unavailable" ? "draft" : "published",
      publishAt: null,
      unpublishAt: null,
      views: between(40, 2400),
      addToCartCount: between(5, 300),
      purchaseCount: source.sold ?? between(0, 200),
      returnCount: between(0, 6),
      backInStockRequests: 0,
    });
  });

  const customers: AdminRecord[] = CUSTOMER_NAMES.map((name, index) => {
    const place = pick(CITIES);
    // Spread sign-ups across the last year, with a few in the current month.
    const joined = daysBack(index < 4 ? between(1, 25) : between(35, 400), now);
    return base(`cust_${index + 1}`, iso(joined), {
      name,
      email: `${slugify(name).replace(/-/g, ".")}@example.com`,
      phone: `98${between(10_000_000, 99_999_999)}`,
      birthday: "",
      guest: index % 8 === 7,
      note: "",
      addresses: [
        {
          fullName: name,
          phone: `98${between(10_000_000, 99_999_999)}`,
          line1: `Ward ${between(1, 32)}, ${place.city}`,
          line2: "",
          city: place.city,
          district: place.district,
          province: place.province,
          postalCode: String(between(10_000, 99_999)),
          country: "Nepal",
        },
      ],
      groupId: null,
      tags: [],
      vip: false,
      acceptsMarketing: index % 4 !== 0,
      active: true,
      verified: index % 3 !== 0,
      blocked: false,
      lastLoginAt: iso(daysBack(between(0, 20), now)),
      loginHistory: [],
      loyaltyPoints: between(0, 900),
      storeCredit: 0,
      totalSpent: 0,
      orderCount: 0,
      lastOrderAt: null,
    });
  });

  const customerGroups: AdminRecord[] = [
    base("grp_regular", stamp, {
      name: "Regular",
      discountPercent: 0,
      description: "Everyone who has not been placed in another group.",
      taxExempt: false,
      enabled: true,
    }),
    base("grp_vip", stamp, {
      name: "VIP",
      discountPercent: 5,
      description: "High-value customers, with a standing discount.",
      taxExempt: false,
      enabled: true,
    }),
    base("grp_wholesale", stamp, {
      name: "Wholesale",
      discountPercent: 15,
      description: "Shops buying in bulk.",
      taxExempt: false,
      enabled: true,
    }),
  ];

  const orders: AdminRecord[] = [];
  const transactions: AdminRecord[] = [];
  const orderNumbers: string[] = [];
  const orderCount = Math.min(120, Math.max(40, catalog.length * 3));

  for (let index = 0; index < orderCount; index += 1) {
    const placed = daysBack(between(0, 89) + random(), now);
    const customer = customers[between(0, customers.length - 1)];
    if (!customer) continue;
    const status = ORDER_FLOW[index % ORDER_FLOW.length] ?? "delivered";
    const lineCount = between(1, 3);
    const lines = [];
    for (let line = 0; line < lineCount; line += 1) {
      const product = products[between(0, products.length - 1)];
      if (!product) continue;
      const quantity = between(1, 3);
      lines.push({
        productId: product.id,
        variantId: null,
        name: product.name,
        sku: product.sku,
        quantity,
        unitPrice: Number(product.price),
        costPrice: Number(product.costPrice),
        discount: 0,
        tax: 0,
      });
    }
    if (!lines.length) continue;

    const subtotal = lines.reduce(
      (total, line) => total + line.unitPrice * line.quantity,
      0,
    );
    const discountTotal =
      random() > 0.75 ? Math.min(100, Math.round(subtotal * 0.1)) : 0;
    const shippingTotal = subtotal >= 1500 ? 0 : 100;
    const taxTotal = 0;
    const total = subtotal - discountTotal + shippingTotal + taxTotal;
    const number = nextNumber("GFS-", orderNumbers);
    orderNumbers.push(number);
    const method = pick(PAYMENT_METHODS);
    const paymentStatus: PaymentStatus =
      status === "cancelled" || status === "failed"
        ? "failed"
        : status === "refunded" || status === "returned"
          ? "refunded"
          : method === "Cash on delivery" && status !== "delivered"
            ? "unpaid"
            : "paid";
    const place = pick(CITIES);
    const address = {
      fullName: customer.name,
      phone: customer.phone,
      line1: `Ward ${between(1, 32)}, ${place.city}`,
      line2: "",
      city: place.city,
      district: place.district,
      province: place.province,
      postalCode: String(between(10_000, 99_999)),
      country: "Nepal",
    };

    orders.push(
      base(`ord_${index + 1}`, iso(placed), {
        number,
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        guest: customer.guest === true,
        status,
        paymentStatus,
        paymentMethod: method,
        lines,
        subtotal,
        discountTotal,
        shippingTotal,
        taxTotal,
        refundedTotal: status === "refunded" ? total : 0,
        total,
        couponCode: discountTotal ? "GULMELI10" : null,
        shippingAddress: address,
        billingAddress: address,
        courier:
          status === "shipped" || status === "delivered"
            ? "Gulmeli Express"
            : null,
        trackingNumber:
          status === "shipped" || status === "delivered"
            ? `TRK${between(100_000, 999_999)}`
            : null,
        expectedDeliveryDate: "",
        placedAt: iso(placed),
        deliveredAt:
          status === "delivered"
            ? iso(new Date(placed.getTime() + 2 * 86_400_000))
            : null,
        customerNote: "",
        internalNote: "",
        channel: pick(["app", "web", "app"]),
        timeline: [
          { at: iso(placed), actor: "Customer", event: "Order placed" },
        ],
      }),
    );

    transactions.push(
      base(`txn_${index + 1}`, iso(placed), {
        reference: `TXN${String(index + 1).padStart(6, "0")}`,
        orderId: `ord_${index + 1}`,
        gateway: method.toLowerCase().replace(/\s+/g, "_"),
        type: paymentStatus === "refunded" ? "refund" : "payment",
        status:
          paymentStatus === "failed"
            ? "failed"
            : paymentStatus === "unpaid"
              ? "pending"
              : "successful",
        amount: total,
        fee: method === "Cash on delivery" ? 0 : Math.round(total * 0.02),
        currency: "NPR",
        reconciled: paymentStatus === "paid",
        failureReason:
          paymentStatus === "failed"
            ? "The card was declined by the issuing bank."
            : "",
      }),
    );
  }

  // Roll order history up onto the customer records.
  for (const customer of customers) {
    const own = orders.filter(
      (order) =>
        order.customerId === customer.id && order.status !== "cancelled",
    );
    customer.orderCount = own.length;
    customer.totalSpent = own.reduce(
      (total, order) => total + Number(order.total),
      0,
    );
    customer.lastOrderAt = own.length
      ? own
          .map((order) => String(order.placedAt))
          .sort()
          .reverse()[0]
      : null;
    customer.vip = Number(customer.totalSpent) > 15_000;
    customer.groupId = customer.vip ? "grp_vip" : "grp_regular";
  }

  const carts: AdminRecord[] = customers.slice(0, 9).map((customer, index) => {
    const product = products[between(0, products.length - 1)];
    const value = product ? Number(product.price) * between(1, 3) : 0;
    return base(`cart_${index + 1}`, iso(daysBack(between(0, 10), now)), {
      customerId: customer.id,
      email: customer.email,
      state:
        index % 3 === 0
          ? "active"
          : index % 3 === 1
            ? "abandoned"
            : "recovered",
      value,
      itemCount: between(1, 4),
      lastActivityAt: iso(daysBack(between(0, 6), now)),
      lines: product
        ? [
            {
              name: product.name,
              quantity: 1,
              unitPrice: Number(product.price),
            },
          ]
        : [],
      recoveryLink: "",
      remindersSent: index % 3 === 1 ? 1 : 0,
    });
  });

  const wishlists: AdminRecord[] = customers
    .slice(0, 12)
    .flatMap((customer, index) => {
      const product = products[(index * 3) % Math.max(1, products.length)];
      if (!product) return [];
      return [
        base(`wish_${index + 1}`, stamp, {
          customerId: customer.id,
          productId: product.id,
          addedAt: iso(daysBack(between(1, 40), now)),
          notifyOnPriceDrop: index % 2 === 0,
        }),
      ];
    });

  const returnNumbers: string[] = [];
  const returns: AdminRecord[] = orders
    .filter(
      (order) => order.status === "returned" || order.status === "refunded",
    )
    .slice(0, 8)
    .map((order, index) => {
      const number = nextNumber("RET-", returnNumbers);
      returnNumbers.push(number);
      return base(`ret_${index + 1}`, iso(daysBack(between(1, 30), now)), {
        number,
        orderId: order.id,
        customerId: order.customerId,
        status:
          index === 0 ? "requested" : index === 1 ? "approved" : "completed",
        reason: pick(["damaged", "wrong_item", "size_issue", "changed_mind"]),
        condition: "opened",
        resolution: "refund",
        refundAmount: Number(order.total),
        restock: true,
        shippingStatus: "in_transit",
        images: [],
        customerNote: "",
        internalNote: "",
      });
    });

  const reviews: AdminRecord[] = products.slice(0, 18).map((product, index) => {
    const customer = customers[index % customers.length];
    const rating = between(3, 5);
    return base(`rev_${index + 1}`, iso(daysBack(between(1, 60), now)), {
      productId: product.id,
      customerId: customer?.id ?? null,
      authorName: customer?.name ?? "Customer",
      rating,
      title: rating >= 4 ? "Good value" : "It is fine",
      body:
        rating >= 4
          ? "Arrived quickly and matches the photos. Quality is better than I expected for the price."
          : "Works, but the finish could be better. Delivery took a little longer than promised.",
      images: [],
      videoUrl: "",
      status: index < 3 ? "pending" : "approved",
      verifiedPurchase: index % 2 === 0,
      reported: false,
      adminResponse: "",
    });
  });

  const questions: AdminRecord[] = products.slice(0, 6).map((product, index) =>
    base(`qna_${index + 1}`, iso(daysBack(between(1, 25), now)), {
      productId: product.id,
      customerId: customers[index % customers.length]?.id ?? null,
      question: "Is cash on delivery available for this item?",
      answer:
        index % 2 === 0
          ? "Yes, cash on delivery is available across Nepal."
          : "",
      status: index % 2 === 0 ? "approved" : "pending",
      notifyCustomer: true,
    }),
  );

  const tickets: AdminRecord[] = [
    ["Order has not arrived", "order_issue", "high", "open"],
    ["Payment was deducted twice", "payment_issue", "urgent", "open"],
    ["Wrong size delivered", "return_request", "normal", "pending"],
    ["Does this come in black?", "product_question", "low", "resolved"],
  ].map(([subject, category, priority, status], index) => {
    const customer = customers[index] ?? customers[0];
    return base(`tick_${index + 1}`, iso(daysBack(between(0, 12), now)), {
      subject,
      customerId: customer?.id ?? null,
      email: customer?.email ?? "",
      orderId: orders[index]?.id ?? null,
      category,
      priority,
      status,
      assigneeId: "admin_owner",
      messages: [
        {
          author: "customer",
          body: `${subject}. Please help.`,
          at: iso(daysBack(between(1, 10), now)),
        },
      ],
      attachments: [],
      internalNote: "",
      tags: [],
    });
  });

  const contactSubmissions: AdminRecord[] = [
    base("cont_1", iso(daysBack(2, now)), {
      name: "Sujan Neupane",
      email: "sujan@example.com",
      phone: "9800000000",
      subject: "Bulk order enquiry",
      message:
        "We would like to order 50 pieces for our shop in Gulmi. What is the wholesale price?",
      status: "new",
      reply: "",
      internalNote: "",
    }),
  ];

  const coupons: AdminRecord[] = [
    base("cpn_gulmeli10", stamp, {
      code: "GULMELI10",
      title: "10% off over Rs. 500",
      description: "10% off orders over Rs. 500, capped at Rs. 100.",
      automatic: false,
      enabled: true,
      type: "percentage",
      value: 10,
      maxDiscount: 100,
      appliesTo: "all",
      minPurchase: 500,
      customerIds: [],
      customerGroupIds: [],
      firstOrderOnly: false,
      birthdayOnly: false,
      usageLimit: 0,
      perCustomerLimit: 0,
      oneTime: false,
      startsAt: null,
      endsAt: null,
      usageCount: orders.filter((order) => order.couponCode === "GULMELI10")
        .length,
      revenue: 0,
      discountGiven: 0,
    }),
    base("cpn_welcome", stamp, {
      code: "WELCOME",
      title: "First order discount",
      description: "Rs. 150 off a customer's first order.",
      automatic: false,
      enabled: true,
      type: "fixed",
      value: 150,
      maxDiscount: 150,
      appliesTo: "all",
      minPurchase: 700,
      firstOrderOnly: true,
      perCustomerLimit: 1,
      oneTime: true,
      usageCount: 0,
      revenue: 0,
      discountGiven: 0,
    }),
    base("cpn_freeship", stamp, {
      code: "FREESHIP",
      title: "Free shipping",
      description: "Free delivery on any order.",
      automatic: true,
      enabled: false,
      type: "free_shipping",
      value: 0,
      appliesTo: "all",
      minPurchase: 2000,
      usageCount: 0,
      revenue: 0,
      discountGiven: 0,
    }),
  ];

  const flashSales: AdminRecord[] = [
    base("flash_1", stamp, {
      name: "Weekend flash sale",
      enabled: true,
      startsAt: iso(daysBack(-1, now)),
      endsAt: iso(daysBack(-3, now)),
      discountType: "percentage",
      discountValue: 20,
      productIds: products.slice(0, 6).map((product) => product.id),
      categoryIds: [],
      stockLimit: 50,
      showCountdown: true,
      banner: "",
      unitsSold: 0,
      revenue: 0,
    }),
  ];

  const paymentMethods: AdminRecord[] = [
    ["Cash on delivery", "cod", true],
    ["Khalti", "khalti", true],
    ["eSewa", "esewa", true],
    ["Fonepay", "fonepay", false],
    ["Card", "card", false],
    ["Bank transfer", "bank_transfer", false],
  ].map(([name, provider, enabled], index) =>
    base(`pay_${provider}`, stamp, {
      name,
      provider,
      enabled,
      sortOrder: index,
      icon: "",
      instructions: "",
      mode: "test",
      publicKey: "",
      secretKey: "",
      webhookUrl: "",
      minOrderTotal: 0,
      maxOrderTotal: provider === "cod" ? 25_000 : 0,
      extraFee: 0,
    }),
  );

  const shippingZones: AdminRecord[] = [
    base("zone_valley", stamp, {
      name: "Kathmandu Valley",
      enabled: true,
      countries: ["Nepal"],
      provinces: ["Bagmati"],
      districts: ["Kathmandu", "Lalitpur", "Bhaktapur"],
      cities: [],
      postalCodes: [],
      freeShippingThreshold: 1500,
      sortOrder: 0,
    }),
    base("zone_outside", stamp, {
      name: "Outside the valley",
      enabled: true,
      countries: ["Nepal"],
      provinces: [],
      districts: [],
      cities: [],
      postalCodes: [],
      freeShippingThreshold: 3000,
      sortOrder: 1,
    }),
  ];

  const shippingRates: AdminRecord[] = [
    ["Standard delivery", "zone_valley", "standard", 100, "2-3 days"],
    ["Same-day delivery", "zone_valley", "same_day", 250, "Today"],
    ["Standard delivery", "zone_outside", "standard", 200, "3-6 days"],
    ["Store pickup", "zone_valley", "pickup", 0, "Ready in 2 hours"],
  ].map(([name, zoneId, method, amount, estimate], index) =>
    base(`rate_${index + 1}`, stamp, {
      name,
      zoneId,
      method,
      basis: "flat",
      amount,
      minValue: 0,
      maxValue: 0,
      categoryId: null,
      estimate,
      enabled: true,
      sortOrder: index,
    }),
  );

  const couriers: AdminRecord[] = [
    base("cour_1", stamp, {
      name: "Gulmeli Express",
      phone: "",
      trackingUrlTemplate: "",
      apiKey: "",
      enabled: true,
      sortOrder: 0,
    }),
  ];

  const taxRates: AdminRecord[] = [
    base("tax_vat", stamp, {
      name: "VAT",
      rate: 13,
      scope: "global",
      categoryId: null,
      productId: null,
      region: "",
      taxCode: "VAT",
      inclusive: true,
      enabled: false,
    }),
  ];

  const banners: AdminRecord[] = [
    ["Festival sale", "home", "#f85606"],
    ["Free delivery over Rs. 1500", "home", "#ffba00"],
    ["New in electronics", "category", "#2563eb"],
  ].map(([name, placement, backgroundColor], index) =>
    base(`ban_${index + 1}`, stamp, {
      name,
      heading: name,
      subheading: "",
      image: "",
      mobileImage: "",
      videoUrl: "",
      backgroundColor,
      ctaLabel: "Shop now",
      ctaLink: "",
      categoryId: null,
      productId: null,
      placement,
      devices: ["mobile", "desktop"],
      sortOrder: index,
      status: "published",
      publishAt: null,
      unpublishAt: null,
    }),
  );

  const homepageSections: AdminRecord[] = [
    ["Hero", "hero_slider"],
    ["Shop by category", "categories"],
    ["Flash sale", "flash_sale"],
    ["Best sellers", "best_sellers"],
    ["New arrivals", "new_arrivals"],
    ["Recommended for you", "featured_products"],
    ["Join our newsletter", "newsletter"],
  ].map(([title, type], index) =>
    base(`hsec_${index + 1}`, stamp, {
      title,
      type,
      subtitle: "",
      sortOrder: index,
      collectionId: null,
      categoryIds: [],
      productIds: [],
      bannerIds:
        type === "hero_slider" ? banners.map((banner) => banner.id) : [],
      itemLimit: 8,
      layout: type === "categories" ? "grid" : "carousel",
      body: "",
      html: "",
      videoUrl: "",
      ctaLabel: "",
      ctaLink: "",
      enabled: true,
      showOnMobile: true,
      showOnDesktop: true,
      backgroundColor: "",
      startsAt: null,
      endsAt: null,
    }),
  );

  const menuItems: AdminRecord[] = [
    ...categories.slice(0, 6).map((category, index) =>
      base(`menu_cat_${index}`, stamp, {
        label: category.name,
        menu: "categories",
        parentId: null,
        target: "category",
        url: "",
        categoryId: category.id,
        pageId: null,
        collectionId: null,
        icon: "tag",
        image: "",
        newTab: false,
        sortOrder: index,
        enabled: true,
      }),
    ),
    ...["Home", "Offers", "Cart", "Account"].map((label, index) =>
      base(`menu_hdr_${index}`, stamp, {
        label,
        menu: "header",
        parentId: null,
        target: "url",
        url: `/${label === "Home" ? "" : label.toLowerCase()}`,
        categoryId: null,
        pageId: null,
        collectionId: null,
        icon: "",
        image: "",
        newTab: false,
        sortOrder: index,
        enabled: true,
      }),
    ),
  ];

  const pages: AdminRecord[] = [
    ["About us", "about"],
    ["Contact", "contact"],
    ["Privacy policy", "privacy"],
    ["Terms and conditions", "terms"],
    ["Refund policy", "refund"],
    ["Return policy", "returns"],
    ["Shipping policy", "shipping"],
    ["FAQ", "faq"],
  ].map(([title, kind], index) =>
    base(`page_${kind}`, stamp, {
      title,
      slug: slugify(String(title)),
      kind,
      summary: "",
      body: "",
      blocks: [],
      showInFooter: true,
      status: "draft",
      publishAt: null,
      unpublishAt: null,
      seoTitle: title,
      seoDescription: "",
      seoKeywords: [],
      ogImage: "",
      canonicalUrl: "",
      searchable: true,
      sortOrder: index,
    }),
  );

  const faqs: AdminRecord[] = [
    [
      "How long does delivery take?",
      "Inside the valley 2 to 3 days, elsewhere 3 to 6 days.",
    ],
    [
      "Can I pay cash on delivery?",
      "Yes, cash on delivery is available across Nepal.",
    ],
    [
      "How do I return an item?",
      "Open the order in the app and choose Return, within 7 days of delivery.",
    ],
  ].map(([question, answer], index) =>
    base(`faq_${index + 1}`, stamp, {
      question,
      answer,
      category: "General",
      productId: null,
      sortOrder: index,
      enabled: true,
    }),
  );

  const suppliers: AdminRecord[] = [
    base("sup_1", stamp, {
      name: "Kathmandu Wholesale House",
      contactPerson: "Ram Bahadur",
      email: "sales@example.com",
      phone: "9801111111",
      address: "New Road, Kathmandu",
      productIds: products.slice(0, 5).map((product) => product.id),
      balance: 0,
      paymentTerms: "Net 30",
      enabled: true,
      note: "",
    }),
  ];

  const purchaseOrders: AdminRecord[] = [
    base("po_1", iso(daysBack(12, now)), {
      number: "PO-00001",
      supplierId: "sup_1",
      status: "ordered",
      expectedAt: iso(daysBack(-4, now)).slice(0, 10),
      receivedAt: "",
      lines: products.slice(0, 3).map((product) => ({
        name: product.name,
        sku: product.sku,
        quantity: 25,
        receivedQuantity: 0,
        unitCost: Number(product.costPrice),
      })),
      total: products
        .slice(0, 3)
        .reduce((sum, product) => sum + Number(product.costPrice) * 25, 0),
      paid: 0,
      updateStockOnReceive: true,
      note: "",
    }),
  ];

  const expenses: AdminRecord[] = [
    ["Facebook ads", "advertising", 3_200],
    ["Packaging materials", "packaging", 1_400],
    ["Courier settlement", "shipping", 2_600],
    ["Shop rent", "rent", 8_000],
  ].map(([title, category, amount], index) =>
    base(`exp_${index + 1}`, iso(daysBack(between(1, 45), now)), {
      title,
      category,
      amount,
      spentAt: iso(daysBack(between(1, 45), now)).slice(0, 10),
      supplierId: null,
      paymentMethod: "Bank transfer",
      receipt: "",
      recurring: category === "rent",
      note: "",
    }),
  );

  const inventoryMovements: AdminRecord[] = products
    .slice(0, 10)
    .map((product, index) =>
      base(`inv_${index + 1}`, iso(daysBack(between(1, 40), now)), {
        productId: product.id,
        variantId: "",
        type: "restock",
        quantity: 50,
        resultingStock: Number(product.stock),
        supplierId: "sup_1",
        unitCost: Number(product.costPrice),
        warehouse: "Main",
        reason: "Opening stock",
        note: "",
      }),
    );

  const emailTemplates: AdminRecord[] = [
    ["Welcome", "welcome", "Welcome to {{store}}"],
    ["Order received", "order_received", "We have your order {{order}}"],
    ["Order confirmed", "order_confirmed", "Order {{order}} is confirmed"],
    ["Shipped", "shipped", "Order {{order}} is on the way"],
    ["Delivered", "delivered", "Order {{order}} was delivered"],
    ["Cancelled", "cancelled", "Order {{order}} was cancelled"],
    ["Refund", "refund", "Your refund for {{order}}"],
    ["Abandoned cart", "abandoned_cart", "You left something behind"],
    ["Password reset", "password_reset", "Reset your password"],
    ["Invoice", "invoice", "Invoice for order {{order}}"],
  ].map(([name, event, subject], index) =>
    base(`etpl_${event}`, stamp, {
      name,
      event,
      enabled: true,
      subject,
      preheader: "",
      body: `Hello {{customer}},\n\n${name} notification from {{store}}.\n\n{{link}}`,
      accentColor: "#f85606",
      backgroundColor: "#ffffff",
      textColor: "#212121",
      logo: "",
      buttonLabel: "View order",
      buttonLink: "",
      footer: "You are receiving this because you shop with {{store}}.",
      sortOrder: index,
    }),
  );

  const smsTemplates: AdminRecord[] = [
    ["OTP", "otp", "{{code}} is your {{store}} verification code."],
    [
      "Order confirmation",
      "order_confirmation",
      "Order {{order}} confirmed. Thank you for shopping with {{store}}.",
    ],
    ["Shipping", "shipping", "Order {{order}} has been shipped."],
    ["Delivery", "delivery", "Order {{order}} was delivered. Enjoy!"],
    ["Cancellation", "cancellation", "Order {{order}} was cancelled."],
  ].map(([name, event, body]) =>
    base(`stpl_${event}`, stamp, {
      name,
      event,
      body,
      senderId: "GULMELI",
      enabled: true,
    }),
  );

  const pushTemplates: AdminRecord[] = [
    base("ptpl_1", stamp, {
      name: "Flash sale live",
      title: "Flash sale is live",
      body: "Up to 20% off for the next 48 hours.",
      image: "",
      linkType: "url",
      link: "",
      productId: null,
      categoryId: null,
      audience: "all",
      scheduledFor: null,
      enabled: true,
    }),
  ];

  const segments: AdminRecord[] = [
    base("seg_high_value", stamp, {
      name: "High-value customers",
      preset: "high_value",
      description: "Customers who have spent more than Rs. 15,000.",
      rules: [{ field: "totalSpent", operator: "gte", value: "15000" }],
      memberCount: customers.filter(
        (customer) => Number(customer.totalSpent) > 15_000,
      ).length,
    }),
    base("seg_abandoned", stamp, {
      name: "Abandoned carts",
      preset: "abandoned_cart",
      description: "Shoppers who left something in their cart.",
      rules: [],
      memberCount: carts.filter((cart) => cart.state === "abandoned").length,
    }),
  ];

  const loyaltyRules: AdminRecord[] = [
    base("loy_purchase", stamp, {
      name: "Points on every purchase",
      trigger: "purchase",
      pointsPerUnit: 1,
      fixedPoints: 0,
      pointValue: 1,
      minRedemption: 100,
      maxRedemption: 500,
      expiryDays: 365,
      enabled: true,
    }),
    base("loy_referral", stamp, {
      name: "Referral bonus",
      trigger: "referral",
      pointsPerUnit: 0,
      fixedPoints: 100,
      pointValue: 1,
      minRedemption: 100,
      maxRedemption: 500,
      expiryDays: 365,
      enabled: true,
    }),
  ];

  const automations: AdminRecord[] = [
    ["Tell me when stock runs low", "stock_below", 5, "notify_admin", ""],
    [
      "Email the customer when an order is placed",
      "order_placed",
      0,
      "email_customer",
      "order_received",
    ],
    [
      "Push a notification when an order ships",
      "order_shipped",
      0,
      "push_customer",
      "shipped",
    ],
    [
      "Remind shoppers who abandon a cart",
      "cart_abandoned",
      0,
      "email_customer",
      "abandoned_cart",
    ],
    [
      "Alert customers when an item is back in stock",
      "back_in_stock",
      0,
      "email_customer",
      "",
    ],
    ["Make big spenders VIP", "customer_spend", 15_000, "assign_vip", ""],
    [
      "Free shipping on large orders",
      "order_total_above",
      3_000,
      "free_shipping",
      "",
    ],
    [
      "Tell the customer when a payment fails",
      "payment_failed",
      0,
      "email_customer",
      "",
    ],
    [
      "Confirm approved refunds",
      "refund_approved",
      0,
      "email_customer",
      "refund",
    ],
  ].map(([name, trigger, threshold, action, actionValue], index) =>
    base(`auto_${index + 1}`, stamp, {
      name,
      enabled: true,
      trigger,
      threshold,
      action,
      actionValue,
      delayMinutes: 0,
      description: "",
      lastRunAt: null,
      runCount: 0,
    }),
  );

  const integrations: AdminRecord[] = [
    ["Google Analytics", "analytics", "Google Analytics"],
    ["Meta Pixel", "analytics", "Meta"],
    ["TikTok Pixel", "analytics", "TikTok"],
    ["Google Tag Manager", "analytics", "Google"],
    ["Search Console", "analytics", "Google"],
    ["Firebase", "push", "Google"],
    ["Cloudinary", "storage", "Cloudinary"],
    ["Google Maps", "maps", "Google"],
  ].map(([name, category, provider], index) =>
    base(`int_${index + 1}`, stamp, {
      name,
      category,
      provider,
      enabled: false,
      publicId: "",
      apiKey: "",
      apiSecret: "",
      endpoint: "",
      mode: "test",
      note: "",
    }),
  );

  const currencies: AdminRecord[] = [
    base("cur_npr", stamp, {
      code: "NPR",
      symbol: "Rs.",
      name: "Nepalese rupee",
      rate: 1,
      base: true,
      enabled: true,
    }),
  ];

  const locations: AdminRecord[] = CITIES.map((place, index) =>
    base(`loc_${slugify(place.city)}`, stamp, {
      name: place.city,
      level: "city",
      parentId: null,
      postalCode: "",
      deliveryAvailable: true,
      shippingCharge: place.province === "Bagmati" ? 100 : 200,
      etaDays: place.province === "Bagmati" ? 2 : 4,
      sortOrder: index,
    }),
  );

  const translations: AdminRecord[] = [
    ["cart.addToCart", "Add to Cart", "कार्टमा राख्नुहोस्"],
    ["cart.buyNow", "Buy Now", "अहिले किन्नुहोस्"],
    ["cart.checkout", "Checkout", "भुक्तानी गर्नुहोस्"],
    ["product.outOfStock", "Out of Stock", "स्टकमा छैन"],
    ["auth.login", "Login", "लगइन"],
    ["auth.signup", "Sign up", "दर्ता गर्नुहोस्"],
  ].map(([key, en, ne]) =>
    base(`tr_${slugify(String(key))}`, stamp, {
      key,
      group: "storefront",
      en,
      ne,
      note: "",
    }),
  );

  const media: AdminRecord[] = [];
  const notifications: AdminRecord[] = [
    base("noti_1", iso(daysBack(3, now)), {
      title: "Weekend flash sale is live",
      body: "Up to 20% off across the store for 48 hours.",
      channels: ["push"],
      topic: "promotion",
      audience: "all",
      segmentId: null,
      image: "",
      link: "",
      productId: null,
      categoryId: null,
      status: "sent",
      scheduledFor: iso(daysBack(3, now)),
      sentAt: iso(daysBack(3, now)),
      recipients: customers.length,
      opens: Math.round(customers.length * 0.4),
    }),
  ];

  return {
    roles,
    admin_users: adminUsers,
    categories,
    brands,
    collections,
    products,
    bundles: [],
    preorders: [],
    inventory_movements: inventoryMovements,
    orders,
    returns,
    transactions,
    payment_methods: paymentMethods,
    shipping_zones: shippingZones,
    shipping_rates: shippingRates,
    couriers,
    deliveries: [],
    tax_rates: taxRates,
    coupons,
    flash_sales: flashSales,
    promotions: [],
    gift_cards: [],
    customers,
    customer_groups: customerGroups,
    carts,
    wishlists,
    reviews,
    questions,
    tickets,
    contact_submissions: contactSubmissions,
    campaigns: [],
    segments,
    popups: [],
    referrals: [],
    loyalty_rules: loyaltyRules,
    back_in_stock: [],
    price_alerts: [],
    notifications,
    email_templates: emailTemplates,
    sms_templates: smsTemplates,
    push_templates: pushTemplates,
    pages,
    blog_posts: [],
    faqs,
    banners,
    menu_items: menuItems,
    homepage_sections: homepageSections,
    media,
    suppliers,
    purchase_orders: purchaseOrders,
    expenses,
    pickup_stores: [],
    locations,
    translations,
    currencies,
    redirects: [],
    search_terms: [],
    integrations,
    webhooks: [],
    webhook_logs: [],
    automations,
    error_logs: [],
    backups: [],
    data_requests: [],
    audit_logs: [],
    revisions: [],
  };
}

/** An empty but complete snapshot, used when demo data is cleared. */
export function emptySnapshot(
  catalog: SeedSourceProduct[],
  now = new Date(),
): Snapshot {
  const seed = buildSeed(catalog, now);
  const keep = new Set([
    "roles",
    "admin_users",
    "categories",
    "brands",
    "products",
    "payment_methods",
    "shipping_zones",
    "shipping_rates",
    "couriers",
    "tax_rates",
    "email_templates",
    "sms_templates",
    "push_templates",
    "pages",
    "faqs",
    "homepage_sections",
    "menu_items",
    "currencies",
    "locations",
    "translations",
    "automations",
    "integrations",
    "loyalty_rules",
  ]);
  const result: Snapshot = {};
  for (const [collection, records] of Object.entries(seed)) {
    result[collection] = keep.has(collection) ? records : [];
  }
  return result;
}
