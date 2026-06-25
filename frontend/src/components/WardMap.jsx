import { useMemo } from "react";
import { bandColor } from "@/lib/api";

/**
 * A schematic Delhi ward visualisation. Lat/lng are projected to an SVG
 * viewBox. Each ward is a circle sized by AQI. Click selects a ward.
 */
export const WardMap = ({ wards, selectedId, onSelect }) => {
  const { points, bounds } = useMemo(() => {
    if (!wards?.length) return { points: [], bounds: null };
    const lats = wards.map((w) => w.lat);
    const lngs = wards.map((w) => w.lng);
    const b = {
      minLat: Math.min(...lats) - 0.04,
      maxLat: Math.max(...lats) + 0.04,
      minLng: Math.min(...lngs) - 0.04,
      maxLng: Math.max(...lngs) + 0.04,
    };
    const W = 800, H = 500;
    const proj = (lat, lng) => {
      const x = ((lng - b.minLng) / (b.maxLng - b.minLng)) * W;
      const y = H - ((lat - b.minLat) / (b.maxLat - b.minLat)) * H;
      return [x, y];
    };
    const pts = wards.map((w) => {
      const [x, y] = proj(w.lat, w.lng);
      return { ...w, x, y, r: 14 + Math.min(28, w.current_aqi / 14) };
    });
    return { points: pts, bounds: { W, H } };
  }, [wards]);

  if (!points.length) {
    return (
      <div className="bg-[#141414] border border-white/10 rounded-sm h-[520px] flex items-center justify-center text-white/30 font-mono-data text-xs">
        LOADING WARD GRID...
      </div>
    );
  }

  return (
    <div
      data-testid="ward-map"
      className="relative bg-[#141414] border border-white/10 rounded-sm overflow-hidden"
    >
      <div className="absolute inset-0 dot-grid pointer-events-none" />
      <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-white/5 relative z-10">
        <div>
          <div className="font-display text-base font-semibold">Delhi · Ward Surveillance Grid</div>
          <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-white/40 mt-0.5">
            Live readings · click a node to drill in
          </div>
        </div>
        <Legend />
      </div>

      <svg
        viewBox={`0 0 ${bounds.W} ${bounds.H}`}
        className="w-full h-[460px] relative z-10"
      >
        {points.map((p) => {
          const color = bandColor(p.band);
          const isSelected = p.id === selectedId;
          return (
            <g
              key={p.id}
              data-testid={`ward-node-${p.id}`}
              className="cursor-pointer"
              onClick={() => onSelect?.(p.id)}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={p.r + 8}
                fill={color}
                opacity={0.08}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={p.r}
                fill={color}
                opacity={0.18}
                stroke={color}
                strokeWidth={isSelected ? 3 : 1.5}
              />
              <circle cx={p.x} cy={p.y} r={3} fill={color} />
              <text
                x={p.x}
                y={p.y - p.r - 8}
                fill="#fff"
                textAnchor="middle"
                fontFamily="JetBrains Mono"
                fontSize="11"
                style={{ letterSpacing: "0.05em" }}
              >
                {p.name.toUpperCase()}
              </text>
              <text
                x={p.x}
                y={p.y + 4}
                fill="#fff"
                textAnchor="middle"
                fontFamily="JetBrains Mono"
                fontSize="13"
                fontWeight="600"
              >
                {p.current_aqi}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const Legend = () => {
  const bands = [
    { c: "#22C55E", l: "≤100 Good" },
    { c: "#EAB308", l: "≤200 Moderate" },
    { c: "#F97316", l: "≤300 Poor" },
    { c: "#EF4444", l: "≤400 Unhealthy" },
    { c: "#991B1B", l: ">400 Severe" },
  ];
  return (
    <div className="hidden md:flex items-center gap-3 font-mono-data text-[10px] uppercase tracking-wider text-white/60">
      {bands.map((b) => (
        <span key={b.l} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: b.c }} />
          {b.l}
        </span>
      ))}
    </div>
  );
};
