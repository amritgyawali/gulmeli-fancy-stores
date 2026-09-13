import { useMemo, useState } from "react";
import { View } from "react-native";
import { AdminShell, Panel } from "@/admin/ui/Shell";
import {
  A,
  Btn,
  Col,
  EmptyState,
  Icon,
  Pill,
  Row,
  Tabs,
} from "@/admin/ui/primitives";
import { Toggle } from "@/admin/ui/inputs";
import { useAdmin } from "@/admin/AdminProvider";
import { useFormat } from "@/admin/ui/useFormat";
import {
  ACTION_LABELS,
  describeRule,
  evaluateAutomations,
  TRIGGER_LABELS,
  type AutomationRule,
} from "@/admin/core/automation";
import { go } from "@/admin/navigate";

export function AutomationScreen() {
  const { theme, store, write, data, allowed, notify, revision } = useAdmin();
  const format = useFormat();
  const [tab, setTab] = useState<"rules" | "matches" | "log">("rules");

  const rules = useMemo(
    () =>
      store
        .all<AutomationRule>("automations")
        .sort((a, b) => a.name.localeCompare(b.name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, revision],
  );

  const matches = useMemo(
    () => evaluateAutomations(rules, data),
    [rules, data],
  );

  const log = useMemo(
    () =>
      store
        .audit({ pageSize: 40 })
        .items.filter((entry) => entry.resource === "automations"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, revision],
  );

  const canEdit = allowed("automation", "edit");

  const runRule = (rule: AutomationRule) => {
    const hits = matches.filter((match) => match.ruleId === rule.id);
    store.update(
      "automations",
      rule.id,
      {
        lastRunAt: new Date().toISOString(),
        runCount: (Number(rule.runCount) || 0) + 1,
      },
      { ...write, silent: true },
    );
    store.log(
      "run",
      "automations",
      `${rule.name} matched ${hits.length} record(s) — ${ACTION_LABELS[rule.action]}`,
      write.actor,
    );
    if (rule.action === "assign_vip") {
      for (const match of hits) {
        if (match.subject.resource !== "customers") continue;
        store.update(
          "customers",
          match.subject.id,
          { vip: true },
          { ...write, silent: true },
        );
      }
    }
    if (rule.action === "tag_customer" && rule.actionValue) {
      for (const match of hits) {
        if (match.subject.resource !== "customers") continue;
        const customer = store.get("customers", match.subject.id);
        const tags = Array.isArray(customer?.tags)
          ? customer.tags.map(String)
          : [];
        if (!tags.includes(rule.actionValue))
          store.update(
            "customers",
            match.subject.id,
            { tags: [...tags, rule.actionValue] },
            { ...write, silent: true },
          );
      }
    }
    if (rule.action === "notify_admin" && hits.length) {
      store.create(
        "notifications",
        {
          title: rule.name,
          body: hits
            .slice(0, 5)
            .map((match) => match.message)
            .join("\n"),
          channels: ["in_app"],
          topic: "system",
          audience: "all",
          status: "sent",
          scheduledFor: new Date().toISOString(),
          sentAt: new Date().toISOString(),
          recipients: 1,
          opens: 0,
        },
        { ...write, silent: true },
      );
    }
    notify(
      hits.length
        ? `${rule.name} matched ${hits.length} record(s). The outcome is in the run log.`
        : `${rule.name} matched nothing right now.`,
      hits.length ? "success" : "info",
    );
  };

  return (
    <AdminShell
      title="Automation"
      subtitle="When something happens in the shop, do something about it"
      actions={
        canEdit ? (
          <Btn
            title="New rule"
            icon="plus"
            tone="primary"
            small
            theme={theme}
            onPress={() => go("/admin/r/automations/new")}
          />
        ) : undefined
      }
    >
      <Tabs
        tabs={[
          {
            key: "rules",
            label: "Rules",
            badge: rules.filter((rule) => rule.enabled).length,
          },
          {
            key: "matches",
            label: "What would run now",
            badge: matches.length,
          },
          { key: "log", label: "Run log" },
        ]}
        active={tab}
        onChange={(next) => setTab(next as "rules" | "matches" | "log")}
        theme={theme}
      />

      {tab === "rules" &&
        (rules.length ? (
          rules.map((rule) => {
            const hits = matches.filter(
              (match) => match.ruleId === rule.id,
            ).length;
            return (
              <Panel
                key={rule.id}
                title={rule.name}
                subtitle={describeRule(rule)}
                actions={
                  <Row gap={6}>
                    {rule.enabled && hits > 0 && (
                      <Pill
                        label={`${hits} match(es)`}
                        color={theme.warning}
                        theme={theme}
                        small
                      />
                    )}
                    <Btn
                      title="Run now"
                      icon="play"
                      small
                      theme={theme}
                      disabled={!canEdit || !rule.enabled}
                      onPress={() => runRule(rule)}
                    />
                    <Btn
                      title="Edit"
                      icon="pen"
                      small
                      theme={theme}
                      onPress={() => go(`/admin/r/automations/${rule.id}`)}
                    />
                  </Row>
                }
              >
                <Toggle
                  value={rule.enabled}
                  onChange={(value) =>
                    store.update(
                      "automations",
                      rule.id,
                      { enabled: value },
                      write,
                    )
                  }
                  label="Rule enabled"
                  theme={theme}
                />
                <Row gap={10} wrap>
                  <Pill
                    label={TRIGGER_LABELS[rule.trigger] ?? rule.trigger}
                    theme={theme}
                    small
                    color={theme.info}
                  />
                  <Pill
                    label={ACTION_LABELS[rule.action] ?? rule.action}
                    theme={theme}
                    small
                  />
                  {!!rule.runCount && (
                    <A size={11} color={theme.muted}>
                      {`Run ${rule.runCount} time(s), last ${format.dateTime(rule.lastRunAt)}`}
                    </A>
                  )}
                </Row>
              </Panel>
            );
          })
        ) : (
          <EmptyState
            icon="robot"
            title="No automation rules yet"
            theme={theme}
          />
        ))}

      {tab === "matches" && (
        <Panel
          title="Ready to act"
          subtitle="What each enabled rule matches against the data right now"
        >
          {matches.length ? (
            <Col gap={9}>
              {matches.slice(0, 60).map((match, index) => (
                <Row
                  key={`${match.ruleId}-${match.subject.id}-${index}`}
                  gap={10}
                  align="flex-start"
                >
                  <Icon name="bolt" size={12} color={theme.warning} />
                  <View style={{ flex: 1 }}>
                    <A size={12.5}>{match.message}</A>
                    <A size={11} color={theme.muted}>
                      {`${match.ruleName} → ${ACTION_LABELS[match.action]}${match.actionValue ? ` (${match.actionValue})` : ""}`}
                    </A>
                  </View>
                  <Btn
                    title="Open"
                    small
                    theme={theme}
                    onPress={() =>
                      go(
                        `/admin/r/${match.subject.resource}/${match.subject.id}`,
                      )
                    }
                  />
                </Row>
              ))}
              {matches.length > 60 && (
                <A
                  size={11}
                  color={theme.muted}
                >{`And ${matches.length - 60} more.`}</A>
              )}
            </Col>
          ) : (
            <EmptyState
              icon="circle-check"
              title="Nothing matches right now"
              theme={theme}
            />
          )}
        </Panel>
      )}

      {tab === "log" && (
        <Panel
          title="Run log"
          subtitle="Every time a rule was run, and what it matched"
        >
          {log.length ? (
            <Col gap={9}>
              {log.map((entry) => (
                <Row key={entry.id} gap={10} align="flex-start">
                  <Icon
                    name="clock-rotate-left"
                    size={12}
                    color={theme.muted}
                  />
                  <View style={{ flex: 1 }}>
                    <A size={12.5}>{entry.recordLabel}</A>
                    <A size={11} color={theme.muted}>
                      {`${entry.actorName} · ${format.dateTime(entry.createdAt)}`}
                    </A>
                  </View>
                </Row>
              ))}
            </Col>
          ) : (
            <EmptyState
              icon="clock-rotate-left"
              title="No rules have been run yet"
              theme={theme}
            />
          )}
        </Panel>
      )}

      <Panel title="How delivery works">
        <Row gap={8} align="flex-start">
          <Icon name="circle-info" size={12} color={theme.muted} />
          <A size={11.5} color={theme.muted} style={{ flex: 1 }}>
            Rules are evaluated against live data and the outcome is recorded
            here. Actions that change records — tagging a customer, granting
            VIP, raising an admin notification — are applied immediately. Email,
            SMS and push delivery goes out through the provider configured under
            Integrations.
          </A>
        </Row>
      </Panel>
    </AdminShell>
  );
}
