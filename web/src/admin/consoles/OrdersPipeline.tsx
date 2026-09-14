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
      <div className="mb-5 rounded-xl border border-outline-variant bg-white p-3 shadow-sm">
        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
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
                  ? "bg-[#f85606] text-white shadow"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-orange-50"
              }`}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-outline-variant bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="bg-surface-container-low text-[10px] uppercase tracking-wider text-on-surface-variant">
            <tr>
              {["Order ID & Timestamp", "Customer Details & Address", "Courier & Tracking", "Payment & Total", "Fraud Risk", "Admin Controls"].map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3 font-black">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60">
            {inStage.map((o) => (
              <tr key={o.id} className="hover:bg-orange-50/30">
                <td className="px-4 py-3">
                  <p className="font-mono font-bold text-on-surface">{o.id}</p>
                  <p className="text-[10px] text-on-surface-variant">{o.placedAt}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-on-surface">{o.customer}</p>
                  <p className="text-[10px] text-on-surface-variant">{o.city}, Nepal</p>
                </td>
                <td className="px-4 py-3 text-on-surface-variant">
                  {o.courier}
                  <span className="block font-mono text-[10px]">{o.tracking}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusPill tone={o.payment === "COD" ? "warn" : "ok"}>{o.payment}</StatusPill>
                  <span className="ml-2 font-black text-[#d04402]">{rs(o.total)}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusPill tone={o.risk === "Low" ? "live" : o.risk === "Watch" ? "warn" : "bad"}>
                    {o.risk}
                  </StatusPill>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[11px] font-bold text-[#0f828a]">
                  <button type="button" className="hover:underline">Advance</button>
                  <span className="text-gray-300"> · </span>
                  <button type="button" className="hover:underline">Re-route</button>
                  <span className="text-gray-300"> · </span>
                  <button type="button" className="text-rose-600 hover:underline">Hold</button>
                </td>
              </tr>
            ))}
            {!inStage.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  No dispatches at <span className="font-bold">{stage}</span> right now.
                  <span className="block text-[10px]">
                    Live orders render in <a href="#/admin/orders" className="font-bold text-[#0f828a] underline">Orders board</a>.
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
