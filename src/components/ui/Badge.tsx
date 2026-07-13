import type { PropsWithChildren } from "react";

type BadgeVariant = "neutral" | "positive" | "negative" | "warning";

export function Badge({ variant = "neutral", children }: PropsWithChildren<{ variant?: BadgeVariant }>) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}
