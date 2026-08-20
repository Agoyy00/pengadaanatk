import React, { useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import "../../css/layout.css";
import RoleSwitcher from "../../components/RoleSwitcher";
import SidebarLogo from "../../components/SidebarLogo";
import DesktopSidebarToggle from "../../components/DesktopSidebarToggle";
import TicketList from "../Support/TicketList";
import OpenTicket from "../Support/OpenTicket";
import TicketDetail from "../Support/TicketDetail";
import AnnouncementUserTab from "../../components/AnnouncementUserTab";
import useSupportUnread from "../../hooks/useSupportUnread";
import useAnnouncementUnread from "../../hooks/useAnnouncementUnread";

export default function UserSupport() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "tiket";

  const { supportUnreadCount } = useSupportUnread("user");
  const { unreadCount: announcementUnreadCount, refreshUnread } = useAnnouncementUnread();
  const totalUnreadCount = (supportUnreadCount || 0) + (announcementUnreadCount || 0);

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  const sidebarMenus = [
    { label: "Dashboard User", to: "/dashboarduser" },
    { label: "Stock Opname Barang", to: "/stock-opname" },
    { label: "Buat Pengajuan Baru", to: "/pengajuan" },
    { label: "Riwayat Pengajuan", to: "/riwayat" },
    { label: "Template Dokumen", to: "/template-dokumen" },
    { label: "Support", to: "/support", active: true },
  ];

  const handleTabChange = (newTab) => {
    setSearchParams({ tab: newTab });
  };

  const getPageTitle = () => {
    if (location.pathname === "/support/open-ticket") return "Buat Tiket Support Baru";
    if (location.pathname.match(/\/support\/\d+/)) return "Detail Tiket Support";
    if (currentTab === "pengumuman-aktif") return "Pengumuman Aktif";
    if (currentTab === "pengumuman-riwayat") return "Riwayat Pengumuman";
    return "Support & Pengumuman";
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
            const isActive = m.active || location.pathname === m.to;
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
                <span>{m.label}</span>
                {isSupport && totalUnreadCount > 0 && (
                  <span className="support-badge">{totalUnreadCount}</span>
                )}
              </div>
            );
          })}
        </nav>
        <div className="logout" style={{ cursor: "pointer" }} onClick={() => {
          localStorage.removeItem("user");
          window.location.href = "/";
        }}>
          Log Out
        </div>
      </aside>

      <main className={`main ${!isSidebarOpen ? "expanded" : ''}`}>
        <header className={`topbar ${!isSidebarOpen ? 'expanded' : ''}`}>
          <div className="topbar-left-wrapper">
            <button className={`hamburger-menu ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(!isSidebarOpen)} aria-label="Toggle Sidebar">
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
            <div>
              <div className="topbar-title">{getPageTitle()}</div>
              <div className="topbar-sub">
                Selamat datang: {JSON.parse(localStorage.getItem("user") || "{}")?.name || "User"}
              </div>
            </div>
          </div>
          <div className="topbar-right">
            <img src="/LogoYarsiFull.jpeg" alt="Logo Universitas YARSI" className="topbar-logo-full" />
            <span>Role: </span>
            <RoleSwitcher />
          </div>
        </header>

        <section className="main-content">
          {location.pathname === "/support/open-ticket" && <OpenTicket />}
          {location.pathname.match(/\/support\/\d+/) && <TicketDetail />}
          {location.pathname === "/support" && (
            <div>
              {/* Tab Navigation Wrapper */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  borderBottom: "2px solid #e5e7eb",
                  marginBottom: 20,
                  paddingBottom: 4,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleTabChange("tiket")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 18px",
                    fontWeight: 600,
                    borderRadius: 10,
                    border: "none",
                    backgroundColor: currentTab === "tiket" ? "#1e40af" : "transparent",
                    color: currentTab === "tiket" ? "#ffffff" : "#6b7280",
                    cursor: "pointer",
                    boxShadow: currentTab === "tiket" ? "0 4px 12px rgba(30, 64, 175, 0.2)" : "none",
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  <span>🎫 Daftar Tiket Support</span>
                  {supportUnreadCount > 0 && (
                    <span
                      style={{
                        background: currentTab === "tiket" ? "#ffffff" : "#ef4444",
                        color: currentTab === "tiket" ? "#1e40af" : "#ffffff",
                        padding: "2px 6px",
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {supportUnreadCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange("pengumuman-aktif")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 18px",
                    fontWeight: 600,
                    borderRadius: 10,
                    border: "none",
                    backgroundColor: currentTab === "pengumuman-aktif" ? "#1e40af" : "transparent",
                    color: currentTab === "pengumuman-aktif" ? "#ffffff" : "#6b7280",
                    cursor: "pointer",
                    boxShadow: currentTab === "pengumuman-aktif" ? "0 4px 12px rgba(30, 64, 175, 0.2)" : "none",
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  <span>📢 Pengumuman Aktif</span>
                  {announcementUnreadCount > 0 && (
                    <span
                      style={{
                        background: currentTab === "pengumuman-aktif" ? "#ffffff" : "#16a34a",
                        color: currentTab === "pengumuman-aktif" ? "#1e40af" : "#ffffff",
                        padding: "2px 6px",
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {announcementUnreadCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange("pengumuman-riwayat")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 18px",
                    fontWeight: 600,
                    borderRadius: 10,
                    border: "none",
                    backgroundColor: currentTab === "pengumuman-riwayat" ? "#1e40af" : "transparent",
                    color: currentTab === "pengumuman-riwayat" ? "#ffffff" : "#6b7280",
                    cursor: "pointer",
                    boxShadow: currentTab === "pengumuman-riwayat" ? "0 4px 12px rgba(30, 64, 175, 0.2)" : "none",
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  <span>📁 Riwayat Pengumuman</span>
                </button>
              </div>

              {/* Tab Content */}
              {currentTab === "tiket" && <TicketList showCreateButton={true} />}
              {currentTab === "pengumuman-aktif" && (
                <AnnouncementUserTab subTab="active" onUnreadChanged={refreshUnread} />
              )}
              {currentTab === "pengumuman-riwayat" && (
                <AnnouncementUserTab subTab="history" onUnreadChanged={refreshUnread} />
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
