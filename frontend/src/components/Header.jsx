import { Activity, Radio } from "lucide-react";

export const Header = () => {
  return (
    <header
      data-testid="app-header"
      className="border-b border-white/10 sticky top-0 z-40 bg-[#0A0A0A]/90 backdrop-blur supports-[backdrop-filter]:bg-[#0A0A0A]/70"
    >
      <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border border-white/20 rounded-sm flex items-center justify-center bg-white text-black">
            <Activity className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-bold tracking-tight">
              AeroSentinel<span className="text-[#EAB308]">.</span>
            </div>
            <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-white/50">
              Urban Air Intelligence · Delhi
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6 text-xs font-mono-data uppercase tracking-wider">
          <div className="flex items-center gap-2 text-white/60">
            <Radio className="w-3.5 h-3.5 text-[#22C55E] pulse-dot" />
            <span>14 wards · live</span>
          </div>
          <div className="text-white/40">v1.0 · demo build</div>
          <div className="px-2 py-1 border border-[#EAB308]/40 bg-[#EAB308]/10 text-[#EAB308] rounded-sm">
            ET AI Hackathon 2026
          </div>
        </div>
      </div>
    </header>
  );
};
