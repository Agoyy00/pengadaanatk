import { useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../css/layout.css";
import RoleSwitcher from "../components/RoleSwitcher";
import PeriodeTimer from "../components/PeriodeTimer";

const normalizeRole = (role) =>
  String(role || "")
    .toLowerCase()
    .replace(/[\s_]+/g, "");

export default function TemplateDokumen() {
  const navigate = useNavigate();
  const location = useLocation();

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const role = normalizeRole(currentUser?.role);

  // Safety Redirect
  useEffect(() => {
    if (!currentUser?.id) {
      navigate("/", { replace: true });
    }
  }, [currentUser, navigate]);

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
        { label: "Approval Pengajuan", to: "/approval" },
        { label: "Tambah & Kelola User", to: "/tambahuser" },
        { label: "Atur Periode", to: "/periode" },
        { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang" },
        { label: "Grafik Belanja", to: "/superadmin/grafik-belanja" },
        { label: "Stock Opname Barang", to: "/stock-opname" },
        { label: "Template Dokumen", to: "/template-dokumen", active: true },
      ];
    } else if (role === "admin") {
      return [
        { label: "Dashboard Admin", to: "/dashboardadmin" },
        { label: "Verifikasi Pengajuan", to: "/verifikasi" },
        { label: "Kelola Barang ATK", to: "/kelola-barang" },
        { label: "Grafik Usulan Barang", to: "/grafik-usulan-barang" },
        { label: "Stock Opname Barang", to: "/stock-opname" },
        { label: "Template Dokumen", to: "/template-dokumen", active: true },
      ];
    } else {
      return [
        { label: "Dashboard User", to: "/dashboarduser" },
        { label: "Buat Pengajuan Baru", to: "/pengajuan" },
        { label: "Riwayat Pengajuan", to: "/riwayat" },
        { label: "Stock Opname Barang", to: "/stock-opname" },
        { label: "Template Dokumen", to: "/template-dokumen", active: true },
      ];
    }
  }, [role]);

  return (
    <div className="layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">Sistem Pengajuan ATK</div>
          <div className="sidebar-subtitle">Universitas Yarsi</div>
        </div>

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
      <main className="main">
        {/* TOPBAR */}
        <header className="topbar">
          <div>
            <div className="topbar-title">Template Dokumen</div>
            <div className="topbar-sub">
              Daftar template dokumen resmi siap pakai dalam sistem
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
                  <div style={{ fontSize: 24, marginBottom: 10 }}>📊</div>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Template Stock Opname Barang</h4>
                  <p style={{ margin: "0 0 16px 0", color: "#4b5563", fontSize: 13, lineHeight: 1.5 }}>
                    Template CSV untuk mencatat perhitungan fisik barang (Stock Opname) di gudang/unit.
                    Berisi kolom kode barang, nama barang, stok terdaftar, stok fisik, dan keterangan selisih.
                  </p>
                </div>
                <a
                  href="/template_stock_opname.csv"
                  download="Template_Stock_Opname.csv"
                  style={{
                    display: "inline-block",
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: "#2a5385",
                    color: "white",
                    textAlign: "center",
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: 13,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  📥 Unduh Template CSV
                </a>
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
                  <div style={{ fontSize: 24, marginBottom: 10 }}>📝</div>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Template Pengajuan ATK</h4>
                  <p style={{ margin: "0 0 16px 0", color: "#4b5563", fontSize: 13, lineHeight: 1.5 }}>
                    Template CSV untuk mempermudah perincian kebutuhan pengajuan ATK baru oleh setiap unit/fakultas.
                    Membantu menyusun daftar nama barang, satuan, harga satuan, dan jumlah kebutuhan.
                  </p>
                </div>
                <a
                  href="/template_pengajuan_atk.csv"
                  download="Template_Pengajuan_ATK.csv"
                  style={{
                    display: "inline-block",
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: "#2a5385",
                    color: "white",
                    textAlign: "center",
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: 13,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  📥 Unduh Template CSV
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
