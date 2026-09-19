import { useState } from "react";
import { OpsPageHead, StatusPill, BurnBar } from "../OpsLayout";
import { campaigns, campaignSkus } from "@/lib/demo-data";
import { rs } from "@/lib/format";
import { Icon } from "@/components/Icon";

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
            className={`shrink-0 rounded-md border px-4 py-3 text-left transition ${
              active === c.id
                ? "border-brand bg-brand-soft"
                : "border-line bg-white hover:border-gray-300"
            }`}
          >
            <p className="text-xs font-semibold text-ink">{c.name}</p>
            <p className="mt-0.5 text-[10px] text-ink-muted">{c.windowLabel}</p>
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
          <div key={l} className="rounded-md border border-line bg-white p-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{l}</p>
            <p className="mt-1 text-sm font-semibold text-ink">{v}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-md border border-line bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Price Economics (NPR) · Flash Stock Burn · Velocity
          </h3>
          <span className="flex items-center gap-1 text-[10px] font-bold text-info">
            <Icon name="shield" size={16} /> Surge Sentinel & Bot Guard {campaign.botShield}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-ink-muted">
              <tr>
                {["Product & Seller", "Listed → Campaign", "Subsidy Split", "Flash Stock Burn", "Velocity /min", "Intervention"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {campaignSkus.map((s) => {
                const burn = Math.round((s.burned / s.flashStock) * 100);
                return (
                  <tr key={s.product} className="hover:bg-brand-soft/30">
                    <td className="px-3 py-2.5">
                      <p className="line-clamp-1 max-w-[240px] font-bold text-ink">{s.product}</p>
                      <p className="text-[10px] text-ink-muted">{s.seller}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-ink-faint line-through">{rs(s.price)}</span>{" "}
                      <span className="font-semibold text-brand-strong">{rs(s.campaignPrice)}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-ink-muted">{s.subsidySplit}</td>
                    <td className="w-40 px-3 py-2.5">
                      <p className="mb-1 text-[10px] text-ink-muted">{s.burned}/{s.flashStock} · {burn}%</p>
                      <BurnBar pct={burn} />
                    </td>
                    <td className="px-3 py-2.5 font-bold text-ink">{s.velocity}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[11px] font-bold text-info">
                      <button type="button" className="hover:underline">Inject stock</button>
                      <span className="text-ink-faint"> · </span>
                      <button type="button" className="text-brand-strong hover:underline">Abuse guard</button>
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
          ["Instant Inventory Injection & Restock Surge", "boxes", "Sellers can push stock into live flash slots without pausing the deal window; injections are rate-limited per SKU."],
          ["Live Voucher Burn Engine", "ticket", "Pool burn streams per second; circuit auto-throttles at 80% quota with dual-control freeze above that."],
          ["Abuse Guard", "scan", "Device-fingerprint clustering blocks coupon farming; verified search engines stay whitelisted."],
        ].map(([t, icon, copy]) => (
          <div key={t} className="rounded-md border border-line bg-white p-4 shadow-sm">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <Icon name={icon} size={16} /> {t}
            </p>
            <p className="mt-1.5 leading-relaxed text-ink-muted">{copy}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
