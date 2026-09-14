import { OpsPageHead, OpsTable, StatusPill } from "../OpsLayout";
import { threePlShipments } from "@/lib/demo-data";
import { rs } from "@/lib/format";

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
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
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
          <div key={l} className="rounded-xl border border-outline-variant bg-white p-3 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wide text-on-surface-variant">{l}</p>
            <p className="mt-1 text-sm font-black text-on-surface">{v}</p>
          </div>
        ))}
      </div>

      <OpsTable head={["Waybill IDs (Gulmeli / 3PL)", "Partner Carrier", "Origin Hub → Destination Node", "SLA Timer & Window", "Financials (Cost / COD)", "Live Telemetry", "Actions"]}>
        {threePlShipments.map((s) => (
          <tr key={s.waybill} className="hover:bg-orange-50/30">
            <td className="px-4 py-3">
              <p className="font-mono font-bold text-on-surface">{s.waybill}</p>
              <p className="font-mono text-[10px] text-on-surface-variant">{s.partnerWaybill}</p>
            </td>
            <td className="px-4 py-3 font-semibold text-on-surface">{s.carrier}</td>
            <td className="px-4 py-3 text-on-surface-variant">
              <i className="fa-solid fa-right-left mr-1.5 text-[10px] text-[#f85606]" />
              {s.lane}
            </td>
            <td className="px-4 py-3">
              <p className={`text-[11px] font-black ${s.slaHours > 24 ? "text-rose-600" : "text-on-surface"}`}>
                {s.slaHours}h remaining
              </p>
              <p className="text-[10px] text-on-surface-variant">{s.window} · {s.stage}</p>
            </td>
            <td className="px-4 py-3 text-on-surface-variant">
              {rs(s.cost)} <span className="text-[10px]">cost</span>
              <span className="mx-1 text-gray-300">/</span>
              <span className="font-bold text-[#d04402]">{rs(s.cod)}</span> <span className="text-[10px]">COD</span>
            </td>
            <td className="px-4 py-3">
              <StatusPill tone={s.telemetry === "Live" ? "live" : s.telemetry === "Stale" ? "warn" : "bad"}>
                <i className={`fa-solid ${s.telemetry === "Live" ? "fa-signal" : s.telemetry === "Stale" ? "fa-wifi" : "fa-plug-circle-xmark"}`} />
                {s.telemetry}
              </StatusPill>
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-[11px] font-bold text-[#0f828a]">
              <button type="button" className="hover:underline">Trace</button>
              <span className="text-gray-300"> · </span>
              <button type="button" className="text-[#d04402] hover:underline">Re-balance</button>
            </td>
          </tr>
        ))}
      </OpsTable>
    </div>
  );
}
