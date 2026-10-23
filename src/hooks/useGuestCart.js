/**
 * useGuestCart — manages a guest cart stored in localStorage.
 *
 * Storage key: "gs_guest_cart"
 * Format: JSON array of { productId: number, quantity: number }
 *
 * Only product IDs and quantities are persisted; prices and names come from
 * the catalog at display time. No personal or payment data is stored here.
 */

const STORAGE_KEY = "gs_guest_cart";

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage may be full or unavailable; fail silently.
  }
}

/** Read the current guest cart from localStorage (not reactive). */
export function getGuestCart() {
  return readRaw();
}

/**
 * Add (or increment) a product in the guest cart.
 * Returns the updated guest-cart array.
 */
export function addToGuestCart(productId, quantity = 1) {
  const items = readRaw();
  const existing = items.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push({ productId, quantity });
  }
  writeRaw(items);
  return items;
}

/**
 * Remove one entry from the guest cart by productId.
 * Returns the updated array.
 */
export function removeFromGuestCart(productId) {
  const items = readRaw().filter((item) => item.productId !== productId);
  writeRaw(items);
  return items;
}

/** Wipe the entire guest cart. */
export function clearGuestCart() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Total item count (sum of quantities) in the guest cart. */
export function guestCartCount() {
  return readRaw().reduce((sum, item) => sum + (item.quantity || 0), 0);
}
