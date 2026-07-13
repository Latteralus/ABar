import { EMPLOYEE_ROLE_CONFIG, SKILL_PROGRESSION_CONFIG } from "@/config/employeeConfig";
import type { Employee, EmployeeSkills } from "@/types";

/**
 * Grows an employee's role-primary skills by a small amount for the shift just worked
 * (Master Plan Section 20: tasks completed, role performed, experience gained, initial
 * aptitude). Growth is deterministic — no RNG needed — and diminishes as a skill approaches
 * 100 (the `1 - current/100` factor) so nobody maxes out from a handful of shifts; total
 * lifetime task volume (`performance.*`) further scales it so an idle employee who worked
 * the shift but did nothing barely improves, while a busy one improves faster.
 */
export function applyShiftProgression(employee: Employee): void {
  employee.shiftsWorked += 1;

  const lifetimeTasks = employee.performance.customersServed + employee.performance.itemsPrepared + employee.performance.ordersFulfilled;
  const experienceFactor = Math.min(
    SKILL_PROGRESSION_CONFIG.maxActivityFactor,
    Math.max(
      SKILL_PROGRESSION_CONFIG.minActivityFactor,
      lifetimeTasks / (employee.shiftsWorked * SKILL_PROGRESSION_CONFIG.fullActivityTaskCount),
    ),
  );

  const primarySkills = EMPLOYEE_ROLE_CONFIG[employee.role].primarySkills as (keyof EmployeeSkills)[];
  for (const key of primarySkills) {
    const current = employee.skills[key];
    const diminishing = 1 - current / 100;
    const growth = SKILL_PROGRESSION_CONFIG.basePerShift * experienceFactor * diminishing;
    employee.skills[key] = Math.min(100, current + growth);
  }
}
