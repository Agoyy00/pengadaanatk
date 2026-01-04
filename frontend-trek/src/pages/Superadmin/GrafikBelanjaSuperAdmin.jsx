import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Bar,
    BarChart,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import "../../css/Pengajuan.css";

const API_BASE = "http://127.0.0.1:8000/api";

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(
    Number(n || 0)
  );

export default function GrafikBelanjaSuperAdmin() {
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
      { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang" },
      { label: "Grafik Belanja Unit", to: "/superadmin/grafik-belanja", active: true  },
    ];
  }, []);

  const formatRole = (role) => {
    if (!role) return "-";

    return role
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [years, setYears] = useState([]);
  const [data, setData] = useState([]);
  const [status, setStatus] = useState("disetujui"); // default belanja
  const [yearsCount, setYearsCount] = useState(3);

  async function loadGrafik() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(
        `${API_BASE}/laporan/grafik-belanja?years=${yearsCount}&status=${encodeURIComponent(
          status
        )}`
      );
      const json = await res.json();

      if (!res.ok || !json?.success) {
        setErr(json?.message || "Gagal mengambil data grafik.");
        setYears([]);
        setData([]);
        return;
      }

      setYears(json.years || []);
      setData(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      console.error(e);
      setErr("Terjadi kesalahan saat mengambil data dari server.");
      setYears([]);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGrafik();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, yearsCount]);

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
            <div className="topbar-title">Grafik Belanja Unit (Default 3 Tahun Terakhir)</div>
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
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <div style={{ fontWeight: 700 }}>Filter:</div>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
              >
                <option value="disetujui">Disetujui (Belanja)</option>
                <option value="diverifikasi">Diverifikasi</option>
                <option value="diajukan">Diajukan</option>
                <option value="ditolak">Ditolak</option>
              </select>

              <select
                value={yearsCount}
                onChange={(e) => setYearsCount(Number(e.target.value))}
                style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
              >
                <option value={3}>3 Tahun</option>
                <option value={4}>4 Tahun</option>
                <option value={5}>5 Tahun</option>
              </select>

              <button
                onClick={loadGrafik}
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
                Refresh
              </button>
            </div>

            {loading && <p>Loading data grafik...</p>}
            {!loading && err && <p style={{ color: "crimson" }}>{err}</p>}
            {!loading && !err && data.length === 0 && (
              <p>Belum ada data untuk ditampilkan.</p>
            )}

            {!loading && !err && data.length > 0 && (
              <div style={{ width: "100%", height: 420 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <XAxis dataKey="unit" />
                    <YAxis tickFormatter={(v) => `${Math.round(v / 1000000)} jt`} />
                    <Tooltip formatter={(value) => rupiah(value)} />
                    <Legend />
                    {years.map((y) => (
                      <Bar key={y} dataKey={y} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
