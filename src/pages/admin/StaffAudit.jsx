import { useCallback, useEffect, useState } from "react";
import { activityApi, usersApi } from "../../api/client";

const EVENT_LABELS = {
  Login: "Signed in",
  OrderStatusChanged: "Order status changed",
  OrderFulfillmentUpdated: "Delivery details updated",
  OrderDeleted: "Order deleted",
  OrderDetailCreated: "Order line added",
  OrderDetailUpdated: "Order line updated",
  OrderDetailDeleted: "Order line removed",
  ProductDescriptionChanged: "Product description changed",
  UserUpdated: "User account updated",
  UserRoleChanged: "User role changed",
  ReviewDeleted: "Review removed",
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export default function StaffAudit() {
  const [staff, setStaff] = useState([]);
  const [staffError, setStaffError] = useState("");
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({ staffId: "", from: "", to: "", type: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let current = true;
    usersApi.list()
      .then(({ data }) => {
        if (current) setStaff((Array.isArray(data) ? data : []).filter((user) => Number(user.Role_ID ?? user.role_ID) === 2));
      })
      .catch(() => {
        if (current) setStaffError("Staff names could not be loaded. Audit entries remain available by staff ID.");
      });
    return () => { current = false; };
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = { actorRole: "Staff", limit: 500 };
    if (filters.staffId) params.actorUserId = Number(filters.staffId);
    if (filters.from) params.from = new Date(`${filters.from}T00:00:00`).toISOString();
    if (filters.to) params.to = new Date(`${filters.to}T23:59:59.999`).toISOString();
    if (filters.type) params.type = filters.type;

    try {
      const response = await activityApi.all(params);
      setLogs(Array.isArray(response.data) ? response.data : []);
      setLastUpdated(new Date());
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Unable to load staff audit events. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadLogs();
    const timer = window.setInterval(loadLogs, 30_000);
    return () => window.clearInterval(timer);
  }, [loadLogs]);

  const eventTypes = Array.from(new Set([
    ...Object.keys(EVENT_LABELS),
    ...logs.map((log) => log.Activity_Type).filter(Boolean),
  ])).sort((a, b) => (EVENT_LABELS[a] ?? a).localeCompare(EVENT_LABELS[b] ?? b));

  return (
    <main className="activity-page">
      <header className="activity-heading">
        <p className="activity-kicker">Admin only · Audit log</p>
        <h1>Staff audit trail</h1>
        <p className="activity-lede">
          Review successful staff actions that change store data. This page refreshes every 30 seconds and shows up to the latest 500 matching events.
        </p>
      </header>

      <section className="activity-summary" aria-label="Staff audit filters">
        <div className="activity-filters" role="search" aria-label="Filter staff audit events">
          <div className="activity-filter-group">
            <label className="activity-filter-label" htmlFor="staff-audit-person">Staff member</label>
            <select id="staff-audit-person" className="activity-filter-input" value={filters.staffId} onChange={(event) => setFilters((current) => ({ ...current, staffId: event.target.value }))}>
              <option value="">All staff</option>
              {staff.map((user) => (
                <option key={user.User_ID ?? user.user_ID} value={user.User_ID ?? user.user_ID}>
                  {user.Name ?? user.name ?? `Staff #${user.User_ID ?? user.user_ID}`}
                </option>
              ))}
            </select>
          </div>
          <div className="activity-filter-group">
            <label className="activity-filter-label" htmlFor="staff-audit-from">From</label>
            <input id="staff-audit-from" className="activity-filter-input" type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
          </div>
          <div className="activity-filter-group">
            <label className="activity-filter-label" htmlFor="staff-audit-to">To</label>
            <input id="staff-audit-to" className="activity-filter-input" type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
          </div>
          <div className="activity-filter-group">
            <label className="activity-filter-label" htmlFor="staff-audit-type">Action</label>
            <select id="staff-audit-type" className="activity-filter-input" value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
              <option value="">All actions</option>
              {eventTypes.map((type) => <option key={type} value={type}>{EVENT_LABELS[type] ?? type}</option>)}
            </select>
          </div>
          <div className="activity-filter-group">
            <span className="activity-filter-label">Refresh</span>
            <button type="button" className="activity-filter-input" onClick={loadLogs} disabled={loading}>
              {loading ? "Loading…" : "Refresh now"}
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--color-ink-soft)]" aria-live="polite">
          {lastUpdated ? `Last refreshed ${formatDate(lastUpdated)}` : "Updates automatically every 30 seconds."}
        </p>
        {staffError && <p className="mt-2 text-xs text-[var(--color-ink-soft)]" role="status">{staffError}</p>}
      </section>

      {error && <div className="activity-state activity-state-error" role="alert">{error}</div>}
      {loading && !logs.length && <div className="activity-state" aria-live="polite">Loading staff audit events…</div>}
      {!loading && !error && logs.length === 0 && (
        <div className="activity-state activity-state-empty" role="status">
          <span aria-hidden="true">◷</span>
          <div className="text-center">
            <p className="font-semibold text-[var(--color-ink)] mb-1">No staff actions found</p>
            <p className="text-xs text-[var(--color-ink-soft)]">Try a wider date range or another staff filter.</p>
          </div>
        </div>
      )}
      {logs.length > 0 && (
        <ol className="activity-list" aria-label="Staff audit events">
          {logs.map((log) => (
            <li className="activity-item" key={log.Activity_ID}>
              <span className="activity-marker" aria-hidden="true">◷</span>
              <div className="activity-item-body">
                <div className="activity-item-topline">
                  <span className="activity-type">{EVENT_LABELS[log.Activity_Type] ?? log.Activity_Type}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-dark-ink)]/70 font-medium">
                      {log.Actor_Name || (log.Actor_User_ID ? `Staff #${log.Actor_User_ID}` : "Unknown staff")}
                    </span>
                    <span className="activity-state activity-role-staff">Staff</span>
                  </div>
                </div>
                <p className="activity-desc">{log.Description}</p>
                <div className="activity-item-meta">
                  <time dateTime={log.Created_At}>{formatDate(log.Created_At)}</time>
                  {log.Related_Order_ID && <span className="activity-ref">Order #{log.Related_Order_ID}</span>}
                  {log.Related_Product_ID && <span className="activity-ref">Product #{log.Related_Product_ID}</span>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-4 text-xs text-[var(--color-ink-soft)]">
        Audit records cover successful changes and moderation actions, not read-only browsing or failed requests. Sensitive message contents, passwords, and payment details are not displayed here.
      </p>
    </main>
  );
}
