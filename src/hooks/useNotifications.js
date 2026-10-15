import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { notificationsApi } from "../api/client";

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isFetchingRef = useRef(false);

  // Check if current route is auth-related (do not poll)
  const isAuthRoute =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname.startsWith("/forgot-password") ||
    location.pathname.startsWith("/reset-password");

  const refresh = useCallback(async () => {
    if (!isAuthenticated || isAuthRoute || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setError(null);
    try {
      const [listRes, countRes] = await Promise.all([
        notificationsApi.list({ limit: 30 }),
        notificationsApi.unreadCount(),
      ]);
      setNotifications(Array.isArray(listRes.data) ? listRes.data : []);
      setUnreadCount(typeof countRes.data?.unreadCount === "number" ? countRes.data.unreadCount : 0);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load notifications.");
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [isAuthenticated, isAuthRoute]);

  // Initial load
  useEffect(() => {
    if (!isAuthenticated || isAuthRoute) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    refresh();
  }, [isAuthenticated, isAuthRoute, refresh]);

  // Polling every 30 seconds while page is visible
  useEffect(() => {
    if (!isAuthenticated || isAuthRoute) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    const handleFocus = () => {
      refresh();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isAuthenticated, isAuthRoute, refresh]);

  const markRead = useCallback(async (id) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Re-sync with server on failure
      refresh();
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch {
      refresh();
    }
  }, [refresh]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
  };
}
