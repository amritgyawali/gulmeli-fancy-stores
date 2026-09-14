import { OpsPageHead, OpsTable, StatusPill, BurnBar } from "../OpsLayout";
import { voucherPools } from "@/lib/demo-data";

/* Voucher & coin burn pool management — from
   ../web ui ux design/daraz_nepal_voucher_coin_burn_pool_management */
export function VoucherPoolConsole() {
  return (
    <div>
      <OpsPageHead
        title="Voucher & Coin Burn Pool Management"
        subtitle="Quota ledger, redemption caps, auto-throttle circuit and partner subsidy burn."
        demo
      >
        <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold text-white">
          <i className="fa-solid fa-snowflake mr-1" /> Dual-control freeze armed
        </span>
      </OpsPageHead>

      <OpsTable head={["Voucher Code & Title", "Discount Mechanics", "Quota & Redemptions", "Burn %", "Redemption Caps", "Funding Partners", "Fraud Flags", "Status", "Actions"]}>
        {voucherPools.map((v) => (
          <tr key={v.code} className="hover:bg-orange-50/30">
            <td className="px-4 py-3">
              <p className="font-mono text-xs font-black text-[#d04402]">{v.code}</p>
              <p className="text-[10px] text-on-surface-variant">{v.title}</p>
            </td>
            <td className="px-4 py-3 text-on-surface-variant">{v.mechanics}</td>
            <td className="px-4 py-3 text-on-surface-variant">
              {v.burned.toLocaleString("en-US")} / {v.quota.toLocaleString("en-US")}
            </td>
            <td className="w-36 px-4 py-3">
              <p className="mb-1 text-[10px] font-bold text-on-surface">{v.burnPct}%</p>
              <BurnBar pct={v.burnPct} />
            </td>
            <td className="px-4 py-3 text-[11px] text-on-surface-variant">{v.cap}</td>
            <td className="px-4 py-3 text-[11px] text-on-surface-variant">{v.funding}</td>
            <td className="px-4 py-3 text-[11px]">
              {v.flags === "—" ? (
                <span className="text-gray-300">—</span>
              ) : (
                <span className="font-bold text-amber-700">{v.flags}</span>
              )}
            </td>
            <td className="px-4 py-3">
              <StatusPill tone={v.status === "Active" ? "live" : v.status === "Throttled" ? "warn" : "muted"}>
                {v.status}
              </StatusPill>
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-[11px] font-bold text-[#0f828a]">
              <button type="button" className="hover:underline">Adjust quota</button>
              <span className="text-gray-300"> · </span>
              <button type="button" className="text-[#d04402] hover:underline">Freeze</button>
            </td>
          </tr>
        ))}
      </OpsTable>

      <div className="mt-4 grid gap-3 lg:grid-cols-3 text-xs">
        <div className="rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
          <p className="font-black uppercase tracking-wider text-on-surface-variant">Coins Flow Dynamics</p>
          <p className="mt-1.5 leading-relaxed text-on-surface-variant">
            Gems earned on check-ins burn at 100 gems = Rs. 5 against baskets.
            Burn ledger reconciles daily against the loyalty budget.
          </p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
          <p className="font-black uppercase tracking-wider text-on-surface-variant">Auto-Throttle Circuit</p>
          <p className="mt-1.5 leading-relaxed text-on-surface-variant">
            Pools crossing 80% quota drop to 1 redemption/device/min
            automatically; GEMCHEST is throttled right now.
          </p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
          <p className="font-black uppercase tracking-wider text-on-surface-variant">Partner Subsidies & Payment Rails Burn</p>
          <p className="mt-1.5 leading-relaxed text-on-surface-variant">
            Co-funded coupons (couriers, wallets) settle their share in the
            Wednesday NCHL-IPS batch alongside merchant payouts.
          </p>
        </div>
      </div>
    </div>
  );
}
