import type { EntityId, GameMinute } from "./common";

export type ActivityLogCategory =
  | "customer"
  | "employee"
  | "inventory"
  | "sale"
  | "equipment"
  | "maintenance"
  | "attraction"
  | "finance"
  | "advertising"
  | "reputation"
  | "system";

export type ActivityLogSeverity = "info" | "warning" | "critical";

export interface ActivityLogEntry {
  id: EntityId;
  gameMinute: GameMinute;
  gameDay: number;
  category: ActivityLogCategory;
  severity: ActivityLogSeverity;
  message: string;
  relatedEntityId?: EntityId;
}
