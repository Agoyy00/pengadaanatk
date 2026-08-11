import DesktopSidebarToggle from '../components/DesktopSidebarToggle';
import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import "../css/layout.css";
import RoleSwitcher from "../components/RoleSwitcher";
import PeriodeTimer from "../components/PeriodeTimer";


const normalizeRole = (role) =>
  String(role || "")
    .toLowerCase()
    .replace(/[\s_]+/g, "");

import SidebarLogo from "../components/SidebarLogo";

export default function TemplateDokumen() {
  const navigate = useNavigate();
  const location = useLocation();

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const role = normalizeRole(currentUser?.role);

  const token = localStorage.getItem("token");
  const API_BASE = import.meta.env.VITE_API_BASE;
  const [importLoading, setImportLoading] = useState(false);

  // Safety Redirect
  useEffect(() => {
    if (!currentUser?.id) {
      navigate("/", { replace: true });
    } else if (role === "admin") {
      navigate("/dashboardadmin", { replace: true });
    } else if (role === "superadmin") {
      navigate("/dashboardsuperadmin", { replace: true });
    }
  }, [currentUser, role, navigate]);

  const formatRole = (role) => {
    if (!role) return "-";
    return role
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Sidebar Menu depending on Role
  const sidebarMenus = useMemo(() => {
    if (role === "superadmin") {
      return [
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
      ];
    } else if (role === "admin") {
      return [
        { label: "Dashboard Admin", to: "/dashboardadmin" },
        { label: "Verifikasi Pengajuan", to: "/verifikasi" },
        { label: "Kelola Barang ATK", to: "/kelola-barang" },
        { label: "Grafik Usulan Barang", to: "/grafik-usulan-barang" },
        { label: "Stock Opname Barang", to: "/stock-opname" },
      ];
    } else {
      return [
        { label: "Dashboard User", to: "/dashboarduser" },
        { label: "Stock Opname Barang", to: "/stock-opname" },
        { label: "Buat Pengajuan Baru", to: "/pengajuan" },
        { label: "Riwayat Pengajuan", to: "/riwayat" },
        { label: "Template Dokumen", to: "/template-dokumen", active: true },
        { label: "Support", to: "/support" },
      ];
    }
  }, [role]);


  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  const handleDownloadStockOpnameTemplate = async () => {
    try {
      setImportLoading(true);
      const res = await fetch(`${API_BASE}/barang`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const masterDataRes = await res.json();
      const masterData = Array.isArray(masterDataRes) ? masterDataRes : (masterDataRes.data || []);

      if (masterData.length === 0) {
        Swal.fire("Info", "Belum ada data barang di sistem.", "info");
        return;
      }

      const header = "kode_barang;nama_barang;stok_sistem;stok_fisik";
      const rows = masterData.map((b) =>
        `${b.kode};${b.nama};${b.stok};`
      );
      const csvContent = [header, ...rows].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Template_Stock_Opname.csv";
      link.click();
      URL.revokeObjectURL(url);

      Swal.fire({
        icon: "success",
        title: "Template Diunduh",
        text: `Template berisi ${masterData.length} barang. Isi kolom Stok Fisik, lalu import kembali.`,
        confirmButtonColor: "#2563eb",
      });
    } catch (err) {
      console.error("Gagal download template:", err);
      Swal.fire("Error", "Gagal mengambil data barang dari server", "error");
    } finally {
      setImportLoading(false);
    }
  };

  const handleDownloadPengajuanTemplate = async () => {
    try {
      setImportLoading(true);
      const res = await fetch(`${API_BASE}/barang`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const masterDataRes = await res.json();
      const masterData = Array.isArray(masterDataRes) ? masterDataRes : (masterDataRes.data || []);

      if (masterData.length === 0) {
        Swal.fire("Info", "Belum ada data barang di sistem.", "info");
        return;
      }

      const header = "nama_barang;satuan;harga;kebutuhan total;sisa stock saat ini";
      const rows = masterData.map((b) =>
        `${b.nama};${b.satuan};${b.harga_satuan};;`
      );
      const csvContent = [header, ...rows].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Template_Pengajuan_ATK.csv";
      link.click();
      URL.revokeObjectURL(url);

      Swal.fire({
        icon: "success",
        title: "Template Diunduh",
        text: `Template berisi ${masterData.length} barang. Isi kolom Kebutuhan Total dan Sisa Stok Saat Ini, lalu import kembali.`,
        confirmButtonColor: "#2563eb",
      });
    } catch (err) {
      console.error("Gagal download template:", err);
      Swal.fire("Error", "Gagal mengambil data barang dari server", "error");
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="layout">
      <DesktopSidebarToggle isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      {/* SIDEBAR */}
      {isSidebarOpen && (
        <div
          className="sidebar-overlay open"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <SidebarLogo />

        <nav className="sidebar-menu">
          {sidebarMenus.map((m) => {
            const isActive = location.pathname === m.to || m.active;
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

      {/* MAIN CONTAINER */}
      <main className={`main ${!isSidebarOpen ? 'expanded' : ''}`}>
        {/* TOPBAR */}
        <header className={`topbar ${!isSidebarOpen ? 'expanded' : ''}`}>
          <div className="topbar-left-wrapper">
            <button
              className={`hamburger-menu ${isSidebarOpen ? 'open' : ''}`}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle Sidebar"
            >
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
            <div>
              <div className="topbar-title">Template Dokumen</div>
              <div className="topbar-sub">
                Daftar template dokumen resmi siap pakai dalam sistem
              </div>
            </div>
          </div>
          <div className="topbar-right">
            <PeriodeTimer />
            <span style={{ marginRight: 8 }}>Pengguna: <b>{currentUser?.name}</b></span>
            <RoleSwitcher />
          </div>
        </header>

        {/* CONTENT */}
        <section className="main-content">
          <div className="card">
            <h3 style={{ margin: "0 0 10px 0", fontSize: 18 }}>Unduh Template Dokumen</h3>
            <p style={{ margin: "0 0 24px 0", color: "#6b7280", fontSize: 14 }}>
              Silakan unduh template dokumen berikut untuk mempermudah proses input data secara massal ke dalam sistem.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 20,
              }}
            >
              {/* CARD 1: Stock Opname */}
              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "#f9fafb",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
              >
                <div>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Template Stock Opname Barang</h4>
                  <p style={{ margin: "0 0 16px 0", color: "#4b5563", fontSize: 13, lineHeight: 1.5 }}>
                    Template CSV untuk mencatat perhitungan fisik barang (Stock Opname) di gudang/unit.
                     Berisi kolom kode barang, nama barang, stok terdaftar, dan stok fisik.
                    <br /><em style={{ color: "#6b7280" }}>Untuk template lengkap dengan data barang terkini, gunakan tombol "Download Template" di halaman Stock Opname.</em>
                  </p>
                </div>
                <button
                  onClick={handleDownloadStockOpnameTemplate}
                  disabled={importLoading}
                  style={{
                    display: "inline-block",
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: "#2a5385",
                    color: "white",
                    textAlign: "center",
                    border: "none",
                    fontWeight: 600,
                    fontSize: 13,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                    cursor: importLoading ? "not-allowed" : "pointer",
                    opacity: importLoading ? 0.6 : 1,
                  }}
                >
                  {importLoading ? "Memuat..." : "Unduh Template Contoh"}
                </button>
              </div>

              {/* CARD 2: Pengajuan ATK */}
              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "#f9fafb",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
              >
                <div>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Template Pengajuan ATK</h4>
                  <p style={{ margin: "0 0 16px 0", color: "#4b5563", fontSize: 13, lineHeight: 1.5 }}>
                    Template CSV untuk mempermudah perincian kebutuhan pengajuan ATK baru oleh setiap unit/fakultas.
                    Isi kolom <strong>kebutuhan total</strong> dan <strong>sisa stock saat ini</strong>, lalu import di halaman Pengajuan.

                    <br /><em style={{ color: "#6b7280" }}>Untuk template lengkap dengan semua barang terkini, gunakan tombol "Download Template" di halaman Buat Pengajuan (Step 2).</em>
                  </p>
                </div>
                <button
                  onClick={handleDownloadPengajuanTemplate}
                  disabled={importLoading}
                  style={{
                    display: "inline-block",
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: "#2a5385",
                    color: "white",
                    textAlign: "center",
                    border: "none",
                    fontWeight: 600,
                    fontSize: 13,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                    cursor: importLoading ? "not-allowed" : "pointer",
                    opacity: importLoading ? 0.6 : 1,
                  }}
                >
                  {importLoading ? "Memuat..." : "Unduh Template CSV"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
