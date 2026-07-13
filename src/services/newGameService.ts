import { STARTING_CONDITIONS } from "@/config/gameConfig";
import { ECONOMY_CONFIG } from "@/config/economyConfig";
import { LOAN_CONFIG } from "@/config/loanConfig";
import { REPUTATION_CONFIG } from "@/config/reputationConfig";
import { INVENTORY_CATALOG } from "@/data/products/inventoryCatalog";
import { PRODUCT_CATALOG } from "@/data/products/products";
import { STARTER_PROPERTY } from "@/data/properties/starterProperty";
import { createId } from "./idService";
import type { AcquisitionType, GameState, InventoryItem, Loan, MenuListing } from "@/types";

export interface NewGameParams {
  saveName: string;
  acquisitionType: AcquisitionType;
  acceptLoan: boolean;
}

/** Picks a fresh RNG seed. The only sanctioned use of a non-seeded random source (Section 43) — everything after this flows through SeededRandom. */
function generateSeed(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Math.floor(Math.random() * 0xffffffff);
}

function buildStartingInventory(): InventoryItem[] {
  return INVENTORY_CATALOG.map((entry) => ({
    id: entry.id,
    name: entry.name,
    category: entry.category,
    unit: entry.unit,
    quantityOnHand: 0,
    averageUnitCost: entry.baseUnitCostCents,
    storageLocation: entry.storageLocation,
    shelfLifeGameMinutes: entry.shelfLifeGameMinutes,
    daysSinceLastRestock: 0,
    requiresRefrigeration: entry.requiresRefrigeration,
    requiresFreezer: entry.requiresFreezer,
    reorderMinimum: entry.reorderMinimum,
    reorderTarget: entry.reorderTarget,
    pendingDeliveryQuantity: 0,
    recentUsage: 0,
  }));
}

function buildStartingMenu(): MenuListing[] {
  return PRODUCT_CATALOG.map((product) => ({ productId: product.id, price: product.suggestedPrice, isActive: false }));
}

function buildLoan(): Loan {
  return {
    id: createId("loan"),
    principal: LOAN_CONFIG.principalCents,
    annualInterestRatePercent: LOAN_CONFIG.annualInterestRatePercent,
    paymentFrequencyDays: LOAN_CONFIG.paymentFrequencyDays,
    minimumPayment: Math.max(
      LOAN_CONFIG.minimumPaymentFloorCents,
      Math.round(LOAN_CONFIG.principalCents * LOAN_CONFIG.minimumPaymentPercentOfBalance),
    ),
    remainingBalance: LOAN_CONFIG.principalCents,
    interestAccrued: 0,
    nextDueGameDay: LOAN_CONFIG.paymentFrequencyDays,
    paymentHistory: [],
  };
}

export function createNewGameState(params: NewGameParams): GameState {
  const nowIso = new Date().toISOString();
  const seed = generateSeed();
  const loan = params.acceptLoan ? buildLoan() : null;
  const cash = STARTING_CONDITIONS.startingCash + (loan ? loan.principal : 0);

  return {
    saveId: createId("save"),
    saveName: params.saveName,
    createdAtIso: nowIso,
    lastPlayedAtIso: nowIso,

    gameDay: 1,
    gameMinute: 0,
    dayState: "between_days",
    isPaused: false,
    autoOpenEnabled: false,

    cash,
    property: { propertyId: STARTER_PROPERTY.id, acquisitionType: params.acquisitionType, acquiredAtGameMinute: 0 },
    propertyId: STARTER_PROPERTY.id,
    loan,
    policies: { barTipSharePercent: ECONOMY_CONFIG.tips.barSharePercent },

    employees: [],
    customers: [],
    customerGroups: [],

    inventory: buildStartingInventory(),
    purchaseOrders: [],
    equipment: STARTER_PROPERTY.existingEquipment.map((e) => ({ ...e, currentStatus: "operational" as const, repairHistory: [] })),
    attractions: [],

    menu: buildStartingMenu(),

    barCleanliness: 100,

    tabs: [],
    receipts: [],
    tasks: [],
    orders: [],

    ledger: [
      {
        id: createId("ledger"),
        gameMinute: 0,
        gameDay: 1,
        category: "equity_owner_capital",
        type: "credit",
        amount: STARTING_CONDITIONS.startingCash,
        description: "Owner starting capital",
      },
      {
        id: createId("ledger"),
        gameMinute: 0,
        gameDay: 1,
        category: "asset_cash",
        type: "credit",
        amount: STARTING_CONDITIONS.startingCash,
        description: "Owner starting capital",
      },
      ...(loan
        ? [
            {
              id: createId("ledger"),
              gameMinute: 0,
              gameDay: 1,
              category: "liability_loan" as const,
              type: "credit" as const,
              amount: loan.principal,
              description: "Startup loan proceeds",
            },
            {
              id: createId("ledger"),
              gameMinute: 0,
              gameDay: 1,
              category: "asset_cash" as const,
              type: "credit" as const,
              amount: loan.principal,
              description: "Startup loan proceeds",
              relatedEntityId: loan.id,
            },
          ]
        : []),
    ],
    bills: [],
    insolvency: null,
    reputation: { score: REPUTATION_CONFIG.startingScore, history: [] },
    reviews: [],
    activePromotions: [],
    activityLog: [
      {
        id: createId("log"),
        gameMinute: 0,
        gameDay: 1,
        category: "system",
        severity: "info",
        message: `${params.saveName} opened its doors for the first time.`,
      },
    ],
    dailyReports: [],

    counters: { nextTabNumber: 1, nextReceiptNumber: 1, nextOrderNumber: 1, nextPurchaseOrderNumber: 1 },

    rngSeed: seed,
    rngState: seed,
  };
}
