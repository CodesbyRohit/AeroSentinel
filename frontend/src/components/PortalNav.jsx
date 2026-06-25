import { NavLink } from "react-router-dom";
import { Activity, ShieldAlert, User, Hammer, Sparkles, FileText } from "lucide-react";

const PORTALS = [
  { to: "/", label: "Why This Matters", icon: Sparkles, testid: "portal-landing" },
  { to: "/command", label: "Command Center", icon: ShieldAlert, testid: "portal-command" },
  { to: "/citizen", label: "Citizen", icon: User, testid: "portal-citizen" },
  { to: "/inspector", label: "Inspector", icon: Hammer, testid: "portal-inspector" },
];

export const PortalNav = ({ accent = "#EAB308" }) => {
  return (
    <header
      data-testid="portal-nav"
      className="border-b border-white/10 sticky top-0 z-40 bg-[#0A0A0A]/90 backdrop-blur supports-[backdrop-filter]:bg-[#0A0A0A]/70"
    >
      <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-3 flex items-center justify-between gap-6 flex-wrap">
        <NavLink to="/" className="flex items-center gap-3" data-testid="portal-logo">
          <div
            className="w-9 h-9 border border-white/20 rounded-sm flex items-center justify-center"
            style={{ background: "#fff", color: "#000" }}
          >
            <Activity className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-bold tracking-tight">
              AeroSentinel<span style={{ color: accent }}>.</span>
            </div>
            <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-white/50">
              Urban Air Intelligence · Delhi
            </div>
          </div>
        </NavLink>

        <nav className="flex items-center gap-1">
          {PORTALS.map((p) => {
            const Icon = p.icon;
            return (
              <NavLink
                key={p.to}
                to={p.to}
                end={p.to === "/"}
                data-testid={p.testid}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-sm font-mono-data text-[10px] uppercase tracking-wider transition-colors ${
                    isActive
                      ? "bg-white text-black"
                      : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {p.label}
              </NavLink>
            );
          })}
          <NavLink
            to="/pitch"
            data-testid="portal-pitch"
            className="ml-2 flex items-center gap-1.5 px-3 py-2 border border-white/20 hover:border-white/50 text-white/80 hover:text-white rounded-sm font-mono-data text-[10px] uppercase tracking-wider transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Pitch Deck ↗
          </NavLink>
        </nav>
      </div>
    </header>
  );
};
