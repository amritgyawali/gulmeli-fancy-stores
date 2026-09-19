import { OpsPageHead, OpsTable, StatusPill } from "../OpsLayout";
import { kycQueue } from "@/lib/demo-data";

/* Seller approval KYC maker-checker queue — from
   ../web ui ux design/daraz_nepal_seller_approval_kyc_maker_checker_queue */
export function KycQueue() {
  const pending = kycQueue.filter((k) => k.maker === "Pending" || k.checker === "Pending").length;
  return (
    <div>
      <OpsPageHead
        title="Seller Approval & KYC Maker-Checker Queue"
        subtitle="Dual-control verification: a maker reviews documents, a checker approves onboarding."
        demo
      >
        <span className="rounded-full bg-caution-soft px-3 py-1 text-[11px] font-bold text-caution">
          {pending} awaiting action
        </span>
      </OpsPageHead>

      <OpsTable head={["Application", "Merchant Entity & Category", "Registration & Tax ID", "Location & DEX Hub", "Risk Metric", "Maker Review", "Checker Status", "Verification Action"]}>
        {kycQueue.map((k) => (
          <tr key={k.id} className="hover:bg-brand-soft/30">
            <td className="px-4 py-3 font-mono text-[10px] font-bold text-ink">{k.id}</td>
            <td className="px-4 py-3">
              <p className="font-bold text-ink">{k.merchant}</p>
              <p className="text-[10px] text-ink-muted">{k.entity} · {k.category}</p>
            </td>
            <td className="px-4 py-3 font-mono text-[10px] text-ink-muted">
              {k.registration}
              <span className="block">PAN {k.pan}</span>
            </td>
            <td className="px-4 py-3 text-ink-muted">
              {k.location}
              <span className="block text-[10px]">hub {k.hub}</span>
            </td>
            <td className="px-4 py-3">
              <span className={`text-sm font-semibold ${k.riskScore > 60 ? "text-critical" : k.riskScore > 25 ? "text-caution" : "text-positive"}`}>
                {k.riskScore}
              </span>
              <span className="block text-[9px] uppercase text-ink-muted">risk score</span>
            </td>
            <td className="px-4 py-3">
              <StatusPill tone={k.maker === "Cleared" ? "live" : k.maker === "Rejected" ? "bad" : "warn"}>
                {k.maker}
              </StatusPill>
            </td>
            <td className="px-4 py-3">
              <StatusPill tone={k.checker === "Cleared" ? "live" : k.checker === "Blocked" ? "bad" : "muted"}>
                {k.checker}
              </StatusPill>
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-[11px] font-bold">
              <button type="button" className="text-positive hover:underline">Approve</button>
              <span className="text-ink-faint"> · </span>
              <button type="button" className="text-critical hover:underline">Reject</button>
              <span className="text-ink-faint"> · </span>
              <button type="button" className="text-info hover:underline">Docs</button>
            </td>
          </tr>
        ))}
      </OpsTable>
    </div>
  );
}
