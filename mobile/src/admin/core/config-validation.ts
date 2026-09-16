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
