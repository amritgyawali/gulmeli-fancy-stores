import { useCallback, useMemo } from "react";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { useAdmin } from "@/admin/AdminProvider";
import type { FieldDef, Option } from "@/admin/core/fields";
import { getResource } from "@/admin/core/resources/index";
import { getPath } from "@/admin/core/query";
import { formatDateTime } from "@/admin/core/format";
import {
  ColorInput,
  FieldShell,
  ImageInput,
  ImageListInput,
  MultiPicker,
  Picker,
  RepeaterInput,
  SecretInput,
  TagInput,
  TextBox,
  Toggle,
  deriveSlug,
} from "./inputs";
import { A } from "./primitives";
import type { AdminTheme } from "./theme";

/** Reads relation options straight from the store, so pickers never go stale. */
export function useRelationOptions(resourceKey: string | undefined): Option[] {
  const { store, revision } = useAdmin();
  return useMemo(() => {
    if (!resourceKey) return [];
    const resource = getResource(resourceKey);
    if (!resource) return [];
    return store
      .all(resourceKey)
      .map((record) => ({
        value: record.id,
        label: String(getPath(record, resource.labelField) ?? record.id),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, resourceKey, revision]);
}

/** Uploads a picked photo to Cloudinary and adds it to the media library. */
export function useImagePicker() {
  const { store, write, notify, live } = useAdmin();
  return useCallback(async (): Promise<string | null> => {
    try {
      if (Platform.OS !== "web") {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          notify("Photo access was declined, so nothing was added.", "danger");
          return null;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        base64: live,
      });
      const asset = result.canceled ? null : result.assets[0];
      if (!asset?.uri) return null;
      let url = asset.uri;
      let publicId: string | null = null;
      let bytes = asset.fileSize ?? 0;
      if (live) {
        const { uploadMediaFromUri } = await import("@/services/cloudinary");
        const uploaded = await uploadMediaFromUri(asset.uri, {
          folder: "gulmeli/media",
        });
        url = uploaded.url;
        publicId = uploaded.publicId;
        bytes = uploaded.bytes || bytes;
      }
      store.create(
        "media",
        {
          name:
            asset.fileName ?? `Upload ${new Date().toISOString().slice(0, 19)}`,
          folder: "Uploads",
          kind: "image",
          url,
          publicId,
          alt: "",
          tags: [],
          width: asset.width ?? 0,
          height: asset.height ?? 0,
          sizeKb: bytes ? Math.round(bytes / 1024) : 0,
          note: "",
        },
        write,
      );
      return url;
    } catch (error) {
      notify(
        error instanceof Error && /cloudinary|media|sign in/i.test(error.message)
          ? error.message
          : "The photo could not be saved. Please try again.",
        "danger",
      );
      return null;
    }
  }, [live, notify, store, write]);
}

export interface FieldRendererProps {
  field: FieldDef;
  value: unknown;
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  theme: AdminTheme;
  error?: string;
  /** Renders without the surrounding label; used inside repeaters. */
  bare?: boolean;
}

export function FieldControl({
  field,
  value,
  values,
  onChange,
  theme,
}: FieldRendererProps) {
  const relationOptions = useRelationOptions(
    field.type === "relation" ? field.resource : undefined,
  );
  const pickImage = useImagePicker();
  const set = (next: unknown) => onChange(field.name, next);

  if (field.readOnly || field.type === "readonly") {
    const display =
      value === null || value === undefined || value === ""
        ? "—"
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
    return (
      <A size={13} color={theme.muted}>
        {/^\d{4}-\d{2}-\d{2}T/.test(display)
          ? formatDateTime(display)
          : display}
      </A>
    );
  }

  switch (field.type) {
    case "boolean":
      return (
        <Toggle
          value={Boolean(value)}
          onChange={set}
          label={field.label}
          theme={theme}
        />
      );
    case "select":
      return (
        <Picker
          value={value === null || value === undefined ? null : String(value)}
          options={field.options ?? []}
          onChange={set}
          theme={theme}
          label={field.label}
          allowClear={!field.required}
          searchable={(field.options?.length ?? 0) > 8}
        />
      );
    case "multiselect":
      return (
        <MultiPicker
          values={Array.isArray(value) ? value.map(String) : []}
          options={field.options ?? []}
          onChange={set}
          theme={theme}
          label={field.label}
          searchable={(field.options?.length ?? 0) > 8}
        />
      );
    case "relation":
      return field.multiple ? (
        <MultiPicker
          values={Array.isArray(value) ? value.map(String) : []}
          options={relationOptions}
          onChange={set}
          theme={theme}
          label={field.label}
          searchable
        />
      ) : (
        <Picker
          value={
            value === null || value === undefined || value === ""
              ? null
              : String(value)
          }
          options={relationOptions}
          onChange={set}
          theme={theme}
          label={field.label}
          searchable
          allowClear={!field.required}
        />
      );
    case "tags":
      return (
        <TagInput
          values={Array.isArray(value) ? value.map(String) : []}
          onChange={set}
          theme={theme}
          label={field.label}
        />
      );
    case "color":
      return (
        <ColorInput
          value={String(value ?? "")}
          onChange={set}
          theme={theme}
          label={field.label}
        />
      );
    case "image":
      return (
        <ImageInput
          value={String(value ?? "")}
          onChange={set}
          theme={theme}
          label={field.label}
          onPick={async () => {
            const uri = await pickImage();
            if (uri) set(uri);
          }}
        />
      );
    case "images":
      return (
        <ImageListInput
          values={Array.isArray(value) ? value.map(String) : []}
          onChange={set}
          theme={theme}
          onPick={async () => {
            const uri = await pickImage();
            if (uri)
              set([...(Array.isArray(value) ? value.map(String) : []), uri]);
          }}
        />
      );
    case "secret":
      return (
        <SecretInput
          value={String(value ?? "")}
          onChange={set}
          theme={theme}
          label={field.label}
        />
      );
    case "json":
      return (
        <TextBox
          value={
            typeof value === "string"
              ? value
              : JSON.stringify(value ?? {}, null, 2)
          }
          onChange={(next) => {
            try {
              set(JSON.parse(next));
            } catch {
              set(next);
            }
          }}
          multiline
          rows={6}
          theme={theme}
          label={field.label}
        />
      );
    case "repeater":
      return (
        <RepeaterInput
          fields={field.fields ?? []}
          values={
            Array.isArray(value) ? (value as Record<string, unknown>[]) : []
          }
          onChange={set}
          theme={theme}
          renderField={(child, childValue, childChange) => (
            <FieldControl
              field={child}
              value={childValue}
              values={values}
              theme={theme}
              onChange={(_name, next) => childChange(next)}
            />
          )}
        />
      );
    case "number":
    case "currency":
    case "percent":
      return (
        <TextBox
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(next) => set(next.replace(/[^0-9.\-]/g, ""))}
          keyboard="numeric"
          theme={theme}
          label={field.label}
          placeholder={field.placeholder}
        />
      );
    case "textarea":
    case "richtext":
    case "code":
      return (
        <TextBox
          value={String(value ?? "")}
          onChange={set}
          multiline
          rows={field.rows ?? 5}
          theme={theme}
          label={field.label}
          placeholder={field.placeholder}
        />
      );
    case "slug":
      return (
        <TextBox
          value={String(value ?? "")}
          onChange={set}
          theme={theme}
          label={field.label}
          placeholder={
            field.derivedFrom
              ? deriveSlug(values[field.derivedFrom], "") || field.placeholder
              : field.placeholder
          }
        />
      );
    case "email":
    case "phone":
    case "url":
      return (
        <TextBox
          value={String(value ?? "")}
          onChange={set}
          keyboard={
            field.type === "email"
              ? "email-address"
              : field.type === "phone"
                ? "phone-pad"
                : "url"
          }
          theme={theme}
          label={field.label}
          placeholder={field.placeholder}
        />
      );
    case "date":
      return (
        <TextBox
          value={String(value ?? "")}
          onChange={set}
          theme={theme}
          label={field.label}
          placeholder={field.placeholder ?? "YYYY-MM-DD"}
        />
      );
    case "datetime":
      return (
        <TextBox
          value={String(value ?? "")}
          onChange={set}
          theme={theme}
          label={field.label}
          placeholder={field.placeholder ?? "YYYY-MM-DDTHH:MM"}
        />
      );
    default:
      return (
        <TextBox
          value={String(value ?? "")}
          onChange={set}
          theme={theme}
          label={field.label}
          placeholder={field.placeholder}
        />
      );
  }
}

export function FieldRenderer(props: FieldRendererProps) {
  const { field, error, theme, bare } = props;
  if (field.showIf && !field.showIf(props.values)) return null;
  if (bare) return <FieldControl {...props} />;
  return (
    <FieldShell
      label={field.type === "boolean" ? undefined : field.label}
      help={field.help}
      error={error}
      required={field.required}
      theme={theme}
    >
      <FieldControl {...props} />
    </FieldShell>
  );
}
