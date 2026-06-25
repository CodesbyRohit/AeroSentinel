import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { KPIStrip } from "@/components/KPIStrip";
import { WardMap } from "@/components/WardMap";
import { ForecastChart } from "@/components/ForecastChart";
import { EnforcementTable } from "@/components/EnforcementTable";
import { AdvisoryPanel } from "@/components/AdvisoryPanel";
import { AlertFeed } from "@/components/AlertFeed";
import { api } from "@/lib/api";
import { Info } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

export default function Dashboard() {
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
      <Header />

      <main className="max-w-[1600px] mx-auto px-6 lg:px-8 py-8 space-y-6" data-testid="dashboard-main">
        {/* HERO */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-8">
            <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-[#EAB308] mb-3">
              Phase 2 · Build Sprint Prototype
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-[0.95]">
              Two agents.<br />
              Three million lungs<span className="text-[#EAB308]">.</span><br />
              <span className="text-white/40">One Delhi.</span>
            </h1>
            <p className="text-sm md:text-base text-white/60 max-w-2xl mt-4 leading-relaxed">
              AeroSentinel turns Delhi&apos;s 14 ward-level signals into ranked,
              evidence-linked enforcement actions — and bilingual citizen
              advisories — in under six hours from signal to dispatch.
            </p>
          </div>
          <div className="lg:col-span-4">
            <DisclosureCard data={kpis?.data_disclosure} />
          </div>
        </section>

        {/* KPI strip */}
        <KPIStrip kpis={kpis} />

        {/* Map + alert feed */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <WardMap wards={wards} selectedId={selectedWardId} onSelect={setSelectedWardId} />
          </div>
          <div className="lg:col-span-4">
            <AlertFeed />
          </div>
        </section>

        {/* Forecast + advisory */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            {selectedWardId && <ForecastChart wardId={selectedWardId} />}
          </div>
          <div className="lg:col-span-4">
            {selectedWardId && (
              <AdvisoryPanel wardId={selectedWardId} wardName={selectedWard?.name || ""} />
            )}
          </div>
        </section>

        {/* Enforcement */}
        <section>
          <EnforcementTable />
        </section>

        <footer className="pt-10 pb-6 border-t border-white/5 text-xs font-mono-data text-white/40 uppercase tracking-wider flex items-center justify-between flex-wrap gap-3">
          <span>AeroSentinel · ET AI Hackathon 2026 · Phase 2 Submission</span>
          <span>Architecture: Forecast Agent → Enforcement Agent → Advisory Layer (Gemini 3 Flash)</span>
        </footer>
      </main>

      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}

const DisclosureCard = ({ data }) => (
  <div className="bg-[#141414] border border-[#EAB308]/30 rounded-sm p-4">
    <div className="flex items-start gap-2">
      <Info className="w-4 h-4 text-[#EAB308] mt-0.5 flex-shrink-0" />
      <div>
        <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[#EAB308] mb-1">
          Methodology · Disclosed
        </div>
        <div className="text-xs text-white/60 leading-relaxed">
          {data || "AQI readings and registry data are SYNTHETIC but realistic, seeded for reproducibility. Pipeline accepts drop-in CPCB / OpenAQ feeds."}
        </div>
      </div>
    </div>
  </div>
);
