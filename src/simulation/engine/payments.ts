import { ECONOMY_CONFIG } from "@/config/economyConfig";
import { getProduct } from "@/data/products/products";
import { createId } from "@/services/idService";
import { formatCents } from "@/utils/money";
import type { EventBus } from "@/simulation/events/EventBus";
import type { SeededRandom } from "@/simulation/random/SeededRandom";
import type { Customer, Employee, GameState, Tab } from "@/types";
import { logActivity } from "./activityLogger";
import { personalitySatisfactionBonus } from "./personalityEffects";
import { postLedger } from "./ledger";

/** Sum of a tab's line items before tax/tip — the "running total" shown live while a tab is still open (Live Operations' Open Tabs table and Customer table both read this instead of duplicating the reduce). */
export function tabSubtotal(tab: Tab): number {
  return tab.lineItems.reduce((sum, li) => sum + li.unitPrice * li.quantity, 0);
}

/**
 * How much of a customer's budget is already committed this visit. `Customer.totalSpent` only
 * updates once a tab is actually paid (see closeTabAndPay below), so on its own it's always stale
 * while a tab is open — using it alone for an affordability check would let a customer order
 * unlimited rounds against an open tab as long as any single item is individually affordable,
 * since nothing already rung up on the open tab ever counts against their budget. Every
 * affordability/reorder check should go through this, not raw `customer.totalSpent`.
 */
export function customerSpentSoFar(state: GameState, customer: Customer): number {
  const openTab = state.tabs.find((t) => t.id === customer.tabId && t.status === "open");
  return customer.totalSpent + (openTab ? tabSubtotal(openTab) : 0);
}

/**
 * Closes a customer's tab: computes tax/tip, splits the card fee if applicable, posts ledger
 * entries, and produces a receipt (Master Plan Sections 26-27).
 */
export function closeTabAndPay(
  state: GameState,
  rng: SeededRandom,
  bus: EventBus,
  customer: Customer,
  servingEmployee: Employee | null,
): void {
  const tab = state.tabs.find((t) => t.id === customer.tabId);
  if (!tab) return;

  const subtotal = tabSubtotal(tab);
  const foodSubtotal = tab.lineItems
    .filter((li) => getProduct(li.productId).category === "food")
    .reduce((sum, li) => sum + li.unitPrice * li.quantity, 0);
  const drinkSubtotal = subtotal - foodSubtotal;
  const tax = Math.round(subtotal * ECONOMY_CONFIG.salesTaxRate);

  // Tip rate responds to satisfaction, the closing employee's charisma, and personality (Section 24).
  const charismaBonus = servingEmployee ? (servingEmployee.skills.charisma / 100) * 0.06 : 0;
  const personalityBonus = servingEmployee ? personalitySatisfactionBonus(servingEmployee) / 100 : 0;
  const tipRate = Math.max(0, 0.1 + (customer.satisfaction / 100) * 0.15 + charismaBonus + personalityBonus);
  const tip = Math.round(subtotal * tipRate);
  const total = subtotal + tax + tip;
  const paymentMethod: "card" | "cash" = rng.chance(ECONOMY_CONFIG.cardPaymentProbability) ? "card" : "cash";

  let cardFee = 0;
  if (paymentMethod === "card") {
    cardFee = Math.round(subtotal * ECONOMY_CONFIG.cardProcessing.percentFee) + ECONOMY_CONFIG.cardProcessing.fixedFeeCents;
  }

  tab.subtotal = subtotal;
  tab.tax = tax;
  tab.tip = tip;
  tab.total = total;
  tab.paymentMethod = paymentMethod;
  tab.status = "closed";
  tab.closedAtGameMinute = state.gameMinute;

  const barTipShare = Math.round(tip * state.policies.barTipSharePercent);
  const employeeTipShare = tip - barTipShare;

  const netCashChange = total - cardFee;
  state.cash += netCashChange;
  customer.totalSpent += total;

  if (drinkSubtotal > 0) {
    postLedger(state, {
      category: "revenue_drink_sales",
      type: "credit",
      amount: drinkSubtotal,
      description: `Drink sales — tab #${tab.tabNumber}`,
      relatedEntityId: tab.id,
    });
  }
  if (foodSubtotal > 0) {
    postLedger(state, {
      category: "revenue_food_sales",
      type: "credit",
      amount: foodSubtotal,
      description: `Food sales — tab #${tab.tabNumber}`,
      relatedEntityId: tab.id,
    });
  }
  postLedger(state, {
    category: "liability_sales_tax_payable",
    type: "credit",
    amount: tax,
    description: `Sales tax collected — tab #${tab.tabNumber}`,
    relatedEntityId: tab.id,
  });
  postLedger(state, {
    category: "revenue_bar_tip_share",
    type: "credit",
    amount: barTipShare,
    description: `Bar share of tip — tab #${tab.tabNumber}`,
    relatedEntityId: tab.id,
  });
  if (cardFee > 0) {
    postLedger(state, {
      category: "opex_card_processing_fee",
      type: "debit",
      amount: cardFee,
      description: `Card processing fee — tab #${tab.tabNumber}`,
      relatedEntityId: tab.id,
    });
  }
  postLedger(state, {
    category: "asset_cash",
    type: "credit",
    amount: netCashChange,
    description: `Cash received — tab #${tab.tabNumber}`,
    relatedEntityId: tab.id,
  });

  // Section 24: "Employee tip allocation may be simplified initially as an even split among
  // working employees" — everyone hired works every operating day, so that's just state.employees.
  if (state.employees.length > 0) {
    const perEmployeeShare = Math.floor(employeeTipShare / state.employees.length);
    let remainder = employeeTipShare - perEmployeeShare * state.employees.length;
    for (const employee of state.employees) {
      let share = perEmployeeShare;
      if (remainder > 0) {
        share += 1;
        remainder -= 1;
      }
      employee.performance.tipsEarnedCents += share;
    }
  }

  const receipt = {
    id: createId("receipt"),
    receiptNumber: state.counters.nextReceiptNumber++,
    tabId: tab.id,
    businessName: state.saveName,
    gameDay: state.gameDay,
    gameHour: 0,
    gameMinute: state.gameMinute,
    customerName: tab.customerName,
    lineItems: tab.lineItems,
    subtotal,
    tax,
    tip,
    total,
    paymentMethod,
    cardProcessingFee: cardFee || undefined,
  };
  state.receipts.push(receipt);

  bus.emit("tab:closed", { tab });
  logActivity(
    state,
    bus,
    "sale",
    `${customer.firstName} ${customer.lastName} paid tab #${tab.tabNumber} (${formatCents(total)}).`,
    "info",
    tab.id,
  );
}
