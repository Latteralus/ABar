/** Money is stored in integer cents everywhere to avoid floating-point drift in ledgers. */
export type Cents = number;

export type EntityId = string;

/** In-game timestamp, minutes since the save's epoch (game day 0, 00:00). */
export type GameMinute = number;

export interface GameDate {
  /** Day number since the save started, day 1 is the first operating day. */
  day: number;
  /** 0-23 */
  hour: number;
  /** 0-59 */
  minute: number;
}

export type PaymentMethod = "cash" | "card";

/** 0-100 scale used for all skill/satisfaction/condition style stats. */
export type Percent0to100 = number;
