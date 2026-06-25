import { useEffect, useState } from "react";
import { PortalNav } from "@/components/PortalNav";
import { Copilot } from "@/components/Copilot";
import { Toaster } from "@/components/ui/sonner";
import { api } from "@/lib/api";
import { NoticeDialog } from "@/components/NoticeDialog";
import { toast } from "sonner";
import { Hammer, Factory, Flame, Truck, Shield, MapPin, Clock, CheckCircle2 } from "lucide-react";

const TYPE_META = {
  construction_permit: { icon: Hammer, label: "Construction" },
  industrial_stack: { icon: Factory, label: "Industrial" },
  waste_burning_zone: { icon: Flame, label: "Burning" },
  diesel_fleet_route: { icon: Truck, label: "Fleet" },
};

const PRIORITY_STYLE = {
  P1: { c: "#EF4444", l: "P1 · CRITICAL" },
  P2: { c: "#F97316", l: "P2 · HIGH" },
  P3: { c: "#EAB308", l: "P3 · STANDARD" },
};

export default function Inspector() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    api.enforcement().then(setRows);
  }, []);

  const visible = rows.filter((r) =>
    filter === "all" ? true : filter === "pending" ? r.status === "pending" : r.status !== "pending"
  );

  const ack = async (id) => {
    try {
      const updated = await api.acknowledge(id);
      setRows((rs) => rs.map((x) => (x.id === id ? updated : x)));
      toast.success(`${id} marked as dispatched`);
    } catch {
      toast.error("Could not acknowledge");
    }
  };

  const stats = {
    pending: rows.filter((r) => r.status === "pending").length,
    acked: rows.filter((r) => r.status !== "pending").length,
    p1: rows.filter((r) => r.priority === "P1" && r.status === "pending").length,
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <PortalNav />

      <main className="max-w-[1100px] mx-auto px-4 lg:px-6 py-6 space-y-5" data-testid="inspector-main">
        <section>
          <div className="font-mono-data text-[10px] uppercase tracking-[0.3em] text-[#F97316] mb-2">
            Field Inspector Queue
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tighter">
            Your dispatch list.
          </h1>
        </section>

        <section className="grid grid-cols-3 gap-3">
          <StatBox testid="inspector-stat-pending" label="Pending" value={stats.pending} accent="#EAB308" />
          <StatBox testid="inspector-stat-p1" label="P1 Critical" value={stats.p1} accent="#EF4444" />
          <StatBox testid="inspector-stat-acked" label="Dispatched" value={stats.acked} accent="#22C55E" />
        </section>

        <div className="flex items-center gap-1 border border-white/10 rounded-sm self-start bg-[#0A0A0A]">
          {[
            { v: "pending", l: "Pending" },
            { v: "done", l: "Dispatched" },
            { v: "all", l: "All" },
          ].map((b) => (
            <button
              key={b.v}
              data-testid={`inspector-filter-${b.v}`}
              onClick={() => setFilter(b.v)}
              className={`px-4 py-2 font-mono-data text-[10px] uppercase tracking-wider rounded-sm transition-colors ${
                filter === b.v ? "bg-white text-black" : "text-white/60 hover:text-white"
              }`}
            >
              {b.l}
            </button>
          ))}
        </div>

        <section className="space-y-3">
          {visible.length === 0 && (
            <div className="bg-[#141414] border border-white/10 rounded-sm p-10 text-center font-mono-data text-xs uppercase tracking-wider text-white/40">
              Queue clear
            </div>
          )}
          {visible.map((r) => {
            const meta = TYPE_META[r.source_type] || { icon: Shield, label: r.source_type_label };
            const Icon = meta.icon;
            const pri = PRIORITY_STYLE[r.priority];
            const ev = r.evidence;
            return (
              <div
                key={r.id}
                data-testid={`inspector-card-${r.id}`}
                className="bg-[#141414] border border-white/10 hover:border-white/30 rounded-sm p-5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div>
                    <span
                      className="font-mono-data text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm border"
                      style={{ color: pri.c, borderColor: `${pri.c}66`, background: `${pri.c}1a` }}
                    >
                      {pri.l}
                    </span>
                    <span className="ml-3 font-mono-data text-[10px] uppercase tracking-wider text-white/40">
                      {r.id}
                    </span>
                  </div>
                  {r.status !== "pending" && (
                    <span className="font-mono-data text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm border border-[#22C55E]/40 text-[#22C55E] bg-[#22C55E]/10 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Dispatched
                    </span>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 text-white/50 mt-1" />
                  <div className="flex-1">
                    <div className="font-display text-lg font-semibold leading-tight">{r.action}</div>
                    <div className="text-sm text-white/60 mt-1 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.ward_name}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ETA {r.eta_hours}h</span>
                      <span>· {meta.label}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40 mb-1">Hotspot</div>
                    <div className="font-mono-data tabular">
                      AQI <span className="text-white">{ev.hotspot_current_aqi}</span> · peak <span className="text-[#F97316]">{ev.hotspot_forecast_peak_24h}</span>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40 mb-1">Evidence ({ev.correlated_registry_count} records)</div>
                    <div className="font-mono-data text-[11px] text-white/70">
                      {ev.sample_registry_entries.slice(0, 2).map((s) => (
                        <div key={s.id} className="truncate"><span className="text-[#EAB308]">{s.id}</span> · {s.details}</div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2 flex-wrap">
                  <NoticeDialog recId={r.id} recLabel={`${r.ward_name} · ${meta.label}`} />
                  {r.status === "pending" && (
                    <button
                      data-testid={`inspector-ack-${r.id}`}
                      onClick={() => ack(r.id)}
                      className="font-mono-data text-xs uppercase tracking-wider px-4 py-2 bg-white text-black hover:bg-[#EAB308] rounded-sm transition-colors"
                    >
                      Mark Dispatched
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </main>

      <Copilot />
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}

const StatBox = ({ testid, label, value, accent }) => (
  <div data-testid={testid} className="bg-[#141414] border border-white/10 rounded-sm p-3">
    <div className="font-mono-data text-[9px] uppercase tracking-wider text-white/40">{label}</div>
    <div className="font-mono-data text-2xl tabular mt-1" style={{ color: accent }}>{value}</div>
  </div>
);
