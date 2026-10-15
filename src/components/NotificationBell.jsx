import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";

function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
  } = useNotifications();

  // Close dropdown on outside click or escape
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const previewList = notifications.slice(0, 8);

  const handleItemClick = async (n) => {
    if (!n.is_read) {
      await markRead(n.notification_id);
    }
    setOpen(false);
    if (n.related_order_id) {
      navigate("/orders");
    }
  };

  return (
    <div className="notification-bell-wrap" ref={containerRef}>
      <button
        type="button"
        className="notification-bell"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((prev) => !prev)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          stroke="currentColor"
          className="w-5 h-5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge" aria-hidden="true">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-popover" role="dialog" aria-label="Recent notifications">
          <div className="notification-popover-head">
            <div>
              <strong>Notifications</strong>
              {unreadCount > 0 && <span>{unreadCount} unread</span>}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-mark-all"
                onClick={markAllRead}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-popover-list">
            {loading && notifications.length === 0 ? (
              <div className="notification-popover-state">Loading notifications…</div>
            ) : previewList.length === 0 ? (
              <div className="notification-popover-state">No notifications yet.</div>
            ) : (
              previewList.map((n) => (
                <button
                  type="button"
                  key={n.notification_id}
                  className={`notification-popover-item ${!n.is_read ? "is-unread" : ""}`}
                  onClick={() => handleItemClick(n)}
                >
                  <span className="notification-dot" aria-hidden="true" />
                  <span>
                    <strong>{n.title}</strong>
                    <span>{n.message}</span>
                    <small>{formatRelativeTime(n.created_at)}</small>
                  </span>
                </button>
              ))
            )}
          </div>

          <Link
            to="/notifications"
            className="notification-view-all"
            onClick={() => setOpen(false)}
          >
            View all notifications →
          </Link>
        </div>
      )}
    </div>
  );
}
