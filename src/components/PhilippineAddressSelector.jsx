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

import { useState, useEffect, useCallback, useRef } from "react";

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
  initialLocation = null,
  onAddressChange,
  disabled = false,
  showCity = true,
  showBarangay = true,
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
  const suppressCascadeRef = useRef({ region: false, province: false, city: false });

  // Restore a saved account location by its persisted labels. The profile predates
  // PSGC code fields, so resolve labels against the canonical selector data.
  useEffect(() => {
    if (!initialLocation?.region || !initialLocation?.province || !initialLocation?.city) return;
    let cancelled = false;
    const sameLabel = (left, right) => String(left ?? "").trim().toLocaleLowerCase() === String(right ?? "").trim().toLocaleLowerCase();

    (async () => {
      setError("");
      setLoadingRegions(true);
      setLoadingProvinces(true);
      setLoadingCities(true);
      try {
        const [rawRegions, rawProvinces] = await Promise.all([loadRegions(), fetchJson(`${DATA_BASE}/province.json`)]);
        const regionOptions = rawRegions.map((r) => ({ code: r.region_code, name: r.region_name }));
        const region = regionOptions.find((r) => sameLabel(r.name, initialLocation.region));
        if (!region) throw new Error("Saved region was not found.");

        const provinceData = rawProvinces.filter((p) => p.region_code === region.code);
        const provinceByCode = new Map();
        provinceData.forEach((p) => {
          const option = { code: p.province_code, name: p.province_name };
          const existing = provinceByCode.get(option.code);
          if (!existing || option.name.length < existing.name.length ||
              (option.name.length === existing.name.length && option.name.localeCompare(existing.name) < 0)) {
            provinceByCode.set(option.code, option);
          }
        });
        const provinceOptions = Array.from(provinceByCode.values());
        const province = provinceOptions.find((p) => sameLabel(p.name, initialLocation.province));
        if (!province) throw new Error("Saved province was not found in its region.");

        const allCities = await fetchJson(`${DATA_BASE}/city.json`);
        const cityOptions = allCities
          .filter((c) => c.province_code === province.code)
          .map((c) => ({ code: c.city_code, name: c.city_name }));
        const city = cityOptions.find((c) => sameLabel(c.name, initialLocation.city));
        if (!city) throw new Error("Saved city/municipality was not found in its province.");

        let barangayOptions = [];
        let barangay = null;
        if (showBarangay && initialLocation.barangay) {
          const allBarangays = await fetchJson(`${DATA_BASE}/barangay.json`);
          barangayOptions = allBarangays
            .filter((b) => b.city_code === city.code)
            .map((b) => ({ code: b.brgy_code, name: b.brgy_name }));
          barangay = barangayOptions.find((b) => sameLabel(b.name, initialLocation.barangay)) ?? null;
        }

        if (cancelled) return;
        suppressCascadeRef.current = { region: true, province: true, city: true };
        setRegions(regionOptions);
        setProvinces(provinceOptions);
        setCities(cityOptions);
        setBarangays(barangayOptions);
        setSelRegion(region.code);
        setSelProvince(province.code);
        setSelCity(city.code);
        setSelBarangay(barangay?.code ?? "");
        setLabelRegion(region.name);
        setLabelProvince(province.name);
        setLabelCity(city.name);
        setLabelBarangay(barangay?.name ?? initialLocation.barangay ?? "");
      } catch {
        if (!cancelled) setError("Your saved delivery area could not be matched. Please select your province and city again.");
      } finally {
        if (!cancelled) {
          setLoadingRegions(false);
          setLoadingProvinces(false);
          setLoadingCities(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [initialLocation?.region, initialLocation?.province, initialLocation?.city, initialLocation?.barangay, showBarangay]);

  // Notify parent with the full formatted address string and breakdown details
  const notifyParent = useCallback(
    (overrides = {}) => {
      const reg = overrides.region !== undefined ? overrides.region : labelRegion;
      const prov = overrides.province !== undefined ? overrides.province : labelProvince;
      const cit = overrides.city !== undefined ? overrides.city : labelCity;
      const brgy = overrides.barangay !== undefined ? overrides.barangay : labelBarangay;
      const codes = {
        regionCode: overrides.regionCode !== undefined ? overrides.regionCode : selRegion,
        provinceCode: overrides.provinceCode !== undefined ? overrides.provinceCode : selProvince,
        cityCode: overrides.cityCode !== undefined ? overrides.cityCode : selCity,
        barangayCode: overrides.barangayCode !== undefined ? overrides.barangayCode : selBarangay,
      };

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
      onAddressChange?.(addr, parts, codes);
    },
    [street, labelBarangay, labelCity, labelProvince, labelRegion, selBarangay, selCity, selProvince, selRegion, onAddressChange]
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
    if (suppressCascadeRef.current.region) { suppressCascadeRef.current.region = false; return; }
    setLoadingProvinces(true);
    setProvinces([]);
    setSelProvince(""); setLabelProvince("");
    setCities([]); setSelCity(""); setLabelCity("");
    setBarangays([]); setSelBarangay(""); setLabelBarangay("");
    loadProvinces(selRegion)
      .then((data) => {
        const optionsByCode = new Map();
        data.forEach((province) => {
          const option = { code: province.province_code, name: province.province_name };
          const existing = optionsByCode.get(option.code);
          if (!existing || option.name.length < existing.name.length ||
              (option.name.length === existing.name.length && option.name.localeCompare(existing.name) < 0)) {
            optionsByCode.set(option.code, option);
          }
        });
        setProvinces(Array.from(optionsByCode.values()));
      })
      .catch(() => setError("Couldn't load provinces."))
      .finally(() => setLoadingProvinces(false));
  }, [selRegion]);

  // Load cities when province changes
  useEffect(() => {
    if (!selProvince || !showCity) { setCities([]); return; }
    if (suppressCascadeRef.current.province) { suppressCascadeRef.current.province = false; return; }
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
  }, [selProvince, showCity]);

  // Load barangays when city changes
  useEffect(() => {
    if (!selCity || !showBarangay) { setBarangays([]); return; }
    if (suppressCascadeRef.current.city) { suppressCascadeRef.current.city = false; return; }
    setLoadingBarangays(true);
    setBarangays([]);
    setSelBarangay(""); setLabelBarangay("");
    loadBarangays(selCity)
      .then((data) =>
        setBarangays(data.map((b) => ({ code: b.brgy_code, name: b.brgy_name })))
      )
      .catch(() => setError("Couldn't load barangays."))
      .finally(() => setLoadingBarangays(false));
  }, [selCity, showBarangay]);

  // Notify parent whenever the address label changes (any level)
  useEffect(() => {
    notifyParent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelRegion, labelProvince, labelCity, labelBarangay, street]);

  function handleRegionChange(code) {
    setSelRegion(code);
    const label = regions.find((r) => r.code === code)?.name ?? "";
    setLabelRegion(label);
    notifyParent({ region: label, regionCode: code, province: "", provinceCode: "", city: "", cityCode: "", barangay: "", barangayCode: "" });
  }

  function handleProvinceChange(code) {
    setSelProvince(code);
    const label = provinces.find((p) => p.code === code)?.name ?? "";
    setLabelProvince(label);
    notifyParent({ province: label, provinceCode: code, city: "", cityCode: "", barangay: "", barangayCode: "" });
  }

  function handleCityChange(code) {
    setSelCity(code);
    const label = cities.find((c) => c.code === code)?.name ?? "";
    setLabelCity(label);
    notifyParent({ city: label, cityCode: code, barangay: "", barangayCode: "" });
  }

  function handleBarangayChange(code) {
    setSelBarangay(code);
    const label = barangays.find((b) => b.code === code)?.name ?? "";
    setLabelBarangay(label);
    notifyParent({ barangay: label, barangayCode: code });
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

      {showCity && (
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
      )}

      {showBarangay && (
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
      )}
    </div>
  );
}
