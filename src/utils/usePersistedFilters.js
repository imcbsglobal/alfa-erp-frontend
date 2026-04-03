import { useEffect } from "react";

export function usePersistedFilters(key, defaults) {
  const getSaved = () => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  };

  const save = (filters) => {
    try { localStorage.setItem(key, JSON.stringify(filters)); } catch {}
  };

  const clear = () => {
    try { localStorage.removeItem(key); } catch {}
  };

  return [getSaved(), save, clear];
}