// Bullet-proof localStorage wrapper with in-memory fallback for iframe-friendly execution
const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

const memoryStore: Record<string, string> = {};

export const safeStorage = {
  getItem: (key: string): string | null => {
    if (isLocalStorageAvailable()) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        // Fallback to memory
      }
    }
    return memoryStore[key] !== undefined ? memoryStore[key] : null;
  },

  setItem: (key: string, value: string): void => {
    if (isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (e) {
        // Fallback to memory
      }
    }
    memoryStore[key] = value;
  },

  removeItem: (key: string): void => {
    if (isLocalStorageAvailable()) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch (e) {
        // Fallback to memory
      }
    }
    delete memoryStore[key];
  },

  clear: (): void => {
    if (isLocalStorageAvailable()) {
      try {
        window.localStorage.clear();
        return;
      } catch (e) {
        // Fallback to memory
      }
    }
    for (const key in memoryStore) {
      delete memoryStore[key];
    }
  }
};
