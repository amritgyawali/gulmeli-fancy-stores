import { useMemo, useState } from "react";
import { View } from "react-native";
import { Panel } from "@/admin/ui/Shell";
import { A, Btn, Col, Row, Tabs } from "@/admin/ui/primitives";
import { FieldRenderer } from "@/admin/ui/FieldRenderer";
import { TextBox } from "@/admin/ui/inputs";
import { useLayout } from "@/admin/ui/theme";
import { useAdmin } from "@/admin/AdminProvider";
import { configValue, setConfigValue } from "@/admin/core/config";
import { validate, type FieldDef } from "@/admin/core/fields";
import { sectionsOf } from "@/admin/core/resource";
import type { ConfigGroup } from "@/admin/core/config-schema";

function widthFor(field: FieldDef, columns: number): string {
  if (columns < 2) return "100%";
  if (field.width === "third") return columns >= 3 ? "33.33%" : "50%";
  if (field.width === "half") return "50%";
  return "100%";
}

/**
 * Renders configuration groups straight from the schema, writing into the
 * draft document. Nothing here reaches customers until it is published.
 */
export function ConfigEditor({ groups }: { groups: ConfigGroup[] }) {
  const { theme, draft, setDraft, allowed, notify } = useAdmin();
  const layout = useLayout();
  const [groupKey, setGroupKey] = useState(groups[0]?.key ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const group = groups.find((entry) => entry.key === groupKey) ?? groups[0];

  const sections = useMemo(() => {
    if (!group) return [];
    return sectionsOf({
      key: group.key,
      label: group.label,
      singular: group.label,
      icon: group.icon,
      module: group.module,
      labelField: "label",
      fields: group.fields,
      columns: [],
      searchFields: [],
    });
  }, [group]);

  if (!group) return null;

  const editable = allowed(group.module, "edit");

  const change = (name: string, value: unknown) => {
    if (!editable) {
      notify("Your role cannot change this setting.", "danger");
      return;
    }
    const field = group.fields.find((entry) => entry.name === name);
    if (field) {
      const problems = validate([{ ...field, name: "value" }], { value });
      setErrors((current) => {
        const next = { ...current };
        if (problems.length && problems[0]) next[name] = problems[0].message;
        else delete next[name];
        return next;
      });
    }
    setDraft(setConfigValue(draft, name, value));
  };

  return (
    <>
      {groups.length > 1 && (
        <Tabs
          tabs={groups.map((entry) => ({ key: entry.key, label: entry.label }))}
          active={group.key}
          onChange={setGroupKey}
          theme={theme}
        />
      )}
      {sections.map((section) => (
        <Panel
          key={section.name}
          title={section.name === "General" ? group.label : section.name}
          subtitle={section.name === "General" ? group.description : undefined}
        >
          {!editable && (
            <A size={11.5} color={theme.warning}>
              Your role can view these settings but not change them.
            </A>
          )}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginHorizontal: -5,
            }}
          >
            {section.fields.map((field) => (
              <View
                key={field.name}
                style={{
                  width: widthFor(field, layout.columns) as never,
                  paddingHorizontal: 5,
                  paddingBottom: 12,
                }}
              >
                <FieldRenderer
                  field={{ ...field, readOnly: field.readOnly || !editable }}
                  value={configValue(draft, field.name)}
                  values={{}}
                  onChange={change}
                  theme={theme}
                  error={errors[field.name]}
                />
              </View>
            ))}
          </View>
        </Panel>
      ))}
    </>
  );
}

/** Publish, discard, schedule and roll back the storefront configuration. */
export function PublishingPanel() {
  const {
    theme,
    configState,
    dirty,
    publish,
    discardDraft,
    scheduleFor,
    restoreVersion,
    allowed,
  } = useAdmin();
  const [when, setWhen] = useState("");
  const canPublish =
    allowed("appearance", "publish") || allowed("settings", "publish");

  return (
    <Panel
      title="Preview & publishing"
      subtitle={
        dirty
          ? "These changes are a draft. Customers still see the published version."
          : `Everything is published. Last published ${new Date(configState.publishedAt).toLocaleString()}.`
      }
    >
      <Row gap={8} wrap>
        <Btn
          title="Publish now"
          icon="cloud-arrow-up"
          tone="primary"
          small
          theme={theme}
          disabled={!dirty || !canPublish}
          onPress={() => void publish()}
        />
        <Btn
          title="Discard draft"
          icon="rotate-left"
          small
          theme={theme}
          disabled={!dirty}
          onPress={discardDraft}
        />
      </Row>

      <Col gap={6}>
        <A size={11.5} weight="600" color={theme.muted}>
          Schedule the publication instead
        </A>
        <Row gap={8}>
          <View style={{ flex: 1 }}>
            <TextBox
              value={when}
              onChange={setWhen}
              placeholder="YYYY-MM-DDTHH:MM"
              theme={theme}
              label="Publish at"
            />
          </View>
          <Btn
            title="Schedule"
            icon="clock"
            small
            theme={theme}
            disabled={!dirty || !when || !canPublish}
            onPress={() => scheduleFor(new Date(when).toISOString())}
          />
        </Row>
        {!!configState.scheduledFor && (
          <A size={11.5} color={theme.info}>
            {`Scheduled to publish at ${new Date(configState.scheduledFor).toLocaleString()}.`}
          </A>
        )}
      </Col>

      <Col gap={8}>
        <A size={11.5} weight="600" color={theme.muted}>
          Version history
        </A>
        {configState.versions.slice(0, 8).map((version) => (
          <Row key={version.id} justify="space-between" gap={8}>
            <View style={{ flex: 1 }}>
              <A size={12}>{version.label}</A>
              <A size={11} color={theme.muted}>
                {`${version.actorName} · ${new Date(version.createdAt).toLocaleString()}`}
              </A>
              {!!version.changedPaths.length && (
                <A size={10.5} color={theme.muted} numberOfLines={1}>
                  {version.changedPaths.slice(0, 5).join(", ")}
                </A>
              )}
            </View>
            <Btn
              title="Restore"
              icon="clock-rotate-left"
              small
              theme={theme}
              disabled={!canPublish}
              onPress={() => restoreVersion(version.id)}
            />
          </Row>
        ))}
      </Col>
    </Panel>
  );
}
