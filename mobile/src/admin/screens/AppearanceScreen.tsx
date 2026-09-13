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

/** A small, honest mock of the storefront using the draft values. */
function StorefrontPreview({
  config,
  device,
}: {
  config: StorefrontConfig;
  device: "mobile" | "desktop";
}) {
  const dark = config.theme.colorScheme === "dark" && config.darkTheme.enabled;
  const background = dark
    ? config.darkTheme.backgroundColor
    : config.theme.backgroundColor;
  const surface = dark
    ? config.darkTheme.surfaceColor
    : config.theme.surfaceColor;
  const text = dark ? config.darkTheme.textColor : config.theme.textColor;
  const muted = dark
    ? config.darkTheme.mutedTextColor
    : config.theme.mutedTextColor;
  const border = dark ? config.darkTheme.borderColor : config.theme.borderColor;
  const width = device === "mobile" ? 300 : 520;

  return (
    <View
      style={{
        width,
        maxWidth: "100%",
        alignSelf: "center",
        borderRadius: 18,
        borderWidth: 8,
        borderColor: "#1f2124",
        overflow: "hidden",
        backgroundColor: background,
      }}
    >
      {config.announcement.enabled && (
        <View
          style={{
            backgroundColor: config.announcement.backgroundColor,
            padding: 6,
          }}
        >
          <A size={10} color={config.announcement.textColor} numberOfLines={1}>
            {config.announcement.text || "Announcement bar"}
          </A>
        </View>
      )}
      <View
        style={{
          backgroundColor: config.header.backgroundColor,
          padding: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        {config.header.showLogo && (
          <A
            size={13}
            weight="700"
            color={config.header.textColor}
            numberOfLines={1}
            style={{ flex: 1 }}
          >
            {config.branding.companyName}
          </A>
        )}
        {config.header.showSearch && (
          <Icon
            name="magnifying-glass"
            size={12}
            color={config.header.textColor}
          />
        )}
        {config.header.showWishlist && (
          <Icon name="heart" size={12} color={config.header.textColor} />
        )}
        {config.header.showCart && (
          <Icon
            name="cart-shopping"
            size={12}
            color={config.header.textColor}
          />
        )}
        {config.header.showProfile && (
          <Icon name="user" size={12} color={config.header.textColor} />
        )}
      </View>

      <View
        style={{ padding: config.theme.spacing, gap: config.theme.spacing }}
      >
        <View
          style={{
            height: 84,
            borderRadius: config.theme.cardRadius,
            backgroundColor: config.theme.primaryColor,
            justifyContent: "flex-end",
            padding: 10,
          }}
        >
          <A
            size={config.theme.baseFontSize + 2}
            weight={config.theme.headingWeight}
            color="#ffffff"
          >
            {config.text.homeHeading || "Shop now"}
          </A>
        </View>

        <Row gap={8}>
          {[0, 1].map((index) => (
            <View
              key={index}
              style={{
                flex: 1,
                backgroundColor: surface,
                borderRadius: config.theme.cardRadius,
                borderWidth: config.theme.borderWidth,
                borderColor: border,
                padding: 8,
                gap: 6,
              }}
            >
              <View
                style={{
                  height: 52,
                  borderRadius: 6,
                  backgroundColor: background,
                }}
              />
              <A
                size={config.theme.baseFontSize - 1}
                color={text}
                numberOfLines={2}
              >
                Sample product name
              </A>
              <A
                size={config.theme.baseFontSize}
                weight="700"
                color={config.theme.secondaryColor}
              >
                {`${config.localisation.currencySymbol} 499`}
              </A>
              <A size={config.theme.baseFontSize - 3} color={muted}>
                {config.text.lowStock}
              </A>
              <View
                style={{
                  backgroundColor: config.theme.buttonColor,
                  borderRadius: config.theme.buttonRadius,
                  paddingVertical: 6,
                  alignItems: "center",
                }}
              >
                <A
                  size={config.theme.baseFontSize - 2}
                  weight="700"
                  color={config.theme.buttonTextColor}
                >
                  {config.text.addToCart}
                </A>
              </View>
            </View>
          ))}
        </Row>

        {config.footer.enabled && (
          <View
            style={{
              backgroundColor: config.footer.backgroundColor,
              borderRadius: config.theme.cardRadius,
              padding: 10,
              gap: 4,
            }}
          >
            <A size={10} weight="700" color={config.footer.textColor}>
              {config.branding.companyName}
            </A>
            {config.footer.showNewsletter && (
              <A size={9} color={config.footer.textColor}>
                {config.footer.newsletterHeading}
              </A>
            )}
            <A size={9} color={config.footer.textColor}>
              {config.footer.copyright ||
                `© ${new Date().getFullYear()} ${config.branding.legalName}`}
            </A>
          </View>
        )}
      </View>
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
            "Logos feed the app icon, splash screen, invoices, emails and social sharing.",
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
