import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";

function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const elapsed = Math.max(0, Date.now() - date.getTime());
  if (elapsed < 60_000) return "Just now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`;
  if (elapsed < 604_800_000) return `${Math.floor(elapsed / 86_400_000)}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, error, refresh, markRead, markAllRead } = useNotifications();
  const previewList = notifications.slice(0, 6);

  useEffect(() => {
    if (!open) return undefined;
    const frame = window.requestAnimationFrame(() => popoverRef.current?.focus());
    function handlePointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleItemClick(notification) {
    if (!notification.is_read) await markRead(notification.notification_id);
    setOpen(false);
    if (notification.related_order_id) navigate("/orders");
  }

  const unreadLabel = `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`;

  return (
    <div className="notification-bell-wrap" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="notification-bell"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadLabel}` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="notification-popover"
        onClick={() => setOpen((previous) => !previous)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && <span className="notification-badge" aria-hidden="true">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>

      {open && (
        <section id="notification-popover" ref={popoverRef} className="notification-popover" role="dialog" aria-labelledby="notification-popover-title" tabIndex={-1}>
          <header className="notification-popover-head">
            <div className="notification-popover-heading">
              <span className="notification-eyebrow">Your updates</span>
              <h2 id="notification-popover-title">Notifications</h2>
              <span className="notification-unread-summary">{unreadCount > 0 ? unreadLabel : "You’re all caught up"}</span>
            </div>
            {unreadCount > 0 && (
              <button type="button" className="notification-mark-all" onClick={() => void markAllRead()}>
                Mark all read
              </button>
            )}
          </header>

          <div className="notification-popover-list" aria-busy={loading}>
            {loading && notifications.length === 0 ? (
              <div className="notification-popover-state" role="status"><span className="notification-loader" aria-hidden="true" />Loading your updates…</div>
            ) : error && notifications.length === 0 ? (
              <div className="notification-popover-state notification-popover-error" role="alert">
                <strong>Notifications couldn’t load</strong>
                <span>{error}</span>
                <button type="button" className="notification-state-action" onClick={() => void refresh()}>Try again</button>
              </div>
            ) : previewList.length === 0 ? (
              <div className="notification-popover-state notification-popover-empty">
                <span className="notification-empty-icon" aria-hidden="true">✓</span>
                <strong>All caught up</strong>
                <span>Order updates and announcements will show up here.</span>
              </div>
            ) : (
              <>
                {error && <p className="notification-inline-warning" role="status">Showing saved updates. Refresh when you’re back online.</p>}
                {previewList.map((notification) => (
                  <button
                    type="button"
                    key={notification.notification_id}
                    className={`notification-popover-item ${!notification.is_read ? "is-unread" : ""}`}
                    onClick={() => void handleItemClick(notification)}
                  >
                    <span className="notification-dot" aria-hidden="true" />
                    <span className="notification-popover-copy">
                      <span className="notification-popover-item-top">
                        <strong>{notification.title}</strong>
                        <time dateTime={notification.created_at} title={notification.created_at ? new Date(notification.created_at).toLocaleString() : undefined}>{formatRelativeTime(notification.created_at)}</time>
                      </span>
                      <span className="notification-popover-message">{notification.message}</span>
                      {notification.related_order_id && <span className="notification-related-order">Order #{notification.related_order_id}</span>}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>

          <Link to="/notifications" className="notification-view-all" onClick={() => setOpen(false)}>
            Open notification inbox <span aria-hidden="true">→</span>
          </Link>
        </section>
      )}
    </div>
  );
}
