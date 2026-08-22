import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DesktopSidebarToggle from "../../components/DesktopSidebarToggle";
import SidebarLogo from "../../components/SidebarLogo";
import PeriodeTimer from "../../components/PeriodeTimer";
import RoleSwitcher from "../../components/RoleSwitcher";
import useSupportUnread from "../../hooks/useSupportUnread";
import useAnnouncementUnread from "../../hooks/useAnnouncementUnread";
import "../../css/layout.css";
import "../../css/Pengumuman.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

const normalizeRole = (role) =>
  String(role || "")
    .toLowerCase()
    .replace(/[\s_]+/g, "");

export default function PengumumanUser() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const role = normalizeRole(currentUser?.role);
  const { supportUnreadCount } = useSupportUnread(role);
  const { unreadCount, refreshUnread } = useAnnouncementUnread();

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [announcements, setAnnouncements] = useState([]);
  const [historyAnnouncements, setHistoryAnnouncements] = useState([]);
  const [activeTab, setActiveTab] = useState("active"); // 'active' | 'history'
  const [loading, setLoading] = useState(false);

  // Detail Modal
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  // Safety Redirect
  useEffect(() => {
    if (!currentUser?.id) {
      navigate("/", { replace: true });
    }
  }, [currentUser, navigate]);

  const sidebarMenus = useMemo(() => {
    return [
      { label: "Dashboard User", to: "/dashboarduser" },
      { label: "Stock Opname Barang", to: "/stock-opname" },
      { label: "Buat Pengajuan Baru", to: "/pengajuan" },
      { label: "Riwayat Pengajuan", to: "/riwayat" },
      { label: "Pengumuman", to: "/pengumuman-user", active: true },
      { label: "Template Dokumen", to: "/template-dokumen" },
      { label: "Support", to: "/support" },
    ];
  }, []);

  const loadActiveAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/me/announcements`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        setAnnouncements(data.data || []);
      }
    } catch (err) {
      console.error("Gagal load pengumuman aktif:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/me/announcements/history`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        setHistoryAnnouncements(data.data || []);
      }
    } catch (err) {
      console.error("Gagal load histori pengumuman:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "active") {
      loadActiveAnnouncements();
    } else {
      loadHistoryAnnouncements();
    }
  }, [activeTab]);

  const handleOpenDetail = async (item) => {
    setSelectedAnnouncement(item);

    // Auto mark as read via GET /api/me/announcements/{id}
    try {
      await fetch(`${API_BASE}/me/announcements/${item.id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

      // Update local state to read
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, is_read: true } : a))
      );
      setHistoryAnnouncements((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, is_read: true } : a))
      );

      refreshUnread();
    } catch (err) {
      // silent
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
            const isPengumuman = m.label === "Pengumuman";
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
                {isPengumuman && unreadCount > 0 && (
                  <span className="support-badge" style={{ background: "#ef4444" }}>
                    {unreadCount}
                  </span>
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
              <div className="topbar-title">Pengumuman & Informasi</div>
              <div className="topbar-sub">
                Informasi dan pemberitahuan resmi dari Admin Pengadaan ATK
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
            {/* Tabs */}
            <div style={{ display: "flex", gap: "10px", borderBottom: "2px solid #e2e8f0", paddingBottom: "8px" }}>
              <button
                onClick={() => setActiveTab("active")}
                style={{
                  padding: "8px 18px",
                  background: activeTab === "active" ? "#1e3a8a" : "transparent",
                  color: activeTab === "active" ? "#ffffff" : "#64748b",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontSize: "13.5px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                📢 Pengumuman Aktif
                {unreadCount > 0 && (
                  <span style={{ background: "#ef4444", color: "#fff", padding: "1px 7px", borderRadius: "10px", fontSize: "11px" }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("history")}
                style={{
                  padding: "8px 18px",
                  background: activeTab === "history" ? "#1e3a8a" : "transparent",
                  color: activeTab === "history" ? "#ffffff" : "#64748b",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "700",
                  cursor: "pointer",
                  fontSize: "13.5px",
                }}
              >
                📜 Riwayat Semua Pengumuman
              </button>
            </div>

            {/* Content List */}
            {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
          Memuat pengumuman...
        </div>
            ) : (activeTab === "active" ? announcements : historyAnnouncements).length === 0 ? (
              <div
                style={{
                  background: "#f9fafb",
                  padding: "40px",
                  borderRadius: "12px",
                  textAlign: "center",
                  color: "#6b7280",
                  border: "1px dashed #e5e7eb",
                }}
              >
                {activeTab === "active"
                  ? "Tidak ada pengumuman baru saat ini."
                  : "Belum ada riwayat pengumuman lampau."}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                 {(activeTab === "active" ? announcements : historyAnnouncements).map((item) => {
                   const isImportant = item.priority === "IMPORTANT";
                   return (
                     <div
                       key={item.id}
                       className={`pengumuman-card ${isImportant ? "important" : "normal"}`}
                       style={{ cursor: "pointer" }}
                       onClick={() => handleOpenDetail(item)}
                     >
                       <div className="pengumuman-card-left">
                         <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                           <span className={isImportant ? "badge-priority-important" : "badge-priority-normal"}>
                             {isImportant ? "🔴 PENTING" : "🔵 INFO"}
                           </span>
                           {!item.is_read && (
                             <span style={{ background: "#22c55e", color: "#fff", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "700" }}>
                               BARU
                             </span>
                           )}
                         </div>
                         <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#0f172a", fontWeight: "700" }}>
                           {item.title}
                         </h3>
                         <div className="pengumuman-body-text" style={{ maxHeight: "72px", overflow: "hidden", textOverflow: "ellipsis" }}>
                           {item.body}
                         </div>
                         <div className="pengumuman-card-meta">
                           <span>Oleh: <b>{item.creator?.name || "Admin Pengadaan"}</b></span>
                         </div>
                       </div>

                       <div className="pengumuman-card-right">
                         <div style={{ textAlign: "center" }}>
                           <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>
                             {item.published_at ? new Date(item.published_at).toLocaleDateString("id-ID", { dateStyle: "long" }) : "-"}
                           </div>
                           <div style={{ fontSize: "12px", color: "#2563eb", fontWeight: "600" }}>
                             Baca Selengkapnya ➔
                           </div>
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

      {/* DETAIL READ-ONLY MODAL */}
      {selectedAnnouncement && (
        <div className="pengumuman-modal-overlay">
          <div className="pengumuman-modal-content">
            <div className="pengumuman-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className={selectedAnnouncement.priority === "IMPORTANT" ? "badge-priority-important" : "badge-priority-normal"}>
                  {selectedAnnouncement.priority === "IMPORTANT" ? "🔴 PENTING" : "🔵 INFO"}
                </span>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#1f2937" }}>
                  {selectedAnnouncement.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                style={{
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

            <div style={{ padding: "24px" }}>
              <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
                Disiarkan oleh: <b>{selectedAnnouncement.creator?.name || "Admin Pengadaan"}</b> •{" "}
                {selectedAnnouncement.published_at ? new Date(selectedAnnouncement.published_at).toLocaleString("id-ID") : "-"}
              </div>

              <div className="pengumuman-body-text" style={{ fontSize: "14.5px", marginBottom: "24px" }}>
                {selectedAnnouncement.body}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setSelectedAnnouncement(null)}
                  style={{
                    padding: "8px 20px",
                    background: "#1e3a8a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "13.5px",
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
