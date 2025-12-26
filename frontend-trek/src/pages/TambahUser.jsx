
import { FaEye, FaEyeSlash } from "react-icons/fa";
  import React, { useState, useMemo} from "react";
  import { useNavigate } from "react-router-dom";
  import "../css/Pengajuan.css";   // pakai layout yang sama
  import "../css/User.css";

  const API_BASE = "http://127.0.0.1:8000/api";

  export default function TambahUser() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("user");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Ambil user login (harusnya superadmin)
    const storedUser = localStorage.getItem("user");
    const currentUser = storedUser ? JSON.parse(storedUser) : null;

    async function handleSubmit(e) {
      e.preventDefault();
      setMessage("");
      setErrorMsg("");

      if (!name || !email || !password) {
        setErrorMsg("Semua field wajib diisi.");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, role }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setErrorMsg(data.message || "Gagal menambah user.");
          console.error("Error tambah user:", data);
          return;
        }

        setMessage(
          `User ${data.user.email} berhasil dibuat dengan role ${data.user.role}.`
        );
        setName("");
        setEmail("");
        setPassword("");
        setRole("user");
      } catch (err) {
        console.error("Error jaringan:", err);
        setErrorMsg("Terjadi kesalahan jaringan.");
      }
    }

      const sidebarMenus = useMemo(() => {
      return [
        { label: "Dashboard Super Admin", to: "/dashboardsuperadmin"},
        { label: "Approval", to: "/approval" },
        { label: "Tambah User", to: "/tambahuser", active: true },
        { label: "Atur Periode", to: "/periode" },
        { label: "Grafik & Analisis Data", to: "/grafik" },
        ];
        }, []);

    return (
      <div className="layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div>
            <div className="sidebar-logo">Sistem Pengajuan ATK</div>
            <div className="sidebar-subtitle">Universitas Yarsi</div>
          </div>

          <nav className="sidebar-menu">
          {sidebarMenus.map((m) => (
            <div
              key={m.label}
              className={`menu-item ${m.active ? "disabled" : ""}`}
              style={{ cursor: m.active ? "default" : "pointer" }}
              onClick={() => {
                if (!m.active) {
                  navigate(m.to);
                }
              }}
            >
              {m.label}
            </div>
          ))}
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

        {/* MAIN */}
        <main className="main">
          <header className="topbar">
            <div>
              <div className="topbar-title">Tambah User Baru</div>
              <div className="topbar-sub">
                Super Admin dapat menambahkan akun admin / user baru.
              </div>
            </div>
            <div className="topbar-right">
              <span>Role: {currentUser?.role || "superadmin"}</span>
              <span className="role-pill">
                {currentUser?.role || "superadmin"}
              </span>
            </div>
          </header>

          <section className="main-content">
            <div className="card">
              <div className="card-title">Form Tambah User</div>
              <div className="card-subtitle">
                Isi data user yang akan dibuat.
              </div>

              <form onSubmit={handleSubmit}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    maxWidth: 400,
                  }}
                >
                  <div className="form-group">
                    <label>Nama</label>
                    <input
                      type="text"
                      className="input-text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      className="input-text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Password Awal</label>
                    <input
                    type={showPassword ? "text" : "password"}
                    className="input-text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />

                    {/* Show/hide password */}
                  <button
                    type="button"
                    className="show-password-btn-small"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEye /> : <FaEyeSlash />}
                  </button>
                  </div>

                  <div className="form-group">
                    <label>Role</label>
                    <select
                      className="select-input"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Super Admin</option>
                    </select>
                  </div>

                  <button type="submit" className="btn btn-primary">
                    Simpan User
                  </button>

                  {message && (
                    <p style={{ color: "green", marginTop: 8 }}>{message}</p>
                  )}
                  {errorMsg && (
                    <p className="error-text" style={{ marginTop: 8 }}>
                      {errorMsg}
                    </p>
                  )}
                </div>
              </form>
            </div>
          </section>
        </main>
      </div>
    );
  }
