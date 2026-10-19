import { useCallback, useEffect, useState } from "react";
import { storePricingApi } from "../../api/client";
import ConfirmDialog from "../../components/ConfirmDialog";
import PhilippineAddressSelector from "../../components/PhilippineAddressSelector";
import { useToast } from "../../hooks/useToast";

const DEFAULT_SETTINGS = {
  delivery_fee_amount: "0",
  vat_enabled: false,
  vat_rate_percent: "12",
  vat_price_mode: "unconfirmed",
  vat_delivery_taxable: false,
};

function toFormSettings(data = {}) {
  if (
    data.delivery_fee_amount == null || typeof data.vat_enabled !== "boolean" ||
    data.vat_rate_percent == null || !["unconfirmed", "inclusive", "exclusive"].includes(data.vat_price_mode) ||
    typeof data.vat_delivery_taxable !== "boolean"
  ) {
    throw new Error("The pricing settings response is incomplete. Refresh before editing.");
  }
  return {
    delivery_fee_amount: String(data.delivery_fee_amount ?? 0),
    vat_enabled: data.vat_enabled === true,
    vat_rate_percent: String(data.vat_rate_percent ?? 12),
    vat_price_mode: ["unconfirmed", "inclusive", "exclusive"].includes(data.vat_price_mode)
      ? data.vat_price_mode
      : "unconfirmed",
    vat_delivery_taxable: data.vat_delivery_taxable === true,
  };
}

export default function StorePricingAdmin() {
  const toast = useToast();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deliveryRules, setDeliveryRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesError, setRulesError] = useState("");
  const [ruleScope, setRuleScope] = useState("province");
  const [ruleArea, setRuleArea] = useState({ provinceCode: "", cityCode: "" });
  const [areaSelectorKey, setAreaSelectorKey] = useState(0);
  const [ruleFee, setRuleFee] = useState("0");
  const [ruleSaving, setRuleSaving] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [editingFee, setEditingFee] = useState("");
  const [ruleBeingDeleted, setRuleBeingDeleted] = useState(null);
  const [ruleDeleting, setRuleDeleting] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await storePricingApi.get();
      setSettings(toFormSettings(response.data));
      setLoaded(true);
    } catch (requestError) {
      setLoaded(false);
      setError(requestError.response?.data?.message || "Couldn't load current pricing settings. Retry before making changes.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDeliveryRules = useCallback(async () => {
    setRulesLoading(true);
    setRulesError("");
    try {
      const response = await storePricingApi.listDeliveryFees();
      const payload = response.data;
      const rules = Array.isArray(payload)
        ? payload
        : payload?.rules ?? payload?.delivery_fee_rules ?? payload?.delivery_fees ?? payload?.items;
      if (!Array.isArray(rules)) throw new Error("Unexpected delivery rule response.");
      setDeliveryRules(rules);
    } catch (requestError) {
      setRulesError(requestError.response?.data?.message || requestError.message || "Couldn't load area delivery rules.");
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadDeliveryRules();
  }, [loadDeliveryRules]);

  function update(field, value) {
    setSettings((previous) => ({ ...previous, [field]: value }));
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!loaded || saving) return;

    const deliveryFee = Number(settings.delivery_fee_amount);
    const vatRate = Number(settings.vat_rate_percent);
    if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
      setError("Delivery fee must be a nonnegative amount.");
      return;
    }
    if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) {
      setError("VAT rate must be between 0 and 100 percent.");
      return;
    }
    if (settings.vat_enabled && !["inclusive", "exclusive"].includes(settings.vat_price_mode)) {
      setError("Choose whether listed prices include VAT or VAT is added before enabling VAT.");
      return;
    }

    const payload = {
      delivery_fee_amount: deliveryFee,
      vat_enabled: settings.vat_enabled,
      vat_rate_percent: vatRate,
      vat_price_mode: settings.vat_price_mode,
      vat_delivery_taxable: settings.vat_delivery_taxable,
    };

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await storePricingApi.update(payload);
      const savedSettings = response.data?.delivery_fee_amount != null ? response.data : payload;
      setSettings(toFormSettings(savedSettings));
      setLoaded(true);
      setSuccess("Store pricing settings saved.");
      toast.show("Store pricing settings saved.", { tone: "success" });
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Couldn't save pricing settings.";
      setError(message);
      toast.show(message, { tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateRule(event) {
    event.preventDefault();
    const deliveryFee = Number(ruleFee);
    if (!ruleArea.provinceCode || (ruleScope === "city" && !ruleArea.cityCode)) {
      setRulesError(ruleScope === "city" ? "Select a province and city/municipality." : "Select a province for this rule.");
      return;
    }
    if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
      setRulesError("Area delivery fee must be a nonnegative amount.");
      return;
    }

    setRuleSaving(true);
    setRulesError("");
    try {
      await storePricingApi.createDeliveryFee({
        province_code: ruleArea.provinceCode,
        city_code: ruleScope === "city" ? ruleArea.cityCode : null,
        delivery_fee_amount: deliveryFee,
      });
      toast.show("Area delivery rule created.", { tone: "success" });
      setRuleFee("0");
      setRuleArea({ provinceCode: "", cityCode: "" });
      setAreaSelectorKey((key) => key + 1);
      await loadDeliveryRules();
    } catch (requestError) {
      const message = requestError.response?.data?.message || requestError.message || "Couldn't create the area delivery rule.";
      setRulesError(message);
      toast.show(message, { tone: "error" });
    } finally {
      setRuleSaving(false);
    }
  }

  function ruleId(rule) {
    return rule.rule_id ?? rule.delivery_fee_rule_id ?? rule.ruleId ?? rule.id ?? rule.ID ?? rule.Rule_ID;
  }

  async function saveRuleEdit(event) {
    event.preventDefault();
    const deliveryFee = Number(editingFee);
    if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
      setRulesError("Area delivery fee must be a nonnegative amount.");
      return;
    }
    setRuleSaving(true);
    setRulesError("");
    try {
      await storePricingApi.updateDeliveryFee(editingRuleId, { delivery_fee_amount: deliveryFee });
      setEditingRuleId(null);
      setEditingFee("");
      toast.show("Area delivery rule updated.", { tone: "success" });
      await loadDeliveryRules();
    } catch (requestError) {
      const message = requestError.response?.data?.message || requestError.message || "Couldn't update the area delivery rule.";
      setRulesError(message);
      toast.show(message, { tone: "error" });
    } finally {
      setRuleSaving(false);
    }
  }

  async function confirmDeleteRule() {
    if (!ruleBeingDeleted) return;
    setRuleDeleting(true);
    try {
      await storePricingApi.deleteDeliveryFee(ruleId(ruleBeingDeleted));
      toast.show("Area delivery rule deleted.", { tone: "success" });
      setRuleBeingDeleted(null);
      await loadDeliveryRules();
    } catch (requestError) {
      const message = requestError.response?.data?.message || requestError.message || "Couldn't delete the area delivery rule.";
      setRulesError(message);
      toast.show(message, { tone: "error" });
    } finally {
      setRuleDeleting(false);
    }
  }

  return (
    <section className="store-pricing-admin admin-glass-panel rounded-xl p-4 sm:p-6" aria-labelledby="store-pricing-title">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <p className="text-[10px] font-[var(--font-mono)] uppercase tracking-wider text-[var(--color-circuit)]">Store configuration</p>
          <h1 id="store-pricing-title" className="text-lg sm:text-xl font-bold text-white mt-1">Delivery and VAT pricing</h1>
          <p className="text-xs text-[var(--color-dark-ink)]/60 mt-1">Customer checkout uses these settings as its estimate; the server calculates the final order total.</p>
        </div>
        <button type="button" onClick={loadSettings} disabled={loading || saving} className="admin-btn-secondary text-xs py-1.5 px-3 self-start disabled:opacity-50">
          {loading ? "Loading…" : "Refresh settings"}
        </button>
      </div>

      <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 sm:p-4 mb-5 text-xs leading-relaxed text-[var(--color-dark-ink)]" role="note">
        <p className="font-semibold text-amber-300 mb-1">Caution: leave VAT disabled until confirmed.</p>
        <p>VAT remains disabled until the business&apos; registration and VAT obligation, which products are taxable, and whether listed prices already include VAT have been confirmed with the BIR or an accountant. Do not enable VAT based on an assumption.</p>
        <p className="mt-2">This site does not create official BIR tax invoices.</p>
      </div>

      {loading && <p className="text-xs text-[var(--color-dark-ink)]/60 mb-4" role="status">Loading current pricing settings…</p>}
      {error && <p className="text-xs text-[var(--color-signal)] mb-4" role="alert">{error}</p>}
      {success && <p className="text-xs text-[#34D399] mb-4" role="status">{success}</p>}

      <form onSubmit={handleSubmit} className="space-y-5" aria-busy={loading || saving}>
        <fieldset disabled={!loaded || loading || saving} className="space-y-5 disabled:opacity-60">
          <div className="rounded-lg border border-[var(--color-dark-line)] bg-[var(--color-dark-bg)]/50 p-3 sm:p-4">
            <label htmlFor="delivery-fee" className="block text-xs font-medium text-[var(--color-dark-ink)]/80 mb-1">Default delivery fee — fallback for areas with no specific fee (₱)</label>
            <input id="delivery-fee" type="number" min="0" step="0.01" required value={settings.delivery_fee_amount} onChange={(event) => update("delivery_fee_amount", event.target.value)} className="w-full sm:max-w-xs admin-input-premium border border-[var(--color-dark-line)] rounded px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-circuit)]" />
            <p className="text-[11px] text-[var(--color-dark-ink)]/50 mt-1">Used when no city-specific or province-wide delivery rule matches. Starts at ₱0; set it only when your default delivery charge is confirmed.</p>
          </div>

          <div className="rounded-lg border border-[var(--color-dark-line)] bg-[var(--color-dark-bg)]/50 p-3 sm:p-4 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={settings.vat_enabled} onChange={(event) => {
                if (event.target.checked && settings.vat_price_mode === "unconfirmed") {
                  setError("Select inclusive or exclusive price mode before enabling VAT.");
                  return;
                }
                update("vat_enabled", event.target.checked);
              }} className="mt-0.5 accent-[var(--color-circuit)]" />
              <span><span className="block text-sm font-semibold text-white">Enable VAT</span><span className="block text-[11px] text-[var(--color-dark-ink)]/55 mt-0.5">Off by default. Confirm the business&apos; VAT obligation before turning this on.</span></span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="vat-rate" className="block text-xs font-medium text-[var(--color-dark-ink)]/75 mb-1">VAT rate (%)</label>
                <input id="vat-rate" type="number" min="0" max="100" step="0.01" required value={settings.vat_rate_percent} onChange={(event) => update("vat_rate_percent", event.target.value)} className="w-full admin-input-premium border border-[var(--color-dark-line)] rounded px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-circuit)]" />
                <p className="text-[11px] text-[var(--color-dark-ink)]/50 mt-1">Preset: 12%; permitted range is 0–100%.</p>
              </div>
              <div>
                <label htmlFor="vat-price-mode" className="block text-xs font-medium text-[var(--color-dark-ink)]/75 mb-1">Listed-price convention {settings.vat_enabled && <span className="text-[var(--color-signal)]">*</span>}</label>
                <select id="vat-price-mode" required={settings.vat_enabled} value={settings.vat_price_mode} onChange={(event) => update("vat_price_mode", event.target.value)} className="w-full admin-input-premium border border-[var(--color-dark-line)] rounded px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-circuit)]">
                  <option value="unconfirmed" className="bg-[var(--color-dark-panel)]">Not confirmed</option>
                  <option value="inclusive" className="bg-[var(--color-dark-panel)]">Listed prices include VAT</option>
                  <option value="exclusive" className="bg-[var(--color-dark-panel)]">VAT is added to listed prices</option>
                </select>
                <p className="text-[11px] text-[var(--color-dark-ink)]/50 mt-1">Choose a confirmed convention before enabling VAT.</p>
              </div>
            </div>

            <label className={`flex items-start gap-3 ${settings.vat_enabled ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
              <input type="checkbox" checked={settings.vat_delivery_taxable} disabled={!settings.vat_enabled} onChange={(event) => update("vat_delivery_taxable", event.target.checked)} className="mt-0.5 accent-[var(--color-circuit)]" />
              <span><span className="block text-xs font-medium text-white">Treat delivery fee as VAT-taxable</span><span className="block text-[11px] text-[var(--color-dark-ink)]/50 mt-0.5">Enable only after delivery tax treatment is confirmed.</span></span>
            </label>
          </div>
        </fieldset>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 pt-1">
          <button type="submit" disabled={!loaded || loading || saving} className="admin-btn-primary text-sm py-2 px-4 rounded-lg disabled:opacity-50">
            {saving ? "Saving…" : "Save pricing settings"}
          </button>
          <p className="text-[11px] text-[var(--color-dark-ink)]/50">Amounts are in Philippine pesos (PHP).</p>
        </div>
      </form>

      <section className="mt-8 border-t border-[var(--color-dark-line)] pt-6" aria-labelledby="area-delivery-title">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <h2 id="area-delivery-title" className="text-base font-bold text-white">Area delivery fee rules</h2>
            <p className="text-xs text-[var(--color-dark-ink)]/60 mt-1">A city rule overrides its province rule. If neither exists, checkout uses the default fallback above.</p>
          </div>
          <button type="button" onClick={loadDeliveryRules} disabled={rulesLoading} className="admin-btn-secondary text-xs py-1.5 px-3 self-start disabled:opacity-50">
            {rulesLoading ? "Loading…" : "Refresh area rules"}
          </button>
        </div>

        {rulesError && <p className="text-xs text-[var(--color-signal)] mb-3" role="alert">{rulesError}</p>}
        <form onSubmit={handleCreateRule} className="rounded-lg border border-[var(--color-dark-line)] bg-[var(--color-dark-bg)]/50 p-3 sm:p-4 space-y-4">
          <fieldset disabled={ruleSaving || loading} className="space-y-4 disabled:opacity-60">
            <legend className="text-sm font-semibold text-white">Add a delivery fee rule</legend>
            <div className="flex flex-wrap gap-4 text-xs text-[var(--color-dark-ink)]/80">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="radio" name="delivery-rule-scope" value="province" checked={ruleScope === "province"} onChange={() => {
                  setRuleScope("province");
                  setRuleArea({ provinceCode: "", cityCode: "" });
                  setAreaSelectorKey((key) => key + 1);
                }} className="accent-[var(--color-circuit)]" />
                Province-wide
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="radio" name="delivery-rule-scope" value="city" checked={ruleScope === "city"} onChange={() => {
                  setRuleScope("city");
                  setRuleArea({ provinceCode: "", cityCode: "" });
                  setAreaSelectorKey((key) => key + 1);
                }} className="accent-[var(--color-circuit)]" />
                City / municipality
              </label>
            </div>
            <p className="text-[11px] text-[var(--color-dark-ink)]/55">{ruleScope === "province" ? "Choose the province; this rule applies across all its cities unless a city rule overrides it." : "Choose both a province and the city/municipality within it."}</p>
            <PhilippineAddressSelector
              key={`${ruleScope}-${areaSelectorKey}`}
              street=""
              showCity={ruleScope === "city"}
              showBarangay={false}
              onAddressChange={(_formatted, _parts, codes) => setRuleArea({
                provinceCode: codes?.provinceCode || "",
                cityCode: codes?.cityCode || "",
              })}
              disabled={ruleSaving}
            />
            <div>
              <label htmlFor="area-delivery-fee" className="block text-xs font-medium text-[var(--color-dark-ink)]/80 mb-1">Delivery fee (₱)</label>
              <input id="area-delivery-fee" type="number" min="0" step="0.01" required value={ruleFee} onChange={(event) => setRuleFee(event.target.value)} className="w-full sm:max-w-xs admin-input-premium border border-[var(--color-dark-line)] rounded px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-circuit)]" />
            </div>
            <button type="submit" disabled={ruleSaving || !ruleArea.provinceCode || (ruleScope === "city" && !ruleArea.cityCode)} className="admin-btn-primary text-sm py-2 px-4 rounded-lg disabled:opacity-50">
              {ruleSaving ? "Saving…" : "Add area rule"}
            </button>
          </fieldset>
        </form>

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-white mb-2">Existing rules</h3>
          {rulesLoading && <p className="text-xs text-[var(--color-dark-ink)]/60" role="status">Loading area delivery rules…</p>}
          {!rulesLoading && deliveryRules.length === 0 && !rulesError && <p className="text-xs text-[var(--color-dark-ink)]/60">No area-specific fees yet. All areas use the default fallback.</p>}
          {deliveryRules.length > 0 && (
            <ul className="space-y-2">
              {deliveryRules.map((rule, index) => {
                const id = ruleId(rule);
                const cityCode = rule.city_code ?? rule.City_Code;
                const provinceName = rule.province_name ?? rule.Province_Name ?? rule.province_code ?? rule.Province_Code ?? "Unknown province";
                const cityName = rule.city_name ?? rule.City_Name ?? cityCode;
                const amount = rule.delivery_fee_amount ?? rule.Delivery_Fee_Amount;
                return (
                  <li key={id ?? `${rule.province_code}-${cityCode}-${index}`} className="rounded-lg border border-[var(--color-dark-line)] bg-[var(--color-dark-bg)]/40 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{cityCode ? `${cityName}, ${provinceName}` : provinceName}</p>
                      <p className="text-[11px] text-[var(--color-dark-ink)]/55 mt-0.5">{cityCode ? "City-specific · overrides province-wide fee" : "Province-wide"}</p>
                    </div>
                    {editingRuleId === id ? (
                      <form onSubmit={saveRuleEdit} className="flex items-center gap-2">
                        <label className="sr-only" htmlFor={`edit-delivery-fee-${id}`}>Updated delivery fee</label>
                        <input id={`edit-delivery-fee-${id}`} type="number" min="0" step="0.01" required value={editingFee} onChange={(event) => setEditingFee(event.target.value)} className="w-28 admin-input-premium border border-[var(--color-dark-line)] rounded px-2 py-1.5 text-sm text-white outline-none focus:border-[var(--color-circuit)]" />
                        <button type="submit" disabled={ruleSaving} className="admin-btn-primary text-xs py-1.5 px-2.5 rounded disabled:opacity-50">Save</button>
                        <button type="button" disabled={ruleSaving} onClick={() => setEditingRuleId(null)} className="admin-btn-secondary text-xs py-1.5 px-2.5 disabled:opacity-50">Cancel</button>
                      </form>
                    ) : (
                      <>
                        <strong className="font-[var(--font-mono)] text-sm text-white">₱{Number(amount ?? 0).toFixed(2)}</strong>
                        <div className="flex gap-2">
                          <button type="button" disabled={id == null || ruleSaving || ruleDeleting} onClick={() => {
                            setEditingRuleId(id);
                            setEditingFee(String(amount ?? 0));
                          }} className="admin-btn-secondary text-xs py-1.5 px-2.5 disabled:opacity-50">Edit</button>
                          <button type="button" disabled={id == null || ruleSaving || ruleDeleting} onClick={() => setRuleBeingDeleted(rule)} className="admin-btn-secondary text-xs py-1.5 px-2.5 text-[var(--color-signal)] disabled:opacity-50">Delete</button>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(ruleBeingDeleted)}
        title="Delete this delivery fee rule?"
        description="The area will use its next matching fee rule, or the default fallback, after deletion."
        warning={ruleBeingDeleted ? `${ruleBeingDeleted.city_name ?? ruleBeingDeleted.province_name ?? "This area rule"} will be removed.` : ""}
        confirmLabel="Delete rule"
        tone="danger"
        busy={ruleDeleting}
        onConfirm={confirmDeleteRule}
        onCancel={() => setRuleBeingDeleted(null)}
      />
    </section>
  );
}
