import { EMPLOYEE_ROLE_CONFIG, HIRING_CONFIG, SKILL_GENERATION_CONFIG } from "@/config/employeeConfig";
import { PERSONALITY_GENERATION_CONFIG, PERSONALITY_TRAIT_POOL } from "@/config/personalityConfig";
import { FIRST_NAMES } from "@/data/names/firstNames";
import { LAST_NAMES } from "@/data/names/lastNames";
import { createId } from "@/services/idService";
import type { SeededRandom } from "@/simulation/random/SeededRandom";
import type { Employee, EmployeeRole, EmployeeSkills, PersonalityTrait } from "@/types";

const ALL_SKILL_KEYS: (keyof EmployeeSkills)[] = [
  "bartending",
  "serving",
  "cooking",
  "speed",
  "accuracy",
  "charisma",
  "cleanliness",
  "security",
  "management",
];

function rollPersonality(rng: SeededRandom): PersonalityTrait[] {
  const [min, max] = PERSONALITY_GENERATION_CONFIG.traitCountRange;
  const count = rng.int(min, max);
  const pool = [...PERSONALITY_TRAIT_POOL];
  const traits: PersonalityTrait[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const index = rng.int(0, pool.length - 1);
    traits.push(pool[index]);
    pool.splice(index, 1); // no duplicate traits on one employee
  }
  return traits;
}

function rollSkills(rng: SeededRandom, role: EmployeeRole): EmployeeSkills {
  const { primarySkillRange, secondarySkillRange } = SKILL_GENERATION_CONFIG;
  const primary = new Set(EMPLOYEE_ROLE_CONFIG[role].primarySkills);
  const skills = {} as EmployeeSkills;
  for (const key of ALL_SKILL_KEYS) {
    const range = primary.has(key) ? primarySkillRange : secondarySkillRange;
    skills[key] = rng.int(range[0], range[1]);
  }
  return skills;
}

/** Generates one hiring candidate for the given role, fully via the seeded RNG (Section 43). */
export function generateCandidate(rng: SeededRandom, role: EmployeeRole): Employee {
  const roleConfig = EMPLOYEE_ROLE_CONFIG[role];
  return {
    id: createId("emp"),
    firstName: rng.pick(FIRST_NAMES),
    lastName: rng.pick(LAST_NAMES),
    role,
    wagePerShiftCents: rng.int(roleConfig.wagePerShiftCentsRange[0], roleConfig.wagePerShiftCentsRange[1]),
    personality: rollPersonality(rng),
    skills: rollSkills(rng, role),
    shiftsWorked: 0,
    hiredAtGameMinute: 0,
    currentTaskId: null,
    status: "idle",
    performance: { customersServed: 0, itemsPrepared: 0, ordersFulfilled: 0, wasteGeneratedCents: 0, tipsEarnedCents: 0 },
  };
}

export function generateCandidatePool(rng: SeededRandom, role: EmployeeRole): Employee[] {
  return Array.from({ length: HIRING_CONFIG.candidatePoolSize }, () => generateCandidate(rng, role));
}
