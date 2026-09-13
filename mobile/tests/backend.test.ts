import { test } from "node:test";
import assert from "node:assert/strict";
import { readBackendConfig } from "../src/services/backend-config.ts";
import {
  mergeCustomerCart,
  restoreCustomerCart,
} from "../src/store/customer-cart.ts";

test("configured live mode never silently falls back to local orders", () => {
  const config = readBackendConfig({ mode: "supabase" });
  assert.equal(config.live, true);
  assert.match(config.error, /incomplete/);
});
test("rejects secret keys and malformed project URLs", () => {
  assert.match(
    readBackendConfig({
      mode: "supabase",
      url: "https://demo.supabase.co",
      key: "sb_secret_no",
    }).error,
    /never a secret/,
  );
  assert.match(
    readBackendConfig({
      mode: "supabase",
      url: "https://demo.supabase.co/rest/v1",
      key: "sb_publishable_ok",
    }).error,
    /without an API path/,
  );
  assert.equal(
    readBackendConfig({
      mode: "supabase",
      url: "https://demo.supabase.co",
      key: "sb_publishable_ok",
    }).error,
    "",
  );
});

test("restores customer cart safely and combines guest items without duplicate lines", () => {
  const saved = [{ productId: "a", quantity: 2, selected: false }];
  assert.deepEqual(restoreCustomerCart(saved), saved);
  assert.deepEqual(restoreCustomerCart([{ ...saved[0], quantity: -1 }]), []);
  assert.deepEqual(restoreCustomerCart([saved[0], saved[0]]), []);
  assert.deepEqual(
    mergeCustomerCart(saved, [{ productId: "a", quantity: 1, selected: true }]),
    [{ productId: "a", quantity: 3, selected: true }],
  );
});
