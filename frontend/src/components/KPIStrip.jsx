import { ArrowDownRight, AlertTriangle, ShieldAlert, Users, Wind, Zap } from "lucide-react";
import { bandColor, bandLabel } from "@/lib/api";

const Card = ({ label, value, sub, icon: Icon, accent, testid }) => (
  <div
    data-testid={testid}
    className="bg-[#141414] border border-white/10 rounded-sm p-5 hover:border-white/30 transition-colors"
  >
    <div className="flex items-start justify-between mb-3">
      <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-white/50">
        {label}
      </div>
      <Icon className="w-4 h-4 text-white/40" strokeWidth={1.5} />
    </div>
    <div className="font-mono-data text-3xl md:text-4xl font-semibold tabular tracking-tight" style={{ color: accent }}>
      {value}
    </div>
    {sub && <div className="text-xs text-white/50 mt-2">{sub}</div>}
  </div>
);

export const KPIStrip = ({ kpis }) => {
  if (!kpis) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-32 bg-[#141414] border border-white/10 rounded-sm animate-pulse" />
        ))}
      </div>
    );
  }
  const sit = kpis.signal_to_intervention || {};
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <Card
        testid="kpi-city-aqi"
        label="Delhi · City Avg AQI"
        value={kpis.city_aqi}
        sub={`${bandLabel(kpis.city_band)} · ${kpis.stations} stations`}
        icon={Wind}
        accent={bandColor(kpis.city_band)}
      />
      <Card
        testid="kpi-hotspots"
        label="Active Hotspots"
        value={kpis.hotspots_count}
        sub="Forecast peak ≥ 300 within 24h"
        icon={AlertTriangle}
        accent="#F97316"
      />
      <Card
        testid="kpi-rmse"
        label="Forecast RMSE (vs baseline)"
        value={kpis.rmse_model}
        sub={`Persistence ${kpis.rmse_persistence} · −${kpis.rmse_improvement_pct}%`}
        icon={Zap}
        accent="#EAB308"
      />
      <Card
        testid="kpi-pending"
        label="Pending Enforcement"
        value={kpis.enforcement_pending}
        sub={`${kpis.enforcement_acknowledged} acknowledged`}
        icon={ShieldAlert}
        accent="#EF4444"
      />
      <Card
        testid="kpi-sit"
        label="Signal → Intervention"
        value={`${sit.current_hours}h`}
        sub={`Baseline ${sit.baseline_hours}h · ↓ ${sit.improvement_pct}%`}
        icon={ArrowDownRight}
        accent="#22C55E"
      />
    </div>
  );
};
