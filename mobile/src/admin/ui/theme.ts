import { useWindowDimensions } from "react-native";
import { defaultConfig, type StorefrontConfig } from "@/admin/core/config";

export interface AdminTheme {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  raised: string;
  text: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  radius: number;
  cardRadius: number;
  gap: number;
  font: number;
  shadow: string;
}

/**
 * The dashboard is themed from the same document the storefront reads, so the
 * operator sees their brand while they work. Only the neutrals are fixed, to
 * keep dense data legible whatever the brand colour is.
 */
export function adminTheme(
  config: StorefrontConfig = defaultConfig,
): AdminTheme {
  const { theme } = config;
  return {
    primary: theme.primaryColor,
    accent: theme.accentColor,
    background: "#f6f7f9",
    surface: "#ffffff",
    raised: "#fbfbfc",
    text: "#161719",
    muted: "#6b7280",
    border: "#e5e7eb",
    success: theme.successColor,
    warning: theme.warningColor,
    danger: theme.dangerColor,
    info: "#2563eb",
    radius: 8,
    cardRadius: 12,
    gap: 12,
    font: 13,
    shadow: "0px 1px 3px rgba(15,17,20,0.08)",
  };
}

export type Breakpoint = "phone" | "tablet" | "desktop";

export interface Layout {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  /** Sidebar is docked rather than shown as a drawer. */
  wide: boolean;
  /** Columns for KPI tiles and form fields. */
  columns: number;
  compact: boolean;
}

/** One place decides how the dashboard reflows, so every screen agrees. */
export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  const breakpoint: Breakpoint =
    width >= 1100 ? "desktop" : width >= 760 ? "tablet" : "phone";
  return {
    width,
    height,
    breakpoint,
    wide: breakpoint === "desktop",
    columns: breakpoint === "desktop" ? 4 : breakpoint === "tablet" ? 2 : 1,
    compact: breakpoint === "phone",
  };
}

export const STATUS_COLORS: Record<string, string> = {
  published: "#16a34a",
  draft: "#6b7280",
  scheduled: "#2563eb",
  archived: "#9ca3af",
  pending: "#d97706",
  confirmed: "#2563eb",
  processing: "#2563eb",
  packed: "#7c3aed",
  ready_to_ship: "#7c3aed",
  shipped: "#0891b2",
  out_for_delivery: "#0891b2",
  delivered: "#16a34a",
  cancelled: "#dc2626",
  returned: "#b45309",
  refunded: "#b45309",
  failed: "#dc2626",
  paid: "#16a34a",
  unpaid: "#d97706",
  partially_refunded: "#b45309",
  open: "#dc2626",
  resolved: "#16a34a",
  closed: "#6b7280",
  urgent: "#dc2626",
  high: "#ea580c",
  normal: "#2563eb",
  low: "#6b7280",
  approved: "#16a34a",
  rejected: "#dc2626",
  requested: "#d97706",
  completed: "#16a34a",
  successful: "#16a34a",
  active: "#16a34a",
  abandoned: "#dc2626",
  recovered: "#0891b2",
  converted: "#16a34a",
  critical: "#dc2626",
  warning: "#d97706",
  error: "#dc2626",
  info: "#2563eb",
};

export function statusColor(value: unknown, fallback = "#6b7280"): string {
  return STATUS_COLORS[String(value)] ?? fallback;
}

/** Colours for series in charts, in a fixed order so they stay stable. */
export const CHART_COLORS = [
  "#f85606",
  "#2563eb",
  "#16a34a",
  "#7c3aed",
  "#d97706",
  "#0891b2",
  "#dc2626",
  "#4b5563",
];
