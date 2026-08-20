import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";

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
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              minWidth: 220,
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
          <h4 style={{ margin: "0 0 6px 0", color: "#111827" }}>Tidak ada pengumuman</h4>
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
                  borderRadius: 12,
                  background: "#ffffff",
                  border: isImportant ? "1.5px solid #fca5a5" : "1px solid #e5e7eb",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
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

                    <h3 style={{ margin: "0 0 6px 0", fontSize: 16, color: "#111827", fontWeight: 700 }}>
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
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {isDraft && (
                      <button
                        onClick={() => handlePublish(item.id)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          border: "none",
                          background: "#16a34a",
                          color: "white",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Terbitkan
                      </button>
                    )}
                    {isDraft && (
                      <button
                        onClick={() => openEditModal(item)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                          background: "#fff",
                          color: "#334155",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "1px solid #fca5a5",
                        background: "#fff",
                        color: "#dc2626",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Hapus
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
        <div
          className="modal-overlay"
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
            style={{
              width: "90%",
              maxWidth: 600,
              background: "#fff",
              borderRadius: 14,
              padding: 24,
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>
                {editingId ? "Edit Pengumuman" : "Buat Pengumuman Baru"}
              </h2>
              <button
                onClick={() => setShowFormModal(false)}
                style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                  Judul Pengumuman *
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
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                  Isi / Pesan Pengumuman *
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
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                    Tingkat Prioritas
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 9,
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: "#fff",
                      fontSize: 13,
                    }}
                  >
                    <option value="NORMAL">Normal (Info Reguler)</option>
                    <option value="IMPORTANT">Penting (Highlight Merah)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                    Status Publikasi
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 9,
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: "#fff",
                      fontSize: 13,
                    }}
                  >
                    <option value="PUBLISHED">Langsung Terbitkan</option>
                    <option value="DRAFT">Simpan sebagai Draft</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "transparent",
                    color: "#475569",
                    fontWeight: 600,
                    cursor: "pointer",
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
                    background: "#2563eb",
                    color: "white",
                    fontWeight: 700,
                    cursor: submitting ? "not-allowed" : "pointer",
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
        <div
          className="modal-overlay"
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
            style={{
              width: "90%",
              maxWidth: 650,
              background: "#fff",
              borderRadius: 14,
              padding: 24,
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Statistik Pembacaan Pengumuman</h2>
              <button
                onClick={() => setShowReceiptModal(false)}
                style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

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

                <h4 style={{ margin: "0 0 8px 0", fontSize: 14 }}>Daftar Pengguna yang Sudah Membaca:</h4>
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

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                style={{
                  padding: "8px 18px",
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
