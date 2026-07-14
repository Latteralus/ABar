import { isEquipmentUsable } from "./equipmentMaintenance";
import type { OwnedPropertyState } from "@/types";

/**
 * glass_washer/dishwasher reduce how much mess each drink/food delivery leaves behind (see
 * employeeAI.ts's handleDeliverItemComplete, the only call site) rather than modeling a new
 * glassware/dish-tracking resource from scratch — that would be a genuinely new mechanic, bigger
 * than "give existing equipment a real effect." Reusing the existing bar-cleanliness system keeps
 * this additive. Both are binary gates, same shape as tvEffects.hasOperationalTv.
 */
export function hasOperationalGlassWasher(prop: OwnedPropertyState): boolean {
  return prop.equipment.some((e) => e.category === "glass_washer" && isEquipmentUsable(e));
}

export function hasOperationalDishwasher(prop: OwnedPropertyState): boolean {
  return prop.equipment.some((e) => e.category === "dishwasher" && isEquipmentUsable(e));
}
