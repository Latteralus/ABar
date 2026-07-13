import type { EmployeeRole, TaskType } from "@/types";

/**
 * Which roles may perform which task, including realistic cross-role coverage (Master Plan
 * Section 22: bartenders can bus drinks, barbacks can help deliver, servers clean tables, a
 * bartender can cover the door if there's no host, etc). This is the single place task
 * eligibility is defined — task-creation call sites read from here instead of hardcoding
 * role arrays inline, so tuning who can do what never requires touching engine logic.
 */
export const TASK_ROLE_ELIGIBILITY: Record<TaskType, EmployeeRole[]> = {
  greet_customer: ["host", "server"],
  seat_customer: ["host", "server"],
  take_order: ["server", "bartender"],
  prepare_drink: ["bartender"],
  deliver_drink: ["server", "bartender", "barback"],
  prepare_food: ["cook"],
  deliver_food: ["server", "host"],
  process_payment: ["server", "bartender"],
  remove_customer: ["security"],
  clean_bar: ["bartender", "server", "barback", "host", "dishwasher"],
  clean_table: ["server", "barback", "host", "dishwasher"],
  repair_equipment: ["maintenance"],
  clean_attraction: ["server", "barback"],
  repair_attraction: ["maintenance"],
};

export function rolesFor(taskType: TaskType): EmployeeRole[] {
  return TASK_ROLE_ELIGIBILITY[taskType];
}
