/**
 * ProductArt
 *
 * Renders the primary image for a product.
 * - Prefers product.image when it is a non-empty string.
 * - Falls back to a local asset based on product metadata (name, brand,
 *   description, processor, product_id) when the API image is absent or fails.
 * - Uses lazy loading + async decoding for performance.
 */

const FALLBACKS = [
  "/product-art-laptop.webp",
  "/product-art-monitor.webp",
  "/product-art-phone.webp",
  "/product-art-audio.webp",
  "/product-art-keyboard.webp",
];

// Keywords that steer the fallback selection toward a specific category.
const SIGNALS = [
  { keywords: ["laptop", "notebook", "macbook", "ultrabook", "chromebook"], index: 0 },
  { keywords: ["monitor", "display", "screen", "tv", "television", "desktop"], index: 1 },
  { keywords: ["phone", "smartphone", "iphone", "android", "mobile"], index: 2 },
  { keywords: ["headphone", "headset", "earphone", "earbud", "speaker", "audio", "sound", "wireless"], index: 3 },
  { keywords: ["keyboard", "mouse", "peripheral", "mechanical", "gaming", "controller"], index: 4 },
];

/**
 * Picks a stable fallback image index from the available assets.
 * Uses product metadata first, then falls back to a deterministic hash of the ID.
 */
function pickFallback(product) {
  const haystack = [
    product.product_name ?? "",
    product.brand ?? "",
    product.description ?? "",
    product.processor ?? "",
  ]
    .join(" ")
    .toLowerCase();

  for (const { keywords, index } of SIGNALS) {
    if (keywords.some((kw) => haystack.includes(kw))) {
      return FALLBACKS[index];
    }
  }

  // No keyword match — use a deterministic slot based on the product ID.
  const id = Number(product.product_id ?? 0);
  return FALLBACKS[id % FALLBACKS.length];
}

export default function ProductArt({ product, alt, className = "" }) {
  const apiImage = product?.image;
  const hasSrc = typeof apiImage === "string" && apiImage.trim() !== "";
  const fallbackSrc = pickFallback(product ?? {});

  function handleError(e) {
    // If the API image fails, swap in the local fallback.
    if (e.currentTarget.src !== window.location.origin + fallbackSrc) {
      e.currentTarget.src = fallbackSrc;
    }
  }

  return (
    <img
      src={hasSrc ? apiImage : fallbackSrc}
      alt={alt ?? product?.product_name ?? "Product image"}
      className={className}
      loading="lazy"
      decoding="async"
      onError={handleError}
    />
  );
}
