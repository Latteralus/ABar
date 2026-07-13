interface StatTileProps {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}

export function StatTile({ label, value, tone = "neutral" }: StatTileProps) {
  return (
    <div className="stat-tile">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${tone !== "neutral" ? tone : ""}`}>{value}</div>
    </div>
  );
}
