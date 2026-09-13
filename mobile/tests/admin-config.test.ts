import { test } from "node:test";
import assert from "node:assert/strict";
import {
  configDiff,
  defaultConfig,
  mergeConfig,
  restoreConfig,
  setConfigValue,
  configValue,
} from "../src/admin/core/config.ts";
import {
  discardDraft,
  effectiveStatus,
  hasUnpublishedChanges,
  initialConfigState,
  isLive,
  publishDraft,
  restoreConfigState,
  rollbackTo,
  applyScheduledPublish,
  schedulePublish,
} from "../src/admin/core/publishing.ts";
import { CONFIG_GROUPS } from "../src/admin/core/config-schema.ts";

test("a stored document is merged over the defaults, ignoring wrong types", () => {
  const restored = restoreConfig({
    theme: {
      primaryColor: "#123456",
      buttonRadius: "not a number",
      unknownKey: 1,
    },
    features: { wishlist: false },
    branding: { companyName: "Test Store" },
  });

  assert.equal(restored.theme.primaryColor, "#123456");
  assert.equal(
    restored.theme.buttonRadius,
    defaultConfig.theme.buttonRadius,
    "bad types fall back",
  );
  assert.equal(restored.features.wishlist, false);
  assert.equal(
    restored.features.reviews,
    defaultConfig.features.reviews,
    "untouched keys survive",
  );
  assert.equal(restored.branding.companyName, "Test Store");
  assert.ok(!("unknownKey" in restored.theme), "unknown keys are dropped");
});

test("restoring junk still returns a usable configuration", () => {
  for (const value of [null, undefined, 42, "text", []]) {
    assert.equal(
      restoreConfig(value).theme.primaryColor,
      defaultConfig.theme.primaryColor,
    );
  }
});

test("dotted paths read and write without mutating the original", () => {
  const updated = setConfigValue(
    defaultConfig,
    "theme.primaryColor",
    "#000000",
  );
  assert.equal(configValue(updated, "theme.primaryColor"), "#000000");
  assert.equal(
    defaultConfig.theme.primaryColor,
    "#f85606",
    "the original document is untouched",
  );
  assert.equal(setConfigValue(defaultConfig, "nope.missing", 1), defaultConfig);
});

test("configDiff reports only the paths that changed", () => {
  const changed = setConfigValue(
    setConfigValue(defaultConfig, "theme.primaryColor", "#000000"),
    "features.blog",
    true,
  );
  assert.deepEqual(configDiff(defaultConfig, changed).sort(), [
    "features.blog",
    "theme.primaryColor",
  ]);
  assert.deepEqual(configDiff(defaultConfig, defaultConfig), []);
});

test("editing a draft never reaches the published document until it is published", () => {
  let state = initialConfigState();
  assert.equal(hasUnpublishedChanges(state), false);

  state = {
    ...state,
    draft: setConfigValue(state.draft, "theme.primaryColor", "#00aa00"),
  };
  assert.equal(hasUnpublishedChanges(state), true);
  assert.equal(
    state.published.theme.primaryColor,
    "#f85606",
    "customers still see the old colour",
  );

  state = publishDraft(state, "Owner");
  assert.equal(state.published.theme.primaryColor, "#00aa00");
  assert.equal(hasUnpublishedChanges(state), false);
  assert.equal(state.versions[0]?.actorName, "Owner");
  assert.deepEqual(state.versions[0]?.changedPaths, ["theme.primaryColor"]);
});

test("discarding a draft restores the published values", () => {
  let state = initialConfigState();
  state = {
    ...state,
    draft: setConfigValue(state.draft, "branding.companyName", "Oops"),
  };
  state = discardDraft(state);
  assert.equal(
    state.draft.branding.companyName,
    defaultConfig.branding.companyName,
  );
});

test("rollback loads an earlier version into the draft for review", () => {
  let state = initialConfigState();
  state = publishDraft(
    {
      ...state,
      draft: setConfigValue(state.draft, "theme.primaryColor", "#111111"),
    },
    "Owner",
  );
  const firstVersionId = state.versions[0]?.id;
  state = publishDraft(
    {
      ...state,
      draft: setConfigValue(state.draft, "theme.primaryColor", "#222222"),
    },
    "Owner",
  );
  assert.ok(firstVersionId);

  state = rollbackTo(state, firstVersionId);
  assert.equal(state.draft.theme.primaryColor, "#111111");
  assert.equal(
    state.published.theme.primaryColor,
    "#222222",
    "rollback is staged, not instant",
  );
  assert.equal(hasUnpublishedChanges(state), true);
});

test("a scheduled publish only fires once its time has passed", () => {
  const now = new Date("2026-05-01T10:00:00.000Z");
  let state = initialConfigState();
  state = {
    ...state,
    draft: setConfigValue(state.draft, "announcement.text", "Dashain sale"),
  };
  state = schedulePublish(state, "2026-05-01T12:00:00.000Z");

  assert.equal(
    applyScheduledPublish(state, now).published.announcement.text,
    "",
  );
  const later = applyScheduledPublish(
    state,
    new Date("2026-05-01T12:00:01.000Z"),
  );
  assert.equal(later.published.announcement.text, "Dashain sale");
  assert.equal(later.scheduledFor, null);
});

test("a persisted state survives a partial or corrupt payload", () => {
  const state = restoreConfigState({
    published: { theme: { primaryColor: "#abcdef" } },
  });
  assert.equal(state.published.theme.primaryColor, "#abcdef");
  assert.equal(
    state.draft.theme.primaryColor,
    "#abcdef",
    "the draft starts from the published copy",
  );
  assert.ok(state.versions.length >= 1);
  assert.ok(restoreConfigState("nonsense").versions.length >= 1);
});

test("scheduling decides what customers actually see", () => {
  const now = new Date("2026-05-10T00:00:00.000Z");
  assert.equal(isLive({ status: "published" }, now), true);
  assert.equal(isLive({ status: "draft" }, now), false);
  assert.equal(isLive({ status: "archived" }, now), false);
  assert.equal(
    isLive({ status: "published", publishAt: "2026-06-01T00:00:00.000Z" }, now),
    false,
  );
  assert.equal(
    isLive(
      { status: "published", unpublishAt: "2026-05-01T00:00:00.000Z" },
      now,
    ),
    false,
  );
  assert.equal(
    isLive({ status: "scheduled", publishAt: "2026-05-01T00:00:00.000Z" }, now),
    true,
    "a scheduled item goes live on its own",
  );

  assert.equal(
    effectiveStatus(
      { status: "published", publishAt: "2026-06-01T00:00:00.000Z" },
      now,
    ),
    "scheduled",
  );
  assert.equal(
    effectiveStatus(
      { status: "published", unpublishAt: "2026-05-01T00:00:00.000Z" },
      now,
    ),
    "archived",
  );
});

test("every configuration field points at a real path in the document", () => {
  const paths = CONFIG_GROUPS.flatMap((group) =>
    group.fields.map((field) => field.name),
  );
  assert.ok(paths.length > 100, "the configuration surface should be broad");
  for (const path of paths) {
    assert.notEqual(
      configValue(defaultConfig, path),
      undefined,
      `${path} is edited by the dashboard but missing from the configuration document`,
    );
  }
});

test("mergeConfig keeps arrays whole rather than merging element by element", () => {
  const merged = mergeConfig(defaultConfig, {
    seo: { keywords: ["one", "two"] },
  });
  assert.deepEqual(merged.seo.keywords, ["one", "two"]);
});
