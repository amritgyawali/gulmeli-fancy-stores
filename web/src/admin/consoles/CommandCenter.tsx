import { Link } from "react-router-dom";
import { OpsPageHead, KpiCard } from "../OpsLayout";
import { OPS_NAV } from "../OpsLayout";
import { opsKpis } from "@/lib/demo-data";

/* Command center: merged KPI wall + live-ops tiles from the three enterprise
   dashboard exports in ../web ui ux design/. */
export function CommandCenter() {
  const icons = ["fa-sack-dollar", "fa-store", "fa-box", "fa-money-bill-wave", "fa-fire", "fa-robot"];
  return (
    <div>
      <OpsPageHead
        title="Command Center"
        subtitle="Real-time marketplace health — GMV, fulfillment, finance and risk in one view."
      >
        <span className="rounded border border-outline-variant bg-white px-3 py-1.5 text-[11px] font-bold text-on-surface-variant">
          <i className="fa-solid fa-arrow-pointer mr-1 text-[#f85606]" /> Console links below
        </span>
      </OpsPageHead>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {opsKpis.map((k, i) => (
          <KpiCard key={k.label} label={k.label} value={k.value} delta={k.delta} tone={k.tone as "up"} icon={icons[i] ?? "fa-chart-line"} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-outline-variant bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-black text-on-surface">Live Operations</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {OPS_NAV.filter((n) => n.to !== "/admin/ops").map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="daraz-card flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-3 hover:border-[#f85606]"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-orange-50 text-[#f85606]">
                  <i className={`fa-solid ${n.icon} text-sm`} />
                </span>
                <span>
                  <span className="block text-xs font-black text-on-surface">{n.label}</span>
                  <span className="block text-[10px] text-on-surface-variant">{n.section} console</span>
                </span>
                <i className="fa-solid fa-chevron-right ml-auto text-[10px] text-gray-300" />
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-outline-variant bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-sm font-black text-on-surface">Broadcast Active</h3>
            <p className="text-[11px] leading-relaxed text-on-surface-variant">
              9.9 hero banner, flash-sale ribbon and push campaign are live.
              Homepage CMS sections locked until the campaign window closes.
            </p>
            <div className="mt-3 space-y-2 text-[11px]">
              {[
                ["Homepage hero", "Scheduled 15 Sep 23:59"],
                ["Flash rail", "Burn 57% · healthy"],
                ["Push (Firebase)", "4 batches sent today"],
              ].map(([a, b]) => (
                <div key={a} className="flex justify-between">
                  <span className="font-semibold text-on-surface">{a}</span>
                  <span className="text-on-surface-variant">{b}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-outline-variant bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-sm font-black text-on-surface">Concurrent Traffic</h3>
            <div className="flex h-20 items-end gap-1">
              {[35, 48, 42, 60, 55, 72, 68, 90, 84, 96, 88, 76].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-[#f85606] to-[#fc8621]" style={{ height: `${h}%`, opacity: 0.5 + i / 24 }} />
              ))}
            </div>
            <p className="mt-2 text-[10px] text-on-surface-variant">
              Peak 12.4k req/min during flash drops · normalised after bot-throttle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
