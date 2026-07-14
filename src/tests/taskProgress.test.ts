import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { describeTask } from "@/utils/taskProgress";
import { activeProperty } from "@/simulation/engine/activeProperty";
import type { Customer, Order, ServiceTask } from "@/types";

function customer(): Customer {
  return {
    id: "cust-1",
    firstName: "Jamie",
    lastName: "Rivera",
    archetypeId: "archetype-regular",
    ageGroup: "adult",
    incomeLevel: "middle",
    spendingBudget: 5_000,
    preferredCategories: [],
    priceSensitivity: 50,
    patience: 50,
    reviewTendency: 50,
    reorderTendency: 50,
    attractionAffinity: 50,
    intoxication: 0,
    satisfaction: 80,
    groupId: null,
    arrivalGameMinute: 0,
    status: "waiting_for_drink",
    seatId: "cust-1",
    tabId: null,
    itemsOrderedCount: 1,
    totalSpent: 0,
    statusEnteredAtGameMinute: 0,
  };
}

function order(): Order {
  return {
    id: "order-1",
    customerId: "cust-1",
    productId: "prod-margarita",
    tabId: "tab-1",
    status: "queued",
    createdAtGameMinute: 0,
    preparedByEmployeeId: null,
    deliveredByEmployeeId: null,
  };
}

function task(type: ServiceTask["type"]): ServiceTask {
  return {
    id: "task-1",
    type,
    eligibleRoles: ["bartender"],
    requiredSkill: "bartending",
    durationGameMinutes: 10,
    remainingGameMinutes: 4,
    priority: 1,
    assignedEmployeeId: "emp-1",
    customerId: "cust-1",
    orderId: "order-1",
    equipmentId: null,
    attractionId: null,
    status: "in_progress",
    createdAtGameMinute: 0,
  };
}

describe("taskProgress immersive labels", () => {
  it("names the specific drink being made, not just the customer", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    prop.customers.push(customer());
    prop.orders.push(order());

    const description = describeTask(prop, task("prepare_drink"));
    expect(description).toContain("Margarita");
    expect(description).toContain("Jamie Rivera");
    expect(description).toContain("Making");
    expect(description).toContain("60%");
  });

  it("uses the right preposition for delivering vs. making", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    prop.customers.push(customer());
    prop.orders.push(order());

    expect(describeTask(prop, task("deliver_drink"))).toBe("Delivering Margarita to Jamie Rivera (60%)");
    expect(describeTask(prop, task("prepare_drink"))).toBe("Making Margarita for Jamie Rivera (60%)");
  });

  it("still falls back to just the customer name for non-order tasks like take_order", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    prop.customers.push(customer());

    const takeOrderTask = task("take_order");
    takeOrderTask.orderId = null;
    expect(describeTask(prop, takeOrderTask)).toBe("Taking an order from Jamie Rivera (60%)");
  });
});
