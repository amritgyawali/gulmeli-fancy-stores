import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { AdminShell, Panel } from "@/admin/ui/Shell";
import { A, Btn, Icon, Pill, Row, Tabs } from "@/admin/ui/primitives";
import { useAdmin } from "@/admin/AdminProvider";
import { MODULES } from "@/admin/core/resources/index";
import {
  PERMISSION_ACTIONS,
  type PermissionAction,
} from "@/admin/core/resource";
import { can, setModulePermissions, togglePermission } from "@/admin/core/rbac";
import { humanise } from "@/admin/core/format";
import { go } from "@/admin/navigate";

export function RolesScreen() {
  const {
    theme,
    store,
    roles,
    actor,
    allowed,
    savePermissions,
    notify,
    revision,
    write,
    signInAs,
  } = useAdmin();
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");

  const role = useMemo(
    () => roles.find((entry) => entry.id === roleId) ?? roles[0] ?? null,
    [roles, roleId],
  );

  const users = useMemo(
    () => store.all("admin_users"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, revision],
  );

  const canManage = allowed("users", "edit");

  if (!role) {
    return (
      <AdminShell title="Roles & permissions">
        <Panel title="No roles yet">
          <Btn
            title="Restore the built-in roles"
            theme={theme}
            onPress={() => go("/admin/settings")}
          />
        </Panel>
      </AdminShell>
    );
  }

  const wildcard = Boolean(role.permissions?.["*"]?.length);

  const toggle = (module: string, action: PermissionAction) => {
    if (!canManage) return;
    savePermissions(
      role.id,
      togglePermission(role.permissions ?? {}, module, action),
    );
  };

  const toggleModule = (module: string, granted: boolean) => {
    if (!canManage) return;
    savePermissions(
      role.id,
      setModulePermissions(role.permissions ?? {}, module, granted),
    );
  };

  return (
    <AdminShell
      title="Roles & permissions"
      subtitle="Exactly what each role can view, create, edit, delete, export, publish and refund"
      actions={
        <Row gap={6}>
          <Btn
            title="Admin users"
            icon="user-shield"
            small
            theme={theme}
            onPress={() => go("/admin/r/admin_users")}
          />
          {canManage && (
            <Btn
              title="New role"
              icon="plus"
              tone="primary"
              small
              theme={theme}
              onPress={() => go("/admin/r/roles/new")}
            />
          )}
        </Row>
      }
    >
      <Tabs
        tabs={roles.map((entry) => ({ key: entry.id, label: entry.name }))}
        active={role.id}
        onChange={setRoleId}
        theme={theme}
      />

      <Panel
        title={role.name}
        subtitle={role.description}
        actions={
          <Row gap={6}>
            {role.builtIn && <Pill label="Built-in" theme={theme} small />}
            <Btn
              title="Edit details"
              icon="pen"
              small
              theme={theme}
              onPress={() => go(`/admin/r/roles/${role.id}`)}
            />
          </Row>
        }
      >
        <Row gap={8} wrap>
          <A size={12} color={theme.muted}>
            {`${users.filter((user) => user.roleId === role.id).length} admin user(s) have this role.`}
          </A>
          {actor.roleId === role.id && (
            <Pill label="Your role" color={theme.info} theme={theme} small />
          )}
        </Row>
        {wildcard && (
          <Row gap={8}>
            <Icon name="crown" size={12} color={theme.warning} />
            <A size={12} color={theme.muted} style={{ flex: 1 }}>
              This role has full access to every module. The grid below is shown
              for reference.
            </A>
          </Row>
        )}
      </Panel>

      <Panel
        title="Permission grid"
        subtitle="Tap a cell to grant or remove that right"
      >
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <Row
              gap={8}
              style={{
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              <A
                size={11}
                weight="700"
                color={theme.muted}
                style={{ width: 150 }}
              >
                MODULE
              </A>
              {PERMISSION_ACTIONS.map((action) => (
                <A
                  key={action}
                  size={11}
                  weight="700"
                  color={theme.muted}
                  style={{ width: 62 }}
                >
                  {humanise(action)}
                </A>
              ))}
              <A
                size={11}
                weight="700"
                color={theme.muted}
                style={{ width: 70 }}
              >
                ALL
              </A>
            </Row>
            {MODULES.map((module) => (
              <Row
                key={module}
                gap={8}
                style={{
                  paddingVertical: 6,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                }}
              >
                <A size={12} style={{ width: 150 }} numberOfLines={1}>
                  {humanise(module)}
                </A>
                {PERMISSION_ACTIONS.map((action) => {
                  const granted = can(role, module, action);
                  const inherited =
                    wildcard && !role.permissions?.[module]?.includes(action);
                  return (
                    <Pressable
                      key={action}
                      accessibilityRole="checkbox"
                      accessibilityLabel={`${humanise(action)} ${humanise(module)} for ${role.name}`}
                      aria-checked={granted}
                      disabled={!canManage}
                      onPress={() => toggle(module, action)}
                      style={{ width: 62, alignItems: "flex-start" }}
                    >
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 5,
                          borderWidth: 1,
                          borderColor: granted ? theme.success : theme.border,
                          backgroundColor: granted
                            ? inherited
                              ? `${theme.success}55`
                              : theme.success
                            : "transparent",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: canManage ? 1 : 0.5,
                        }}
                      >
                        {granted && (
                          <Icon name="check" size={10} color="#ffffff" />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
                <Row gap={4} style={{ width: 70 }}>
                  <Btn
                    title="All"
                    small
                    theme={theme}
                    disabled={!canManage}
                    onPress={() => toggleModule(module, true)}
                  />
                  <Btn
                    title="None"
                    small
                    tone="ghost"
                    theme={theme}
                    disabled={!canManage}
                    onPress={() => toggleModule(module, false)}
                  />
                </Row>
              </Row>
            ))}
          </View>
        </ScrollView>
      </Panel>

      <Panel
        title="Sign in as"
        subtitle="Check what each admin actually sees, without leaving the dashboard"
      >
        <Row gap={8} wrap>
          {users.map((user) => (
            <Btn
              key={user.id}
              title={`${user.name} · ${roles.find((entry) => entry.id === user.roleId)?.name ?? "No role"}`}
              icon={actor.id === user.id ? "circle-check" : "user"}
              small
              tone={actor.id === user.id ? "success" : "neutral"}
              theme={theme}
              onPress={() => {
                signInAs(user.id);
                store.update(
                  "admin_users",
                  user.id,
                  { lastLoginAt: new Date().toISOString() },
                  { ...write, silent: true },
                );
                store.log("login", "users", `${user.name} signed in`, {
                  id: user.id,
                  name: String(user.name),
                  roleId: String(user.roleId ?? ""),
                });
                notify(`Now working as ${user.name}.`, "success");
              }}
            />
          ))}
        </Row>
        <A size={11} color={theme.muted}>
          Switching here changes which parts of the dashboard are available and
          who the audit log records.
        </A>
      </Panel>
    </AdminShell>
  );
}
