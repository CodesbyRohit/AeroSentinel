import { useEffect, useState } from "react";
import { PortalNav } from "@/components/PortalNav";
import { KPIStrip } from "@/components/KPIStrip";
import { GeospatialMap } from "@/components/GeospatialMap";
import { ForecastChart } from "@/components/ForecastChart";
import { EnforcementTable } from "@/components/EnforcementTable";
import { AdvisoryPanel } from "@/components/AdvisoryPanel";
import { AlertFeed } from "@/components/AlertFeed";
import { PolluterLeaderboard } from "@/components/PolluterLeaderboard";
import { ImpactMetrics } from "@/components/ImpactMetrics";
import { TrustBadge } from "@/components/TrustBadge";
import { AQICard } from "@/components/AQICard";
import { RecommendedActions } from "@/components/RecommendedActions";
import { HybridDisclosure } from "@/components/HybridDisclosure";
import { CopilotHero } from "@/components/CopilotHero";
import { InterventionSimulator } from "@/components/InterventionSimulator";
import { AgentBadges } from "@/components/AgentBadges";
import { Copilot } from "@/components/Copilot";
import { api } from "@/lib/api";
import { ShieldCheck } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

export default function CommandCenter() {
  const [kpis, setKpis] = useState(null);
  const [wards, setWards] = useState([]);
  const [selectedWardId, setSelectedWardId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    api.kpis().then(setKpis);
    api.wards().then((w) => {
      setWards(w);
      setSelectedWardId((prev) => prev || w[0]?.id);
    });
  }, []);

  const selectedWard = wards.find((w) => w.id === selectedWardId);
  const onPlanExecuted = () => setReloadKey((k) => k + 1);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <PortalNav />

      <main className="max-w-[1600px] mx-auto px-6 lg:px-8 py-8 space-y-6" data-testid="command-center-main">

        {/* HERO */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-8">
            <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-white/50 mb-3">
              Pollution War Room · Delhi
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-[0.95]">
              Command Center.
            </h1>
            <p className="text-sm md:text-base text-white/60 max-w-2xl mt-4 leading-relaxed">
              Operational dashboard for the city pollution-control officer. Geospatial source attribution, satellite thermal anomalies, intervention simulator with one-click Execute Plan, and AeroCopilot.
            </p>
          </div>
          <div className="lg:col-span-4">
            <HybridDisclosure />
          </div>
        </section>

        {/* KPI strip */}
        <KPIStrip kpis={kpis} />

        {/* IMPACT METRICS */}
        <section>
          <ImpactMetrics variant="compact" />
        </section>

        {/* COPILOT HERO */}
        <CopilotHero wardId={selectedWardId} />

        {/* GEOSPATIAL MAP + ALERT FEED */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <GeospatialMap wards={wards} selectedId={selectedWardId} onSelect={setSelectedWardId} />
          </div>
          <div className="lg:col-span-4">
            <AlertFeed />
          </div>
        </section>

        {/* AQI rich card + Recommended actions */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            {selectedWardId && <AQICard wardId={selectedWardId} />}
          </div>
          <div className="lg:col-span-7">
            {selectedWardId && <RecommendedActions wardId={selectedWardId} />}
          </div>
        </section>

        {/* INTERVENTION SIMULATOR + EXECUTE PLAN */}
        {selectedWardId && (
          <InterventionSimulator wardId={selectedWardId} onExecuted={onPlanExecuted} />
        )}

        {/* Forecast + advisory + trust */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            {selectedWardId && <ForecastChart wardId={selectedWardId} />}
          </div>
          <div className="lg:col-span-4 space-y-6">
            {selectedWardId && <TrustBadge wardId={selectedWardId} />}
            {selectedWardId && (
              <AdvisoryPanel wardId={selectedWardId} wardName={selectedWard?.name || ""} />
            )}
          </div>
        </section>

        {/* Enforcement — reload on Execute */}
        <section key={reloadKey}>
          <EnforcementTable />
        </section>

        {/* Polluter compliance */}
        <section>
          <PolluterLeaderboard />
        </section>

        {/* Multi-agent badges */}
        <AgentBadges />

        <footer className="pt-10 pb-6 border-t border-white/5 text-xs font-mono-data text-white/40 uppercase tracking-wider flex items-center justify-between flex-wrap gap-3">
          <span>AeroSentinel · Command Center · v3</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-[#22C55E]" />
            Forecast → Attribution → Enforcement → Advisory · Vision · Copilot
          </span>
        </footer>
      </main>

      <Copilot wardId={selectedWardId} />
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}
