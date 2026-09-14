import { useMemo } from "react";
import { useAdmin } from "./AdminContext";
import { Icon } from "@/components/Icon";
import { metaFor } from "./resources";
import { shortDate } from "@/lib/format";

export function AdminTrash() {
  const { snapshot, restore, purge } = useAdmin();
  const rows = useMemo(() => {
    const list: { collection: string; record: (typeof snapshot)[string][number] }[] = [];
    for (const [collection, records] of Object.entries(snapshot))
      for (const record of records)
        if (record.deletedAt) list.push({ collection, record });
    return list.sort((a, b) =>
      String(b.record.deletedAt).localeCompare(String(a.record.deletedAt)),
    );
  }, [snapshot]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-black">Trash</h1>
        <p className="text-sm text-slate-500">
          Soft-deleted records from every collection, shared across both dashboards.
        </p>
      </header>
      {rows.length ? (
        <ul className="space-y-2">
          {rows.map(({ collection, record }) => {
            const meta = metaFor(collection);
            return (
              <li
                key={`${collection}:${record.id}`}
                className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-400">
                  <Icon name={meta.icon} size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">
                    {String(record[meta.labelField] ?? record.id)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {meta.label} · deleted {shortDate(String(record.deletedAt))}
                  </span>
                </span>
                <button
                  onClick={() => restore(collection, record.id)}
                  className="rounded-lg bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  Restore
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Delete permanently? This cannot be undone."))
                      purge(collection, record.id);
                  }}
                  className="rounded-lg bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100"
                >
                  Delete forever
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-2xl bg-white py-20 text-center text-sm text-slate-400 shadow-sm">
          🗑️ Trash is empty.
        </p>
      )}
    </div>
  );
}
