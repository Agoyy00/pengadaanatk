  import { FaEye, FaEyeSlash } from "react-icons/fa";
  import React, { useState, useMemo, useEffect} from "react";
  import { useNavigate } from "react-router-dom";
  import "../../css/User.css";
  import "../../css/layout.css";

  const API_BASE = "http://127.0.0.1:8000/api";
  const token = localStorage.getItem("token");

  export default function TambahUser() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("user");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);


    // Ambil user login (harusnya superadmin)
    const storedUser = localStorage.getItem("user");
    const currentUser = storedUser ? JSON.parse(storedUser) : null;

   async function handleSubmit(e) {
  e.preventDefault();
  setLoadingUsers(true); // Gunakan loading state saat mengecek LDAP
  setMessage("");
  setErrorMsg("");

  try {
    const res = await fetch(`${API_BASE}/users`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify({ 
        email: email, 
        role: role 
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      // Ini akan muncul jika LDAP tidak menemukan user
      setErrorMsg(data.message || "User tidak ditemukan di database kampus.");
      setLoadingUsers(false);
      return;
    }

    setMessage(`Berhasil! ${data.user.name} telah ditambahkan.`);
    setEmail("");
    await loadUsers();
  } catch (err) {
    setErrorMsg("Terjadi kesalahan koneksi server.");
  } finally {
    setLoadingUsers(false);
  }
}

  const formatRole = (role) => {
    if (!role) return "-";

    return role
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

   async function loadUsers() {
    setLoadingUsers(true);
    const res = await fetch(`${API_BASE}/users` , {
      headers: { "Authorization": `Bearer ${token}` },
    });
    const data = await res.json();
    setUsers(data);
    setLoadingUsers(false);
  }

  useEffect(() => {
  loadUsers();
}, []);

async function deleteUser(user) {
  if (user.role?.name === "superadmin") {
    alert("Super Admin tidak boleh dihapus");
    return;
  }

  const confirmText =
    user.role?.name === "admin"
      ? "Ini akun ADMIN. Yakin mau hapus?"
      : "Yakin hapus user ini?";

  if (!window.confirm(confirmText)) return;

  const res = await fetch(`${API_BASE}/users/${user.id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` },
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    alert(data.message || "Gagal menghapus user");
    return;
  }

  setUsers((prev) => prev.filter((u) => u.id !== user.id));
}
    const sidebarMenus = useMemo(() => {
    return [
      { label: "Dashboard Super Admin", to: "/dashboardsuperadmin"},
      { label: "Approval", to: "/approval" },
      { label: "Tambah User", to: "/tambahuser", active: true  },
      { label: "Atur Periode", to: "/periode" },
      { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang" },
      { label: "Analisis Dan Grafik", to: "/superadmin/grafik-belanja" },
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
              <span>Role: </span>
              <span className="role-pill">{formatRole(currentUser?.role)}</span>
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
                  <div className="form-group2">
                  <label>Username / Email Kampus</label>
                  <input
                    type="text" // Gunakan text agar tidak dipaksa format email oleh browser
                    className="input-text"
                    placeholder="Contoh: alzkar.muhammad atau alzkarmuhammad@yarsi.ac.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    *Cukup masukkan ID kampus, sistem akan otomatis mendaftarkannya.
                  </p>
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
            <div className="card" style={{ marginTop: 24 }}>
              <div className="card-title">Daftar User</div>
              {loadingUsers ? (
                <p>Memuat user...</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="table" style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        <th>Nama</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th style={{ textAlign: "center" }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td>{u.name}</td>
                          <td>{u.email}</td>
                          <td><span className={`role-badge role-${u.role?.name}`}>{formatRole(u.role?.name || u.role)}</span></td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              className="btn btn-danger"
                              disabled={u.role?.name === "superadmin"}
                              onClick={() => deleteUser(u)}
                            > Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    );
  }
