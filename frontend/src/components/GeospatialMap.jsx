import { useEffect, useMemo, useState } from "react";
import { api, bandColor } from "@/lib/api";
import { Hammer, Factory, Flame, Truck, Flame as Fire, Eye, EyeOff } from "lucide-react";

/**
 * Geospatial Source Attribution Map.
 * Renders Delhi wards as AQI nodes + per-ward source-registry bubbles
 * (construction, industrial, burning, fleet) + NASA FIRMS thermal anomalies.
 * Layer toggles let judges peel back what AeroSentinel actually correlates.
 */
const SOURCE_META = {
  construction_permit: { color: "#F59E0B", icon: Hammer, label: "Construction" },
  industrial_stack:    { color: "#A855F7", icon: Factory, label: "Industrial" },
  waste_burning_zone:  { color: "#EF4444", icon: Flame,   label: "Burning" },
  diesel_fleet_route:  { color: "#06B6D4", icon: Truck,   label: "Fleet" },
};

export const GeospatialMap = ({ wards, selectedId, onSelect }) => {
  const [registry, setRegistry] = useState([]);
  const [fires, setFires] = useState([]);
  const [attribution, setAttribution] = useState(null);
  const [layers, setLayers] = useState({
    aqi: true,
    construction: true,
    industrial: true,
    burning: true,
    fleet: true,
    satellite: true,
  });

  useEffect(() => {
    api.registry().then(setRegistry).catch(() => setRegistry([]));
    api.satelliteFires(60).then((d) => setFires(d.detections || [])).catch(() => setFires([]));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    api.sourceAttribution(selectedId).then(setAttribution).catch(() => setAttribution(null));
  }, [selectedId]);

  const { points, regPoints, firePoints, bounds, project } = useMemo(() => {
    if (!wards?.length) return { points: [], regPoints: [], firePoints: [], bounds: null };
    // Pre-compute bounds including fire detections (which can extend beyond ward bbox)
    const allLats = [...wards.map((w) => w.lat), ...fires.map((f) => f.latitude)];
    const allLngs = [...wards.map((w) => w.lng), ...fires.map((f) => f.longitude)];
    const b = {
      minLat: Math.min(...allLats) - 0.03,
      maxLat: Math.max(...allLats) + 0.03,
      minLng: Math.min(...allLngs) - 0.03,
      maxLng: Math.max(...allLngs) + 0.03,
    };
    const W = 900, H = 560;
    const proj = (lat, lng) => {
      const x = ((lng - b.minLng) / (b.maxLng - b.minLng)) * W;
      const y = H - ((lat - b.minLat) / (b.maxLat - b.minLat)) * H;
      return [x, y];
    };
    const pts = wards.map((w) => {
      const [x, y] = proj(w.lat, w.lng);
      return { ...w, x, y, r: 16 + Math.min(26, w.current_aqi / 14) };
    });
    const rps = registry.map((r) => {
      const [x, y] = proj(r.lat, r.lng);
      return { ...r, x, y };
    });
    const fps = fires.map((f) => {
      const [x, y] = proj(f.latitude, f.longitude);
      return { ...f, x, y };
    });
    return { points: pts, regPoints: rps, firePoints: fps, bounds: { W, H }, project: proj };
  }, [wards, registry, fires]);

  if (!points.length) {
    return (
      <div className="bg-[#141414] border border-white/10 rounded-sm h-[620px] flex items-center justify-center text-white/30 font-mono-data text-xs">
        LOADING GEOSPATIAL LAYER...
      </div>
    );
  }

  const visibleRegByType = (t) => {
    const key = { construction_permit: "construction", industrial_stack: "industrial", waste_burning_zone: "burning", diesel_fleet_route: "fleet" }[t];
    return layers[key];
  };

  return (
    <div
      data-testid="geospatial-map"
      className="relative bg-[#141414] border border-white/10 rounded-sm overflow-hidden"
    >
      <div className="absolute inset-0 dot-grid pointer-events-none" />
      <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-white/5 relative z-10 flex-wrap gap-3">
        <div>
          <div className="font-display text-base font-semibold">
            Delhi · Geospatial Source Attribution Map
          </div>
          <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-white/40 mt-0.5">
            Ward AQI · source registry · FIRMS thermal anomalies
          </div>
        </div>
        <LayerToggles layers={layers} setLayers={setLayers} firesCount={fires.length} />
      </div>

      <div className="flex items-stretch">
        <svg
          viewBox={`0 0 ${bounds.W} ${bounds.H}`}
          className="w-full h-[560px] relative z-10"
        >
          {/* Satellite fire detections layer */}
          {layers.satellite && firePoints.map((f, i) => (
            <g key={`f${i}`} data-testid={`fire-${i}`}>
              <circle cx={f.x} cy={f.y} r={8} fill="#EF4444" opacity={0.15} />
              <circle cx={f.x} cy={f.y} r={4} fill="#EF4444" />
              <Fire x={f.x - 6} y={f.y - 18} className="w-3 h-3" />
            </g>
          ))}

          {/* Source registry layer */}
          {regPoints.map((r, i) => {
            if (!visibleRegByType(r.type)) return null;
            const m = SOURCE_META[r.type];
            return (
              <g key={`r${i}`} data-testid={`source-${r.id}`}>
                <circle cx={r.x} cy={r.y} r={4.5} fill={m.color} opacity={0.85} />
                <circle cx={r.x} cy={r.y} r={9} fill={m.color} opacity={0.15} />
              </g>
            );
          })}

          {/* AQI ward nodes */}
          {layers.aqi && points.map((p) => {
            const color = bandColor(p.band);
            const isSelected = p.id === selectedId;
            return (
              <g
                key={p.id}
                data-testid={`ward-node-${p.id}`}
                className="cursor-pointer"
                onClick={() => onSelect?.(p.id)}
              >
                <circle cx={p.x} cy={p.y} r={p.r + 8} fill={color} opacity={0.08} />
                <circle
                  cx={p.x} cy={p.y} r={p.r} fill={color} opacity={0.22}
                  stroke={isSelected ? "#fff" : color}
                  strokeWidth={isSelected ? 3 : 1.5}
                />
                <text x={p.x} y={p.y - p.r - 8} fill="#fff" textAnchor="middle"
                  fontFamily="JetBrains Mono" fontSize="11" style={{ letterSpacing: "0.05em" }}>
                  {p.name.toUpperCase()}
                </text>
                <text x={p.x} y={p.y + 4} fill="#fff" textAnchor="middle"
                  fontFamily="JetBrains Mono" fontSize="13" fontWeight="600">
                  {p.current_aqi}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Attribution side card */}
        {attribution && (
          <AttributionCard data={attribution} />
        )}
      </div>
    </div>
  );
};

const LayerToggles = ({ layers, setLayers, firesCount }) => {
  const TOGGLES = [
    { key: "aqi",          label: "AQI",          color: "#FFFFFF" },
    { key: "construction", label: "Construction", color: SOURCE_META.construction_permit.color },
    { key: "industrial",   label: "Industrial",   color: SOURCE_META.industrial_stack.color },
    { key: "burning",      label: "Burning",      color: SOURCE_META.waste_burning_zone.color },
    { key: "fleet",        label: "Fleet",        color: SOURCE_META.diesel_fleet_route.color },
    { key: "satellite",    label: `FIRMS (${firesCount})`, color: "#EF4444" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1">
      {TOGGLES.map((t) => (
        <button
          key={t.key}
          data-testid={`layer-toggle-${t.key}`}
          onClick={() => setLayers((s) => ({ ...s, [t.key]: !s[t.key] }))}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm font-mono-data text-[10px] uppercase tracking-wider transition-all ${
            layers[t.key] ? "bg-white/10 text-white border border-white/30" : "text-white/40 border border-white/5 hover:border-white/20"
          }`}
        >
          <span className="w-2 h-2 rounded-sm" style={{ background: layers[t.key] ? t.color : "#444" }} />
          {t.label}
          {layers[t.key] ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>
      ))}
    </div>
  );
};

const AttributionCard = ({ data }) => (
  <div className="hidden lg:block w-72 border-l border-white/5 bg-[#0A0A0A] p-4 relative z-10">
    <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-white/50">
      Attribution · {data.ward_name}
    </div>
    <div className="flex items-baseline gap-2 mt-1 mb-3">
      <div className="font-mono-data text-3xl tabular font-semibold" style={{ color: bandColor(data.causes[0] ? "unhealthy" : "good") }}>
        {data.current_aqi}
      </div>
      <span className="font-mono-data text-[10px] uppercase tracking-wider text-[#22C55E]">
        confidence {(data.confidence * 100).toFixed(0)}%
      </span>
    </div>
    <div className="space-y-2">
      {data.causes.map((c) => (
        <div key={c.label} data-testid={`map-driver-${c.label.split(" ")[0].toLowerCase()}`} className="text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/70 truncate">{c.label}</span>
            <span className="font-mono-data tabular text-white">{c.pct}%</span>
          </div>
          <div className="h-1 bg-white/5 rounded-sm overflow-hidden">
            <div className="h-full bg-white/40" style={{ width: `${Math.min(100, c.pct * 3)}%` }} />
          </div>
        </div>
      ))}
    </div>
    <div className="mt-4 pt-3 border-t border-white/5 font-mono-data text-[9px] uppercase tracking-wider text-white/30">
      {Object.entries(data.sources).reduce((acc, [, v]) => acc + v.length, 0)} correlated source records in ward
    </div>
  </div>
);
