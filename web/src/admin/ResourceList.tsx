import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAdmin } from "./AdminContext";
import { Icon } from "@/components/Icon";
import { metaFor, HIDDEN_COLLECTIONS } from "./resources";
import type { AdminRecord } from "@/lib/admin-api";

type Sort = { field: string; dir: 1 | -1 };

export function ResourceList() {
  const { collection = "products" } = useParams();
  const { all, create, update, remove, snapshot } = useAdmin();
  const meta = metaFor(collection);
  const records = all(collection);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>({ field: "updatedAt", dir: -1 });
  const [editing, setEditing] = useState<AdminRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const columns = useMemo(() => {
    const sample = records[0];
    const preferred = meta.columns.filter((c) =>
      sample ? c in sample || c === "status" : false,
    );
    const fallback = sample
      ? Object.keys(sample).filter(
          (k) =>
            !["revision", "deletedAt", "details", "document"].includes(k) &&
            !["string", "number", "boolean"].includes(typeof sample[k])
              ? false
              : true,
        )
      : [];
    return [...new Set([...preferred, ...fallback])].slice(0, 6);
  }, [records, meta.columns, collection]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const list = needle
      ? records.filter((r) =>
          Object.values(r).some((v) =>
            typeof v === "string" && v.toLowerCase().includes(needle),
          ),
        )
      : records;
    return [...list].sort((a, b) => {
      const av = a[sort.field];
      const bv = b[sort.field];
      const an = av == null ? "" : String(av);
      const bn = bv == null ? "" : String(bv);
      return an.localeCompare(bn, undefined, { numeric: true }) * sort.dir;
    });
  }, [records, search, sort]);

  const knownKeys = Object.keys(snapshot).filter(
    (k) => !HIDDEN_COLLECTIONS.has(k) && (snapshot[k]?.length ?? 0) > 0,
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold">{meta.label}</h1>
          <p className="text-sm text-ink-muted">
            {collection === "media"
              ? "Files live in Cloudinary; this library syncs with the mobile dashboard."
              : `Shared with the mobile dashboard in real time via Supabase.`}
          </p>
        </div>
        {knownKeys.length > 1 && collection !== "products" && (
          <select
            value={collection}
            onChange={(e) => {
              window.location.hash = `#/admin/r/${e.target.value}`;
            }}
            className="rounded-lg border border-line bg-white px-3 py-2.5 text-sm font-bold outline-none"
            aria-label="Switch collection"
          >
            {knownKeys.map((k) => (
              <option key={k} value={k}>
                {metaFor(k).label}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white"
        >
          <Icon name="plus" size={14} /> New {meta.label.toLowerCase().replace(/s$/, "")}
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
        <div className="flex min-w-52 flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3">
          <Icon name="search" size={14} className="text-ink-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${meta.label.toLowerCase()}`}
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
          Sort
          <select
            value={`${sort.field}:${sort.dir}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split(":");
              setSort({ field, dir: Number(dir) as 1 | -1 });
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-bold outline-none"
          >
            {["updatedAt", "createdAt", ...columns].map((c, i) => (
              <option key={c} value={`${c}:${i === 0 ? -1 : 1}`}>
                {c} {i === 0 ? "(newest)" : ""}
              </option>
            ))}
          </select>
        </label>
        <span className="text-sm text-ink-faint">{filtered.length} record(s)</span>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              {columns.map((c) => (
                <th key={c} className="px-4 py-3">{c}</th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((record) => (
              <tr key={record.id} className="hover:bg-brand-soft/40">
                {columns.map((c) => (
                  <td key={c} className="max-w-72 truncate px-4 py-3">
                    {c === String(meta.labelField) ? (
                      <span className="font-semibold">{String(record[c] ?? "—")}</span>
                    ) : typeof record[c] === "boolean" ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${record[c] ? "bg-positive-soft text-positive" : "bg-sunken text-ink-muted"}`}
                      >
                        {record[c] ? "yes" : "no"}
                      </span>
                    ) : typeof record[c] === "object" && record[c] != null ? (
                      <span className="text-xs text-ink-faint">
                        {Array.isArray(record[c])
                          ? `${(record[c] as unknown[]).length} item(s)`
                          : "…"}
                      </span>
                    ) : (
                      String(record[c] ?? "—")
                    )}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      aria-label={`Edit ${String(record[meta.labelField] ?? record.id)}`}
                      onClick={() => setEditing(record)}
                      className="rounded p-2 text-ink-faint hover:bg-sunken hover:text-ink"
                    >
                      <Icon name="edit" size={15} />
                    </button>
                    <button
                      aria-label={`Delete ${String(record[meta.labelField] ?? record.id)}`}
                      onClick={() => {
                        if (window.confirm("Move this record to trash?"))
                          remove(collection, record.id);
                      }}
                      className="rounded p-2 text-ink-faint hover:bg-critical-soft hover:text-critical"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-14 text-center text-sm text-ink-faint">
                  {records.length
                    ? "No records match your search."
                    : `Nothing here yet. Create a record or add it from the mobile dashboard.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {error && (
        <p className="rounded-lg bg-critical-soft p-3 text-sm font-semibold text-critical">{error}</p>
      )}
      {(editing || creating) && (
        <RecordEditor
          collection={collection}
          record={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
            setError("");
          }}
          onSave={(values) => {
            try {
              setError("");
              if (editing) update(collection, editing.id, values);
              else create(collection, values);
              setEditing(null);
              setCreating(false);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not save.");
            }
          }}
        />
      )}
      <Link
        to="/admin"
        className="inline-block text-xs font-bold text-ink-faint hover:text-brand"
      >
        ← Overview
      </Link>
    </div>
  );
}

function RecordEditor({
  collection,
  record,
  onClose,
  onSave,
}: {
  collection: string;
  record: AdminRecord | null;
  onClose: () => void;
  onSave: (values: Record<string, unknown>) => void;
}) {
  const meta = metaFor(collection);
  const initial = useMemo(() => {
    const base: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record ?? {}))
      if (!["id", "createdAt", "updatedAt", "revision", "deletedAt"].includes(key))
        base[key] = value;
    for (const column of meta.columns) if (!(column in base)) base[column] = "";
    if (!("status" in base) && collection === "products") base.status = "draft";
    return base;
  }, [record, meta.columns, collection]);
  const [form, setForm] = useState<Record<string, unknown>>(initial);
  const [textFields, setTextFields] = useState<Set<string>>(
    () =>
      new Set(
        Object.entries(initial)
          .filter(([, v]) => typeof v === "string" && v.length > 40)
          .map(([k]) => k),
      ),
  );

  const set = (key: string, value: unknown) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
        className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {record ? `Edit ${meta.label.toLowerCase()}` : `New ${meta.label.toLowerCase()}`}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-2 hover:bg-sunken">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="space-y-3.5">
          {Object.entries(form).map(([key, value]) => {
            if (typeof value === "object" && value !== null) {
              const text = JSON.stringify(value, null, 2);
              return (
                <label key={key} className="block">
                  <span className="mb-1 block text-xs font-bold text-ink-muted">{key} (JSON)</span>
                  <textarea
                    rows={Math.min(10, text.split("\n").length + 1)}
                    value={text}
                    onChange={(e) => {
                      try {
                        set(key, JSON.parse(e.target.value));
                      } catch {
                        /* keep last valid value while typing */
                      }
                    }}
                    className="w-full resize-y rounded-lg border border-line px-3 py-2 font-mono text-xs outline-none focus:border-brand"
                  />
                </label>
              );
            }
            if (typeof value === "boolean")
              return (
                <label key={key} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                  <span className="text-sm font-semibold text-ink-soft">{key}</span>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => set(key, e.target.checked)}
                    className="h-4 w-4 accent-[var(--color-brand)]"
                  />
                </label>
              );
            const numeric = typeof value === "number";
            return (
              <label key={key} className="block">
                <span className="mb-1 block text-xs font-bold text-ink-muted">
                  {key}
                  {key === String(meta.labelField) && (
                    <span className="text-critical"> *</span>
                  )}
                </span>
                {textFields.has(key) ? (
                  <textarea
                    rows={3}
                    value={String(value ?? "")}
                    onChange={(e) => set(key, e.target.value)}
                    className="w-full resize-y rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                ) : (
                  <input
                    type={numeric ? "number" : "text"}
                    step={numeric ? "any" : undefined}
                    value={numeric ? value : String(value ?? "")}
                    onChange={(e) =>
                      set(key, numeric ? Number(e.target.value) : e.target.value)
                    }
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                )}
              </label>
            );
          })}
        </div>
        <div className="mt-6 flex gap-3">
          <button type="submit" className="flex-1 rounded-md bg-brand py-3 text-sm font-bold text-white">
            {record ? "Save changes" : "Create"}
          </button>
          <button type="button" onClick={onClose} className="rounded-md border border-line px-5 text-sm font-bold text-ink-soft">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
