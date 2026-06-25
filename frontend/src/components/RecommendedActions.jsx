import { useEffect, useState } from "react";
import { api, bandColor, aqiBand } from "@/lib/api";
import { Target, ArrowDown, Clock } from "lucide-react";

/**
 * Recommended Action panel. Answers "what should we do now?" — not just
 * "what is AQI now?". Each priority action shows its expected AQI reduction
 * and lead time.
 */
export const RecommendedActions = ({ wardId }) => {
  const [d, setD] = useState(null);
  useEffect(() => {
    if (!wardId) return;
    setD(null);
    api.recommendedActions(wardId).then(setD).catch(() => setD(null));
  }, [wardId]);

  if (!d) {
    return <div className="h-72 bg-[#141414] border border-white/10 rounded-sm animate-pulse" />;
  }

  const peak = d.forecast_peak_24h;
  const projected = d.projected_aqi_post_intervention;
  const peakColor = bandColor(aqiBand(peak));
  const projectedColor = bandColor(aqiBand(projected));

  return (
    <div data-testid="recommended-actions" className="bg-[#141414] border border-white/10 rounded-sm p-5">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-white/50 flex items-center gap-2">
            <Target className="w-3 h-3" style={{ color: "#22C55E" }} />
            Recommended Action · {d.ward_name}
          </div>
          <div className="font-display text-xl font-semibold mt-1">Priority Interventions</div>
        </div>

        <div className="flex items-center gap-3 px-3 py-2 border border-[#22C55E]/40 bg-[#22C55E]/10 rounded-sm">
          <div className="text-right">
            <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/50">
              Expected reduction
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <ArrowDown className="w-3 h-3" style={{ color: "#22C55E" }} />
              <span data-testid="expected-reduction" className="font-mono-data text-xl tabular font-semibold" style={{ color: "#22C55E" }}>
                −{d.expected_total_reduction} AQI
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {d.actions.map((a) => (
          <div
            key={a.rank}
            data-testid={`action-${a.rank}`}
            className={`border rounded-sm p-3 transition-colors ${
              a.executable
                ? "border-white/10 bg-[#0A0A0A] hover:border-white/30"
                : "border-white/5 bg-[#0A0A0A]/50 opacity-60"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="font-mono-data text-xl tabular text-white/30 w-8 flex-shrink-0">
                {String(a.rank).padStart(2, "0")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium leading-tight">{a.action}</div>
                <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40 mt-1">
                  {a.driver} · {a.driver_pct}% of drivers
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {a.executable ? (
                  <>
                    <div className="font-mono-data text-sm tabular font-semibold" style={{ color: "#22C55E" }}>
                      −{a.expected_reduction}
                    </div>
                    <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1 justify-end">
                      <Clock className="w-2.5 h-2.5" />
                      {a.lead_time_hours}h
                    </div>
                  </>
                ) : (
                  <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40">
                    No lever
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-white/5 grid grid-cols-2 gap-4">
        <div>
          <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40">
            Without intervention
          </div>
          <div className="font-mono-data text-2xl tabular mt-0.5" style={{ color: peakColor }}>
            {peak}
          </div>
        </div>
        <div>
          <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40">
            With intervention (proj.)
          </div>
          <div data-testid="projected-aqi" className="font-mono-data text-2xl tabular mt-0.5" style={{ color: projectedColor }}>
            {projected}
          </div>
        </div>
      </div>
    </div>
  );
};
