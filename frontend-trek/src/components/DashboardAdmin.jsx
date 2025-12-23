import { useNavigate } from "react-router-dom";
import "./Pengajuan.css";

export default function DashboardAdmin() {
  const navigate = useNavigate();

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">Sistem Pengajuan ATK</div>
          <div className="sidebar-subtitle">Universitas Yarsi</div>
        </div>

        <nav className="sidebar-menu">
          <div className="menu-item disabled" style={{ cursor: "default" }}>
            Dashboard Admin

          </div>

          <div
  className="menu-item"
  onClick={() => navigate("/kelola-barang")}
  style={{ cursor: "pointer" }}
>
  Kelola Barang ATK
</div>

          <div
            className="menu-item"
            onClick={() => navigate("/verifikasi")}
            style={{ cursor: "pointer" }}
          >
            Verifikasi
          </div>

          <div
            className="menu-item"
            onClick={() => navigate("/periode")}
            style={{ cursor: "pointer" }}
          >
            Atur Periode
          </div>

          {/* ✅ MENU BARU */}
          <div
            className="menu-item"
            onClick={() => navigate("/kelola-harga")}
            style={{ cursor: "pointer" }}
          >
            Kelola Harga ATK
          </div>
        </nav>

        <div
          className="logout"
          onClick={() => {
            localStorage.removeItem("user");
            window.location.href = "/";
          }}
          style={{ cursor: "pointer" }}
        >
          Log Out
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">Dashboard Admin</div>
            <div className="topbar-sub">
              Selamat datang: {currentUser?.name || "Admin"}
            </div>
          </div>
          <div className="topbar-right">
            <span>Role: Admin</span>
            <span className="role-pill">Admin</span>
          </div>
          
        </header>

        <section className="main-content">
          <div className="card">
            <div className="card-title">Ringkasan</div>
            <p>
              Admin dapat melakukan verifikasi pengajuan, mengatur periode,
              dan mengelola harga ATK.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
