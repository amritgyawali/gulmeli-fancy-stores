import { OpsPageHead, OpsTable, StatusPill } from "../OpsLayout";
import { payoutBatches } from "@/lib/demo-data";
import { rs } from "@/lib/format";

/* Commission engine & NCHL-IPS payouts ledger — from
   ../web ui ux design/daraz_nepal_commission_engine_nchl_ips_payouts_ledger */
export function CommissionLedger() {
  const gross = payoutBatches.reduce((n, b) => n + b.gross, 0);
  const net = payoutBatches.reduce((n, b) => n + b.net, 0);
  return (
    <div>
      <OpsPageHead
        title="Commission Engine & NCHL-IPS Payouts Ledger"
        subtitle="Wednesday disbursal rail · IRD tax engine · COD reconciliation across 77 districts."
        demo
      >
        <span className="rounded-full bg-shell px-3 py-1 text-[11px] font-bold text-white">
          Next batch: Wed 16 Sep · 14:00 NPT
        </span>
      </OpsPageHead>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {[
          ["Gross Sales (batch)", rs(gross)],
          ["Net Payable", rs(net)],
          ["Commission Collected", rs(gross - net)],
          ["COD Recon Exceptions", "2 held"],
        ].map(([l, v]) => (
          <div key={l} className="rounded-md border border-line bg-white p-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{l}</p>
            <p className="mt-1 text-sm font-semibold text-ink">{v}</p>
          </div>
        ))}
      </div>

      <OpsTable head={["Batch ID", "Merchant / PAN / Store", "Beneficiary Bank & A/C", "Deductions Breakdown", "Gross → Net (NPR)", "Channel", "Status", "Actions"]}>
        {payoutBatches.map((b) => (
          <tr key={`${b.batchId}-${b.pan}`} className="hover:bg-brand-soft/30">
            <td className="px-4 py-3 font-mono text-[10px] font-bold text-ink">{b.batchId}</td>
            <td className="px-4 py-3">
              <p className="font-bold text-ink">{b.merchant}</p>
              <p className="text-[10px] text-ink-muted">PAN {b.pan}</p>
            </td>
            <td className="px-4 py-3 text-ink-muted">
              {b.bank}
              <span className="block font-mono text-[10px]">{b.account}</span>
            </td>
            <td className="px-4 py-3 text-[11px] text-ink-muted">
              comm {rs(b.commission)}
              {b.deductions > 0 && <> · fees {rs(b.deductions)}</>}
            </td>
            <td className="px-4 py-3">
              <span className="text-ink-faint line-through">{rs(b.gross)}</span>{" "}
              <span className="font-semibold text-positive">{rs(b.net)}</span>
            </td>
            <td className="px-4 py-3 font-mono text-[10px] text-ink-muted">{b.channel}</td>
            <td className="px-4 py-3">
              <StatusPill tone={b.status === "Disbursed" ? "live" : b.status === "Ready" ? "ok" : "bad"}>
                {b.status}
              </StatusPill>
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-[11px] font-bold text-info">
              <button type="button" className="hover:underline">Ledger</button>
              {b.status !== "Disbursed" && (
                <>
                  <span className="text-ink-faint"> · </span>
                  <button type="button" className="text-brand-strong hover:underline">
                    {b.status === "Held" ? "Release" : "Queue"}
                  </button>
                </>
              )}
            </td>
          </tr>
        ))}
      </OpsTable>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-line bg-white p-4 text-xs shadow-sm">
          <h3 className="mb-2 font-semibold uppercase tracking-wider text-ink-muted">
            Commission Rules Engine
          </h3>
          {[
            ["Marketplace standard", "5% + payment fee pass-through"],
            ["Groceries & FMCG", "2.5% (loss-leader band)"],
            ["Gold & jewelry", "3% + 1% hallmarks audit fee"],
            ["Mall flagship stores", "Negotiated · tiered after Rs. 5M/mo"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-line/50 py-1.5 last:border-0">
              <span className="font-semibold text-ink">{k}</span>
              <span className="text-ink-muted">{v}</span>
            </div>
          ))}
        </div>
        <div className="rounded-md border border-line bg-white p-4 text-xs shadow-sm">
          <h3 className="mb-2 font-semibold uppercase tracking-wider text-ink-muted">
            77-District COD Reconciliation Rail
          </h3>
          <p className="leading-relaxed text-ink-muted">
            Every cash delivery is matched: courier deposit → bank clearing →
            merchant payable, with unmatched cash flagged to Risk after 48h.
            Current exceptions sit in the 2 held rows above.
          </p>
          <div className="mt-3 flex gap-2">
            <span className="rounded bg-positive-soft px-2 py-1 font-bold text-positive">Matched {rs(2_412_000)}</span>
            <span className="rounded bg-caution-soft px-2 py-1 font-bold text-caution">Pending {rs(148_000)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
