import { create } from "zustand";
import { commandService } from "@/services/commandService";
import { createNewGameState, type NewGameParams } from "@/services/newGameService";
import { saveService } from "@/services/saveService";
import { SimulationEngine } from "@/simulation/engine/SimulationEngine";
import { generateCandidatePool } from "@/simulation/engine/employeeFactory";
import type { EventBus } from "@/simulation/events/EventBus";
import type { Employee, EmployeeRole, GameState, PurchaseOrderLine, SaveSummary } from "@/types";
import type { CommandResult } from "@/services/commandService";

interface GameStoreState {
  state: GameState | null;
  saveSummaries: SaveSummary[];
  engine: SimulationEngine | null;

  refreshSaveList: () => void;
  startNewGame: (params: NewGameParams) => void;
  loadGame: (saveId: string) => void;
  deleteSave: (saveId: string) => void;
  renameSave: (saveId: string, name: string) => void;
  saveCurrentGame: () => void;
  exitToMenu: () => void;

  pause: () => void;
  resume: () => void;
  openBar: () => void;
  setAutoOpen: (enabled: boolean) => void;
  setBarTipShare: (percent0to100: number) => CommandResult;

  generateHiringCandidates: (role: EmployeeRole) => CommandResult & { candidates: Employee[] };
  hireEmployee: (employee: Employee) => CommandResult;
  fireEmployee: (employeeId: string) => CommandResult;
  setMenuPrice: (productId: string, priceCents: number) => CommandResult;
  setMenuActive: (productId: string, isActive: boolean) => CommandResult;
  placePurchaseOrder: (lines: PurchaseOrderLine[], payment: "cash" | "tab") => CommandResult;
  payBill: (billId: string) => CommandResult;
  makeLoanPayment: (amount: number) => CommandResult;
  purchaseEquipment: (equipmentCatalogId: string) => CommandResult;
  requestContractRepair: (equipmentId: string) => CommandResult;
  purchaseAttraction: (attractionCatalogId: string) => CommandResult;
  setAttractionPrice: (attractionId: string, priceCents: number) => CommandResult;
  requestAttractionContractRepair: (attractionId: string) => CommandResult;
  purchasePromotion: (catalogId: string) => CommandResult;
}

/**
 * Wraps a commandService call into a store action: guards for no active game, runs the command
 * against the live engine state, commits the tick, and — critically — always saves on success.
 * Every command action used to hand-copy this get/guard/commit/save sequence, and three of them
 * (fireEmployee, setMenuPrice, setMenuActive) had silently drifted to skip the save, meaning that
 * action was lost if the tab closed before the next day boundary autosave. Routing every command
 * through here makes that guarantee structural instead of something to remember per action.
 */
function runCommand<Args extends unknown[]>(
  get: () => GameStoreState,
  fn: (state: GameState, bus: EventBus, ...args: Args) => CommandResult,
): (...args: Args) => CommandResult {
  return (...args: Args) => {
    const { engine } = get();
    if (!engine) return { success: false, error: "No active game." };
    const result = fn(engine.getState(), engine.eventBus, ...args);
    engine.commitNow();
    if (result.success) saveService.save(engine.getState());
    return result;
  };
}

/** The single central game store (Stage 0 requirement). React only ever reads `state` and
 * dispatches these actions — none of them contain simulation math themselves, they delegate
 * to services/commandService and the SimulationEngine. */
export const useGameStore = create<GameStoreState>((set, get) => ({
  state: null,
  saveSummaries: [],
  engine: null,

  refreshSaveList: () => set({ saveSummaries: saveService.list() }),

  startNewGame: (params: NewGameParams) => {
    const initialState = createNewGameState(params);
    const engine = new SimulationEngine(initialState, (s) => set({ state: { ...s } }));
    engine.eventBus.on("day:opened", () => saveService.save(engine.getState()));
    engine.eventBus.on("day:closed", () => saveService.save(engine.getState()));
    engine.start();
    saveService.save(initialState);
    set({ engine, state: { ...initialState }, saveSummaries: saveService.list() });
  },

  loadGame: (saveId: string) => {
    get().engine?.pause();
    const loaded = saveService.load(saveId);
    if (!loaded) return;
    const engine = new SimulationEngine(loaded, (s) => set({ state: { ...s } }));
    engine.eventBus.on("day:opened", () => saveService.save(engine.getState()));
    engine.eventBus.on("day:closed", () => saveService.save(engine.getState()));
    engine.start();
    set({ engine, state: { ...loaded } });
  },

  deleteSave: (saveId: string) => {
    saveService.delete(saveId);
    set({ saveSummaries: saveService.list() });
  },

  renameSave: (saveId: string, name: string) => {
    saveService.rename(saveId, name);
    set({ saveSummaries: saveService.list() });
  },

  saveCurrentGame: () => {
    const { engine } = get();
    if (!engine) return;
    saveService.save(engine.getState());
    set({ saveSummaries: saveService.list() });
  },

  exitToMenu: () => {
    get().engine?.pause();
    set({ engine: null, state: null });
  },

  pause: () => get().engine?.pause(),
  resume: () => get().engine?.resume(),

  openBar: () => {
    const { engine } = get();
    if (!engine) return;
    engine.openBarNow();
    saveService.save(engine.getState());
  },

  setAutoOpen: (enabled: boolean) => {
    const { engine } = get();
    if (!engine) return;
    commandService.setAutoOpen(engine.getState(), enabled);
    engine.commitNow();
  },

  setBarTipShare: runCommand(get, (state, _bus, percent0to100: number) => commandService.setBarTipShare(state, percent0to100)),

  generateHiringCandidates: (role: EmployeeRole) => {
    const { engine } = get();
    if (!engine) return { success: false, error: "No active game.", candidates: [] };
    const result = commandService.searchForCandidates(engine.getState(), engine.eventBus, role);
    if (!result.success) {
      engine.commitNow();
      return { ...result, candidates: [] };
    }
    const candidates = engine.generateWithRandom((rng) => generateCandidatePool(rng, role));
    engine.commitNow();
    saveService.save(engine.getState());
    return { success: true, candidates };
  },

  hireEmployee: runCommand(get, (state, bus, employee: Employee) => commandService.hireEmployee(state, bus, employee)),
  fireEmployee: runCommand(get, (state, bus, employeeId: string) => commandService.fireEmployee(state, bus, employeeId)),
  setMenuPrice: runCommand(get, (state, _bus, productId: string, priceCents: number) =>
    commandService.setMenuPrice(state, productId, priceCents),
  ),
  setMenuActive: runCommand(get, (state, _bus, productId: string, isActive: boolean) =>
    commandService.setMenuActive(state, productId, isActive),
  ),
  placePurchaseOrder: runCommand(get, (state, bus, lines: PurchaseOrderLine[], payment: "cash" | "tab") =>
    commandService.placePurchaseOrder(state, bus, lines, payment),
  ),
  payBill: runCommand(get, (state, bus, billId: string) => commandService.payBill(state, bus, billId)),
  makeLoanPayment: runCommand(get, (state, bus, amount: number) => commandService.makeLoanPayment(state, bus, amount)),
  purchaseEquipment: runCommand(get, (state, bus, equipmentCatalogId: string) =>
    commandService.purchaseEquipment(state, bus, equipmentCatalogId),
  ),
  requestContractRepair: runCommand(get, (state, bus, equipmentId: string) =>
    commandService.requestContractRepair(state, bus, equipmentId),
  ),
  purchaseAttraction: runCommand(get, (state, bus, attractionCatalogId: string) =>
    commandService.purchaseAttraction(state, bus, attractionCatalogId),
  ),
  setAttractionPrice: runCommand(get, (state, _bus, attractionId: string, priceCents: number) =>
    commandService.setAttractionPrice(state, attractionId, priceCents),
  ),
  requestAttractionContractRepair: runCommand(get, (state, bus, attractionId: string) =>
    commandService.requestAttractionContractRepair(state, bus, attractionId),
  ),
  purchasePromotion: runCommand(get, (state, bus, catalogId: string) => commandService.purchasePromotion(state, bus, catalogId)),
}));
