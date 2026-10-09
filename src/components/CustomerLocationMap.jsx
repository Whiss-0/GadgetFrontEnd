import { useEffect, useState } from "react";
import { mapsApi } from "../api/client";
import OpenStreetMapView from "./OpenStreetMapView";

const LOCAL_CACHE_KEY = "gadgetstore:osm-area-geocodes:v1";
const POSITIVE_CACHE_MS = 180 * 24 * 60 * 60 * 1000;
const NEGATIVE_CACHE_MS = 30 * 24 * 60 * 60 * 1000;

function readLocationCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocationCache(cache) {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // The API also keeps a shared server-side cache; a blocked browser cache is okay.
  }
}

function validCoordinateEntry(entry) {
  return entry && Number.isFinite(entry.latitude) && Number.isFinite(entry.longitude);
}

export default function CustomerLocationMap({
  locations = [],
  totalOrders = 0,
  onRefresh,
  isRefreshing = false,
  lastRefreshedAt = null,
  periodLabel = "Selected period",
}) {
  const hasData = locations.length > 0;
  const topPins = locations.slice(0, 6);
  const topList = locations.slice(0, 6);
  const maxOrders = topList[0]?.orders ?? 1;
  const placeKey = topPins.map((location) => location.label).join("\u001f");
  const [coordinatesByLabel, setCoordinatesByLabel] = useState({});
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [geocodeProgress, setGeocodeProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    let active = true;
    const labels = placeKey ? placeKey.split("\u001f").filter(Boolean) : [];
    const cache = readLocationCache();
    const now = Date.now();
    const initial = {};

    labels.forEach((label) => {
      const entry = cache[label];
      if (entry && entry.expiresAt > now && validCoordinateEntry(entry)) {
        initial[label] = { latitude: entry.latitude, longitude: entry.longitude };
      }
    });
    setCoordinatesByLabel(initial);

    const uncachedLabels = labels.filter((label) => {
      const entry = cache[label];
      return !entry || !Number.isFinite(entry.expiresAt) || entry.expiresAt <= now;
    });
    setIsGeocoding(uncachedLabels.length > 0);
    setGeocodeProgress({ done: 0, total: uncachedLabels.length });

    async function geocodeAreas() {
      for (const label of uncachedLabels) {
        if (!active) break;
        // Never send exact street addresses to a geocoder; `label` is reduced to city/province.
        if (label.length < 2 || label.length > 120) continue;
        try {
          const response = await mapsApi.geocode(label);
          const latitude = Number(response.data?.latitude);
          const longitude = Number(response.data?.longitude);
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

          const entry = { latitude, longitude, expiresAt: Date.now() + POSITIVE_CACHE_MS };
          cache[label] = entry;
          writeLocationCache(cache);
          if (active) {
            setCoordinatesByLabel((current) => ({ ...current, [label]: { latitude, longitude } }));
          }
        } catch (error) {
          if (error.response?.status === 404) {
            cache[label] = { missing: true, expiresAt: Date.now() + NEGATIVE_CACHE_MS };
            writeLocationCache(cache);
          }
          // Transient API/network failures are not cached, so Refresh can retry them.
        } finally {
          if (active) setGeocodeProgress((current) => ({ ...current, done: current.done + 1 }));
        }
      }
      if (active) setIsGeocoding(false);
    }

    geocodeAreas();
    return () => { active = false; };
  }, [placeKey]);

  const mappedLocations = topPins
    .filter((location) => coordinatesByLabel[location.label])
    .map((location) => ({ ...location, ...coordinatesByLabel[location.label] }));

  return (
    <section className="admin-location-panel" aria-labelledby="location-heading">
      <div className="admin-location-header">
        <div>
          <p className="admin-section-kicker">Delivery intelligence</p>
          <h2 id="location-heading" className="admin-location-title">Where orders come from</h2>
          <p className="admin-location-subtitle">
            Approximate city and province locations based on orders in {periodLabel.toLowerCase()}.
          </p>
        </div>

        <div className="admin-location-header-right">
          {hasData && (
            <div className="admin-location-total" aria-label={`${totalOrders} orders in this period`}>
              <span className="admin-location-total-count">{totalOrders}</span>
              <span className="admin-location-total-label">orders in this period</span>
            </div>
          )}
          <div className="admin-location-actions">
            {lastRefreshedAt && (
              <span className="admin-location-refreshed">
                Updated{" "}
                {lastRefreshedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
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
                width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
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
          <div>
            <OpenStreetMapView
              locations={mappedLocations}
              isLoading={isGeocoding}
              loadingLabel={isGeocoding ? `Locating delivery areas (${geocodeProgress.done} of ${geocodeProgress.total})…` : undefined}
              selectedLabel={selectedLabel}
              onMarkerSelect={setSelectedLabel}
            />
            <div className="location-map-legend" aria-label="Map legend">
              <span>Marker number = orders</span>
              <span>Highlighted marker = busiest area</span>
              <span>Approximate area only</span>
            </div>
          </div>
          <div className="location-list" aria-label="Popular delivery areas">
            <p className="admin-section-kicker" style={{ marginBottom: "0.75rem" }}>Popular delivery areas</p>
            <ol className="location-list-ol">
              {topList.map((location, index) => {
                const pct = Math.round((location.orders / maxOrders) * 100);
                return (
                  <li key={location.label}>
                    <button
                      type="button"
                      className={`location-list-row ${selectedLabel === location.label ? "is-selected" : ""}`}
                      onClick={() => setSelectedLabel(location.label)}
                      aria-pressed={selectedLabel === location.label}
                    >
                      <span className="location-list-rank">{String(index + 1).padStart(2, "0")}</span>
                      <div className="location-list-info">
                        <div className="location-list-top">
                          <span className="location-list-label" title={location.label}>{location.label}</span>
                          <span className="location-list-orders">{location.orders}</span>
                        </div>
                        <span className="location-list-customers">
                          {location.customers} customer{location.customers !== 1 ? "s" : ""}
                        </span>
                        <div className="location-list-bar-track">
                          <span
                            className="location-list-bar"
                            style={{ width: `${pct}%` }}
                            role="meter"
                            aria-valuenow={location.orders}
                            aria-valuemax={maxOrders}
                            aria-label={`${location.orders} of ${maxOrders} orders`}
                          />
                        </div>
                      </div>
                    </button>
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
