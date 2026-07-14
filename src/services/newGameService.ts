import { STARTING_CONDITIONS } from "@/config/gameConfig";
import { ECONOMY_CONFIG } from "@/config/economyConfig";
import { LOAN_CONFIG } from "@/config/loanConfig";
import { STARTER_PROPERTY } from "@/data/properties/starterProperty";
import { createId } from "./idService";
import { createOwnedPropertyState } from "./propertyStateFactory";
import type { AcquisitionType, GameState, Loan } from "@/types";

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

  const starterPropertyState = createOwnedPropertyState(STARTER_PROPERTY, params.acquisitionType, 1, 0);

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
    loan,
    policies: { barTipSharePercent: ECONOMY_CONFIG.tips.barSharePercent },

    properties: [starterPropertyState],
    activePropertyId: STARTER_PROPERTY.id,

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

    counters: { nextTabNumber: 1, nextReceiptNumber: 1, nextOrderNumber: 1, nextPurchaseOrderNumber: 1 },

    rngSeed: seed,
    rngState: seed,
  };
}
