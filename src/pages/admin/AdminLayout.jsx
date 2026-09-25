import { useEffect, useState, useCallback } from "react";
import { NavLink, Link, Outlet } from "react-router-dom";
import { productsApi, ordersApi, usersApi } from "../../api/client";
import CustomerLocationMap from "../../components/CustomerLocationMap";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../hooks/useToast";

const tabs = [
  { to: "/admin", label: "Products", end: true },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/users", label: "Users" },
  { to: "/activity", label: "Activity" },
];

const PERIODS = [
  { id: "all", label: "All time" },
  { id: "year", label: "This year" },
  { id: "month", label: "This month" },
  { id: "week", label: "This week" },
];

// Returns { start, end } as Dates for a named period.
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
    const mondayOffset = (d.getDay() + 6) % 7; // Monday = 0
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
  const { isAdmin } = useAuth();
  const { show } = useToast();
  const [productCount, setProductCount] = useState(0);
  const [outOfStockItems, setOutOfStockItems] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [period, setPeriod] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  const loadDashboard = useCallback(async ({ notify = false } = {}) => {
    setIsRefreshing(true);
    try {
      const [prodRes, orderRes] = await Promise.all([
        productsApi.list(),
        ordersApi.listAllAdmin(),
      ]);
      const products = prodRes.data || [];
      const nextOrders = orderRes.data || [];

      setProductCount(products.length);
      setOutOfStockItems(products.filter((p) => (p.stock ?? 0) === 0));
      setLowStockItems(products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5));
      setOrders(nextOrders);
      setLastRefreshedAt(new Date());

      // Users are loaded separately so failure doesn't break main dashboard
      usersApi
        .list()
        .then((res) => setUsers(res.data || []))
        .catch(() => {});

      if (notify) {
        show("Dashboard data is up to date.", { tone: "success" });
      }
    } catch (err) {
      if (notify) {
        show(
          err.response?.data?.message || "Couldn't refresh dashboard data.",
          { tone: "error" }
        );
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [show]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

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

  // Attention derived metrics
  const pendingOrders = ordersInPeriod.filter((o) => (o.status ?? o.Status) === "Pending");
  const processingOrders = ordersInPeriod.filter((o) => (o.status ?? o.Status) === "Processing");
  const totalAttentionItems =
    outOfStockItems.length +
    lowStockItems.length +
    pendingOrders.length +
    processingOrders.length;

  // Location aggregation (privacy-safe, broad areas only)
  const usersById = new Map(
    users.map((user) => [user.User_ID ?? user.user_ID ?? user.userId, user])
  );

  const locationBuckets = new Map();

  ordersInPeriod.forEach((order) => {
    const userId = order.user_id ?? order.userId ?? order.User_ID;
    const user = usersById.get(userId);
    const rawAddress =
      order.shipping_address ??
      order.shippingAddress ??
      order.ShippingAddress ??
      user?.Address ??
      user?.address;
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
    <div className="min-h-[calc(100vh-64px)] bg-[var(--color-dark-bg)] text-[var(--color-dark-ink)] pb-16">
      <div className="max-w-6xl mx-auto px-5 py-8">
        {/* Header section with role-aware title and compact refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[var(--color-dark-line)]">
          <div>
            <h1 className="font-[var(--font-display)] text-2xl font-bold text-white tracking-tight mb-1">
              {isAdmin ? "Store overview" : "Store operations"}
            </h1>
            <p className="text-sm text-[var(--color-dark-ink)]/60">
              {isAdmin
                ? "A clear view of orders, products, and customers."
                : "Keep an eye on orders, stock, and customer activity."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lastRefreshedAt && (
              <span className="text-xs font-[var(--font-mono)] text-[var(--color-dark-ink)]/50 hidden sm:inline" aria-live="polite">
                Updated {lastRefreshedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
            <button
              type="button"
              onClick={() => loadDashboard({ notify: true })}
              disabled={isRefreshing}
              className="admin-btn-secondary"
              aria-label="Refresh dashboard data"
            >
              <svg
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
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
              <span>{isRefreshing ? "Refreshing…" : "Refresh"}</span>
            </button>
          </div>
        </div>

        {/* Date filter bar */}
        <div className="bg-[var(--color-dark-panel)] border border-[var(--color-dark-line)] rounded-lg p-3.5 mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Date range filters">
            <span className="text-xs font-semibold text-[var(--color-dark-ink)]/70 uppercase tracking-wider mr-1">
              Date range
            </span>
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPeriod(p.id);
                  setCustomStart("");
                  setCustomEnd("");
                }}
                aria-pressed={!hasCustomRange && period === p.id}
                className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${
                  !hasCustomRange && period === p.id
                    ? "bg-[var(--color-circuit)]/15 text-[var(--color-circuit)] border-[var(--color-circuit)]/50 font-semibold"
                    : "border-[var(--color-dark-line)] text-[var(--color-dark-ink)]/70 hover:text-white hover:bg-[var(--color-dark-line)]/40"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
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
                onClick={() => {
                  setCustomStart("");
                  setCustomEnd("");
                }}
                className="text-xs text-[var(--color-signal)] hover:underline px-2 py-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Products */}
          <div className="admin-metric-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-dark-ink)]/60">
                Products
              </span>
              <svg className="w-4 h-4 text-[var(--color-circuit)]/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{productCount}</p>
            <p className="text-xs text-[var(--color-dark-ink)]/50">Across the current catalog</p>
          </div>

          {/* Low stock */}
          <button
            type="button"
            onClick={() => {
              if (lowStockItems.length > 0 || outOfStockItems.length > 0) {
                setShowLowStock((v) => !v);
              }
            }}
            disabled={lowStockItems.length === 0 && outOfStockItems.length === 0}
            className={`admin-metric-card admin-metric-interactive ${
              (lowStockItems.length > 0 || outOfStockItems.length > 0) ? "cursor-pointer" : "cursor-default"
            }`}
            aria-expanded={showLowStock}
            aria-label="Low stock items card"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-dark-ink)]/60">
                Low stock
              </span>
              <svg
                className={`w-4 h-4 ${
                  (lowStockItems.length > 0 || outOfStockItems.length > 0)
                    ? "text-[#F59E0B]"
                    : "text-[var(--color-dark-ink)]/40"
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <p className={`text-3xl font-bold mb-1 ${
              outOfStockItems.length > 0
                ? "text-[var(--color-signal)]"
                : lowStockItems.length > 0
                ? "text-[#F59E0B]"
                : "text-white"
            }`}>
              {lowStockItems.length + outOfStockItems.length}
            </p>
            <p className="text-xs text-[var(--color-dark-ink)]/50">
              {(lowStockItems.length > 0 || outOfStockItems.length > 0)
                ? (showLowStock ? "Click to hide list" : "Needs attention — click to view")
                : "Healthy stock levels"}
            </p>
          </button>

          {/* Orders */}
          <div className="admin-metric-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-dark-ink)]/60 truncate" title={`Orders · ${periodLabel}`}>
                Orders
              </span>
              <svg className="w-4 h-4 text-[var(--color-circuit)]/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{ordersInPeriod.length}</p>
            <p className="text-xs text-[var(--color-dark-ink)]/50 truncate" title={periodLabel}>
              During this period ({periodLabel})
            </p>
          </div>

          {/* Revenue */}
          <div className="admin-metric-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-dark-ink)]/60 truncate" title={`Revenue · ${periodLabel}`}>
                Revenue
              </span>
              <svg className="w-4 h-4 text-[#F59E0B]/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-[#F59E0B] mb-1">
              ${revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-[var(--color-dark-ink)]/50">After cancelled paid orders</p>
          </div>
        </div>

        {/* Low Stock Drawer if expanded */}
        {showLowStock && (lowStockItems.length > 0 || outOfStockItems.length > 0) && (
          <div className="bg-[var(--color-dark-panel)] border border-[var(--color-signal)]/40 rounded-lg p-5 mb-8 -mt-4 shadow-lg animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-3">
              <p className="font-[var(--font-mono)] text-xs text-[var(--color-signal)] uppercase tracking-wider font-semibold">
                Stock alerts ({outOfStockItems.length + lowStockItems.length} items)
              </p>
              <button
                type="button"
                onClick={() => setShowLowStock(false)}
                className="text-xs text-[var(--color-dark-ink)]/50 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {outOfStockItems.map((p) => (
                <div key={p.product_id} className="flex items-center justify-between bg-[var(--color-dark-bg)] border border-[var(--color-signal)]/30 rounded px-3 py-2 text-sm">
                  <span className="font-medium text-white truncate mr-2">{p.product_name}</span>
                  <span className="admin-status-badge admin-stock-out shrink-0">Out of stock</span>
                </div>
              ))}
              {lowStockItems.map((p) => (
                <div key={p.product_id} className="flex items-center justify-between bg-[var(--color-dark-bg)] border border-[var(--color-dark-line)] rounded px-3 py-2 text-sm">
                  <span className="font-medium text-white truncate mr-2">{p.product_name}</span>
                  <span className="admin-status-badge admin-stock-low shrink-0">{p.stock} left</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Needs attention section (Section 6) */}
        <section className="mb-8" aria-labelledby="attention-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="attention-heading" className="text-xs font-[var(--font-mono)] uppercase tracking-wider text-[var(--color-dark-ink)]/70 font-semibold">
              Needs attention
            </h2>
            {totalAttentionItems === 0 && (
              <span className="text-xs text-[#34D399] font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#34D399] inline-block" />
                Store operations healthy
              </span>
            )}
          </div>

          {totalAttentionItems > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {outOfStockItems.length > 0 && (
                <Link
                  to="/admin"
                  className="admin-attention-card is-urgent"
                  aria-label={`${outOfStockItems.length} products out of stock`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs text-[var(--color-dark-ink)]/60 font-medium">Out of stock</p>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      {outOfStockItems.length} product{outOfStockItems.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="admin-status-badge admin-stock-out shrink-0">Action needed</span>
                </Link>
              )}

              {lowStockItems.length > 0 && (
                <Link
                  to="/admin"
                  className="admin-attention-card"
                  aria-label={`${lowStockItems.length} products running low`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs text-[var(--color-dark-ink)]/60 font-medium">Running low</p>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      {lowStockItems.length} product{lowStockItems.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="admin-status-badge admin-stock-low shrink-0">Check stock</span>
                </Link>
              )}

              {pendingOrders.length > 0 && (
                <Link
                  to="/admin/orders"
                  className="admin-attention-card"
                  aria-label={`${pendingOrders.length} pending orders waiting`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs text-[var(--color-dark-ink)]/60 font-medium">Pending orders</p>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      {pendingOrders.length} order{pendingOrders.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="admin-status-badge admin-status-pending shrink-0">Review</span>
                </Link>
              )}

              {processingOrders.length > 0 && (
                <Link
                  to="/admin/orders"
                  className="admin-attention-card"
                  aria-label={`${processingOrders.length} orders in processing`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs text-[var(--color-dark-ink)]/60 font-medium">In processing</p>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      {processingOrders.length} order{processingOrders.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="admin-status-badge admin-status-processing shrink-0">Fulfil</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="bg-[var(--color-dark-panel)] border border-[var(--color-dark-line)] rounded-lg p-4 text-xs text-[var(--color-dark-ink)]/60 flex items-center gap-2">
              <svg className="w-4 h-4 text-[#34D399]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>All customer orders are fulfilled and catalog stock levels are healthy.</span>
            </div>
          )}
        </section>

        {/* Customer location insights */}
        <div className="mb-8">
          <CustomerLocationMap
            locations={customerLocations}
            totalOrders={ordersInPeriod.length}
            onRefresh={() => loadDashboard({ notify: true })}
            isRefreshing={isRefreshing}
            lastRefreshedAt={lastRefreshedAt}
          />
        </div>

        {/* Navigation tabs */}
        <nav className="admin-tabs-bar" aria-label="Admin sections">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `admin-tab-nav-item ${isActive ? "active" : ""}`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>

        {/* Child admin view */}
        <Outlet />
      </div>
    </div>
  );
}
