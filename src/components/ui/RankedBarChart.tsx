import { useState } from "react";

export interface RankedBarItem {
  label: string;
  value: number;
}

interface RankedBarChartProps {
  items: RankedBarItem[];
  color?: string;
  formatValue?: (value: number) => string;
  emptyLabel?: string;
}

/** Horizontal ranked-magnitude bars (e.g. "revenue by product") — a categorical ranking, not a
 * time series, so this is deliberately a different chart form from TrendChart rather than reusing
 * a line for data that isn't sequential. */
export function RankedBarChart({ items, color = "var(--accent)", formatValue = (v) => String(v), emptyLabel = "No data yet." }: RankedBarChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  if (items.length === 0) return <p style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{emptyLabel}</p>;

  const sorted = [...items].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((i) => i.value), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {sorted.map((item) => {
        const pct = Math.max((item.value / max) * 100, 1.5);
        const isHovered = hovered === item.label;
        return (
          <div
            key={item.label}
            onMouseEnter={() => setHovered(item.label)}
            onMouseLeave={() => setHovered(null)}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <div style={{ width: 120, flexShrink: 0, fontSize: 12, color: "var(--text-secondary)", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.label}
            </div>
            <div style={{ flex: 1, background: "var(--bg-panel)", borderRadius: 3, position: "relative", height: 20 }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: color,
                  opacity: isHovered ? 1 : 0.85,
                  borderRadius: 3,
                  transition: "opacity 100ms ease, width 200ms ease",
                }}
              />
            </div>
            <div style={{ width: 84, flexShrink: 0, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 12, color: "var(--text-primary)" }}>
              {formatValue(item.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
