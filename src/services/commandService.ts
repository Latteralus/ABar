import { PURCHASING_CONFIG } from "@/config/inventoryConfig";
import { HIRING_CONFIG } from "@/config/employeeConfig";
import { MAINTENANCE_CONFIG } from "@/config/maintenanceConfig";
import { ATTRACTION_CONFIG } from "@/config/attractionConfig";
import { getEquipmentCatalogEntry, usedEquipmentSpace, wouldExceedEquipmentSpace } from "@/data/equipment/equipmentCatalog";
import { getAttractionCatalogEntry, getAttractionCatalogEntryForCategory } from "@/data/attractions/attractionCatalog";
import { getAdvertisingCatalogEntry } from "@/data/advertising/advertisingCatalog";
import { getProduct } from "@/data/products/products";
import { getProperty } from "@/data/properties";
import { formatCents } from "@/utils/money";
import { createId } from "./idService";
import { logActivity } from "@/simulation/engine/activityLogger";
import { createSupplyTabBill, payBill, updateInsolvency } from "@/simulation/engine/finance";
import { hasRequiredEquipment } from "@/simulation/engine/orderProcessing";
import { ensureMenuAutoActivation } from "@/simulation/engine/menuAutomation";
import { postLedger, spendCash } from "@/simulation/engine/ledger";
import type { EventBus } from "@/simulation/events/EventBus";
import type { Employee, EmployeeRole, GameState, PurchaseOrderLine } from "@/types";

export interface CommandResult {
  success: boolean;
  error?: string;
}

const ok: CommandResult = { success: true };
const fail = (error: string): CommandResult => ({ success: false, error });

/**
 * Player-facing commands (Master Plan Section 49). Each validates against current state and
 * returns a clear success/error result instead of throwing — React components never mutate
 * GameState directly, they call one of these.
 */
export const commandService = {
  searchForCandidates(state: GameState, bus: EventBus, role: EmployeeRole): CommandResult {
    const cost = HIRING_CONFIG.candidateSearchCostCents;
    if (state.cash < cost) return fail("Not enough cash to search for candidates.");

    spendCash(state, cost, { category: "opex_recruiting", description: `Recruiting search — ${role}` });

    logActivity(state, bus, "employee", `Spent ${formatCents(cost)} searching for ${role} candidates.`);
    return ok;
  },

  hireEmployee(state: GameState, bus: EventBus, employee: Employee): CommandResult {
    const hired: Employee = { ...employee, hiredAtGameMinute: state.gameMinute };
    state.employees.push(hired);
    logActivity(state, bus, "employee", `Hired ${hired.firstName} ${hired.lastName} as ${hired.role}.`);
    ensureMenuAutoActivation(state, bus);
    return ok;
  },

  fireEmployee(state: GameState, bus: EventBus, employeeId: string): CommandResult {
    const employee = state.employees.find((e) => e.id === employeeId);
    if (!employee) return fail("Employee not found.");
    state.employees = state.employees.filter((e) => e.id !== employeeId);
    state.tasks.forEach((t) => {
      if (t.assignedEmployeeId === employeeId) {
        t.assignedEmployeeId = null;
        t.status = "queued";
      }
    });
    logActivity(state, bus, "employee", `${employee.firstName} ${employee.lastName} was let go.`);
    return ok;
  },

  setMenuPrice(state: GameState, productId: string, priceCents: number): CommandResult {
    if (priceCents < 0) return fail("Price cannot be negative.");
    const listing = state.menu.find((m) => m.productId === productId);
    if (!listing) return fail("Product not found on menu.");
    listing.price = priceCents;
    return ok;
  },

  setMenuActive(state: GameState, productId: string, isActive: boolean): CommandResult {
    const listing = state.menu.find((m) => m.productId === productId);
    if (!listing) return fail("Product not found on menu.");
    if (isActive && !hasRequiredEquipment(state, productId)) {
      const product = getProduct(productId);
      return fail(`Purchase the required equipment before adding ${product.name} to the menu.`);
    }
    listing.isActive = isActive;
    listing.hasBeenToggled = true;
    return ok;
  },

  placePurchaseOrder(state: GameState, bus: EventBus, lines: PurchaseOrderLine[], payment: "cash" | "tab"): CommandResult {
    if (lines.length === 0) return fail("Select at least one item to order.");
    const totalCost = lines.reduce((sum, l) => sum + l.unitCost * l.quantity, 0);

    if (payment === "cash" && state.cash < totalCost) {
      return fail("Not enough cash to pay for this order.");
    }

    const order = {
      id: createId("po"),
      orderNumber: state.counters.nextPurchaseOrderNumber++,
      orderedAtGameMinute: state.gameMinute,
      expectedDeliveryGameMinute: 0,
      lines,
      totalCost,
      paymentStatus: payment === "cash" ? ("paid" as const) : ("on_tab" as const),
      deliveryStatus: "pending" as const,
    };
    state.purchaseOrders.push(order);

    for (const line of lines) {
      const item = state.inventory.find((i) => i.id === line.inventoryItemId);
      if (item) item.pendingDeliveryQuantity += line.quantity;
    }

    if (payment === "cash") {
      // Same as an equipment purchase: a balance-sheet asset swap (cash -> inventory), not an
      // operating expense — so this posts only the asset_cash entry, no paired category entry.
      spendCash(state, totalCost, { description: `Inventory purchase — PO #${order.orderNumber}`, relatedEntityId: order.id });
    } else {
      createSupplyTabBill(state, order.id, order.orderNumber, totalCost);
      postLedger(state, {
        category: "liability_supply_tab",
        type: "credit",
        amount: totalCost,
        description: `Supply tab opened — PO #${order.orderNumber}`,
        relatedEntityId: order.id,
      });
    }

    logActivity(
      state,
      bus,
      "inventory",
      `Placed order #${order.orderNumber} with ${PURCHASING_CONFIG.supplierName} for ${formatCents(totalCost)}, arriving at next open.`,
    );
    return ok;
  },

  setAutoOpen(state: GameState, enabled: boolean): CommandResult {
    state.autoOpenEnabled = enabled;
    return ok;
  },

  setBarTipShare(state: GameState, percent0to100: number): CommandResult {
    if (!Number.isFinite(percent0to100)) return fail("Tip share must be a number.");
    if (percent0to100 < 0 || percent0to100 > 100) return fail("Tip share must be between 0% and 100%.");
    state.policies.barTipSharePercent = percent0to100 / 100;
    return ok;
  },

  payBill(state: GameState, bus: EventBus, billId: string): CommandResult {
    return payBill(state, bus, billId);
  },

  makeLoanPayment(state: GameState, bus: EventBus, amount: number): CommandResult {
    if (!state.loan) return fail("No active loan.");
    if (amount <= 0) return fail("Payment must be positive.");
    if (state.cash < amount) return fail("Not enough cash to make this loan payment.");
    const interestPaid = Math.min(state.loan.interestAccrued, amount);
    const principalPaid = Math.min(state.loan.remainingBalance, amount - interestPaid);
    const actualPayment = interestPaid + principalPaid;
    if (actualPayment <= 0) return fail("Loan is already paid.");

    // Interest and principal are different amounts, so this can't go through the single-amount
    // spendCash helper — posted manually via the same shared postLedger instead.
    state.cash -= actualPayment;
    state.loan.interestAccrued -= interestPaid;
    state.loan.remainingBalance -= principalPaid;
    state.loan.paymentHistory.push({ gameMinute: state.gameMinute, amount: actualPayment });
    if (principalPaid > 0) {
      postLedger(state, {
        category: "liability_loan",
        type: "debit",
        amount: principalPaid,
        description: "Manual startup loan principal payment",
        relatedEntityId: state.loan.id,
      });
    }
    postLedger(state, {
      category: "asset_cash",
      type: "debit",
      amount: actualPayment,
      description: "Manual startup loan payment",
      relatedEntityId: state.loan.id,
    });
    logActivity(state, bus, "finance", `Made a loan payment of ${formatCents(actualPayment)}.`);
    updateInsolvency(state, bus);
    return ok;
  },

  purchaseEquipment(state: GameState, bus: EventBus, equipmentCatalogId: string): CommandResult {
    const entry = getEquipmentCatalogEntry(equipmentCatalogId);
    if (state.cash < entry.purchasePrice) return fail("Not enough cash to purchase this equipment.");
    const property = getProperty(state.propertyId);
    if (wouldExceedEquipmentSpace(state, property, entry)) {
      return fail(
        `Not enough equipment space for ${entry.name}. Used ${usedEquipmentSpace(state)}/${property.equipmentFloorSpaceUnits}; this requires ${entry.spaceUnits}.`,
      );
    }

    state.equipment.push({
      id: createId("equip"),
      name: entry.name,
      category: entry.category,
      purchasePrice: entry.purchasePrice,
      capacity: entry.capacity,
      spaceUnits: entry.spaceUnits,
      tier: entry.tier,
      speedRating: entry.speedRating,
      condition: 100,
      currentStatus: "operational",
      repairHistory: [],
    });

    // Same as an inventory purchase: a balance-sheet asset swap (cash -> equipment), not an operating expense.
    spendCash(state, entry.purchasePrice, { description: `Equipment purchase — ${entry.name}` });

    logActivity(state, bus, "equipment", `Purchased ${entry.name} for ${formatCents(entry.purchasePrice)}.`);
    ensureMenuAutoActivation(state, bus);
    return ok;
  },

  requestContractRepair(state: GameState, bus: EventBus, equipmentId: string): CommandResult {
    const equipment = state.equipment.find((e) => e.id === equipmentId);
    if (!equipment) return fail("Equipment not found.");
    if (equipment.currentStatus !== "failed") return fail(`${equipment.name} doesn't need a contract repair right now.`);
    if (state.cash < MAINTENANCE_CONFIG.contractRepairCostCents) return fail("Not enough cash to request a contract repair.");

    spendCash(state, MAINTENANCE_CONFIG.contractRepairCostCents, {
      category: "opex_contract_repair",
      description: `Contract repair requested — ${equipment.name}`,
      relatedEntityId: equipment.id,
    });

    equipment.currentStatus = "awaiting_repair";
    equipment.contractRepairDueGameDay = state.gameDay + MAINTENANCE_CONFIG.contractRepairDelayDays;

    logActivity(
      state,
      bus,
      "equipment",
      `Requested a contract repair for ${equipment.name} (${formatCents(MAINTENANCE_CONFIG.contractRepairCostCents)}, arriving Day ${equipment.contractRepairDueGameDay}).`,
    );
    return ok;
  },

  purchaseAttraction(state: GameState, bus: EventBus, attractionCatalogId: string): CommandResult {
    const entry = getAttractionCatalogEntry(attractionCatalogId);
    if (state.cash < entry.purchasePrice) return fail("Not enough cash to purchase this attraction.");

    const property = getProperty(state.propertyId);
    const usedFloorSpace = state.attractions.reduce((sum, a) => sum + getAttractionCatalogEntryForCategory(a.category).floorSpaceUnits, 0);
    if (usedFloorSpace + entry.floorSpaceUnits > property.attractionFloorSpaceUnits) {
      return fail(`Not enough floor space for ${entry.name} — physical space is a hard limit, unlike storage capacity.`);
    }

    state.attractions.push({
      id: createId("attraction"),
      name: entry.name,
      category: entry.category,
      condition: 100,
      currentStatus: "operational",
      pricePerGameCents: entry.pricePerGameCents,
      queue: [],
      activeSession: null,
      gamesPlayedSinceClean: 0,
      queueHistory: [],
      completedSessions: [],
      repairHistory: [],
      estimatedSecondarySalesCents: 0,
    });

    spendCash(state, entry.purchasePrice, { description: `Attraction purchase — ${entry.name}` });

    logActivity(state, bus, "attraction", `Purchased ${entry.name} for ${formatCents(entry.purchasePrice)}.`);
    return ok;
  },

  setAttractionPrice(state: GameState, attractionId: string, priceCents: number): CommandResult {
    if (!Number.isFinite(priceCents)) return fail("Attraction price must be a number.");
    if (priceCents < 0) return fail("Attraction price cannot be negative.");
    const attraction = state.attractions.find((a) => a.id === attractionId);
    if (!attraction) return fail("Attraction not found.");
    attraction.pricePerGameCents = Math.round(priceCents);
    return ok;
  },

  requestAttractionContractRepair(state: GameState, bus: EventBus, attractionId: string): CommandResult {
    const attraction = state.attractions.find((a) => a.id === attractionId);
    if (!attraction) return fail("Attraction not found.");
    if (attraction.currentStatus !== "failed") return fail(`${attraction.name} doesn't need a contract repair right now.`);
    if (state.cash < ATTRACTION_CONFIG.contractRepairCostCents) return fail("Not enough cash to request a contract repair.");

    spendCash(state, ATTRACTION_CONFIG.contractRepairCostCents, {
      category: "opex_contract_repair",
      description: `Contract repair requested — ${attraction.name}`,
      relatedEntityId: attraction.id,
    });

    attraction.currentStatus = "awaiting_repair";
    attraction.contractRepairDueGameDay = state.gameDay + ATTRACTION_CONFIG.contractRepairDelayDays;

    logActivity(
      state,
      bus,
      "attraction",
      `Requested a contract repair for ${attraction.name} (${formatCents(ATTRACTION_CONFIG.contractRepairCostCents)}, arriving Day ${attraction.contractRepairDueGameDay}).`,
    );
    return ok;
  },

  purchasePromotion(state: GameState, bus: EventBus, catalogId: string): CommandResult {
    const entry = getAdvertisingCatalogEntry(catalogId);
    if (state.cash < entry.costCents) return fail("Not enough cash to launch this campaign.");
    if (state.activePromotions.some((p) => p.catalogId === catalogId)) return fail(`${entry.name} is already running.`);

    state.activePromotions.push({
      id: createId("promotion"),
      catalogId: entry.id,
      channel: entry.channel,
      name: entry.name,
      startedGameDay: state.gameDay,
      endsGameDay: state.gameDay + entry.durationDays - 1,
      costCents: entry.costCents,
    });

    spendCash(state, entry.costCents, { category: "opex_advertising", description: `Launched ${entry.name}` });

    logActivity(state, bus, "advertising", `Launched ${entry.name} for ${formatCents(entry.costCents)}.`);
    return ok;
  },
};
