import {
  useMemo,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  A,
  Btn,
  Card,
  Col,
  Divider,
  EmptyState,
  Icon,
  IconBtn,
  Pill,
  Row,
} from "./primitives";
import { TextBox } from "./inputs";
import { useLayout, type AdminTheme } from "./theme";
import { useAdmin } from "@/admin/AdminProvider";
import {
  NAVIGATION,
  type NavItem,
  type NavSection,
} from "@/admin/core/resources/index";
import { filterCommands, globalSearch } from "@/admin/core/search";
import { go } from "@/admin/navigate";

function badgeCount(
  kind: NavItem["badge"],
  admin: ReturnType<typeof useAdmin>,
): number {
  if (!kind) return 0;
  const { data } = admin;
  switch (kind) {
    case "pendingOrders":
      return data.orders.filter((order) =>
        ["pending", "confirmed", "processing"].includes(order.status),
      ).length;
    case "openTickets":
      return data.tickets.filter((ticket) => ticket.status === "open").length;
    case "pendingReviews":
      return data.reviews.filter((review) => review.status === "pending")
        .length;
    case "returnRequests":
      return data.returns.filter((entry) => entry.status === "requested")
        .length;
    case "lowStock":
      return data.products.filter(
        (product) =>
          !product.unlimitedStock &&
          Number(product.stock) <= Number(product.lowStockThreshold ?? 5),
      ).length;
    default:
      return 0;
  }
}

function NavRow({
  label,
  icon,
  active,
  badge,
  depth = 0,
  theme,
  onPress,
  trailing,
}: {
  label: string;
  icon: string;
  active: boolean;
  badge?: number;
  depth?: number;
  theme: AdminTheme;
  onPress: () => void;
  trailing?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      aria-current={active ? "page" : undefined}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        paddingLeft: 10 + depth * 16,
        borderRadius: theme.radius,
        backgroundColor: active
          ? `${theme.primary}16`
          : pressed
            ? theme.background
            : "transparent",
      })}
    >
      <Icon
        name={icon}
        size={13}
        color={active ? theme.primary : theme.muted}
      />
      <A
        size={12.5}
        weight={active ? "700" : "500"}
        color={active ? theme.primary : theme.text}
        numberOfLines={1}
        style={{ flex: 1 }}
      >
        {label}
      </A>
      {!!badge && badge > 0 && (
        <Pill label={String(badge)} color={theme.danger} theme={theme} small />
      )}
      {trailing}
    </Pressable>
  );
}

function Sidebar({
  theme,
  pathname,
  onNavigate,
}: {
  theme: AdminTheme;
  pathname: string;
  onNavigate: () => void;
}) {
  const admin = useAdmin();
  const { allowed, published } = admin;
  const [expanded, setExpanded] = useState<string[]>([]);

  const sections = useMemo(
    () =>
      NAVIGATION.map((section) => ({
        ...section,
        items: section.items?.filter((item) => allowed(item.module)),
      })).filter(
        (section) =>
          allowed(section.module) ||
          (section.items && section.items.length > 0),
      ),
    [allowed],
  );

  const isActive = (route: string) =>
    route === "/admin" ? pathname === "/admin" : pathname.startsWith(route);

  const openSection = (section: NavSection) =>
    expanded.includes(section.label) ||
    Boolean(section.items?.some((item) => isActive(item.route)));

  return (
    <View style={{ flex: 1 }}>
      <Row gap={10} style={{ padding: 14 }}>
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            backgroundColor: theme.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <A size={13} weight="700" color="#ffffff">
            {published.branding.companyName.slice(0, 1).toUpperCase()}
          </A>
        </View>
        <View style={{ flex: 1 }}>
          <A size={13} weight="700" numberOfLines={1}>
            {published.branding.companyName}
          </A>
          <A size={10.5} color={theme.muted}>
            Control centre
          </A>
        </View>
      </Row>
      <Divider theme={theme} />
      <ScrollView
        contentContainerStyle={{ padding: 8, paddingBottom: 30, gap: 1 }}
      >
        {sections.map((section) => {
          if (!section.items?.length) {
            const route = section.route ?? "/admin";
            return (
              <NavRow
                key={section.label}
                label={section.label}
                icon={section.icon}
                active={isActive(route)}
                theme={theme}
                onPress={() => {
                  go(route);
                  onNavigate();
                }}
              />
            );
          }
          const open = openSection(section);
          return (
            <View key={section.label}>
              <NavRow
                label={section.label}
                icon={section.icon}
                active={false}
                theme={theme}
                onPress={() =>
                  setExpanded((current) =>
                    current.includes(section.label)
                      ? current.filter((entry) => entry !== section.label)
                      : [...current, section.label],
                  )
                }
                trailing={
                  <Icon
                    name={open ? "chevron-up" : "chevron-down"}
                    size={9}
                    color={theme.muted}
                  />
                }
              />
              {open &&
                section.items.map((item) => (
                  <NavRow
                    key={item.route}
                    label={item.label}
                    icon={item.icon}
                    depth={1}
                    active={isActive(item.route)}
                    badge={badgeCount(item.badge, admin)}
                    theme={theme}
                    onPress={() => {
                      go(item.route);
                      onNavigate();
                    }}
                  />
                ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function CommandPalette({
  visible,
  onClose,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  theme: AdminTheme;
}) {
  const { store, allowed } = useAdmin();
  const [term, setTerm] = useState("");
  const commands = useMemo(
    () => filterCommands(term, (module) => allowed(module)),
    [term, allowed],
  );
  const hits = useMemo(() => globalSearch(store, term), [store, term]);

  const open = (route: string) => {
    setTerm("");
    onClose();
    go(route);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close search"
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "#00000066",
          padding: 16,
          justifyContent: "flex-start",
        }}
      >
        <Pressable
          accessibilityRole="none"
          onPress={() => undefined}
          style={{
            marginTop: 60,
            alignSelf: "center",
            width: "100%",
            maxWidth: 620,
            backgroundColor: theme.surface,
            borderRadius: theme.cardRadius,
            overflow: "hidden",
          }}
        >
          <View style={{ padding: 12 }}>
            <TextBox
              value={term}
              onChange={setTerm}
              placeholder="Search products, orders, customers, settings — or type an action"
              theme={theme}
              label="Global search"
              testID="admin-global-search"
            />
          </View>
          <Divider theme={theme} />
          <ScrollView style={{ maxHeight: 420 }}>
            {!!commands.length && (
              <View style={{ padding: 8 }}>
                <A
                  size={10.5}
                  weight="700"
                  color={theme.muted}
                  style={{ padding: 6 }}
                >
                  QUICK ACTIONS
                </A>
                {commands.map((action) => (
                  <Pressable
                    key={action.id}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                    onPress={() => open(action.route)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      padding: 10,
                      borderRadius: theme.radius,
                      backgroundColor: pressed
                        ? theme.background
                        : "transparent",
                    })}
                  >
                    <Icon name={action.icon} size={13} color={theme.primary} />
                    <View style={{ flex: 1 }}>
                      <A size={13} weight="600">
                        {action.label}
                      </A>
                      <A size={11} color={theme.muted}>
                        {action.hint}
                      </A>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
            {!!hits.length && (
              <View style={{ padding: 8 }}>
                <A
                  size={10.5}
                  weight="700"
                  color={theme.muted}
                  style={{ padding: 6 }}
                >
                  RESULTS
                </A>
                {hits.map((hit) => (
                  <Pressable
                    key={hit.id}
                    accessibilityRole="button"
                    accessibilityLabel={hit.title}
                    onPress={() => open(hit.route)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      padding: 10,
                      borderRadius: theme.radius,
                      backgroundColor: pressed
                        ? theme.background
                        : "transparent",
                    })}
                  >
                    <Icon name={hit.icon} size={13} color={theme.muted} />
                    <View style={{ flex: 1 }}>
                      <A size={13} numberOfLines={1}>
                        {hit.title}
                      </A>
                      <A size={11} color={theme.muted} numberOfLines={1}>
                        {hit.subtitle}
                      </A>
                    </View>
                    <Pill
                      label={hit.group}
                      theme={theme}
                      small
                      color={theme.muted}
                    />
                  </Pressable>
                ))}
              </View>
            )}
            {term.length >= 2 && !hits.length && !commands.length && (
              <EmptyState
                icon="magnifying-glass"
                title="Nothing matched"
                detail="Try a product name, an order number, a customer email or a setting."
                theme={theme}
              />
            )}
            {term.length < 2 && !commands.length && (
              <EmptyState
                icon="keyboard"
                title="Search everything"
                detail="Products, orders, customers, SKUs, categories, coupons, pages, settings and support tickets."
                theme={theme}
              />
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Toasts({ theme }: { theme: AdminTheme }) {
  const { toasts, dismissToast } = useAdmin();
  if (!toasts.length) return null;
  return (
    <View
      style={{ position: "absolute", left: 12, right: 12, bottom: 16, gap: 8 }}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => {
        const tint =
          toast.tone === "danger"
            ? theme.danger
            : toast.tone === "success"
              ? theme.success
              : theme.text;
        return (
          <Pressable
            key={toast.id}
            accessibilityRole="button"
            accessibilityLabel="Dismiss message"
            onPress={() => dismissToast(toast.id)}
            style={{
              alignSelf: "center",
              maxWidth: 560,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: theme.text,
              borderRadius: theme.cardRadius,
              paddingVertical: 10,
              paddingHorizontal: 14,
              boxShadow: "0px 4px 14px rgba(0,0,0,0.18)",
            }}
          >
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: tint === theme.text ? "#ffffff" : tint,
              }}
            />
            <A size={12.5} color="#ffffff">
              {toast.message}
            </A>
          </Pressable>
        );
      })}
    </View>
  );
}

export interface ShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  onBack?: () => void;
  scroll?: boolean;
}

/** Docked sidebar on desktop, slide-over drawer everywhere else. */
export function AdminShell({
  title,
  subtitle,
  actions,
  onBack,
  scroll = true,
  children,
}: PropsWithChildren<ShellProps>) {
  const { theme, dirty, snapshotError, ready } = useAdmin();
  const layout = useLayout();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={{
        padding: layout.compact ? 12 : 18,
        gap: 14,
        paddingBottom: 60,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, padding: layout.compact ? 12 : 18 }}>
      {children}
    </View>
  );

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <View style={{ flex: 1, flexDirection: "row" }}>
        {layout.wide && (
          <View
            style={{
              width: 248,
              borderRightWidth: 1,
              borderRightColor: theme.border,
              backgroundColor: theme.surface,
            }}
          >
            <Sidebar
              theme={theme}
              pathname={pathname}
              onNavigate={() => undefined}
            />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Row
            gap={10}
            style={{
              paddingHorizontal: layout.compact ? 12 : 18,
              paddingVertical: 10,
              backgroundColor: theme.surface,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            {!layout.wide && (
              <IconBtn
                icon="bars"
                label="Open the menu"
                theme={theme}
                onPress={() => setDrawer(true)}
              />
            )}
            {!!onBack && (
              <IconBtn
                icon="arrow-left"
                label="Go back"
                theme={theme}
                onPress={onBack}
              />
            )}
            <View style={{ flex: 1 }}>
              <A
                size={layout.compact ? 14 : 16}
                weight="700"
                numberOfLines={1}
                accessibilityRole="header"
              >
                {title}
              </A>
              {!!subtitle && (
                <A size={11.5} color={theme.muted} numberOfLines={1}>
                  {subtitle}
                </A>
              )}
            </View>
            <IconBtn
              icon="magnifying-glass"
              label="Search everything"
              theme={theme}
              onPress={() => setPalette(true)}
            />
            {!layout.compact && actions}
          </Row>

          {layout.compact && !!actions && (
            <Row
              gap={8}
              wrap
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: theme.surface,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              {actions}
            </Row>
          )}

          {!!snapshotError && (
            <View style={{ padding: 10, backgroundColor: "#fef2f2" }}>
              <A size={11.5} color={theme.danger} accessibilityRole="alert">
                {snapshotError}
              </A>
            </View>
          )}
          {dirty && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Review unpublished changes"
              onPress={() => go("/admin/appearance")}
              style={{
                paddingVertical: 7,
                paddingHorizontal: 14,
                backgroundColor: `${theme.warning}18`,
              }}
            >
              <A size={11.5} color={theme.warning}>
                You have unpublished storefront changes. Preview and publish
                them on Appearance.
              </A>
            </Pressable>
          )}

          {ready ? (
            body
          ) : (
            <EmptyState
              icon="spinner"
              title="Loading the dashboard…"
              theme={theme}
            />
          )}
        </View>
      </View>

      <Modal
        visible={drawer}
        transparent
        animationType="fade"
        onRequestClose={() => setDrawer(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close the menu"
          onPress={() => setDrawer(false)}
          style={{
            flex: 1,
            flexDirection: "row",
            backgroundColor: "#00000055",
          }}
        >
          <Pressable
            accessibilityRole="none"
            onPress={() => undefined}
            style={{ width: 268, backgroundColor: theme.surface }}
          >
            <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
              <Sidebar
                theme={theme}
                pathname={pathname}
                onNavigate={() => setDrawer(false)}
              />
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>

      <CommandPalette
        visible={palette}
        onClose={() => setPalette(false)}
        theme={theme}
      />
      <Toasts theme={theme} />
    </SafeAreaView>
  );
}

/** A titled block used by most screens. */
export function Panel({
  title,
  subtitle,
  actions,
  children,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}>) {
  const { theme } = useAdmin();
  return (
    <Card theme={theme}>
      <Row
        justify="space-between"
        align="flex-start"
        gap={10}
        style={{ marginBottom: 10 }}
      >
        <View style={{ flexShrink: 1 }}>
          <A size={14} weight="700">
            {title}
          </A>
          {!!subtitle && (
            <A size={11.5} color={theme.muted}>
              {subtitle}
            </A>
          )}
        </View>
        {!!actions && (
          <Row gap={6} wrap>
            {actions}
          </Row>
        )}
      </Row>
      <Col gap={10}>{children}</Col>
    </Card>
  );
}

export { Btn };
