import type { Cents, EntityId, GameMinute, Percent0to100 } from "./common";
import type { EmployeeRole } from "./product";

export type EmployeeStatus =
  | "idle"
  | "walking"
  | "serving"
  | "preparing_drink"
  | "preparing_food"
  | "cleaning"
  | "restocking"
  | "processing_payment"
  | "handling_issue"
  | "repairing"
  | "waiting"
  | "off_duty";

export type PersonalityTrait =
  | "friendly"
  | "reserved"
  | "efficient"
  | "careless"
  | "methodical"
  | "abrasive"
  | "calm"
  | "energetic"
  | "slow_paced"
  | "detail_oriented"
  | "impatient"
  | "charismatic";

export interface EmployeeSkills {
  bartending: Percent0to100;
  serving: Percent0to100;
  cooking: Percent0to100;
  speed: Percent0to100;
  accuracy: Percent0to100;
  charisma: Percent0to100;
  cleanliness: Percent0to100;
  security: Percent0to100;
  management: Percent0to100;
}

export interface EmployeePerformanceStats {
  customersServed: number;
  itemsPrepared: number;
  ordersFulfilled: number;
  wasteGeneratedCents: Cents;
  tipsEarnedCents: Cents;
}

export interface Employee {
  id: EntityId;
  firstName: string;
  lastName: string;
  role: EmployeeRole;
  wagePerShiftCents: Cents;
  personality: PersonalityTrait[];
  skills: EmployeeSkills;
  /** Total operating shifts worked, drives slow skill progression. */
  shiftsWorked: number;
  hiredAtGameMinute: GameMinute;
  currentTaskId: EntityId | null;
  status: EmployeeStatus;
  performance: EmployeePerformanceStats;
}
