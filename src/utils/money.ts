import type { Cents } from "@/types";

export function formatCents(cents: Cents): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function dollarsToCents(dollars: number): Cents {
  return Math.round(dollars * 100);
}
