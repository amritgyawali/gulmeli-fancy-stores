import { useMemo, useState } from "react";
import { View } from "react-native";
import { AdminShell, Panel } from "@/admin/ui/Shell";
import {
  A,
  Btn,
  Col,
  EmptyState,
  Grid,
  Pill,
  Row,
  StatTile,
  Tabs,
} from "@/admin/ui/primitives";
import { TextBox } from "@/admin/ui/inputs";
import { ConfigEditor } from "./ConfigEditor";
import { useLayout } from "@/admin/ui/theme";
import { useAdmin } from "@/admin/AdminProvider";
import { CONFIG_GROUPS } from "@/admin/core/config-schema";
import { localAssist } from "@/admin/core/assist";
import { go } from "@/admin/navigate";

const SEO_GROUPS = CONFIG_GROUPS.filter((group) => group.key === "seo");

export function SeoScreen() {
  const { theme, store, write, draft, allowed, notify, revision } = useAdmin();
  const layout = useLayout();
  const [tab, setTab] = useState<
    "health" | "settings" | "search" | "redirects"
  >("health");
  const [term, setTerm] = useState("");

  const products = useMemo(
    () => store.all("products"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, revision],
  );
  const pages = useMemo(
    () => store.all("pages"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, revision],
  );
  const categories = useMemo(
    () => store.all("categories"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, revision],
  );
  const searchTerms = useMemo(
    () =>
      store
        .all("search_terms")
        .sort((a, b) => Number(b.searches) - Number(a.searches)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, revision],
  );
  const redirects = useMemo(
    () => store.all("redirects"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, revision],
  );

  const missing = useMemo(() => {
    const all = [
      ...products.map((record) => ({
        record,
        resource: "products",
        label: String(record.name),
      })),
      ...categories.map((record) => ({
        record,
        resource: "categories",
        label: String(record.name),
      })),
      ...pages.map((record) => ({
        record,
        resource: "pages",
        label: String(record.title),
      })),
    ];
    return {
      noTitle: all.filter(
        (entry) => !String(entry.record.seoTitle ?? "").trim(),
      ),
      noDescription: all.filter(
        (entry) => !String(entry.record.seoDescription ?? "").trim(),
      ),
      hidden: all.filter((entry) => entry.record.searchable === false),
      total: all.length,
    };
  }, [products, categories, pages]);

  const canEdit = allowed("seo", "edit");

  const fillMissing = () => {
    let filled = 0;
    for (const entry of missing.noTitle.slice(0, 100)) {
      const title = localAssist({
        task: "seo_title",
        record: entry.record,
        context: { storeName: draft.branding.companyName },
      }).text;
      store.update(
        entry.resource,
        entry.record.id,
        { seoTitle: title },
        { ...write, silent: true },
      );
      filled += 1;
    }
    for (const entry of missing.noDescription.slice(0, 100)) {
      const description = localAssist({
        task: "meta_description",
        record: entry.record,
        context: { storeName: draft.branding.companyName },
      }).text;
      store.update(
        entry.resource,
        entry.record.id,
        { seoDescription: description },
        { ...write, silent: true },
      );
      filled += 1;
    }
    store.log("update", "seo", `${filled} SEO field(s) filled in`, write.actor);
    notify(
      `${filled} SEO field(s) filled in. Review them before publishing.`,
      "success",
    );
  };

  return (
    <AdminShell
      title="SEO & search"
      subtitle="Metadata, structured data, redirects and storefront search"
    >
      <Tabs
        tabs={[
          {
            key: "health",
            label: "Health",
            badge: missing.noTitle.length + missing.noDescription.length,
          },
          { key: "settings", label: "Site metadata" },
          {
            key: "search",
            label: "Storefront search",
            badge: searchTerms.length,
          },
          { key: "redirects", label: "Redirects", badge: redirects.length },
        ]}
        active={tab}
        onChange={(next) => setTab(next as typeof tab)}
        theme={theme}
      />

      {tab === "health" && (
        <>
          <Grid columns={layout.columns} gap={12}>
            <StatTile
              label="Pages covered"
              value={String(missing.total)}
              icon="file-lines"
              theme={theme}
            />
            <StatTile
              label="Missing SEO title"
              value={String(missing.noTitle.length)}
              icon="heading"
              tone={missing.noTitle.length ? theme.warning : theme.success}
              theme={theme}
            />
            <StatTile
              label="Missing meta description"
              value={String(missing.noDescription.length)}
              icon="align-left"
              tone={
                missing.noDescription.length ? theme.warning : theme.success
              }
              theme={theme}
            />
            <StatTile
              label="Hidden from search"
              value={String(missing.hidden.length)}
              icon="eye-slash"
              theme={theme}
            />
          </Grid>

          <Panel
            title="Fill in what is missing"
            subtitle="Titles and descriptions are generated on this device from each record's own content"
            actions={
              canEdit ? (
                <Btn
                  title="Fill in missing metadata"
                  icon="wand-magic-sparkles"
                  tone="primary"
                  small
                  theme={theme}
                  onPress={fillMissing}
                />
              ) : undefined
            }
          >
            {missing.noTitle.length || missing.noDescription.length ? (
              <Col gap={8}>
                {[...missing.noTitle, ...missing.noDescription]
                  .slice(0, 15)
                  .map((entry, index) => (
                    <Row
                      key={`${entry.record.id}-${index}`}
                      justify="space-between"
                      gap={8}
                    >
                      <A size={12} numberOfLines={1} style={{ flex: 1 }}>
                        {entry.label}
                      </A>
                      <Btn
                        title="Open"
                        small
                        theme={theme}
                        onPress={() =>
                          go(`/admin/r/${entry.resource}/${entry.record.id}`)
                        }
                      />
                    </Row>
                  ))}
              </Col>
            ) : (
              <EmptyState
                icon="circle-check"
                title="Every page has a title and a description"
                theme={theme}
              />
            )}
          </Panel>

          <Panel title="Structured data">
            <Row gap={8} wrap>
              {[
                ["Product schema", draft.seo.productSchema],
                ["Organization schema", draft.seo.organizationSchema],
                ["Breadcrumb schema", draft.seo.breadcrumbSchema],
                ["FAQ schema", draft.seo.faqSchema],
                ["Sitemap", draft.seo.sitemapEnabled],
              ].map(([label, enabled]) => (
                <Pill
                  key={String(label)}
                  label={`${label}: ${enabled ? "on" : "off"}`}
                  color={enabled ? theme.success : theme.muted}
                  theme={theme}
                  small
                />
              ))}
            </Row>
            <A size={11.5} color={theme.muted}>
              {`Robots directive: ${draft.seo.robots}`}
            </A>
          </Panel>
        </>
      )}

      {tab === "settings" && <ConfigEditor groups={SEO_GROUPS} />}

      {tab === "search" && (
        <>
          <Panel
            title="Search terms"
            subtitle="Popular searches, searches that found nothing, synonyms and boosts"
            actions={
              canEdit ? (
                <Row gap={6}>
                  <View style={{ width: 160 }}>
                    <TextBox
                      value={term}
                      onChange={setTerm}
                      placeholder="Add a term"
                      theme={theme}
                      label="Search term"
                    />
                  </View>
                  <Btn
                    title="Add"
                    icon="plus"
                    small
                    theme={theme}
                    onPress={() => {
                      if (!term.trim()) return;
                      store.create(
                        "search_terms",
                        {
                          term: term.trim(),
                          searches: 0,
                          results: 0,
                          synonyms: [],
                          boostProductIds: [],
                          hideProductIds: [],
                          redirectTo: "",
                          suggested: false,
                        },
                        write,
                      );
                      setTerm("");
                    }}
                  />
                </Row>
              ) : undefined
            }
          >
            {searchTerms.length ? (
              <Col gap={8}>
                {searchTerms.slice(0, 30).map((entry) => (
                  <Row key={entry.id} justify="space-between" gap={8}>
                    <View style={{ flex: 1 }}>
                      <A size={12.5}>{String(entry.term)}</A>
                      <A size={11} color={theme.muted}>
                        {`${entry.searches} search(es) · ${entry.results} result(s)`}
                      </A>
                    </View>
                    {Number(entry.results) === 0 && (
                      <Pill
                        label="No results"
                        color={theme.danger}
                        theme={theme}
                        small
                      />
                    )}
                    {entry.suggested === true && (
                      <Pill
                        label="Suggested"
                        color={theme.info}
                        theme={theme}
                        small
                      />
                    )}
                    <Btn
                      title="Edit"
                      small
                      theme={theme}
                      onPress={() => go(`/admin/r/search_terms/${entry.id}`)}
                    />
                  </Row>
                ))}
              </Col>
            ) : (
              <EmptyState
                icon="magnifying-glass"
                title="No search data yet"
                detail="Terms appear here as customers search, or you can add synonyms and boosts by hand."
                theme={theme}
              />
            )}
          </Panel>

          <Panel
            title="Storefront filters"
            subtitle="Which filters customers get, and in what order"
          >
            <Row gap={8} wrap>
              {[...draft.catalog.filters]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((filter) => (
                  <Pill
                    key={filter.key}
                    label={`${filter.label}${filter.enabled ? "" : " (off)"}`}
                    color={filter.enabled ? theme.success : theme.muted}
                    theme={theme}
                    small
                  />
                ))}
            </Row>
            <Btn
              title="Configure filters"
              icon="sliders"
              small
              theme={theme}
              onPress={() => go("/admin/settings")}
            />
          </Panel>
        </>
      )}

      {tab === "redirects" && (
        <Panel
          title="Redirects"
          subtitle="Keep old links working after a slug changes"
          actions={
            canEdit ? (
              <Btn
                title="New redirect"
                icon="plus"
                small
                tone="primary"
                theme={theme}
                onPress={() => go("/admin/r/redirects/new")}
              />
            ) : undefined
          }
        >
          {redirects.length ? (
            <Col gap={8}>
              {redirects.map((entry) => (
                <Row key={entry.id} justify="space-between" gap={8}>
                  <A size={12} numberOfLines={1} style={{ flex: 1 }}>
                    {`${entry.from} → ${entry.to}`}
                  </A>
                  <Pill label={String(entry.code)} theme={theme} small />
                  <Btn
                    title="Edit"
                    small
                    theme={theme}
                    onPress={() => go(`/admin/r/redirects/${entry.id}`)}
                  />
                </Row>
              ))}
            </Col>
          ) : (
            <EmptyState
              icon="arrow-right-arrow-left"
              title="No redirects yet"
              theme={theme}
            />
          )}
        </Panel>
      )}
    </AdminShell>
  );
}
