import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import DesktopSidebarToggle from "../../components/DesktopSidebarToggle";
import SidebarLogo from "../../components/SidebarLogo";
import PeriodeTimer from "../../components/PeriodeTimer";
import RoleSwitcher from "../../components/RoleSwitcher";
import useSupportUnread from "../../hooks/useSupportUnread";
import "../../css/layout.css";
import "../../css/Pengumuman.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

const normalizeRole = (role) =>
  String(role || "")
    .toLowerCase()
    .replace(/[\s_]+/g, "");

export default function Pengumuman() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const role = normalizeRole(currentUser?.role);
  const { supportUnreadCount } = useSupportUnread(role);

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [announcements, setAnnouncements] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
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
  const [loadingReceipts, setLoadingReceipts] = useState(false);

  // Safety Redirect
  useEffect(() => {
    if (!currentUser?.id) {
      navigate("/", { replace: true });
    } else if (role !== "admin" && role !== "superadmin") {
      navigate("/pengumuman-user", { replace: true });
    }
  }, [currentUser, role, navigate]);

  const sidebarMenus = useMemo(() => {
    if (role === "superadmin") {
      return [
        { label: "Dashboard Super Admin", to: "/dashboardsuperadmin" },
        { label: "Monitoring Admin & User", to: "/superadmin/monitoring" },
        { label: "Grafik Barang", to: "/superadmin/grafik-barang" },
        { label: "Grafik Belanja", to: "/superadmin/grafik-belanja" },
        { label: "Approval Pengajuan", to: "/approval" },
        { label: "Tambah & Kelola User", to: "/tambahuser" },
        { label: "Atur Periode", to: "/periode" },
        { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang" },
        { label: "Stock Opname Barang", to: "/stock-opname" },
        { label: "Pengumuman", to: "/pengumuman", active: true },
      ];
    } else {
      return [
        { label: "Dashboard Admin", to: "/dashboardadmin" },
        { label: "Verifikasi Pengajuan", to: "/verifikasi" },
        { label: "Kelola Barang ATK", to: "/kelola-barang" },
        { label: "Grafik Usulan Barang", to: "/grafik-usulan-barang" },
        { label: "Stock Opname Barang", to: "/stock-opname" },
        { label: "Pengumuman", to: "/pengumuman", active: true },
      ];
    }
  }, [role]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      let url = `${API_BASE}/announcements?`;
      if (filterStatus !== "all") url += `status=${filterStatus}&`;
      if (filterPriority !== "all") url += `priority=${filterPriority}&`;
      if (search.trim()) url += `search=${encodeURIComponent(search.trim())}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
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
    loadAnnouncements();
  }, [filterStatus, filterPriority]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadAnnouncements();
  };

  const resetForm = () => {
    setEditingId(null);
    setFormTitle("");
    setFormBody("");
    setFormPriority("NORMAL");
    setFormStatus("PUBLISHED");
    setFormTargetType("ALL");
    setFormTargetRoles(["user"]);
    setFormExpiresAt("");
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowFormModal(true);
  };

  const handleOpenEdit = (item) => {
    if (item.status === "PUBLISHED") {
      Swal.fire(
        "Tidak Dapat Diedit",
        "Pengumuman yang sudah dipublikasikan tidak dapat diedit isinya demi integritas audit.",
        "warning"
      );
      return;
    }
    setEditingId(item.id);
    setFormTitle(item.title);
    setFormBody(item.body);
    setFormPriority(item.priority || "NORMAL");
    setFormStatus(item.status || "DRAFT");
    setFormTargetType(item.target_type || "ALL");
    setFormTargetRoles(Array.isArray(item.target_value) ? item.target_value : ["user"]);
    setFormExpiresAt(item.expires_at ? item.expires_at.slice(0, 10) : "");
    setShowFormModal(true);
  };

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (!formTitle.trim() || !formBody.trim()) {
      Swal.fire("Validasi Gagal", "Judul dan isi pengumuman wajib diisi.", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: formTitle.trim(),
        body: formBody.trim(),
        priority: formPriority,
        status: formStatus,
        target_type: formTargetType,
        target_value: formTargetType === "ROLE" ? formTargetRoles : null,
        expires_at: formExpiresAt ? `${formExpiresAt} 23:59:59` : null,
      };

      const url = editingId ? `${API_BASE}/announcements/${editingId}` : `${API_BASE}/announcements`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal menyimpan pengumuman.");
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: editingId ? "Pengumuman berhasil diperbarui." : "Pengumuman berhasil disiarkan!",
        timer: 1500,
        showConfirmButton: false,
      });

      setShowFormModal(false);
      resetForm();
      loadAnnouncements();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", err.message || "Terjadi kesalahan.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (item) => {
    const res = await Swal.fire({
      title: "Publikasikan Pengumuman?",
      text: `Pengumuman "${item.title}" akan langsung disiarkan ke pengguna yang ditargetkan.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Publikasikan",
      cancelButtonText: "Batal",
    });

    if (!res.isConfirmed) return;

    try {
      const resp = await fetch(`${API_BASE}/announcements/${item.id}/publish`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.message || "Gagal publikasi.");

      Swal.fire("Berhasil", "Pengumuman telah dipublikasikan.", "success");
      loadAnnouncements();
    } catch (err) {
      Swal.fire("Error", err.message || "Gagal memproses.", "error");
    }
  };

  const handleDelete = async (item) => {
    const res = await Swal.fire({
      title: "Hapus / Arsipkan Pengumuman?",
      text: `Pengumuman "${item.title}" akan dihapus dari daftar aktif.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!res.isConfirmed) return;

    try {
      const resp = await fetch(`${API_BASE}/announcements/${item.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.message || "Gagal menghapus.");

      Swal.fire("Terhapus", "Pengumuman berhasil diarsipkan.", "success");
      loadAnnouncements();
    } catch (err) {
      Swal.fire("Error", err.message || "Gagal menghapus.", "error");
    }
  };

  const handleOpenReceipts = async (item) => {
    try {
      setShowReceiptModal(true);
      setLoadingReceipts(true);
      const res = await fetch(`${API_BASE}/announcements/${item.id}/read-receipts`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        setReceiptData(data);
      }
    } catch (err) {
      console.error("Gagal load receipts:", err);
      Swal.fire("Error", "Gagal memuat daftar pembaca.", "error");
    } finally {
      setLoadingReceipts(false);
    }
  };

  return (
    <div className="layout">
      <DesktopSidebarToggle isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      {isSidebarOpen && (
        <div className="sidebar-overlay open" onClick={() => setIsSidebarOpen(false)} />
      )}
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <SidebarLogo />
        <nav className="sidebar-menu">
          {sidebarMenus.map((m) => {
            const isActive = location.pathname === m.to || m.active;
            const isSupport = m.label === "Support";
            return (
              <div
                key={m.label}
                className={`menu-item ${isActive ? "active" : ""}`}
                style={{ cursor: isActive ? "default" : "pointer" }}
                onClick={() => {
                  if (!isActive) navigate(m.to);
                }}
              >
                {m.label}
                {isSupport && supportUnreadCount > 0 && (
                  <span className="support-badge">{supportUnreadCount}</span>
                )}
              </div>
            );
          })}
        </nav>
        <div
          className="logout"
          onClick={() => {
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            window.location.href = "/";
          }}
          style={{ cursor: "pointer" }}
        >
          Log Out
        </div>
      </aside>

      <main className={`main ${!isSidebarOpen ? "expanded" : ""}`}>
        <header className={`topbar ${!isSidebarOpen ? "expanded" : ""}`}>
          <div className="topbar-left-wrapper">
            <button
              className={`hamburger-menu ${isSidebarOpen ? "open" : ""}`}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle Sidebar"
            >
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
            <div>
              <div className="topbar-title">Manajemen Pengumuman</div>
              <div className="topbar-sub">
                Kirim informasi & pengumuman siaran satu arah kepada pemohon / pengguna sistem
              </div>
            </div>
          </div>
          <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/LogoYarsiFull.jpeg" alt="Logo Universitas YARSI" className="topbar-logo-full" />
            <PeriodeTimer typeFilter="pengajuan" />
            <PeriodeTimer typeFilter="stock_opname" />
            <span style={{ marginRight: 8 }}>Pengguna: <b>{currentUser?.name}</b></span>
            <RoleSwitcher />
          </div>
        </header>

        <section className="main-content">
          <div className="pengumuman-container">
            {/* Header Action Bar */}
            <div className="pengumuman-header-bar">
              <form onSubmit={handleSearchSubmit} className="pengumuman-search-box">
                <input
                  type="text"
                  placeholder="Cari judul atau isi pengumuman..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pengumuman-search-input"
                />
                <button type="submit" className="btn-primary-pengumuman" style={{ padding: "8px 14px" }}>
                  🔍
                </button>
              </form>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                >
                  <option value="all">Semua Status</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                </select>

                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                >
                  <option value="all">Semua Prioritas</option>
                  <option value="IMPORTANT">Penting (Important)</option>
                  <option value="NORMAL">Normal</option>
                </select>

                <button onClick={handleOpenCreate} className="btn-primary-pengumuman">
                  ➕ Buat Pengumuman Baru
                </button>
              </div>
            </div>

            {/* Announcements List */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                Memuat daftar pengumuman...
              </div>
            ) : announcements.length === 0 ? (
              <div
                style={{
                  background: "#ffffff",
                  padding: "40px",
                  borderRadius: "12px",
                  textAlign: "center",
                  color: "#94a3b8",
                  border: "1px solid #e2e8f0",
                }}
              >
                Belum ada pengumuman yang sesuai dengan filter. Klik "Buat Pengumuman Baru" untuk memulai.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {announcements.map((item) => {
                  const isImportant = item.priority === "IMPORTANT";
                  const isPublished = item.status === "PUBLISHED";
                  const readRatio = totalUsers > 0 ? Math.round(((item.reads_count || 0) / totalUsers) * 100) : 0;

                  return (
                    <div
                      key={item.id}
                      className={`pengumuman-card ${isImportant ? "important" : "normal"}`}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                            <span className={isImportant ? "badge-priority-important" : "badge-priority-normal"}>
                              {isImportant ? "🔴 PENTING" : "🔵 NORMAL"}
                            </span>
                            <span className={isPublished ? "badge-status-published" : "badge-status-draft"}>
                              {isPublished ? "PUBLISHED" : "DRAFT"}
                            </span>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>
                              Target: <b>{item.target_type === "ALL" ? "Semua Pengguna" : item.target_type === "ROLE" ? `Role: ${item.target_value?.join(", ")}` : "Spesifik User"}</b>
                            </span>
                          </div>
                          <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#0f172a", fontWeight: "700" }}>
                            {item.title}
                          </h3>
                        </div>

                        {/* Read Receipts Stats Badge */}
                        <button
                          type="button"
                          onClick={() => handleOpenReceipts(item)}
                          title="Lihat siapa saja yang sudah membaca"
                          style={{
                            background: "#f1f5f9",
                            border: "1px solid #cbd5e1",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#334155",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          👁️ {item.reads_count || 0} dibaca ({readRatio}%)
                        </button>
                      </div>

                      <div className="pengumuman-body-text">{item.body}</div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "12px", fontSize: "12px", color: "#64748b" }}>
                        <div>
                          Dibuat oleh <b>{item.creator?.name || "Admin"}</b> •{" "}
                          {item.published_at ? `Disiarkan: ${new Date(item.published_at).toLocaleString("id-ID")}` : `Dibuat: ${new Date(item.created_at).toLocaleDateString("id-ID")}`}
                          {item.expires_at && ` • Berakhir: ${new Date(item.expires_at).toLocaleDateString("id-ID")}`}
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          {!isPublished && (
                            <>
                              <button
                                type="button"
                                onClick={() => handlePublish(item)}
                                style={{
                                  padding: "5px 10px",
                                  background: "#059669",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                }}
                              >
                                📢 Publikasikan
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(item)}
                                style={{
                                  padding: "5px 10px",
                                  background: "#f1f5f9",
                                  color: "#334155",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                }}
                              >
                                ✏️ Edit
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            style={{
                              padding: "5px 10px",
                              background: "#fee2e2",
                              color: "#dc2626",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: "pointer",
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
          </div>
        </section>
      </main>

      {/* CREATE / EDIT MODAL */}
      {showFormModal && (
        <div className="pengumuman-modal-overlay">
          <div className="pengumuman-modal-content">
            <div className="pengumuman-modal-header">
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>
                {editingId ? "✏️ Edit Draft Pengumuman" : "📢 Buat Pengumuman Baru"}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  color: "#fff",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} style={{ padding: "20px" }}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                  Judul Pengumuman *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pengambilan ATK Semester Ganjil Telah Dibuka"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13.5px",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    Prioritas
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                    }}
                  >
                    <option value="NORMAL">🔵 Normal</option>
                    <option value="IMPORTANT">🔴 Penting (Highlight Merah)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    Status Pengumuman
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                    }}
                  >
                    <option value="PUBLISHED">📢 Langsung Siarkan (Published)</option>
                    <option value="DRAFT">📝 Simpan Sebagai Draft</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    Target Penerima
                  </label>
                  <select
                    value={formTargetType}
                    onChange={(e) => setFormTargetType(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                    }}
                  >
                    <option value="ALL">Semua Pengguna (Broadcast)</option>
                    <option value="ROLE">Role Pengguna Tertentu</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    Tanggal Berakhir Tayang (Opsional)
                  </label>
                  <input
                    type="date"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                    }}
                  />
                </div>
              </div>

              {formTargetType === "ROLE" && (
                <div style={{ marginBottom: "14px", background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                    Pilih Target Role:
                  </label>
                  <div style={{ display: "flex", gap: "16px", fontSize: "13px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={formTargetRoles.includes("user")}
                        onChange={(e) => {
                          if (e.target.checked) setFormTargetRoles([...formTargetRoles, "user"]);
                          else setFormTargetRoles(formTargetRoles.filter((r) => r !== "user"));
                        }}
                      />
                      Pemohon / User
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={formTargetRoles.includes("admin")}
                        onChange={(e) => {
                          if (e.target.checked) setFormTargetRoles([...formTargetRoles, "admin"]);
                          else setFormTargetRoles(formTargetRoles.filter((r) => r !== "admin"));
                        }}
                      />
                      Admin
                    </label>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                  Isi Pesan Pengumuman *
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Tuliskan isi pengumuman dengan lengkap di sini..."
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13.5px",
                    lineHeight: 1.5,
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  style={{
                    padding: "8px 16px",
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary-pengumuman"
                >
                  {submitting ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan & Siarkan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* READ RECEIPTS MODAL */}
      {showReceiptModal && (
        <div className="pengumuman-modal-overlay">
          <div className="pengumuman-modal-content" style={{ maxWidth: "600px" }}>
            <div className="pengumuman-modal-header">
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>
                👁️ Statistik Keterbacaan Pengumuman
              </h3>
              <button
                onClick={() => setShowReceiptModal(false)}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  color: "#fff",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "20px" }}>
              {loadingReceipts || !receiptData ? (
                <p style={{ color: "#64748b", textAlign: "center" }}>Memuat status pembacaan...</p>
              ) : (
                <>
                  <div style={{ marginBottom: "16px" }}>
                    <strong style={{ fontSize: "15px", color: "#0f172a" }}>
                      {receiptData.announcement?.title}
                    </strong>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                      Sudah dibaca oleh <b>{receiptData.total_read}</b> pengguna • Belum dibaca oleh <b>{receiptData.total_unread}</b> pengguna
                    </div>
                  </div>

                  <h4 style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b", margin: "0 0 8px 0" }}>
                    Daftar Pengguna yang Sudah Membaca ({receiptData.readers?.length || 0}):
                  </h4>
                  <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "16px" }}>
                    {receiptData.readers?.length === 0 ? (
                      <p style={{ padding: "12px", color: "#94a3b8", fontStyle: "italic", margin: 0, fontSize: "12px" }}>
                        Belum ada pengguna yang membaca pengumuman ini.
                      </p>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569" }}>
                            <th style={{ padding: "8px" }}>Nama Pengguna</th>
                            <th style={{ padding: "8px" }}>Unit</th>
                            <th style={{ padding: "8px" }}>Waktu Dibaca</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receiptData.readers.map((r) => (
                            <tr key={r.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "8px", fontWeight: "600" }}>{r.user?.name}</td>
                              <td style={{ padding: "8px" }}>{r.user?.unit || "-"}</td>
                              <td style={{ padding: "8px", color: "#059669" }}>
                                {new Date(r.read_at).toLocaleString("id-ID")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {receiptData.unread_users?.length > 0 && (
                    <>
                      <h4 style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b", margin: "0 0 8px 0" }}>
                        Belum Membaca ({receiptData.unread_users.length}):
                      </h4>
                      <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                          <thead>
                            <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569" }}>
                              <th style={{ padding: "8px" }}>Nama Pengguna</th>
                              <th style={{ padding: "8px" }}>Unit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {receiptData.unread_users.map((u) => (
                              <tr key={u.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "8px" }}>{u.name}</td>
                                <td style={{ padding: "8px", color: "#64748b" }}>{u.unit || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
