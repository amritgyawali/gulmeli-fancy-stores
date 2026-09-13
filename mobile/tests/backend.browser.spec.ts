import { test, expect, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";

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

async function mockStore(page: Page) {
  const state = {
    customer: customer(),
    orders: [] as Record<string, unknown>[],
    checkoutRequests: [] as Record<string, unknown>[],
    failCheckout: false,
    failCatalog: false,
    failSave: false,
    uploadCount: 0,
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
  await page.route("https://store-test.supabase.co/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (request.method() === "OPTIONS") return json({});
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
    if (path === "/functions/v1/upload-image") {
      expect(request.headers().authorization).toMatch(/^Bearer /);
      expect(request.postDataJSON().image).toMatch(/^data:image\//);
      state.uploadCount++;
      return json({
        url: "https://res.cloudinary.com/store-test/image/upload/v2/avatar.jpg",
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
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
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
  ).toBeVisible();
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
