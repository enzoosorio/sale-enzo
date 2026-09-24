/**
 * Shallow history for the categories panel.
 *
 * The panel is a view of `/products?category=…&subcategory=…`, so every level
 * the user enters is written to the URL with the native History API. Next.js
 * syncs `useSearchParams`/`usePathname` with these calls without fetching RSC,
 * which keeps the page behind the panel untouched while browsing.
 *
 * - Opening pushes a sentinel entry, so the phone's back gesture closes the
 *   panel instead of leaving the page.
 * - Each level down pushes one entry, so back goes up one level.
 * - Closing unwinds every entry the panel pushed, restoring the original URL.
 */

export const PRODUCTS_PATH = "/products";

let depth = 0;
let onExhausted: (() => void) | null = null;
let afterUnwind: (() => void) | null = null;

export function buildProductsUrl(params: URLSearchParams) {
  const query = params.toString();
  return query ? `${PRODUCTS_PATH}?${query}` : PRODUCTS_PATH;
}

function detach() {
  window.removeEventListener("popstate", onPopState);
  depth = 0;
  onExhausted = null;
}

function onPopState() {
  if (afterUnwind) {
    const callback = afterUnwind;
    afterUnwind = null;
    detach();
    callback();
    return;
  }

  depth = Math.max(0, depth - 1);
  if (depth === 0) {
    const callback = onExhausted;
    detach();
    callback?.();
  }
}

/** Called when the panel opens. `onBackPastStart` runs if the user navigates back out of it. */
export function beginPanelHistory(onBackPastStart: () => void) {
  if (depth > 0) return;
  onExhausted = onBackPastStart;
  window.history.pushState(null, "", window.location.href);
  depth = 1;
  window.addEventListener("popstate", onPopState);
}

/** Enter a deeper level: one history entry per level. */
export function pushLevel(params: URLSearchParams) {
  window.history.pushState(null, "", buildProductsUrl(params));
  depth += 1;
}

/** Update the current level in place (filters, invalid slugs). */
export function replaceLevel(params: URLSearchParams) {
  window.history.replaceState(null, "", buildProductsUrl(params));
}

/** Go up one level, reusing the history entry when the panel created it. */
export function goUpLevel(parentParams: URLSearchParams) {
  if (depth > 1) {
    window.history.back();
  } else {
    replaceLevel(parentParams);
  }
}

/** Restore the URL the panel was opened on, then run `then`. */
export function endPanelHistory(then?: () => void) {
  if (depth === 0) {
    then?.();
    return;
  }

  afterUnwind = () => then?.();
  window.history.go(-depth);
}
