import { useMemo, useState } from "react";
import { Platform, ScrollView, Share, View } from "react-native";
import { AdminShell, Panel } from "@/admin/ui/Shell";
import { A, Btn, EmptyState, Row, Tabs } from "@/admin/ui/primitives";
import { TextBox } from "@/admin/ui/inputs";
import { useAdmin } from "@/admin/AdminProvider";
import { useFormat } from "@/admin/ui/useFormat";
import { REPORTS, reportToCsv, reportToHtml } from "@/admin/core/reports";
import { rangeFor, RANGE_PRESETS, type DateRange } from "@/admin/core/metrics";

export function ReportsScreen() {
  const { theme, data, published, allowed, notify, store, write } = useAdmin();
  const format = useFormat();
  const [key, setKey] = useState(REPORTS[0]?.key ?? "sales");
  const [preset, setPreset] = useState("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [csv, setCsv] = useState("");

  const range = useMemo<DateRange>(() => {
    if (customFrom && customTo) {
      const from = new Date(customFrom);
      const to = new Date(customTo);
      if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        return { from, to };
      }
    }
    return rangeFor(preset);
  }, [preset, customFrom, customTo]);

  const rangeLabel =
    customFrom && customTo
      ? `${customFrom} to ${customTo}`
      : (RANGE_PRESETS.find((entry) => entry.key === preset)?.label ?? "");

  const report = REPORTS.find((entry) => entry.key === key) ?? REPORTS[0];
  const table = useMemo(
    () => report?.build(data, range),
    [report, data, range],
  );

  const canExport = allowed("reports", "export");

  const cell = (value: unknown, formatHint?: string) => {
    if (value === null || value === undefined || value === "") return "—";
    if (formatHint === "currency") return format.money(value);
    if (formatHint === "number") return format.number(value);
    if (formatHint === "percent") return `${Number(value).toFixed(1)}%`;
    if (formatHint === "date") return String(value);
    return String(value);
  };

  const exportCsv = async () => {
    if (!table) return;
    const text = reportToCsv(table);
    store.log(
      "export",
      "reports",
      `${table.title} (${rangeLabel})`,
      write.actor,
    );
    setCsv(text);
    if (Platform.OS === "web") {
      notify("CSV ready below — copy it into a spreadsheet.", "success");
      return;
    }
    try {
      await Share.share({ message: text, title: `${table.title}.csv` });
    } catch {
      notify("The export could not be shared from this device.", "danger");
    }
  };

  const openPrintable = () => {
    if (!table) return;
    const html = reportToHtml(
      table,
      published.branding.companyName,
      rangeLabel,
    );
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const preview = window.open("", "_blank");
      if (!preview) {
        notify(
          "Allow pop-ups for this site to print or save the report as a PDF.",
          "danger",
        );
        return;
      }
      preview.document.write(html);
      preview.document.close();
      return;
    }
    void Share.share({ message: html, title: table.title }).catch(() =>
      notify("The report could not be shared from this device.", "danger"),
    );
  };

  return (
    <AdminShell
      title="Reports"
      subtitle="Every report, for any date range, ready to export"
    >
      <Tabs
        tabs={REPORTS.map((entry) => ({ key: entry.key, label: entry.label }))}
        active={key}
        onChange={setKey}
        theme={theme}
      />
      <Tabs
        tabs={RANGE_PRESETS.map((entry) => ({
          key: entry.key,
          label: entry.label,
        }))}
        active={customFrom && customTo ? "" : preset}
        onChange={(next) => {
          setPreset(next);
          setCustomFrom("");
          setCustomTo("");
        }}
        theme={theme}
      />

      <Panel title="Custom date range">
        <Row gap={8} wrap>
          <View style={{ flex: 1, minWidth: 140 }}>
            <TextBox
              value={customFrom}
              onChange={setCustomFrom}
              placeholder="From (YYYY-MM-DD)"
              theme={theme}
              label="From"
            />
          </View>
          <View style={{ flex: 1, minWidth: 140 }}>
            <TextBox
              value={customTo}
              onChange={setCustomTo}
              placeholder="To (YYYY-MM-DD)"
              theme={theme}
              label="To"
            />
          </View>
          <Btn
            title="Clear"
            small
            tone="ghost"
            theme={theme}
            onPress={() => {
              setCustomFrom("");
              setCustomTo("");
            }}
          />
        </Row>
      </Panel>

      {table ? (
        <Panel
          title={table.title}
          subtitle={`${table.description} — ${rangeLabel}`}
          actions={
            canExport ? (
              <Row gap={6}>
                <Btn
                  title="CSV"
                  icon="file-csv"
                  small
                  theme={theme}
                  onPress={() => void exportCsv()}
                />
                <Btn
                  title="Print / PDF"
                  icon="print"
                  small
                  theme={theme}
                  onPress={openPrintable}
                />
              </Row>
            ) : undefined
          }
        >
          {table.rows.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <Row
                  gap={12}
                  style={{
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  }}
                >
                  {table.columns.map((column) => (
                    <A
                      key={column.key}
                      size={11}
                      weight="700"
                      color={theme.muted}
                      style={{ width: 130 }}
                    >
                      {column.label}
                    </A>
                  ))}
                </Row>
                {table.rows.slice(0, 200).map((row, index) => (
                  <Row
                    key={index}
                    gap={12}
                    style={{
                      paddingVertical: 7,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                      backgroundColor: index % 2 ? theme.raised : "transparent",
                    }}
                  >
                    {table.columns.map((column) => (
                      <A
                        key={column.key}
                        size={12}
                        numberOfLines={1}
                        style={{ width: 130 }}
                      >
                        {cell(row[column.key], column.format)}
                      </A>
                    ))}
                  </Row>
                ))}
                {!!table.totals && (
                  <Row gap={12} style={{ paddingVertical: 9 }}>
                    {table.columns.map((column) => (
                      <A
                        key={column.key}
                        size={12}
                        weight="700"
                        style={{ width: 130 }}
                      >
                        {cell(table.totals?.[column.key], column.format)}
                      </A>
                    ))}
                  </Row>
                )}
              </View>
            </ScrollView>
          ) : (
            <EmptyState
              icon="file-csv"
              title="No rows for this period"
              detail="Try a wider date range."
              theme={theme}
            />
          )}
          {table.rows.length > 200 && (
            <A size={11} color={theme.muted}>
              {`Showing the first 200 of ${table.rows.length} rows. Export to see them all.`}
            </A>
          )}
        </Panel>
      ) : null}

      {!!csv && (
        <Panel title="CSV export" subtitle="Copy this into a spreadsheet">
          <TextBox
            value={csv}
            onChange={setCsv}
            multiline
            rows={10}
            theme={theme}
            label="CSV output"
          />
        </Panel>
      )}
    </AdminShell>
  );
}
