import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Database, ShieldCheck } from "lucide-react";

/**
 * Hybrid Demonstration Mode disclosure — replaces the older "synthetic"
 * framing with a clear Live / Simulated split + reason.
 */
export const HybridDisclosure = ({ accent = "#22C55E" }) => {
  const [k, setK] = useState(null);
  useEffect(() => { api.kpis().then(setK); }, []);

  if (!k) {
    return <div className="h-44 bg-[#141414] border border-white/10 rounded-sm animate-pulse" />;
  }

  return (
    <div
      data-testid="hybrid-disclosure"
      className="bg-[#141414] border rounded-sm p-4"
      style={{ borderColor: `${accent}55` }}
    >
      <div className="flex items-start gap-2 mb-3">
        <Database className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: accent }} />
        <div>
          <div className="font-mono-data text-[10px] uppercase tracking-[0.18em]" style={{ color: accent }}>
            {k.disclosure_mode}
          </div>
          <div className="font-display text-base font-semibold mt-0.5">
            What is real · what is simulated
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <Row label="Live · pipeline-ready" items={k.disclosure_live} accent="#22C55E" />
        <Row label="Simulated · demonstration" items={k.disclosure_simulated} accent="#A1A1AA" />
      </div>

      <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40 pt-2 border-t border-white/5 flex items-start gap-1.5">
        <ShieldCheck className="w-3 h-3 flex-shrink-0 mt-0.5" />
        <span className="normal-case tracking-normal text-white/50">
          {k.disclosure_reason}
        </span>
      </div>
    </div>
  );
};

const Row = ({ label, items, accent }) => (
  <div>
    <div className="font-mono-data text-[10px] uppercase tracking-wider mb-1" style={{ color: accent }}>
      {label}
    </div>
    {items.map((s) => (
      <div key={s} className="flex items-start gap-2 text-xs text-white/70">
        <span className="text-white/30 mt-0.5 flex-shrink-0">✓</span>
        <span>{s}</span>
      </div>
    ))}
  </div>
);
