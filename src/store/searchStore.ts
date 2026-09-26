import { create } from "zustand";
import type { SearchProduct } from "@/lib/search/searchProducts";

type SearchStatus = "idle" | "loading" | "done" | "error";
/** idle: panel hidden · peek: half-raised hint while typing · open: results after submit */
export type SearchPhase = "idle" | "peek" | "open";

interface SearchState {
  query: string;
  submittedQuery: string;
  results: SearchProduct[];
  status: SearchStatus;
  phase: SearchPhase;
  totalCount: number;
  setQuery: (query: string) => void;
  setPeek: (peek: boolean) => void;
  search: (query: string) => Promise<void>;
  close: () => void;
}

let controller: AbortController | null = null;
let sequence = 0;

export const useAISearchStore = create<SearchState>((set, get) => ({
  query: "",
  submittedQuery: "",
  results: [],
  status: "idle",
  phase: "idle",
  totalCount: 0,
  setQuery: (query) => set({ query }),
  setPeek: (peek) => {
    const { phase } = get();
    if (phase === "open") return;
    set({ phase: peek ? "peek" : "idle" });
  },
  search: async (query) => {
    const normalized = query.trim().replace(/\s+/g, " ");
    if (normalized.length < 2) return;
    controller?.abort();
    controller = new AbortController();
    const request = ++sequence;
    set({ submittedQuery: normalized, results: [], status: "loading", phase: "open" });
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: normalized, limit: 24 }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Search failed: ${response.status}`);
      const payload = await response.json() as {
        success: boolean;
        data: { products: SearchProduct[]; total_count: number };
      };
      if (!payload.success) throw new Error("Search failed");
      if (request !== sequence) return;
      set({ results: payload.data.products, totalCount: payload.data.total_count, status: "done" });
    } catch (error) {
      if (request !== sequence || (error instanceof Error && error.name === "AbortError")) return;
      set({ status: "error", results: [] });
    }
  },
  close: () => {
    ++sequence;
    controller?.abort();
    controller = null;
    set({ submittedQuery: "", results: [], status: "idle", phase: "idle", totalCount: 0 });
  },
}));
