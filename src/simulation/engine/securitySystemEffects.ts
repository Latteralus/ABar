import { isEquipmentUsable } from "./equipmentMaintenance";
import type { GameState } from "@/types";

/**
 * A security_system item is deliberately NOT wired into the formal remove_customer task path
 * (that path is gated by roleEligibility.ts's remove_customer: ["security"] — a static role
 * table; flipping the "has security" check on without an actual security-role employee would
 * queue a task nobody is eligible to be assigned to, leaving the customer stuck forever). Instead
 * it raises the cooperate chance in intoxicationHandling.ts's no-security fallback flow — a
 * visible camera system makes people more likely to leave quietly. Binary gate, same shape as
 * tvEffects.hasOperationalTv.
 */
export function hasOperationalSecuritySystem(state: GameState): boolean {
  return state.equipment.some((e) => e.category === "security_system" && isEquipmentUsable(e));
}
