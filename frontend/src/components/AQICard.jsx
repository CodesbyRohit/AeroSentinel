import { useEffect, useState } from "react";
import { api, bandColor, bandLabel, aqiBand } from "@/lib/api";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * Rich AQI display: value + band + confidence + 3-step forecast + drivers.
 * Replaces a bare "AQI 348" with full causal context.
 */
export const AQICard = ({ wardId, size = "lg" }) => {
  const [data, setData] = useState(null);
  const [sensor, setSensor] = useState(null);
  const [forecast, setForecast] = useState(null);

  useEffect(() => {
    if (!wardId) return;
    setData(null);
    setForecast(null);
    Promise.all([
      api.riskNarrative(wardId),
      api.sensor(wardId),
      api.forecast(wardId, 72),
    ]).then(([rn, s, fc]) => {
      setData(rn);
      setSensor(s);
      setForecast(fc);
    });
  }, [wardId]);

  if (!data || !sensor || !forecast) {
    return <div className="h-72 bg-[#141414] border border-white/10 rounded-sm animate-pulse" />;
  }

  // Sample at 0h, 24h, 48h for 3-step forecast
  const steps = [
    { l: "Now", v: data.current_aqi },
    { l: "+24h", v: forecast.forecast[23]?.aqi ?? data.predicted_peak_24h },
    { l: "+48h", v: forecast.forecast[47]?.aqi ?? data.predicted_peak_24h },
  ];
  const TrendIcon = steps[2].v > steps[0].v + 5 ? TrendingUp : steps[2].v < steps[0].v - 5 ? TrendingDown : Minus;
  const trendColor = steps[2].v > steps[0].v + 5 ? "#EF4444" : steps[2].v < steps[0].v - 5 ? "#22C55E" : "#A1A1AA";
  const c = bandColor(aqiBand(data.current_aqi));

  return (
    <div
      data-testid={`aqi-card-${wardId}`}
      className="bg-[#141414] border border-white/10 rounded-sm p-5"
    >
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
        <div>
          <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-white/50 mb-1">
            {data.ward_name} · Air Quality
          </div>
          <div className="flex items-baseline gap-4">
            <div
              className={`font-mono-data font-semibold tabular tracking-tight ${size === "lg" ? "text-6xl" : "text-5xl"}`}
              style={{ color: c }}
            >
              {data.current_aqi}
            </div>
            <div
              className="font-mono-data text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border"
              style={{ color: c, borderColor: `${c}66`, background: `${c}1a` }}
            >
              {bandLabel(aqiBand(data.current_aqi))}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40">Confidence</div>
          <div className="font-mono-data text-lg tabular" style={{ color: "#22C55E" }}>
            {(sensor.confidence * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5">
        {steps.map((s, i) => (
          <div
            key={s.l}
            data-testid={`aqi-forecast-step-${i}`}
            className="bg-[#0A0A0A] border border-white/5 rounded-sm p-3"
          >
            <div className="font-mono-data text-[9px] uppercase tracking-wider text-white/40">{s.l}</div>
            <div className="font-mono-data text-xl tabular mt-0.5" style={{ color: bandColor(aqiBand(s.v)) }}>
              {s.v}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mb-5 -mt-3">
        <TrendIcon className="w-3.5 h-3.5" style={{ color: trendColor }} />
        <span className="font-mono-data text-[10px] uppercase tracking-wider" style={{ color: trendColor }}>
          {steps[2].v > steps[0].v + 5 ? "Worsening over 48h" : steps[2].v < steps[0].v - 5 ? "Improving over 48h" : "Holding flat"}
        </span>
      </div>

      <div>
        <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/50 mb-2">
          Primary Drivers
        </div>
        <div className="space-y-1.5">
          {data.causes.map((cs) => (
            <div key={cs.label} data-testid={`driver-${cs.label.split(" ")[0].toLowerCase()}`} className="flex items-center gap-3 text-xs">
              <span className="font-mono-data tabular w-10 text-right text-white/90">{cs.pct}%</span>
              <div className="flex-1 h-1 bg-white/5 rounded-sm overflow-hidden">
                <div className="h-full bg-white/40" style={{ width: `${Math.min(100, cs.pct * 3)}%` }} />
              </div>
              <span className="text-white/70 w-40 text-left">{cs.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
