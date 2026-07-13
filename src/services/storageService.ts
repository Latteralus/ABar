/**
 * Thin key-value storage abstraction. localStorage is the only implementation today; Stage 9
 * swaps this for a Supabase-backed adapter without any caller needing to change (Master Plan
 * Section 42/45 Stage 9).
 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
}

class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    return window.localStorage.getItem(key);
  }
  setItem(key: string, value: string): void {
    window.localStorage.setItem(key, value);
  }
  removeItem(key: string): void {
    window.localStorage.removeItem(key);
  }
  keys(): string[] {
    return Object.keys(window.localStorage);
  }
}

export const storageService: StorageAdapter = new LocalStorageAdapter();
