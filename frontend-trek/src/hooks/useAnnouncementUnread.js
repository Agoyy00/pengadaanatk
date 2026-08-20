import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

export default function useAnnouncementUnread() {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/me/announcements/unread-count`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      // silent fail
    }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, []);

  return { unreadCount, refreshUnread: fetchUnread };
}
