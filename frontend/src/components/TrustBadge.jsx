import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ShieldCheck, Clock, Activity, AlertCircle } from "lucide-react";

/**
 * Trust badge — sensor metadata shown next to AQI readings.
 * Builds confidence by surfacing source, freshness, missing data.
 */
export const TrustBadge = ({ wardId, compact = false }) => {
  const [s, setS] = useState(null);
  useEffect(() => {
    if (!wardId) return;
    api.sensor(wardId).then(setS).catch(() => setS(null));
  }, [wardId]);

  if (!s) return null;

  const stale = s.last_update_minutes > 15;
  const missing = s.missing_data_pct_24h > 5;

  if (compact) {
    return (
      <div
        data-testid="trust-badge-compact"
        className="inline-flex items-center gap-1.5 font-mono-data text-[10px] uppercase tracking-wider text-white/50"
      >
        <ShieldCheck className="w-3 h-3 text-[#22C55E]" />
        {s.source.split(" ")[0]} · {(s.confidence * 100).toFixed(0)}%
      </div>
    );
  }

  return (
    <div
      data-testid={`trust-badge-${wardId}`}
      className="border border-white/10 bg-[#0A0A0A] rounded-sm p-3"
    >
      <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-white/40 mb-2 flex items-center gap-1.5">
        <ShieldCheck className="w-3 h-3 text-[#22C55E]" />
        Data Trust Layer
      </div>
      <div className="grid grid-cols-2 gap-2 font-mono-data text-[11px]">
        <Cell label="Source" value={s.source} />
        <Cell label="Station" value={s.station_code} />
        <Cell
          label="Last Update"
          value={`${s.last_update_minutes}m ago`}
          icon={Clock}
          warn={stale}
        />
        <Cell
          label="Confidence"
          value={`${(s.confidence * 100).toFixed(1)}%`}
          icon={Activity}
        />
        <Cell
          label="Missing 24h"
          value={`${s.missing_data_pct_24h}%`}
          icon={missing ? AlertCircle : null}
          warn={missing}
        />
        <Cell label="Calibrated" value={s.calibrated_at} />
      </div>
    </div>
  );
};

const Cell = ({ label, value, icon: Icon, warn }) => (
  <div>
    <div className="text-[9px] uppercase tracking-wider text-white/40">{label}</div>
    <div
      className={`flex items-center gap-1 mt-0.5 ${
        warn ? "text-[#F97316]" : "text-white/80"
      }`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      <span className="truncate">{value}</span>
    </div>
  </div>
);
