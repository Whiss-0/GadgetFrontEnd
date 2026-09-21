import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { productsApi, ordersApi, usersApi } from "../../api/client";
import CustomerLocationMap from "../../components/CustomerLocationMap";

const tabs = [
  { to: "/admin", label: "Products", end: true },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/users", label: "Users" },
];

const PERIODS = [
  { id: "all", label: "All time" },
  { id: "year", label: "This year" },
  { id: "month", label: "This month" },
  { id: "week", label: "This week" },
];

// Returns { start, end } as Dates for a named period. end is always "now"
// for these — only a custom range has its own fixed end date.
function getPeriodRange(period) {
  const now = new Date();
  if (period === "year") {
    return { start: new Date(now.getFullYear(), 0, 1), end: now };
  }
  if (period === "month") {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  }
  if (period === "week") {
    const d = new Date(now);
    const mondayOffset = (d.getDay() + 6) % 7; // getDay(): Sun=0 → shift so Monday=0
    d.setDate(d.getDate() - mondayOffset);
    d.setHours(0, 0, 0, 0);
    return { start: d, end: now };
  }
  return { start: null, end: null }; // "all"
}

// Cancelled Card/GCash orders were marked paid by the payment simulation,
// so a cancellation should reverse that revenue. COD is unaffected.
function countsAsRevenue(order) {
  const status = order.status ?? order.Status;
  const method = order.payment_method ?? order.paymentMethod;
  return !(status === "Cancelled" && (method === "Card" || method === "GCash"));
}

function formatRangeLabel(start, end) {
  const opts = { month: "short", day: "numeric", year: "numeric" };
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

// Reduces an address to a broad locality (city/province) only.
// Strips leading numeric parts and removes pure-number segments so that
// house numbers, street numbers, and unit numbers are never shown.
function getBroadLocation(address) {
  if (!address || typeof address !== "string") return "";

  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^\d+[\w\s-]*$/.test(part));

  if (parts.length === 0) return "";

  return parts.length > 1
    ? parts[parts.length - 1]
    : parts[0].replace(/^\d+\s+/, "");
}

export default function AdminLayout() {
  const [productCount, setProductCount] = useState(0);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [period, setPeriod] = useState("all");
  const [customStart, setCustomStart] = useState(""); // "YYYY-MM-DD" from <input type="date">
  const [customEnd, setCustomEnd] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);

  useEffect(() => {
    // Products and orders are critical — load together.
    Promise.all([productsApi.list(), ordersApi.listAllAdmin()])
      .then(([prodRes, orderRes]) => {
        const products = prodRes.data || [];
        setProductCount(products.length);
        setLowStockItems(products.filter((p) => (p.stock ?? 0) <= 5));
        setOrders(orderRes.data || []);
      })
      .catch(() => {});

    // Users are loaded separately so a failure here never breaks the main dashboard.
    usersApi
      .list()
      .then((res) => setUsers(res.data || []))
      .catch(() => {});
  }, []);

  const hasCustomRange = Boolean(customStart || customEnd);

  let rangeStart = null;
  let rangeEnd = null;
  let periodLabel = "All time";

  if (hasCustomRange) {
    rangeStart = customStart ? new Date(`${customStart}T00:00:00`) : null;
    rangeEnd = customEnd ? new Date(`${customEnd}T23:59:59.999`) : new Date();
    periodLabel = rangeStart ? formatRangeLabel(rangeStart, rangeEnd) : `Through ${rangeEnd.toLocaleDateString()}`;
  } else {
    const range = getPeriodRange(period);
    rangeStart = range.start;
    rangeEnd = range.end;
    periodLabel = PERIODS.find((p) => p.id === period)?.label ?? "All time";
  }

  const ordersInPeriod = orders.filter((o) => {
    const raw = o.order_date ?? o.orderDate ?? o.OrderDate;
    if (!raw) return false;
    const date = new Date(raw);
    if (rangeStart && date < rangeStart) return false;
    if (rangeEnd && date > rangeEnd) return false;
    return true;
  });

  const revenue = ordersInPeriod
    .filter(countsAsRevenue)
    .reduce((sum, o) => sum + Number(o.total_amount ?? o.totalAmount ?? 0), 0);

  // --- Location aggregation (privacy-safe, broad areas only) ---
  const usersById = new Map(
    users.map((user) => [user.User_ID ?? user.user_ID ?? user.userId, user])
  );

  const locationBuckets = new Map();

  ordersInPeriod.forEach((order) => {
    const userId = order.user_id ?? order.userId ?? order.User_ID;
    const user = usersById.get(userId);
    const rawAddress =
      user?.Address ??
      user?.address ??
      order.shipping_address ??
      order.shippingAddress;
    const label = getBroadLocation(rawAddress);

    if (!label) return;

    const bucket = locationBuckets.get(label) || {
      label,
      orders: 0,
      customerIds: new Set(),
    };

    bucket.orders += 1;
    if (userId !== undefined && userId !== null) {
      bucket.customerIds.add(userId);
    }

    locationBuckets.set(label, bucket);
  });

  const customerLocations = Array.from(locationBuckets.values())
    .map(({ customerIds, ...location }) => ({
      ...location,
      customers: customerIds.size || location.orders,
    }))
    .sort((a, b) => b.orders - a.orders || a.label.localeCompare(b.label));

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[var(--color-dark-bg)] text-[var(--color-dark-ink)]">
      <div className="max-w-6xl mx-auto px-5 py-8">
        <h1 className="font-[var(--font-display)] text-2xl font-semibold mb-1">Store management</h1>
        <p className="text-sm text-[var(--color-dark-ink)]/50 mb-6">A clear view of the day</p>

        <div className="flex flex-wrap items-center gap-2 mb-2" role="group" aria-label="Revenue period">
          <span className="text-xs text-[var(--color-dark-ink)]/50 mr-1">Show</span>
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { setPeriod(p.id); setCustomStart(""); setCustomEnd(""); }}
              aria-pressed={!hasCustomRange && period === p.id}
              className={`text-xs font-semibold uppercase px-3 py-1.5 rounded-full border transition-colors ${
                !hasCustomRange && period === p.id
                  ? "bg-[var(--color-circuit)]/15 text-[var(--color-circuit)] border-[var(--color-circuit)]/40"
                  : "border-[var(--color-dark-line)] text-[var(--color-dark-ink)]/60 hover:text-[var(--color-dark-ink)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-[var(--color-dark-ink)]/50 mr-1">Custom dates</span>
          <div className="date-range-group">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              aria-label="Custom range start date"
            />
            <span className="date-range-separator">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              aria-label="Custom range end date"
            />
          </div>
          {hasCustomRange && (
            <button
              type="button"
              onClick={() => { setCustomStart(""); setCustomEnd(""); }}
              className="text-alert text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Dashboard summary stats widget */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-[var(--color-dark-panel)] border border-[var(--color-dark-line)] rounded p-4">
            <p className="text-xs text-[var(--color-dark-ink)]/50 mb-1">Products</p>
            <p className="text-2xl font-semibold">{productCount}</p>
          </div>

          <button
            onClick={() => setShowLowStock((v) => !v)}
            className="text-left bg-[var(--color-dark-panel)] border border-[var(--color-dark-line)] rounded p-4 hover:border-[var(--color-signal)]/50 transition-colors"
          >
            <p className="text-xs text-[var(--color-dark-ink)]/50 mb-1">
              {lowStockItems.length > 0 ? "Low stock — view list" : "Low stock"}
            </p>
            <p className={`text-2xl font-semibold ${lowStockItems.length > 0 ? "text-[var(--color-signal)]" : ""}`}>
              {lowStockItems.length}
            </p>
          </button>

          <div className="bg-[var(--color-dark-panel)] border border-[var(--color-dark-line)] rounded p-4">
            <p className="text-xs text-[var(--color-dark-ink)]/50 mb-1 truncate" title={periodLabel}>
              Orders · {periodLabel}
            </p>
            <p className="text-2xl font-semibold">{ordersInPeriod.length}</p>
          </div>

          <div className="bg-[var(--color-dark-panel)] border border-[var(--color-dark-line)] rounded p-4">
            <p className="text-xs text-[var(--color-dark-ink)]/50 mb-1 truncate" title={periodLabel}>
              Revenue · {periodLabel}
            </p>
            <p className="text-2xl font-semibold">${revenue.toFixed(2)}</p>
          </div>
        </div>

        {showLowStock && lowStockItems.length > 0 && (
          <div className="bg-[var(--color-dark-panel)] border border-[var(--color-signal)]/30 rounded p-4 mb-8 -mt-4">
            <p className="font-[var(--font-mono)] text-xs text-[var(--color-signal)] uppercase mb-3">Products running low</p>
            <div className="space-y-2">
              {lowStockItems.map((p) => (
                <div key={p.product_id} className="flex items-center justify-between text-sm">
                  <span>{p.product_name}</span>
                  <span className={`font-[var(--font-mono)] ${p.stock === 0 ? "text-[var(--color-signal)] font-semibold" : "text-[var(--color-dark-ink)]/70"}`}>
                    {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer location insights */}
        <div className="mb-8">
          <CustomerLocationMap
            locations={customerLocations}
            totalOrders={ordersInPeriod.length}
          />
        </div>

        <div className="flex gap-2 border-b border-[var(--color-dark-line)] mb-8">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `px-5 py-2 text-sm font-medium rounded-full transition-all duration-200 border ${
                  isActive
                    ? "bg-[var(--color-circuit)]/15 text-[var(--color-circuit)] border-[var(--color-circuit)]/30"
                    : "text-[var(--color-dark-ink)]/60 hover:text-[var(--color-dark-ink)] hover:bg-[var(--color-dark-line)]/50 border-transparent"
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>

        <Outlet />
      </div>
    </div>
  );
}
