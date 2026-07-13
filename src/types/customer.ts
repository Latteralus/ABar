import type { Cents, EntityId, GameMinute, Percent0to100 } from "./common";
import type { ProductCategory } from "./product";

export type AgeGroup = "young_adult" | "adult" | "middle_aged" | "senior";
export type IncomeLevel = "low" | "middle" | "high";

export type CustomerStatus =
  | "considering_visit"
  | "arriving"
  | "waiting_for_seat"
  | "seated"
  | "waiting_to_order"
  | "waiting_for_drink"
  | "waiting_for_food"
  | "consuming"
  | "deciding_next_order"
  | "waiting_for_attraction"
  | "using_attraction"
  | "waiting_to_pay"
  | "leaving"
  | "left"
  | "removed";

export type CustomerLeaveReason =
  | "no_seating"
  | "wait_too_long"
  | "price_too_high"
  | "item_unavailable"
  | "dissatisfied"
  | "closing_time"
  | "satisfied_departure"
  | "removed_intoxication";

/** A named, reusable pattern of preferences the random customer generator draws from. */
export interface CustomerArchetype {
  id: EntityId;
  label: string;
  ageGroup: AgeGroup;
  incomeLevel: IncomeLevel;
  preferredCategories: ProductCategory[];
  /** Multiplier applied to base spending budget. */
  budgetMultiplier: number;
  /** 0-100: higher tolerates higher prices. */
  priceSensitivity: Percent0to100;
  /** 0-100: higher waits longer for seating/service. */
  patience: Percent0to100;
  /** 0-100: likelihood of leaving a review after a visit. */
  reviewTendency: Percent0to100;
  /** 0-100: likelihood of ordering again after finishing a drink. */
  reorderTendency: Percent0to100;
  /** 0-100: baseline interest in attractions (pool, darts, ...) before price/queue/group-size adjustments. No dedicated customer "personality" system exists in this codebase (only employees have PersonalityTrait) — archetype attributes are the customer-side equivalent. */
  attractionAffinity: Percent0to100;
}

export interface Customer {
  id: EntityId;
  firstName: string;
  lastName: string;
  archetypeId: EntityId;
  ageGroup: AgeGroup;
  incomeLevel: IncomeLevel;
  spendingBudget: Cents;
  preferredCategories: ProductCategory[];
  priceSensitivity: Percent0to100;
  patience: Percent0to100;
  reviewTendency: Percent0to100;
  reorderTendency: Percent0to100;
  attractionAffinity: Percent0to100;

  intoxication: Percent0to100;
  satisfaction: Percent0to100;

  groupId: EntityId | null;
  arrivalGameMinute: GameMinute;
  status: CustomerStatus;
  seatId: EntityId | null;

  tabId: EntityId | null;
  itemsOrderedCount: number;
  totalSpent: Cents;

  /** Game minute the customer entered its current status, used to detect patience timeouts. */
  statusEnteredAtGameMinute: GameMinute;
  leaveReason?: CustomerLeaveReason;

  /**
   * A randomized length, in minutes, rolled fresh each time the customer enters a
   * variable-duration phase (currently "consuming" and "deciding_next_order" — see
   * customerLifecycle.ts). Lets each phase feel organic (nobody sips a drink for exactly
   * 2 minutes every time) without needing a whole separate per-visit target-duration system.
   */
  phaseTargetMinutes?: number;

  /**
   * Side state machine for the over-intoxication removal flow (Master Plan Section 11) — kept
   * separate from `status` because the customer's main lifecycle status (consuming, deciding,
   * etc.) doesn't need to change just because staff have asked them to leave.
   */
  removalStage?: "warned" | "police_called";
  removalStageEnteredAtGameMinute?: GameMinute;
}

export type GroupSize = 1 | 2 | 3 | 4 | 5 | 6;

export interface CustomerGroup {
  id: EntityId;
  memberIds: EntityId[];
  arrivalGameMinute: GameMinute;
}
