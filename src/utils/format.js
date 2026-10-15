// One place for how money looks. Store prices are Philippine pesos.
// Whole amounts show no decimals (₱84,990); amounts with cents keep two (₱1,199.50),
// so a price list never mixes "₱1,990" with "₱1,990.5".
const WHOLE = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const WITH_CENTS = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return WHOLE.format(0);
  return Number.isInteger(amount) ? WHOLE.format(amount) : WITH_CENTS.format(amount);
}

// Compact form for chart axes: ₱850, ₱1.2k, ₱85k, ₱1.3M.
export function formatPriceShort(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "₱0";
  if (amount >= 1_000_000) return `₱${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1000) return `₱${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k`;
  return `₱${Math.round(amount)}`;
}
