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
              <div className="support-tab-container">
                <button
                  type="button"
                  onClick={() => handleTabChange("tiket")}
                  className={`support-tab-btn ${currentTab === "tiket" ? "active" : ""}`}
                >
                  <span>🎫 Daftar Tiket Support</span>
                  {supportUnreadCount > 0 && (
                    <span
                      className="support-tab-badge"
                      style={{
                        background: currentTab === "tiket" ? "#ffffff" : "#ef4444",
                        color: currentTab === "tiket" ? "#1e3a8a" : "#ffffff",
                      }}
                    >
                      {supportUnreadCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange("pengumuman-aktif")}
                  className={`support-tab-btn ${currentTab === "pengumuman-aktif" ? "active" : ""}`}
                >
                  <span>📢 Pengumuman Aktif</span>
                  {announcementUnreadCount > 0 && (
                    <span
                      className="support-tab-badge"
                      style={{
                        background: currentTab === "pengumuman-aktif" ? "#ffffff" : "#16a34a",
                        color: currentTab === "pengumuman-aktif" ? "#1e3a8a" : "#ffffff",
                      }}
                    >
                      {announcementUnreadCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange("pengumuman-riwayat")}
                  className={`support-tab-btn ${currentTab === "pengumuman-riwayat" ? "active" : ""}`}
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
