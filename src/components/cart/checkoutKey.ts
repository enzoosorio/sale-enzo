// One idempotency key per cart revision, shared by every tab (localStorage). Double clicks and
// parallel tabs reuse it, so the server returns the same order instead of creating another.
const STORAGE_KEY = 'sale-enzo-checkout-key';

type Saved = { key: string; revision: number };

function read(): Saved | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Saved | null;
    return saved && typeof saved.key === 'string' && typeof saved.revision === 'number' ? saved : null;
  } catch { return null; }
}

export function checkoutKey(revision: number) {
  const current = read();
  if (current?.revision === revision) return current.key;
  const next = { key: crypto.randomUUID(), revision };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* private mode: key lives for this call */ }
  return next.key;
}

export function clearCheckoutKey() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
}
