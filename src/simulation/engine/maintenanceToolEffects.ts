import { isEquipmentUsable } from "./equipmentMaintenance";
import type { OwnedPropertyState } from "@/types";

/**
 * A maintenance_tool item speeds up and cheapens *employee* repairs (see equipmentMaintenance.ts's
 * ensureMaintenanceTasks for the duration hook and employeeAI.ts's handleRepairEquipmentComplete
 * for the cost hook) — a binary gate, same shape as tvEffects.hasOperationalTv, not scaled by
 * count/tier. Deliberately does not affect contract repairs (an outside contractor brings their
 * own tools).
 */
export function hasOperationalMaintenanceTool(prop: OwnedPropertyState): boolean {
  return prop.equipment.some((e) => e.category === "maintenance_tool" && isEquipmentUsable(e));
}
