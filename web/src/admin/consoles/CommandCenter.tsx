import { Link } from "react-router-dom";
import { OpsPageHead, KpiCard } from "../OpsLayout";
import { OPS_NAV } from "../OpsLayout";
import { opsKpis } from "@/lib/demo-data";
import { Icon } from "@/components/Icon";

/* Command center: merged KPI wall + live-ops tiles from the three enterprise
   dashboard exports in ../web ui ux design/. */
export function CommandCenter() {
  const icons = ["coins", "store", "box", "banknote", "flame", "scan"];
  return (
    <div>
      <OpsPageHead
        title="Command Center"
        subtitle="Real-time marketplace health — GMV, fulfillment, finance and risk in one view."
      >
        <span className="rounded border border-line bg-white px-3 py-1.5 text-[11px] font-bold text-ink-muted">
          <Icon name="pointer" size={16} className="mr-1 text-brand" /> Console links below
        </span>
      </OpsPageHead>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {opsKpis.map((k, i) => (
          <KpiCard key={k.label} label={k.label} value={k.value} delta={k.delta} tone={k.tone as "up"} icon={icons[i] ?? "chartLine"} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-md border border-line bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-ink">Live Operations</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {OPS_NAV.filter((n) => n.to !== "/admin/ops").map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="daraz-card flex items-center gap-3 rounded-lg border border-line bg-raised p-3 hover:border-brand"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand">
                  <Icon name={n.icon} size={16} />
                </span>
                <span>
                  <span className="block text-xs font-semibold text-ink">{n.label}</span>
                  <span className="block text-[10px] text-ink-muted">{n.section} console</span>
                </span>
                <Icon name="chevronRight" size={10} className="ml-auto text-ink-faint" />
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-md border border-line bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-ink">Broadcast Active</h3>
            <p className="text-[11px] leading-relaxed text-ink-muted">
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
                  <span className="font-semibold text-ink">{a}</span>
                  <span className="text-ink-muted">{b}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-line bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-ink">Concurrent Traffic</h3>
            <div className="flex h-20 items-end gap-1">
              {[35, 48, 42, 60, 55, 72, 68, 90, 84, 96, 88, 76].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-[#f85606] to-[#fc8621]" style={{ height: `${h}%`, opacity: 0.5 + i / 24 }} />
              ))}
            </div>
            <p className="mt-2 text-[10px] text-ink-muted">
              Peak 12.4k req/min during flash drops · normalised after bot-throttle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
