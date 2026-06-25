import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";

const SEV = {
  critical: { c: "#7F1D1D", label: "CRIT" },
  high:     { c: "#EF4444", label: "HIGH" },
  elevated: { c: "#F97316", label: "ELEV" },
};

export const AlertFeed = () => {
  const [items, setItems] = useState([]);
  useEffect(() => { api.alerts().then(setItems); }, []);

  return (
    <div data-testid="alert-feed" className="bg-[#141414] border border-white/10 rounded-sm h-full flex flex-col">
      <div className="px-5 py-4 border-b border-white/10">
        <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-white/50 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] pulse-dot" />
          Live Alert Stream
        </div>
        <div className="font-display text-lg font-semibold mt-0.5">Hotspot Detections</div>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[520px]">
        {items.length === 0 && (
          <div className="p-5 font-mono-data text-[10px] text-white/30 uppercase">No alerts</div>
        )}
        {items.map((a, i) => {
          const s = SEV[a.severity] || SEV.elevated;
          return (
            <div
              key={a.id}
              data-testid={`alert-${a.id}`}
              className="feed-in px-5 py-3 border-b border-white/5 hover:bg-white/[0.03] transition-colors"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: s.c }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="font-mono-data text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm border"
                      style={{ color: s.c, borderColor: `${s.c}66`, background: `${s.c}1a` }}
                    >
                      {s.label}
                    </span>
                    <span className="font-mono-data text-[10px] text-white/40">
                      {a.minutes_ago}m ago
                    </span>
                  </div>
                  <div className="text-[13px] leading-snug">{a.headline}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
