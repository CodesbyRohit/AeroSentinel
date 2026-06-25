import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  Area,
  ReferenceLine,
  Legend,
} from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { TrendingDown, TrendingUp } from "lucide-react";

const HORIZONS = [
  { v: "24", label: "24H" },
  { v: "48", label: "48H" },
  { v: "72", label: "72H" },
];

export const ForecastChart = ({ wardId }) => {
  const [data, setData] = useState(null);
  const [horizon, setHorizon] = useState("72");

  useEffect(() => {
    if (!wardId) return;
    let alive = true;
    api.forecast(wardId, parseInt(horizon, 10)).then((d) => alive && setData(d));
    return () => { alive = false; };
  }, [wardId, horizon]);

  if (!data) {
    return (
      <div className="bg-[#141414] border border-white/10 rounded-sm h-[460px] animate-pulse" />
    );
  }

  const formatTs = (t) => {
    const d = new Date(t);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}h`;
  };

  // Combine history + forecast for X axis
  const merged = [
    ...data.history.map((h) => ({ t: h.timestamp, history: h.aqi })),
    ...data.forecast.map((h, i) => ({
      t: h.timestamp,
      forecast: h.aqi,
      persistence: data.persistence_baseline[i]?.aqi,
      actual: data.actual_holdout[i]?.aqi,
    })),
  ];

  return (
    <div className="bg-[#141414] border border-white/10 rounded-sm p-5" data-testid="forecast-chart">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-white/50">
            Hyperlocal Forecasting Agent
          </div>
          <div className="font-display text-xl font-semibold mt-1">
            {data.ward_name} · {data.current_aqi}{" "}
            <span className="text-white/40 text-sm font-mono-data uppercase ml-1">
              now
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <RMSEBadge
            model={data.rmse_model}
            persist={data.rmse_persistence}
            improvement={data.rmse_improvement_pct}
          />
          <Tabs value={horizon} onValueChange={setHorizon}>
            <TabsList className="bg-[#0A0A0A] border border-white/10 rounded-sm h-8">
              {HORIZONS.map((h) => (
                <TabsTrigger
                  key={h.v}
                  value={h.v}
                  data-testid={`forecast-tab-${h.v}h`}
                  className="font-mono-data text-[10px] uppercase tracking-wider px-3 data-[state=active]:bg-white data-[state=active]:text-black rounded-sm"
                >
                  {h.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={merged} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EAB308" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#EAB308" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={formatTs}
              tick={{ fill: "rgba(255,255,255,0.5)", fontFamily: "JetBrains Mono", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              minTickGap={50}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.5)", fontFamily: "JetBrains Mono", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              width={40}
            />
            <Tooltip
              labelFormatter={(t) => formatTs(t)}
              contentStyle={{
                background: "#0A0A0A",
                border: "1px solid rgba(255,255,255,0.2)",
                fontFamily: "JetBrains Mono",
                fontSize: 11,
              }}
              cursor={{ stroke: "rgba(255,255,255,0.2)" }}
            />
            <Legend
              wrapperStyle={{ fontFamily: "JetBrains Mono", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}
              iconType="line"
            />
            <ReferenceLine y={300} stroke="#F97316" strokeDasharray="2 4" label={{ value: "Hotspot threshold 300", fill: "#F97316", fontSize: 10, fontFamily: "JetBrains Mono", position: "insideTopRight" }} />
            <Area type="monotone" dataKey="forecast" stroke="#EAB308" strokeWidth={2} fill="url(#forecastFill)" name="AeroSentinel Forecast" dot={false} />
            <Line type="monotone" dataKey="history" stroke="#FFFFFF" strokeWidth={2} dot={false} name="Historical" />
            <Line type="monotone" dataKey="persistence" stroke="#71717A" strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="Persistence baseline" />
            <Line type="monotone" dataKey="actual" stroke="#22C55E" strokeWidth={1.5} dot={false} name="Held-out actual" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const RMSEBadge = ({ model, persist, improvement }) => {
  const better = improvement > 0;
  return (
    <div data-testid="rmse-badge" className="flex items-center gap-3 px-3 py-2 border border-white/10 rounded-sm bg-[#0A0A0A]">
      <div className="text-right">
        <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40">RMSE · vs persistence</div>
        <div className="font-mono-data text-sm tabular">
          <span className="text-[#EAB308]">{model}</span>
          <span className="text-white/40 mx-1.5">vs</span>
          <span className="text-white/60">{persist}</span>
        </div>
      </div>
      <div className={`flex items-center gap-1 px-2 py-1 rounded-sm border font-mono-data text-xs ${better ? "text-[#22C55E] border-[#22C55E]/40 bg-[#22C55E]/10" : "text-[#EF4444] border-[#EF4444]/40 bg-[#EF4444]/10"}`}>
        {better ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
        {improvement}%
      </div>
    </div>
  );
};
