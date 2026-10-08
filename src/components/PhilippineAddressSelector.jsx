// PhilippineAddressSelector.jsx
//
// Cascading Philippine address selector: Region → Province → City/Municipality → Barangay.
// Data is lazily loaded per level from the FN-FAL113/Philippine-Address-Selector
// repository's public JSON files (MIT-style usage of the data; the GPL handler.js
// was not copied — this is an independent React implementation).
//
// Data source: https://github.com/FN-FAL113/Philippine-Address-Selector
// License notice preserved per GPL-3.0 (code is independent; data reused):
//   Original data curated by Jeff Hubert Orbeta (FN-FAL113), GPL-3.0
//
// Usage:
//   <PhilippineAddressSelector
//     street={street}
//     onAddressChange={(addressString) => setAddress(addressString)}
//     disabled={false}
//   />

import { useState, useEffect, useCallback } from "react";

// Base URL for the address JSON data — points at the reference repository's
// raw files. Can be overridden to a self-hosted mirror if desired.
const DATA_BASE =
  "https://raw.githubusercontent.com/FN-FAL113/Philippine-Address-Selector/main/public";

// Module-level per-level cache to avoid re-fetching on every render
const dataCache = {
  regions:   null,
  provinces: new Map(),  // keyed by region_code
  cities:    new Map(),  // keyed by province_code
  barangays: new Map(),  // keyed by city_code
};

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}

async function loadRegions() {
  if (dataCache.regions) return dataCache.regions;
  dataCache.regions = await fetchJson(`${DATA_BASE}/region.json`);
  return dataCache.regions;
}

async function loadProvinces(regionCode) {
  if (dataCache.provinces.has(regionCode)) return dataCache.provinces.get(regionCode);
  const all = await fetchJson(`${DATA_BASE}/province.json`);
  // Group by region_code so subsequent calls for the same region are instant
  const byRegion = new Map();
  for (const p of all) {
    const key = p.region_code;
    if (!byRegion.has(key)) byRegion.set(key, []);
    byRegion.get(key).push(p);
  }
  byRegion.forEach((v, k) => dataCache.provinces.set(k, v));
  return dataCache.provinces.get(regionCode) ?? [];
}

async function loadCities(provinceCode) {
  if (dataCache.cities.has(provinceCode)) return dataCache.cities.get(provinceCode);
  const all = await fetchJson(`${DATA_BASE}/city.json`);
  const byProvince = new Map();
  for (const c of all) {
    const key = c.province_code;
    if (!byProvince.has(key)) byProvince.set(key, []);
    byProvince.get(key).push(c);
  }
  byProvince.forEach((v, k) => dataCache.cities.set(k, v));
  return dataCache.cities.get(provinceCode) ?? [];
}

async function loadBarangays(cityCode) {
  if (dataCache.barangays.has(cityCode)) return dataCache.barangays.get(cityCode);
  // barangay.json is ~6 MB — fetch only once, then split by city_code
  if (!dataCache._barangayRaw) {
    dataCache._barangayRaw = fetchJson(`${DATA_BASE}/barangay.json`);
  }
  const all = await dataCache._barangayRaw;
  const byCity = new Map();
  for (const b of all) {
    const key = b.city_code;
    if (!byCity.has(key)) byCity.set(key, []);
    byCity.get(key).push(b);
  }
  byCity.forEach((v, k) => dataCache.barangays.set(k, v));
  return dataCache.barangays.get(cityCode) ?? [];
}

// Build the canonical saved address string
function buildAddressString({ street, barangay, city, province, region }) {
  return [street, barangay, city, province, region, "Philippines"]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

// Shared select style
const SELECT_CLS =
  "w-full border border-[var(--color-line)] rounded-lg px-3 py-2.5 bg-[var(--color-panel)] " +
  "text-[var(--color-ink)] text-sm focus:border-[var(--color-circuit)] outline-none " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

function AddressSelect({ id, label, value, options, disabled, loading, onChange, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled || loading || options.length === 0}
        onChange={(e) => onChange(e.target.value)}
        className={SELECT_CLS}
        aria-busy={loading}
      >
        <option value="">
          {loading ? "Loading…" : placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function PhilippineAddressSelector({
  street = "",
  onAddressChange,
  disabled = false,
}) {
  const [regions,   setRegions]   = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities,    setCities]    = useState([]);
  const [barangays, setBarangays] = useState([]);

  const [selRegion,   setSelRegion]   = useState("");
  const [selProvince, setSelProvince] = useState("");
  const [selCity,     setSelCity]     = useState("");
  const [selBarangay, setSelBarangay] = useState("");

  const [loadingRegions,   setLoadingRegions]   = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities,    setLoadingCities]    = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  const [error, setError] = useState("");

  // Labels for the address string (human names, not codes)
  const [labelRegion,   setLabelRegion]   = useState("");
  const [labelProvince, setLabelProvince] = useState("");
  const [labelCity,     setLabelCity]     = useState("");
  const [labelBarangay, setLabelBarangay] = useState("");

  // Notify parent with the full formatted address string and breakdown details
  const notifyParent = useCallback(
    (overrides = {}) => {
      const reg = overrides.region !== undefined ? overrides.region : labelRegion;
      const prov = overrides.province !== undefined ? overrides.province : labelProvince;
      const cit = overrides.city !== undefined ? overrides.city : labelCity;
      const brgy = overrides.barangay !== undefined ? overrides.barangay : labelBarangay;

      // Only notify parent when at least one location level or street has been specified
      if (!reg && !prov && !cit && !brgy && !street) {
        return;
      }

      const parts = {
        street,
        barangay: brgy,
        city:     cit,
        province: prov,
        region:   reg,
      };
      const addr = buildAddressString(parts);
      onAddressChange?.(addr, parts);
    },
    [street, labelBarangay, labelCity, labelProvince, labelRegion, onAddressChange]
  );

  // Load regions on mount
  useEffect(() => {
    setLoadingRegions(true);
    setError("");
    loadRegions()
      .then((data) =>
        setRegions(data.map((r) => ({ code: r.region_code, name: r.region_name })))
      )
      .catch(() => setError("Couldn't load regions. Check your connection."))
      .finally(() => setLoadingRegions(false));
  }, []);

  // Load provinces when region changes
  useEffect(() => {
    if (!selRegion) { setProvinces([]); return; }
    setLoadingProvinces(true);
    setProvinces([]);
    setSelProvince(""); setLabelProvince("");
    setCities([]); setSelCity(""); setLabelCity("");
    setBarangays([]); setSelBarangay(""); setLabelBarangay("");
    loadProvinces(selRegion)
      .then((data) =>
        setProvinces(data.map((p) => ({ code: p.province_code, name: p.province_name })))
      )
      .catch(() => setError("Couldn't load provinces."))
      .finally(() => setLoadingProvinces(false));
  }, [selRegion]);

  // Load cities when province changes
  useEffect(() => {
    if (!selProvince) { setCities([]); return; }
    setLoadingCities(true);
    setCities([]);
    setSelCity(""); setLabelCity("");
    setBarangays([]); setSelBarangay(""); setLabelBarangay("");
    loadCities(selProvince)
      .then((data) =>
        setCities(data.map((c) => ({ code: c.city_code, name: c.city_name })))
      )
      .catch(() => setError("Couldn't load cities."))
      .finally(() => setLoadingCities(false));
  }, [selProvince]);

  // Load barangays when city changes
  useEffect(() => {
    if (!selCity) { setBarangays([]); return; }
    setLoadingBarangays(true);
    setBarangays([]);
    setSelBarangay(""); setLabelBarangay("");
    loadBarangays(selCity)
      .then((data) =>
        setBarangays(data.map((b) => ({ code: b.brgy_code, name: b.brgy_name })))
      )
      .catch(() => setError("Couldn't load barangays."))
      .finally(() => setLoadingBarangays(false));
  }, [selCity]);

  // Notify parent whenever the address label changes (any level)
  useEffect(() => {
    notifyParent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelRegion, labelProvince, labelCity, labelBarangay, street]);

  function handleRegionChange(code) {
    setSelRegion(code);
    const label = regions.find((r) => r.code === code)?.name ?? "";
    setLabelRegion(label);
    notifyParent({ region: label, province: "", city: "", barangay: "" });
  }

  function handleProvinceChange(code) {
    setSelProvince(code);
    const label = provinces.find((p) => p.code === code)?.name ?? "";
    setLabelProvince(label);
    notifyParent({ province: label, city: "", barangay: "" });
  }

  function handleCityChange(code) {
    setSelCity(code);
    const label = cities.find((c) => c.code === code)?.name ?? "";
    setLabelCity(label);
    notifyParent({ city: label, barangay: "" });
  }

  function handleBarangayChange(code) {
    setSelBarangay(code);
    const label = barangays.find((b) => b.code === code)?.name ?? "";
    setLabelBarangay(label);
    notifyParent({ barangay: label });
  }

  return (
    <div className="space-y-3">
      {/* Data attribution notice (GPL-3.0 source) */}
      <p className="text-[10px] text-[var(--color-ink-soft)]/60 leading-snug">
        Address data:{" "}
        <a
          href="https://github.com/FN-FAL113/Philippine-Address-Selector"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-[var(--color-circuit)]"
        >
          FN-FAL113/Philippine-Address-Selector
        </a>{" "}
        (GPL-3.0)
      </p>

      {error && (
        <p className="text-xs text-[var(--color-signal)]" role="alert">{error}</p>
      )}

      <AddressSelect
        id="ph-region"
        label="Region"
        value={selRegion}
        options={regions}
        disabled={disabled}
        loading={loadingRegions}
        onChange={handleRegionChange}
        placeholder="Select region"
      />

      <AddressSelect
        id="ph-province"
        label="Province / District"
        value={selProvince}
        options={provinces}
        disabled={disabled || !selRegion}
        loading={loadingProvinces}
        onChange={handleProvinceChange}
        placeholder={selRegion ? "Select province" : "Select a region first"}
      />

      <AddressSelect
        id="ph-city"
        label="City / Municipality"
        value={selCity}
        options={cities}
        disabled={disabled || !selProvince}
        loading={loadingCities}
        onChange={handleCityChange}
        placeholder={selProvince ? "Select city/municipality" : "Select a province first"}
      />

      <AddressSelect
        id="ph-barangay"
        label="Barangay"
        value={selBarangay}
        options={barangays}
        disabled={disabled || !selCity}
        loading={loadingBarangays}
        onChange={handleBarangayChange}
        placeholder={selCity ? "Select barangay" : "Select a city first"}
      />
    </div>
  );
}
