import { CLEANLINESS_CONFIG } from "@/config/facilityConfig";
import { createServiceTask } from "@/simulation/tasks/taskQueue";
import { rolesFor } from "@/simulation/tasks/roleEligibility";
import type { GameState } from "@/types";

/** Queues high-priority cleaning once cleanliness drops below the trigger threshold (Section 22/25). */
export function ensureCleaningTasks(state: GameState): void {
  if (state.barCleanliness >= CLEANLINESS_CONFIG.taskTriggerThreshold) return;

  const hasPendingCleanTask = state.tasks.some(
    (t) => t.type === "clean_bar" && t.status !== "complete" && t.status !== "cancelled",
  );
  if (hasPendingCleanTask) return;

  state.tasks.push(
    createServiceTask({
      type: "clean_bar",
      eligibleRoles: rolesFor("clean_bar"),
      requiredSkill: "cleanliness",
      durationGameMinutes: CLEANLINESS_CONFIG.taskDurationGameMinutes,
      // Cleaning needs to compete with live service once the room is visibly dirty; a low-priority
      // background chore could sit forever while idle non-bartenders appear to do nothing.
      priority: 3,
      createdAtGameMinute: state.gameMinute,
    }),
  );
}
