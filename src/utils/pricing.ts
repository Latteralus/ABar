export type PriceTier = "Low" | "Mid" | "High";

export function classifyPriceTier(actualCents: number, referenceCents: number): PriceTier {
  if (referenceCents <= 0) return "Mid";
  const ratio = actualCents / referenceCents;
  if (ratio < 0.85) return "Low";
  if (ratio > 1.25) return "High";
  return "Mid";
}

export function priceTierTone(tier: PriceTier): "positive" | "warning" | "neutral" {
  if (tier === "Low") return "positive";
  if (tier === "High") return "warning";
  return "neutral";
}
