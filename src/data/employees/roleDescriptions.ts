import type { EmployeeRole } from "@/types";

export interface RoleDescription {
  primary: string;
  secondary?: string;
}

/**
 * What each role actually does in the current build — sourced from
 * `simulation/tasks/roleEligibility.ts`'s real task-eligibility table, not aspirational Master
 * Plan text for mechanics that aren't implemented yet (e.g. barback restocking). Keep this in
 * sync if you add/remove a role's task eligibility.
 */
export const ROLE_DESCRIPTIONS: Record<EmployeeRole, RoleDescription> = {
  bartender: {
    primary: "Prepares every drink order — the only role that can.",
    secondary: "Also takes orders, delivers drinks, processes payments, and cleans the bar when idle.",
  },
  server: {
    primary: "Takes orders, delivers drinks and food to tables, and processes payments — the core front-of-house role.",
    secondary: "Also greets and seats customers when no host is on staff, and cleans tables.",
  },
  cook: {
    primary: "Prepares every food order — the only role that can.",
  },
  host: {
    primary: "Greets arriving customers and seats them.",
    secondary: "Also delivers food to tables.",
  },
  dishwasher: {
    primary: "Hired, but has no tasks implemented yet — reserved for future dishwashing/glassware mechanics.",
  },
  barback: {
    primary: "Delivers drinks and cleans the bar and tables.",
    secondary: "Restocking bar inventory from storage isn't implemented yet, so there's no inventory task for this role today.",
  },
  security: {
    primary: "Removes intoxicated customers who refuse to leave when asked.",
  },
  maintenance: {
    primary: "Repairs broken equipment.",
  },
  manager: {
    primary: "Not yet hirable — reserved for future management automation (auto-reordering, policy controls).",
  },
};
