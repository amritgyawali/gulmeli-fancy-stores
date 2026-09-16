import { test, expect, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { restoreConfig, type StorefrontConfig } from "../src/admin/core/config";

const cloudName = process.env.GULMELI_BACKEND_TEST_BUNDLE
  ? process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    parseEnv(readFileSync(new URL("../.env.local", import.meta.url), "utf8"))
      .EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME
  : "store-test";

const userId = "11111111-1111-1111-1111-111111111111";
const profile = {
  name: "Test Customer",
  phone: "9800000000",
  address: "Kathmandu, Nepal",
  avatar: "",
};
const customer = () => ({
  profile: { ...profile },
  wishlist: [],
  following: [],
  recent: [],
  reviews: [],
  drafts: [],
  notifications: true,
  gems: 0,
  lastCheckIn: "",
  voucher: "",
});

async function mockStore(page: Page, admin = false) {
  const state = {
    customer: customer(),
    orders: [] as Record<string, unknown>[],
    checkoutRequests: [] as Record<string, unknown>[],
    failCheckout: false,
    failCatalog: false,
    failSave: false,
    uploadCount: 0,
    adminRecords: [
      {
        collection: "products",
        id: "test-shirt",
        document: {
          id: "test-shirt",
          name: "Cloud Shirt",
          slug: "cloud-shirt",
          sku: "SHIRT-01",
          price: 600,
          stock: 5,
          status: "published",
          images: [],
          revision: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
      },
    ] as {
      collection: string;
      id: string;
      document: Record<string, unknown>;
    }[],
    adminWrites: 0,
    publishedConfig: null as StorefrontConfig | null,
    publicContent: [] as {
      collection: string;
      id: string;
      document: Record<string, unknown>;
    }[],
  };
  await page.route("https://res.cloudinary.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await page.routeWebSocket(/wss:\/\/[^/]+\.supabase\.co\//, (socket) =>
    socket.close(),
  );
  await page.route(/https:\/\/[^/]+\.supabase\.co\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (request.method() === "OPTIONS") return json({});
    if (path === "/rest/v1/admin_members")
      return json(admin ? { role: "super_admin", user_id: userId } : null);
    if (path === "/rest/v1/admin_data")
      return json(admin ? state.adminRecords : []);
    if (path === "/rest/v1/media") return json([]);
    if (path === "/rest/v1/app_config") {
      if (request.method() === "POST") {
        if (!admin) return json({ message: "Forbidden" }, 403);
        state.publishedConfig = request.postDataJSON().published;
        return json(null);
      }
      return json(
        state.publishedConfig ? { published: state.publishedConfig } : null,
      );
    }
    if (path === "/rest/v1/rpc/save_admin_changes") {
      if (!admin) return json({ message: "Store admin access required." }, 403);
      for (const change of request.postDataJSON().p_changes) {
        const index = state.adminRecords.findIndex(
          (r) => r.collection === change.collection && r.id === change.id,
        );
        expect(index < 0 ? null : state.adminRecords[index].document).toEqual(
          change.before,
        );
        if (index >= 0) state.adminRecords.splice(index, 1);
        if (change.after)
          state.adminRecords.push({
            collection: change.collection,
            id: change.id,
            document: change.after,
          });
      }
      state.adminWrites++;
      return json(null);
    }
    if (path === "/auth/v1/token") {
      const user = {
        id: userId,
        email: "customer@example.com",
        aud: "authenticated",
        role: "authenticated",
        app_metadata: {},
        user_metadata: {},
        created_at: new Date().toISOString(),
      };
      const access_token = [
        Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
          "base64url",
        ),
        Buffer.from(
          JSON.stringify({
            sub: userId,
            exp: Math.floor(Date.now() / 1000) + 3600,
            role: "authenticated",
            aud: "authenticated",
          }),
        ).toString("base64url"),
        "test-signature",
      ].join(".");
      return json({
        access_token,
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "test-refresh-token",
        user,
      });
    }
    if (path === "/auth/v1/logout") return json({});
    if (path === "/rest/v1/products")
      return state.failCatalog
        ? json({ message: "Catalog unavailable" }, 503)
        : json([
            {
              id: "test-shirt",
              name: "Cloud Shirt",
              price: 600,
              stock: 5,
              category: "Fashion",
              product_group: "home",
              image_url:
                "https://res.cloudinary.com/store-test/image/upload/shirt.png",
              details: {},
            },
          ]);
    if (path === "/rest/v1/customer_state") {
      if (request.method() === "POST") {
        if (state.failSave)
          return json({ message: "Connection interrupted" }, 503);
        state.customer = request.postDataJSON().data;
        expect(request.postDataJSON().user_id).toBe(userId);
        expect(state.customer).not.toHaveProperty("orders");
        return json(null);
      }
      return json({ data: state.customer });
    }
    if (path === "/rest/v1/orders")
      return json(state.orders.map((document) => ({ document })));
    if (path === "/rest/v1/rpc/quote_order") {
      const body = request.postDataJSON();
      const subtotal = body.p_items.reduce(
        (sum: number, i: { quantity: number }) => sum + i.quantity * 600,
        0,
      );
      return json({
        subtotal,
        discount: 0,
        shipping: 0,
        total: subtotal,
        voucher: body.p_voucher,
      });
    }
    if (path === "/rest/v1/rpc/storefront_content")
      return json(state.publicContent);
    if (path === "/rest/v1/rpc/my_support_tickets") return json([]);
    if (path === "/rest/v1/rpc/place_order") {
      const body = request.postDataJSON();
      state.checkoutRequests.push(body);
      if (state.failCheckout)
        return json(
          { message: "Not enough stock. Update your cart.", code: "P0001" },
          400,
        );
      const order = {
        id: "33333333-3333-3333-3333-333333333333",
        createdAt: new Date().toISOString(),
        items: [
          {
            productId: "test-shirt",
            name: "Cloud Shirt",
            price: 600,
            quantity: 1,
          },
        ],
        subtotal: 600,
        discount: 0,
        total: 600,
        status: "Placed",
        profile: body.p_profile,
      };
      state.orders = [order];
      return json(order);
    }
    if (path === "/rest/v1/rpc/cancel_order") {
      state.orders[0].status = "Cancelled";
      return json(state.orders[0]);
    }
    if (path === "/functions/v1/cloudinary-media") {
      expect(request.headers().authorization).toMatch(/^Bearer /);
      expect(request.postDataJSON().image).toMatch(/^data:image\//);
      state.uploadCount++;
      return json({
        url: `https://res.cloudinary.com/${cloudName}/image/upload/v2/avatar.jpg`,
      });
    }
    return json({ message: `Unexpected mocked API: ${path}` }, 500);
  });
  return state;
}
async function signIn(page: Page) {
  await page.goto("/auth");
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("customer@example.com");
  await page.getByLabel("Password", { exact: true }).fill("test-password-123");
  await page
    .getByRole("button", { name: "Sign in", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(
    page.getByText("Connected to your account", { exact: true }),
  ).toBeVisible();
}
test("loads live products, requires sign-in, places an authoritative order and cancels it", async ({
  page,
}) => {
  const state = await mockStore(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/feature?destination=Product%20details&id=test-shirt");
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await page.goto("/feature?destination=Checkout");
  await expect(
    page.getByRole("button", { name: "Sign in to your account" }),
  ).toBeVisible();
  await signIn(page);
  await page.goto("/feature?destination=Product%20details&id=test-shirt");
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await page.getByRole("tab", { name: "Cart", exact: true }).click();
  await page.getByRole("button", { name: /^Check Out\(/ }).click();
  await page
    .getByRole("button", { name: "Place order - Cash on delivery" })
    .click();
  await expect(page.getByText("Placed", { exact: true })).toBeVisible();
  expect(state.checkoutRequests).toHaveLength(1);
  expect(state.checkoutRequests[0].p_items).toEqual([
    { productId: "test-shirt", quantity: 1 },
  ]);
  await page.getByRole("button", { name: "Cancel order", exact: true }).click();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("authenticated staff edits persist remotely after reload", async ({
  page,
}) => {
  const state = await mockStore(page, true);
  await signIn(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/admin/r/products");
  await page.getByLabel("Search Products").fill("Cloud Shirt");
  await page.getByText("Cloud Shirt", { exact: true }).first().click();
  await page.getByLabel("Product name").fill("Updated Cloud Shirt");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect
    .poll(
      () =>
        state.adminRecords.find((r) => r.id === "test-shirt")?.document.name,
    )
    .toBe("Updated Cloud Shirt");
  expect(state.adminWrites).toBeGreaterThan(0);
  await page.reload();
  await expect(page.getByLabel("Product name")).toHaveValue(
    "Updated Cloud Shirt",
  );
});

test("a customer account cannot access staff records", async ({ page }) => {
  await mockStore(page);
  await signIn(page);
  await page.goto("/admin");
  await expect(
    page.getByText("This account does not have store admin access.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Search Products")).toHaveCount(0);
});
test("failed checkout keeps the cart and retry reuses its request ID", async ({
  page,
}) => {
  const state = await mockStore(page);
  await signIn(page);
  await page.goto("/feature?destination=Product%20details&id=test-shirt");
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await page.getByRole("tab", { name: "Cart", exact: true }).click();
  await page.getByRole("button", { name: /^Check Out\(/ }).click();
  state.failCheckout = true;
  await page
    .getByRole("button", { name: "Place order - Cash on delivery" })
    .click();
  await expect(
    page.getByText("Not enough stock. Update your cart.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Account saved", { exact: true })).toBeVisible();
  await page.reload();
  state.failCheckout = false;
  await page
    .getByRole("button", { name: "Place order - Cash on delivery" })
    .click();
  await expect(page.getByText("Placed", { exact: true })).toBeVisible();
  expect(state.checkoutRequests[0].p_request_id).toBe(
    state.checkoutRequests[1].p_request_id,
  );
});
test("uploads a profile image, syncs customer data, restores it and clears it on sign-out", async ({
  page,
}) => {
  const state = await mockStore(page);
  await signIn(page);
  await page.goto("/feature?destination=Edit%20profile");
  await page.getByRole("textbox", { name: "Full name" }).fill("Cloud Customer");
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose profile photo" }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(
    fileURLToPath(
      new URL("../assets/images/03f09b0c48f4b136.jpg", import.meta.url),
    ),
  );
  await expect(
    page.getByText("Photo uploaded. Save your profile to use it.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByText("Account saved", { exact: true })).toBeVisible();
  expect(state.uploadCount).toBe(1);
  expect(state.customer.profile.name).toBe("Cloud Customer");
  expect(state.customer.profile.avatar).toContain("res.cloudinary.com");
  await page.screenshot({
    path: test.info().outputPath("connected-profile.png"),
  });
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Full name" })).toHaveValue(
    "Cloud Customer",
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(
    page.getByRole("button", { name: "Login", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Cloud Customer", { exact: true })).toHaveCount(
    0,
  );
});
test("catalog and account-save failures expose a working retry", async ({
  page,
}) => {
  const state = await mockStore(page);
  state.failCatalog = true;
  await page.goto("/");
  await expect(
    page.getByText("Catalog unavailable", { exact: true }),
  ).toBeVisible({ timeout: 30000 }); // Supabase and Query exhaust their transient-error retries first.
  state.failCatalog = false;
  await page.getByRole("button", { name: "Retry connection" }).click();
  await expect(
    page.getByText("Catalog unavailable", { exact: true }),
  ).toHaveCount(0);
  await signIn(page);
  await page.goto("/feature?destination=Edit%20profile");
  await page.getByRole("textbox", { name: "Full name" }).fill("Retry Customer");
  state.failSave = true;
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retry connection" }),
  ).toBeVisible();
  state.failSave = false;
  await page.getByRole("button", { name: "Retry connection" }).click();
  await expect(page.getByText("Account saved", { exact: true })).toBeVisible();
  expect(state.customer.profile.name).toBe("Retry Customer");
});

test("admin publishes a new brand, customers receive it, and layout follows database sections", async ({
  page,
}) => {
  const state = await mockStore(page, true);
  await signIn(page);
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("/admin/appearance");
  await page.getByLabel("Primary colour", { exact: true }).fill("#2563eb");
  await page.getByRole("button", { name: "Publish now", exact: true }).click();
  await expect
    .poll(() => state.publishedConfig?.theme.primaryColor)
    .toBe("#2563eb");
  await page.getByRole("tab", { name: "Branding", exact: true }).click();
  await page
    .getByLabel("Company name", { exact: true })
    .fill("Blue Lotus Store");
  await page.getByRole("button", { name: "Publish now", exact: true }).click();
  await expect
    .poll(() => state.publishedConfig?.branding.companyName)
    .toBe("Blue Lotus Store");
  await page.getByLabel("Primary logo", {exact:true}).fill(`https://res.cloudinary.com/${cloudName}/image/upload/brand.png`);
  await page.getByLabel("Favicon", {exact:true}).fill(`https://res.cloudinary.com/${cloudName}/image/upload/icon.png`);
  await page.getByRole("button", {name:"Publish now",exact:true}).click();
  await expect.poll(()=>state.publishedConfig?.branding.favicon).toContain("icon.png");
  state.publicContent = [
    {
      collection: "homepage_config",
      id: "layout",
      document: { configured: true },
    },
    {
      collection: "homepage_sections",
      id: "editorial",
      document: {
        type: "text",
        title: "Freshly curated",
        body: "Chosen by your store team",
        enabled: true,
        sortOrder: 0,
      },
    },
    {
      collection: "homepage_sections",
      id: "products",
      document: {
        type: "featured_products",
        title: "Shop the edit",
        enabled: true,
        layout: "grid",
        sortOrder: 1,
      },
    },
  ];
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Freshly curated" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Blue Lotus Store" }).first(),
  ).toBeVisible();
  await expect(page).toHaveTitle("Blue Lotus Store");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    "href",
    /icon.png/,
  );
  await expect(
    page.getByRole("button", { name: "Add Cloud Shirt to cart" }),
  ).toHaveCSS("background-color", "rgb(37, 99, 235)");
  await page.screenshot({ path: test.info().outputPath("store-phone.png") });
  state.publicContent[1].document.title = "Updated live";
  await expect(page.getByRole("heading", { name: "Updated live" })).toBeVisible(
    { timeout: 20000 },
  );
  state.publishedConfig = restoreConfig({
    ...state.publishedConfig,
    theme: { ...state.publishedConfig?.theme, colorScheme: "dark" },
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Updated live" })).toHaveCSS(
    "color",
    "rgb(245, 245, 247)",
  );
  await page.screenshot({ path: test.info().outputPath("store-dark.png") });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.screenshot({
    path: test.info().outputPath("store-landscape.png"),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
