import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/Pengajuan.css";

const API_BASE = "http://127.0.0.1:8000/api";

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(
    Number(n || 0)
  );

export default function DaftarBarangATKSuperAdmin() {
  const navigate = useNavigate();
  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  useEffect(() => {
    if (!currentUser?.id) navigate("/", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sidebarMenus = useMemo(() => {
    return [
      { label: "Dashboard Super Admin", to: "/dashboardsuperadmin"},
      { label: "Approval", to: "/approval" },
      { label: "Tambah User", to: "/tambahuser" },
      { label: "Atur Periode", to: "/periode" },
      { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang", active: true  },
      { label: "Grafik Belanja Unit", to: "/superadmin/grafik-belanja" },
    ];
  }, []);

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [barangs, setBarangs] = useState([]);
  const [err, setErr] = useState("");

  async function loadBarangs(keyword = "") {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/barang?q=${encodeURIComponent(keyword)}`);
      const data = await res.json();
      setBarangs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr("Gagal mengambil data barang dari server.");
      setBarangs([]);
    } finally {
      setLoading(false);
    }
  }

  const formatRole = (role) => {
  if (!role) return "-";

  return role
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};


  useEffect(() => {
    loadBarangs("");
  }, []);

  return (
    <div className="layout">
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
              onClick={() => !m.active && navigate(m.to)}
            >
              {m.label}
            </div>
          ))}
        </nav>

        <div
          className="logout"
          style={{ cursor: "pointer" }}
          onClick={() => {
            localStorage.removeItem("user");
            window.location.href = "/";
          }}
        >
          Log Out
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">Daftar Barang ATK</div>
            <div className="topbar-sub">
              Selamat datang: {currentUser?.name || "SuperAdmin"}
            </div>
          </div>
         <div className="topbar-right">
          <span>Role: </span>
          <span className="role-pill">{formatRole(currentUser?.role)}</span>
        </div>
        </header>

        <section className="main-content">
          <div className="card">
            <div className="card-title">List Barang</div>

            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <input
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #ddd",
                }}
                placeholder="Cari barang (nama / kode)..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button
                onClick={() => loadBarangs(q)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background: "#1f6feb",
                  color: "white",
                  fontWeight: 600,
                }}
              >
                Cari
              </button>
            </div>

            {loading && <p>Loading...</p>}
            {!loading && err && <p style={{ color: "crimson" }}>{err}</p>}
            {!loading && !err && barangs.length === 0 && <p>Tidak ada barang ditemukan.</p>}

            {!loading && !err && barangs.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                      <th style={{ padding: 10 }}>Kode</th>
                      <th style={{ padding: 10 }}>Nama</th>
                      <th style={{ padding: 10 }}>Satuan</th>
                      <th style={{ padding: 10 }}>Harga Satuan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {barangs.map((b) => (
                      <tr key={b.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                        <td style={{ padding: 10 }}>{b.kode}</td>
                        <td style={{ padding: 10 }}>{b.nama}</td>
                        <td style={{ padding: 10 }}>{b.satuan}</td>
                        <td style={{ padding: 10 }}>{rupiah(b.harga_satuan)}</td>
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
