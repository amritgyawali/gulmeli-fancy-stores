import { test, expect, type Page } from "@playwright/test";

const DESKTOP = { width: 1280, height: 900 };
const PHONE = { width: 390, height: 844 };

function watchForErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    // The generic resource-load line is covered by the response check below,
    // which can tell a missing favicon apart from a real broken asset.
    const text = message.text();
    if (
      message.type() === "error" &&
      !text.startsWith("Failed to load resource")
    )
      errors.push(`console: ${text}`);
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    if (response.url().endsWith("/favicon.ico")) return;
    errors.push(`http ${response.status()}: ${response.url()}`);
  });
  return errors;
}

async function openAdmin(page: Page, route: string) {
  await page.goto(route);
  await expect(page.getByRole("heading").first()).toBeVisible();
  await page.waitForTimeout(400);
}

test("every dashboard screen renders on a desktop without runtime errors", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize(DESKTOP);
  const errors = watchForErrors(page);

  const screens: [string, string][] = [
    ["/admin", "Dashboard"],
    ["/admin/orders-board", "Order board"],
    ["/admin/inventory", "Inventory"],
    ["/admin/homepage", "Homepage Builder"],
    ["/admin/appearance", "Appearance"],
    ["/admin/analytics", "Analytics"],
    ["/admin/reports", "Reports"],
    ["/admin/finance", "Finance"],
    ["/admin/media", "Media library"],
    ["/admin/roles", "Roles & permissions"],
    ["/admin/automation", "Automation"],
    ["/admin/seo", "SEO & search"],
    ["/admin/trash", "Trash"],
    ["/admin/system", "System"],
    ["/admin/settings", "Settings"],
  ];

  for (const [route, heading] of screens) {
    await openAdmin(page, route);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${route} scrolls sideways`,
    ).toBe(true);
  }

  expect(errors).toEqual([]);
});

test("the overview reports real figures from the seeded shop", async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP);
  await openAdmin(page, "/admin");

  // Money is formatted with the configured currency symbol, not a raw number.
  await expect(page.getByText("Total sales")).toBeVisible();
  await expect(page.getByText(/Rs\./).first()).toBeVisible();
  await expect(page.getByText("Order pipeline")).toBeVisible();
  await expect(page.getByText("Quick actions")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create product" }),
  ).toBeVisible();
});

test("the dashboard is usable from a phone", async ({ page }) => {
  await page.setViewportSize(PHONE);
  const errors = watchForErrors(page);
  await openAdmin(page, "/admin");

  // The sidebar collapses into a drawer that the menu button opens.
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.getByRole("button", { name: "Open the menu" }).click();
  await expect(
    page.getByRole("link", { name: "Products" }).first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "Products" }).first().click();
  await expect(
    page.getByRole("link", { name: "Products", exact: true }).first(),
  ).toBeVisible();

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("a product can be found, opened and edited from the catalogue list", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize(DESKTOP);
  const errors = watchForErrors(page);

  await openAdmin(page, "/admin/r/products");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();

  await page.getByLabel("Search Products").fill("Tactical");
  await page.waitForTimeout(500);
  await expect(
    page.getByText("Tactical Belt", { exact: false }).first(),
  ).toBeVisible();

  await page.getByText("Tactical Belt", { exact: false }).first().click();
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();

  await page.getByLabel("Product name").fill("Tactical Belt (browser test)");
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForTimeout(700);

  // The edit survives a full reload, so it really was stored.
  await openAdmin(page, "/admin/r/products");
  await page.getByLabel("Search Products").fill("browser test");
  await page.waitForTimeout(600);
  await expect(
    page.getByText("Tactical Belt (browser test)").first(),
  ).toBeVisible();

  expect(errors).toEqual([]);
});

test("a coupon created in the dashboard is stored and listed", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize(DESKTOP);
  await openAdmin(page, "/admin/r/coupons/new");

  await page.getByLabel("Coupon code").fill("BROWSERTEST");
  await page.getByLabel("Internal title").fill("Created by the browser test");
  await page.getByRole("button", { name: "Create" }).click();
  await page.waitForTimeout(800);

  await openAdmin(page, "/admin/r/coupons");
  await page.getByLabel("Search Coupons").fill("BROWSERTEST");
  await page.waitForTimeout(600);
  await expect(page.getByText("BROWSERTEST").first()).toBeVisible();
});

test("publishing an appearance change reaches the storefront without a code change", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize(DESKTOP);
  await openAdmin(page, "/admin/appearance");

  // Change the announcement bar, which the customer app renders from configuration.
  await page
    .getByRole("tab", { name: "Header, footer & announcement" })
    .click();
  await page.waitForTimeout(400);
  await page.getByLabel("Show the announcement bar").click();
  await page
    .getByLabel("Announcement text")
    .fill("Dashain delivery is free this week");
  await page.waitForTimeout(300);

  await page.getByRole("button", { name: "Publish now" }).click();
  await expect(page.getByText(/Published\./).first()).toBeVisible();

  // The storefront picks the change up on its next load, with no rebuild.
  await page.setViewportSize(PHONE);
  await page.goto("/");
  await expect(
    page.getByText("Dashain delivery is free this week"),
  ).toBeVisible();
});

test("global search reaches products, screens and settings from one box", async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP);
  await openAdmin(page, "/admin");

  await page.getByRole("button", { name: "Search everything" }).click();
  const search = page.getByTestId("admin-global-search");
  await expect(search).toBeVisible();

  await search.fill("coupon");
  await page.waitForTimeout(400);
  await expect(page.getByText("Create coupon").first()).toBeVisible();

  await search.fill("Tactical");
  await page.waitForTimeout(400);
  await expect(page.getByText("Products").first()).toBeVisible();
});
