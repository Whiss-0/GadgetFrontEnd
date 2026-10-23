import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";
import { useAuth } from "../context/AuthContext";

const iconPaths = {
  OrderProcessing: <><path d="M12 3v3" /><path d="M12 18v3" /><path d="M3 12h3" /><path d="M18 12h3" /><circle cx="12" cy="12" r="6" /><path d="m10 12 1.3 1.3L14.5 10" /></>,
  OrderShipped: <><path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" /><path d="M3 8.5v7L12 20l9-4.5v-7" /><path d="M12 13v7" /></>,
  OrderDelivered: <><path d="m5 12 4 4L19 6" /><path d="M21 12a9 9 0 1 1-3-6.7" /></>,
  OrderCancelled: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6m0-6-6 6" /></>,
  AdminAnnouncement: <><path d="m3 11 18-5v12L3 13v-2Z" /><path d="M11.6 15.4 13 20H9l-1.6-5.8" /><path d="M21 10v4" /></>,
  default: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></>,
};

function NotificationIcon({ type }) {
  return (
    <span className={`notification-page-icon notification-icon-${type || "default"}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {iconPaths[type] || iconPaths.default}
      </svg>
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function Notifications() {
  const [filter, setFilter] = useState("all");
  const { isMod } = useAuth();
  const { notifications, unreadCount, loading, error, refresh, markRead, markAllRead } = useNotifications({ unreadOnly: filter === "unread" });

  useEffect(() => {
    refresh();
  }, [refresh]);

  const visibleNotifications = useMemo(
    () => filter === "unread" ? notifications.filter((notification) => !notification.is_read) : notifications,
    [filter, notifications]
  );

  return (
    <div className="notifications-page">
      <header className="notifications-page-head">
        <div>
          <p className="notifications-page-eyebrow">Your account</p>
          <h1>Notifications</h1>
          <p className="notifications-page-intro">Order progress and important updates, all in one place.</p>
        </div>
        {unreadCount > 0 && <button type="button" onClick={() => void markAllRead()} className="notification-mark-all-page">Mark all as read</button>}
      </header>

      <div className="notifications-toolbar" aria-label="Filter notifications">
        <div className="notification-filter-group" role="group" aria-label="Notification status">
          <button type="button" className={filter === "all" ? "is-active" : ""} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All</button>
          <button type="button" className={filter === "unread" ? "is-active" : ""} aria-pressed={filter === "unread"} onClick={() => setFilter("unread")}>Unread <span>{unreadCount}</span></button>
        </div>
        <span className="notifications-updated-note">Latest updates first {notifications.length === 30 && filter === "all" ? "· showing up to 30" : ""}</span>
      </div>

      {loading && notifications.length === 0 ? (
        <div className="notification-page-state" role="status" aria-live="polite"><span className="notification-loader" aria-hidden="true" /><strong>Loading your updates</strong><span>Your order and account notifications will be here shortly.</span></div>
      ) : error && notifications.length === 0 ? (
        <div className="notification-page-state is-error" role="alert"><strong>We couldn’t load your notifications</strong><span>{error}</span><button type="button" onClick={() => void refresh()} className="notification-state-action">Try again</button></div>
      ) : visibleNotifications.length === 0 ? (
        <div className="notification-page-state"><span className="notification-empty-icon" aria-hidden="true">{filter === "unread" ? "✓" : "⌁"}</span><strong>{filter === "unread" ? "You’re all caught up" : "No notifications yet"}</strong><span>{filter === "unread" ? "There are no unread updates right now." : "Order updates and store announcements will appear here."}</span>{filter === "unread" && notifications.length > 0 && <button type="button" className="notification-state-action" onClick={() => setFilter("all")}>View all notifications</button>}</div>
      ) : (
        <div className="notification-page-list" aria-busy={loading}>
          {error && <p className="notification-inline-warning" role="status">Couldn’t refresh just now. Showing the latest updates we have.</p>}
          {visibleNotifications.map((notification) => (
            <article key={notification.notification_id} className={`notification-page-item ${!notification.is_read ? "is-unread" : ""}`}>
              <NotificationIcon type={notification.notification_type} />
              <div className="notification-page-copy">
                <div className="notification-page-meta">
                  <div className="notification-page-title-row"><h2>{notification.title}</h2>{!notification.is_read && <span className="notification-unread-pill">New</span>}</div>
                  <time dateTime={notification.created_at} title={notification.created_at ? new Date(notification.created_at).toLocaleString() : undefined}>{formatDate(notification.created_at)}</time>
                </div>
                <p>{notification.message}</p>
                <div className="notification-page-actions">
                  {notification.related_order_id && <Link to={notification.notification_type === "NewCustomerOrder" && isMod ? "/admin/orders?status=Pending#admin-orders" : "/orders"} onClick={() => { if (!notification.is_read) void markRead(notification.notification_id); }}>View order <span aria-hidden="true">#{notification.related_order_id} →</span></Link>}
                  {!notification.is_read && <button type="button" onClick={() => void markRead(notification.notification_id)} aria-label={`Mark “${notification.title}” as read`}>Mark as read</button>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
