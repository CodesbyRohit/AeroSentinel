import { useEffect, useState } from "react";
import { PortalNav } from "@/components/PortalNav";
import { KPIStrip } from "@/components/KPIStrip";
import { WardMap } from "@/components/WardMap";
import { ForecastChart } from "@/components/ForecastChart";
import { EnforcementTable } from "@/components/EnforcementTable";
import { AdvisoryPanel } from "@/components/AdvisoryPanel";
import { AlertFeed } from "@/components/AlertFeed";
import { RiskNarrative } from "@/components/RiskNarrative";
import { PolluterLeaderboard } from "@/components/PolluterLeaderboard";
import { ImpactMetrics } from "@/components/ImpactMetrics";
import { TrustBadge } from "@/components/TrustBadge";
import { Copilot } from "@/components/Copilot";
import { api } from "@/lib/api";
import { Info, ShieldCheck } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

export default function CommandCenter() {
  const [kpis, setKpis] = useState(null);
  const [wards, setWards] = useState([]);
  const [selectedWardId, setSelectedWardId] = useState(null);

  useEffect(() => {
    api.kpis().then(setKpis);
    api.wards().then((w) => {
      setWards(w);
      setSelectedWardId((prev) => prev || w[0]?.id);
    });
  }, []);

  const selectedWard = wards.find((w) => w.id === selectedWardId);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <PortalNav />

      <main className="max-w-[1600px] mx-auto px-6 lg:px-8 py-8 space-y-6" data-testid="command-center-main">

        {/* HERO */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-8">
            <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-[#EAB308] mb-3">
              Pollution War Room · Delhi
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-[0.95]">
              Command Center<span className="text-[#EAB308]">.</span>
            </h1>
            <p className="text-sm md:text-base text-white/60 max-w-2xl mt-4 leading-relaxed">
              Operational dashboard for the city pollution-control officer. Live ward signals, forecast model, prioritised enforcement queue with traceable evidence, and AeroCopilot.
            </p>
          </div>
          <div className="lg:col-span-4">
            <DisclosureCard data={kpis} />
          </div>
        </section>

        {/* KPI strip */}
        <KPIStrip kpis={kpis} />

        {/* IMPACT METRICS — outcomes layer */}
        <section>
          <ImpactMetrics variant="compact" />
        </section>

        {/* Map + alert feed */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <WardMap wards={wards} selectedId={selectedWardId} onSelect={setSelectedWardId} />
          </div>
          <div className="lg:col-span-4">
            <AlertFeed />
          </div>
        </section>

        {/* Forecast + risk narrative + trust */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            {selectedWardId && <ForecastChart wardId={selectedWardId} />}
          </div>
          <div className="lg:col-span-4 space-y-6">
            {selectedWardId && <RiskNarrative wardId={selectedWardId} />}
            {selectedWardId && <TrustBadge wardId={selectedWardId} />}
          </div>
        </section>

        {/* Advisory */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-12">
            {selectedWardId && (
              <AdvisoryPanel wardId={selectedWardId} wardName={selectedWard?.name || ""} />
            )}
          </div>
        </section>

        {/* Enforcement */}
        <section>
          <EnforcementTable />
        </section>

        {/* Polluter compliance scorecards */}
        <section>
          <PolluterLeaderboard />
        </section>

        <footer className="pt-10 pb-6 border-t border-white/5 text-xs font-mono-data text-white/40 uppercase tracking-wider flex items-center justify-between flex-wrap gap-3">
          <span>AeroSentinel · Command Center · v2</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-[#22C55E]" />
            Data Trust Layer · Forecast Agent → Enforcement Agent → Advisory Layer (Gemini 3 Flash)
          </span>
        </footer>
      </main>

      <Copilot wardId={selectedWardId} />
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}

const DisclosureCard = ({ data }) => {
  const live = data?.data_mode === "live_openaq_blended";
  return (
    <div className="bg-[#141414] border border-[#EAB308]/30 rounded-sm p-4">
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 text-[#EAB308] mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#EAB308] mb-1">
            Methodology · {live ? "Live blend active" : "Synthetic seeded"}
          </div>
          <div className="text-xs text-white/60 leading-relaxed">
            {data?.data_disclosure || "AQI readings and registry data are seeded synthetic. Pipeline accepts drop-in OpenAQ / CPCB feeds."}
          </div>
        </div>
      </div>
    </div>
  );
};
