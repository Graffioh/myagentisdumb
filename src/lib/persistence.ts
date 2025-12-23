/**
 * Simple localStorage persistence helpers
 */

const STORAGE_PREFIX = "inspection_panel_";

function getStorageKey(key: string): string {
  return STORAGE_PREFIX + key;
}

export function load<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") {
    return defaultValue;
  }

  try {
    const stored = localStorage.getItem(getStorageKey(key));
    if (stored === null) {
      return defaultValue;
    }
    return JSON.parse(stored) as T;
  } catch (e) {
    console.error(`Failed to load ${key} from localStorage:`, e);
    return defaultValue;
  }
}

export function save<T>(key: string, value: T): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(getStorageKey(key), JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save ${key} to localStorage:`, e);
  }
}

export function remove(key: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(getStorageKey(key));
  } catch (e) {
    console.error(`Failed to remove ${key} from localStorage:`, e);
  }
}

