import type { Cents, EntityId, GameMinute } from "./common";

export type EquipmentCategory =
  | "bar_station"
  | "refrigerator"
  | "freezer"
  | "draft_system"
  | "glass_washer"
  | "dishwasher"
  | "cooking_equipment"
  | "table"
  | "bar_stool"
  | "storage_shelving"
  | "point_of_sale"
  | "security_system"
  | "maintenance_tool"
  | "tv";

/** Master Plan Section 48. */
export type EquipmentStatus = "operational" | "degraded" | "failed" | "awaiting_repair" | "under_repair";

export interface EquipmentRepairRecord {
  gameDay: number;
  gameMinute: GameMinute;
  method: "employee" | "contract";
  costCents: Cents;
}

export interface Equipment {
  id: EntityId;
  name: string;
  category: EquipmentCategory;
  purchasePrice: Cents;
  capacity?: number;
  /** Abstract floor/utility footprint units used against the property's equipment space cap. */
  spaceUnits?: number;
  /** 1=basic, 2=mid-tier, 3=premium. Used to present upgrade paths. */
  tier?: number;
  speedRating: number;
  condition: number; // 0-100
  currentStatus: EquipmentStatus;
  /** Set while a contract repair is pending; cleared once resolved (Section 34). */
  contractRepairDueGameDay?: number;
  repairHistory: EquipmentRepairRecord[];
}
