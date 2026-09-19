import { OpsPageHead, OpsTable, StatusPill } from "../OpsLayout";
import { mallQueue } from "@/lib/demo-data";

/* Brand / Mall approvals queue — from
   ../web ui ux design/daraz_nepal_brand_darazmall_approvals_queue (rebranded
   to the store's own "Mall" tier). */
export function MallApprovals() {
  return (
    <div>
      <OpsPageHead
        title="Brand & Mall Tier Approvals Queue"
        subtitle="Proof-of-authenticity and distribution-rights verification for flagship store placements."
        demo
      />
      <OpsTable head={["Submission / SLA", "Brand & Legal Entity", "Authenticity Tier & Category", "Verification Credentials & DOI", "Security & IRD CBMS", "Maker-Checker Actions"]}>
        {mallQueue.map((m) => (
          <tr key={m.id} className="hover:bg-brand-soft/30">
            <td className="px-4 py-3">
              <p className="font-bold text-ink">{m.id}</p>
              <p className="text-[10px] text-ink-muted">{m.submitted}</p>
              <p className={`text-[10px] font-bold ${m.slaHours > 24 ? "text-critical" : "text-positive"}`}>
                SLA {m.slaHours}h
              </p>
            </td>
            <td className="px-4 py-3">
              <p className="font-bold text-ink">{m.brand}</p>
              <p className="text-[10px] text-ink-muted">{m.entity}</p>
            </td>
            <td className="px-4 py-3 text-ink-muted">
              <StatusPill tone={m.tier === "Brand Owner" ? "live" : "ok"}>{m.tier}</StatusPill>
              <span className="block text-[10px]">{m.category}</span>
            </td>
            <td className="px-4 py-3 font-mono text-[10px] text-ink-muted">{m.doi}</td>
            <td className="px-4 py-3">
              <StatusPill tone={m.cbms === "Verified" ? "live" : m.cbms === "Pending" ? "warn" : "bad"}>
                CBMS {m.cbms}
              </StatusPill>
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-[11px] font-bold">
              <span className="mr-2 text-ink-muted">checker: {m.checker}</span>
              <button type="button" className="text-positive hover:underline">Approve</button>
              <span className="text-ink-faint"> · </span>
              <button type="button" className="text-critical hover:underline">Request docs</button>
            </td>
          </tr>
        ))}
      </OpsTable>
    </div>
  );
}
