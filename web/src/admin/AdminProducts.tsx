import { useMemo, useState } from "react";
import { useAdmin } from "./AdminContext";
import { Icon } from "@/components/Icon";
import { rs } from "@/lib/format";
import type { AdminRecord } from "@/lib/admin-api";

const GROUPS = [
  ["home", "Home feed"],
  ["offer", "Offers"],
  ["choice", "Choice picks"],
  ["recommendation", "Recommendations"],
  ["unavailable", "Unavailable shelf"],
];
const STATUSES = ["draft", "scheduled", "published", "archived"];

export function AdminProducts() {
  const { all, create, update, remove } = useAdmin();
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");
  const [editing, setEditing] = useState<AdminRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const products = all("products");

  const filtered = useMemo(
    () =>
      products
        .filter((p) => group === "all" || String(p.storefrontGroup) === group)
        .filter((p) =>
          search.trim()
            ? String(p.name).toLowerCase().includes(search.trim().toLowerCase())
            : true,
        )
        .sort((a, b) => String(a.name).localeCompare(String(b.name))),
    [products, group, search],
  );

  const save = (values: Record<string, unknown>, id?: string) => {
    if (id) update("products", id, values);
    else create("products", { status: "draft", ...values });
    setEditing(null);
    setCreating(false);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-black">Products</h1>
          <p className="text-sm text-slate-500">
            Published changes reach the customer app and storefront in seconds.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#f85606] px-4 py-2.5 text-sm font-bold text-white"
        >
          <Icon name="plus" size={14} /> New product
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name or SKU"
          className="min-w-52 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f85606]"
        />
        {["all", ...GROUPS.map((g) => g[0])].map((g) => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${
              group === g ? "bg-slate-900 text-white" : "bg-white text-slate-600"
            }`}
          >
            {g === "all" ? "All" : GROUPS.find((x) => x[0] === g)?.[1]}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Placement</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((product) => (
              <tr key={product.id} className="hover:bg-orange-50/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-lg">
                      {typeof (product.images as unknown[] | undefined)?.[0] === "string" ? (
                        <img
                          src={(product.images as string[])[0]}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        "📦"
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{String(product.name)}</span>
                      <span className="text-xs text-slate-400">{String(product.sku ?? product.id)}</span>
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-bold">{rs(Number(product.price ?? 0))}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      Number(product.stock) < 5 ? "bg-rose-100 text-rose-700" : "bg-slate-100"
                    }`}
                  >
                    {Number(product.stock)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs capitalize text-slate-500">
                  {String(product.storefrontGroup)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      product.status === "published"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {String(product.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      aria-label={`Edit ${product.name}`}
                      onClick={() => setEditing(product)}
                      className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Icon name="edit" size={15} />
                    </button>
                    <button
                      aria-label={`Delete ${product.name}`}
                      onClick={() => {
                        if (window.confirm(`Move “${product.name}” to trash?`))
                          remove("products", product.id);
                      }}
                      className="rounded p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center text-sm text-slate-400">
                  No products match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(editing || creating) && (
        <ProductEditor
          product={editing}
          onSave={save}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function ProductEditor({
  product,
  onSave,
  onClose,
}: {
  product: AdminRecord | null;
  onSave: (values: Record<string, unknown>, id?: string) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Record<string, unknown>>({
    name: "",
    sku: "",
    price: 0,
    salePrice: null,
    stock: 0,
    unlimitedStock: false,
    categoryName: "General",
    storefrontGroup: "home",
    status: "draft",
    images: [] as string[],
    badge: "",
    ...(product ?? {}),
  });
  const set = (key: string, value: unknown) =>
    setForm((current) => ({ ...current, [key]: value }));
  const details = (product?.details ?? {}) as Record<string, unknown>;
  const [detailText, setDetailText] = useState(JSON.stringify(details, null, 2));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <form
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          let parsedDetails: Record<string, unknown> = {};
          try {
            parsedDetails = JSON.parse(detailText || "{}");
          } catch {
            alert("Extra details must be valid JSON.");
            return;
          }
          if (!String(form.name).trim()) {
            alert("Product name is required.");
            return;
          }
          onSave(
            {
              ...form,
              price: Number(form.price) || 0,
              stock: Number(form.stock) || 0,
              salePrice:
                form.salePrice === "" || form.salePrice == null
                  ? null
                  : Number(form.salePrice),
              details: parsedDetails,
            },
            product?.id,
          );
        }}
        className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-black">{product ? "Edit product" : "New product"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-2 hover:bg-slate-100">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <Field label="Name" required>
            <input required value={String(form.name)} onChange={(e) => set("name", e.target.value)} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SKU">
              <input value={String(form.sku ?? "")} onChange={(e) => set("sku", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Category">
              <input
                value={String(form.categoryName ?? "")}
                onChange={(e) => set("categoryName", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Price" required>
              <input type="number" min={0} step="0.01" value={String(form.price)} onChange={(e) => set("price", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Sale price">
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.salePrice == null ? "" : String(form.salePrice)}
                onChange={(e) => set("salePrice", e.target.value === "" ? null : e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Stock">
              <input type="number" min={0} value={String(form.stock)} onChange={(e) => set("stock", e.target.value)} className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Storefront placement">
              <select value={String(form.storefrontGroup)} onChange={(e) => set("storefrontGroup", e.target.value)} className={inputClass}>
                {GROUPS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select value={String(form.status)} onChange={(e) => set("status", e.target.value)} className={inputClass}>
                {STATUSES.map((value) => (
                  <option key={value} value={value} className="capitalize">{value}</option>
                ))}
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <input type="checkbox" checked={Boolean(form.unlimitedStock)} onChange={(e) => set("unlimitedStock", e.target.checked)} className="accent-[#f85606]" />
            Unlimited stock
          </label>
          <Field label="Badge (e.g. NEW PACK)">
            <input value={String(form.badge ?? "")} onChange={(e) => set("badge", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Product images (Cloudinary URLs, one per line)" hint="Upload files in Media, then paste URLs here. The first Cloudinary URL becomes the storefront picture.">
            <textarea
              rows={3}
              value={(form.images as string[] | undefined)?.join("\n") ?? ""}
              onChange={(e) =>
                set("images", e.target.value.split("\n").map((x) => x.trim()).filter(Boolean))
              }
              className={`${inputClass} resize-none font-mono text-xs`}
            />
          </Field>
          <Field label="Extra display details (JSON)" hint="discount, rating, sold, gems, fastDelivery, voucher, imageKey…">
            <textarea
              rows={5}
              value={detailText}
              onChange={(e) => setDetailText(e.target.value)}
              className={`${inputClass} resize-none font-mono text-xs`}
            />
          </Field>
        </div>
        <div className="mt-6 flex gap-3">
          <button type="submit" className="flex-1 rounded-xl bg-[#f85606] py-3 text-sm font-bold text-white">
            {product ? "Save changes" : "Create product"}
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-600">
            Cancel
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">
          Saving syncs to Supabase and republishes the storefront catalog automatically.
        </p>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#f85606]";

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-slate-500">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}
