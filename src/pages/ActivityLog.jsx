import { useState, useEffect, useCallback } from "react";
import { activityApi } from "../api/client";
import { useAuth } from "../context/AuthContext";

// ---- Helpers ----

const EVENT_LABELS = {
  Login: "Signed in",
  AccountCreated: "Account created",
  PasswordChanged: "Password changed",
  ProfileUpdated: "Profile updated",
  OrderPlaced: "Order placed",
  OrderCancelled: "Order cancelled",
  OrderStatusChanged: "Order status changed",
  CartItemAdded: "Added to cart",
  CartUpdated: "Cart updated",
  CartItemRemoved: "Removed from cart",
  CartCleared: "Cart cleared",
  WishlistItemAdded: "Added to wishlist",
  WishlistItemRemoved: "Removed from wishlist",
  ProductCreated: "Product created",
  ProductUpdated: "Product updated",
  ProductDeleted: "Product deleted",
  ProductDescriptionChanged: "Description updated",
  ProductImageUploaded: "Image uploaded",
  UserUpdated: "User updated",
  UserRoleChanged: "Role changed",
  UserDeleted: "User deleted",
};

const ROLE_COLORS = {
  Admin: "activity-role-admin",
  Staff: "activity-role-staff",
  User: "activity-role-user",
  System: "activity-role-system",
};

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getEventIcon(type) {
  if (type?.startsWith("Cart")) return "·";
  if (type?.startsWith("Wishlist")) return "♡";
  if (type?.startsWith("Order")) return "→";
  if (type?.startsWith("Product")) return "+";
  if (type?.startsWith("User")) return "○";
  if (type === "Login") return "→";
  if (type === "AccountCreated") return "+";
  if (type === "PasswordChanged" || type === "ProfileUpdated") return "⚙";
  return "◷";
}

// ---- Sub-components ----

function ActivityItem({ log, showRole }) {
  const actorName = log.Actor_Name || (log.User_ID ? `User #${log.User_ID}` : null);

  return (
    <li className="activity-item">
      <span className="activity-marker" aria-hidden="true">
        {getEventIcon(log.Activity_Type)}
      </span>
      <div className="activity-item-body">
        <div className="activity-item-topline">
          <span className="activity-type">
            {EVENT_LABELS[log.Activity_Type] ?? log.Activity_Type}
          </span>
          <div className="flex items-center gap-2">
            {showRole && actorName && (
              <span className="text-xs text-[var(--color-dark-ink)]/70 font-medium">
                {actorName}
              </span>
            )}
            {showRole && log.Actor_Role && (
              <span className={`activity-state ${ROLE_COLORS[log.Actor_Role] ?? ""}`}>
                {log.Actor_Role}
              </span>
            )}
          </div>
        </div>
        <p className="activity-desc">{log.Description}</p>
        <div className="activity-item-meta">
          <time dateTime={log.Created_At}>{formatDate(log.Created_At)}</time>
          {log.Related_Order_ID && (
            <span className="activity-ref">Order #{log.Related_Order_ID}</span>
          )}
          {log.Related_Product_ID && (
            <span className="activity-ref">Product #{log.Related_Product_ID}</span>
          )}
        </div>
      </div>
    </li>
  );
}

function Filters({ filters, setFilters, isAdmin }) {
  const EVENT_TYPES = Object.keys(EVENT_LABELS);

  return (
    <div className="activity-filters" role="search" aria-label="Filter activity">
      <div className="activity-filter-group">
        <label htmlFor="filter-from" className="activity-filter-label">From</label>
        <input
          id="filter-from"
          type="date"
          className="activity-filter-input"
          value={filters.from}
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
        />
      </div>
      <div className="activity-filter-group">
        <label htmlFor="filter-to" className="activity-filter-label">To</label>
        <input
          id="filter-to"
          type="date"
          className="activity-filter-input"
          value={filters.to}
          onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
        />
      </div>
      <div className="activity-filter-group">
        <label htmlFor="filter-type" className="activity-filter-label">Event type</label>
        <select
          id="filter-type"
          className="activity-filter-input"
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
        >
          <option value="">All events</option>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{EVENT_LABELS[t]}</option>
          ))}
        </select>
      </div>
      {isAdmin && (
        <div className="activity-filter-group">
          <label htmlFor="filter-role" className="activity-filter-label">Role</label>
          <select
            id="filter-role"
            className="activity-filter-input"
            value={filters.actorRole}
            onChange={(e) => setFilters((f) => ({ ...f, actorRole: e.target.value }))}
          >
            <option value="">All roles</option>
            <option value="User">Customer</option>
            <option value="Staff">Staff</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
      )}
    </div>
  );
}

// ---- Main page ----

export default function ActivityLog() {
  const { isAdmin, isMod } = useAuth();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ from: "", to: "", type: "", actorRole: "" });

  // Determine heading copy based on role
  const heading = "Activity";
  const kicker = "Audit log";
  const lede = (isAdmin || isMod)
    ? "Review recent account and store activity."
    : "Review your recent account and store activity.";

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filters.from) params.from = new Date(filters.from).toISOString();
      if (filters.to) {
        const to = new Date(filters.to);
        to.setHours(23, 59, 59, 999);
        params.to = to.toISOString();
      }
      if (filters.type) params.type = filters.type;
      if (filters.actorRole) params.actorRole = filters.actorRole;

      let res;
      if (isAdmin) {
        res = await activityApi.all(params);
      } else if (isMod) {
        res = await activityApi.customers(params);
      } else {
        res = await activityApi.my(params);
      }
      setLogs(res.data ?? []);
    } catch (err) {
      setError(err?.response?.data?.message ?? "Unable to load activity. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isMod, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const showRole = isAdmin || isMod;

  return (
    <main className="activity-page">
      <header className="activity-heading">
        <p className="activity-kicker">{kicker}</p>
        <h1>{heading}</h1>
        <p className="activity-lede">{lede}</p>
      </header>

      <section aria-label="Activity summary" className="activity-summary">
        <Filters filters={filters} setFilters={setFilters} isAdmin={isAdmin} />
      </section>

      {loading && (
        <div className="activity-state" aria-live="polite">
          <span className="activity-spinner" aria-hidden="true" />
          Loading activity…
        </div>
      )}

      {!loading && error && (
        <div className="activity-state activity-state-error" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="activity-state activity-state-empty">
          <span aria-hidden="true">◷</span>
          <div className="text-center">
            <p className="font-semibold text-white mb-1">No activity to show</p>
            <p className="text-xs text-[var(--color-dark-ink)]/60">New account and store actions will appear here.</p>
          </div>
        </div>
      )}

      {!loading && !error && logs.length > 0 && (
        <ol className="activity-list" aria-label="Activity entries">
          {logs.map((log) => (
            <ActivityItem key={log.Activity_ID} log={log} showRole={showRole} />
          ))}
        </ol>
      )}
    </main>
  );
}
