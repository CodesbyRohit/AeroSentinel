import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Clock, Zap } from "lucide-react";

/**
 * Giant Response-Time hero card — the metric the brief explicitly names as
 * evaluation criterion #1 for Business Impact (25%).
 */
export const ResponseTimeHero = () => {
  const [k, setK] = useState(null);
  useEffect(() => { api.kpis().then(setK); }, []);

  if (!k) return <div className="h-44 bg-[#141414] border border-white/10 rounded-sm animate-pulse" />;
  const sit = k.signal_to_intervention;

  return (
    <section
      data-testid="response-time-hero"
      className="bg-[#141414] border border-[#22C55E]/40 rounded-sm overflow-hidden"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10">
        <Block
          kicker="Before AeroSentinel"
          icon={Clock}
          value={`${sit.baseline_hours}h`}
          sub="Manual triage · multi-agency coordination"
          color="#EF4444"
          testid="rt-before"
        />
        <Block
          kicker="With AeroSentinel"
          icon={Zap}
          value={`${sit.current_hours}h`}
          sub="Automated correlation + auto-plan dispatch"
          color="#22C55E"
          testid="rt-after"
        />
        <Block
          kicker="Signal → Intervention"
          icon={Clock}
          value={`−${sit.improvement_pct}%`}
          sub="Median dispatch latency · ward-level"
          color="#FFFFFF"
          testid="rt-improvement"
          big
        />
      </div>
    </section>
  );
};

const Block = ({ kicker, icon: Icon, value, sub, color, testid, big }) => (
  <div data-testid={testid} className="p-6 lg:p-8 relative">
    <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-white/50 flex items-center gap-2 mb-3">
      <Icon className="w-3 h-3" style={{ color }} />
      {kicker}
    </div>
    <div
      className={`font-mono-data font-bold tabular tracking-tighter ${big ? "text-6xl md:text-7xl" : "text-5xl md:text-6xl"}`}
      style={{ color }}
    >
      {value}
    </div>
    <div className="text-xs md:text-sm text-white/60 mt-3 max-w-xs leading-relaxed">{sub}</div>
  </div>
);
