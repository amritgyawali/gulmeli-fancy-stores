import { OpsPageHead, OpsTable, StatusPill } from "../OpsLayout";
import { threePlShipments } from "@/lib/demo-data";
import { rs } from "@/lib/format";
import { Icon } from "@/components/Icon";

/* 3PL courier integration & overflow engine — from
   ../web ui ux design/daraz_nepal_3pl_couriers_pathao_ncm_integration_overflow_engine */
export function ThreePlConsole() {
  const online = threePlShipments.filter((s) => s.telemetry === "Live").length;
  return (
    <div>
      <OpsPageHead
        title="3PL Couriers — Pathao / NCM Integration & Overflow Engine"
        subtitle="Partner carrier waybills, SLA timers and COD reconciliation across the overflow rail."
        demo
      >
        <span className="rounded-full bg-positive-soft px-3 py-1 text-[11px] font-bold text-positive">
          {online}/{threePlShipments.length} carrier APIs healthy
        </span>
      </OpsPageHead>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {[
          ["Overflow Today", "1,214 consignments"],
          ["Avg SLA Breach", "3.1%"],
          ["COD In Transit", rs(31890)],
          ["NOC Hotline", "Kathmandu · staffed"],
        ].map(([l, v]) => (
          <div key={l} className="rounded-md border border-line bg-white p-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{l}</p>
            <p className="mt-1 text-sm font-semibold text-ink">{v}</p>
          </div>
        ))}
      </div>

      <OpsTable head={["Waybill IDs (Gulmeli / 3PL)", "Partner Carrier", "Origin Hub → Destination Node", "SLA Timer & Window", "Financials (Cost / COD)", "Live Telemetry", "Actions"]}>
        {threePlShipments.map((s) => (
          <tr key={s.waybill} className="hover:bg-brand-soft/30">
            <td className="px-4 py-3">
              <p className="font-mono font-bold text-ink">{s.waybill}</p>
              <p className="font-mono text-[10px] text-ink-muted">{s.partnerWaybill}</p>
            </td>
            <td className="px-4 py-3 font-semibold text-ink">{s.carrier}</td>
            <td className="px-4 py-3 text-ink-muted">
              <Icon name="swap" size={10} className="mr-1.5 text-brand" />
              {s.lane}
            </td>
            <td className="px-4 py-3">
              <p className={`text-[11px] font-semibold ${s.slaHours > 24 ? "text-critical" : "text-ink"}`}>
                {s.slaHours}h remaining
              </p>
              <p className="text-[10px] text-ink-muted">{s.window} · {s.stage}</p>
            </td>
            <td className="px-4 py-3 text-ink-muted">
              {rs(s.cost)} <span className="text-[10px]">cost</span>
              <span className="mx-1 text-ink-faint">/</span>
              <span className="font-bold text-brand-strong">{rs(s.cod)}</span> <span className="text-[10px]">COD</span>
            </td>
            <td className="px-4 py-3">
              <StatusPill tone={s.telemetry === "Live" ? "live" : s.telemetry === "Stale" ? "warn" : "bad"}>
                <Icon name={s.telemetry === "Live" ? "wifi" : s.telemetry === "Stale" ? "wifi" : "plug"} size={16} />
                {s.telemetry}
              </StatusPill>
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-[11px] font-bold text-info">
              <button type="button" className="hover:underline">Trace</button>
              <span className="text-ink-faint"> · </span>
              <button type="button" className="text-brand-strong hover:underline">Re-balance</button>
            </td>
          </tr>
        ))}
      </OpsTable>
    </div>
  );
}
