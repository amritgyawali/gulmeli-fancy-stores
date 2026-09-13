import type { StorefrontConfig } from "./config.ts";

type Localisation = StorefrontConfig["localisation"];

const DEFAULT_LOCALISATION: Localisation = {
  defaultLanguage: "en",
  languages: [],
  defaultCurrency: "NPR",
  currencySymbol: "Rs.",
  currencyPosition: "before",
  timezone: "Asia/Kathmandu",
  dateFormat: "DD/MM/YYYY",
  numberFormat: "1,234.56",
};

function separators(format: string): { group: string; decimal: string } {
  if (format === "1.234,56") return { group: ".", decimal: "," };
  if (format === "1 234.56") return { group: " ", decimal: "." };
  return { group: ",", decimal: "." };
}

export function formatNumber(
  value: unknown,
  localisation: Localisation = DEFAULT_LOCALISATION,
  decimals = 0,
): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  const { group, decimal } = separators(localisation.numberFormat);
  const fixed = Math.abs(numeric).toFixed(decimals);
  const [whole = "0", fraction] = fixed.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, group);
  const sign = numeric < 0 ? "-" : "";
  return fraction
    ? `${sign}${grouped}${decimal}${fraction}`
    : `${sign}${grouped}`;
}

export function formatMoney(
  value: unknown,
  localisation: Localisation = DEFAULT_LOCALISATION,
  decimals = 0,
): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  const amount = formatNumber(Math.abs(numeric), localisation, decimals);
  const symbol = localisation.currencySymbol || localisation.defaultCurrency;
  const body =
    localisation.currencyPosition === "after"
      ? `${amount} ${symbol}`
      : `${symbol} ${amount}`;
  return numeric < 0 ? `-${body}` : body;
}

/** Compact money for tiles: Rs. 1.2L / Rs. 45.6k. */
export function formatCompactMoney(
  value: unknown,
  localisation: Localisation = DEFAULT_LOCALISATION,
): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  const symbol = localisation.currencySymbol || localisation.defaultCurrency;
  const abs = Math.abs(numeric);
  const sign = numeric < 0 ? "-" : "";
  if (abs >= 10_000_000)
    return `${sign}${symbol} ${(abs / 10_000_000).toFixed(2)}Cr`;
  if (abs >= 100_000) return `${sign}${symbol} ${(abs / 100_000).toFixed(2)}L`;
  if (abs >= 1_000) return `${sign}${symbol} ${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${symbol} ${abs.toFixed(0)}`;
}

export function formatPercent(value: unknown, decimals = 1): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  return `${numeric.toFixed(decimals)}%`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDate(
  value: unknown,
  localisation: Localisation = DEFAULT_LOCALISATION,
): string {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  if (localisation.dateFormat === "MM/DD/YYYY")
    return `${month}/${day}/${year}`;
  if (localisation.dateFormat === "YYYY-MM-DD")
    return `${year}-${month}-${day}`;
  return `${day}/${month}/${year}`;
}

export function formatDateTime(
  value: unknown,
  localisation: Localisation = DEFAULT_LOCALISATION,
): string {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return `${formatDate(value, localisation)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatRelative(value: unknown, now = new Date()): string {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const future = seconds < 0;
  const magnitude = Math.abs(seconds);
  const say = (count: number, unit: string) =>
    `${future ? "in " : ""}${count} ${unit}${count === 1 ? "" : "s"}${future ? "" : " ago"}`;
  if (magnitude < 60) return future ? "in a moment" : "just now";
  if (magnitude < 3600) return say(Math.round(magnitude / 60), "minute");
  if (magnitude < 86_400) return say(Math.round(magnitude / 3600), "hour");
  if (magnitude < 2_592_000) return say(Math.round(magnitude / 86_400), "day");
  if (magnitude < 31_536_000)
    return say(Math.round(magnitude / 2_592_000), "month");
  return say(Math.round(magnitude / 31_536_000), "year");
}

/** "Order status" from "order_status", for labels the schema does not name. */
export function humanise(value: unknown): string {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (character) => character.toUpperCase());
}
