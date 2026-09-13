import { useState } from "react";
import { AdminShell, Panel } from "@/admin/ui/Shell";
import { A, Btn, Col, Icon, Pill, Row } from "@/admin/ui/primitives";
import { TextBox } from "@/admin/ui/inputs";
import { ConfigEditor, PublishingPanel } from "./ConfigEditor";
import { useAdmin } from "@/admin/AdminProvider";
import { CONFIG_GROUPS } from "@/admin/core/config-schema";
import { go } from "@/admin/navigate";

const SETTINGS_GROUPS = CONFIG_GROUPS.filter(
  (group) => !["theme", "branding", "chrome"].includes(group.key),
);

const RELATED = [
  {
    label: "Payment methods",
    route: "/admin/r/payment_methods",
    icon: "wallet",
  },
  { label: "Shipping zones", route: "/admin/r/shipping_zones", icon: "map" },
  { label: "Shipping rates", route: "/admin/r/shipping_rates", icon: "truck" },
  { label: "Tax rates", route: "/admin/r/tax_rates", icon: "percent" },
  {
    label: "Delivery locations",
    route: "/admin/r/locations",
    icon: "map-location-dot",
  },
  {
    label: "Store locations & pickup",
    route: "/admin/r/pickup_stores",
    icon: "shop",
  },
  { label: "Translations", route: "/admin/r/translations", icon: "language" },
  { label: "Currencies", route: "/admin/r/currencies", icon: "coins" },
  {
    label: "Integrations & API keys",
    route: "/admin/r/integrations",
    icon: "plug",
  },
  { label: "Policies & pages", route: "/admin/r/pages", icon: "file-lines" },
];

export function SettingsScreen() {
  const {
    theme,
    allowed,
    exportSnapshot,
    importSnapshot,
    resetDemoData,
    clearBusinessData,
    store,
    notify,
  } = useAdmin();
  const [backup, setBackup] = useState("");
  const canManage = allowed("settings", "edit");

  return (
    <AdminShell
      title="Settings"
      subtitle="Store details, checkout, features, localisation, security and the app itself"
    >
      <PublishingPanel />

      <ConfigEditor groups={SETTINGS_GROUPS} />

      <Panel
        title="Related areas"
        subtitle="Settings that live as records, so each one has its own history"
      >
        <Row gap={8} wrap>
          {RELATED.map((entry) => (
            <Btn
              key={entry.route}
              title={entry.label}
              icon={entry.icon}
              small
              theme={theme}
              onPress={() => go(entry.route)}
            />
          ))}
        </Row>
      </Panel>

      <Panel
        title="Backup & restore"
        subtitle="A full copy of the dashboard data and configuration, as JSON"
      >
        <Row gap={8} wrap>
          <Btn
            title="Create a backup"
            icon="download"
            small
            theme={theme}
            onPress={() => {
              const snapshot = exportSnapshot();
              setBackup(snapshot);
              store.create(
                "backups",
                {
                  name: `Manual backup ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
                  kind: "manual",
                  status: "complete",
                  sizeKb: Math.round(snapshot.length / 1024),
                  records: Object.values(
                    JSON.parse(snapshot).snapshot ?? {},
                  ).reduce(
                    (total: number, entries) =>
                      total + (Array.isArray(entries) ? entries.length : 0),
                    0,
                  ),
                  note: "",
                },
                { actor: undefined },
              );
              notify(
                "Backup created. Copy the JSON below and keep it somewhere safe.",
                "success",
              );
            }}
          />
          <Btn
            title="Restore from the box below"
            icon="upload"
            small
            theme={theme}
            disabled={!canManage || !backup.trim()}
            onPress={() => importSnapshot(backup)}
          />
          <Btn
            title="Backup history"
            icon="database"
            small
            theme={theme}
            onPress={() => go("/admin/r/backups")}
          />
        </Row>
        <TextBox
          value={backup}
          onChange={setBackup}
          multiline
          rows={6}
          placeholder="Paste a backup here to restore it"
          theme={theme}
          label="Backup JSON"
        />
      </Panel>

      <Panel title="Demo data" subtitle="Useful while setting the shop up">
        <Row gap={8} wrap>
          <Btn
            title="Restore the demo dataset"
            icon="rotate"
            small
            theme={theme}
            disabled={!canManage}
            onPress={() => void resetDemoData()}
          />
          <Btn
            title="Clear orders, customers and demo records"
            icon="broom"
            small
            tone="danger"
            theme={theme}
            disabled={!canManage}
            onPress={() => void clearBusinessData()}
          />
        </Row>
        <Row gap={8} align="flex-start">
          <Icon name="circle-info" size={12} color={theme.muted} />
          <A size={11.5} color={theme.muted} style={{ flex: 1 }}>
            Clearing keeps the catalogue, roles, templates, pages and
            configuration; it removes the generated orders, customers, carts,
            reviews and transactions.
          </A>
        </Row>
      </Panel>

      <Panel title="Where the data lives">
        <Col gap={6}>
          <Row gap={8}>
            <Pill label="This device" theme={theme} small />
            <A size={11.5} color={theme.muted} style={{ flex: 1 }}>
              Dashboard records are stored on this device and survive a restart.
            </A>
          </Row>
          <Row gap={8}>
            <Pill label="Shared" color={theme.info} theme={theme} small />
            <A size={11.5} color={theme.muted} style={{ flex: 1 }}>
              Publishing pushes the storefront configuration to the shared
              backend when Supabase is configured, so every customer device
              picks it up without an app release.
            </A>
          </Row>
        </Col>
      </Panel>
    </AdminShell>
  );
}
