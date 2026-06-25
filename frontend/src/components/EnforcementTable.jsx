import React, { useEffect, useState } from "react";
import { ChevronRight, Hammer, Factory, Flame, Truck, Shield } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { NoticeDialog } from "@/components/NoticeDialog";

const TYPE_META = {
  construction_permit: { icon: Hammer, label: "Construction" },
  industrial_stack: { icon: Factory, label: "Industrial" },
  waste_burning_zone: { icon: Flame, label: "Burning" },
  diesel_fleet_route: { icon: Truck, label: "Fleet" },
};

const PRIORITY_STYLE = {
  P1: "text-[#EF4444] border-[#EF4444]/40 bg-[#EF4444]/10",
  P2: "text-[#F97316] border-[#F97316]/40 bg-[#F97316]/10",
  P3: "text-[#EAB308] border-[#EAB308]/40 bg-[#EAB308]/10",
};

export const EnforcementTable = () => {
  const [rows, setRows] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.enforcement().then((d) => { setRows(d); setLoading(false); });
  }, []);

  const ack = async (id) => {
    try {
      const updated = await api.acknowledge(id);
      setRows((r) => r.map((x) => (x.id === id ? updated : x)));
      toast.success(`${id} dispatched to field officer`, {
        description: "Acknowledged · ETA logged to operations queue",
      });
    } catch {
      toast.error("Could not acknowledge");
    }
  };

  return (
    <div data-testid="enforcement-table" className="bg-[#141414] border border-white/10 rounded-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div>
          <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-white/50">
            Enforcement Intelligence Agent
          </div>
          <div className="font-display text-lg font-semibold mt-0.5">Prioritised Recommendations</div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono-data uppercase tracking-wider text-white/50">
          <Shield className="w-3.5 h-3.5" />
          {rows.filter((r) => r.status === "pending").length} pending · {rows.filter((r) => r.status !== "pending").length} acked
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="font-mono-data text-[10px] uppercase tracking-wider text-white/50">
              <th className="text-left px-5 py-3 font-medium">Pri</th>
              <th className="text-left py-3 font-medium">Ward</th>
              <th className="text-left py-3 font-medium">Source</th>
              <th className="text-left py-3 font-medium">Action</th>
              <th className="text-right py-3 font-medium">Score</th>
              <th className="text-right py-3 font-medium">ETA</th>
              <th className="text-right px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-white/30 font-mono-data text-xs">
                  LOADING RECOMMENDATIONS…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-white/30 font-mono-data text-xs">
                  NO HOTSPOT-CORRELATED ACTIONS
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const meta = TYPE_META[r.source_type] || { icon: Shield, label: r.source_type_label };
              const Icon = meta.icon;
              const isOpen = expanded === r.id;
              return (
                <React.Fragment key={r.id}>
                  <tr
                    data-testid={`enforce-row-${r.id}`}
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                    className="border-t border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-sm border font-mono-data text-[10px] ${PRIORITY_STYLE[r.priority]}`}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="py-3 font-medium">{r.ward_name}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2 text-white/80">
                        <Icon className="w-3.5 h-3.5 text-white/50" />
                        <span className="text-xs">{meta.label}</span>
                      </div>
                    </td>
                    <td className="py-3 text-white/70 text-xs">{r.action}</td>
                    <td className="py-3 text-right font-mono-data tabular text-xs">{r.priority_score}</td>
                    <td className="py-3 text-right font-mono-data tabular text-xs text-white/60">{r.eta_hours}h</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span onClick={(e) => e.stopPropagation()}>
                          <NoticeDialog recId={r.id} recLabel={`${r.ward_name} · ${meta.label}`} />
                        </span>
                        {r.status === "pending" ? (
                          <button
                            data-testid={`ack-btn-${r.id}`}
                            onClick={(e) => { e.stopPropagation(); ack(r.id); }}
                            className="font-mono-data text-[10px] uppercase tracking-wider px-3 py-1.5 bg-white text-black hover:bg-[#EAB308] rounded-sm transition-colors"
                          >
                            Dispatch ↗
                          </button>
                        ) : (
                          <span className="font-mono-data text-[10px] uppercase tracking-wider px-3 py-1.5 border border-[#22C55E]/40 text-[#22C55E] bg-[#22C55E]/10 rounded-sm">
                            ✓ Acked
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-[#0A0A0A]">
                      <td colSpan={7} className="px-5 py-4 border-t border-white/5">
                        <Evidence r={r} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Evidence = ({ r }) => {
  const ev = r.evidence;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
      <div>
        <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40 mb-1">Correlation Trace</div>
        <div className="font-mono-data tabular">
          Current AQI <span className="text-white">{ev.hotspot_current_aqi}</span> ·
          Peak 24h <span className="text-[#F97316]"> {ev.hotspot_forecast_peak_24h}</span>
        </div>
        <div className="font-mono-data tabular text-white/60 mt-1">
          {ev.correlated_registry_count} registry entries in ward
        </div>
      </div>
      <div className="md:col-span-2">
        <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40 mb-1">Sample Source Records</div>
        <div className="space-y-1 font-mono-data text-[11px]">
          {ev.sample_registry_entries.map((s) => (
            <div key={s.id} className="flex items-start justify-between border-l border-[#EAB308]/40 pl-2">
              <span>
                <span className="text-[#EAB308]">{s.id}</span> · {s.details}
              </span>
              <span className="text-white/40">{s.lat.toFixed(3)}, {s.lng.toFixed(3)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
