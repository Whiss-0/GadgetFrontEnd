import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { notificationsApi } from "../api/client";

export function useNotifications({ unreadOnly = false, limit = 30 } = {}) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestSequenceRef = useRef(0);
  const inFlightRef = useRef(null);

  const isAuthRoute = location.pathname === "/login" || location.pathname === "/register" || location.pathname.startsWith("/forgot-password") || location.pathname.startsWith("/reset-password");

  const refresh = useCallback(async () => {
    if (!isAuthenticated || isAuthRoute) return;
    const key = `${unreadOnly ? "unread" : "all"}:${limit}`;
    if (inFlightRef.current?.key === key) return inFlightRef.current.promise;

    const requestId = ++requestSequenceRef.current;
    setLoading(true);
    setError(null);
    const promise = Promise.all([
      notificationsApi.list({ unreadOnly, limit }),
      notificationsApi.unreadCount(),
    ]).then(([listResponse, countResponse]) => {
      if (requestId !== requestSequenceRef.current) return;
      setNotifications(Array.isArray(listResponse.data) ? listResponse.data : []);
      setUnreadCount(typeof countResponse.data?.unreadCount === "number" ? countResponse.data.unreadCount : 0);
    }).catch((requestError) => {
      if (requestId === requestSequenceRef.current) setError(requestError?.response?.data?.message || "Failed to load notifications.");
    }).finally(() => {
      if (requestId === requestSequenceRef.current) setLoading(false);
      if (inFlightRef.current?.requestId === requestId) inFlightRef.current = null;
    });
    inFlightRef.current = { key, requestId, promise };
    return promise;
  }, [isAuthenticated, isAuthRoute, unreadOnly, limit]);

  useEffect(() => {
    if (!isAuthenticated || isAuthRoute) {
      ++requestSequenceRef.current;
      inFlightRef.current = null;
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    void refresh();
  }, [isAuthenticated, isAuthRoute, refresh]);

  useEffect(() => {
    if (!isAuthenticated || isAuthRoute) return undefined;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const handleFocus = () => void refresh();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isAuthenticated, isAuthRoute, refresh]);

  useEffect(() => {
    if (!isAuthenticated || isAuthRoute) return undefined;
    const handleNotificationsUpdated = () => void refresh();
    window.addEventListener("gadgetstore:notifications-updated", handleNotificationsUpdated);
    return () => window.removeEventListener("gadgetstore:notifications-updated", handleNotificationsUpdated);
  }, [isAuthenticated, isAuthRoute, refresh]);

  const markRead = useCallback(async (id) => {
    try {
      await notificationsApi.markRead(id);
      ++requestSequenceRef.current;
      inFlightRef.current = null;
      setLoading(false);
      setNotifications((previous) => unreadOnly
        ? previous.filter((notification) => notification.notification_id !== id)
        : previous.map((notification) => notification.notification_id === id
          ? { ...notification, is_read: true, read_at: new Date().toISOString() }
          : notification));
      setUnreadCount((count) => Math.max(0, count - 1));
      window.dispatchEvent(new Event("gadgetstore:notifications-updated"));
    } catch {
      void refresh();
    }
  }, [refresh, unreadOnly]);

  const markAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead();
      ++requestSequenceRef.current;
      inFlightRef.current = null;
      setLoading(false);
      setNotifications((previous) => unreadOnly
        ? []
        : previous.map((notification) => ({ ...notification, is_read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
      window.dispatchEvent(new Event("gadgetstore:notifications-updated"));
    } catch {
      void refresh();
    }
  }, [refresh, unreadOnly]);

  return { notifications, unreadCount, loading, error, refresh, markRead, markAllRead };
}
