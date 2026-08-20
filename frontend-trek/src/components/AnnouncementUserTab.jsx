import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";

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
          <h4 style={{ margin: "0 0 6px 0", color: "#111827" }}>
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
                  borderRadius: 12,
                  background: isUnread ? "#f0fdf4" : "#ffffff",
                  border: isImportant
                    ? "2px solid #ef4444"
                    : isUnread
                    ? "1.5px solid #86efac"
                    : "1px solid #e5e7eb",
                  boxShadow: isUnread
                    ? "0 4px 12px rgba(34, 197, 94, 0.12)"
                    : "0 1px 3px rgba(0, 0, 0, 0.05)",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
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

                    <h3 style={{ margin: "0 0 6px 0", fontSize: 16, color: "#111827", fontWeight: 700 }}>
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
          className="modal-overlay"
          onClick={() => setSelectedAnnouncement(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            className="modal-box-small"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "90%",
              maxWidth: 620,
              background: "#fff",
              borderRadius: 14,
              padding: 24,
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                {selectedAnnouncement.priority === "IMPORTANT" && (
                  <span
                    style={{
                      background: "#fee2e2",
                      color: "#dc2626",
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      display: "inline-block",
                      marginBottom: 6,
                    }}
                  >
                    🚨 PENGUMUMAN PENTING
                  </span>
                )}
                <h2 style={{ margin: 0, fontSize: 20, color: "#111827" }}>
                  {selectedAnnouncement.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 20,
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
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
                marginBottom: 24,
              }}
            >
              {selectedAnnouncement.body}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: "#2563eb",
                  color: "white",
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
