import { useMemo, useState } from "react";
import { View } from "react-native";
import { AdminShell, Panel } from "@/admin/ui/Shell";
import {
  A,
  Btn,
  Col,
  EmptyState,
  Icon,
  IconBtn,
  Pill,
  Row,
  Tabs,
} from "@/admin/ui/primitives";
import { Picker, TextBox, Toggle } from "@/admin/ui/inputs";
import { useAdmin } from "@/admin/AdminProvider";
import { useLayout } from "@/admin/ui/theme";
import { useFormat } from "@/admin/ui/useFormat";
import { getResource } from "@/admin/core/resources/index";
import { isLive } from "@/admin/core/publishing";
import { humanise } from "@/admin/core/format";
import { go } from "@/admin/navigate";
import type { AdminRecord } from "@/admin/core/types";

const SECTION_TYPES =
  getResource("homepage_sections")?.fields.find(
    (field) => field.name === "type",
  )?.options ?? [];

const SECTION_ICONS: Record<string, string> = {
  hero_slider: "images",
  banner: "image",
  promo_banner: "bullhorn",
  categories: "table-cells",
  featured_products: "star",
  best_sellers: "fire",
  new_arrivals: "sparkles",
  flash_sale: "bolt",
  collection: "layer-group",
  testimonials: "quote-left",
  brands: "award",
  video: "video",
  gallery: "photo-film",
  newsletter: "envelope",
  blog: "newspaper",
  social: "share-nodes",
  text: "align-left",
  html: "code",
};

function SectionPreview({
  section,
  theme,
}: {
  section: AdminRecord;
  theme: ReturnType<typeof useAdmin>["theme"];
}) {
  const type = String(section.type);
  const live = isLive({
    status: section.enabled ? "published" : "draft",
    publishAt: String(section.startsAt ?? "") || null,
    unpublishAt: String(section.endsAt ?? "") || null,
  });
  return (
    <View
      style={{
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: live ? "solid" : "dashed",
        borderColor: live ? theme.border : theme.warning,
        backgroundColor: live ? theme.raised : `${theme.warning}0d`,
        padding: 10,
        gap: 6,
        opacity: live ? 1 : 0.75,
      }}
    >
      <Row gap={8}>
        <Icon
          name={SECTION_ICONS[type] ?? "square"}
          size={12}
          color={theme.muted}
        />
        <A size={12} weight="600" numberOfLines={1} style={{ flex: 1 }}>
          {String(section.title)}
        </A>
        <Pill label={humanise(type)} theme={theme} small color={theme.muted} />
      </Row>
      <View
        style={{
          height: type === "hero_slider" ? 40 : 26,
          borderRadius: 5,
          backgroundColor: theme.background,
        }}
      />
    </View>
  );
}

export function HomepageBuilderScreen() {
  const { theme, store, write, allowed, notify, revision, published } =
    useAdmin();
  const layout = useLayout();
  const format = useFormat();
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [newType, setNewType] = useState<string | null>("banner");
  const [expanded, setExpanded] = useState<string | null>(null);

  const sections = useMemo(
    () =>
      store
        .all("homepage_sections")
        .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, revision],
  );

  const visible = sections.filter((section) =>
    device === "mobile"
      ? section.showOnMobile !== false
      : section.showOnDesktop !== false,
  );

  const canEdit = allowed("content", "edit");

  const patch = (id: string, values: Record<string, unknown>) =>
    store.update("homepage_sections", id, values, write);

  const addSection = () => {
    if (!newType) return;
    const created = store.create(
      "homepage_sections",
      {
        title: humanise(newType),
        type: newType,
        subtitle: "",
        sortOrder: sections.length,
        collectionId: null,
        categoryIds: [],
        productIds: [],
        bannerIds: [],
        itemLimit: 8,
        layout: "grid",
        body: "",
        html: "",
        videoUrl: "",
        ctaLabel: "",
        ctaLink: "",
        enabled: true,
        showOnMobile: true,
        showOnDesktop: true,
        backgroundColor: "",
        startsAt: null,
        endsAt: null,
      },
      write,
    );
    setExpanded(created.id);
    notify("Section added. It is visible as soon as you enable it.", "success");
  };

  return (
    <AdminShell
      title="Homepage Builder"
      subtitle="Reorder, hide, schedule and configure every block on the storefront home screen"
      actions={
        <Btn
          title="Banners"
          icon="image"
          small
          theme={theme}
          onPress={() => go("/admin/r/banners")}
        />
      }
    >
      <Row gap={8} wrap justify="space-between">
        <Tabs
          tabs={[
            {
              key: "mobile",
              label: `Mobile (${sections.filter((s) => s.showOnMobile !== false).length})`,
            },
            {
              key: "desktop",
              label: `Desktop (${sections.filter((s) => s.showOnDesktop !== false).length})`,
            },
          ]}
          active={device}
          onChange={(next) => setDevice(next as "mobile" | "desktop")}
          theme={theme}
        />
      </Row>

      {canEdit && (
        <Panel title="Add a section">
          <Row gap={8} wrap>
            <View style={{ flex: 1, minWidth: 200 }}>
              <Picker
                value={newType}
                options={SECTION_TYPES}
                onChange={setNewType}
                theme={theme}
                label="Section type"
                allowClear={false}
                searchable
              />
            </View>
            <Btn
              title="Add section"
              icon="plus"
              tone="primary"
              small
              theme={theme}
              onPress={addSection}
            />
          </Row>
        </Panel>
      )}

      <Row gap={14} align="flex-start" wrap>
        <View style={{ flex: 2, minWidth: 280, gap: 10 }}>
          {sections.length ? (
            sections.map((section, index) => {
              const open = expanded === section.id;
              const scheduled = Boolean(section.startsAt || section.endsAt);
              return (
                <Panel
                  key={section.id}
                  title={String(section.title)}
                  subtitle={`${humanise(String(section.type))}${scheduled ? " · scheduled" : ""}`}
                  actions={
                    <Row gap={5}>
                      <IconBtn
                        icon="arrow-up"
                        label="Move up"
                        size={26}
                        theme={theme}
                        disabled={!canEdit || index === 0}
                        onPress={() =>
                          store.move("homepage_sections", section.id, -1, write)
                        }
                      />
                      <IconBtn
                        icon="arrow-down"
                        label="Move down"
                        size={26}
                        theme={theme}
                        disabled={!canEdit || index === sections.length - 1}
                        onPress={() =>
                          store.move("homepage_sections", section.id, 1, write)
                        }
                      />
                      <IconBtn
                        icon={open ? "chevron-up" : "sliders"}
                        label={open ? "Collapse" : "Configure"}
                        size={26}
                        theme={theme}
                        onPress={() => setExpanded(open ? null : section.id)}
                      />
                      <IconBtn
                        icon="trash-can"
                        label="Remove section"
                        tone="danger"
                        size={26}
                        theme={theme}
                        disabled={!canEdit}
                        onPress={() => {
                          store.remove("homepage_sections", section.id, write);
                          notify("Section moved to trash.");
                        }}
                      />
                    </Row>
                  }
                >
                  <Row gap={10} wrap>
                    <Pill
                      label={section.enabled ? "Visible" : "Hidden"}
                      color={section.enabled ? theme.success : theme.muted}
                      theme={theme}
                      small
                    />
                    {!!section.startsAt && (
                      <A
                        size={11}
                        color={theme.muted}
                      >{`From ${format.dateTime(section.startsAt)}`}</A>
                    )}
                    {!!section.endsAt && (
                      <A
                        size={11}
                        color={theme.muted}
                      >{`Until ${format.dateTime(section.endsAt)}`}</A>
                    )}
                  </Row>

                  {open && canEdit && (
                    <Col gap={10}>
                      <TextBox
                        value={String(section.title ?? "")}
                        onChange={(value) =>
                          patch(section.id, { title: value })
                        }
                        theme={theme}
                        label="Section title"
                        placeholder="Section title"
                      />
                      <TextBox
                        value={String(section.subtitle ?? "")}
                        onChange={(value) =>
                          patch(section.id, { subtitle: value })
                        }
                        theme={theme}
                        label="Subtitle"
                        placeholder="Subtitle"
                      />
                      <Toggle
                        value={section.enabled !== false}
                        onChange={(value) =>
                          patch(section.id, { enabled: value })
                        }
                        label="Show this section"
                        theme={theme}
                      />
                      <Toggle
                        value={section.showOnMobile !== false}
                        onChange={(value) =>
                          patch(section.id, { showOnMobile: value })
                        }
                        label="Show on mobile"
                        theme={theme}
                      />
                      <Toggle
                        value={section.showOnDesktop !== false}
                        onChange={(value) =>
                          patch(section.id, { showOnDesktop: value })
                        }
                        label="Show on desktop"
                        theme={theme}
                      />
                      <Row gap={8}>
                        <View style={{ flex: 1 }}>
                          <TextBox
                            value={String(section.startsAt ?? "")}
                            onChange={(value) =>
                              patch(section.id, { startsAt: value })
                            }
                            placeholder="Show from (YYYY-MM-DDTHH:MM)"
                            theme={theme}
                            label="Show from"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <TextBox
                            value={String(section.endsAt ?? "")}
                            onChange={(value) =>
                              patch(section.id, { endsAt: value })
                            }
                            placeholder="Hide after (YYYY-MM-DDTHH:MM)"
                            theme={theme}
                            label="Hide after"
                          />
                        </View>
                      </Row>
                      <Btn
                        title="Open every setting for this section"
                        icon="pen"
                        small
                        theme={theme}
                        onPress={() =>
                          go(`/admin/r/homepage_sections/${section.id}`)
                        }
                      />
                    </Col>
                  )}
                </Panel>
              );
            })
          ) : (
            <EmptyState
              icon="table-cells-large"
              title="The homepage has no sections yet"
              detail="Add a hero slider, categories and a product row to get started."
              theme={theme}
            />
          )}
        </View>

        {!layout.compact && (
          <View style={{ flex: 1, minWidth: 240 }}>
            <Panel title="Preview" subtitle={`${device} order`}>
              <Col gap={8}>
                {visible.map((section) => (
                  <SectionPreview
                    key={section.id}
                    section={section}
                    theme={theme}
                  />
                ))}
                {!visible.length && (
                  <A size={12} color={theme.muted}>
                    Nothing is shown on {device} yet.
                  </A>
                )}
              </Col>
              <A size={11} color={theme.muted}>
                {`Rendered with ${published.branding.companyName}'s published theme.`}
              </A>
            </Panel>
          </View>
        )}
      </Row>

      <Panel title="How the storefront reads this">
        <Row gap={8} align="flex-start">
          <Icon name="circle-info" size={12} color={theme.muted} />
          <A size={11.5} color={theme.muted} style={{ flex: 1 }}>
            The customer app asks for the enabled sections in this order and
            renders each one by its type. Hiding a section, changing its order
            or scheduling it takes effect without an app release.
          </A>
        </Row>
      </Panel>
    </AdminShell>
  );
}
