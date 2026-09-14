import { useState } from "react";
import { OpsPageHead, StatusPill, BurnBar } from "../OpsLayout";
import { campaigns, campaignSkus } from "@/lib/demo-data";
import { rs } from "@/lib/format";

/* Flash-sale campaign orchestrator — from
   ../web ui ux design/daraz_nepal_9.9_11.11_flash_sale_campaign_orchestrator */
export function CampaignOrchestrator() {
  const [active, setActive] = useState(campaigns[0].id);
  const campaign = campaigns.find((c) => c.id === active) ?? campaigns[0];
  return (
    <div>
      <OpsPageHead
        title="9.9 / 11.11 Flash Sale Campaign Orchestrator"
        subtitle="Price economics, instant inventory injection, voucher burn engine and surge sentinel per campaign window."
        demo
      />

      <div className="rail mb-4 flex gap-2 overflow-x-auto">
        {campaigns.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActive(c.id)}
            className={`shrink-0 rounded-xl border px-4 py-3 text-left transition ${
              active === c.id
                ? "border-[#f85606] bg-orange-50"
                : "border-outline-variant bg-white hover:border-gray-300"
            }`}
          >
            <p className="text-xs font-black text-on-surface">{c.name}</p>
            <p className="mt-0.5 text-[10px] text-on-surface-variant">{c.windowLabel}</p>
            <StatusPill tone={c.status === "Live" ? "live" : c.status === "Armed" ? "warn" : "muted"}>
              {c.status}
            </StatusPill>
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-4">
        {[
          ["GMV Target", rs(campaign.gmvTarget)],
          ["GMV Actual", rs(campaign.gmvActual)],
          ["Voucher Pool", campaign.voucherPool],
          ["Buyers", campaign.buyers.toLocaleString("en-US")],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-outline-variant bg-white p-3 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wide text-on-surface-variant">{l}</p>
            <p className="mt-1 text-sm font-black text-on-surface">{v}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
            Price Economics (NPR) · Flash Stock Burn · Velocity
          </h3>
          <span className="flex items-center gap-1 text-[10px] font-bold text-[#0f828a]">
            <i className="fa-solid fa-shield-halved" /> Surge Sentinel & Bot Guard {campaign.botShield}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-on-surface-variant">
              <tr>
                {["Product & Seller", "Listed → Campaign", "Subsidy Split", "Flash Stock Burn", "Velocity /min", "Intervention"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 font-black">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {campaignSkus.map((s) => {
                const burn = Math.round((s.burned / s.flashStock) * 100);
                return (
                  <tr key={s.product} className="hover:bg-orange-50/30">
                    <td className="px-3 py-2.5">
                      <p className="line-clamp-1 max-w-[240px] font-bold text-on-surface">{s.product}</p>
                      <p className="text-[10px] text-on-surface-variant">{s.seller}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-gray-400 line-through">{rs(s.price)}</span>{" "}
                      <span className="font-black text-[#d04402]">{rs(s.campaignPrice)}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-on-surface-variant">{s.subsidySplit}</td>
                    <td className="w-40 px-3 py-2.5">
                      <p className="mb-1 text-[10px] text-on-surface-variant">{s.burned}/{s.flashStock} · {burn}%</p>
                      <BurnBar pct={burn} />
                    </td>
                    <td className="px-3 py-2.5 font-bold text-on-surface">{s.velocity}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[11px] font-bold text-[#0f828a]">
                      <button type="button" className="hover:underline">Inject stock</button>
                      <span className="text-gray-300"> · </span>
                      <button type="button" className="text-[#d04402] hover:underline">Abuse guard</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3 text-xs">
        {[
          ["Instant Inventory Injection & Restock Surge", "fa-boxes-stacked", "Sellers can push stock into live flash slots without pausing the deal window; injections are rate-limited per SKU."],
          ["Live Voucher Burn Engine", "fa-ticket", "Pool burn streams per second; circuit auto-throttles at 80% quota with dual-control freeze above that."],
          ["Abuse Guard", "fa-robot", "Device-fingerprint clustering blocks coupon farming; verified search engines stay whitelisted."],
        ].map(([t, icon, copy]) => (
          <div key={t} className="rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
            <p className="flex items-center gap-2 font-black text-on-surface">
              <i className={`fa-solid ${icon} text-[#f85606]`} /> {t}
            </p>
            <p className="mt-1.5 leading-relaxed text-on-surface-variant">{copy}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
