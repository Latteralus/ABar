import { REPUTATION_CONFIG } from "@/config/reputationConfig";
import { clampRound } from "@/utils/clamp";
import { formatPercent } from "@/utils/format";
import type { EventBus } from "@/simulation/events/EventBus";
import type { DailyReport, GameState, OwnedPropertyState } from "@/types";
import { logActivity } from "./activityLogger";

interface Factor {
  label: string;
  delta: number;
}

/**
 * Master Plan Section 28's factor list, each contributing a small signed delta from data that's
 * already computed elsewhere (the daily report, live equipment/employee state) — no new tracking
 * infrastructure needed. Factors can overlap (e.g. long waits show up both directly and via lost
 * customers) — that's intentional, it reflects how compounding problems really do hurt reputation
 * more than any single one.
 */
function computeDailyFactors(prop: OwnedPropertyState, report: DailyReport): Factor[] {
  const factors: Factor[] = [];

  if (report.customerCount > 0) {
    if (report.averageWaitMinutes > REPUTATION_CONFIG.acceptableAverageWaitMinutes) {
      factors.push({ label: "Long wait times", delta: -1.5 });
    } else if (report.averageWaitMinutes < REPUTATION_CONFIG.acceptableAverageWaitMinutes / 2) {
      factors.push({ label: "Fast service", delta: 1 });
    }

    if (report.averageSatisfaction >= 75) {
      factors.push({ label: "High customer satisfaction", delta: 1.5 });
    } else if (report.averageSatisfaction <= 40) {
      factors.push({ label: "Low customer satisfaction", delta: -1.5 });
    }

    const lostRatio = report.customersLost / report.customerCount;
    if (lostRatio > 0.25) {
      factors.push({ label: "Customers leaving unhappy", delta: -1.5 });
    } else if (report.customersLost === 0) {
      factors.push({ label: "No customers lost", delta: 0.5 });
    }
  }

  if ((report.lossReasons.price_too_high ?? 0) > 0) {
    factors.push({ label: "Price complaints", delta: -1 });
  }
  if ((report.lossReasons.removed_intoxication ?? 0) > 0) {
    factors.push({ label: "Customers removed for intoxication", delta: -1 });
  }

  if (prop.barCleanliness < 50) {
    factors.push({ label: "Facility cleanliness issues", delta: -1 });
  } else if (prop.barCleanliness >= 90) {
    factors.push({ label: "Spotless facility", delta: 0.5 });
  }

  const problemEquipmentCount = prop.equipment.filter((e) =>
    (REPUTATION_CONFIG.problemEquipmentStatuses as readonly string[]).includes(e.currentStatus),
  ).length;
  if (problemEquipmentCount > 0) {
    factors.push({ label: "Equipment problems", delta: -1 });
  }

  if (prop.employees.length > 0) {
    const avgSkill =
      prop.employees.reduce((sum, e) => sum + (e.skills.accuracy + e.skills.charisma + e.skills.bartending) / 3, 0) /
      prop.employees.length;
    if (avgSkill >= 75) {
      factors.push({ label: "Skilled, personable staff", delta: 1 });
    } else if (avgSkill <= 35) {
      factors.push({ label: "Staff struggling with skills", delta: -1 });
    }
  }

  return factors;
}

/** Called once per closed day (dayCycle.closeDay) — moves the score gradually, never in one big jump. */
export function updateReputation(state: GameState, prop: OwnedPropertyState, bus: EventBus, report: DailyReport): void {
  const factors = computeDailyFactors(prop, report);
  const rawDelta = factors.reduce((sum, f) => sum + f.delta, 0);
  const appliedDelta = rawDelta * REPUTATION_CONFIG.dampingFactor;

  const previousScore = prop.reputation.score;
  prop.reputation.score = clampRound(previousScore + appliedDelta);

  const positiveFactors = factors
    .filter((f) => f.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .map((f) => f.label);
  const negativeFactors = factors
    .filter((f) => f.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .map((f) => f.label);

  prop.reputation.history.push({
    gameDay: report.gameDay,
    score: prop.reputation.score,
    positiveFactors,
    negativeFactors,
  });

  if (Math.abs(appliedDelta) >= 0.5) {
    const direction = appliedDelta > 0 ? "improved" : "declined";
    logActivity(
      state,
      bus,
      "reputation",
      `Reputation ${direction} to ${formatPercent(prop.reputation.score)} after Day ${report.gameDay}.`,
    );
  }
}

/** Change since the previous recorded day, or 0 if there's no prior record. */
export function reputationDailyChange(prop: OwnedPropertyState): number {
  const history = prop.reputation.history;
  if (history.length < 2) return 0;
  return clampRound(history[history.length - 1].score - history[history.length - 2].score, -100, 100);
}

/** Change over the last 7 recorded days (or however many exist, if fewer). */
export function reputationWeeklyChange(prop: OwnedPropertyState): number {
  const history = prop.reputation.history;
  if (history.length < 2) return 0;
  const weekAgoIndex = Math.max(0, history.length - 1 - 7);
  return clampRound(history[history.length - 1].score - history[weekAgoIndex].score, -100, 100);
}

/** Score-to-demand-multiplier curve (Master Plan Section 30: advertising/reputation modify demand probabilities, never guarantee customers). */
export function reputationDemandMultiplier(prop: OwnedPropertyState): number {
  const score = prop.reputation.score;
  if (score <= 50) {
    const t = score / 50;
    return (
      REPUTATION_CONFIG.demandMultiplierAtZero + t * (REPUTATION_CONFIG.demandMultiplierAtFifty - REPUTATION_CONFIG.demandMultiplierAtZero)
    );
  }
  const t = (score - 50) / 50;
  return (
    REPUTATION_CONFIG.demandMultiplierAtFifty +
    t * (REPUTATION_CONFIG.demandMultiplierAtHundred - REPUTATION_CONFIG.demandMultiplierAtFifty)
  );
}
