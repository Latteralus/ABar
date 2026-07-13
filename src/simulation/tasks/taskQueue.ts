import { createId } from "@/services/idService";
import type { Employee, EmployeeRole, EntityId, GameMinute, ServiceTask, TaskType } from "@/types";

interface CreateTaskParams {
  type: TaskType;
  eligibleRoles: EmployeeRole[];
  requiredSkill: ServiceTask["requiredSkill"];
  durationGameMinutes: number;
  priority?: number;
  customerId?: EntityId | null;
  orderId?: EntityId | null;
  equipmentId?: EntityId | null;
  attractionId?: EntityId | null;
  createdAtGameMinute: GameMinute;
}

export function createServiceTask(params: CreateTaskParams): ServiceTask {
  return {
    id: createId("task"),
    type: params.type,
    eligibleRoles: params.eligibleRoles,
    requiredSkill: params.requiredSkill,
    durationGameMinutes: params.durationGameMinutes,
    remainingGameMinutes: params.durationGameMinutes,
    priority: params.priority ?? 1,
    assignedEmployeeId: null,
    customerId: params.customerId ?? null,
    orderId: params.orderId ?? null,
    equipmentId: params.equipmentId ?? null,
    attractionId: params.attractionId ?? null,
    status: "queued",
    createdAtGameMinute: params.createdAtGameMinute,
  };
}

/** Picks the highest-priority, oldest queued task an idle employee is eligible for. */
export function findNextTaskForEmployee(tasks: ServiceTask[], employee: Employee): ServiceTask | undefined {
  return tasks
    .filter((task) => task.status === "queued" && task.eligibleRoles.includes(employee.role))
    .sort((a, b) => b.priority - a.priority || a.createdAtGameMinute - b.createdAtGameMinute)[0];
}
