import { OpsPageHead, OpsTable, StatusPill, BurnBar } from "../OpsLayout";
import { voucherPools } from "@/lib/demo-data";
import { Icon } from "@/components/Icon";

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
        <span className="rounded-full bg-shell px-3 py-1 text-[11px] font-bold text-white">
          <Icon name="alert" size={16} className="mr-1" /> Dual-control freeze armed
        </span>
      </OpsPageHead>

      <OpsTable head={["Voucher Code & Title", "Discount Mechanics", "Quota & Redemptions", "Burn %", "Redemption Caps", "Funding Partners", "Fraud Flags", "Status", "Actions"]}>
        {voucherPools.map((v) => (
          <tr key={v.code} className="hover:bg-brand-soft/30">
            <td className="px-4 py-3">
              <p className="font-mono text-xs font-semibold text-brand-strong">{v.code}</p>
              <p className="text-[10px] text-ink-muted">{v.title}</p>
            </td>
            <td className="px-4 py-3 text-ink-muted">{v.mechanics}</td>
            <td className="px-4 py-3 text-ink-muted">
              {v.burned.toLocaleString("en-US")} / {v.quota.toLocaleString("en-US")}
            </td>
            <td className="w-36 px-4 py-3">
              <p className="mb-1 text-[10px] font-bold text-ink">{v.burnPct}%</p>
              <BurnBar pct={v.burnPct} />
            </td>
            <td className="px-4 py-3 text-[11px] text-ink-muted">{v.cap}</td>
            <td className="px-4 py-3 text-[11px] text-ink-muted">{v.funding}</td>
            <td className="px-4 py-3 text-[11px]">
              {v.flags === "—" ? (
                <span className="text-ink-faint">—</span>
              ) : (
                <span className="font-bold text-caution">{v.flags}</span>
              )}
            </td>
            <td className="px-4 py-3">
              <StatusPill tone={v.status === "Active" ? "live" : v.status === "Throttled" ? "warn" : "muted"}>
                {v.status}
              </StatusPill>
            </td>
            <td className="whitespace-nowrap px-4 py-3 text-[11px] font-bold text-info">
              <button type="button" className="hover:underline">Adjust quota</button>
              <span className="text-ink-faint"> · </span>
              <button type="button" className="text-brand-strong hover:underline">Freeze</button>
            </td>
          </tr>
        ))}
      </OpsTable>

      <div className="mt-4 grid gap-3 lg:grid-cols-3 text-xs">
        <div className="rounded-md border border-line bg-white p-4 shadow-sm">
          <p className="font-semibold uppercase tracking-wider text-ink-muted">Coins Flow Dynamics</p>
          <p className="mt-1.5 leading-relaxed text-ink-muted">
            Gems earned on check-ins burn at 100 gems = Rs. 5 against baskets.
            Burn ledger reconciles daily against the loyalty budget.
          </p>
        </div>
        <div className="rounded-md border border-line bg-white p-4 shadow-sm">
          <p className="font-semibold uppercase tracking-wider text-ink-muted">Auto-Throttle Circuit</p>
          <p className="mt-1.5 leading-relaxed text-ink-muted">
            Pools crossing 80% quota drop to 1 redemption/device/min
            automatically; GEMCHEST is throttled right now.
          </p>
        </div>
        <div className="rounded-md border border-line bg-white p-4 shadow-sm">
          <p className="font-semibold uppercase tracking-wider text-ink-muted">Partner Subsidies & Payment Rails Burn</p>
          <p className="mt-1.5 leading-relaxed text-ink-muted">
            Co-funded coupons (couriers, wallets) settle their share in the
            Wednesday NCHL-IPS batch alongside merchant payouts.
          </p>
        </div>
      </div>
    </div>
  );
}
