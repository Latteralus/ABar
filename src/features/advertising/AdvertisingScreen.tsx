import { useGameStore } from "@/stores/gameStore";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { formatCents } from "@/utils/money";
import { ADVERTISING_CATALOG } from "@/data/advertising/advertisingCatalog";
import { computePromotionStats, type PromotionStats } from "@/simulation/engine/advertising";
import type { PromotionCatalogEntry } from "@/types";

const CHANNEL_LABEL: Record<string, string> = {
  newspaper: "Newspaper",
  flyers: "Flyers",
  radio: "Radio",
  social_media: "Social Media",
  drink_special: "Drink Special",
  happy_hour: "Happy Hour",
  live_entertainment: "Live Entertainment",
};

export function AdvertisingScreen() {
  const state = useGameStore((s) => s.state);
  const purchasePromotion = useGameStore((s) => s.purchasePromotion);
  if (!state) return null;

  const stats = computePromotionStats(state);

  const catalogColumns: DataTableColumn<PromotionCatalogEntry>[] = [
    { key: "name", header: "Name", render: (e) => e.name },
    { key: "channel", header: "Channel", render: (e) => CHANNEL_LABEL[e.channel] ?? e.channel },
    { key: "description", header: "Description", render: (e) => e.description },
    { key: "cost", header: "Cost", render: (e) => formatCents(e.costCents) },
    { key: "duration", header: "Duration", render: (e) => `${e.durationDays}d` },
    { key: "peak", header: "Peak Effect", render: (e) => `+${Math.round((e.peakDemandMultiplier - 1) * 100)}%` },
    {
      key: "launch",
      header: "",
      render: (e) => {
        const alreadyActive = state.activePromotions.some((p) => p.catalogId === e.id);
        return (
          <button
            className="btn btn-primary"
            disabled={state.cash < e.costCents || alreadyActive}
            title={alreadyActive ? "Already running" : undefined}
            onClick={() => purchasePromotion(e.id)}
          >
            Launch
          </button>
        );
      },
    },
  ];

  const activeColumns: DataTableColumn<PromotionStats>[] = [
    { key: "name", header: "Name", render: (s) => s.promotion.name },
    { key: "channel", header: "Channel", render: (s) => CHANNEL_LABEL[s.promotion.channel] ?? s.promotion.channel },
    { key: "cost", header: "Cost", render: (s) => formatCents(s.promotion.costCents) },
    { key: "elapsed", header: "Days Elapsed", render: (s) => `${s.daysElapsed}` },
    { key: "remaining", header: "Days Remaining", render: (s) => `${s.daysRemaining}` },
    { key: "effect", header: "Current Demand Effect", render: (s) => `+${s.currentDemandBonusPercent}%` },
    { key: "estimate", header: "Est. Extra Customers Today", render: (s) => `${s.estimatedExtraCustomersToday}` },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Advertising</h1>
      </div>

      <Card title="Active Promotions">
        <DataTable columns={activeColumns} rows={stats} rowKey={(s) => s.promotion.id} emptyLabel="No active campaigns." />
      </Card>

      <Card title="Launch a Campaign or Promotion">
        <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
          Newspaper/flyers/radio/social media build awareness gradually over several days. Drink specials, happy hour, and live
          entertainment affect only the day they're launched. Advertising modifies demand — it never guarantees customers.
        </p>
        <DataTable columns={catalogColumns} rows={[...ADVERTISING_CATALOG]} rowKey={(e) => e.id} emptyLabel="No campaigns available." />
      </Card>
    </div>
  );
}
