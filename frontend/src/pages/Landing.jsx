import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PortalNav } from "@/components/PortalNav";
import { ImpactMetrics } from "@/components/ImpactMetrics";
import { CopilotHero } from "@/components/CopilotHero";
import { HybridDisclosure } from "@/components/HybridDisclosure";
import { Copilot } from "@/components/Copilot";
import { api, bandColor, bandLabel } from "@/lib/api";
import { ArrowRight, ShieldAlert, User, Hammer, AlertTriangle } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

export default function Landing() {
  const [kpis, setKpis] = useState(null);
  const [risks, setRisks] = useState([]);
  const [topHotspot, setTopHotspot] = useState(null);

  useEffect(() => {
    api.kpis().then(setKpis);
    api.risks().then((r) => { setRisks(r); setTopHotspot(r[0]); });
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <PortalNav />

      <main className="max-w-[1600px] mx-auto px-6 lg:px-8 py-8 space-y-10" data-testid="landing-main">

        {/* HERO */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-4">
          <div className="lg:col-span-7">
            <div className="font-mono-data text-[10px] uppercase tracking-[0.3em] text-white/50 mb-4">
              Why this matters · today
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-[0.92]">
              <span className="text-white/40">Delhi's air is</span><br />
              <span style={{ color: bandColor(kpis?.city_band || "unhealthy") }}>
                {kpis ? bandLabel(kpis.city_band) : "—"}
              </span>
              <span className="text-white/40"> today.</span>
            </h1>
            <p className="text-base md:text-lg text-white/60 max-w-2xl mt-6 leading-relaxed">
              AeroSentinel turns ward-level air signals into ranked enforcement actions and bilingual citizen advisories — in under six hours from signal to dispatch. Below: what we are doing about it right now.
            </p>
          </div>

          <div className="lg:col-span-5">
            <CitywideStatusCard kpis={kpis} />
          </div>
        </section>

        {/* COPILOT HERO — center-stage AI */}
        <CopilotHero />

        {/* IMPACT METRICS */}
        <section>
          <SectionLabel kicker="Outcomes · not pollutants" title="What changes when we act fast." />
          <ImpactMetrics />
        </section>

        {/* PREDICTIVE RISK */}
        {topHotspot && (
          <section className="bg-[#141414] border border-[#EF4444]/40 rounded-sm p-6 lg:p-8">
            <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-[#EF4444] flex items-center gap-2 mb-3">
              <AlertTriangle className="w-3 h-3" />
              Immediate risk · next 24 hours
            </div>
            <p className="font-display text-2xl md:text-3xl tracking-tighter leading-tight max-w-4xl">
              {topHotspot.narrative}
            </p>
            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <Link
                to="/command"
                data-testid="landing-to-command"
                className="flex items-center gap-2 font-mono-data text-xs uppercase tracking-wider px-4 py-2.5 bg-white text-black hover:bg-[#22C55E] rounded-sm transition-colors"
              >
                Open Command Center <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/citizen"
                data-testid="landing-to-citizen"
                className="flex items-center gap-2 font-mono-data text-xs uppercase tracking-wider px-4 py-2.5 border border-white/20 hover:border-white/50 text-white/80 hover:text-white rounded-sm transition-colors"
              >
                Citizen Portal <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>
        )}

        {/* THREE PORTALS */}
        <section>
          <SectionLabel kicker="Stakeholder portals" title="Three lenses on the same intelligence." />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PortalCard
              to="/command"
              testid="portal-card-command"
              icon={ShieldAlert}
              kicker="Operations"
              title="Command Center"
              desc="Live map, hotspots, forecast model, prioritised enforcement queue with one-click dispatch. The pollution war room."
            />
            <PortalCard
              to="/citizen"
              testid="portal-card-citizen"
              icon={User}
              kicker="Citizens · 3M+ served"
              title="Citizen Portal"
              desc="Bilingual ward-level advisory, evidence-based complaint submission with AI-analysed photos, real-time risk."
            />
            <PortalCard
              to="/inspector"
              testid="portal-card-inspector"
              icon={Hammer}
              kicker="Field"
              title="Inspector Queue"
              desc="Sorted dispatch list with evidence trace and auto-drafted notices. Built for tablet, designed for field workflows."
            />
          </div>
        </section>

        {/* DISCLOSURE */}
        <section>
          <SectionLabel kicker="Methodology" title="What is real · what is simulated." />
          <HybridDisclosure />
        </section>

        <footer className="pt-10 pb-6 border-t border-white/5 text-xs font-mono-data text-white/40 uppercase tracking-wider flex items-center justify-between flex-wrap gap-3">
          <span>AeroSentinel · ET AI Hackathon 2026 · Phase 2 Submission</span>
          <span>Forecast Agent → Enforcement Agent → Advisory Layer (Gemini 3 Flash)</span>
        </footer>
      </main>

      <Copilot />
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}

const SectionLabel = ({ kicker, title }) => (
  <div className="mb-5">
    <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-white/50 mb-2">
      {kicker}
    </div>
    <div className="font-display text-2xl md:text-3xl tracking-tight">{title}</div>
  </div>
);

const CitywideStatusCard = ({ kpis }) => {
  if (!kpis) return <div className="h-64 bg-[#141414] border border-white/10 rounded-sm animate-pulse" />;
  return (
    <div className="bg-[#141414] border border-white/10 rounded-sm p-6">
      <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-white/50 mb-3">
        Citywide · right now
      </div>
      <div className="flex items-baseline gap-4 mb-4">
        <div
          className="font-mono-data text-6xl font-semibold tabular tracking-tight"
          style={{ color: bandColor(kpis.city_band) }}
        >
          {kpis.city_aqi}
        </div>
        <div>
          <div
            className="font-mono-data text-[10px] uppercase tracking-wider px-2 py-0.5 inline-block rounded-sm border"
            style={{
              color: bandColor(kpis.city_band),
              borderColor: `${bandColor(kpis.city_band)}66`,
              background: `${bandColor(kpis.city_band)}1a`,
            }}
          >
            {bandLabel(kpis.city_band)}
          </div>
          <div className="text-xs text-white/50 mt-1">Avg across {kpis.stations} wards</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/5">
        <StatusCell label="Hotspots" value={kpis.hotspots_count} accent="#EF4444" />
        <StatusCell label="Pending actions" value={kpis.enforcement_pending} accent="#FFFFFF" />
        <StatusCell label="Signal→Action" value={`${kpis.signal_to_intervention.current_hours}h`} accent="#22C55E" />
      </div>
    </div>
  );
};

const StatusCell = ({ label, value, accent }) => (
  <div>
    <div className="font-mono-data text-[9px] uppercase tracking-wider text-white/40">{label}</div>
    <div className="font-mono-data text-xl tabular mt-0.5" style={{ color: accent }}>{value}</div>
  </div>
);

const PortalCard = ({ to, testid, icon: Icon, kicker, title, desc }) => (
  <Link
    to={to}
    data-testid={testid}
    className="group bg-[#141414] border border-white/10 hover:border-white/40 rounded-sm p-6 transition-colors block"
  >
    <div className="flex items-start justify-between mb-4">
      <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-white/50">
        {kicker}
      </div>
      <Icon className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" strokeWidth={1.5} />
    </div>
    <div className="font-display text-2xl font-semibold tracking-tight mb-2">{title}</div>
    <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
    <div className="mt-4 font-mono-data text-[10px] uppercase tracking-wider text-white/40 group-hover:text-white flex items-center gap-1.5">
      Open <ArrowRight className="w-3 h-3" />
    </div>
  </Link>
);
