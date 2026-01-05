import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import "../../css/Pengajuan.css";

const API_BASE = "http://127.0.0.1:8000/api";

export default function GrafikUsulanBarangPage() {
  const navigate = useNavigate();

  // =========================
  // Grafik Data
  // =========================
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/barang-usulan/statistik`)
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
      })
      .catch((err) => {
        console.error("Gagal ambil data grafik:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  // =========================
  // Sidebar & Topbar
  // =========================
  const sidebarMenus = [
    { label: "Dashboard Admin", to: "/dashboardadmin", active: false },
    { label: "Verifikasi", to: "/verifikasi", active: false },
    { label: "Kelola Barang ATK", to: "/kelola-barang", active: false },
    { label: "Grafik Usulan Barang", to: "/grafik-usulan-barang", active: true },
  ];

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const formatRole = (role) => {
    if (!role) return "-";
    return role
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="layout">
      {/* ================= SIDEBAR ================= */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">Sistem Pengajuan ATK</div>
          <div className="sidebar-subtitle">Universitas YARSI</div>
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
          onClick={() => {
            localStorage.removeItem("user");
            window.location.href = "/";
          }}
          style={{ cursor: "pointer" }}
        >
          Log Out
        </div>
      </aside>

      {/* ================= MAIN ================= */}
      <main className="main">
        {/* ================= TOPBAR ================= */}
        <header className="topbar">
          <div>
            <div className="topbar-title">Grafik Usulan Barang ATK</div>
            <div className="topbar-sub">
              Selamat datang: {user?.name || "Super Admin"}
            </div>
          </div>
          <div className="topbar-right">
            <span>Role: </span>
            <span className="role-pill">{formatRole(user?.role)}</span>
          </div>
        </header>

        {/* ================= MAIN CONTENT ================= */}
        <section className="main-content">
          <div className="card" style={{ height: 500 }}>
            <h3 style={{ marginBottom: 16 }}>Grafik Usulan Barang ATK</h3>

            {loading ? (
              <p>Memuat grafik...</p>
            ) : data.length === 0 ? (
              <p>Belum ada data untuk ditampilkan.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                >
                  <defs>
                    <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>

                  <XAxis
                    dataKey="nama_barang"
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value) => [`${value}`, "Jumlah"]}
                    cursor={{ fill: "rgba(0,0,0,0.1)" }}
                  />
                  <Bar dataKey="total" fill="url(#colorBar)">
                    <LabelList dataKey="total" position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
