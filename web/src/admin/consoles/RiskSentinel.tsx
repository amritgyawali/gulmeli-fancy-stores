import { OpsPageHead, OpsTable, StatusPill, KpiCard } from "../OpsLayout";
import { threatStream, riskRules } from "@/lib/demo-data";
import { Icon } from "@/components/Icon";

/* Trust, risk & bot guard sentinel — from
   ../web ui ux design/daraz_nepal_trust_risk_bot_guard_sentinel (the export
   ships as a skeleton page; this fills it with its own incident-ledger
   vocabulary from the sibling enterprise designs). */
export function RiskSentinel() {
  return (
    <div>
      <OpsPageHead
        title="Trust, Risk & Bot Guard Sentinel Console"
        subtitle="Live threat stream, policy matrix and dual-control lockdown protocols."
        demo
      >
        <button
          type="button"
          className="rounded-sm bg-rose-600 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white shadow hover:bg-rose-700"
        >
          <Icon name="lock" size={16} className="mr-1.5" /> Emergency lockdown (dual-control)
        </button>
      </OpsPageHead>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <KpiCard label="Threat blocks / hr" value="412" delta="bot swarm easing" tone="warn" icon="scan" />
        <KpiCard label="Open incidents" value={`${threatStream.length}`} delta="2 auto-mitigated" tone="up" icon="alert" />
        <KpiCard label="Challenge pass rate" value="94.2%" delta="+0.8 pts" tone="up" icon="userShield" />
        <KpiCard label="Guardian score" value="A-" delta="resilient" tone="flat" icon="shield" />
      </div>

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
        Live Threat Stream &amp; Incident Ledger
      </h3>
      <OpsTable head={["Incident ID", "Threat Vector & Target", "Source IP / Subnet & ISP", "Device / Fingerprint", "Risk Score", "Trigger Rule", "Enforced Action", "Inspector"]}>
        {threatStream.map((t) => (
          <tr key={t.id} className="hover:bg-brand-soft/30">
            <td className="px-4 py-3 font-mono text-[10px] font-bold text-ink">{t.id}</td>
            <td className="px-4 py-3">
              <p className="font-bold text-ink">{t.vector}</p>
              <p className="font-mono text-[10px] text-ink-muted">{t.target}</p>
            </td>
            <td className="px-4 py-3 font-mono text-[10px] text-ink-muted">{t.ip}</td>
            <td className="px-4 py-3 font-mono text-[10px] text-ink-muted">{t.device}</td>
            <td className="px-4 py-3">
              <span className={`text-sm font-semibold ${t.score > 80 ? "text-critical" : t.score > 50 ? "text-caution" : "text-positive"}`}>
                {t.score}
              </span>
            </td>
            <td className="px-4 py-3 font-mono text-[10px] text-ink-muted">{t.rule}</td>
            <td className="px-4 py-3">
              <StatusPill tone={t.action === "Allowed" ? "muted" : "warn"}>{t.action}</StatusPill>
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-[11px] font-bold text-info">
              <button type="button" className="hover:underline">Escalate</button>
              <span className="text-ink-faint"> · </span>
              <button type="button" className="text-positive hover:underline">Clear</button>
            </td>
          </tr>
        ))}
      </OpsTable>

      <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
        Bot Guard Sentinel Policy Matrix &amp; Active Rule Sets
      </h3>
      <OpsTable head={["Rule", "Name", "Enforcement", "Adaptive Challenge & Rate Throttle", "Updated"]}>
        {riskRules.map((r) => (
          <tr key={r.rule} className="hover:bg-brand-soft/30">
            <td className="px-4 py-3 font-mono text-[10px] font-bold text-brand-strong">{r.rule}</td>
            <td className="px-4 py-3 font-semibold text-ink">{r.name}</td>
            <td className="px-4 py-3 text-ink-muted">{r.enforcement}</td>
            <td className="px-4 py-3 font-mono text-[10px] text-ink-muted">{r.throttle}</td>
            <td className="px-4 py-3 text-ink-muted">{r.updated}</td>
          </tr>
        ))}
      </OpsTable>
    </div>
  );
}
