import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import "../../css/layout.css";
import RoleSwitcher from "../../components/RoleSwitcher";
import SidebarLogo from "../../components/SidebarLogo";
import DesktopSidebarToggle from "../../components/DesktopSidebarToggle";
import TicketList from "./TicketList";
import OpenTicket from "./OpenTicket";
import TicketDetail from "./TicketDetail";

export default function Support() {
  const navigate = useNavigate();
  const location = useLocation();
  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  const sidebarMenus = [
    { label: "Dashboard Super Admin", to: "/dashboardsuperadmin" },
    { label: "Monitoring Admin", to: "/superadmin/monitoring-admin" },
    { label: "Monitoring User", to: "/superadmin/monitoring-user" },
    { label: "Grafik Barang", to: "/superadmin/grafik-barang" },
    { label: "Grafik Belanja", to: "/superadmin/grafik-belanja" },
    { label: "Approval Pengajuan", to: "/approval" },
    { label: "Tambah & Kelola User", to: "/tambahuser" },
    { label: "Atur Periode", to: "/periode" },
    { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang" },
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
                Selamat datang: {currentUser?.name || "Super Admin"}
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
          {location.pathname === "/support" && <TicketList />}
        </section>
      </main>
    </div>
  );
}
