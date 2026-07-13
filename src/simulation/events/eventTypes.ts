import type { ActivityLogEntry, Attraction, Customer, Employee, Equipment, Order, Tab } from "@/types";

/**
 * Every cross-system notification the simulation emits. Systems communicate through these
 * events instead of reaching into each other's state directly (Master Plan Section 3).
 */
export interface SimulationEventMap {
  "customer:arrived": { customer: Customer };
  "customer:seated": { customer: Customer };
  "customer:left": { customer: Customer };
  "order:created": { order: Order };
  "order:served": { order: Order };
  "tab:opened": { tab: Tab };
  "tab:closed": { tab: Tab };
  "employee:hired": { employee: Employee };
  "inventory:low_stock": { inventoryItemId: string; itemName: string };
  "equipment:failed": { equipment: Equipment };
  "attraction:failed": { attraction: Attraction };
  "day:opened": { gameDay: number };
  "day:closed": { gameDay: number };
  "activity:logged": { entry: ActivityLogEntry };
}

export type SimulationEventName = keyof SimulationEventMap;
