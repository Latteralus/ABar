import type { EntityId, GameMinute } from "./common";
import type { EmployeeRole } from "./product";

export type TaskType =
  | "greet_customer"
  | "seat_customer"
  | "take_order"
  | "prepare_drink"
  | "deliver_drink"
  | "prepare_food"
  | "deliver_food"
  | "process_payment"
  | "remove_customer"
  | "clean_bar"
  | "clean_table"
  | "repair_equipment"
  | "clean_attraction"
  | "repair_attraction";

export type TaskStatus = "queued" | "assigned" | "in_progress" | "complete" | "cancelled";

export interface ServiceTask {
  id: EntityId;
  type: TaskType;
  eligibleRoles: EmployeeRole[];
  requiredSkill: keyof import("./employee").EmployeeSkills;
  /** Total game minutes of work required; consumed as the assigned employee works the task. */
  durationGameMinutes: number;
  remainingGameMinutes: number;
  priority: number;
  assignedEmployeeId: EntityId | null;
  customerId: EntityId | null;
  orderId: EntityId | null;
  equipmentId: EntityId | null;
  attractionId: EntityId | null;
  status: TaskStatus;
  createdAtGameMinute: GameMinute;
}

export type OrderStatus = "created" | "queued" | "assigned" | "preparing" | "ready" | "delivering" | "served" | "cancelled";

export interface Order {
  id: EntityId;
  customerId: EntityId;
  productId: EntityId;
  tabId: EntityId;
  status: OrderStatus;
  createdAtGameMinute: GameMinute;
  preparedByEmployeeId: EntityId | null;
  deliveredByEmployeeId: EntityId | null;
  /** Set once the recipe is resolved against current employee skill; used to record waste/quality. */
  qualityResult?: number;
  /** Minutes between order creation and delivery, recorded for daily-report wait-time averages. */
  waitMinutesAtDelivery?: number;
}
