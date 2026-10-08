import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const PHILIPPINES_CENTER = [12.8797, 121.774];
const TILE_URL = import.meta.env.VITE_OSM_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = import.meta.env.VITE_OSM_TILE_ATTRIBUTION
  || '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>';

function createPopupContent(location) {
  const wrapper = document.createElement("div");
  wrapper.className = "customer-map-popup";

  const title = document.createElement("strong");
  title.textContent = location.label;
  const detail = document.createElement("span");
  detail.textContent = `${location.orders} order${location.orders === 1 ? "" : "s"} · ${location.customers} customer${location.customers === 1 ? "" : "s"}`;
  const note = document.createElement("small");
  note.textContent = "Approximate city / province location";

  wrapper.append(title, detail, note);
  return wrapper;
}

function createCountIcon(location, isTopLocation) {
  const orderCount = Math.max(0, Math.trunc(Number(location.orders) || 0));
  return L.divIcon({
    className: "customer-map-marker-wrap",
    html: `<span class="customer-map-marker${isTopLocation ? " customer-map-marker--top" : ""}"><span>${orderCount}</span><i aria-hidden="true"></i></span>`,
    iconSize: [42, 48],
    iconAnchor: [21, 46],
    popupAnchor: [0, -42],
  });
}

export default function OpenStreetMapView({ locations = [], isLoading = false }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: true,
    }).setView(PHILIPPINES_CENTER, 5);

    const tileLayer = L.tileLayer(TILE_URL, {
      maxZoom: 19,
      attribution: TILE_ATTRIBUTION,
    });
    tileLayer.on("tileerror", () => setTileError(true));
    tileLayer.on("load", () => setTileError(false));
    tileLayer.addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => map.invalidateSize({ pan: false }))
      : null;
    resizeObserver?.observe(containerRef.current);
    const resizeFrame = window.requestAnimationFrame(() => map.invalidateSize());
    return () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeObserver?.disconnect();
      tileLayer.off();
      markerLayerRef.current?.clearLayers();
      markerLayerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;

    markerLayer.clearLayers();
    const located = locations.filter((item) =>
      Number.isFinite(item.latitude) && Number.isFinite(item.longitude)
    );

    located.forEach((location, index) => {
      const marker = L.marker([location.latitude, location.longitude], {
        icon: createCountIcon(location, index === 0),
        keyboard: true,
        title: `${location.label}: ${location.orders} orders`,
      });
      marker.bindPopup(createPopupContent(location), { maxWidth: 240 });
      marker.addTo(markerLayer);
    });

    if (located.length === 1) {
      map.setView([located[0].latitude, located[0].longitude], 9);
    } else if (located.length > 1) {
      const bounds = L.latLngBounds(located.map((item) => [item.latitude, item.longitude]));
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 9 });
    } else {
      map.setView(PHILIPPINES_CENTER, 5);
    }
  }, [locations]);

  const hasLocatedAreas = locations.some((item) =>
    Number.isFinite(item.latitude) && Number.isFinite(item.longitude)
  );

  return (
    <div className="location-map-frame">
      <div
        ref={containerRef}
        className="location-map"
        role="application"
        aria-label="Interactive OpenStreetMap showing approximate customer delivery areas in the Philippines"
      />
      {tileError ? (
        <div className="location-map-status" role="alert">
          Map tiles could not be loaded. Check the network or tile-provider settings, then refresh the dashboard.
        </div>
      ) : !hasLocatedAreas && (
        <div className="location-map-status" role="status">
          {isLoading ? "Locating delivery areas…" : "No matching map locations found. The area list is still available."}
        </div>
      )}
    </div>
  );
}
