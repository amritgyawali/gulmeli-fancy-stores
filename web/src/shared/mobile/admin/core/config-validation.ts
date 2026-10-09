// Copied from mobile/src/admin/core/config-validation.ts by web/scripts/sync-shared.mjs. Edit the source, not this file.
import { CONFIG_GROUPS } from "./config-schema.ts";
import { configValue, type StorefrontConfig } from "./config.ts";
import { validate } from "./fields.ts";
export function configErrors(config: StorefrontConfig) {
  const fields = CONFIG_GROUPS.flatMap((group) => group.fields);
  return validate(
    fields,
    Object.fromEntries(
      fields.map((field) => [field.name, configValue(config, field.name)]),
    ),
  );
}
