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
  Tabs,
} from "@/admin/ui/primitives";
import { FieldRenderer } from "@/admin/ui/FieldRenderer";
import { useLayout } from "@/admin/ui/theme";
import { useAdmin } from "@/admin/AdminProvider";
import { useFormat } from "@/admin/ui/useFormat";
import { getResource } from "@/admin/core/resources/index";
import { featuresOf, sectionsOf } from "@/admin/core/resource";
import {
  coerceAll,
  initialValues,
  validate,
  type FieldDef,
} from "@/admin/core/fields";
import { effectiveStatus } from "@/admin/core/publishing";
import { humanise } from "@/admin/core/format";
import { slugify } from "@/admin/core/ids";
import { localAssist, type AssistTask } from "@/admin/core/assist";
import { back, go } from "@/admin/navigate";
import type { AdminRecord } from "@/admin/core/types";

const ASSIST_BUTTONS: { task: AssistTask; field: string; label: string }[] = [
  {
    task: "product_description",
    field: "description",
    label: "Write a description",
  },
  { task: "seo_title", field: "seoTitle", label: "Suggest an SEO title" },
  {
    task: "meta_description",
    field: "seoDescription",
    label: "Suggest a meta description",
  },
  { task: "image_alt", field: "imageAlt", label: "Suggest alt text" },
  { task: "tags", field: "tags", label: "Suggest tags" },
];

function widthFor(field: FieldDef, columns: number): string {
  if (columns < 2) return "100%";
  if (field.width === "third") return columns >= 3 ? "33.33%" : "50%";
  if (field.width === "half") return "50%";
  return "100%";
}

/**
 * Remounts the form whenever the record it edits changes, so the editor starts
 * from the stored values without copying props into state inside an effect.
 */
export function ResourceEditScreen({
  resourceKey,
  id,
}: {
  resourceKey: string;
  id: string;
}) {
  const { store } = useAdmin();
  const stored = id === "new" ? null : store.get(resourceKey, id);
  return (
    <RecordEditor
      key={`${resourceKey}:${id}:${stored?.revision ?? 0}`}
      resourceKey={resourceKey}
      id={id}
    />
  );
}

function RecordEditor({
  resourceKey,
  id,
}: {
  resourceKey: string;
  id: string;
}) {
  const resource = getResource(resourceKey);
  const { theme, store, write, allowed, notify, published, revision } =
    useAdmin();
  const format = useFormat();
  const layout = useLayout();
  const creating = id === "new";

  const record = useMemo(
    () => (creating || !resource ? null : store.get(resource.key, id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [creating, resource, store, id, revision],
  );

  const [values, setValues] = useState<Record<string, unknown>>(() =>
    resource
      ? { ...initialValues(resource.fields), ...(creating ? {} : record) }
      : {},
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tab, setTab] = useState("");
  const [dirty, setDirty] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const sections = useMemo(
    () => (resource ? sectionsOf(resource) : []),
    [resource],
  );
  const activeTab = tab || sections[0]?.name || "General";

  const revisions = useMemo(
    () => (resource && !creating ? store.revisions(resource.key, id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resource, creating, store, id, revision],
  );

  const recordAudit = useMemo(
    () =>
      resource && !creating
        ? store
            .audit({ pageSize: 20 })
            .items.filter(
              (entry) =>
                entry.resource === resource.key && entry.recordId === id,
            )
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resource, creating, store, id, revision],
  );

  if (!resource) {
    return (
      <AdminShell title="Not found" onBack={back}>
        <EmptyState
          icon="circle-question"
          title="That area does not exist"
          theme={theme}
        />
      </AdminShell>
    );
  }
  if (!creating && !record) {
    return (
      <AdminShell title={resource.singular} onBack={back}>
        <EmptyState
          icon="circle-question"
          title={`This ${resource.singular.toLowerCase()} no longer exists`}
          detail="It may have been permanently deleted."
          action={
            <Btn
              title={`Back to ${resource.label}`}
              theme={theme}
              onPress={() => go(`/admin/r/${resource.key}`)}
            />
          }
          theme={theme}
        />
      </AdminShell>
    );
  }

  const features = featuresOf(resource);
  const canEdit = creating
    ? features.create && allowed(resource.module, "create")
    : features.edit && allowed(resource.module, "edit");
  const canDelete = features.delete && allowed(resource.module, "delete");

  const change = (name: string, value: unknown) => {
    setDirty(true);
    setValues((current) => {
      const next = { ...current, [name]: value };
      // Slug-style fields track their source until someone types their own.
      for (const field of resource.fields) {
        if (field.type !== "slug" || field.derivedFrom !== name) continue;
        const previousSource = String(current[name] ?? "");
        const currentSlug = String(current[field.name] ?? "");
        if (
          !currentSlug ||
          currentSlug === slugify(previousSource).slice(0, 60)
        ) {
          next[field.name] = slugify(String(value ?? "")).slice(0, 60);
        }
      }
      return next;
    });
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const save = (overrides: Record<string, unknown> = {}, message?: string) => {
    const payload = coerceAll(resource.fields, { ...values, ...overrides });
    const problems = validate(resource.fields, payload);
    if (problems.length) {
      setErrors(
        Object.fromEntries(
          problems.map((problem) => [problem.field, problem.message]),
        ),
      );
      const firstSection = resource.fields.find(
        (field) => field.name === problems[0]?.field,
      )?.section;
      if (firstSection) setTab(firstSection);
      notify(problems[0]?.message ?? "Please check the form.", "danger");
      return;
    }
    if (creating) {
      const created = store.create(resource.key, payload, write);
      notify(message ?? `${resource.singular} created.`, "success");
      go(`/admin/r/${resource.key}/${created.id}`);
      return;
    }
    store.update(resource.key, id, payload, write);
    setDirty(false);
    notify(message ?? `${resource.singular} saved.`, "success");
  };

  const runAssist = (task: AssistTask, field: string) => {
    const context = {
      storeName: published.branding.companyName,
      reviews: store.all("reviews").filter((review) => review.productId === id),
    };
    const enriched = {
      ...values,
      brandName: values.brandId ? format.resolve("brands", values.brandId) : "",
      categoryName: values.categoryId
        ? format.resolve("categories", values.categoryId)
        : "",
    };
    const result = localAssist({ task, record: enriched, context });
    if (!result.text) return;
    change(field, task === "tags" ? (result.suggestions ?? []) : result.text);
    notify("Suggestion filled in. Edit it before saving.", "success");
  };

  const status = record ? effectiveStatus(record) : "draft";
  const showAssist = resource.key === "products" && canEdit;

  return (
    <AdminShell
      title={
        creating
          ? `New ${resource.singular.toLowerCase()}`
          : String(values[resource.labelField] ?? resource.singular)
      }
      subtitle={
        creating
          ? resource.description
          : `${resource.singular}${record ? ` · updated ${format.dateTime(record.updatedAt)}` : ""}`
      }
      onBack={back}
      actions={
        <Row gap={6} wrap>
          {canEdit && (
            <Btn
              title={creating ? "Create" : "Save"}
              icon="floppy-disk"
              tone="primary"
              small
              theme={theme}
              onPress={() => save()}
            />
          )}
          {features.publish && canEdit && !creating && (
            <Btn
              title={status === "published" ? "Unpublish" : "Publish"}
              icon={status === "published" ? "eye-slash" : "circle-check"}
              small
              tone={status === "published" ? "neutral" : "success"}
              theme={theme}
              onPress={() =>
                save(
                  { status: status === "published" ? "draft" : "published" },
                  status === "published" ? "Moved to draft." : "Published.",
                )
              }
            />
          )}
          {features.duplicate &&
            !creating &&
            allowed(resource.module, "create") && (
              <Btn
                title="Duplicate"
                icon="copy"
                small
                theme={theme}
                onPress={() => {
                  const copy = store.duplicate(resource.key, id, {}, write);
                  if (copy) go(`/admin/r/${resource.key}/${copy.id}`);
                }}
              />
            )}
          {canDelete && !creating && (
            <Btn
              title="Delete"
              icon="trash-can"
              small
              tone="danger"
              theme={theme}
              onPress={() => {
                store.remove(resource.key, id, write);
                notify(
                  `${resource.singular} moved to trash. Restore it from the Trash tab.`,
                );
                go(`/admin/r/${resource.key}`);
              }}
            />
          )}
        </Row>
      }
    >
      {!creating && features.publish && (
        <Row gap={8} wrap>
          <Pill label={humanise(status)} theme={theme} />
          {!!values.publishAt && (
            <A
              size={11.5}
              color={theme.muted}
            >{`Goes live ${format.dateTime(values.publishAt)}`}</A>
          )}
          {!!values.unpublishAt && (
            <A
              size={11.5}
              color={theme.muted}
            >{`Hidden after ${format.dateTime(values.unpublishAt)}`}</A>
          )}
        </Row>
      )}

      {dirty && (
        <Row gap={8} wrap>
          <Pill label="Unsaved changes" color={theme.warning} theme={theme} />
        </Row>
      )}

      {sections.length > 1 && (
        <Tabs
          tabs={sections.map((section) => ({
            key: section.name,
            label: section.name,
          }))}
          active={activeTab}
          onChange={setTab}
          theme={theme}
        />
      )}

      {showAssist && (
        <Panel
          title="Writing help"
          subtitle="Generated on this device from what you have already entered. Always review before saving."
        >
          <Row gap={6} wrap>
            {ASSIST_BUTTONS.map((entry) => (
              <Btn
                key={entry.task}
                title={entry.label}
                icon="wand-magic-sparkles"
                small
                theme={theme}
                onPress={() => runAssist(entry.task, entry.field)}
              />
            ))}
          </Row>
        </Panel>
      )}

      {sections
        .filter((section) => section.name === activeTab)
        .map((section) => (
          <Panel key={section.name} title={section.name}>
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
                    field={field}
                    value={values[field.name]}
                    values={values}
                    onChange={change}
                    theme={theme}
                    error={errors[field.name]}
                  />
                </View>
              ))}
            </View>
          </Panel>
        ))}

      {!creating && features.revisions && (
        <Panel
          title="Change history"
          subtitle={`${revisions.length} saved version(s)`}
          actions={
            <Btn
              title={showHistory ? "Hide" : "Show"}
              small
              theme={theme}
              onPress={() => setShowHistory(!showHistory)}
            />
          }
        >
          {showHistory ? (
            <Col gap={8}>
              {revisions.map((entry) => (
                <Row key={entry.id} justify="space-between" gap={8}>
                  <View style={{ flex: 1 }}>
                    <A size={12}>{entry.label}</A>
                    <A size={11} color={theme.muted}>
                      {`${entry.actorName} · ${format.dateTime(entry.createdAt)}`}
                    </A>
                  </View>
                  {canEdit && (
                    <Btn
                      title="Restore"
                      icon="clock-rotate-left"
                      small
                      theme={theme}
                      onPress={() => {
                        store.restoreRevision(entry.id, write);
                        notify("Earlier version restored.", "success");
                      }}
                    />
                  )}
                </Row>
              ))}
              {!revisions.length && (
                <A size={12} color={theme.muted}>
                  No versions saved yet.
                </A>
              )}
            </Col>
          ) : (
            <A size={12} color={theme.muted}>
              Every save keeps a restorable version, so a mistake is never
              permanent.
            </A>
          )}
        </Panel>
      )}

      {!creating && !!recordAudit.length && (
        <Panel
          title="Activity"
          subtitle="Who changed this record, and what changed"
        >
          <Col gap={10}>
            {recordAudit.slice(0, 8).map((entry) => (
              <Col key={entry.id} gap={3}>
                <Row gap={8}>
                  <Pill label={humanise(entry.action)} theme={theme} small />
                  <A size={12} weight="600">
                    {entry.actorName}
                  </A>
                  <A size={11} color={theme.muted}>
                    {format.dateTime(entry.createdAt)}
                  </A>
                </Row>
                {entry.changes.slice(0, 4).map((changeEntry) => (
                  <A
                    key={changeEntry.field}
                    size={11}
                    color={theme.muted}
                    numberOfLines={1}
                  >
                    {`${humanise(changeEntry.field)}: ${JSON.stringify(changeEntry.before) ?? "—"} → ${JSON.stringify(changeEntry.after) ?? "—"}`}
                  </A>
                ))}
              </Col>
            ))}
          </Col>
        </Panel>
      )}

      {!creating && resource.key === "products" && !!record && (
        <ProductPerformance record={record} />
      )}
    </AdminShell>
  );
}

function ProductPerformance({ record }: { record: AdminRecord }) {
  const { theme, data } = useAdmin();
  const format = useFormat();
  const layout = useLayout();

  const stats = useMemo(() => {
    const lines = data.orders.flatMap((order) =>
      (order.lines ?? [])
        .filter((line) => line.productId === record.id)
        .map((line) => ({ line, order })),
    );
    const units = lines.reduce(
      (total, entry) => total + (Number(entry.line.quantity) || 0),
      0,
    );
    const revenue = lines.reduce(
      (total, entry) =>
        total +
        (Number(entry.line.unitPrice) || 0) *
          (Number(entry.line.quantity) || 0),
      0,
    );
    const cost = lines.reduce(
      (total, entry) =>
        total +
        (Number(entry.line.costPrice) || 0) *
          (Number(entry.line.quantity) || 0),
      0,
    );
    const views = Number(record.views) || 0;
    return {
      units,
      revenue,
      profit: revenue - cost,
      views,
      addToCart: Number(record.addToCartCount) || 0,
      returns: Number(record.returnCount) || 0,
      conversion: views ? (units / views) * 100 : 0,
    };
  }, [data.orders, record]);

  return (
    <Panel
      title="Performance"
      subtitle="Measured from this product's own orders and traffic"
    >
      <Grid columns={layout.columns} gap={10}>
        <Col gap={2}>
          <A size={11} color={theme.muted}>
            Views
          </A>
          <A size={16} weight="700">
            {format.number(stats.views)}
          </A>
        </Col>
        <Col gap={2}>
          <A size={11} color={theme.muted}>
            Added to cart
          </A>
          <A size={16} weight="700">
            {format.number(stats.addToCart)}
          </A>
        </Col>
        <Col gap={2}>
          <A size={11} color={theme.muted}>
            Units sold
          </A>
          <A size={16} weight="700">
            {format.number(stats.units)}
          </A>
        </Col>
        <Col gap={2}>
          <A size={11} color={theme.muted}>
            Conversion
          </A>
          <A size={16} weight="700">
            {`${stats.conversion.toFixed(2)}%`}
          </A>
        </Col>
        <Col gap={2}>
          <A size={11} color={theme.muted}>
            Revenue
          </A>
          <A size={16} weight="700">
            {format.money(stats.revenue)}
          </A>
        </Col>
        <Col gap={2}>
          <A size={11} color={theme.muted}>
            Profit
          </A>
          <A
            size={16}
            weight="700"
            color={stats.profit >= 0 ? theme.success : theme.danger}
          >
            {format.money(stats.profit)}
          </A>
        </Col>
        <Col gap={2}>
          <A size={11} color={theme.muted}>
            Returns
          </A>
          <A size={16} weight="700">
            {format.number(stats.returns)}
          </A>
        </Col>
        <Col gap={2}>
          <A size={11} color={theme.muted}>
            Margin
          </A>
          <A size={16} weight="700">
            {stats.revenue
              ? `${((stats.profit / stats.revenue) * 100).toFixed(1)}%`
              : "—"}
          </A>
        </Col>
      </Grid>
    </Panel>
  );
}
