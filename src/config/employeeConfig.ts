import type { EmployeeRole } from "@/types";

interface RoleConfig {
  wagePerShiftCentsRange: [number, number];
  /** Roles a candidate is generated with strong skill in (others start low/mediocre). */
  primarySkills: string[];
}

/** Wage data for every eventual role. Hiring exposes every role except manager (Stage 8 automation). */
export const EMPLOYEE_ROLE_CONFIG: Record<EmployeeRole, RoleConfig> = {
  bartender: { wagePerShiftCentsRange: [8000, 14000], primarySkills: ["bartending", "speed", "accuracy"] },
  server: { wagePerShiftCentsRange: [7000, 12000], primarySkills: ["serving", "charisma", "speed"] },
  cook: { wagePerShiftCentsRange: [8000, 13000], primarySkills: ["cooking", "speed", "accuracy"] },
  host: { wagePerShiftCentsRange: [6500, 10000], primarySkills: ["charisma", "cleanliness"] },
  dishwasher: { wagePerShiftCentsRange: [6000, 9000], primarySkills: ["speed", "cleanliness"] },
  barback: { wagePerShiftCentsRange: [6500, 10000], primarySkills: ["speed", "cleanliness"] },
  security: { wagePerShiftCentsRange: [8000, 12000], primarySkills: ["security", "accuracy"] },
  maintenance: { wagePerShiftCentsRange: [8000, 13000], primarySkills: ["accuracy", "speed"] },
  manager: { wagePerShiftCentsRange: [12000, 20000], primarySkills: ["management", "accuracy"] },
};

export const SKILL_GENERATION_CONFIG = {
  primarySkillRange: [40, 70] as [number, number],
  secondarySkillRange: [20, 50] as [number, number],
};

export const SKILL_PROGRESSION_CONFIG = {
  /** Base skill points gained per shift for an employee's role-primary skills, before the diminishing-returns and activity factors are applied. Deliberately tiny — Section 20: "Do not allow employees to become highly skilled after only a few days." */
  basePerShift: 0.6,
  /** How many tasks completed in a shift count as "fully engaged" for the activity multiplier. */
  fullActivityTaskCount: 8,
  minActivityFactor: 0.4,
  maxActivityFactor: 1.6,
};

export const HIRING_CONFIG = {
  candidatePoolSize: 4,
  /** Cost of a single "Find Candidates" search — covers the recruiting effort, charged whether or not the player ends up hiring anyone. */
  candidateSearchCostCents: 25_000,
};

/** Cosmetic idle-activity flavor (Master Plan §22: bartenders wipe down the bar, chat, etc. when nothing's queued). No mechanical effect. */
export const IDLE_FLAVOR_CONFIG = {
  chancePerMinute: 0.05,
};
