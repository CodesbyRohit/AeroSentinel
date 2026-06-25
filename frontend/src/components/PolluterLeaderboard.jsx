import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Award, TrendingUp, TrendingDown, Minus } from "lucide-react";

const BADGE = {
  green: { c: "#22C55E", l: "GREEN" },
  amber: { c: "#EAB308", l: "AMBER" },
  red: { c: "#EF4444", l: "RED" },
};

const TREND = {
  improving: { c: "#22C55E", icon: TrendingUp },
  flat: { c: "#71717A", icon: Minus },
  declining: { c: "#EF4444", icon: TrendingDown },
};

export const PolluterLeaderboard = () => {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState(null);

  useEffect(() => {
    api.polluters(12, filter).then(setRows);
  }, [filter]);

  return (
    <div data-testid="polluter-leaderboard" className="bg-[#141414] border border-white/10 rounded-sm">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-white/50 flex items-center gap-2">
            <Award className="w-3 h-3 text-[#EAB308]" />
            Polluter Compliance Scorecard
          </div>
          <div className="font-display text-lg font-semibold mt-0.5">Industries · Ranked by Score</div>
        </div>
        <div className="flex items-center gap-1 border border-white/10 rounded-sm">
          {[
            { v: null, l: "All" },
            { v: "red", l: "Red" },
            { v: "amber", l: "Amber" },
            { v: "green", l: "Green" },
          ].map((b) => (
            <button
              key={b.l}
              data-testid={`polluter-filter-${b.l.toLowerCase()}`}
              onClick={() => setFilter(b.v)}
              className={`px-3 py-1.5 font-mono-data text-[10px] uppercase tracking-wider transition-colors ${
                filter === b.v ? "bg-white text-black" : "text-white/60 hover:text-white"
              }`}
            >
              {b.l}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="font-mono-data text-[10px] uppercase tracking-wider text-white/50">
              <th className="text-left px-5 py-3 font-medium">Rank</th>
              <th className="text-left py-3 font-medium">Industry</th>
              <th className="text-left py-3 font-medium">Ward</th>
              <th className="text-center py-3 font-medium">Score</th>
              <th className="text-center py-3 font-medium">Badge</th>
              <th className="text-right py-3 font-medium">Viol.</th>
              <th className="text-right py-3 font-medium">Penalty</th>
              <th className="text-center px-5 py-3 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const b = BADGE[r.badge];
              const t = TREND[r.trend];
              const TIcon = t.icon;
              return (
                <tr
                  key={r.id}
                  data-testid={`polluter-row-${r.id}`}
                  className="border-t border-white/5 hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-5 py-3 font-mono-data tabular text-white/50">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="py-3 text-xs">{r.name}</td>
                  <td className="py-3 text-xs text-white/60">{r.ward_name}</td>
                  <td className="py-3 text-center">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-14 h-1.5 bg-white/5 rounded-sm overflow-hidden">
                        <div className="h-full" style={{ width: `${r.compliance_score}%`, background: b.c }} />
                      </div>
                      <span className="font-mono-data tabular text-xs" style={{ color: b.c }}>
                        {r.compliance_score}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <span
                      className="font-mono-data text-[10px] px-2 py-0.5 rounded-sm border"
                      style={{ color: b.c, borderColor: `${b.c}66`, background: `${b.c}1a` }}
                    >
                      {b.l}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono-data tabular text-xs">
                    {r.violations_count}
                  </td>
                  <td className="py-3 text-right font-mono-data tabular text-xs text-white/60">
                    ₹{(r.penalties_inr / 1000).toFixed(0)}k
                  </td>
                  <td className="px-5 py-3 text-center">
                    <TIcon className="w-4 h-4 inline" style={{ color: t.c }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
