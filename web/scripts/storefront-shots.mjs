// Screenshots of the customer journey at phone and desktop widths, plus a
// check for runtime errors. Run against `vite preview` (port 4173):
//   node scripts/storefront-shots.mjs [outDir]
import { chromium } from "../../mobile/node_modules/playwright/index.mjs";
import { mkdirSync } from "node:fs";

const out = process.argv[2] || "shots/storefront";
mkdirSync(out, { recursive: true });
const base = "http://localhost:4173/#";
const errors = [];

async function journey(name, viewport, isMobile) {
  /* Playwright does not emulate the hover/pointer media features. A phone
     reports no hover and a coarse pointer, and the layout depends on it, so
     the phone run tells Blink so directly (1 = none, 2 = coarse). */
  const browser = await chromium.launch({
    args: isMobile
      ? [
          "--blink-settings=primaryHoverType=1,availableHoverTypes=1,primaryPointerType=2,availablePointerTypes=2",
        ]
      : [],
  });
  const page = await browser.newPage({ viewport, isMobile, hasTouch: isMobile });
  page.on("pageerror", (e) => errors.push(`[${name}] ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`[${name}] ${m.text()}`);
  });
  const shot = async (label, full = true) => {
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}/${name}-${label}.png`, fullPage: full });
    console.log("shot", name, label);
  };

  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await shot("home");

  const href = await page.getAttribute('a[href*="#/product/"]', "href");
  await page.goto(`http://localhost:4173/${href}`);
  await page.waitForTimeout(2000);
  await shot("product");

  /* Phones use the fixed bar; the in-page buttons are desktop only. */
  const addButtons = page.getByRole("button", { name: /^Add to cart/ });
  await (isMobile ? addButtons.last() : addButtons.first()).click();
  await page.waitForTimeout(400);
  await shot("product-added", false);

  await page.goto(`${base}/search?q=watch`);
  await page.waitForTimeout(1500);
  await shot("search");

  await page.goto(`${base}/cart`);
  await page.waitForTimeout(1500);
  await shot("cart");

  await page.goto(`${base}/`);
  await page.waitForTimeout(1500);
  await page.locator("[data-cart-target]").first().click();
  await shot("drawer", false);

  await page.goto(`${base}/wishlist`);
  await page.waitForTimeout(1200);
  await shot("wishlist");

  await page.goto(`${base}/checkout`);
  await page.waitForTimeout(1500);
  await shot("checkout");
  await browser.close();
}

await journey("desktop", { width: 1440, height: 900 }, false);
await journey("phone", { width: 390, height: 844 }, true);
console.log(errors.length ? `ERRORS:\n${errors.join("\n")}` : "no runtime errors");
