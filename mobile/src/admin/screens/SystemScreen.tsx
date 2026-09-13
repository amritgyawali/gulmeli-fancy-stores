import { useMemo } from "react";
import { View } from "react-native";
import { AdminShell, Panel } from "@/admin/ui/Shell";
import {
  A,
  Btn,
  Col,
  Grid,
  Icon,
  Pill,
  Row,
  StatTile,
} from "@/admin/ui/primitives";
import { Toggle } from "@/admin/ui/inputs";
import { useLayout } from "@/admin/ui/theme";
import { useAdmin } from "@/admin/AdminProvider";
import { useFormat } from "@/admin/ui/useFormat";
import { setConfigValue } from "@/admin/core/config";
import { fraudSignals } from "@/admin/core/assist";
import { backendConfig } from "@/services/backend-config";
import { go } from "@/admin/navigate";

export function SystemScreen() {
  const {
    theme,
    store,
    data,
    draft,
    setDraft,
    allowed,
    revision,
    dirty,
    publish,
  } = useAdmin();
  const format = useFormat();
  const layout = useLayout();

  const errors = useMemo(
    () => store.all("error_logs"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, revision],
  );
  const webhookFailures = useMemo(
    () =>
      store.all("webhook_logs").filter((entry) => entry.status === "failed"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, revision],
  );
  const logins = useMemo(
    () =>
      store
        .audit({ pageSize: 20 })
        .items.filter((entry) => entry.action === "login"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, revision],
  );
  const suspicious = useMemo(() => fraudSignals(data), [data]);

  const canEdit = allowed("system", "edit") || allowed("settings", "edit");
  const set = (path: string, value: unknown) =>
    setDraft(setConfigValue(draft, path, value));

  return (
    <AdminShell
      title="System"
      subtitle="Maintenance mode, monitoring, security signals and where the data lives"
      actions={
        dirty ? (
          <Btn
            title="Publish changes"
            icon="cloud-arrow-up"
            tone="primary"
            small
            theme={theme}
            onPress={() => void publish()}
          />
        ) : undefined
      }
    >
      <Grid columns={layout.columns} gap={12}>
        <StatTile
          label="Errors logged"
          value={format.number(
            errors.filter((entry) => !entry.resolved).length,
          )}
          icon="triangle-exclamation"
          tone={
            errors.some((entry) => !entry.resolved) ? theme.danger : undefined
          }
          theme={theme}
          onPress={() => go("/admin/r/error_logs")}
        />
        <StatTile
          label="Failed webhooks"
          value={format.number(webhookFailures.length)}
          icon="code-branch"
          theme={theme}
          onPress={() => go("/admin/r/webhook_logs")}
        />
        <StatTile
          label="Failed payments"
          value={format.number(
            data.transactions.filter((entry) => entry.status === "failed")
              .length,
          )}
          icon="credit-card"
          theme={theme}
          onPress={() => go("/admin/r/transactions")}
        />
        <StatTile
          label="Orders worth checking"
          value={format.number(suspicious.length)}
          icon="user-secret"
          tone={suspicious.length ? theme.warning : undefined}
          theme={theme}
        />
      </Grid>

      <Panel
        title="Maintenance mode"
        subtitle="Take the app or the website offline with a message, without a release"
      >
        <Toggle
          value={draft.app.maintenanceMode}
          onChange={(value) => canEdit && set("app.maintenanceMode", value)}
          label="App maintenance mode"
          theme={theme}
        />
        <Toggle
          value={draft.website.maintenanceMode}
          onChange={(value) => canEdit && set("website.maintenanceMode", value)}
          label="Website maintenance mode"
          theme={theme}
        />
        <Toggle
          value={draft.website.allowAdminsDuringMaintenance}
          onChange={(value) =>
            canEdit && set("website.allowAdminsDuringMaintenance", value)
          }
          label="Admins can still browse while it is on"
          theme={theme}
        />
        <A size={11.5} color={theme.muted}>
          Customers see: “{draft.app.maintenanceMessage}”
          {draft.app.maintenanceEta
            ? ` Expected back: ${draft.app.maintenanceEta}.`
            : ""}
        </A>
        <Btn
          title="Edit the messages"
          icon="pen"
          small
          theme={theme}
          onPress={() => go("/admin/settings")}
        />
      </Panel>

      <Panel title="Backend connection">
        <Row gap={8} wrap>
          <Pill
            label={
              backendConfig.live ? "Supabase connected" : "Local preview mode"
            }
            color={backendConfig.live ? theme.success : theme.muted}
            theme={theme}
            small
          />
          {!!backendConfig.error && (
            <Pill
              label="Configuration problem"
              color={theme.danger}
              theme={theme}
              small
            />
          )}
        </Row>
        {!!backendConfig.error && (
          <A size={11.5} color={theme.danger}>
            {backendConfig.error}
          </A>
        )}
        <A size={11.5} color={theme.muted}>
          {backendConfig.live
            ? "Publishing sends the storefront configuration to the shared backend, so every customer device picks it up."
            : "Set EXPO_PUBLIC_BACKEND=supabase with your project URL and publishable key to share configuration across devices."}
        </A>
      </Panel>

      <Panel
        title="Orders worth a second look"
        subtitle="Flagged on value, guest checkout, failed payment, incomplete address or repeated email"
      >
        {suspicious.length ? (
          <Col gap={9}>
            {suspicious.slice(0, 10).map((entry) => (
              <Row key={entry.order.id} gap={10} align="flex-start">
                <Icon name="flag" size={12} color={theme.warning} />
                <View style={{ flex: 1 }}>
                  <A size={12.5} weight="600">
                    {`${entry.order.number} — ${format.money(entry.order.total)}`}
                  </A>
                  <A size={11} color={theme.muted}>
                    {entry.reasons.join(" ")}
                  </A>
                </View>
                <Btn
                  title="Open"
                  small
                  theme={theme}
                  onPress={() => go(`/admin/r/orders/${entry.order.id}`)}
                />
              </Row>
            ))}
          </Col>
        ) : (
          <A size={12} color={theme.muted}>
            Nothing looks unusual.
          </A>
        )}
      </Panel>

      <Panel title="Recent admin sign-ins">
        {logins.length ? (
          logins.slice(0, 8).map((entry) => (
            <Row key={entry.id} justify="space-between" gap={8}>
              <A size={12}>{entry.recordLabel || entry.actorName}</A>
              <A size={11} color={theme.muted}>
                {format.dateTime(entry.createdAt)}
              </A>
            </Row>
          ))
        ) : (
          <A size={12} color={theme.muted}>
            No sign-ins recorded yet.
          </A>
        )}
      </Panel>

      <Panel title="Monitoring">
        <Row gap={8} wrap>
          <Btn
            title="Error log"
            icon="triangle-exclamation"
            small
            theme={theme}
            onPress={() => go("/admin/r/error_logs")}
          />
          <Btn
            title="Webhook log"
            icon="code-branch"
            small
            theme={theme}
            onPress={() => go("/admin/r/webhook_logs")}
          />
          <Btn
            title="Audit log"
            icon="clock-rotate-left"
            small
            theme={theme}
            onPress={() => go("/admin/r/audit_logs")}
          />
          <Btn
            title="Backups"
            icon="database"
            small
            theme={theme}
            onPress={() => go("/admin/r/backups")}
          />
          <Btn
            title="Trash"
            icon="trash-can"
            small
            theme={theme}
            onPress={() => go("/admin/trash")}
          />
        </Row>
      </Panel>
    </AdminShell>
  );
}
