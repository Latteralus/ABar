import type { SimulationEventMap, SimulationEventName } from "./eventTypes";

type Listener<T> = (payload: T) => void;

/**
 * Minimal typed pub/sub bus. Simulation modules publish facts here (a customer arrived, a tab
 * closed) instead of importing and mutating each other's state, keeping systems decoupled.
 *
 * Internally stored as a type-erased map (TypeScript can't express "a map whose value type
 * depends on its own key" across a mapped-type index without this cast); the public methods
 * keep everything fully typed for callers.
 */
export class EventBus {
  private listeners = new Map<SimulationEventName, Set<Listener<unknown>>>();

  on<K extends SimulationEventName>(event: K, listener: Listener<SimulationEventMap[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener<unknown>);
    return () => set!.delete(listener as Listener<unknown>);
  }

  off<K extends SimulationEventName>(event: K, listener: Listener<SimulationEventMap[K]>): void {
    this.listeners.get(event)?.delete(listener as Listener<unknown>);
  }

  emit<K extends SimulationEventName>(event: K, payload: SimulationEventMap[K]): void {
    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }

  clear(): void {
    this.listeners.clear();
  }
}
