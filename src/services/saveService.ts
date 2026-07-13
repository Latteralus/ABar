import { SAVE_CONFIG } from "@/config/gameConfig";
import { ECONOMY_CONFIG } from "@/config/economyConfig";
import { REPUTATION_CONFIG } from "@/config/reputationConfig";
import { getAttractionCatalogEntryForCategory } from "@/data/attractions/attractionCatalog";
import { getEquipmentCatalogEntry } from "@/data/equipment/equipmentCatalog";
import { STARTER_PROPERTY } from "@/data/properties";
import { getInventoryCatalogEntry } from "@/data/products/inventoryCatalog";
import { CUSTOMER_ARCHETYPES } from "@/data/customers/archetypes";
import { storageService } from "./storageService";
import type { GameState, SaveFileEnvelope, SaveSummary } from "@/types";
import { CURRENT_SAVE_VERSION } from "@/types/save";

function saveKey(saveId: string): string {
  return `${SAVE_CONFIG.localStorageKeyPrefix}${saveId}`;
}

function readIndex(): SaveSummary[] {
  const raw = storageService.getItem(SAVE_CONFIG.saveIndexKey);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SaveSummary[];
  } catch {
    return [];
  }
}

function writeIndex(index: SaveSummary[]): void {
  storageService.setItem(SAVE_CONFIG.saveIndexKey, JSON.stringify(index));
}

function toSummary(state: GameState): SaveSummary {
  return {
    saveId: state.saveId,
    saveName: state.saveName,
    createdAtIso: state.createdAtIso,
    lastPlayedAtIso: state.lastPlayedAtIso,
    gameDay: state.gameDay,
    cash: state.cash,
  };
}

/**
 * Applies sequential migrations from a save's stored version up to CURRENT_SAVE_VERSION, so
 * existing saves keep loading after a schema change instead of crashing on a missing field
 * (Master Plan Section 42/50 "save migration").
 */
function migrate(envelope: SaveFileEnvelope): GameState {
  const state = envelope.state;

  if (envelope.version < 2) {
    // v2 (Stage 2) added facility cleanliness and per-customer removal tracking.
    if (typeof state.barCleanliness !== "number") {
      state.barCleanliness = 100;
    }
  }

  if (envelope.version < 3) {
    // v3 (Stage 3) added owned equipment and shelf-life/spoilage tracking on inventory items.
    if (!Array.isArray(state.equipment)) {
      state.equipment = STARTER_PROPERTY.existingEquipment.map((e) => ({ ...e }));
    }
    for (const item of state.inventory) {
      if (typeof item.daysSinceLastRestock !== "number") item.daysSinceLastRestock = 0;
      if (item.shelfLifeGameMinutes === undefined) {
        const catalogEntry = getInventoryCatalogEntry(item.id);
        item.shelfLifeGameMinutes = catalogEntry.shelfLifeGameMinutes;
      }
    }
  }

  if (envelope.version < 4) {
    // v4 (Stage 4) added equipment condition/breakdown/repair tracking.
    for (const equipment of state.equipment) {
      if (equipment.currentStatus === undefined) equipment.currentStatus = "operational";
      if (!Array.isArray(equipment.repairHistory)) equipment.repairHistory = [];
    }
  }

  if (envelope.version < 5) {
    // v5 (Attractions) added the attractions array and Customer.attractionAffinity.
    if (!Array.isArray(state.attractions)) state.attractions = [];
    for (const customer of state.customers) {
      if (typeof customer.attractionAffinity !== "number") {
        const archetype = CUSTOMER_ARCHETYPES.find((a) => a.id === customer.archetypeId);
        customer.attractionAffinity = archetype?.attractionAffinity ?? 50;
      }
    }
    for (const report of state.dailyReports) {
      if (typeof report.attractionSessionsCompletedToday !== "number") report.attractionSessionsCompletedToday = 0;
    }
  }

  if (envelope.version < 6) {
    // v6 (Stage 5) added weekly bills and insolvency/bankruptcy tracking.
    if (!Array.isArray(state.bills)) state.bills = [];
    if (state.insolvency === undefined) state.insolvency = null;
    if (!state.policies) state.policies = { barTipSharePercent: ECONOMY_CONFIG.tips.barSharePercent };
  }

  if (envelope.version < 7) {
    if (!state.policies) state.policies = { barTipSharePercent: ECONOMY_CONFIG.tips.barSharePercent };
    for (const attraction of state.attractions ?? []) {
      if (typeof attraction.pricePerGameCents !== "number") attraction.pricePerGameCents = getAttractionCatalogEntryForCategory(attraction.category).pricePerGameCents;
    }
  }

  if (envelope.version < 8) {
    for (const equipment of state.equipment ?? []) {
      if (typeof equipment.spaceUnits !== "number") {
        const starter = STARTER_PROPERTY.existingEquipment.find((e) => e.id === equipment.id || e.category === equipment.category);
        equipment.spaceUnits = starter?.spaceUnits ?? 8;
      }
      if (typeof equipment.tier !== "number") {
        const starter = STARTER_PROPERTY.existingEquipment.find((e) => e.id === equipment.id || e.category === equipment.category);
        equipment.tier = starter?.tier ?? 1;
      }
      if (equipment.purchasePrice > 0) {
        try {
          const catalog = getEquipmentCatalogEntry(equipment.id);
          equipment.spaceUnits = equipment.spaceUnits ?? catalog.spaceUnits;
          equipment.tier = equipment.tier ?? catalog.tier;
        } catch {
          // Old purchased equipment IDs were not the same as owned equipment IDs; keep fallback values.
        }
      }
    }
  }

  if (envelope.version < 9) {
    // v9 (Reputation & Advertising / Master Plan Stage 6) added the reputation score/history,
    // customer reviews, and active advertising/promotion campaigns.
    if (!state.reputation || typeof state.reputation.score !== "number") {
      state.reputation = { score: REPUTATION_CONFIG.startingScore, history: [] };
    }
    if (!Array.isArray(state.reviews)) state.reviews = [];
    if (!Array.isArray(state.activePromotions)) state.activePromotions = [];
  }

  return state;
}

export const saveService = {
  save(state: GameState): void {
    const envelope: SaveFileEnvelope = { version: CURRENT_SAVE_VERSION, savedAtIso: new Date().toISOString(), state };
    storageService.setItem(saveKey(state.saveId), JSON.stringify(envelope));
    const index = readIndex().filter((s) => s.saveId !== state.saveId);
    index.push(toSummary(state));
    writeIndex(index);
  },

  load(saveId: string): GameState | null {
    const raw = storageService.getItem(saveKey(saveId));
    if (!raw) return null;
    const envelope = JSON.parse(raw) as SaveFileEnvelope;
    return migrate(envelope);
  },

  list(): SaveSummary[] {
    return readIndex().sort((a, b) => (a.lastPlayedAtIso < b.lastPlayedAtIso ? 1 : -1));
  },

  delete(saveId: string): void {
    storageService.removeItem(saveKey(saveId));
    writeIndex(readIndex().filter((s) => s.saveId !== saveId));
  },

  rename(saveId: string, newName: string): void {
    const state = this.load(saveId);
    if (!state) return;
    state.saveName = newName;
    this.save(state);
  },
};
