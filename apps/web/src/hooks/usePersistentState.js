import { useEffect, useState } from "react";

/**
 * React state + localStorage senkronu.
 * usePersistentState("LS_KEY", { ...initial }) gibi kullan.
 */
export default function usePersistentState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // storage kapalıysa sessizce geç
    }
  }, [key, state]);

  return [state, setState];
}