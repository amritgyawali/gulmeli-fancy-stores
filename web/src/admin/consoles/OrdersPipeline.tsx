import { useState } from "react";
import { useAdmin } from "@/admin/AdminContext";
import { OpsPageHead, StatusPill } from "../OpsLayout";
import { FULFILLMENT_STAGES, pipelineOrders } from "@/lib/demo-data";
import { rs } from "@/lib/format";

/* 21-stage fulfillment console — from
   ../web ui ux design/daraz_nepal_orders_management_21_stage_fulfillment_console.
   The stage pipeline strip drives which seeded orders show in the table. */
export function OrdersPipeline() {
  const { snapshot } = useAdmin();
  const [stage, setStage] = useState<string>(FULFILLMENT_STAGES[0]);

  const liveOrders = (snapshot.orders ?? []) as { document?: { id?: string; status?: string } }[];

  const inStage = pipelineOrders.filter((o) => o.stage === stage);

  return (
    <div>
      <OpsPageHead
        title="Orders Management & Dispatch Matrix"
        subtitle={`${liveOrders.length} live orders in Supabase · stage board seeded from the operations design`}
        demo
      />

      {/* 21-stage strip */}
      <div className="mb-5 rounded-md border border-line bg-white p-3 shadow-sm">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
          DEX Fulfillment Pipeline — 21 stages
        </p>
        <div className="rail flex gap-1 overflow-x-auto pb-1">
          {FULFILLMENT_STAGES.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => setStage(s)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold transition ${
                stage === s
                  ? "bg-brand text-white shadow"
                  : "bg-sunken text-ink-muted hover:bg-brand-soft"
              }`}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-line bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="bg-sunken text-[10px] uppercase tracking-wider text-ink-muted">
            <tr>
              {["Order ID & Timestamp", "Customer Details & Address", "Courier & Tracking", "Payment & Total", "Fraud Risk", "Admin Controls"].map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {inStage.map((o) => (
              <tr key={o.id} className="hover:bg-brand-soft/30">
                <td className="px-4 py-3">
                  <p className="font-mono font-bold text-ink">{o.id}</p>
                  <p className="text-[10px] text-ink-muted">{o.placedAt}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink">{o.customer}</p>
                  <p className="text-[10px] text-ink-muted">{o.city}, Nepal</p>
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  {o.courier}
                  <span className="block font-mono text-[10px]">{o.tracking}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusPill tone={o.payment === "COD" ? "warn" : "ok"}>{o.payment}</StatusPill>
                  <span className="ml-2 font-semibold text-brand-strong">{rs(o.total)}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusPill tone={o.risk === "Low" ? "live" : o.risk === "Watch" ? "warn" : "bad"}>
                    {o.risk}
                  </StatusPill>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[11px] font-bold text-info">
                  <button type="button" className="hover:underline">Advance</button>
                  <span className="text-ink-faint"> · </span>
                  <button type="button" className="hover:underline">Re-route</button>
                  <span className="text-ink-faint"> · </span>
                  <button type="button" className="text-critical hover:underline">Hold</button>
                </td>
              </tr>
            ))}
            {!inStage.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-faint">
                  No dispatches at <span className="font-bold">{stage}</span> right now.
                  <span className="block text-[10px]">
                    Live orders render in <a href="#/admin/orders" className="font-bold text-info underline">Orders board</a>.
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
