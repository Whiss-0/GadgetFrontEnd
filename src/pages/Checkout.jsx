import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { authApi, ordersApi, cartApi, storePricingApi } from "../api/client";
import PhilippineAddressSelector from "../components/PhilippineAddressSelector";
import { formatPrice } from "../utils/format";

const PAYMENT_METHODS = [
  { id: "COD", label: "Cash on delivery" },
  { id: "Card", label: "Card (Visa / Mastercard)" },
  { id: "GCash", label: "GCash" },
];

function normalizePricingSettings(data) {
  const fee = Number(data?.delivery_fee_amount);
  const rate = Number(data?.vat_rate_percent);
  const mode = data?.vat_price_mode;
  if (
    !data || data.delivery_fee_amount == null || !Number.isFinite(fee) || fee < 0 ||
    typeof data.vat_enabled !== "boolean" || !Number.isFinite(rate) || rate < 0 || rate > 100 ||
    !["unconfirmed", "inclusive", "exclusive"].includes(mode) ||
    typeof data.vat_delivery_taxable !== "boolean"
  ) {
    throw new Error("The store pricing settings could not be verified.");
  }
  if (data.vat_enabled && !["inclusive", "exclusive"].includes(mode)) {
    throw new Error("VAT pricing mode has not been confirmed. Please contact the store.");
  }
  return {
    delivery_fee_amount: fee,
    vat_enabled: data.vat_enabled,
    vat_rate_percent: rate,
    vat_price_mode: mode,
    vat_delivery_taxable: data.vat_delivery_taxable,
  };
}

function normalizeDeliveryQuote(data, provinceCode, cityCode) {
  const fee = Number(data?.delivery_fee_amount);
  if (
    !data || String(data.province_code) !== String(provinceCode) ||
    String(data.city_code) !== String(cityCode) ||
    typeof data.province_name !== "string" || !data.province_name.trim() ||
    typeof data.city_name !== "string" || !data.city_name.trim() ||
    !Number.isFinite(fee) || fee < 0 ||
    !["city", "province", "default"].includes(data.fee_scope)
  ) {
    throw new Error("The delivery fee quote could not be verified for this area.");
  }
  return { ...data, delivery_fee_amount: fee };
}

function getSavedAddressParts(profile) {
  const parts = String(profile?.address ?? "").split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.at(-1)?.toLocaleLowerCase() === "philippines") parts.pop();
  const fallback = parts.length >= 4 ? {
    region: parts.at(-1),
    province: parts.at(-2),
    city: parts.at(-3),
    barangay: parts.at(-4),
  } : {};
  return {
    region: profile?.region || fallback.region || "",
    province: profile?.province || fallback.province || "",
    city: profile?.city_Municipality || profile?.cityMunicipality || fallback.city || "",
    barangay: profile?.barangay || fallback.barangay || "",
  };
}

function getSavedStreetAddress(address, location) {
  const parts = String(address ?? "").split(",").map((part) => part.trim()).filter(Boolean);
  const suffixes = ["Philippines", location?.region, location?.province, location?.city, location?.barangay]
    .filter(Boolean)
    .map((part) => part.toLocaleLowerCase());
  while (parts.length && suffixes.includes(parts.at(-1).toLocaleLowerCase())) parts.pop();
  return parts.join(", ");
}

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { items: cartItems, refresh } = useCart();

  // Buy Now passes its own single-item list via router state;
  // otherwise checkout uses whatever's currently in the cart.
  const buyNow = location.state?.buyNow;
  const items = buyNow ? location.state.items : cartItems;

  const [address, setAddress] = useState("");
  const [initialLocation, setInitialLocation] = useState(null);
  const [addressParts, setAddressParts] = useState({});
  const [hasSavedAccountAddress, setHasSavedAccountAddress] = useState(false);
  const [saveAddressToAccount, setSaveAddressToAccount] = useState(false);
  const [profileAddressState, setProfileAddressState] = useState("loading");
  const [areaCodes, setAreaCodes] = useState({ provinceCode: "", cityCode: "" });
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState("COD");
  const [step, setStep] = useState("form"); // form | processing | done
  const [error, setError] = useState("");
  const [cleanupWarning, setCleanupWarning] = useState("");
  const [pricingSettings, setPricingSettings] = useState(null);
  const [pricingState, setPricingState] = useState("loading");
  const [pricingError, setPricingError] = useState("");
  const [deliveryQuote, setDeliveryQuote] = useState(null);
  const [quoteState, setQuoteState] = useState("idle");
  const [quoteError, setQuoteError] = useState("");
  const [quoteRetry, setQuoteRetry] = useState(0);
  const [completedOrder, setCompletedOrder] = useState(null);
  const submittingRef = useRef(false);
  const dialogRef = useRef(null);
  const dialogTitleRef = useRef(null);

  const loadPricing = useCallback(async () => {
    setPricingState("loading");
    setPricingError("");
    try {
      const response = await storePricingApi.get();
      setPricingSettings(normalizePricingSettings(response.data));
      setPricingState("ready");
    } catch (requestError) {
      setPricingState("error");
      setPricingError(requestError.message || "Couldn't load current VAT pricing settings.");
    }
  }, []);

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  useEffect(() => {
    let current = true;
    authApi.me()
      .then(({ data }) => {
        if (!current) return;
        const savedParts = getSavedAddressParts(data);
        const hasLocation = Boolean(savedParts.region && savedParts.province && savedParts.city);
        setInitialLocation(hasLocation ? savedParts : null);
        setAddress(getSavedStreetAddress(data.address, savedParts));
        setHasSavedAccountAddress(Boolean(data.address || hasLocation));
      })
      .catch(() => {
        // Checkout remains available; the customer can enter the delivery address manually.
      })
      .finally(() => {
        if (current) setProfileAddressState("ready");
      });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    if (!areaCodes.provinceCode || !areaCodes.cityCode) {
      setDeliveryQuote(null);
      setQuoteState("idle");
      setQuoteError("");
      return () => { current = false; };
    }
    setQuoteState("loading");
    setDeliveryQuote(null);
    setQuoteError("");
    storePricingApi.quoteDeliveryFee(areaCodes.provinceCode, areaCodes.cityCode)
      .then((response) => {
        if (!current) return;
        setDeliveryQuote(normalizeDeliveryQuote(response.data, areaCodes.provinceCode, areaCodes.cityCode));
        setQuoteState("ready");
      })
      .catch((requestError) => {
        if (!current) return;
        setDeliveryQuote(null);
        setQuoteState("error");
        setQuoteError(requestError.response?.data?.message || requestError.message || "Couldn't verify the delivery fee for this area.");
      });
    return () => { current = false; };
  }, [areaCodes.provinceCode, areaCodes.cityCode, quoteRetry]);

  useEffect(() => {
    if (step === "done") dialogTitleRef.current?.focus();
  }, [step]);

  function containDialogFocus(event) {
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll("button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex='-1'])");
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!Array.from(focusable).includes(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
      return;
    }
    if (event.shiftKey && (document.activeElement === first || !Array.from(focusable).includes(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const subtotal = items.reduce((sum, i) => {
    const price = i.price ?? i.Price ?? 0;
    const quantity = i.quantity ?? i.Quantity ?? 1;
    return sum + price * quantity;
  }, 0);
  const quoteMatchesSelection = Boolean(
    deliveryQuote && String(deliveryQuote.province_code) === String(areaCodes.provinceCode) &&
    String(deliveryQuote.city_code) === String(areaCodes.cityCode)
  );
  const quoteVerified = quoteState === "ready" && quoteMatchesSelection;
  const deliveryFeeEstimate = quoteVerified ? deliveryQuote.delivery_fee_amount : 0;
  const vatEnabled = pricingState === "ready" && pricingSettings.vat_enabled;
  const vatRate = vatEnabled ? pricingSettings.vat_rate_percent : 0;
  const vatMode = vatEnabled ? pricingSettings.vat_price_mode : "unconfirmed";
  const taxableEstimate = subtotal + (vatEnabled && pricingSettings.vat_delivery_taxable ? deliveryFeeEstimate : 0);
  const vatEstimate = vatEnabled
    ? Math.round((vatMode === "inclusive"
      ? taxableEstimate * vatRate / (100 + vatRate)
      : taxableEstimate * vatRate / 100) * 100) / 100
    : 0;
  const estimatedTotal = subtotal + deliveryFeeEstimate + (vatEnabled && vatMode === "exclusive" ? vatEstimate : 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!address.trim()) {
      setError("Enter your street address.");
      return;
    }
    if (!areaCodes.provinceCode || !areaCodes.cityCode) {
      setError("Select a valid province and city/municipality for delivery.");
      return;
    }
    if (!quoteVerified) {
      setError("The delivery fee for your selected area is not verified. Retry the quote before placing your order.");
      return;
    }
    if (pricingState !== "ready") {
      setError("Current VAT pricing settings are unavailable. Retry loading them before placing your order.");
      return;
    }
    submittingRef.current = true;
    setError("");
    setCleanupWarning("");
    setStep("processing");

    const orderItemsSnapshot = [...items];

    try {
      if (method !== "COD") {
        // Simulated payment step — no real gateway, no real card data collected.
        await new Promise((r) => setTimeout(r, 1400));
      }

      // Atomic checkout: creates the order, validates stock, and inserts all
      // line items in a single database transaction. If any item fails (e.g.
      // out of stock), the entire order is rolled back.
      const shippingAddress = [
        address.trim(), addressParts.barangay, deliveryQuote.city_name,
        deliveryQuote.province_name, addressParts.region, "Philippines",
      ].filter(Boolean).join(", ");
      const checkoutResponse = await ordersApi.checkout({
        totalAmount: estimatedTotal,
        shippingAddress,
        provinceCode: areaCodes.provinceCode,
        cityCode: areaCodes.cityCode,
        phoneNumber: phone,
        paymentMethod: method,
        items: items.map((item) => ({
          productId: item.product_id ?? item.productId ?? item.ProductId,
          quantity: item.quantity ?? item.Quantity ?? 1,
          price: item.price ?? item.Price ?? 0,
        })),
      });

      // Save order snapshot before cart items are cleared from state
      setCompletedOrder({ items: orderItemsSnapshot, pricing: checkoutResponse.data ?? null });

      // The order is committed. Cleanup is best-effort and must not turn a
      // successful purchase into a failure that encourages a duplicate retry.
      setStep("done");
      const warnings = [];
      if (saveAddressToAccount) {
        try {
          await authApi.updateMe({
            Address: shippingAddress,
            Region: addressParts.region || "",
            Province: deliveryQuote.province_name,
            City_Municipality: deliveryQuote.city_name,
            Barangay: addressParts.barangay || "",
          });
        } catch {
          warnings.push("Your order was placed, but we couldn’t save this address to your account.");
        }
      }
      if (!buyNow) {
        try {
          await cartApi.clear();
          const refreshed = await refresh();
          if (!refreshed) warnings.push("Your order was placed, but we couldn’t refresh the cart. Please review it before your next checkout.");
        } catch {
          warnings.push("Your order was placed, but we couldn’t clear the cart. Please review it before your next checkout.");
        }
      }
      setCleanupWarning(warnings.join(" "));
    } catch (err) {
      setStep("form");
      setError(err.response?.data?.message || "Couldn't place the order.");
    } finally {
      submittingRef.current = false;
    }
  }

  if (items.length === 0 && step !== "done") {
    return (
      <div className="max-w-md mx-auto px-5 py-16 text-center">
        <p className="text-[var(--color-ink-soft)] mb-4">Nothing to check out. Add something from the catalog first.</p>
        <button
          onClick={() => navigate("/")}
          className="btn-secondary px-5 py-2.5 rounded text-sm font-semibold inline-flex items-center gap-2"
        >
          ← Browse Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-page max-w-xl mx-auto px-5 py-8 sm:py-12">
      <h1 className="font-[var(--font-display)] text-2xl sm:text-3xl font-semibold mb-2">Complete your order</h1>
      <p className="text-[var(--color-ink-soft)] text-sm mb-8">
        Review your delivery details and choose your preferred payment method.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Shipping details */}
        <div className="spec-ticket rounded-xl p-6 border border-[var(--color-line)] bg-[var(--color-panel)]">
          <h2 className="font-[var(--font-display)] text-base font-semibold mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[var(--color-circuit-soft)] text-[var(--color-circuit)] text-xs flex items-center justify-center font-bold">1</span>
            Shipping details
          </h2>
          <div className="space-y-4">
            <div>
              <p className="block text-xs font-medium text-[var(--color-ink-soft)] mb-2">Delivery area <span className="text-[var(--color-signal)]">*</span></p>
              <p className="text-xs text-[var(--color-ink-soft)] mb-3">
                {profileAddressState === "loading"
                  ? "Loading your saved account address…"
                  : hasSavedAccountAddress
                    ? "Your saved account address is prefilled. You can change the destination for this order."
                    : "Choose the province and city/municipality so we can verify the delivery fee. Street details are entered separately below."}
              </p>
              <PhilippineAddressSelector
                street=""
                initialLocation={initialLocation}
                showBarangay={false}
                onAddressChange={(_formatted, parts, codes) => {
                  setAddressParts(parts || {});
                  setAreaCodes({ provinceCode: codes?.provinceCode || "", cityCode: codes?.cityCode || "" });
                  setDeliveryQuote(null);
                  setQuoteState(codes?.provinceCode && codes?.cityCode ? "loading" : "idle");
                  setQuoteError("");
                  setError("");
                }}
                disabled={step === "processing"}
              />
              {!areaCodes.provinceCode && <p className="mt-2 text-xs text-[var(--color-ink-soft)]">Select a province and city/municipality to continue.</p>}
              {areaCodes.provinceCode && !areaCodes.cityCode && <p className="mt-2 text-xs text-[var(--color-ink-soft)]">Now select the city/municipality within this province.</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1" htmlFor="address">
                Street / house / unit address
              </label>
              <textarea
                id="address"
                required
                autoComplete="street-address"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={step === "processing"}
                placeholder="House or unit number, street, subdivision, building, or landmark"
                className="w-full border border-[var(--color-line)] rounded-lg p-3 bg-[var(--color-panel)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)] focus:border-[var(--color-circuit)] outline-none text-sm disabled:opacity-50"
              />
            </div>
            <label className="flex items-start gap-2.5 text-sm text-[var(--color-ink-soft)]">
              <input
                type="checkbox"
                checked={saveAddressToAccount}
                onChange={(event) => setSaveAddressToAccount(event.target.checked)}
                disabled={step === "processing"}
                className="mt-0.5 accent-[var(--color-circuit)]"
              />
              <span>Save this delivery address to my account for future orders</span>
            </label>
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink-soft)] mb-1" htmlFor="phone">
                Contact phone number
              </label>
              <input
                id="phone"
                type="tel"
                required
                autoComplete="tel"
                inputMode="tel"
                minLength={7}
                maxLength={24}
                pattern="[+0-9 ()-]{7,24}"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={step === "processing"}
                placeholder="+63 9XX XXX XXXX"
                className="w-full border border-[var(--color-line)] rounded-lg p-3 bg-[var(--color-panel)] text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)] focus:border-[var(--color-circuit)] outline-none text-sm disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Payment method */}
        <div className="spec-ticket rounded-xl p-6 border border-[var(--color-line)] bg-[var(--color-panel)]">
          <h2 className="font-[var(--font-display)] text-base font-semibold mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[var(--color-circuit-soft)] text-[var(--color-circuit)] text-xs flex items-center justify-center font-bold">2</span>
            Payment method
          </h2>
          <div className="space-y-2.5">
            {PAYMENT_METHODS.map((m) => (
              <label
                key={m.id}
                className={`flex items-center gap-3 border rounded-lg p-3.5 ${
                  step === "processing" ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                } transition-all ${
                  method === m.id
                    ? "border-[var(--color-circuit)] bg-[var(--color-circuit-soft)]/20"
                    : "border-[var(--color-line)] hover:border-[var(--color-circuit)]/50"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value={m.id}
                  checked={method === m.id}
                  onChange={() => setMethod(m.id)}
                  disabled={step === "processing"}
                  className="accent-[var(--color-circuit)]"
                />
                <span className="text-sm font-medium">{m.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-[var(--color-ink-soft)] mt-3">
            This demo uses simulated payment. No real payment is processed.
          </p>
        </div>

        {/* Section 3: Review your order */}
        <div className="spec-ticket rounded-xl p-6 border border-[var(--color-line)] bg-[var(--color-panel)]">
          <h2 className="font-[var(--font-display)] text-base font-semibold mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[var(--color-circuit-soft)] text-[var(--color-circuit)] text-xs flex items-center justify-center font-bold">3</span>
            Review your order
          </h2>
          {pricingState === "loading" && (
            <p className="text-xs text-[var(--color-ink-soft)] mb-3" role="status">Loading current VAT settings. Until they load, the VAT amount below is a zero placeholder, not a confirmed amount.</p>
          )}
          {pricingState === "error" && (
            <div className="rounded-lg border border-[var(--color-signal)]/30 bg-[var(--color-signal)]/5 p-3 mb-4" role="alert">
              <p className="text-xs text-[var(--color-signal)]">{pricingError} VAT cannot be confirmed. Retry before checkout.</p>
              <button type="button" onClick={loadPricing} className="mt-2 text-xs font-semibold text-[var(--color-circuit)] underline">Retry VAT settings</button>
            </div>
          )}
          {quoteState === "loading" && <p className="mb-3 text-xs text-[var(--color-ink-soft)]" role="status">Verifying delivery fee for the selected area…</p>}
          {quoteState === "error" && (
            <div className="rounded-lg border border-[var(--color-signal)]/30 bg-[var(--color-signal)]/5 p-3 mb-4" role="alert">
              <p className="text-xs text-[var(--color-signal)]">{quoteError || "The delivery fee could not be verified."}</p>
              <button type="button" onClick={() => setQuoteRetry((retry) => retry + 1)} className="mt-2 text-xs font-semibold text-[var(--color-circuit)] underline">Retry delivery quote</button>
            </div>
          )}
          {quoteVerified && (
            <div className="rounded-lg border border-[var(--color-circuit)]/30 bg-[var(--color-circuit-soft)]/10 p-3 mb-4" role="status">
              <p className="text-xs font-semibold text-[var(--color-ink)]">{deliveryQuote.city_name}, {deliveryQuote.province_name}</p>
              <p className="text-xs text-[var(--color-ink-soft)] mt-1">
                {deliveryQuote.fee_scope === "city" ? "City-specific fee" : deliveryQuote.fee_scope === "province" ? "Province-wide fee" : "Default fee (no specific area rule)"}
              </p>
            </div>
          )}
          <div className="space-y-2 pb-4 border-b border-[var(--color-line)]">
            {items.map((i, idx) => {
              const name = i.name ?? i.Name ?? `Product #${i.product_ID ?? i.product_id}`;
              const price = i.price ?? i.Price ?? 0;
              const quantity = i.quantity ?? i.Quantity ?? 1;
              return (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-[var(--color-ink)] truncate max-w-[70%]">{name} <span className="text-[var(--color-ink-soft)] text-xs">× {quantity}</span></span>
                  <span className="font-[var(--font-mono)]">{formatPrice(price * quantity)}</span>
                </div>
              );
            })}
          </div>
          <div className="space-y-2 mt-4 text-sm">
            <div className="flex justify-between gap-3"><span className="text-[var(--color-ink-soft)]">Products subtotal</span><span className="font-[var(--font-mono)]">{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between gap-3"><span className="text-[var(--color-ink-soft)]">Delivery fee{!quoteVerified ? " (unconfirmed)" : ""}</span><span className="font-[var(--font-mono)]">{formatPrice(deliveryFeeEstimate)}</span></div>
            {vatEnabled && (
              <div className="flex justify-between gap-3">
                <span className="text-[var(--color-ink-soft)]">{vatMode === "inclusive" ? `VAT included in listed prices (${vatRate}%)` : `VAT added to listed prices (${vatRate}%)`}</span>
                <span className="font-[var(--font-mono)]">{formatPrice(vatEstimate)}</span>
              </div>
            )}
            <div className="flex justify-between gap-3 border-t border-[var(--color-line)] pt-3 font-semibold text-base">
              <span>Estimated total</span>
              <span className="font-[var(--font-mono)] text-xl text-[var(--color-gold)]">{formatPrice(estimatedTotal)}</span>
            </div>
          </div>
          {pricingState === "ready" && quoteVerified && <p className="text-[11px] text-[var(--color-ink-soft)] mt-3">Estimate only. The server verifies product prices, the delivery fee, and VAT and returns the final order breakdown.</p>}
        </div>

        {error && <p className="text-sm text-[var(--color-signal)]" role="alert">{error}</p>}

        <button
          type="submit"
          disabled={step !== "form" || pricingState !== "ready" || !areaCodes.provinceCode || !areaCodes.cityCode || !quoteVerified}
          className="btn-primary w-full py-3.5 rounded-lg font-semibold text-base shadow-sm"
        >
          {step === "processing" ? (
            <span className="btn-loading-content flex items-center justify-center gap-2">
              <span className="spinner"></span>
              <span>Processing order…</span>
            </span>
          ) : pricingState === "loading" ? "Loading VAT settings…" : pricingState !== "ready" ? "Load VAT settings to continue" : !areaCodes.provinceCode || !areaCodes.cityCode ? "Select a delivery area to continue" : !quoteVerified ? "Verify delivery fee to continue" : "Place order"}
        </button>
      </form>

      {step === "done" && (() => {
        const displayItems = completedOrder?.items ?? items;
        const serverPricing = completedOrder?.pricing;
        const displayTotal = serverPricing?.total_amount;
        const serverSubtotal = serverPricing?.subtotal_amount;
        const serverDeliveryFee = serverPricing?.delivery_fee_amount;
        const serverVatAmount = serverPricing?.vat_amount;
        const serverVatRate = serverPricing?.vat_rate_percent;
        const serverVatMode = serverPricing?.vat_price_mode;
        const shouldShowServerVat = serverVatAmount != null && (
          Number(serverVatAmount) > 0 || (vatEnabled && ["inclusive", "exclusive"].includes(serverVatMode))
        );
        return (
          <div className="modal-backdrop">
            <div ref={dialogRef} onKeyDown={containDialogFocus} className="purchase-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-success-title">
              <div className="success-icon-badge">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>

              <h3 ref={dialogTitleRef} tabIndex={-1} className="modal-title" id="checkout-success-title">Order placed</h3>
              {cleanupWarning && <p className="text-sm text-[var(--color-signal)]" role="status">{cleanupWarning}</p>}
              <p className="modal-description">
                Thanks for your order.{" "}
                {displayItems.length === 1
                  ? <>{"We're getting"} <strong id="purchased-item-name">{displayItems[0].name ?? displayItems[0].Name ?? "your item"}</strong>{" ready for you."}</>
                  : "We're getting your items ready for you."}
              </p>

              <div className="summary-card">
                <div className="summary-row">
                  <span>Status</span>
                  <span className="status-badge">{serverPricing?.status || "Processing"}</span>
                </div>
                {serverSubtotal != null && <div className="summary-row"><span>Products subtotal</span><strong>{formatPrice(serverSubtotal)}</strong></div>}
                {serverDeliveryFee != null && <div className="summary-row"><span>Delivery fee</span><strong>{formatPrice(serverDeliveryFee)}</strong></div>}
                {shouldShowServerVat && <div className="summary-row"><span>{serverVatMode === "inclusive" ? `VAT included in listed prices${serverVatRate != null ? ` (${serverVatRate}%)` : ""}` : serverVatMode === "exclusive" ? `VAT added to listed prices${serverVatRate != null ? ` (${serverVatRate}%)` : ""}` : "VAT"}</span><strong>{formatPrice(serverVatAmount)}</strong></div>}
                <div className="summary-row"><span>Order total</span><strong className="summary-price">{displayTotal != null ? formatPrice(displayTotal) : "Unavailable"}</strong></div>
                {displayTotal == null && <p className="text-xs text-[var(--color-signal)]" role="status">The server confirmed the order, but its saved total was not included in the response. Check your order details for the recorded amount.</p>}
              </div>

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => navigate("/orders")}>View Orders</button>
                <button className="btn-primary" onClick={() => navigate("/")}>Continue Shopping</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
