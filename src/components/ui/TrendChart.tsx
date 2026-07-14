import { useId, useMemo, useState } from "react";

export interface TrendSeries {
  name: string;
  color: string;
  points: { day: number; value: number }[];
}

interface TrendChartProps {
  series: TrendSeries[];
  height?: number;
  formatValue?: (value: number) => string;
}

const WIDTH = 600;
const PAD_LEFT = 46;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

/** Rounds to a "clean" step (1/2/5 * 10^n) for gridline ticks, same convention as axis ticks everywhere else. */
function niceStep(roughStep: number): number {
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep || 1)));
  const residual = roughStep / magnitude;
  const step = residual >= 5 ? 10 : residual >= 2 ? 5 : residual >= 1 ? 2 : 1;
  return step * magnitude;
}

/**
 * A small multi-series line/area chart with a hover crosshair + tooltip (Section: this codebase
 * has no charting dependency by design — see PROJECT_STATUS.md's minimal-deps philosophy — so this
 * is a hand-rolled SVG primitive rather than pulling in a library for a handful of trend lines).
 * Always pair this with a nearby DataTable of the same data — this chart is a supplement, not the
 * only place the numbers live.
 */
export function TrendChart({ series, height = 180, formatValue = (v) => String(v) }: TrendChartProps) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const days = useMemo(() => Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.day)))).sort((a, b) => a - b), [series]);

  const allValues = series.flatMap((s) => s.points.map((p) => p.value));
  const dataMin = allValues.length > 0 ? Math.min(...allValues) : 0;
  const dataMax = allValues.length > 0 ? Math.max(...allValues) : 1;
  const crossesZero = dataMin < 0 && dataMax > 0;
  const range = dataMax - dataMin;
  // A single data point (or every point equal) makes range 0 — fall back to a step scaled to the
  // *value's own magnitude*, not a bare "1", which produced a gridline step of 2 against
  // million-cent values (a 750,000-line chart that crashed the renderer — a real bug this comment
  // is here to stop from regressing).
  const step = niceStep(range > 0 ? range / 4 : Math.abs(dataMax) / 4 || 1);
  const yMin = Math.min(dataMin < 0 ? Math.floor(dataMin / step) * step : 0, 0);
  const yMax = Math.max(Math.ceil(dataMax / step) * step, yMin + step);

  const dayMin = days[0] ?? 0;
  const dayMax = days[days.length - 1] ?? 1;
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = height - PAD_TOP - PAD_BOTTOM;

  const xForDay = (day: number) => PAD_LEFT + (dayMax === dayMin ? plotWidth / 2 : ((day - dayMin) / (dayMax - dayMin)) * plotWidth);
  const yForValue = (value: number) => PAD_TOP + (1 - (value - yMin) / (yMax - yMin || 1)) * plotHeight;

  // Hard cap regardless of how yMin/yMax/step end up computed — a chart is never worth more than
  // a handful of gridlines, and this guarantees a bad step size can produce a slow/garbled chart at
  // worst, never another unbounded-element renderer crash like the one above.
  const gridlineValues: number[] = [];
  for (let v = yMin; v <= yMax + 1e-9 && gridlineValues.length < 12; v += step) gridlineValues.push(Math.round(v * 100) / 100);

  if (days.length === 0) {
    return <p style={{ color: "var(--text-muted)", fontSize: 12.5 }}>Not enough history yet.</p>;
  }

  const hoveredDay = hoverIndex !== null ? days[hoverIndex] : null;

  return (
    <div style={{ position: "relative" }}>
      {series.length > 1 && (
        <div style={{ display: "flex", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
          {series.map((s) => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--text-secondary)" }}>
              <span style={{ display: "inline-block", width: 14, height: 2, background: s.color, borderRadius: 1 }} />
              {s.name}
            </div>
          ))}
        </div>
      )}

      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={series.map((s) => s.name).join(", ") + " over time"}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relativeX = ((e.clientX - rect.left) / rect.width) * WIDTH;
          let nearest = 0;
          let nearestDist = Infinity;
          days.forEach((day, i) => {
            const dist = Math.abs(xForDay(day) - relativeX);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearest = i;
            }
          });
          setHoverIndex(nearest);
        }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Gridlines — hairline, recessive; the zero baseline (when data crosses it) gets a bolder line. */}
        {gridlineValues.map((v) => (
          <g key={v}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yForValue(v)}
              y2={yForValue(v)}
              stroke={v === 0 && crossesZero ? "var(--border)" : "var(--border)"}
              strokeOpacity={v === 0 && crossesZero ? 0.9 : 0.5}
              strokeWidth={v === 0 && crossesZero ? 1.5 : 1}
            />
            <text x={PAD_LEFT - 8} y={yForValue(v) + 3} textAnchor="end" fontSize="10" fill="var(--text-muted)" fontFamily="var(--font-mono)">
              {formatValue(v)}
            </text>
          </g>
        ))}

        {/* Day axis: first/last day only, sparing per the "label selectively" rule. */}
        <text x={xForDay(dayMin)} y={height - 6} textAnchor="start" fontSize="10" fill="var(--text-muted)">
          Day {dayMin}
        </text>
        {dayMax !== dayMin && (
          <text x={xForDay(dayMax)} y={height - 6} textAnchor="end" fontSize="10" fill="var(--text-muted)">
            Day {dayMax}
          </text>
        )}

        {series.map((s) => {
          const linePoints = s.points.filter((p) => days.includes(p.day)).sort((a, b) => a.day - b.day);
          if (linePoints.length === 0) return null;
          const linePath = linePoints.map((p, i) => `${i === 0 ? "M" : "L"} ${xForDay(p.day)} ${yForValue(p.value)}`).join(" ");
          const areaPath = `${linePath} L ${xForDay(linePoints[linePoints.length - 1].day)} ${yForValue(yMin)} L ${xForDay(linePoints[0].day)} ${yForValue(yMin)} Z`;
          const last = linePoints[linePoints.length - 1];

          return (
            <g key={s.name}>
              <defs>
                <linearGradient id={`${gradientId}-${s.name}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.14} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <path d={areaPath} fill={`url(#${gradientId}-${s.name})`} stroke="none" />
              <path d={linePath} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {/* End marker: surface ring keeps it legible where it crosses gridlines/other lines. */}
              <circle cx={xForDay(last.day)} cy={yForValue(last.value)} r={5} fill={s.color} stroke="var(--bg-panel-raised)" strokeWidth={2} />
            </g>
          );
        })}

        {/* Hover crosshair */}
        {hoveredDay !== null && (
          <line x1={xForDay(hoveredDay)} x2={xForDay(hoveredDay)} y1={PAD_TOP} y2={height - PAD_BOTTOM} stroke="var(--text-secondary)" strokeWidth={1} strokeDasharray="3 3" />
        )}
      </svg>

      {hoveredDay !== null && (
        <div
          style={{
            position: "absolute",
            left: `${(xForDay(hoveredDay) / WIDTH) * 100}%`,
            top: 0,
            transform: xForDay(hoveredDay) > WIDTH * 0.7 ? "translateX(-100%)" : "translateX(8px)",
            background: "var(--bg-panel)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "8px 10px",
            fontSize: 12,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            zIndex: 10,
          }}
        >
          <div style={{ color: "var(--text-secondary)", marginBottom: 4 }}>Day {hoveredDay}</div>
          {series.map((s) => {
            const point = s.points.find((p) => p.day === hoveredDay);
            if (!point) return null;
            return (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ display: "inline-block", width: 10, height: 2, background: s.color, borderRadius: 1 }} />
                <span style={{ color: "var(--text-secondary)" }}>{s.name}</span>
                <strong style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                  {formatValue(point.value)}
                </strong>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
