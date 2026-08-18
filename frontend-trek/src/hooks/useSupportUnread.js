import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function useSupportUnread(role) {
  const [unreadCount, setUnreadCount] = useState(0);

  const loadSupportUnread = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const activeRole = String(role || "").toLowerCase();
      if (!token || !activeRole) return;

      const res = await fetch(`${API_BASE}/support-tickets/unread-count`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "X-Active-Role": activeRole,
        },
      });
      const data = await res.json();
      if (data.success) {
        setUnreadCount(data.count || 0);
      }
    } catch (err) {
      console.error("Gagal memuat support unread count:", err);
    }
  }, [role]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSupportUnread();
    const interval = setInterval(loadSupportUnread, 15000);
    return () => clearInterval(interval);
  }, [loadSupportUnread]);

  useEffect(() => {
    const handler = (e) => {
      if (e?.detail?.count !== undefined) {
        setUnreadCount(e.detail.count);
      }
    };
    window.addEventListener("support-unread-update", handler);
    return () => window.removeEventListener("support-unread-update", handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "supportUnreadCount") {
        try {
          const val = JSON.parse(e.newValue);
          if (typeof val === "number") {
            setUnreadCount(val);
          }
        } catch {
          // ignore invalid storage value
        }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      loadSupportUnread();
    };
    window.addEventListener("support-unread-refresh", handler);
    return () => window.removeEventListener("support-unread-refresh", handler);
  }, [loadSupportUnread]);

  return { supportUnreadCount: unreadCount, loadSupportUnread, setSupportUnreadCount: setUnreadCount, refresh: loadSupportUnread };
}
