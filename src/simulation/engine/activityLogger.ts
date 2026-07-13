import { createId } from "@/services/idService";
import type { EventBus } from "@/simulation/events/EventBus";
import type { ActivityLogCategory, ActivityLogSeverity, GameState } from "@/types";

const MAX_LOG_ENTRIES = 500;

export function logActivity(
  state: GameState,
  bus: EventBus,
  category: ActivityLogCategory,
  message: string,
  severity: ActivityLogSeverity = "info",
  relatedEntityId?: string,
): void {
  const entry = {
    id: createId("log"),
    gameMinute: state.gameMinute,
    gameDay: state.gameDay,
    category,
    severity,
    message,
    relatedEntityId,
  };
  state.activityLog.push(entry);
  if (state.activityLog.length > MAX_LOG_ENTRIES) {
    state.activityLog.splice(0, state.activityLog.length - MAX_LOG_ENTRIES);
  }
  bus.emit("activity:logged", { entry });
}
