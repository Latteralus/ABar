import type { EntityId } from "./common";

/** One day's reputation snapshot — raw history that trend/daily-change/weekly-change stats are derived from on demand, same convention as DailyReport/AttractionSessionRecord. */
export interface ReputationDayRecord {
  gameDay: number;
  score: number;
  positiveFactors: string[];
  negativeFactors: string[];
}

export interface ReputationState {
  /** 0-100 service reputation (Master Plan Section 28). Changes gradually — see reputationConfig.ts's damping factor. */
  score: number;
  history: ReputationDayRecord[];
}

/** Master Plan Section 29 — assembled from predefined phrase components, never an AI service. */
export interface Review {
  id: EntityId;
  customerId: EntityId;
  customerName: string;
  rating: number;
  text: string;
  gameDay: number;
}
