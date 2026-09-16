import HomeScreen from "@/screens/HomeScreen";
import { StorefrontPreviewProvider } from "@/store/StorefrontProvider";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { AdminShell, Panel } from "@/admin/ui/Shell";
import { A, Col, Icon, Pill, Row, Tabs } from "@/admin/ui/primitives";
import { ConfigEditor, PublishingPanel } from "./ConfigEditor";
import { useAdmin } from "@/admin/AdminProvider";
import { useLayout } from "@/admin/ui/theme";
import { CONFIG_GROUPS, THEME_PRESETS } from "@/admin/core/config-schema";
import { setConfigValue, type StorefrontConfig } from "@/admin/core/config";
import { useFormat } from "@/admin/ui/useFormat";

const APPEARANCE_GROUPS = CONFIG_GROUPS.filter((group) =>
  ["theme", "branding", "chrome"].includes(group.key),
);

function StorefrontPreview({
  config,
  device,
}: {
  config: StorefrontConfig;
  device: "mobile" | "desktop";
}) {
  const width = device === "mobile" ? 340 : 600;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width,
        maxWidth: "100%",
        height: 580,
        alignSelf: "center",
        borderRadius: 24,
        borderWidth: 6,
        borderColor: "#25262a",
        overflow: "hidden",
      }}
    >
      <StorefrontPreviewProvider config={config}>
        <HomeScreen previewWidth={width} />
      </StorefrontPreviewProvider>
    </View>
  );
}

export function AppearanceScreen() {
  const { theme, draft, published, setDraft, dirty, allowed } = useAdmin();
  const layout = useLayout();
  const format = useFormat();
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [source, setSource] = useState<"draft" | "published">("draft");

  const applyPreset = (values: Record<string, string | number>) => {
    let next = draft;
    for (const [path, value] of Object.entries(values))
      next = setConfigValue(next, path, value);
    setDraft(next);
  };

  return (
    <AdminShell
      title="Appearance"
      subtitle="Colours, typography, logos, header, footer and the announcement bar — for the app and the website"
      actions={
        dirty ? (
          <Pill label="Draft changes" color={theme.warning} theme={theme} />
        ) : undefined
      }
    >
      <Panel
        title="Theme presets"
        subtitle="A starting point. Every value can still be changed below."
      >
        <Row gap={8} wrap>
          {THEME_PRESETS.map((preset) => (
            <Pressable
              key={preset.name}
              accessibilityRole="button"
              accessibilityLabel={`Apply the ${preset.name} preset`}
              disabled={!allowed("appearance", "edit")}
              onPress={() => applyPreset(preset.values)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: theme.radius,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: pressed ? theme.background : theme.surface,
              })}
            >
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  backgroundColor: String(
                    preset.values["theme.primaryColor"] ?? theme.primary,
                  ),
                }}
              />
              <A size={12} weight="600">
                {preset.name}
              </A>
            </Pressable>
          ))}
        </Row>
      </Panel>

      <Panel
        title="Preview"
        subtitle={
          source === "draft"
            ? "How the storefront looks with your unpublished changes"
            : "What customers see right now"
        }
        actions={
          <Row gap={6}>
            <Tabs
              tabs={[
                { key: "mobile", label: "Mobile" },
                { key: "desktop", label: "Desktop" },
              ]}
              active={device}
              onChange={(next) => setDevice(next as "mobile" | "desktop")}
              theme={theme}
            />
          </Row>
        }
      >
        <Tabs
          tabs={[
            { key: "draft", label: "Draft" },
            { key: "published", label: "Published" },
          ]}
          active={source}
          onChange={(next) => setSource(next as "draft" | "published")}
          theme={theme}
        />
        <StorefrontPreview
          config={source === "draft" ? draft : published}
          device={device}
        />
        <A size={11} color={theme.muted} style={{ textAlign: "center" }}>
          {`Currency shown as ${format.money(499)} · ${layout.breakpoint} layout`}
        </A>
      </Panel>

      <PublishingPanel />

      <ConfigEditor groups={APPEARANCE_GROUPS} />

      <Panel title="Where these values are used">
        <Col gap={5}>
          {[
            "Colours and typography drive both the customer app and the website.",
            "Store logos and favicon update live. Launcher icon and splash changes require a new native build.",
            "Header and footer switches decide which controls customers actually see.",
            "The announcement bar respects its own start and end dates.",
          ].map((line) => (
            <Row key={line} gap={8} align="flex-start">
              <Icon name="circle-check" size={11} color={theme.success} />
              <A size={12} color={theme.muted} style={{ flex: 1 }}>
                {line}
              </A>
            </Row>
          ))}
        </Col>
      </Panel>
    </AdminShell>
  );
}
