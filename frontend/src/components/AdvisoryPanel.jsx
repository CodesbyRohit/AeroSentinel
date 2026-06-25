import { useEffect, useState } from "react";
import { Sparkles, Languages } from "lucide-react";
import { api, bandColor, bandLabel } from "@/lib/api";

export const AdvisoryPanel = ({ wardId, wardName }) => {
  const [lang, setLang] = useState("english");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wardId) return;
    setLoading(true);
    setData(null);
    api.advisory(wardId).then((d) => { setData(d); setLoading(false); });
  }, [wardId]);

  return (
    <div
      data-testid="advisory-panel"
      className="bg-[#141414] border border-white/10 rounded-sm p-5 h-full flex flex-col"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-white/50 flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-[#EAB308]" />
            Citizen Health Risk Advisory
          </div>
          <div className="font-display text-lg font-semibold mt-1">{wardName}</div>
        </div>
        {data && (
          <div
            className="px-2.5 py-1 rounded-sm border font-mono-data text-[10px] uppercase tracking-wider"
            style={{ color: bandColor(data.band), borderColor: `${bandColor(data.band)}66`, background: `${bandColor(data.band)}1a` }}
          >
            {bandLabel(data.band)} · AQI {data.current_aqi}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 mb-4 border border-white/10 rounded-sm self-start bg-[#0A0A0A]">
        {[
          { v: "english", label: "EN" },
          { v: "hindi", label: "हिन्दी" },
        ].map((l) => (
          <button
            key={l.v}
            data-testid={`advisory-lang-${l.v}`}
            onClick={() => setLang(l.v)}
            className={`px-3 py-1.5 font-mono-data text-[10px] uppercase tracking-wider rounded-sm transition-colors ${
              lang === l.v ? "bg-white text-black" : "text-white/60 hover:text-white"
            }`}
          >
            <Languages className="inline w-3 h-3 mr-1" />
            {l.label}
          </button>
        ))}
      </div>

      <div className="flex-1 text-sm leading-relaxed">
        {loading && (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-white/5 rounded-sm w-full" />
            <div className="h-3 bg-white/5 rounded-sm w-5/6" />
            <div className="h-3 bg-white/5 rounded-sm w-4/6" />
            <div className="h-3 bg-white/5 rounded-sm w-3/6" />
            <div className="font-mono-data text-[10px] uppercase tracking-wider text-white/30 mt-3">
              Generating with Gemini 3 Flash…
            </div>
          </div>
        )}
        {!loading && data && (
          <p data-testid={`advisory-text-${lang}`} className={lang === "hindi" ? "font-hi" : ""}>
            {data.advisory[lang]}
          </p>
        )}
      </div>

      {data && (
        <div className="mt-4 pt-3 border-t border-white/5 font-mono-data text-[10px] uppercase tracking-wider text-white/40 flex items-center justify-between">
          <span>Forecast peak 24h · <span className="text-[#F97316]">{data.forecast_peak_24h}</span></span>
          <span>{data.source}</span>
        </div>
      )}
    </div>
  );
};
