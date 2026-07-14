import { getRecipeForProduct } from "@/data/recipes/recipes";
import { CUSTOMER_BEHAVIOR_CONFIG } from "@/config/customerConfig";
import { TV_CONFIG } from "@/config/tvConfig";
import { JUKEBOX_CONFIG } from "@/config/jukeboxConfig";
import { classifyPriceTier } from "@/utils/pricing";
import { CLEANLINESS_CONFIG } from "@/config/facilityConfig";
import { MAINTENANCE_CONFIG } from "@/config/maintenanceConfig";
import { createServiceTask, findNextTaskForEmployee } from "@/simulation/tasks/taskQueue";
import { rolesFor } from "@/simulation/tasks/roleEligibility";
import { postLedger } from "./ledger";
import type { EventBus } from "@/simulation/events/EventBus";
import type { SeededRandom } from "@/simulation/random/SeededRandom";
import type { EmployeeStatus, EquipmentCategory, Employee, GameState, ServiceTask, TaskType } from "@/types";
import { departCustomer } from "./customerLifecycle";
import { getProperty } from "@/data/properties";
import {
  buildOrder,
  cogsCategoryForProduct,
  consumeInventoryForOrder,
  getActiveMenu,
  getProductForOrder,
  INTOXICATION_PER_DRINK,
  isAlcoholic,
  logNoAvailableProduct,
  selectProductForCustomer,
  speedMultiplierForSkill,
} from "./orderProcessing";
import { closeTabAndPay } from "./payments";
import { logActivity } from "./activityLogger";
import { decayEquipmentOnUse, equipmentSpeedMultiplier } from "./equipmentMaintenance";
import { handleCleanAttractionComplete, handleRepairAttractionComplete } from "./attractionTasks";
import { findAttractionForCustomer } from "./attractionQueue";
import { recordEstimatedSecondarySale } from "./attractionRevenue";
import { personalitySatisfactionBonus, personalitySpeedMultiplier } from "./personalityEffects";
import { effectivePrice } from "./advertising";
import { hasOperationalTv } from "./tvEffects";
import { hasOperationalJukebox } from "./jukeboxEffects";
import { hasOperationalMaintenanceTool } from "./maintenanceToolEffects";
import { hasOperationalDishwasher, hasOperationalGlassWasher } from "./cleaningEquipmentEffects";
import { effectiveSeatingCapacity } from "@/data/equipment/equipmentCatalog";
import { clampRound } from "@/utils/clamp";

const STATUS_BY_TASK_TYPE: Record<TaskType, EmployeeStatus> = {
  greet_customer: "serving",
  seat_customer: "serving",
  take_order: "serving",
  prepare_drink: "preparing_drink",
  deliver_drink: "serving",
  prepare_food: "preparing_food",
  deliver_food: "serving",
  process_payment: "processing_payment",
  remove_customer: "handling_issue",
  clean_bar: "cleaning",
  clean_table: "cleaning",
  repair_equipment: "repairing",
  clean_attraction: "cleaning",
  repair_attraction: "repairing",
};

/** Which equipment category (if any) a task's speed depends on. process_payment has no recipe to derive this from, so this stays a static map rather than a per-order lookup. */
const EQUIPMENT_CATEGORY_BY_TASK_TYPE: Partial<Record<TaskType, EquipmentCategory>> = {
  prepare_drink: "bar_station",
  prepare_food: "cooking_equipment",
  process_payment: "point_of_sale",
};

function assignIdleEmployees(state: GameState): void {
  const availableEmployees = state.employees.filter((e) => e.status === "idle" && e.currentTaskId === null);
  for (const employee of availableEmployees) {
    const task = findNextTaskForEmployee(state.tasks, employee);
    if (!task) continue;
    task.status = "in_progress";
    task.assignedEmployeeId = employee.id;
    const equipmentFactor = equipmentSpeedMultiplier(state, EQUIPMENT_CATEGORY_BY_TASK_TYPE[task.type]);
    const speedFactor = speedMultiplierForSkill(employee.skills.speed) * personalitySpeedMultiplier(employee) * equipmentFactor;
    task.remainingGameMinutes = Math.max(1, Math.round(task.durationGameMinutes * speedFactor));
    employee.currentTaskId = task.id;
    employee.status = STATUS_BY_TASK_TYPE[task.type];

    if (task.type === "repair_equipment" && task.equipmentId) {
      const equipment = state.equipment.find((e) => e.id === task.equipmentId);
      if (equipment) equipment.currentStatus = "under_repair";
    }
    if (task.type === "repair_attraction" && task.attractionId) {
      const attraction = state.attractions.find((a) => a.id === task.attractionId);
      if (attraction) attraction.currentStatus = "under_repair";
    }
  }
}

function handleTakeOrderComplete(state: GameState, rng: SeededRandom, bus: EventBus, task: ServiceTask, employee: Employee): void {
  const customer = state.customers.find((c) => c.id === task.customerId);
  if (!customer || customer.status === "left") return;

  const allowAlcohol = customer.intoxication < CUSTOMER_BEHAVIOR_CONFIG.intoxicationServiceCutoff;
  const listing = selectProductForCustomer(state, customer, rng, allowAlcohol);
  if (!listing) {
    if (!allowAlcohol) {
      // Section 11: staff stop serving customers who exceed service limits, without ejecting them outright.
      customer.status = "waiting_to_pay";
      customer.statusEnteredAtGameMinute = state.gameMinute;
      logActivity(
        state,
        bus,
        "customer",
        `${employee.firstName} ${employee.lastName} cut off ${customer.firstName} ${customer.lastName} after too many drinks.`,
        "warning",
      );
      return;
    }
    logNoAvailableProduct(state, bus, customer);
    departCustomer(state, bus, rng, customer, "price_too_high");
    return;
  }

  const order = buildOrder(state, customer, listing);
  const product = getProductForOrder(order);
  const chargedPrice = effectivePrice(state, listing.productId, listing.price);
  const priceTier = classifyPriceTier(chargedPrice, product.suggestedPrice);
  if (priceTier === "High") {
    customer.satisfaction = Math.max(0, customer.satisfaction - 2);
    logActivity(state, bus, "customer", `${customer.firstName} ${customer.lastName}: "I can't afford these prices forever."`, "warning");
  } else if (priceTier === "Low") {
    customer.satisfaction = Math.min(100, customer.satisfaction + 1);
    logActivity(state, bus, "customer", `${customer.firstName} ${customer.lastName}: "This place is a great deal."`);
  }
  const recipe = getRecipeForProduct(order.productId);
  const isFood = product.category === "food";

  // A customer ordering while queued/playing pool stays at the attraction — the normal
  // waiting_for_drink/waiting_for_food wait-tolerance countdown doesn't apply to them.
  const isAtAttraction = customer.status === "using_attraction" || customer.status === "waiting_for_attraction";
  if (!isAtAttraction) {
    customer.status = isFood ? "waiting_for_food" : "waiting_for_drink";
    customer.statusEnteredAtGameMinute = state.gameMinute;
  } else {
    const attraction = findAttractionForCustomer(state, customer.id);
    if (attraction) recordEstimatedSecondarySale(attraction, listing.price);
  }

  const prepareTaskType = isFood ? "prepare_food" : "prepare_drink";
  state.tasks.push(
    createServiceTask({
      type: prepareTaskType,
      eligibleRoles: rolesFor(prepareTaskType),
      requiredSkill: isFood ? "cooking" : "bartending",
      durationGameMinutes: Math.max(1, Math.round(recipe.basePrepSeconds / 60)),
      customerId: customer.id,
      orderId: order.id,
      createdAtGameMinute: state.gameMinute,
    }),
  );

  logActivity(
    state,
    bus,
    "customer",
    `${employee.firstName} ${employee.lastName} took an order from ${customer.firstName} ${customer.lastName} for ${product.name}.`,
  );
}

/** Shared by prepare_drink and prepare_food — both just consume the recipe and queue the matching deliver task. */
function handlePrepareItemComplete(state: GameState, bus: EventBus, task: ServiceTask, employee: Employee): void {
  const order = state.orders.find((o) => o.id === task.orderId);
  const customer = state.customers.find((c) => c.id === task.customerId);
  if (!order || !customer) return;

  const result = consumeInventoryForOrder(state, order, employee);
  if (!result.success) {
    order.status = "cancelled";
    customer.status = "deciding_next_order";
    customer.statusEnteredAtGameMinute = state.gameMinute;
    customer.satisfaction = clampRound(customer.satisfaction - 8);
    logActivity(
      state,
      bus,
      "inventory",
      `${result.missingItemName} ran out before ${customer.firstName} ${customer.lastName}'s order could be prepared.`,
      "warning",
    );
    return;
  }

  order.status = "ready";
  order.preparedByEmployeeId = employee.id;
  order.qualityResult = result.qualityResult;
  employee.performance.itemsPrepared += 1;
  employee.performance.wasteGeneratedCents += result.wasteCostCents;

  const product = getProductForOrder(order);
  const recipe = getRecipeForProduct(order.productId);
  if (recipe.requiredEquipmentCategory) decayEquipmentOnUse(state, recipe.requiredEquipmentCategory);

  postLedger(state, {
    category: cogsCategoryForProduct(product),
    type: "debit",
    amount: result.cogsCents,
    description: `Ingredients consumed — ${product.name}`,
    relatedEntityId: order.id,
  });

  for (const item of result.itemsCrossedReorderMinimum) {
    logActivity(state, bus, "inventory", `${item.name} fell below its reorder point.`, "warning", item.id);
    bus.emit("inventory:low_stock", { inventoryItemId: item.id, itemName: item.name });
  }

  const deliverTaskType = product.category === "food" ? "deliver_food" : "deliver_drink";
  state.tasks.push(
    createServiceTask({
      type: deliverTaskType,
      eligibleRoles: rolesFor(deliverTaskType),
      requiredSkill: "speed",
      durationGameMinutes: 1,
      priority: 2,
      customerId: customer.id,
      orderId: order.id,
      createdAtGameMinute: state.gameMinute,
    }),
  );
}

/** Shared by deliver_drink and deliver_food — the intoxication bump below only applies to actual alcoholic products. */
function handleDeliverItemComplete(state: GameState, rng: SeededRandom, bus: EventBus, task: ServiceTask, employee: Employee): void {
  const order = state.orders.find((o) => o.id === task.orderId);
  const customer = state.customers.find((c) => c.id === task.customerId);
  if (!order || !customer) return;

  const product = getProductForOrder(order);
  const listing = getActiveMenu(state).find((l) => l.productId === product.id);
  const tab = state.tabs.find((t) => t.id === order.tabId);
  const unitPrice = effectivePrice(state, product.id, listing?.price ?? product.suggestedPrice);

  if (tab) {
    tab.lineItems.push({
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice,
      preparedByEmployeeId: order.preparedByEmployeeId,
    });
  }

  order.status = "served";
  order.deliveredByEmployeeId = employee.id;
  const waitedMinutes = state.gameMinute - order.createdAtGameMinute;
  order.waitMinutesAtDelivery = waitedMinutes;
  // A customer who ordered a drink while queued/playing pool stays at the attraction — don't
  // pull them into the normal "consuming" countdown, which would fight with the attraction's
  // own status/duration handling (see attractionSessions.ts and customerLifecycle.ts).
  const isAtAttraction = customer.status === "using_attraction" || customer.status === "waiting_for_attraction";
  if (!isAtAttraction) {
    customer.status = "consuming";
    customer.statusEnteredAtGameMinute = state.gameMinute;
    // Randomized so nobody sips a drink for exactly the same number of minutes every time (see customerLifecycle's "consuming" case).
    const [minConsume, maxConsume] = CUSTOMER_BEHAVIOR_CONFIG.consumingDurationMinutesRange;
    customer.phaseTargetMinutes =
      rng.int(minConsume, maxConsume) +
      (hasOperationalTv(state) ? TV_CONFIG.dwellTimeBonusMinutes : 0) +
      (hasOperationalJukebox(state) ? JUKEBOX_CONFIG.dwellTimeBonusMinutes : 0);
  }

  if (isAlcoholic(product.id)) {
    customer.intoxication = clampRound(customer.intoxication + INTOXICATION_PER_DRINK);
  }

  const waitSatisfaction = waitedMinutes < 10 ? 5 : waitedMinutes < 20 ? 0 : -5;
  const satisfactionDelta = waitSatisfaction + personalitySatisfactionBonus(employee);
  customer.satisfaction = clampRound(customer.satisfaction + satisfactionDelta);
  employee.performance.customersServed += 1;

  // Every item served leaves a little more to clean up (Section 22/25) — a glass_washer/dishwasher
  // reduces how much mess each drink/food item leaves behind.
  const hasWasherHelp = product.category === "food" ? hasOperationalDishwasher(state) : hasOperationalGlassWasher(state);
  const cleanlinessDecay = CLEANLINESS_CONFIG.decayPerDrinkServed * (hasWasherHelp ? CLEANLINESS_CONFIG.washerAssistedDecayMultiplier : 1);
  state.barCleanliness = Math.max(0, state.barCleanliness - cleanlinessDecay);

  bus.emit("order:served", { order });
  logActivity(
    state,
    bus,
    "sale",
    `${employee.firstName} ${employee.lastName} served ${product.name} to ${customer.firstName} ${customer.lastName}.`,
  );
}

function handleProcessPaymentComplete(state: GameState, rng: SeededRandom, bus: EventBus, task: ServiceTask, employee: Employee): void {
  const customer = state.customers.find((c) => c.id === task.customerId);
  if (!customer || !customer.tabId) return;
  closeTabAndPay(state, rng, bus, customer, employee);
  decayEquipmentOnUse(state, "point_of_sale");
  // Tab is settled, but the customer sticks around a bit before actually walking out
  // (see customerLifecycle's "leaving" case) rather than vanishing the instant they pay.
  customer.status = "leaving";
  customer.leaveReason = "satisfied_departure";
  customer.statusEnteredAtGameMinute = state.gameMinute;
  employee.performance.ordersFulfilled += 1;
}

function handleSeatCustomerComplete(state: GameState, bus: EventBus, task: ServiceTask, employee: Employee): void {
  const customer = state.customers.find((c) => c.id === task.customerId);
  if (!customer || customer.status !== "waiting_for_seat") return;

  const property = getProperty(state.propertyId);
  const seatedCount = state.customers.filter((c) => c.seatId !== null && c.status !== "left" && c.status !== "removed").length;
  if (seatedCount >= effectiveSeatingCapacity(state, property).seatingCapacity) return; // no room yet — a fresh seat_customer task will be queued next tick

  customer.seatId = customer.id;
  customer.status = "waiting_to_order";
  customer.statusEnteredAtGameMinute = state.gameMinute;
  bus.emit("customer:seated", { customer });
  logActivity(state, bus, "customer", `${employee.firstName} ${employee.lastName} seated ${customer.firstName} ${customer.lastName}.`);
}

function handleCleanComplete(state: GameState, bus: EventBus, task: ServiceTask, employee: Employee): void {
  state.barCleanliness = Math.min(100, state.barCleanliness + CLEANLINESS_CONFIG.restoreAmount);
  const area = task.type === "clean_table" ? "the tables" : "the bar";
  logActivity(state, bus, "employee", `${employee.firstName} ${employee.lastName} cleaned up ${area}.`);
}

function handleRepairEquipmentComplete(state: GameState, bus: EventBus, task: ServiceTask, employee: Employee): void {
  const equipment = state.equipment.find((e) => e.id === task.equipmentId);
  if (!equipment) return;

  const partsCost = Math.round(
    MAINTENANCE_CONFIG.employeeRepairPartsCostCents * (hasOperationalMaintenanceTool(state) ? MAINTENANCE_CONFIG.maintenanceToolCostMultiplier : 1),
  );

  equipment.condition = MAINTENANCE_CONFIG.conditionAfterRepair;
  equipment.currentStatus = "operational";
  equipment.repairHistory.push({
    gameDay: state.gameDay,
    gameMinute: state.gameMinute,
    method: "employee",
    costCents: partsCost,
  });

  postLedger(state, {
    category: "opex_maintenance",
    type: "debit",
    amount: partsCost,
    description: `Repair parts — ${equipment.name}`,
    relatedEntityId: equipment.id,
  });

  logActivity(state, bus, "equipment", `${employee.firstName} ${employee.lastName} repaired ${equipment.name}.`);
}

function handleRemoveCustomerComplete(state: GameState, rng: SeededRandom, bus: EventBus, task: ServiceTask, employee: Employee): void {
  const customer = state.customers.find((c) => c.id === task.customerId);
  if (!customer || customer.status === "left" || customer.status === "removed") return;
  departCustomer(state, bus, rng, customer, "removed_intoxication");
  customer.status = "removed";
  logActivity(
    state,
    bus,
    "customer",
    `${employee.firstName} ${employee.lastName} removed an intoxicated customer, ${customer.firstName} ${customer.lastName}.`,
    "warning",
  );
}

function advanceAssignedTasks(state: GameState, rng: SeededRandom, bus: EventBus): void {
  for (const task of state.tasks) {
    if (task.status !== "in_progress" || !task.assignedEmployeeId) continue;
    task.remainingGameMinutes -= 1;
    if (task.remainingGameMinutes > 0) continue;

    const employee = state.employees.find((e) => e.id === task.assignedEmployeeId);
    task.status = "complete";
    if (employee) {
      employee.currentTaskId = null;
      employee.status = "idle";
    }
    if (!employee) continue;

    switch (task.type) {
      case "take_order":
        handleTakeOrderComplete(state, rng, bus, task, employee);
        break;
      case "prepare_drink":
      case "prepare_food":
        handlePrepareItemComplete(state, bus, task, employee);
        break;
      case "deliver_drink":
      case "deliver_food":
        handleDeliverItemComplete(state, rng, bus, task, employee);
        break;
      case "process_payment":
        handleProcessPaymentComplete(state, rng, bus, task, employee);
        break;
      case "seat_customer":
        handleSeatCustomerComplete(state, bus, task, employee);
        break;
      case "clean_bar":
      case "clean_table":
        handleCleanComplete(state, bus, task, employee);
        break;
      case "remove_customer":
        handleRemoveCustomerComplete(state, rng, bus, task, employee);
        break;
      case "repair_equipment":
        handleRepairEquipmentComplete(state, bus, task, employee);
        break;
      case "clean_attraction":
        handleCleanAttractionComplete(state, bus, task, employee);
        break;
      case "repair_attraction":
        handleRepairAttractionComplete(state, bus, task, employee);
        break;
      default:
        break;
    }
  }

  // Drop old completed/cancelled tasks so the task list doesn't grow unbounded across a shift.
  state.tasks = state.tasks.filter(
    (t) => t.status === "queued" || t.status === "in_progress" || state.gameMinute - t.createdAtGameMinute < 5,
  );
}

export function advanceEmployees(state: GameState, rng: SeededRandom, bus: EventBus): void {
  advanceAssignedTasks(state, rng, bus);
  assignIdleEmployees(state);
}
