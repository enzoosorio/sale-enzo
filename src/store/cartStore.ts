import { create } from "zustand";
import type { CartSnapshot } from "@/lib/checkout/schemas";

export type CartAction = "add" | "remove" | "accept_price";

const emptyCart: CartSnapshot = { cart_id: null, revision: 0, pending_order: null, items: [] };

/**
 * The server cart is the source of truth; this store only mirrors its latest revision.
 * Responses can arrive out of order (refresh vs. mutation vs. Realtime), so an older
 * revision of the same cart never overwrites a newer one. A different cart id (sign-in,
 * sign-out, merge) always replaces the snapshot.
 */
export function isNewerSnapshot(current: CartSnapshot, next: CartSnapshot) {
  return next.cart_id !== current.cart_id || next.revision >= current.revision;
}

interface CartState {
  cart: CartSnapshot;
  loading: boolean;
  apply: (snapshot: CartSnapshot) => void;
  refresh: () => Promise<void>;
  change: (itemId: string, action: CartAction) => Promise<CartSnapshot>;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: emptyCart,
  loading: true,
  apply: (snapshot) => {
    if (isNewerSnapshot(get().cart, snapshot)) set({ cart: snapshot });
  },
  refresh: async () => {
    try {
      const response = await fetch("/api/cart", { cache: "no-store" });
      if (response.ok) {
        const snapshot = (await response.json()) as CartSnapshot;
        // An empty response after sign-out has no cart id; accept it as a reset.
        if (!snapshot.cart_id) set({ cart: snapshot });
        else get().apply(snapshot);
      }
    } finally {
      set({ loading: false });
    }
  },
  change: async (itemId, action) => {
    const response = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, action }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "No se pudo actualizar el carrito");
    get().apply(data as CartSnapshot);
    return data as CartSnapshot;
  },
}));
