import { useEffect, useState } from "react";
import { PortalNav } from "@/components/PortalNav";
import { AdvisoryPanel } from "@/components/AdvisoryPanel";
import { ComplaintForm } from "@/components/ComplaintForm";
import { TrustBadge } from "@/components/TrustBadge";
import { AQICard } from "@/components/AQICard";
import { RecommendedActions } from "@/components/RecommendedActions";
import { Copilot } from "@/components/Copilot";
import { Toaster } from "@/components/ui/sonner";
import { api, bandLabel } from "@/lib/api";

export default function Citizen() {
  const [wards, setWards] = useState([]);
  const [wardId, setWardId] = useState("AV");
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    api.wards().then(setWards);
    api.listComplaints().then(setComplaints);
  }, []);

  const ward = wards.find((w) => w.id === wardId);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <PortalNav />

      <main className="max-w-[1400px] mx-auto px-6 lg:px-8 py-8 space-y-8" data-testid="citizen-main">
        <section>
          <div className="font-mono-data text-[10px] uppercase tracking-[0.3em] text-[#22C55E] mb-3">
            Citizen Portal
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tighter">
            Your air. Your action.
          </h1>
          <p className="text-sm md:text-base text-white/60 max-w-2xl mt-3">
            Check your ward's air quality, read the bilingual advisory, and report any pollution event with a photo — we will route it to the right enforcement officer.
          </p>
        </section>

        <section>
          <div className="bg-[#141414] border border-white/10 rounded-sm p-5 mb-6">
            <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-white/50 mb-3">
              Select your ward
            </div>
            <select
              data-testid="citizen-ward-select"
              value={wardId}
              onChange={(e) => setWardId(e.target.value)}
              className="w-full md:w-96 bg-[#0A0A0A] border border-white/10 rounded-sm px-3 py-2.5 text-sm focus:outline-none focus:border-white text-white"
            >
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} · {w.current_aqi} ({bandLabel(w.band)})
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <AQICard wardId={wardId} />
            <div className="mt-4">
              <TrustBadge wardId={wardId} />
            </div>
          </div>
          <div className="lg:col-span-7 space-y-6">
            <RecommendedActions wardId={wardId} />
            <AdvisoryPanel wardId={wardId} wardName={ward?.name || ""} />
          </div>
        </section>

        <section>
          <ComplaintForm wards={wards} />
        </section>

        {complaints.length > 0 && (
          <section className="bg-[#141414] border border-white/10 rounded-sm">
            <div className="px-5 py-4 border-b border-white/10">
              <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-white/50">
                Recent community complaints
              </div>
              <div className="font-display text-lg font-semibold mt-0.5">Last submissions</div>
            </div>
            <div className="divide-y divide-white/5">
              {complaints.slice(0, 6).map((c) => (
                <div key={c.id} data-testid={`complaint-row-${c.id}`} className="px-5 py-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-mono-data text-[10px] text-white/40 tabular">{c.id}</div>
                    <div className="text-sm">
                      {c.analysis.detected.slice(0, 2).map((d) => d.replace(/_/g, " ")).join(", ")}
                      {c.location_text && <span className="text-white/40"> · {c.location_text}</span>}
                    </div>
                  </div>
                  <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/40">
                    {c.analysis.severity} · {(c.analysis.confidence * 100).toFixed(0)}% · {c.status}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <Copilot wardId={wardId} />
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}
