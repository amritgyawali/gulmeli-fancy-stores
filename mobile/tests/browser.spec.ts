import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";

test("all supplied routes render at phone widths without runtime errors or broken images", async ({
  page,
}, testInfo) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  for (const width of [390, 320, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ["/", "/messages", "/offers", "/cart", "/account"]) {
      await page.goto(route);
      await expect(
        page.getByRole("tab", { name: "Home", exact: true }),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() =>
        Array.from(document.images).every(
          (i) => i.complete && i.naturalWidth > 0,
        ),
      );
      await page.screenshot({
        path: testInfo.outputPath(`${route.slice(1) || "home"}-${width}.png`),
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const broken = await page.evaluate(() =>
        Array.from(document.images)
          .filter((i) => i.complete && i.naturalWidth === 0)
          .map((i) => i.src),
      );
      expect(broken).toEqual([]);
    }
  }
  writeFileSync(
    testInfo.outputPath("browser-errors.json"),
    JSON.stringify(errors, null, 2),
  );
  expect(errors).toEqual([]);
});

test("offers search, cart selection, stock limit, persistence, removal, and all navigation", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Buy More Save More offer", exact: true })
    .click();
  await expect(page).toHaveURL(/\/offers$/);
  await page.getByRole("textbox", { name: "Search offers" }).fill("keyboard");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^Add .* to cart$/ }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: /^Add Mini Wireless Keyboard/ })
    .click();
  await expect(
    page.getByRole("button", { name: "Check Out(1)", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "View offer items in cart" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await page.getByRole("button", { name: "View All", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^Increase Mini Wireless Keyboard/ }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Select all cart items" }).click();
  await expect(
    page.getByRole("button", { name: "Check Out(4)" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Increase Dabur Glucose D 500 Gm" })
    .click();
  await expect(
    page.getByRole("button", { name: "Check Out(5)" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Check Out(5)" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete selected cart items" })
    .click();
  await expect(
    page.getByRole("button", { name: "Check Out(0)" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Check Out(0)" }),
  ).toBeVisible();
  await expect(
    page.getByText("Your cart is empty.", { exact: true }),
  ).toBeVisible();
  for (const [label, route] of [
    ["Messages", "/messages"],
    ["Account", "/account"],
    ["Home", "/"],
  ]) {
    await page.getByRole("tab", { name: label, exact: true }).click();
    await expect(page).toHaveURL(
      new RegExp(`${route === "/" ? "/$" : route + "$"}`),
    );
  }
});

test("account order tabs, swipe, settings navigation, and message read persistence", async ({
  page,
}) => {
  await page.goto("/account");
  await page.getByRole("tab", { name: "To Pay", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "To Pay", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Shop Now", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("tab", { name: "Account", exact: true }).click();
  await page.getByRole("tab", { name: "To Receive", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "To Receive", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Full name", exact: true }),
  ).toHaveValue("Arjun Gyawali");
  await page.getByRole("tab", { name: "Messages", exact: true }).click();
  await page
    .getByRole("button", { name: "Mark all as read", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "Messages", exact: true }),
  ).not.toContainText("13");
  await page.getByRole("tab", { name: "Alerts", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "40% OFF — shopping?🛍️", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "ALERT: HIGH TEMPERATURE🔥",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("horizontal account paging stays selected through refresh; product tabs stick while scrolling", async ({
  page,
}, testInfo) => {
  await page.goto("/account");
  const summaries = page.getByLabel("Order summaries");
  await summaries.waitFor();
  await summaries.evaluate((e) => e.scrollTo({ left: 0, behavior: "instant" }));
  await expect(
    page.getByRole("tab", { name: "To Pay", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.mouse.move(5, 20);
  await page.mouse.down();
  await page.mouse.move(5, 130, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByLabel("Refreshing account")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("account-shimmer-390.png"),
  });
  await expect(page.getByLabel("Refreshing account")).toHaveCount(0);
  await expect(
    page.getByRole("tab", { name: "To Pay", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => summaries.evaluate((e) => e.scrollLeft)).toBe(0);

  for (const route of ["/", "/offers"]) {
    await page.goto(route);
    const tab = page.getByRole("tab", {
      name: route === "/" ? "For You" : "Hot deals",
      exact: true,
    });
    await tab.waitFor();
    await page.evaluate(() =>
      Array.from(document.querySelectorAll("div"))
        .filter(
          (e) =>
            getComputedStyle(e).overflowY === "auto" &&
            e.scrollHeight > e.clientHeight + 100,
        )
        .forEach((e) => {
          e.scrollTop = 1800;
        }),
    );
    await expect
      .poll(async () => (await tab.boundingBox())?.y ?? 1000)
      .toBeLessThan(80);
    await page.screenshot({
      path: testInfo.outputPath(
        `${route === "/" ? "home" : "offers"}-scrolled-390.png`,
      ),
    });
  }
});

test("search to wishlist, validated checkout, order persistence and cancellation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("textbox").first().fill("keyboard");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("1 products", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: /^Open Mini Wireless Keyboard/ })
    .click();
  await page
    .getByRole("button", { name: "Save to wishlist", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove from wishlist" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add to cart", exact: true }).click();
  await page.getByRole("button", { name: "Go to cart", exact: true }).click();
  await page.getByRole("button", { name: "Check Out(1)", exact: true }).click();
  await page
    .getByRole("button", { name: "Save local order", exact: true })
    .click();
  await expect(page.getByText(/Enter a valid phone number/)).toBeVisible();
  await page
    .getByRole("textbox", { name: "Phone number", exact: true })
    .fill("9800000000");
  await page
    .getByRole("textbox", { name: "Delivery address", exact: true })
    .fill("Main Street, Kathmandu, Nepal");
  await page
    .getByRole("textbox", { name: "Voucher code", exact: true })
    .fill("BAD");
  await page
    .getByRole("button", { name: "Apply voucher", exact: true })
    .click();
  await expect(page.getByText(/Code not recognized/)).toBeVisible();
  await page
    .getByRole("textbox", { name: "Voucher code", exact: true })
    .fill("GULMELI10");
  await page
    .getByRole("button", { name: "Apply voucher", exact: true })
    .click();
  await expect(
    page.getByText("Total: Rs. 1,610", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save local order", exact: true })
    .click();
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Total Rs. 1,610", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cancel local order", exact: true })
    .click();
  await page.reload();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Account", exact: true }).click();
  await page.getByRole("button", { name: "WishList", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^Open Mini Wireless Keyboard/ }),
  ).toBeVisible();
});

test("profile, seller following, reviews and preferences persist", async ({
  page,
}) => {
  await page.goto("/account");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Full name", exact: true })
    .fill("Arjun G. Gyawali");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Full name", exact: true }),
  ).toHaveValue("Arjun G. Gyawali");
  await page.goto("/feature?destination=Product%20details&id=home-0");
  await page.getByRole("button", { name: "Visit seller", exact: true }).click();
  await page.getByRole("button", { name: "Follow store", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Unfollow store", exact: true }),
  ).toBeVisible();
  await page.goto("/feature?destination=Product%20review&id=home-0");
  await page.getByRole("tab", { name: "Rate 4 stars", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Your review", exact: true })
    .fill("Comfortable shirt and a good fit.");
  await page.getByRole("button", { name: "Save review", exact: true }).click();
  await page.reload();
  await expect(
    page.getByText(/Comfortable shirt and a good fit/),
  ).toBeVisible();
});

test("all new destinations render at 320px; rewards and support drafts work", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 320, height: 844 });
  for (const destination of [
    "Wishlist",
    "Followed stores",
    "Voucher wallet",
    "Recently viewed history",
    "Orders list",
    "Order tracking",
    "Return history",
    "Product review",
    "Help Center",
    "Chats",
    "Gulmeli Fancy Stores Candy",
    "Gulmeli Fancy Stores Freebie",
    "Gulmeli Fancy Stores Land",
    "My Affiliates",
    "Pickup Points",
    "Payment Options",
    "Offer menu",
    "Visual search",
    "Digital goods",
    "Brandhouse",
    "Flash Sale",
    "Choice",
    "Rankings",
    "Promotion details",
    "Seller storefront",
  ]) {
    await page.goto(`/feature?destination=${encodeURIComponent(destination)}`);
    await expect(
      page.getByRole("button", { name: "Back", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/feature?destination=Gulmeli%20Fancy%20Stores%20Gems");
  await page
    .getByRole("button", { name: "Collect daily gems", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByText("10 Gulmeli Fancy Stores Gems", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Checked in today", exact: true }),
  ).toBeDisabled();
  await page.goto("/feature?destination=Chats");
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Please help me with sizing.");
  await page
    .getByRole("button", { name: "Save message draft", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByText("Please help me with sizing.", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
