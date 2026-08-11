import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../css/layout.css";
import RoleSwitcher from "../../components/RoleSwitcher";
import SidebarLogo from "../../components/SidebarLogo";
import DesktopSidebarToggle from "../../components/DesktopSidebarToggle";
import TicketList from "../Support/TicketList";
import OpenTicket from "../Support/OpenTicket";
import TicketDetail from "../Support/TicketDetail";
import SupportNotificationDropdown from "../../components/SupportNotificationDropdown";

const API_BASE = import.meta.env.VITE_API_BASE;
const token = localStorage.getItem("token");

export default function AdminSupport() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  const sidebarMenus = [
    { label: "Dashboard Admin", to: "/dashboardadmin" },
    { label: "Verifikasi Pengajuan", to: "/verifikasi" },
    { label: "Kelola Barang ATK", to: "/kelola-barang" },
    { label: "Grafik Usulan Barang", to: "/grafik-usulan-barang" },
    { label: "Stock Opname Barang", to: "/stock-opname" },
    { label: "Support", to: "/support", active: true },
  ];

  const getPageTitle = () => {
    if (location.pathname === "/support/open-ticket") return "Buat Tiket Support Baru";
    if (location.pathname.match(/\/support\/\d+/)) return "Detail Tiket Support";
    return "Daftar Tiket Support";
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
                  if (!isActive && !isSupport) navigate(m.to);
                }}
              >
                {isSupport ? (
                  <SupportNotificationDropdown>
                    <span>{m.label}</span>
                  </SupportNotificationDropdown>
                ) : (
                  <span>{m.label}</span>
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
                Selamat datang: {JSON.parse(localStorage.getItem("user") || "{}")?.name || "Admin"}
              </div>
            </div>
          </div>
          <div className="topbar-right">
            <span>Role: </span>
            <RoleSwitcher />
          </div>
        </header>

        <section className="main-content">
          {location.pathname === "/support/open-ticket" && <OpenTicket />}
          {location.pathname.match(/\/support\/\d+/) && <TicketDetail />}
          {location.pathname === "/support" && <TicketList showCreateButton={false} />}
        </section>
      </main>
    </div>
  );
}
