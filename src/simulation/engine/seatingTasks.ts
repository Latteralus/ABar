import { getProperty } from "@/data/properties";
import { effectiveSeatingCapacity } from "@/data/equipment/equipmentCatalog";
import { createServiceTask } from "@/simulation/tasks/taskQueue";
import { rolesFor } from "@/simulation/tasks/roleEligibility";
import type { GameState, OwnedPropertyState } from "@/types";

/** Creates a seat_customer task for anyone waiting on a host, once a seat is actually free. */
export function ensureSeatingTasks(state: GameState, prop: OwnedPropertyState): void {
  const hasHost = prop.employees.some((e) => e.role === "host");
  if (!hasHost) return;

  const property = getProperty(prop.propertyId);
  const seatedCount = prop.customers.filter((c) => c.seatId !== null && c.status !== "left" && c.status !== "removed").length;
  if (seatedCount >= effectiveSeatingCapacity(prop, property).seatingCapacity) return;

  const hasTaskFor = (customerId: string) =>
    prop.tasks.some(
      (t) => t.customerId === customerId && t.type === "seat_customer" && t.status !== "complete" && t.status !== "cancelled",
    );

  for (const customer of prop.customers) {
    if (customer.status !== "waiting_for_seat" || hasTaskFor(customer.id)) continue;
    prop.tasks.push(
      createServiceTask({
        type: "seat_customer",
        eligibleRoles: rolesFor("seat_customer"),
        requiredSkill: "charisma",
        durationGameMinutes: 1,
        priority: 3,
        customerId: customer.id,
        createdAtGameMinute: state.gameMinute,
      }),
    );
  }
}
