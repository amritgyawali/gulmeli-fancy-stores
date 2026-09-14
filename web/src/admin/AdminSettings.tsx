import { useEffect, useState } from "react";
import { useAdmin } from "./AdminContext";
import { Panel } from "./AdminLayout";
import {
  loadPublishedConfig,
  publishConfig,
  type StorefrontConfig,
} from "@/lib/config-api";
import { errorMessage } from "@/lib/format";

export function AdminSettings() {
  const { syncStatus } = useAdmin();
  const [config, setConfig] = useState<StorefrontConfig | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void loadPublishedConfig().then(setConfig).catch(() => setConfig(null));
  }, []);
  if (!config)
    return <p className="text-sm text-slate-400">Loading the published configuration…</p>;

  const setTheme = (key: string, value: string) =>
    setConfig({ ...config, theme: { ...config.theme, [key]: value } });

  const save = async () => {
    setError("");
    setStatus("Publishing…");
    try {
      await publishConfig(config);
      setStatus("Published — both app and web use these settings now.");
    } catch (e) {
      setError(errorMessage(e));
      setStatus("");
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <header>
        <h1 className="text-2xl font-black">Storefront settings</h1>
        <p className="text-sm text-slate-500">
          Branding and theme publish to <code>app_config</code>; the customer app
          and this web store pick changes up within seconds.
        </p>
      </header>
      <Panel title="Branding">
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-500">Store name</span>
          <input
            value={String(config.branding.companyName ?? "")}
            onChange={(event) =>
              setConfig({
                ...config,
                branding: { ...config.branding, companyName: event.target.value },
              })
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#f85606]"
          />
        </label>
      </Panel>
      <Panel title="Theme">
        <div className="grid gap-4 sm:grid-cols-2">
          <Color label="Primary (buttons, banners)" value={config.theme.primaryColor} onChange={(v) => setTheme("primaryColor", v)} />
          <Color label="Page background" value={config.theme.backgroundColor} onChange={(v) => setTheme("backgroundColor", v)} />
          <Color label="Text" value={config.theme.textColor} onChange={(v) => setTheme("textColor", v)} />
        </div>
      </Panel>
      {error && (
        <p className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={() => void save()}
          className="rounded-xl bg-[#f85606] px-6 py-3 text-sm font-bold text-white"
        >
          Publish storefront
        </button>
        <span className="text-xs text-slate-500">{status || syncStatus}</span>
      </div>
      <p className="text-xs text-slate-400">
        Product, order and media data settings live in the other sections. Voucher
        rule (GULMELI10) and stock are enforced by the database, not here.
      </p>
    </div>
  );
}

function Color({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <input
        type="color"
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#f85606"}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-12 cursor-pointer rounded border border-slate-200"
      />
    </label>
  );
}
