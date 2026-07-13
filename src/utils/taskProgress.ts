import { getProduct } from "@/data/products/products";
import type { EntityId, GameState, ServiceTask, TaskType } from "@/types";

const ACTIVE_STATUSES: ServiceTask["status"][] = ["assigned", "in_progress"];

/** Task types whose target should name the specific drink/dish, not just the customer — e.g. "Making Margarita for Jamie Rivera" instead of "Preparing a drink for Jamie Rivera". */
const ORDER_TASK_TYPES: ReadonlySet<TaskType> = new Set(["prepare_drink", "deliver_drink", "prepare_food", "deliver_food"]);

const TASK_TYPE_LABEL: Record<TaskType, string> = {
  greet_customer: "Greeting",
  seat_customer: "Seating",
  take_order: "Taking an order from",
  prepare_drink: "Making",
  deliver_drink: "Delivering",
  prepare_food: "Preparing",
  deliver_food: "Delivering",
  process_payment: "Processing payment for",
  remove_customer: "Removing",
  clean_bar: "Cleaning the bar",
  clean_table: "Cleaning a table",
  repair_equipment: "Repairing",
  clean_attraction: "Cleaning",
  repair_attraction: "Repairing",
};

export function progressPercent(task: ServiceTask): number {
  if (task.durationGameMinutes <= 0) return 100;
  const pct = ((task.durationGameMinutes - task.remainingGameMinutes) / task.durationGameMinutes) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export function activeTaskForEmployee(state: GameState, employeeId: EntityId): ServiceTask | undefined {
  return state.tasks.find((t) => t.assignedEmployeeId === employeeId && ACTIVE_STATUSES.includes(t.status));
}

export function activeTaskForEquipment(state: GameState, equipmentId: EntityId): ServiceTask | undefined {
  return state.tasks.find((t) => t.equipmentId === equipmentId && ACTIVE_STATUSES.includes(t.status));
}

export function activeTaskForAttraction(state: GameState, attractionId: EntityId): ServiceTask | undefined {
  return state.tasks.find((t) => t.attractionId === attractionId && ACTIVE_STATUSES.includes(t.status));
}

function targetLabel(state: GameState, task: ServiceTask): string {
  if (ORDER_TASK_TYPES.has(task.type) && task.orderId) {
    const order = state.orders.find((o) => o.id === task.orderId);
    const customer = task.customerId ? state.customers.find((c) => c.id === task.customerId) : undefined;
    if (order) {
      const product = getProduct(order.productId);
      if (!customer) return product.name;
      const preposition = task.type.startsWith("deliver") ? "to" : "for";
      return `${product.name} ${preposition} ${customer.firstName} ${customer.lastName}`;
    }
  }
  if (task.customerId) {
    const c = state.customers.find((c) => c.id === task.customerId);
    if (c) return `${c.firstName} ${c.lastName}`;
  }
  if (task.equipmentId) {
    const e = state.equipment.find((e) => e.id === task.equipmentId);
    if (e) return e.name;
  }
  if (task.attractionId) {
    const a = state.attractions.find((a) => a.id === task.attractionId);
    if (a) return a.name;
  }
  return "";
}

/** e.g. "Repairing Bar Station (40%)" — resolves the task's target name and progress for display in employee/equipment/attraction screens. */
export function describeTask(state: GameState, task: ServiceTask): string {
  const verb = TASK_TYPE_LABEL[task.type] ?? task.type;
  const target = targetLabel(state, task);
  return `${verb}${target ? " " + target : ""} (${progressPercent(task)}%)`;
}
