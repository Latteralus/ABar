import { IDLE_FLAVOR_CONFIG } from "@/config/employeeConfig";
import { BARBACK_IDLE_FLAVOR, BARTENDER_IDLE_FLAVOR, SERVER_IDLE_FLAVOR } from "@/data/employees/idleFlavor";
import { fillTemplate } from "@/utils/flavorText";
import type { EventBus } from "@/simulation/events/EventBus";
import type { SeededRandom } from "@/simulation/random/SeededRandom";
import type { EmployeeRole, GameState } from "@/types";
import { logActivity } from "./activityLogger";

const FLAVOR_BY_ROLE: Partial<Record<EmployeeRole, readonly string[]>> = {
  bartender: BARTENDER_IDLE_FLAVOR,
  server: SERVER_IDLE_FLAVOR,
  barback: BARBACK_IDLE_FLAVOR,
};

/**
 * Purely cosmetic: an idle bartender/server/barback occasionally wipes down the bar, chats
 * with a regular, tidies a table, etc. — makes staff feel present between real tasks instead
 * of standing frozen at "Idle" (Master Plan §22). No stat changes, no task/time cost.
 */
export function generateStaffIdleFlavor(state: GameState, rng: SeededRandom, bus: EventBus): void {
  for (const employee of state.employees) {
    if (employee.status !== "idle" || employee.currentTaskId !== null) continue;
    const templates = FLAVOR_BY_ROLE[employee.role];
    if (!templates || templates.length === 0) continue;
    if (!rng.chance(IDLE_FLAVOR_CONFIG.chancePerMinute)) continue;

    const template = rng.pick(templates);
    logActivity(state, bus, "employee", fillTemplate(template, { employee: `${employee.firstName} ${employee.lastName}` }));
  }
}
