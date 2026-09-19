import { useEffect, useState } from "react";
import { useAdmin } from "./AdminContext";
import { Panel } from "./AdminLayout";
import {
  loadPublishedConfig,
  publishConfig,
  type StorefrontConfig,
} from "@/lib/config-api";
import { uploadMediaFile } from "@/lib/media";
import { errorMessage } from "@/lib/format";
export function AdminSettings() {
  const { syncStatus } = useAdmin();
  const [config, setConfig] = useState<StorefrontConfig | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void loadPublishedConfig()
      .then(setConfig)
      .catch((e) => setError(errorMessage(e)));
  }, []);
  if (!config) return <p role="status">{error || "Loading store settings?"}</p>;
  const setTheme = (key: string, value: string | number) =>
    setConfig((current) => {
      if (!current) return current;
      return {
        ...current,
        theme: {
          ...current.theme,
          [key]: value,
          ...(key === "primaryColor" &&
          current.theme.buttonColor === current.theme.primaryColor
            ? { buttonColor: String(value) }
            : {}),
        },
        header: {
          ...current.header,
          ...(key === "primaryColor" &&
          current.header.backgroundColor === current.theme.primaryColor
            ? { backgroundColor: String(value) }
            : {}),
        },
      };
    });
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await publishConfig(config);
      setStatus("Published. Customers will see your changes within seconds.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const textInput =
    "min-h-12 w-full rounded-md border border-line px-3 py-2 text-sm";
  return (
    <div className="max-w-4xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Store appearance</h1>
        <p className="text-ink-muted">
          Edit your brand, preview the colours and publish when ready.
        </p>
      </header>
      <Panel title="Brand identity">
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["companyName", "Store name"],
              ["tagline", "Tagline"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                className={textInput}
                value={config.branding[key]}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    branding: { ...config.branding, [key]: e.target.value },
                  })
                }
              />
            </label>
          ))}
          {(
            [
              ["logo", "Store logo"],
              ["mobileLogo", "Mobile logo"],
              ["favicon", "Browser favicon"],
              ["appIcon", "Android / iOS icon"],
              ["splashLogo", "Splash image"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="space-y-2">
              {label}
              <input
                type="url"
                aria-label={`${label} URL`}
                className={textInput}
                value={config.branding[key]}
                placeholder="https://?"
                onChange={(e) =>
                  setConfig({
                    ...config,
                    branding: { ...config.branding, [key]: e.target.value },
                  })
                }
              />
              <input
                type="file"
                accept="image/*"
                disabled={busy}
                aria-label={`Upload ${label}`}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setBusy(true);
                  setError("");
                  try {
                    const media = await uploadMediaFile(file, {
                      folder: "gulmeli/branding",
                    });
                    setConfig((current) =>
                      current
                        ? {
                            ...current,
                            branding: { ...current.branding, [key]: media.url },
                          }
                        : current,
                    );
                  } catch (err) {
                    setError(errorMessage(err));
                  } finally {
                    setBusy(false);
                  }
                }}
              />
              {config.branding[key] && (
                <img
                  src={config.branding[key]}
                  className="h-16 max-w-48 object-contain"
                  alt={`${label} preview`}
                />
              )}
            </label>
          ))}
        </div>
        <p className="mt-4 text-sm text-ink-muted">
          Logos and browser favicon update live. Launcher icons and the native
          splash image are included in the next Android/iOS build.
        </p>
      </Panel>
      <Panel title="Colours & shape">
        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              ["primaryColor", "Primary"],
              ["buttonColor", "Buttons"],
              ["backgroundColor", "Page"],
              ["surfaceColor", "Cards"],
              ["textColor", "Text"],
              ["mutedTextColor", "Secondary text"],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between gap-3"
            >
              {label}
              <input
                type="color"
                aria-label={`${label} colour`}
                value={config.theme[key]}
                onChange={(e) => setTheme(key, e.target.value)}
                className="h-12 w-16"
              />
            </label>
          ))}
          {(
            [
              ["buttonRadius", "Button radius"],
              ["cardRadius", "Card radius"],
              ["spacing", "Spacing"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                type="number"
                min={0}
                max={key === "spacing" ? 32 : 40}
                className={textInput}
                value={config.theme[key]}
                onChange={(e) => setTheme(key, Number(e.target.value))}
              />
            </label>
          ))}
          <label>
            Colour scheme
            <select
              className={textInput}
              value={config.theme.colorScheme}
              onChange={(e) => setTheme("colorScheme", e.target.value)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">Device setting</option>
            </select>
          </label>
          <label>
            Mobile columns
            <select
              className={textInput}
              value={config.catalog.gridColumnsMobile}
              onChange={(e) =>
                setConfig({
                  ...config,
                  catalog: {
                    ...config.catalog,
                    gridColumnsMobile: Number(e.target.value),
                  },
                })
              }
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </label>
          <label>
            Desktop columns
            <select
              className={textInput}
              value={config.catalog.gridColumnsDesktop}
              onChange={(e) =>
                setConfig({
                  ...config,
                  catalog: {
                    ...config.catalog,
                    gridColumnsDesktop: Number(e.target.value),
                  },
                })
              }
            >
              {[2, 3, 4].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
      </Panel>
      <Panel title="Preview">
        <div
          className="space-y-4 p-6"
          style={{
            background: config.theme.backgroundColor,
            color: config.theme.textColor,
            borderRadius: config.theme.cardRadius,
          }}
        >
          {config.branding.logo && (
            <img
              className="h-12 object-contain"
              src={config.branding.logo}
              alt="Store logo"
            />
          )}
          <h2 className="text-2xl font-bold">{config.branding.companyName}</h2>
          <p>{config.branding.tagline}</p>
          <span
            className="inline-block px-6 py-3"
            style={{
              background: config.theme.buttonColor,
              color: config.theme.buttonTextColor,
              borderRadius: config.theme.buttonRadius,
            }}
          >
            Shop the collection
          </span>
        </div>
      </Panel>
      {error && (
        <p role="alert" className="text-critical">
          {error}
        </p>
      )}
      <button
        disabled={busy}
        onClick={() => void save()}
        className="min-h-12 rounded-md bg-shell px-6 py-3 font-bold text-white disabled:opacity-50"
      >
        {busy ? "Saving?" : "Publish storefront"}
      </button>
      <p role="status" className="text-sm text-ink-muted">
        {status || syncStatus}
      </p>
      <p className="text-sm text-ink-muted">
        Use the app dashboard?s Homepage Builder to add, reorder and hide
        sections. Both storefronts read that published layout.
      </p>
    </div>
  );
}
