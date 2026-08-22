import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import "../css/Pengumuman.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

export default function AnnouncementUserTab({ subTab = "active", onUnreadChanged }) {
  const token = localStorage.getItem("token");
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const endpoint =
        subTab === "history"
          ? `${API_BASE}/me/announcements/history`
          : `${API_BASE}/me/announcements`;

      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        setAnnouncements(data.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat pengumuman:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [subTab]);

  const handleOpenDetail = async (item) => {
    setSelectedAnnouncement(item);
    try {
      const res = await fetch(`${API_BASE}/me/announcements/${item.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSelectedAnnouncement(data.data);
        if (onUnreadChanged) onUnreadChanged();
        // Update local list is_read status
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === item.id ? { ...a, is_read: true } : a))
        );
      }
    } catch (err) {
      console.error("Gagal membaca detail pengumuman:", err);
    }
  };

  const formatDate = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div style={{ marginTop: 8 }}>
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "#6b7280" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
          Memuat pengumuman...
        </div>
      ) : announcements.length === 0 ? (
        <div
          style={{
            padding: "50px 20px",
            textAlign: "center",
            background: "#f9fafb",
            borderRadius: 12,
            border: "1px dashed #e5e7eb",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>📢</div>
          <h4 style={{ margin: "0 0 6px 0", color: "#1f2937", fontWeight: 700 }}>
            {subTab === "history" ? "Belum ada riwayat pengumuman" : "Tidak ada pengumuman aktif"}
          </h4>
          <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
            {subTab === "history"
              ? "Pengumuman yang sudah kedaluwarsa akan tersimpan di sini."
              : "Semua informasi dan siaran resmi dari Admin / Superadmin akan ditampilkan di sini."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {announcements.map((item) => {
            const isImportant = item.priority === "IMPORTANT";
            const isUnread = !item.is_read;

            return (
              <div
                key={item.id}
                onClick={() => handleOpenDetail(item)}
                style={{
                  padding: "16px 20px",
                  borderRadius: 14,
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderLeft: isImportant ? "4px solid #ef4444" : isUnread ? "4px solid #22c55e" : "4px solid #cbd5e1",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
                  transition: "all 0.2s ease-in-out",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, position: "relative" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                      {isImportant && (
                        <span
                          style={{
                            background: "#fee2e2",
                            color: "#dc2626",
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          🚨 PENTING
                        </span>
                      )}
                      {isUnread && (
                        <span
                          style={{
                            background: "#dcfce7",
                            color: "#15803d",
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          ✨ BARU
                        </span>
                      )}
                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                        Oleh: <b>{item.creator?.name || "Admin/Superadmin"}</b> • {formatDate(item.published_at || item.created_at)}
                      </span>
                    </div>

                    <h3 style={{ margin: "0 0 6px 0", fontSize: 16, color: "#1f2937", fontWeight: 700 }}>
                      {item.title}
                    </h3>

                    <p
                      style={{
                        margin: 0,
                        color: "#4b5563",
                        fontSize: 14,
                        lineHeight: 1.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {item.body}
                    </p>
                  </div>

                  <button
                    type="button"
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: isImportant ? "#ef4444" : "#2563eb",
                      color: "white",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Baca Detail →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedAnnouncement && (
        <div
          className="pengumuman-modal-overlay"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <div
            className="pengumuman-modal-content"
            style={{
              maxWidth: "620px",
              width: "90%",
              maxHeight: "85vh",
              position: "relative",
            }}
          >
            {/* Header */}
            <div
              className="pengumuman-modal-header"
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "relative",
                background: "#ffffff",
                color: "#1f2937",
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
              }}
            >
              {selectedAnnouncement.priority === "IMPORTANT" && (
                <span
                  style={{
                    background: "#fee2e2",
                    color: "#dc2626",
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    marginRight: 8,
                  }}
                >
                  🚨 PENTING
                </span>
              )}
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", flex: 1, color: "#1f2937" }}>
                {selectedAnnouncement.title}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  color: "#6b7280",
                  borderRadius: "8px",
                  width: "28px",
                  height: "28px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                  e.currentTarget.style.borderColor = "#d1d5db";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#ffffff";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  padding: "8px 12px",
                  background: "#f8fafc",
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                Diterbitkan oleh: <b>{selectedAnnouncement.creator?.name || "Admin/Superadmin"}</b> •{" "}
                {formatDate(selectedAnnouncement.published_at || selectedAnnouncement.created_at)}
              </div>

              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: "#374151",
                  whiteSpace: "pre-wrap",
                }}
              >
                {selectedAnnouncement.body}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  color: "#334155",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
