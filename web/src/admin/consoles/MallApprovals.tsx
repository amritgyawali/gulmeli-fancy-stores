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
          <tr key={m.id} className="hover:bg-orange-50/30">
            <td className="px-4 py-3">
              <p className="font-bold text-on-surface">{m.id}</p>
              <p className="text-[10px] text-on-surface-variant">{m.submitted}</p>
              <p className={`text-[10px] font-bold ${m.slaHours > 24 ? "text-rose-600" : "text-emerald-700"}`}>
                SLA {m.slaHours}h
              </p>
            </td>
            <td className="px-4 py-3">
              <p className="font-bold text-on-surface">{m.brand}</p>
              <p className="text-[10px] text-on-surface-variant">{m.entity}</p>
            </td>
            <td className="px-4 py-3 text-on-surface-variant">
              <StatusPill tone={m.tier === "Brand Owner" ? "live" : "ok"}>{m.tier}</StatusPill>
              <span className="block text-[10px]">{m.category}</span>
            </td>
            <td className="px-4 py-3 font-mono text-[10px] text-on-surface-variant">{m.doi}</td>
            <td className="px-4 py-3">
              <StatusPill tone={m.cbms === "Verified" ? "live" : m.cbms === "Pending" ? "warn" : "bad"}>
                CBMS {m.cbms}
              </StatusPill>
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-[11px] font-bold">
              <span className="mr-2 text-on-surface-variant">checker: {m.checker}</span>
              <button type="button" className="text-emerald-700 hover:underline">Approve</button>
              <span className="text-gray-300"> · </span>
              <button type="button" className="text-rose-600 hover:underline">Request docs</button>
            </td>
          </tr>
        ))}
      </OpsTable>
    </div>
  );
}
