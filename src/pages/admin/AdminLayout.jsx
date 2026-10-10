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
  return `${start.toLocaleDateString(undefined, opts)} to ${end.toLocaleDateString(undefined, opts)}`;
}

function getOrderStatus(order) {
  return order.status ?? order.Status ?? "Pending";
}

function buildSalesTrend(orders) {
  const datedOrders = orders
    .map((order) => ({
      order,
      date: new Date(order.order_date ?? order.orderDate ?? order.OrderDate),
    }))
    .filter(({ date }) => !Number.isNaN(date.getTime()));

  if (datedOrders.length === 0) return { buckets: [], granularity: "day" };

  const first = datedOrders.reduce((min, item) => item.date < min ? item.date : min, datedOrders[0].date);
  const last = datedOrders.reduce((max, item) => item.date > max ? item.date : max, datedOrders[0].date);
  const spanDays = Math.max(1, (last - first) / 86400000);
  const granularity = spanDays <= 31 ? "day" : spanDays <= 180 ? "week" : "month";
  const buckets = new Map();

  datedOrders.forEach(({ order, date }) => {
    const bucketDate = new Date(date);
    let key;
    let label;
    if (granularity === "day") {
      bucketDate.setHours(0, 0, 0, 0);
      key = bucketDate.toISOString().slice(0, 10);
      label = bucketDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } else if (granularity === "week") {
      const mondayOffset = (bucketDate.getDay() + 6) % 7;
      bucketDate.setDate(bucketDate.getDate() - mondayOffset);
      bucketDate.setHours(0, 0, 0, 0);
      key = bucketDate.toISOString().slice(0, 10);
      label = bucketDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } else {
      bucketDate.setDate(1);
      bucketDate.setHours(0, 0, 0, 0);
      key = `${bucketDate.getFullYear()}-${String(bucketDate.getMonth() + 1).padStart(2, "0")}`;
      label = bucketDate.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    }

    const bucket = buckets.get(key) || { key, label, orders: 0, revenue: 0 };
    if (getOrderStatus(order) !== "Cancelled") bucket.orders += 1;
    if (countsAsRevenue(order)) {
      bucket.revenue += Number(order.total_amount ?? order.totalAmount ?? order.TotalAmount ?? 0);
    }
    buckets.set(key, bucket);
  });

  return {
    buckets: Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key)).slice(-12),
    granularity,
  };
}

function SalesTrendGraph({ orders, periodLabel }) {
  const { buckets, granularity } = buildSalesTrend(orders);
  const totalRevenue = buckets.reduce((sum, bucket) => sum + bucket.revenue, 0);
  const maxRevenue = Math.max(...buckets.map((bucket) => bucket.revenue), 0);
  const maxOrders = Math.max(...buckets.map((bucket) => bucket.orders), 0);
  const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  const peakBucket = buckets.reduce((peak, bucket) =>
    !peak || bucket.revenue > peak.revenue ? bucket : peak, null);
  const chartWidth = 760;
  const chartHeight = 250;
  const padding = { top: 24, right: 18, bottom: 46, left: 46 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const getX = (index) => buckets.length === 1
    ? padding.left + innerWidth / 2
    : padding.left + (index / (buckets.length - 1)) * innerWidth;
  const getY = (value, max) => padding.top + innerHeight - (max > 0 ? (value / max) * innerHeight : 0);
  const revenuePoints = buckets.map((bucket, index) => `${getX(index)},${getY(bucket.revenue, maxRevenue)}`).join(" ");
  const areaPoints = `${padding.left},${padding.top + innerHeight} ${revenuePoints} ${chartWidth - padding.right},${padding.top + innerHeight}`;
  const formatMoney = (value) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatShortMoney = (value) => value >= 1000 ? `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : `$${Math.round(value)}`;
  const groupingLabel = granularity === "day" ? "Daily" : granularity === "week" ? "Weekly" : "Monthly";
  const chartKey = buckets.map(({ key, orders, revenue }) => `${key}:${orders}:${revenue}`).join("|");

  return (
    <section className="admin-trend-panel" aria-labelledby="sales-trend-heading">
      <div className="admin-trend-header">
        <div>
          <p className="admin-section-kicker">Performance</p>
          <h2 id="sales-trend-heading" className="admin-trend-title">Sales and revenue</h2>
          <p className="admin-trend-subtitle">Revenue and order activity during {periodLabel.toLowerCase()}.</p>
        </div>
        <div className="admin-trend-legend" aria-label="Graph legend">
          <span><i className="admin-trend-legend-line" aria-hidden="true" /> Revenue</span>
          <span><i className="admin-trend-legend-bar" aria-hidden="true" /> Orders</span>
        </div>
      </div>

      {buckets.length > 0 ? (
        <div className="admin-trend-chart-wrap">
          <div className="admin-trend-summary">
            <div><strong>{formatMoney(totalRevenue)}</strong><span>total revenue</span></div>
            <div><strong>{formatMoney(averageOrderValue)}</strong><span>average order value</span></div>
            <div><strong>{peakBucket ? peakBucket.label : "—"}</strong><span>peak revenue period</span></div>
            <div><strong>{groupingLabel}</strong><span>graph view</span></div>
          </div>
          <svg key={chartKey} className="admin-trend-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`Sales and revenue trend for ${periodLabel}`}>
            <defs>
              <linearGradient id="admin-revenue-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-gold)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--color-gold)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 0.5, 1].map((ratio) => {
              const y = padding.top + innerHeight * ratio;
              const value = maxRevenue * (1 - ratio);
              return (
                <g key={ratio}>
                  <line x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} className="admin-trend-gridline" />
                  <text className="admin-trend-axis-label" x={padding.left - 8} y={y + 3} textAnchor="end">{formatShortMoney(value)}</text>
                </g>
              );
            })}
            <polygon className="admin-trend-area" points={areaPoints} />
            {buckets.map((bucket, index) => {
              const barWidth = Math.min(34, Math.max(12, innerWidth / Math.max(buckets.length * 2, 1)));
              const barHeight = maxOrders > 0 ? (bucket.orders / maxOrders) * innerHeight : 0;
              return (
                <g key={bucket.key} className="admin-trend-period">
                  <title>{`${bucket.label}: ${bucket.orders} orders, ${formatMoney(bucket.revenue)} revenue`}</title>
                  <rect className="admin-trend-bar" style={{ "--trend-delay": `${Math.min(index, 11) * 55}ms` }} x={getX(index) - barWidth / 2} y={padding.top + innerHeight - barHeight} width={barWidth} height={barHeight} rx="5" />
                  <text className="admin-trend-label" x={getX(index)} y={chartHeight - 14} textAnchor="middle">{bucket.label}</text>
                </g>
              );
            })}
            <polyline className="admin-trend-line" pathLength="1" points={revenuePoints} />
            {buckets.map((bucket, index) => (
              <circle key={`${bucket.key}-point`} className="admin-trend-point" style={{ "--trend-delay": `${Math.min(index, 11) * 55}ms` }} cx={getX(index)} cy={getY(bucket.revenue, maxRevenue)} r="4" tabIndex="0">
                <title>{`${bucket.label}: ${formatMoney(bucket.revenue)} revenue`}</title>
              </circle>
            ))}
          </svg>
        </div>
      ) : (
        <div className="admin-trend-empty" role="status">
          <strong>No sales data for this period</strong>
          <span>Revenue and order activity will appear here after orders are placed.</span>
        </div>
      )}
    </section>
  );
}

// Reduces an address to a broad locality (city/province) only.
function getBroadLocation(address) {
  if (!address || typeof address !== "string") return "";

  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^\d+[\w\s-]*$/.test(part))
    .filter((part) => !/^philippines$/i.test(part));

  if (parts.length === 0) return "";

  // New selector values end in city, province/district, region, Philippines.
  // Pick only the city and province so exact street and barangay details are
  // never passed to the geocoder or plotted on the customer map.
  if (parts.length >= 5) return `${parts.at(-3)}, ${parts.at(-2)}`;
  if (parts.length >= 3) return `${parts.at(-2)}, ${parts.at(-1)}`;
  return parts.at(-1).replace(/^\d+\s+/, "");
}

export default function AdminLayout() {
  const { isAdmin } = useAuth();
  const visibleTabs = tabs.filter((tab) => isAdmin || tab.to !== "/admin/users");
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
  const [dashboardError, setDashboardError] = useState("");
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  const loadDashboard = useCallback(async ({ notify = false } = {}) => {
    setIsRefreshing(true);
    setDashboardError("");
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

      // Users are loaded separately so failure doesn't break main dashboard.
      // The user list is admin-only on the API (it holds every customer's
      // email and address), so staff skip it. Staff still get customer
      // locations from each order's own shipping address.
      if (isAdmin) {
        usersApi
          .list()
          .then((res) => setUsers(res.data || []))
          .catch(() => setDashboardError("Product and order data loaded, but customer insights couldn’t be refreshed."));
      }

      if (notify) {
        show("Dashboard data is up to date.", { tone: "success" });
      }
    } catch (err) {
      setDashboardError(err.response?.data?.message || "Couldn't load dashboard data. Use Refresh to try again.");
      if (notify) {
        show(
          err.response?.data?.message || "Couldn't refresh dashboard data.",
          { tone: "error" }
        );
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [show, isAdmin]);

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
              {isAdmin ? "Techstead Admin" : "Store operations"}
            </h1>
            <p className="text-sm text-[var(--color-dark-ink)]/60">
              {isAdmin
                ? "A clear view of orders, products, stock, and customer activity."
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

        {dashboardError && (
          <div className="mb-6 rounded-lg border border-[var(--color-signal)]/40 bg-[var(--color-dark-panel)] px-4 py-3 text-sm text-[var(--color-dark-ink)]" role="alert">
            {dashboardError}
          </div>
        )}

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
                ? (showLowStock ? "Click to hide list" : "Needs attention. Click to view")
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

        <SalesTrendGraph orders={ordersInPeriod} periodLabel={periodLabel} />

        {/* Low Stock Drawer if expanded */}
        {showLowStock && (lowStockItems.length > 0 || outOfStockItems.length > 0) && (
          <div className="bg-[var(--color-dark-panel)] border border-[var(--color-signal)]/40 rounded-lg p-5 mb-8 -mt-4 shadow-lg motion-enter">
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
                  to="/admin?stock=out#admin-products"
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
                  to="/admin?stock=low#admin-products"
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
                  to="/admin/orders?status=Pending#admin-orders"
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
                  to="/admin/orders?status=Processing#admin-orders"
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
            periodLabel={periodLabel}
            onRefresh={() => loadDashboard({ notify: true })}
            isRefreshing={isRefreshing}
            lastRefreshedAt={lastRefreshedAt}
          />
        </div>

        {/* Navigation tabs */}
        <nav className="admin-tabs-bar" aria-label="Admin sections">
            {visibleTabs.map((t) => (
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
