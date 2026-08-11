import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE;
const token = localStorage.getItem("token");

export default function SupportNotificationDropdown({ children, onNavigate }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/support-tickets/unread-counts`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        setGroups(data.groups || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Gagal memuat grup notifikasi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
    const interval = setInterval(loadGroups, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRowClick = async (ticketId) => {
    setOpen(false);
    if (onNavigate) onNavigate(ticketId);
    try {
      await fetch(`${API_BASE}/support-tickets/${ticketId}/mark-read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
    } catch (err) {
      console.error("Gagal menandai tiket sebagai dibaca:", err);
    }
    loadGroups();
    navigate(`/support/${ticketId}`);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return "Baru saja";
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="support-dropdown-wrapper" ref={dropdownRef} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ cursor: "pointer", position: "relative", display: "inline-flex" }}
      >
        {children}
        {total > 0 && (
          <span className="support-badge">{total > 99 ? "99+" : total}</span>
        )}
      </div>

      {open && (
        <div className="support-dropdown-panel">
          <div className="support-dropdown-header">
            <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Notifikasi Support</span>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 18,
                color: "#64748b",
                padding: 0,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {loading ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
              Memuat...
            </div>
          ) : groups.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>
              Semua notifikasi sudah dibaca
            </div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Perihal Tiket</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Belum Dibaca</th>
                    <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Terakhir</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr
                      key={g.ticket_id}
                      onClick={() => handleRowClick(g.ticket_id)}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: 600, maxWidth: 220 }}>
                        <div style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {g.subject}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#dc2626",
                          color: "#fff",
                          borderRadius: 999,
                          padding: "2px 8px",
                          fontSize: 11,
                          fontWeight: 700,
                          minWidth: 24,
                        }}>
                          {g.count}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "#64748b", fontSize: 12, whiteSpace: "nowrap" }}>
                        {formatTime(g.last_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
