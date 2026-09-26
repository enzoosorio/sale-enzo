import { useEffect, useRef } from "react";
import { useAISearchStore } from "@/store/searchStore";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

/** Shared input wiring for every search field: debounced typing, instant submit, cancel. */
export function useDebouncedSearch() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const query = useAISearchStore((state) => state.query);
  const setQuery = useAISearchStore((state) => state.setQuery);
  const search = useAISearchStore((state) => state.search);
  const close = useAISearchStore((state) => state.close);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => clearTimer, []);

  const change = (value: string) => {
    setQuery(value);
    clearTimer();
    if (value.trim().length >= MIN_QUERY_LENGTH) {
      timerRef.current = setTimeout(() => { void search(value); }, DEBOUNCE_MS);
    } else {
      close();
      setQuery(value);
    }
  };

  const submit = () => {
    clearTimer();
    void search(query);
  };

  const cancel = () => {
    clearTimer();
    close();
  };

  return { query, change, submit, cancel };
}
