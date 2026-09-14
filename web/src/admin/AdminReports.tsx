import { useMemo, useState } from "react";
import { useAdmin } from "./AdminContext";
import { Icon } from "@/components/Icon";
import { metaFor, HIDDEN_COLLECTIONS } from "./resources";
import type { AdminRecord } from "@/lib/admin-api";

function toCsv(rows: Record<string, unknown>[], columns: string[]) {
  const esc = (v: unknown) => {
    const s =
      v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return [
    columns.join(","),
    ...rows.map((r) => columns.map((c) => esc(r[c])).join(",")),
  ].join("\n");
}

export function AdminReports() {
  const { all, snapshot } = useAdmin();
  const [collection, setCollection] = useState("orders");
  const [range, setRange] = useState(90);

  const meta = metaFor(collection);
  const collections = useMemo(
    () =>
      Object.keys(snapshot)
        .filter((k) => !HIDDEN_COLLECTIONS.has(k))
        .sort(),
    [snapshot],
  );

  const rows: AdminRecord[] =
    collection === "orders"
      ? all("orders").filter(
          (o) =>
            range === 0 ||
            Date.parse(String(o.placedAt ?? o.createdAt ?? 0)) >=
              Date.now() - range * 86_400_000,
        )
      : all(collection);

  const download = (text: string, name: string) => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const columns = [
      "id",
      meta.labelField,
      ...meta.columns.filter((c) => c !== meta.labelField),
      "status",
      "total",
      "createdAt",
    ].filter((c, i, all) => all.indexOf(c) === i);
    download(toCsv(rows, columns), `gulmeli-${collection}.csv`);
  };

  const exportAll = () => {
    download(
      JSON.stringify({ snapshot, exportedAt: new Date().toISOString() }, null, 2),
      "gulmeli-dashboard-backup.json",
    );
  };

  const revenue = rows
    .filter((r) => String(r.status ?? "") !== "cancelled")
    .reduce((n, r) => n + Number(r.total ?? 0), 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Reports &amp; export</h1>
          <p className="text-sm text-slate-500">
            Live counts from the shared store data. CSV downloads work offline too.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-lg bg-[#f85606] px-4 py-2.5 text-sm font-bold text-white"
          >
            <Icon name="download" size={14} /> Export {meta.label} CSV
          </button>
          <button
            onClick={exportAll}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            <Icon name="box" size={14} /> Full backup JSON
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-3 shadow-sm">
        {collections.map((k) => (
          <button
            key={k}
            onClick={() => setCollection(k)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${
              collection === k
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {metaFor(k).label} ({all(k).length})
          </button>
        ))}
      </div>

      {collection === "orders" && (
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
          {[
            [30, "30 days"],
            [90, "90 days"],
            [0, "All time"],
          ].map(([v, label]) => (
            <button
              key={String(v)}
              onClick={() => setRange(Number(v))}
              className={`rounded-lg px-4 py-1.5 text-sm font-bold ${range === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card label="Records" value={String(rows.length)} />
        {collection === "orders" && (
          <Card
            label="Non-cancelled total"
            value={`Rs.${revenue.toLocaleString()}`}
          />
        )}
        <Card label="Collection" value={meta.label} />
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              {["id", ...meta.columns].map((c) => (
                <th key={c} className="px-4 py-3">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.slice(0, 50).map((r) => (
              <tr key={r.id}>
                <td className="max-w-40 truncate px-4 py-2.5 font-mono text-xs text-slate-400">
                  {String(r.id)}
                </td>
                {meta.columns.map((c) => (
                  <td key={c} className="max-w-56 truncate px-4 py-2.5">
                    {typeof r[c] === "object" && r[c] != null
                      ? Array.isArray(r[c])
                        ? `${(r[c] as unknown[]).length}`
                        : "…"
                      : String(r[c] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={meta.columns.length + 1} className="px-4 py-14 text-center text-slate-400">
                  No records — adjust the filter or add data from either dashboard.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > 50 && (
        <p className="text-xs text-slate-400">
          Showing the first 50 of {rows.length} rows — CSV export includes them all.
        </p>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}
