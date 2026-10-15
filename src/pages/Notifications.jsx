import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";

function getNotificationIcon(type) {
  switch (type) {
    case "OrderProcessing":
      return "⚙";
    case "OrderShipped":
      return "✈";
    case "OrderDelivered":
      return "✓";
    case "OrderCancelled":
      return "✕";
    case "AdminAnnouncement":
      return "📢";
    default:
      return "ℹ";
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function Notifications() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
  } = useNotifications();

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="notifications-page-head">
        <div>
          <h1 className="text-2xl font-bold font-[var(--font-display)]">Notifications</h1>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
            Stay updated on your orders and store announcements.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            Mark all as read
          </button>
        )}
      </div>

      {loading && notifications.length === 0 ? (
        <div className="notification-page-state" role="status">
          Loading notifications…
        </div>
      ) : error ? (
        <div className="notification-page-state" role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="notification-state-action mt-2"
          >
            Try again
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="notification-page-state">
          No notifications yet. You're all caught up!
        </div>
      ) : (
        <div className="notification-page-list">
          {notifications.map((n) => (
            <article
              key={n.notification_id}
              className={`notification-page-item ${!n.is_read ? "is-unread" : ""}`}
            >
              <div className="notification-page-icon" aria-hidden="true">
                {getNotificationIcon(n.notification_type)}
              </div>

              <div className="notification-page-copy">
                <div className="notification-page-meta">
                  <strong>{n.title}</strong>
                  <time dateTime={n.created_at}>{formatDate(n.created_at)}</time>
                </div>

                <p>{n.message}</p>

                <div className="notification-page-actions">
                  {n.related_order_id && (
                    <Link
                      to="/orders"
                      onClick={() => {
                        if (!n.is_read) markRead(n.notification_id);
                      }}
                    >
                      View Order #{n.related_order_id} →
                    </Link>
                  )}

                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={() => markRead(n.notification_id)}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
