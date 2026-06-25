import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Heart, School, UserCheck, Users } from "lucide-react";

export const ImpactMetrics = ({ variant = "full" }) => {
  const [d, setD] = useState(null);
  useEffect(() => { api.impact().then(setD); }, []);

  if (!d) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-[#141414] border border-white/10 rounded-sm animate-pulse" />
        ))}
      </div>
    );
  }

  const fmt = (n) => new Intl.NumberFormat("en-IN").format(n);

  const items = [
    {
      id: "population-affected",
      icon: Users,
      label: "People affected today",
      value: fmt(d.population_affected),
      sub: `${d.population_affected_pct}% of monitored population`,
      accent: "#EF4444",
    },
    {
      id: "asthma-prevented",
      icon: Heart,
      label: "Asthma events prevented",
      value: fmt(d.asthma_cases_prevented_today),
      sub: `${fmt(d.asthma_cases_today_baseline)} baseline · 18% intervention lift`,
      accent: "#22C55E",
    },
    {
      id: "schools-at-risk",
      icon: School,
      label: "Schools in risk zone",
      value: `${d.schools_in_risk_zone} / ${d.schools_total}`,
      sub: `${d.school_risk_pct}% of mapped schools`,
      accent: "#F97316",
    },
    {
      id: "elderly-exposed",
      icon: UserCheck,
      label: "Elderly exposed",
      value: fmt(d.elderly_exposed),
      sub: "Population ≥ 60 in unhealthy wards",
      accent: "#EAB308",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="impact-metrics">
      {items.map((m) => {
        const Icon = m.icon;
        return (
          <div
            key={m.id}
            data-testid={`impact-${m.id}`}
            className="bg-[#141414] border border-white/10 rounded-sm p-5 hover:border-white/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-white/50">
                {m.label}
              </div>
              <Icon className="w-4 h-4 text-white/40" strokeWidth={1.5} />
            </div>
            <div
              className="font-mono-data text-3xl md:text-4xl font-semibold tabular tracking-tight"
              style={{ color: m.accent }}
            >
              {m.value}
            </div>
            <div className="text-xs text-white/50 mt-2">{m.sub}</div>
          </div>
        );
      })}
      {variant === "full" && (
        <div className="col-span-2 lg:col-span-4 text-[10px] font-mono-data uppercase tracking-wider text-white/30">
          {d.methodology_note}
        </div>
      )}
    </div>
  );
};
