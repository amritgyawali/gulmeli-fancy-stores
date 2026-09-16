import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultConfig, restoreConfig } from "../src/admin/core/config.ts";
import { contrast, resolveAppearance } from "../src/admin/core/appearance.ts";
import {
  safeStoreLink,
  sectionVisible,
  plainText,
} from "../src/admin/core/storefront-content.ts";

import { configErrors } from "../src/admin/core/config-validation.ts";
test("published colours produce readable buttons, including white/yellow/black brands", () => {
  for (const primaryColor of [
    "#ffffff",
    "#ffff00",
    "#000000",
    "#f85606",
    "#006644",
  ]) {
    const theme = resolveAppearance(restoreConfig({ theme: { primaryColor } }));
    assert.equal(theme.buttonColor, primaryColor);
    assert.ok(contrast(theme.buttonColor, theme.buttonTextColor) >= 4.5);
    assert.ok(contrast(theme.surface, theme.primaryText) >= 4.5);
  }
});
test("device dark preference and explicit light settings resolve independently", () => {
  assert.equal(resolveAppearance(defaultConfig, true).dark, false);
  const config = restoreConfig({ theme: { colorScheme: "system" } });
  assert.equal(resolveAppearance(config, true).dark, true);
  assert.equal(resolveAppearance(config, false).dark, false);
  const theme = resolveAppearance(
    restoreConfig({
      theme: {
        colorScheme: "dark",
        cardRadius: 900,
        primaryColor: "bad",
        baseFontSize: -4,
      },
    }),
  );
  assert.equal(theme.cardRadius, 40);
  assert.equal(theme.baseFontSize, 12);
  assert.equal(theme.primary, "#f85606");
  assert.ok(contrast(theme.surface, theme.text) >= 4.5);
});
test("scheduled, disabled and device-specific sections stay hidden", () => {
  const now = Date.parse("2026-09-16T12:00:00Z");
  for (const record of [
    { enabled: false },
    { deletedAt: "today" },
    { showOnMobile: false },
    { startsAt: "2026-09-17" },
    { endsAt: "2026-09-15" },
  ])
    assert.equal(sectionVisible({ id: "x", ...record }, true, now), false);
  assert.equal(
    sectionVisible({ id: "x", showOnMobile: false }, false, now),
    true,
  );
});
test("store links reject executable URLs; native text never renders HTML scripts", () => {
  for (const link of [
    "javascript:alert(1)",
    "//outside.example",
    "/\\outside",
    "data:text/html,x",
    "http://insecure.test",
  ])
    assert.equal(safeStoreLink(link), null);
  assert.equal(safeStoreLink("/offers"), "/offers");
  assert.equal(safeStoreLink("https://example.com"), "https://example.com");
  assert.equal(plainText("<script>bad()</script><p>Hello</p>"), "Hello");
});
test("publishing accepts defaults and rejects invalid appearance inputs", () => {
  assert.deepEqual(configErrors(defaultConfig), []);
  const errors = configErrors(
    restoreConfig({ theme: { primaryColor: "wrong", cardRadius: 200 } }),
  );
  assert.ok(errors.some((e) => e.field === "theme.primaryColor"));
  assert.ok(errors.some((e) => e.field === "theme.cardRadius"));
});
