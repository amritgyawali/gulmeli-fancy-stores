import { chromium } from "../../mobile/node_modules/playwright/index.mjs";
import { mkdirSync } from "node:fs";

mkdirSync("shots", { recursive: true });
const base = "http://localhost:4173/";
const routes = [
  ["home", "#/"],
  ["offers", "#/offers"],
  ["cart", "#/cart"],
  ["account", "#/account"],
  ["auth", "#/auth"],
  ["help", "#/help"],
  ["sell", "#/sell"],
  ["admin", "#/admin"],
  ["ops-center", "#/admin/ops"],
  ["ops-catalog", "#/admin/ops/catalog"],
  ["ops-orders", "#/admin/ops/orders"],
  ["ops-campaigns", "#/admin/ops/campaigns"],
  ["ops-vouchers", "#/admin/ops/vouchers"],
  ["ops-dex", "#/admin/ops/logistics/dex"],
  ["ops-3pl", "#/admin/ops/logistics/3pl"],
  ["ops-commissions", "#/admin/ops/finance/commissions"],
  ["ops-kyc", "#/admin/ops/sellers/kyc"],
  ["ops-mall", "#/admin/ops/sellers/mall"],
  ["ops-risk", "#/admin/ops/risk"],
];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`[${m.location().url}] ${m.text()}`);
});

for (const [name, hash] of routes) {
  await page.goto(base + hash, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `shots/${name}.png`, fullPage: true });
  console.log("shot", name);
}

// checkout + a product page (click into the first product from home)
await page.goto(base + "#/", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
const link = await page.$('a[href*="#/product/"]');
if (link) {
  const href = await link.getAttribute("href");
  await page.goto(base + href);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "shots/product.png", fullPage: true });
  console.log("shot product");
  await page.getByRole("button", { name: /add to cart/i }).first().click().catch(() => {});
  await page.waitForTimeout(800);
}
await page.goto(base + "#/checkout");
await page.waitForTimeout(1500);
await page.screenshot({ path: "shots/checkout.png", fullPage: true });
console.log("shot checkout");

// drawer smoke
await page.goto(base + "#/");
await page.waitForTimeout(2000);
await page.click("#cart-toggle-btn").catch(() => {});
await page.waitForTimeout(700);
await page.screenshot({ path: "shots/cart-drawer.png" });
console.log("shot drawer");

await browser.close();
const unique = [...new Set(errors)];
if (unique.length) {
  console.log("PAGE ERRORS:");
  for (const e of unique.slice(0, 12)) console.log(" -", e.slice(0, 240));
  process.exit(2);
}
console.log("no page errors");
