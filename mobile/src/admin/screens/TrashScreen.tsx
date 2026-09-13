import { useMemo, useState } from "react";
import { View } from "react-native";
import { AdminShell, Panel } from "@/admin/ui/Shell";
import {
  A,
  Btn,
  Col,
  EmptyState,
  IconBtn,
  Pill,
  Row,
} from "@/admin/ui/primitives";
import { useAdmin } from "@/admin/AdminProvider";
import { useFormat } from "@/admin/ui/useFormat";
import { resources } from "@/admin/core/resources/index";
import { getPath } from "@/admin/core/query";
import { go } from "@/admin/navigate";

export function TrashScreen() {
  const { theme, store, write, allowed, notify, published, revision } =
    useAdmin();
  const format = useFormat();
  const [busy, setBusy] = useState(false);

  const groups = useMemo(
    () =>
      resources
        .map((resource) => ({
          resource,
          records: store
            .all(resource.key, true)
            .filter((record) => record.deletedAt),
        }))
        .filter((group) => group.records.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, revision],
  );

  const total = groups.reduce((sum, group) => sum + group.records.length, 0);
  const retention = published.security.trashRetentionDays;

  return (
    <AdminShell
      title="Trash"
      subtitle={`Deleted records are kept for ${retention} day(s) before they are removed for good`}
      actions={
        total > 0 ? (
          <Btn
            title={`Empty items older than ${retention} days`}
            icon="broom"
            small
            tone="danger"
            theme={theme}
            busy={busy}
            onPress={() => {
              setBusy(true);
              const removed = store.emptyTrash(retention, write);
              setBusy(false);
              notify(
                removed
                  ? `${removed} record(s) permanently deleted.`
                  : "Nothing was old enough to remove.",
                removed ? "danger" : "info",
              );
            }}
          />
        ) : undefined
      }
    >
      {groups.length ? (
        groups.map((group) => (
          <Panel
            key={group.resource.key}
            title={group.resource.label}
            subtitle={`${group.records.length} deleted`}
            actions={
              <Btn
                title="Open list"
                small
                theme={theme}
                onPress={() => go(`/admin/r/${group.resource.key}`)}
              />
            }
          >
            <Col gap={8}>
              {group.records.slice(0, 20).map((record) => (
                <Row key={record.id} justify="space-between" gap={10}>
                  <View style={{ flex: 1 }}>
                    <A size={12.5} numberOfLines={1}>
                      {String(
                        getPath(record, group.resource.labelField) ?? record.id,
                      )}
                    </A>
                    <A size={11} color={theme.muted}>
                      {`Deleted ${format.dateTime(record.deletedAt)}`}
                    </A>
                  </View>
                  <Row gap={6}>
                    <IconBtn
                      icon="rotate-left"
                      label="Restore"
                      theme={theme}
                      disabled={!allowed(group.resource.module, "edit")}
                      onPress={() => {
                        store.restore(group.resource.key, record.id, write);
                        notify("Restored.", "success");
                      }}
                    />
                    <IconBtn
                      icon="xmark"
                      label="Delete permanently"
                      tone="danger"
                      theme={theme}
                      disabled={!allowed(group.resource.module, "delete")}
                      onPress={() => {
                        store.purge(group.resource.key, record.id, write);
                        notify("Deleted permanently.", "danger");
                      }}
                    />
                  </Row>
                </Row>
              ))}
              {group.records.length > 20 && (
                <A
                  size={11}
                  color={theme.muted}
                >{`And ${group.records.length - 20} more.`}</A>
              )}
            </Col>
          </Panel>
        ))
      ) : (
        <EmptyState
          icon="trash-can"
          title="The trash is empty"
          detail="Deleting a product, customer or any other record puts it here first, so nothing is lost by accident."
          theme={theme}
        />
      )}

      {total > 0 && (
        <Row gap={8}>
          <Pill
            label={`${total} record(s) recoverable`}
            theme={theme}
            small
            color={theme.warning}
          />
        </Row>
      )}
    </AdminShell>
  );
}
