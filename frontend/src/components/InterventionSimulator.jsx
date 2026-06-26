import { useEffect, useMemo, useState } from "react";
import { api, bandColor, aqiBand } from "@/lib/api";
import { toast } from "sonner";
import { Sliders, Zap, Loader2, CheckCircle2 } from "lucide-react";

/**
 * Intervention Simulator — "what if we did X + Y + Z?"
 * Toggling interventions calls the backend; projection updates in place.
 * One-click "Execute Plan" materialises the chosen set as enforcement recs.
 */
export const InterventionSimulator = ({ wardId, onExecuted }) => {
  const [catalog, setCatalog] = useState([]);
  const [selected, setSelected] = useState(new Set(["suspend_construction", "restrict_diesel", "burning_cease_notice"]));
  const [sim, setSim] = useState(null);
  const [busy, setBusy] = useState(false);
  const [exec, setExec] = useState(false);
  const [executed, setExecuted] = useState(null);

  useEffect(() => {
    api.interventionsCatalog().then(setCatalog);
  }, []);

  // Re-simulate whenever ward or selection changes
  useEffect(() => {
    if (!wardId || !catalog.length) return;
    setBusy(true);
    const arr = Array.from(selected);
    api.simulateIntervention(wardId, arr)
      .then(setSim)
      .finally(() => setBusy(false));
  }, [wardId, selected, catalog.length]);

  const toggle = (id) => {
    const ns = new Set(selected);
    ns.has(id) ? ns.delete(id) : ns.add(id);
    setSelected(ns);
  };

  const onExecute = async () => {
    if (!sim || !selected.size) return;
    setExec(true);
    try {
      const res = await api.executePlan(wardId, Array.from(selected));
      setExecuted(res);
      toast.success(`Plan executed — ${res.created_count} dispatches sent`, {
        description: `Queues: ${res.queues_dispatched_to.join(", ")}`,
      });
      onExecuted?.(res);
    } catch {
      toast.error("Execution failed");
    } finally {
      setExec(false);
    }
  };

  if (!catalog.length || !sim) {
    return <div className="h-80 bg-[#141414] border border-white/10 rounded-sm animate-pulse" />;
  }

  const projColor = bandColor(sim.projected_band);
  const peakColor = bandColor(aqiBand(sim.forecast_peak_24h));
  const someSelected = selected.size > 0;

  return (
    <div data-testid="intervention-simulator" className="bg-[#141414] border border-white/10 rounded-sm p-5">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-white/50 flex items-center gap-2">
            <Sliders className="w-3 h-3 text-[#22C55E]" />
            Intervention Simulator · {sim.ward_name}
          </div>
          <div className="font-display text-xl font-semibold mt-1">What if we...</div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 border border-white/10 bg-[#0A0A0A] rounded-sm">
          <span className="font-mono-data text-[10px] uppercase tracking-wider text-white/40">Confidence</span>
          <span data-testid="sim-confidence" className="font-mono-data text-sm tabular font-semibold text-[#22C55E]">
            {(sim.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Intervention checkboxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-5">
        {catalog.map((i) => {
          const isOn = selected.has(i.id);
          return (
            <label
              key={i.id}
              data-testid={`sim-toggle-${i.id}`}
              className={`cursor-pointer flex items-start gap-3 p-3 rounded-sm border transition-colors ${
                isOn ? "border-[#22C55E]/60 bg-[#22C55E]/5" : "border-white/10 bg-[#0A0A0A] hover:border-white/30"
              }`}
            >
              <input
                type="checkbox"
                checked={isOn}
                onChange={() => toggle(i.id)}
                className="mt-1 accent-[#22C55E]"
                data-testid={`sim-checkbox-${i.id}`}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium leading-tight">{i.label}</div>
                <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40 mt-0.5">
                  {i.driver} · ETA {i.lead_time_h}h
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {/* Projection display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <Stat label="Forecast peak (24h)" value={sim.forecast_peak_24h} color={peakColor} testid="sim-peak" />
        <Stat
          label="Expected reduction"
          value={`−${sim.expected_total_reduction}`}
          color="#22C55E"
          testid="sim-reduction"
        />
        <Stat
          label="Projected AQI"
          value={sim.projected_aqi}
          color={projColor}
          testid="sim-projected"
        />
      </div>

      {sim.diminishing_returns_penalty > 0 && (
        <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40 mb-3">
          Diminishing returns penalty applied: −{sim.diminishing_returns_penalty} (two levers hit same driver)
        </div>
      )}

      {/* Action */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/5 flex-wrap">
        <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/50 flex items-center gap-2">
          {busy ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> Simulating…</>
          ) : (
            <>{selected.size} intervention{selected.size === 1 ? "" : "s"} selected</>
          )}
        </div>
        <button
          data-testid="execute-plan-btn"
          onClick={onExecute}
          disabled={!someSelected || exec}
          className="group flex items-center gap-2 font-mono-data text-xs uppercase tracking-wider px-5 py-2.5 bg-white text-black hover:bg-[#22C55E] rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {exec ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Execute Plan
        </button>
      </div>

      {executed && (
        <div data-testid="exec-result" className="mt-4 pt-4 border-t border-[#22C55E]/30">
          <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#22C55E] flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-3 h-3" />
            Plan Executed · {executed.executed_at.slice(11, 16)} UTC
          </div>
          <div className="text-sm text-white/80 mb-3">
            <span className="font-mono-data tabular text-[#22C55E]">{executed.created_count}</span> auto-planned dispatches sent to{" "}
            <span className="text-white">{executed.queues_dispatched_to.join(", ")}</span>.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {executed.created.map((r) => (
              <div
                key={r.id}
                data-testid={`exec-rec-${r.id}`}
                className="border border-white/10 bg-[#0A0A0A] rounded-sm p-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono-data text-[10px] uppercase tracking-wider text-[#22C55E]">
                    {r.id}
                  </span>
                  <span className="font-mono-data text-[10px] uppercase tracking-wider text-white/40">
                    {r.priority} · −{r.expected_aqi_reduction}
                  </span>
                </div>
                <div className="text-xs text-white/80 mt-1 truncate">{r.action}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value, color, testid }) => (
  <div data-testid={testid} className="bg-[#0A0A0A] border border-white/5 rounded-sm p-3">
    <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40">{label}</div>
    <div className="font-mono-data text-3xl tabular font-semibold mt-1" style={{ color }}>
      {value}
    </div>
  </div>
);
