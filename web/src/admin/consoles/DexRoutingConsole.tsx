import { OpsPageHead, OpsTable, StatusPill, BurnBar } from "../OpsLayout";
import { dexHubs } from "@/lib/demo-data";
import { Icon } from "@/components/Icon";

/* DEX 77-district hub routing matrix — from
   ../web ui ux design/daraz_nepal_dex_logistics_77_district_hub_routing_matrix */
export function DexRoutingConsole() {
  const totalIn = dexHubs.reduce((n, h) => n + h.inbound, 0);
  const totalOut = dexHubs.reduce((n, h) => n + h.outbound, 0);
  return (
    <div>
      <OpsPageHead
        title="DEX 77-District Hub Routing Matrix"
        subtitle="Hub telemetry, inter-hub linehaul radar and the 3PL overflow balancer."
        demo
      >
        <span className="rounded-full bg-info-soft px-3 py-1 text-[11px] font-bold text-info">
          <Icon name="broadcast" size={16} className="mr-1" />
          Inter-Hub Linehaul Radar · 6 feeds
        </span>
      </OpsPageHead>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {[
          ["Inbound / hour", totalIn.toLocaleString("en-US")],
          ["Outbound / hour", totalOut.toLocaleString("en-US")],
          ["Districts covered", "77 / 77"],
          ["COD Vault Cache", "Rs. 18.9M in transit"],
        ].map(([l, v]) => (
          <div key={l} className="rounded-md border border-line bg-white p-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{l}</p>
            <p className="mt-1 text-sm font-semibold text-ink">{v}</p>
          </div>
        ))}
      </div>

      <OpsTable head={["Hub Name & Code", "Province", "Inbound / Outbound", "Fleet & SLA", "Status", "Action"]}>
        {dexHubs.map((h) => (
          <tr key={h.code} className="hover:bg-brand-soft/30">
            <td className="px-4 py-3">
              <p className="font-bold text-ink">{h.hub}</p>
              <p className="font-mono text-[10px] text-ink-muted">{h.code}</p>
            </td>
            <td className="px-4 py-3 text-ink-muted">{h.province}</td>
            <td className="px-4 py-3">
              <p className="text-[11px] text-ink-muted">
                <span className="font-bold text-positive">{h.inbound} in</span> ·{" "}
                <span className="font-bold text-info">{h.outbound} out</span>
              </p>
              <div className="mt-1 w-36"><BurnBar pct={(h.outbound / Math.max(1, h.inbound)) * 100} /></div>
            </td>
            <td className="px-4 py-3 text-ink-muted">
              {h.fleet}
              <span className="block text-[10px]">SLA {h.sla}</span>
            </td>
            <td className="px-4 py-3">
              <StatusPill tone={h.status === "Normal" ? "live" : h.status === "Overflow 3PL" ? "ok" : "warn"}>
                {h.status}
              </StatusPill>
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-[11px] font-bold text-info">
              <button type="button" className="hover:underline">Routing matrix</button>
              <span className="text-ink-faint"> · </span>
              <button type="button" className="text-brand-strong hover:underline">Surge → 3PL</button>
            </td>
          </tr>
        ))}
      </OpsTable>
    </div>
  );
}
