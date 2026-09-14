import { useMemo, useRef, useState } from "react";
import { useAdmin } from "./AdminContext";
import { Icon } from "@/components/Icon";
import { uploadMediaFile, deleteMediaFile } from "@/lib/media";
import { errorMessage } from "@/lib/format";
import { cloudName } from "@/lib/supabase";

const KINDS = ["image", "video", "pdf", "document"];

export function AdminMedia() {
  const { all, create, update, remove } = useAdmin();
  const fileInput = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  const files = all("media");
  const folders = useMemo(
    () => ["all", ...new Set(files.map((f) => String(f.folder ?? "General")))],
    [files],
  );
  const filtered = files
    .filter((f) => folder === "all" || String(f.folder ?? "General") === folder)
    .filter((f) =>
      search.trim()
        ? [f.name, f.alt, f.folder, ...(Array.isArray(f.tags) ? f.tags : [])]
            .join(" ")
            .toLowerCase()
            .includes(search.trim().toLowerCase())
        : true,
    )
    .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
  const record = selected ? files.find((f) => f.id === selected) : null;

  const upload = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadMediaFile(file, { folder: "gulmeli/media" });
      create("media", {
        name: uploaded.name || file.name,
        folder: "Uploads",
        kind: uploaded.kind || (file.type.startsWith("video/") ? "video" : "image"),
        url: uploaded.url,
        publicId: uploaded.publicId,
        alt: "",
        tags: [],
        width: uploaded.width || 0,
        height: uploaded.height || 0,
        sizeKb: Math.round((uploaded.bytes || file.size) / 1024),
        note: "",
      });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const destroy = async () => {
    if (!record) return;
    if (!window.confirm(`Delete “${record.name}” from Cloudinary?`)) return;
    setError("");
    try {
      await deleteMediaFile(typeof record.publicId === "string" ? record.publicId : null);
    } catch (e) {
      setError(errorMessage(e));
      return;
    }
    remove("media", record.id);
    setSelected(null);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-black">Media library</h1>
          <p className="text-sm text-slate-500">
            Every file lives in Cloudinary (cloud “{cloudName || "not configured"}”); this
            library is the shared index used by both dashboards.
          </p>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*,video/*,application/pdf"
          className="hidden"
          onChange={(event) => void upload(event.target.files)}
        />
        <button
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
          className="flex items-center gap-1.5 rounded-lg bg-[#f85606] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          <Icon name="upload" size={14} /> {uploading ? "Uploading to Cloudinary…" : "Upload file"}
        </button>
      </header>
      {error && (
        <p className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, alt or tag"
          className="min-w-52 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f85606]"
        />
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="Add by URL"
          className="min-w-52 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f85606]"
        />
        <button
          onClick={() => {
            const trimmed = url.trim();
            if (!trimmed) return;
            create("media", {
              name: trimmed.split("/").pop() || "File",
              folder: folder === "all" ? "General" : folder,
              kind: /\.(mp4|mov|webm)$/i.test(trimmed)
                ? "video"
                : /\.pdf$/i.test(trimmed)
                  ? "pdf"
                  : "image",
              url: trimmed,
              publicId: null,
              alt: "",
              tags: [],
              width: 0,
              height: 0,
              sizeKb: 0,
              note: "",
            });
            setUrl("");
          }}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white"
        >
          Add
        </button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto">
        {folders.map((f) => (
          <button
            key={f}
            onClick={() => setFolder(f)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold ${
              folder === f ? "bg-slate-900 text-white" : "bg-white text-slate-600"
            }`}
          >
            {f === "all" ? `All (${files.length})` : f}
          </button>
        ))}
      </div>

      {filtered.length ? (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {filtered.map((file) => (
            <button
              key={file.id}
              onClick={() => setSelected(file.id === selected ? null : file.id)}
              className={`overflow-hidden rounded-xl bg-white text-left shadow-sm ring-2 transition ${
                selected === file.id ? "ring-[#f85606]" : "ring-transparent hover:ring-slate-200"
              }`}
            >
              <span className="grid aspect-square place-items-center bg-slate-100">
                {file.kind === "image" ? (
                  <img src={String(file.url)} alt={String(file.alt ?? "")} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <Icon name={file.kind === "video" ? "image" : "box"} size={28} className="text-slate-400" />
                )}
              </span>
              <span className="block truncate px-2 py-1.5 text-xs font-medium">{String(file.name)}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-white py-16 text-center text-sm text-slate-400 shadow-sm">
          No files yet — upload a photo, video, PDF or document.
        </p>
      )}

      {record && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold">{String(record.name)}</h2>
              <p className="text-xs text-slate-400">
                {String(record.kind)} · {record.sizeKb ? `${record.sizeKb} KB · ` : ""}
                {record.publicId ? "Cloudinary asset" : "external URL"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(String(record.url));
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600"
              >
                Copy URL
              </button>
              <button
                onClick={() => void destroy()}
                className="flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100"
              >
                <Icon name="trash" size={13} /> Delete
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {(
              [
                ["name", "File name"],
                ["alt", "Alt text"],
                ["folder", "Folder"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">{label}</span>
                <input
                  value={String(record[key] ?? "")}
                  onChange={(event) => update("media", record.id, { [key]: event.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#f85606]"
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {KINDS.map((kind) => (
              <button
                key={kind}
                onClick={() => update("media", record.id, { kind })}
                className={`rounded-full px-3 py-1 text-[11px] font-bold capitalize ${
                  record.kind === kind ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {kind}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
