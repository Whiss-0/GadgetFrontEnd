// CustomerLocationMap.jsx
// Admin-only component. Shows a privacy-safe aggregate view of the broad areas
// that generate the most orders. Exact street addresses are NEVER rendered here.

// Deterministic pseudo-random positions for map pins based on label text,
// so pins don't jump around on re-render.
function stablePosition(label, index, total) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  // Spread pins across the map canvas avoiding the very edges
  const cols = Math.min(total, 3);
  const col = index % cols;
  const row = Math.floor(index / cols);
  const baseX = 12 + col * (76 / Math.max(cols - 1, 1));
  const baseY = 18 + row * 30;
  const jitterX = ((hash & 0xff) / 255) * 12 - 6;
  const jitterY = (((hash >> 8) & 0xff) / 255) * 8 - 4;
  return {
    left: `${Math.max(8, Math.min(88, baseX + jitterX)).toFixed(1)}%`,
    top: `${Math.max(12, Math.min(80, baseY + jitterY)).toFixed(1)}%`,
  };
}

export default function CustomerLocationMap({
  locations = [],
  totalOrders = 0,
  onRefresh,
  isRefreshing = false,
  lastRefreshedAt = null,
}) {
  const hasData = locations.length > 0;
  const topPins = locations.slice(0, 5);
  const topList = locations.slice(0, 6);
  const maxOrders = topList[0]?.orders ?? 1;

  return (
    <section className="admin-location-panel" aria-labelledby="location-heading">
      {/* Header */}
      <div className="admin-location-header">
        <div>
          <p className="admin-section-kicker">Delivery insights</p>
          <h2 id="location-heading" className="admin-location-title">Customer locations</h2>
          <p className="admin-location-subtitle">
            Where orders are coming from during this period.
          </p>
        </div>

        <div className="admin-location-header-right">
          {hasData && (
            <div className="admin-location-total" aria-label={`${totalOrders} orders in this period`}>
              <span className="admin-location-total-count">{totalOrders}</span>
              <span className="admin-location-total-label">orders in this period</span>
            </div>
          )}

          {/* Refresh controls */}
          <div className="admin-location-actions">
            {lastRefreshedAt && (
              <span className="admin-location-refreshed">
                Updated{" "}
                {lastRefreshedAt.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
            <button
              type="button"
              className="admin-location-refresh"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh customer locations"
            >
              <svg
                className={isRefreshing ? "is-spinning" : ""}
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 11a8.1 8.1 0 0 0-14.7-3L3 11" />
                <path d="M3 4v7h7" />
                <path d="M4 13a8.1 8.1 0 0 0 14.7 3L21 13" />
                <path d="M21 20v-7h-7" />
              </svg>
              <span>{isRefreshing ? "Refreshing" : "Refresh"}</span>
            </button>
          </div>
        </div>
      </div>

      {hasData ? (
        <div className="admin-location-body">
          {/* Abstract map visual */}
          <div
            className="location-map"
            role="img"
            aria-label="Approximate area visualization of customer delivery regions"
          >
            {/* Grid lines */}
            <div className="location-map-grid" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={`h-${i}`} className="location-map-gridline location-map-gridline--h" style={{ top: `${20 + i * 15}%` }} />
              ))}
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`v-${i}`} className="location-map-gridline location-map-gridline--v" style={{ left: `${10 + i * 15}%` }} />
              ))}
            </div>

            {/* Abstract land shape */}
            <div className="location-map-shape" aria-hidden="true" />

            {/* Pins for top locations */}
            {topPins.map((loc, i) => {
              const pos = stablePosition(loc.label, i, topPins.length);
              return (
                <div
                  key={loc.label}
                  className={`location-map-pin ${i === 0 ? "location-map-pin--top" : ""}`}
                  style={{ left: pos.left, top: pos.top }}
                  title={`${loc.label}: ${loc.orders} order${loc.orders !== 1 ? "s" : ""}`}
                  aria-label={`${loc.label}: ${loc.orders} orders`}
                >
                  <div className="location-map-pin-dot" />
                  <span className="location-map-pin-count">{loc.orders}</span>
                </div>
              );
            })}
          </div>

          {/* Ranked list */}
          <div className="location-list" aria-label="Popular delivery areas">
            <p className="admin-section-kicker" style={{ marginBottom: "0.75rem" }}>Popular delivery areas</p>
            <ol className="location-list-ol">
              {topList.map((loc, i) => {
                const pct = Math.round((loc.orders / maxOrders) * 100);
                return (
                  <li key={loc.label} className="location-list-row">
                    <span className="location-list-rank">{String(i + 1).padStart(2, "0")}</span>
                    <div className="location-list-info">
                      <div className="location-list-top">
                        <span className="location-list-label">{loc.label}</span>
                        <span className="location-list-orders">{loc.orders}</span>
                      </div>
                      <span className="location-list-customers">
                        {loc.customers} customer{loc.customers !== 1 ? "s" : ""}
                      </span>
                      <div className="location-list-bar-track">
                        <div
                          className="location-list-bar"
                          style={{ width: `${pct}%` }}
                          role="meter"
                          aria-valuenow={loc.orders}
                          aria-valuemax={maxOrders}
                          aria-label={`${loc.orders} of ${maxOrders} orders`}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      ) : (
        <div className="admin-location-empty" role="status">
          <div className="admin-location-empty-icon" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="17" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M20 24C20 24 12 32 12 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M20 24C20 24 28 32 28 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="20" cy="17" r="2.5" fill="currentColor" />
            </svg>
          </div>
          <p className="admin-location-empty-title">No delivery areas to show yet.</p>
          <p className="admin-location-empty-body">
            Once orders include a saved address, the busiest areas will appear here.
          </p>
        </div>
      )}
    </section>
  );
}
