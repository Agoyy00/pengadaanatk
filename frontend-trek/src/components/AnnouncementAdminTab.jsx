import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import "../css/Pengumuman.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

export default function AnnouncementAdminTab({ subTab = "active" }) {
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const isSuperadmin = String(currentUser?.role || "").toLowerCase() === "superadmin";

  const [announcements, setAnnouncements] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");

  // Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formPriority, setFormPriority] = useState("NORMAL");
  const [formStatus, setFormStatus] = useState("PUBLISHED");
  const [formTargetType, setFormTargetType] = useState("ALL");
  const [formTargetRoles, setFormTargetRoles] = useState(["user"]);
  const [formExpiresAt, setFormExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Read Receipts Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/announcements`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        setAnnouncements(data.data || []);
        setTotalUsers(data.total_users || 0);
      }
    } catch (err) {
      console.error("Gagal memuat pengumuman:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormTitle("");
    setFormBody("");
    setFormPriority("NORMAL");
    setFormStatus("PUBLISHED");
    setFormTargetType("ALL");
    setFormTargetRoles(["user"]);
    setFormExpiresAt("");
    setShowFormModal(true);
  };

  const openEditModal = (item) => {
    if (item.status === "PUBLISHED") {
      Swal.fire({
        icon: "warning",
        title: "Pengumuman Sudah Diterbitkan",
        text: "Pengumuman yang sudah dipublikasikan tidak dapat diubah untuk menjaga integritas statistik pembacaan.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }
    setEditingId(item.id);
    setFormTitle(item.title);
    setFormBody(item.body);
    setFormPriority(item.priority);
    setFormStatus(item.status);
    setFormTargetType(item.target_type);
    setFormTargetRoles(
      item.target_type === "ROLE" && Array.isArray(item.target_value)
        ? item.target_value
        : ["user"]
    );
    setFormExpiresAt(item.expires_at ? item.expires_at.substring(0, 16) : "");
    setShowFormModal(true);
  };

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      Swal.fire("Error", "Judul pengumuman wajib diisi.", "error");
      return;
    }
    if (!formBody.trim()) {
      Swal.fire("Error", "Isi pengumuman wajib diisi.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formTitle.trim(),
        body: formBody.trim(),
        priority: formPriority,
        status: formStatus,
        target_type: formTargetType,
        target_value: formTargetType === "ROLE" ? formTargetRoles : null,
        expires_at: formExpiresAt || null,
      };

      const url = editingId
        ? `${API_BASE}/announcements/${editingId}`
        : `${API_BASE}/announcements`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowFormModal(false);
        fetchAnnouncements();
        Swal.fire({
          icon: "success",
          title: editingId ? "Pengumuman Diperbarui" : "Pengumuman Dibuat",
          text: data.message,
          timer: 1800,
          showConfirmButton: false,
        });
      } else {
        Swal.fire("Error", data.message || "Gagal menyimpan pengumuman.", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Terjadi kesalahan server.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (id) => {
    const result = await Swal.fire({
      title: "Publikasikan Pengumuman?",
      text: "Pengumuman akan langsung disiarkan ke seluruh penerima target.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      confirmButtonText: "Ya, Terbitkan!",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${API_BASE}/announcements/${id}/publish`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchAnnouncements();
        Swal.fire("Berhasil", "Pengumuman berhasil dipublikasikan.", "success");
      } else {
        Swal.fire("Error", data.message || "Gagal mempublikasikan.", "error");
      }
    } catch {
      Swal.fire("Error", "Terjadi kesalahan server.", "error");
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus Pengumuman?",
      text: "Data pengumuman dan riwayat pembacaan akan dihapus permanen.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${API_BASE}/announcements/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchAnnouncements();
        Swal.fire("Dihapus", "Pengumuman berhasil dihapus.", "success");
      } else {
        Swal.fire("Error", data.message || "Gagal menghapus.", "error");
      }
    } catch {
      Swal.fire("Error", "Terjadi kesalahan server.", "error");
    }
  };

  const handleOpenReceipts = async (id) => {
    setLoadingReceipt(true);
    setShowReceiptModal(true);
    setReceiptData(null);
    try {
      const res = await fetch(`${API_BASE}/announcements/${id}/read-receipts`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        setReceiptData(data.data);
      }
    } catch (err) {
      console.error("Gagal load read receipts:", err);
    } finally {
      setLoadingReceipt(false);
    }
  };

  const filteredAnnouncements = announcements.filter((item) => {
    if (subTab === "active") {
      if (item.status === "ARCHIVED") return false;
    } else if (subTab === "history") {
      if (item.status !== "ARCHIVED" && (!item.expires_at || new Date(item.expires_at) >= new Date())) {
        return false;
      }
    }

    if (filterPriority !== "all" && item.priority !== filterPriority) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = (item.title || "").toLowerCase().includes(q);
      const matchBody = (item.body || "").toLowerCase().includes(q);
      return matchTitle || matchBody;
    }
    return true;
  });

  const formatDate = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div style={{ marginTop: 8 }}>
      {/* Top action bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Cari pengumuman..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "9px 14px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              minWidth: 220,
              background: "#f9fafb",
              color: "#1f2937",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#2563eb";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.08)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#cbd5e1";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              background: "#fff",
            }}
          >
            <option value="all">Semua Prioritas</option>
            <option value="NORMAL">Normal</option>
            <option value="IMPORTANT">Penting</option>
          </select>
        </div>

        {(isSuperadmin || true) && (
          <button
            onClick={openCreateModal}
            style={{
              padding: "9px 16px",
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 6px rgba(16, 185, 129, 0.2)",
            }}
          >
            + Buat Pengumuman Baru
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "#6b7280" }}>
          Memuat daftar pengumuman...
        </div>
      ) : filteredAnnouncements.length === 0 ? (
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
            Tidak ada pengumuman
          </h4>
          <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
            Gunakan tombol "+ Buat Pengumuman Baru" untuk membuat siaran ke user.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredAnnouncements.map((item) => {
            const isImportant = item.priority === "IMPORTANT";
            const isPublished = item.status === "PUBLISHED";
            const isDraft = item.status === "DRAFT";
            const readPercentage = item.read_percentage || 0;

            return (
              <div
                key={item.id}
                style={{
                  padding: "16px 20px",
                  borderRadius: 14,
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderLeft: isImportant ? "4px solid #ef4444" : "4px solid #3b82f6",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
                  transition: "all 0.2s ease-in-out",
                  transform: "translateY(0)",
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                      {isImportant && (
                        <span
                          style={{
                            background: "#fee2e2",
                            color: "#dc2626",
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          PENTING
                        </span>
                      )}
                      <span
                        style={{
                          background: isPublished ? "#dcfce7" : isDraft ? "#fef3c7" : "#f1f5f9",
                          color: isPublished ? "#15803d" : isDraft ? "#b45309" : "#475569",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {item.status}
                      </span>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                        Oleh: <b>{item.creator?.name || "Admin"}</b> • {formatDate(item.created_at)}
                      </span>
                    </div>

                    <h3 style={{ margin: "0 0 6px 0", fontSize: 16, color: "#1f2937", fontWeight: 700 }}>
                      {item.title}
                    </h3>

                    <p
                      style={{
                        margin: "0 0 10px 0",
                        color: "#4b5563",
                        fontSize: 13,
                        lineHeight: 1.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {item.body}
                    </p>

                    {/* Read Receipts preview badge */}
                    {isPublished && (
                      <div
                        onClick={() => handleOpenReceipts(item.id)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          padding: "4px 10px",
                          borderRadius: 20,
                          fontSize: 12,
                          color: "#1d4ed8",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        📊 Dibaca: {item.reads_count || 0} / {totalUsers} ({readPercentage}%)
                        <span style={{ fontSize: 10 }}>[Lihat Rincian]</span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                    {isDraft && (
                      <button
                        onClick={() => handlePublish(item.id)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          border: "none",
                          background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                          color: "white",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: "0 2px 5px rgba(22, 163, 74, 0.2)",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(22, 163, 74, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = "0 2px 5px rgba(22, 163, 74, 0.2)";
                        }}
                      >
                        🚀 Terbitkan
                      </button>
                    )}
                    {isDraft && (
                      <button
                        onClick={() => openEditModal(item)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          border: "1px solid #d1d5db",
                          background: "#ffffff",
                          color: "#374151",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f3f4f6";
                          e.currentTarget.style.borderColor = "#9ca3af";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#ffffff";
                          e.currentTarget.style.borderColor = "#d1d5db";
                        }}
                      >
                        ✏️ Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "none",
                        background: "#dc2626",
                        color: "#ffffff",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#b91c1c";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(220, 38, 38, 0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#dc2626";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.background = "#991b1b";
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.background = "#dc2626";
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.boxShadow = "0 0 0 2px rgba(220, 38, 38, 0.4)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      🗑️ Hapus
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showFormModal && (
        <div className="pengumuman-modal-overlay">
          <div
            className="modal-box-small"
            style={{
              width: "90%",
              maxWidth: 600,
              background: "#ffffff",
              borderRadius: 16,
              padding: "28px 24px",
              maxHeight: "85vh",
              overflowY: "auto",
              color: "#1f2937",
              position: "relative",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.03)",
            }}
          >
            {/* Close Button - Top Right */}
            <button
              type="button"
              onClick={() => setShowFormModal(false)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                width: 32,
                height: 32,
                borderRadius: "8px",
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                color: "#6b7280",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
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

            <div style={{ marginBottom: 20, paddingRight: 40 }}>
              <h2 style={{ margin: "0 0 6px 0", fontSize: 18, color: "#1f2937", fontWeight: 700 }}>
                {editingId ? "✏️ Edit Draft Pengumuman" : "📢 Buat Pengumuman Baru"}
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                Isi formulir berikut untuk membuat pengumuman baru.
              </p>
            </div>

            <form onSubmit={handleSaveAnnouncement}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" }}>
                  Judul Pengumuman <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Jadwal Pengambilan ATK Periode Ganjil"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    background: "#f9fafb",
                    color: "#1f2937",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" }}>
                  Isi / Pesan Pengumuman <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Tuliskan detail pengumuman yang ingin disiarkan..."
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    background: "#f9fafb",
                    color: "#1f2937",
                    fontSize: 14,
                    fontFamily: "inherit",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" }}>
                    Tingkat Prioritas
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 9,
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      background: "#f9fafb",
                      color: "#1f2937",
                      fontSize: 13,
                      outline: "none",
                    }}
                  >
                    <option value="NORMAL">Normal (Info Reguler)</option>
                    <option value="IMPORTANT">Penting (Highlight Merah)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" }}>
                    Status Publikasi
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 9,
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      background: "#f9fafb",
                      color: "#1f2937",
                      fontSize: 13,
                      outline: "none",
                    }}
                  >
                    <option value="PUBLISHED">Langsung Terbitkan</option>
                    <option value="DRAFT">Simpan sebagai Draft</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 20, paddingTop: 16, borderTop: "1px solid #e5e7eb" }}>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  style={{
                    padding: "9px 20px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    background: "#ffffff",
                    color: "#374151",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "9px 20px",
                    borderRadius: 8,
                    border: "none",
                    background: "#1e3a8a",
                    color: "#ffffff",
                    fontWeight: 700,
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontSize: 14,
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? "Menyimpan..." : "Simpan Pengumuman"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* READ RECEIPTS MODAL */}
      {showReceiptModal && (
        <div className="pengumuman-modal-overlay">
          <div
            className="pengumuman-modal-content"
            style={{
              maxWidth: "650px",
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
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#1f2937" }}>
                Statistik Pembacaan Pengumuman
              </h3>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
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

            {/* Body (scrollable) */}
            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
              {loadingReceipt ? (
                <div style={{ padding: "30px 0", textAlign: "center", color: "#6b7280" }}>
                  Memuat data pembaca...
                </div>
              ) : receiptData ? (
                <div>
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "#f0fdf4",
                      borderRadius: 8,
                      border: "1px solid #bbf7d0",
                      marginBottom: 16,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 13, color: "#166534" }}>Sudah Membaca:</span>{" "}
                      <strong>{receiptData.read_count} user</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: 13, color: "#991b1b" }}>Belum Membaca:</span>{" "}
                      <strong>{receiptData.unread_count} user</strong>
                    </div>
                  </div>

                  <h4 style={{ margin: "0 0 8px 0", fontSize: 14 }}>
                    Daftar Pengguna yang Sudah Membaca:
                  </h4>
                  <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                          <th style={{ padding: "8px 12px", textAlign: "left" }}>Nama Pengguna</th>
                          <th style={{ padding: "8px 12px", textAlign: "left" }}>Email</th>
                          <th style={{ padding: "8px 12px", textAlign: "right" }}>Waktu Baca</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receiptData.readers && receiptData.readers.length > 0 ? (
                          receiptData.readers.map((r, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "8px 12px", fontWeight: 600 }}>{r.user_name}</td>
                              <td style={{ padding: "8px 12px", color: "#64748b" }}>{r.user_email}</td>
                              <td style={{ padding: "8px 12px", textAlign: "right", color: "#64748b" }}>
                                {formatDate(r.read_at)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} style={{ padding: "20px 0", textAlign: "center", color: "#9ca3af" }}>
                              Belum ada user yang membaca pengumuman ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
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
