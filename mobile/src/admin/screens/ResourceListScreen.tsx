import { useMemo, useState } from "react";
import { Platform, Share, View } from "react-native";
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
import { DataTable } from "@/admin/ui/DataTable";
import { Picker, TextBox } from "@/admin/ui/inputs";
import { useLayout } from "@/admin/ui/theme";
import { useAdmin } from "@/admin/AdminProvider";
import { useFormat } from "@/admin/ui/useFormat";
import { getResource } from "@/admin/core/resources/index";
import { featuresOf } from "@/admin/core/resource";
import { parseCsv, toCsv } from "@/admin/core/csv";
import { humanise } from "@/admin/core/format";
import { publishOptions } from "@/admin/core/resources/common";
import type { Filter, SortDirection } from "@/admin/core/query";
import { useRelationOptions } from "@/admin/ui/FieldRenderer";
import { go } from "@/admin/navigate";

const PAGE_SIZE = 25;

function FilterControl({
  filter,
  value,
  onChange,
}: {
  filter: NonNullable<ReturnType<typeof getResource>>["filters"] extends
    (infer T)[] | undefined
    ? T
    : never;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const { theme } = useAdmin();
  const relationOptions = useRelationOptions(filter.resource);
  const range = Array.isArray(value) ? value : ["", ""];

  if (filter.type === "boolean") {
    return (
      <Picker
        value={value === undefined || value === "" ? null : String(value)}
        options={[
          { value: "true", label: "Yes" },
          { value: "false", label: "No" },
        ]}
        onChange={(next) => onChange(next === null ? "" : next === "true")}
        placeholder={filter.label}
        theme={theme}
        label={filter.label}
      />
    );
  }
  if (filter.type === "dateRange" || filter.type === "numberRange") {
    return (
      <Row gap={6}>
        <View style={{ flex: 1 }}>
          <TextBox
            value={String(range[0] ?? "")}
            onChange={(next) => onChange([next, range[1] ?? ""])}
            placeholder={
              filter.type === "dateRange" ? "From (YYYY-MM-DD)" : "Min"
            }
            keyboard={filter.type === "numberRange" ? "numeric" : "default"}
            theme={theme}
            label={`${filter.label} from`}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextBox
            value={String(range[1] ?? "")}
            onChange={(next) => onChange([range[0] ?? "", next])}
            placeholder={
              filter.type === "dateRange" ? "To (YYYY-MM-DD)" : "Max"
            }
            keyboard={filter.type === "numberRange" ? "numeric" : "default"}
            theme={theme}
            label={`${filter.label} to`}
          />
        </View>
      </Row>
    );
  }
  return (
    <Picker
      value={value === undefined || value === "" ? null : String(value)}
      options={filter.resource ? relationOptions : (filter.options ?? [])}
      onChange={(next) => onChange(next ?? "")}
      placeholder={filter.label}
      theme={theme}
      label={filter.label}
      searchable
    />
  );
}

export function ResourceListScreen({ resourceKey }: { resourceKey: string }) {
  const resource = getResource(resourceKey);
  const { theme, store, write, allowed, notify, published, revision } =
    useAdmin();
  const format = useFormat();
  const layout = useLayout();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState(resource?.defaultSort?.field ?? "updatedAt");
  const [direction, setDirection] = useState<SortDirection>(
    resource?.defaultSort?.direction ?? "desc",
  );
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [view, setView] = useState<"live" | "trash">("live");
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);

  const features = resource ? featuresOf(resource) : null;

  const queryFilters = useMemo<Filter[]>(() => {
    if (!resource) return [];
    return (resource.filters ?? [])
      .map((filter) => {
        const value = filters[filter.field];
        if (filter.type === "dateRange" || filter.type === "numberRange") {
          return { field: filter.field, operator: "between" as const, value };
        }
        return { field: filter.field, operator: "eq" as const, value };
      })
      .filter((filter) => filter.value !== undefined);
  }, [filters, resource]);

  const result = useMemo(() => {
    if (!resource)
      return {
        items: [],
        total: 0,
        page: 1,
        pageCount: 1,
        pageSize: PAGE_SIZE,
      };
    return store.list(resource.key, {
      search,
      searchFields: resource.searchFields,
      filters: queryFilters,
      sort,
      direction,
      page,
      pageSize: PAGE_SIZE,
      onlyDeleted: view === "trash",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    resource,
    store,
    search,
    queryFilters,
    sort,
    direction,
    page,
    view,
    revision,
  ]);

  if (!resource || !features) {
    return (
      <AdminShell title="Not found">
        <EmptyState
          icon="circle-question"
          title="That area does not exist"
          detail={`No admin resource is registered as "${resourceKey}".`}
          action={
            <Btn
              title="Back to the dashboard"
              onPress={() => go("/admin")}
              theme={theme}
            />
          }
          theme={theme}
        />
      </AdminShell>
    );
  }

  if (!allowed(resource.module)) {
    return (
      <AdminShell title={resource.label}>
        <EmptyState
          icon="lock"
          title="You do not have access to this area"
          detail="Ask a super admin to grant your role permission on Users & roles."
          theme={theme}
        />
      </AdminShell>
    );
  }

  const canCreate = features.create && allowed(resource.module, "create");
  const canEdit = features.edit && allowed(resource.module, "edit");
  const canDelete = features.delete && allowed(resource.module, "delete");
  const canExport = features.importExport && allowed(resource.module, "export");

  const toggleSort = (field: string) => {
    if (sort === field) setDirection(direction === "asc" ? "desc" : "asc");
    else {
      setSort(field);
      setDirection("asc");
    }
  };

  const exportCsv = async () => {
    const columns = [
      "id",
      ...resource.fields
        .filter((field) => field.type !== "repeater")
        .map((field) => field.name),
    ];
    const rows = store.all(resource.key).map((record) => {
      const row: Record<string, unknown> = {};
      for (const column of columns) row[column] = record[column];
      return row;
    });
    const csv = toCsv(rows, columns);
    store.log(
      "export",
      resource.key,
      `${rows.length} record(s) exported`,
      write.actor,
    );
    if (Platform.OS === "web") {
      notify(
        `${rows.length} row(s) ready. Copy the CSV from the import box below.`,
        "success",
      );
      setImportText(csv);
      setShowImport(true);
      return;
    }
    try {
      await Share.share({ message: csv, title: `${resource.label}.csv` });
    } catch {
      notify("The export could not be shared from this device.", "danger");
    }
  };

  const runImport = () => {
    const parsed = parseCsv(importText);
    if (!parsed.rows.length) {
      notify(parsed.errors[0]?.message ?? "Nothing to import.", "danger");
      return;
    }
    let created = 0;
    let updated = 0;
    for (const row of parsed.rows) {
      const values: Record<string, unknown> = {};
      for (const field of resource.fields) {
        const raw = row.values[field.name];
        if (raw === undefined) continue;
        if (
          field.type === "number" ||
          field.type === "currency" ||
          field.type === "percent"
        ) {
          values[field.name] = raw === "" ? null : Number(raw);
        } else if (field.type === "boolean") {
          values[field.name] = raw === "true" || raw === "1" || raw === "yes";
        } else if (field.type === "tags" || field.type === "multiselect") {
          values[field.name] = raw
            ? raw.split("|").map((entry) => entry.trim())
            : [];
        } else {
          values[field.name] = raw;
        }
      }
      const id = row.values.id;
      if (id && store.get(resource.key, id)) {
        store.update(resource.key, id, values, { ...write, silent: true });
        updated += 1;
      } else {
        store.create(
          resource.key,
          { ...values, ...(id ? { id } : {}) },
          { ...write, silent: true },
        );
        created += 1;
      }
    }
    store.log(
      "import",
      resource.key,
      `${created} created, ${updated} updated`,
      write.actor,
    );
    const failures = parsed.errors.length
      ? ` ${parsed.errors.length} row(s) were skipped: ${parsed.errors
          .slice(0, 3)
          .map((error) => `line ${error.line}`)
          .join(", ")}.`
      : "";
    notify(
      `Imported ${created} new and ${updated} updated record(s).${failures}`,
      failures ? "danger" : "success",
    );
    setShowImport(false);
    setImportText("");
  };

  const bulkStatus = (status: string) => {
    store.bulkUpdate(
      resource.key,
      selected,
      { status },
      { ...write, label: `${selected.length} set to ${status}` },
    );
    notify(
      `${selected.length} record(s) set to ${humanise(status)}.`,
      "success",
    );
    setSelected([]);
  };

  return (
    <AdminShell
      title={resource.label}
      subtitle={resource.description}
      actions={
        <Row gap={6} wrap>
          {canCreate && (
            <Btn
              title={`New ${resource.singular.toLowerCase()}`}
              icon="plus"
              tone="primary"
              small
              theme={theme}
              onPress={() => go(`/admin/r/${resource.key}/new`)}
            />
          )}
          {canExport && (
            <Btn
              title="Export"
              icon="file-export"
              small
              theme={theme}
              onPress={() => void exportCsv()}
            />
          )}
          {canCreate && features.importExport && (
            <Btn
              title="Import"
              icon="file-import"
              small
              theme={theme}
              onPress={() => setShowImport(!showImport)}
            />
          )}
        </Row>
      }
    >
      {features.trash && (
        <Tabs
          tabs={[
            {
              key: "live",
              label: resource.label,
              badge: store.count(resource.key),
            },
            {
              key: "trash",
              label: "Trash",
              badge: store.count(resource.key, { onlyDeleted: true }),
            },
          ]}
          active={view}
          onChange={(next) => {
            setView(next as "live" | "trash");
            setPage(1);
            setSelected([]);
          }}
          theme={theme}
        />
      )}

      <Row gap={8} wrap>
        <View style={{ flex: 1, minWidth: 200 }}>
          <TextBox
            value={search}
            onChange={(next) => {
              setSearch(next);
              setPage(1);
            }}
            placeholder={`Search ${resource.label.toLowerCase()}`}
            theme={theme}
            label={`Search ${resource.label}`}
            testID="resource-search"
          />
        </View>
        {!!resource.filters?.length && (
          <Btn
            title={showFilters ? "Hide filters" : "Filters"}
            icon="filter"
            small
            theme={theme}
            onPress={() => setShowFilters(!showFilters)}
          />
        )}
        {Object.values(filters).some(
          (value) => value !== undefined && value !== "",
        ) && (
          <Btn
            title="Clear"
            icon="xmark"
            small
            tone="ghost"
            theme={theme}
            onPress={() => {
              setFilters({});
              setPage(1);
            }}
          />
        )}
      </Row>

      {showFilters && !!resource.filters?.length && (
        <Panel title="Filters">
          <Col gap={10}>
            {resource.filters.map((filter) => (
              <Col key={filter.field} gap={4}>
                <A size={11.5} weight="600" color={theme.muted}>
                  {filter.label}
                </A>
                <FilterControl
                  filter={filter}
                  value={filters[filter.field]}
                  onChange={(value) => {
                    setFilters((current) => ({
                      ...current,
                      [filter.field]: value,
                    }));
                    setPage(1);
                  }}
                />
              </Col>
            ))}
          </Col>
        </Panel>
      )}

      {showImport && (
        <Panel
          title="Import or export CSV"
          subtitle="The first row is the header. A row with a matching id updates that record, anything else creates one. Multi-value columns use | between entries."
        >
          <TextBox
            value={importText}
            onChange={setImportText}
            multiline
            rows={8}
            placeholder="id,name,price…"
            theme={theme}
            label="CSV data"
          />
          <Row gap={8}>
            <Btn
              title="Import rows"
              icon="file-import"
              tone="primary"
              small
              theme={theme}
              onPress={runImport}
            />
            <Btn
              title="Close"
              small
              tone="ghost"
              theme={theme}
              onPress={() => setShowImport(false)}
            />
          </Row>
        </Panel>
      )}

      {!!selected.length && (
        <Panel title={`${selected.length} selected`}>
          <Row gap={8} wrap>
            {features.publish && canEdit && (
              <>
                <Btn
                  title="Publish"
                  icon="circle-check"
                  small
                  tone="success"
                  theme={theme}
                  onPress={() => bulkStatus("published")}
                />
                <Btn
                  title="Move to draft"
                  icon="pen"
                  small
                  theme={theme}
                  onPress={() => bulkStatus("draft")}
                />
                <Btn
                  title="Archive"
                  icon="box-archive"
                  small
                  theme={theme}
                  onPress={() => bulkStatus("archived")}
                />
              </>
            )}
            {canEdit &&
              resource.fields.some((field) => field.name === "enabled") && (
                <>
                  <Btn
                    title="Enable"
                    icon="toggle-on"
                    small
                    theme={theme}
                    onPress={() => {
                      store.bulkUpdate(
                        resource.key,
                        selected,
                        { enabled: true },
                        write,
                      );
                      setSelected([]);
                    }}
                  />
                  <Btn
                    title="Disable"
                    icon="toggle-off"
                    small
                    theme={theme}
                    onPress={() => {
                      store.bulkUpdate(
                        resource.key,
                        selected,
                        { enabled: false },
                        write,
                      );
                      setSelected([]);
                    }}
                  />
                </>
              )}
            {view === "live" && canDelete && (
              <Btn
                title="Move to trash"
                icon="trash-can"
                small
                tone="danger"
                theme={theme}
                onPress={() => {
                  const count = store.bulkRemove(resource.key, selected, write);
                  notify(`${count} record(s) moved to trash.`);
                  setSelected([]);
                }}
              />
            )}
            {view === "trash" && (
              <Btn
                title="Restore"
                icon="rotate-left"
                small
                tone="success"
                theme={theme}
                onPress={() => {
                  selected.forEach((id) =>
                    store.restore(resource.key, id, write),
                  );
                  notify(`${selected.length} record(s) restored.`, "success");
                  setSelected([]);
                }}
              />
            )}
            <Btn
              title="Clear selection"
              small
              tone="ghost"
              theme={theme}
              onPress={() => setSelected([])}
            />
          </Row>
        </Panel>
      )}

      {result.items.length ? (
        <View
          style={{
            backgroundColor: layout.compact ? "transparent" : theme.surface,
            borderRadius: theme.cardRadius,
            borderWidth: layout.compact ? 0 : 1,
            borderColor: theme.border,
            overflow: "hidden",
          }}
        >
          <DataTable
            columns={resource.columns}
            rows={result.items}
            theme={theme}
            config={published}
            resolve={format.resolve}
            narrow={layout.compact}
            selected={selected}
            sort={sort}
            direction={direction}
            onSort={toggleSort}
            onOpen={(record) => go(`/admin/r/${resource.key}/${record.id}`)}
            onToggleSelect={
              features.bulk
                ? (id) =>
                    setSelected((current) =>
                      current.includes(id)
                        ? current.filter((entry) => entry !== id)
                        : [...current, id],
                    )
                : undefined
            }
            onToggleAll={
              features.bulk
                ? () =>
                    setSelected((current) =>
                      current.length === result.items.length
                        ? []
                        : result.items.map((item) => item.id),
                    )
                : undefined
            }
            rowActions={(record) => (
              <Row gap={5}>
                {features.reorder && canEdit && view === "live" && (
                  <>
                    <IconBtn
                      icon="arrow-up"
                      label="Move up"
                      size={26}
                      theme={theme}
                      onPress={() =>
                        store.move(resource.key, record.id, -1, write)
                      }
                    />
                    <IconBtn
                      icon="arrow-down"
                      label="Move down"
                      size={26}
                      theme={theme}
                      onPress={() =>
                        store.move(resource.key, record.id, 1, write)
                      }
                    />
                  </>
                )}
                {features.duplicate && canCreate && view === "live" && (
                  <IconBtn
                    icon="copy"
                    label="Duplicate"
                    size={26}
                    theme={theme}
                    onPress={() => {
                      const copy = store.duplicate(
                        resource.key,
                        record.id,
                        {},
                        write,
                      );
                      if (copy)
                        notify(
                          `${resource.singular} duplicated as a draft.`,
                          "success",
                        );
                    }}
                  />
                )}
                {view === "live" ? (
                  canDelete && (
                    <IconBtn
                      icon="trash-can"
                      label="Move to trash"
                      tone="danger"
                      size={26}
                      theme={theme}
                      onPress={() => {
                        store.remove(resource.key, record.id, write);
                        notify(`${resource.singular} moved to trash.`);
                      }}
                    />
                  )
                ) : (
                  <>
                    <IconBtn
                      icon="rotate-left"
                      label="Restore"
                      size={26}
                      theme={theme}
                      onPress={() =>
                        store.restore(resource.key, record.id, write)
                      }
                    />
                    {canDelete && (
                      <IconBtn
                        icon="xmark"
                        label="Delete permanently"
                        tone="danger"
                        size={26}
                        theme={theme}
                        onPress={() => {
                          store.purge(resource.key, record.id, write);
                          notify("Deleted permanently.", "danger");
                        }}
                      />
                    )}
                  </>
                )}
              </Row>
            )}
          />
        </View>
      ) : (
        <EmptyState
          icon={resource.icon}
          title={
            view === "trash"
              ? "The trash is empty"
              : `No ${resource.label.toLowerCase()} yet`
          }
          detail={
            resource.emptyHint ??
            (search
              ? "Try a different search or clear the filters."
              : undefined)
          }
          action={
            canCreate && view === "live" ? (
              <Btn
                title={`Create the first ${resource.singular.toLowerCase()}`}
                icon="plus"
                tone="primary"
                theme={theme}
                onPress={() => go(`/admin/r/${resource.key}/new`)}
              />
            ) : undefined
          }
          theme={theme}
        />
      )}

      {result.pageCount > 1 && (
        <Row justify="space-between" gap={8}>
          <A size={12} color={theme.muted}>
            {`${result.total} record(s), page ${result.page} of ${result.pageCount}`}
          </A>
          <Row gap={6}>
            <Btn
              title="Previous"
              icon="chevron-left"
              small
              theme={theme}
              disabled={result.page <= 1}
              onPress={() => setPage(result.page - 1)}
            />
            <Btn
              title="Next"
              icon="chevron-right"
              small
              theme={theme}
              disabled={result.page >= result.pageCount}
              onPress={() => setPage(result.page + 1)}
            />
          </Row>
        </Row>
      )}

      {features.publish && view === "live" && (
        <Row gap={6} wrap>
          <A size={11} color={theme.muted}>
            Statuses:
          </A>
          {publishOptions.map((option) => (
            <Pill key={option.value} label={option.label} theme={theme} small />
          ))}
          <Icon name="circle-info" size={10} color={theme.muted} />
          <A size={11} color={theme.muted}>
            Scheduled records go live on their own at the publish time.
          </A>
        </Row>
      )}
    </AdminShell>
  );
}
