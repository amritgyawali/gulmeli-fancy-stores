import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MODULES,
  NAVIGATION,
  resourceByKey,
  resources,
} from "../src/admin/core/resources/index.ts";
import {
  featuresOf,
  PERMISSION_ACTIONS,
  sectionsOf,
} from "../src/admin/core/resource.ts";
import {
  coerce,
  initialValues,
  validate,
  type FieldDef,
} from "../src/admin/core/fields.ts";
import {
  buildSeed,
  emptySnapshot,
  type SeedSourceProduct,
} from "../src/admin/core/seed.ts";
import { AdminStore } from "../src/admin/core/store.ts";
import {
  globalSearch,
  COMMAND_ACTIONS,
  filterCommands,
} from "../src/admin/core/search.ts";
import { nextNumber, slugify } from "../src/admin/core/ids.ts";
import { CONFIG_GROUPS } from "../src/admin/core/config-schema.ts";
import { readFileSync } from "node:fs";

const CATALOG: SeedSourceProduct[] = [
  {
    id: "home-0",
    name: "Oversized T-shirt",
    price: 399,
    category: "Fashion",
    group: "home",
    stock: 99,
    sold: 201,
  },
  {
    id: "home-1",
    name: "Tactical Belt",
    price: 379,
    category: "Fashion",
    group: "home",
    stock: 40,
    sold: 965,
  },
  {
    id: "elec-0",
    name: "Mechanical Watch",
    price: 3200,
    category: "Electronics",
    group: "offer",
    stock: 12,
    sold: 33,
  },
  {
    id: "jewel-0",
    name: "Pearl Bracelet",
    price: 822,
    category: "Jewelry",
    group: "offer",
    stock: 0,
    sold: 5,
  },
];

test("every resource is internally consistent", () => {
  for (const resource of resources) {
    assert.ok(resource.key, "a resource needs a key");
    assert.ok(
      resource.label && resource.singular,
      `${resource.key} needs labels`,
    );
    assert.ok(resource.fields.length, `${resource.key} has no fields`);
    assert.ok(resource.columns.length, `${resource.key} has no list columns`);

    const fieldNames = new Set(resource.fields.map((field) => field.name));
    assert.equal(
      fieldNames.size,
      resource.fields.length,
      `${resource.key} has duplicate field names`,
    );

    for (const field of resource.searchFields) {
      assert.ok(
        fieldNames.has(field.split(".")[0] ?? field),
        `${resource.key} searches ${field}, which is not a field`,
      );
    }
    for (const field of resource.fields) {
      if (field.type !== "relation") continue;
      assert.ok(
        resourceByKey[field.resource ?? ""],
        `${resource.key}.${field.name} points at unknown resource ${field.resource}`,
      );
    }
    for (const column of resource.columns) {
      if (column.format !== "relation") continue;
      assert.ok(
        resourceByKey[column.resource ?? ""],
        `${resource.key} column ${column.field} points at unknown resource ${column.resource}`,
      );
    }
    for (const filter of resource.filters ?? []) {
      if (!filter.resource) continue;
      assert.ok(
        resourceByKey[filter.resource],
        `${resource.key} filter ${filter.field} is unresolvable`,
      );
    }
  }
});

test("resource keys are unique and every sidebar link resolves", () => {
  assert.equal(
    new Set(resources.map((resource) => resource.key)).size,
    resources.length,
  );

  const routes = NAVIGATION.flatMap((section) => [
    ...(section.route ? [section.route] : []),
    ...(section.items?.map((item) => item.route) ?? []),
  ]);
  assert.ok(routes.length > 40, "the sidebar should cover the whole business");

  for (const route of routes) {
    assert.match(route, /^\/admin/, `${route} is outside the admin`);
    const match = /^\/admin\/r\/([a-z_]+)$/.exec(route);
    if (match?.[1])
      assert.ok(
        resourceByKey[match[1]],
        `${route} lists a resource that does not exist`,
      );
  }
  assert.equal(
    new Set(routes).size,
    routes.length,
    "a sidebar route is duplicated",
  );
});

test("the sidebar follows the agreed order", () => {
  assert.deepEqual(
    NAVIGATION.map((section) => section.label),
    [
      "Dashboard",
      "Orders",
      "Products",
      "Categories",
      "Collections",
      "Inventory",
      "Customers",
      "Returns",
      "Payments",
      "Shipping",
      "Discounts",
      "Marketing",
      "Reviews",
      "Support",
      "Content",
      "Homepage Builder",
      "Appearance",
      "Notifications",
      "Analytics",
      "Reports",
      "Finance",
      "Suppliers",
      "Media",
      "Users & Roles",
      "Integrations",
      "Automation",
      "Audit Logs",
      "System",
      "Settings",
    ],
  );
});

test("editor sections keep every field and never lose one", () => {
  for (const resource of resources) {
    const grouped = sectionsOf(resource).flatMap((section) => section.fields);
    assert.equal(
      grouped.length,
      resource.fields.length,
      `${resource.key} loses fields when grouped`,
    );
  }
});

test("core commerce resources keep the lifecycle controls the business needs", () => {
  const products = featuresOf(resourceByKey.products!);
  assert.equal(products.publish, true);
  assert.equal(products.duplicate, true);
  assert.equal(products.reorder, true);
  assert.equal(products.trash, true);
  assert.equal(products.revisions, true);

  const audit = featuresOf(resourceByKey.audit_logs!);
  assert.equal(audit.create, false);
  assert.equal(audit.edit, false);
  assert.equal(audit.delete, false);
});

test("every module used by a resource or the sidebar is a known permission module", () => {
  for (const resource of resources)
    assert.ok(MODULES.includes(resource.module), resource.module);
  assert.ok(PERMISSION_ACTIONS.includes("refund"));
});

test("field validation catches what a careless edit would break", () => {
  const fields: FieldDef[] = [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "slug", label: "Slug", type: "slug" },
    { name: "price", label: "Price", type: "currency", min: 0, max: 1000 },
    { name: "email", label: "Email", type: "email" },
    { name: "site", label: "Site", type: "url" },
    { name: "colour", label: "Colour", type: "color" },
    {
      name: "deposit",
      label: "Deposit",
      type: "currency",
      required: true,
      showIf: (values) => values.payment === "deposit",
    },
  ];

  assert.deepEqual(
    validate(fields, { name: "", payment: "full" }).map((error) => error.field),
    ["name"],
  );

  const errors = validate(fields, {
    name: "Belt",
    slug: "Not A Slug",
    price: 5000,
    email: "nope",
    site: "example.com",
    colour: "red",
    payment: "full",
  });
  assert.deepEqual(errors.map((error) => error.field).sort(), [
    "colour",
    "email",
    "price",
    "site",
    "slug",
  ]);

  assert.equal(
    validate(fields, { name: "Belt", payment: "deposit" }).length,
    1,
    "conditional fields apply",
  );
  assert.equal(
    validate(fields, { name: "Belt", payment: "full" }).length,
    0,
    "hidden fields are skipped",
  );
});

test("coercion turns editor input into stored types", () => {
  assert.equal(coerce({ name: "n", label: "n", type: "number" }, "42"), 42);
  assert.equal(coerce({ name: "n", label: "n", type: "number" }, ""), null);
  assert.equal(coerce({ name: "n", label: "n", type: "number" }, "abc"), null);
  assert.equal(coerce({ name: "b", label: "b", type: "boolean" }, "yes"), true);
  assert.deepEqual(coerce({ name: "t", label: "t", type: "tags" }, "a, b ,c"), [
    "a",
    "b",
    "c",
  ]);
});

test("a new record starts from the declared defaults", () => {
  const values = initialValues(resourceByKey.products!.fields);
  assert.equal(values.status, "draft");
  assert.equal(values.lowStockThreshold, 5);
  assert.equal(values.minPurchaseQty, 1);
  assert.deepEqual(values.images, []);
  assert.deepEqual(values.collectionIds, []);
});

test("the seed fills every collection the registry expects", () => {
  const seed = buildSeed(CATALOG, new Date("2026-05-20T12:00:00.000Z"));
  for (const resource of resources) {
    assert.ok(
      Array.isArray(seed[resource.key]),
      `${resource.key} has no collection in the seeded snapshot`,
    );
  }
  assert.equal(seed.products?.length, CATALOG.length);
  assert.ok(
    (seed.orders?.length ?? 0) > 20,
    "there should be enough orders for the charts",
  );
  assert.ok((seed.roles?.length ?? 0) >= 8, "the built-in roles are seeded");
});

test("the seed is deterministic, so demo numbers do not drift", () => {
  const at = new Date("2026-05-20T12:00:00.000Z");
  assert.equal(
    JSON.stringify(buildSeed(CATALOG, at)),
    JSON.stringify(buildSeed(CATALOG, at)),
  );
});

test("seeded customers agree with their orders", () => {
  const seed = buildSeed(CATALOG, new Date("2026-05-20T12:00:00.000Z"));
  const orders = seed.orders ?? [];
  for (const customer of seed.customers ?? []) {
    const own = orders.filter(
      (order) =>
        order.customerId === customer.id && order.status !== "cancelled",
    );
    assert.equal(customer.orderCount, own.length);
    assert.equal(
      customer.totalSpent,
      own.reduce((total, order) => total + Number(order.total), 0),
    );
  }
});

test("clearing demo data keeps configuration-like records and drops transactions", () => {
  const empty = emptySnapshot(CATALOG, new Date("2026-05-20T12:00:00.000Z"));
  assert.equal(empty.orders?.length, 0);
  assert.equal(empty.customers?.length, 0);
  assert.equal(empty.reviews?.length, 0);
  assert.ok(
    (empty.products?.length ?? 0) > 0,
    "the catalogue is not demo data",
  );
  assert.ok((empty.roles?.length ?? 0) > 0);
  assert.ok((empty.email_templates?.length ?? 0) > 0);
});

test("global search reaches products, orders, screens and settings from one box", () => {
  const store = new AdminStore(
    buildSeed(CATALOG, new Date("2026-05-20T12:00:00.000Z")),
  );

  const byName = globalSearch(store, "Tactical");
  assert.ok(byName.some((hit) => hit.group === "Products"));

  const bySku = globalSearch(store, "GFS-0001");
  assert.ok(bySku.length > 0, "SKU search should work");

  assert.ok(
    globalSearch(store, "Appearance").some((hit) => hit.group === "Screens"),
  );
  assert.ok(
    globalSearch(store, "Primary colour").some(
      (hit) => hit.group === "Settings",
    ),
  );
  assert.deepEqual(
    globalSearch(store, "a"),
    [],
    "a single character is not searched",
  );

  for (const hit of globalSearch(store, "belt"))
    assert.match(hit.route, /^\/admin/);
});

test("quick actions cover the tasks the brief lists and respect permissions", () => {
  const labels = COMMAND_ACTIONS.map((action) => action.label);
  for (const expected of [
    "Create product",
    "Create order",
    "Create coupon",
    "Add customer",
    "Add banner",
    "Send notification",
    "Add inventory",
  ]) {
    assert.ok(
      labels.includes(expected),
      `${expected} is missing from the command centre`,
    );
  }
  assert.equal(filterCommands("", () => false).length, 0);
  assert.equal(filterCommands("coupon", () => true).length, 1);
});

test("slugs and generated references behave", () => {
  assert.equal(
    slugify("Men's Tactical Belt — Heavy Duty!"),
    "mens-tactical-belt-heavy-duty",
  );
  assert.equal(nextNumber("GFS-", []), "GFS-00001");
  assert.equal(nextNumber("GFS-", ["GFS-00001", "GFS-00009"]), "GFS-00010");
});

test("every icon the dashboard asks for exists in the icon font", () => {
  const glyphs = new Set(
    Object.keys(
      JSON.parse(
        readFileSync(
          new URL(
            "../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/FontAwesome6Free.json",
            import.meta.url,
          ),
          "utf8",
        ),
      ) as Record<string, unknown>,
    ),
  );

  const used = new Set<string>([
    ...resources.map((resource) => resource.icon),
    ...CONFIG_GROUPS.map((group) => group.icon),
    ...NAVIGATION.flatMap((section) => [
      section.icon,
      ...(section.items?.map((item) => item.icon) ?? []),
    ]),
    ...COMMAND_ACTIONS.map((action) => action.icon),
  ]);

  const missing = [...used].filter((name) => !glyphs.has(name)).sort();
  assert.deepEqual(
    missing,
    [],
    `these icons would render as a question mark: ${missing.join(", ")}`,
  );
});

test("the seeded month has enough activity for the dashboard to be meaningful", () => {
  const now = new Date("2026-05-20T12:00:00.000Z");
  const seed = buildSeed(CATALOG, now);
  const monthAgo = now.getTime() - 30 * 86_400_000;

  const newCustomers = (seed.customers ?? []).filter(
    (customer) => Date.parse(String(customer.createdAt)) >= monthAgo,
  );
  assert.ok(
    newCustomers.length > 0,
    "the new-customer figure should not always read zero",
  );

  const recentOrders = (seed.orders ?? []).filter(
    (order) => Date.parse(String(order.placedAt)) >= monthAgo,
  );
  assert.ok(
    recentOrders.length > 5,
    "there should be orders inside the default 30-day window",
  );
});
