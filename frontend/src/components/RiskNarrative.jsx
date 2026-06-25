import { useEffect, useState } from "react";
import { api, bandColor } from "@/lib/api";
import { TrendingUp, Wind } from "lucide-react";

/**
 * Predictive risk narrative — replaces raw "AQI 280" with
 * "AQI likely to reach 350 within 18h due to ..." natural-language framing.
 */
export const RiskNarrative = ({ wardId }) => {
  const [d, setD] = useState(null);
  useEffect(() => {
    if (!wardId) return;
    setD(null);
    api.riskNarrative(wardId).then(setD).catch(() => setD(null));
  }, [wardId]);

  if (!d) {
    return (
      <div className="bg-[#141414] border border-white/10 rounded-sm p-5 animate-pulse h-40" />
    );
  }

  return (
    <div
      data-testid="risk-narrative"
      className="bg-[#141414] border border-white/10 rounded-sm p-5"
    >
      <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-white/50 flex items-center gap-2 mb-3">
        <TrendingUp className="w-3 h-3 text-[#EAB308]" />
        Predictive Risk Narrative · {d.ward_name}
      </div>
      <p className="text-base md:text-lg leading-snug text-white/90 mb-4">
        AQI likely to reach{" "}
        <span
          className="font-display font-bold"
          style={{ color: bandColor("severe") }}
        >
          {d.predicted_peak_24h}
        </span>{" "}
        within 24 hours — currently{" "}
        <span className="font-mono-data tabular">{d.current_aqi}</span>.
      </p>
      <div className="space-y-2">
        <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40 mb-1">
          Source Attribution
        </div>
        {d.causes.map((c) => (
          <div key={c.label} className="flex items-center gap-3 text-xs">
            <span className="font-mono-data tabular w-10 text-right text-[#EAB308]">
              {c.pct}%
            </span>
            <div className="flex-1 h-1.5 bg-white/5 rounded-sm overflow-hidden">
              <div
                className="h-full bg-[#EAB308]"
                style={{ width: `${c.pct * 2.4}%` }}
              />
            </div>
            <span className="text-white/70 w-44 text-left">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
