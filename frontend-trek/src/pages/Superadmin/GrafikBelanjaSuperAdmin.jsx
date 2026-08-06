import DesktopSidebarToggle from '../../components/DesktopSidebarToggle';
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import RoleSwitcher from "../../components/RoleSwitcher";
import {

  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import "../../css/layout.css";
import "../../css/Grafik.css";
import Analisis from "../../components/AnalisisData.jsx";


const API_BASE = import.meta.env.VITE_API_BASE;

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(Number(n || 0));

const COLORS = ["#0284c7", "#16a34a", "#8b5cf6", "#ea580c", "#e11d48", "#06b6d4", "#d97706", "#475569"];

export default function SuperAdminAnalisisDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const [showAnalisis, setShowAnalisis] = useState(false);

  /* =========================
     PROTEKSI LOGIN
  ========================= */
  useEffect(() => {
    if (!currentUser?.id) navigate("/", { replace: true });
  }, [currentUser, navigate]);

  /* =========================
     SIDEBAR
  ========================= */
  const sidebarMenus = useMemo(
    () => [
      { label: "Dashboard Super Admin", to: "/dashboardsuperadmin" },
      { label: "Monitoring Admin", to: "/superadmin/monitoring-admin" },
      { label: "Monitoring User", to: "/superadmin/monitoring-user" },
      { label: "Grafik Barang", to: "/superadmin/grafik-barang" },
      { label: "Grafik Belanja", to: "/superadmin/grafik-belanja", active: true },
      { label: "Approval Pengajuan", to: "/approval" },
      { label: "Tambah & Kelola User", to: "/tambahuser" },
      { label: "Atur Periode", to: "/periode" },
      { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang" },
      { label: "Stock Opname Barang", to: "/stock-opname" },
      { label: "Template Dokumen", to: "/template-dokumen" },
    ],
    []
  );

  /* =========================
     STATE ANALISIS BARANG
  ========================= */
  const [barangList, setBarangList] = useState([]);
  const [barangId, setBarangId] = useState("");
  const [tahunAkademik, setTahunAkademik] = useState("all");
  const [unit, setUnit] = useState("all");
  const [loadingAnalisis, setLoadingAnalisis] = useState(false);
  const [resultAnalisis, setResultAnalisis] = useState(null);
  const [errorAnalisis, setErrorAnalisis] = useState("");

  const unitOptions = [
    "Direktorat",
    "DPJJ",
    "PDJAMA",
    "Pascasarjana",
    "Fakultas Kedokteran",
    "Fakultas Kedokteran Gigi",
    "Fakultas Teknologi Informasi",
    "Fakultas Hukum",
    "Fakultas Psikologi",
    "Fakultas Ekonomi",
  ];

  useEffect(() => {
    async function loadBarang() {
      try {
        const freshToken = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/barang`, {
          headers: { "Authorization": `Bearer ${freshToken}` },
        });
        const json = await res.json();
        setBarangList(Array.isArray(json) ? json : []);
        if (json?.length) setBarangId(String(json[0].id));
      } catch (e) {
        console.error("Gagal load barang:", e);
      }
    }
    loadBarang();
  }, []);

  async function handleAnalisis(e) {
    e.preventDefault();
    setLoadingAnalisis(true);
    setErrorAnalisis("");
    setResultAnalisis(null);

    try {
      const freshToken = localStorage.getItem("token");
      const params = new URLSearchParams({
        barang_id: barangId,
        tahun_akademik: tahunAkademik,
        unit,
      });

      const res = await fetch(`${API_BASE}/analisis-barang?${params}`, {
        headers: { "Authorization": `Bearer ${freshToken}` },
      });
      const json = await res.json();

      if (!res.ok || json.success === false) {
        setErrorAnalisis(json.message || "Gagal mengambil analisis");
        return;
      }

      setResultAnalisis(json);
    } catch (err) {
      console.error("Error analisis:", err);
      setErrorAnalisis("Kesalahan koneksi ke server");
    } finally {
      setLoadingAnalisis(false);
    }
  }

  /* =========================
     STATE GRAFIK (4 DIAGRAM)
  ========================= */
  const [loadingGrafik, setLoadingGrafik] = useState(false);
  const [errGrafik, setErrGrafik] = useState("");
  const [years, setYears] = useState([]);
  const [periodes, setPeriodes] = useState([]);
  const [grafikData, setGrafikData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [lineData, setLineData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [status, setStatus] = useState("all");
  const [yearsCount, setYearsCount] = useState(3);
  const [selectedYear, setSelectedYear] = useState("all");

  useEffect(() => {
    async function fetchPeriodes() {
      try {
        const freshToken = localStorage.getItem("token");
        const resP = await fetch(`${API_BASE}/periode`, {
          headers: { "Authorization": `Bearer ${freshToken}` }
        });
        const dataP = await resP.json();
        const pList = Array.isArray(dataP) ? dataP : (dataP?.data || []);
        setPeriodes(pList);
      } catch (e) {
        console.error("Error load periodes:", e);
      }
    }
    fetchPeriodes();
  }, []);

  const allYearsCombined = useMemo(() => {
    const setY = new Set(years.map(String));
    periodes.forEach((p) => {
      if (p.tahun_akademik) setY.add(p.tahun_akademik);
    });
    return Array.from(setY).sort();
  }, [years, periodes]);

  async function loadGrafik() {
    setLoadingGrafik(true);
    setErrGrafik("");

    try {
      const freshToken = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE}/laporan/grafik-belanja?years=${yearsCount}&status=${status}`,
        {
          headers: {
            "Authorization": `Bearer ${freshToken}`,
          },
        }
      );
      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrGrafik(json.message || "Gagal mengambil data grafik");
        return;
      }

      setYears(json.years || []);
      setGrafikData(json.data || []);
      setPieData(json.pieData || []);
      setLineData(json.lineData || []);
      setStatusData(json.statusData || []);
    } catch (err) {
      console.error("Error load grafik:", err);
      setErrGrafik("Kesalahan koneksi ke server: " + err.message);
    } finally {
      setLoadingGrafik(false);
    }
  }

  useEffect(() => {
    loadGrafik();
  }, [status, yearsCount]);

  const displayYears = useMemo(() => {
    if (selectedYear === "all") return years;
    return years.filter((y) => String(y) === String(selectedYear));
  }, [years, selectedYear]);

  const totalBelanjaComputed = useMemo(() => {
    return pieData.reduce((acc, curr) => acc + Number(curr.value || 0), 0);
  }, [pieData]);

  const topUnitComputed = useMemo(() => {
    if (!pieData || pieData.length === 0) return { name: "-", value: 0 };
    return [...pieData].sort((a, b) => b.value - a.value)[0];
  }, [pieData]);

  /* =========================
     RENDER
  ========================= */
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

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
        <div>
          <div className="sidebar-logo">Sistem Pengajuan ATK</div>
          <div className="sidebar-subtitle">Universitas Yarsi</div>
        </div>

        <nav className="sidebar-menu">
          {sidebarMenus.map((m) => {
            const isActive = location.pathname === m.to;
            return (
              <div
                key={m.label}
                className={`menu-item ${isActive ? "active" : ""}`}
                style={{ cursor: isActive ? "default" : "pointer" }}
                onClick={() => !isActive && navigate(m.to)}
              >
                {m.label}
              </div>
            );
          })}
        </nav>

        <div
          className="logout"
          style={{ cursor: "pointer" }}
          onClick={() => (window.location.href = "/")}
        >
          Log Out
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className={`main ${!isSidebarOpen ? 'expanded' : ''}`}>
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
            <div className="topbar-title">Grafik & Analisis Belanja ATK</div>
            <div className="topbar-sub">Selamat datang: {currentUser?.name || "Super Admin ATK"}</div>
          </div>
          </div>
          <div className="topbar-right">
            <span>Role: </span>
            <RoleSwitcher />
          </div>
        </header>

        <section className="main-content">
          {/* TOMBOL TAMPILKAN ANALISIS */}
          <button
            onClick={() => setShowAnalisis(true)}
            style={{
              padding: "10px 18px",
              backgroundColor: "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: "20px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}
          >
            Tampilkan Analisis
          </button>

          <Analisis
            open={showAnalisis}
            onClose={() => setShowAnalisis(false)}
          />

          {/* STAT CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div className="card" style={{ padding: "20px", background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "#fff" }}>
              <div style={{ fontSize: "12.5px", opacity: 0.9, fontWeight: 600 }}>Total Nilai Belanja</div>
              <div style={{ fontSize: "24px", fontWeight: 800, marginTop: "6px" }}>{rupiah(totalBelanjaComputed)}</div>
              <div style={{ fontSize: "11px", opacity: 0.8, marginTop: "4px" }}>Akumulasi dari transaksi</div>
            </div>

            <div className="card" style={{ padding: "20px", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff" }}>
              <div style={{ fontSize: "12.5px", opacity: 0.9, fontWeight: 600 }}>Unit Belanja Terbesar</div>
              <div style={{ fontSize: "18px", fontWeight: 700, marginTop: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {topUnitComputed.name}
              </div>
              <div style={{ fontSize: "11px", opacity: 0.8, marginTop: "4px" }}>
                {rupiah(topUnitComputed.value)} total alokasi
              </div>
            </div>

            <div className="card" style={{ padding: "20px", background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "#fff" }}>
              <div style={{ fontSize: "12.5px", opacity: 0.9, fontWeight: 600 }}>Unit Terdaftar Transaksi</div>
              <div style={{ fontSize: "26px", fontWeight: 800, marginTop: "6px" }}>{pieData.length} Unit</div>
              <div style={{ fontSize: "11px", opacity: 0.8, marginTop: "4px" }}>Fakultas & Unit Yarsi</div>
            </div>
          </div>

          {/* FILTER PARAMETER & TAHUN AKADEMIK */}
          <div className="card" style={{ marginBottom: "24px" }}>
            <div className="card-title">Filter Parameter Grafik & Laporan</div>
            <div className="filter-row" style={{ display: "flex", gap: "20px", marginTop: "12px", flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                  Status Pengajuan:
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13.5px", outline: "none" }}
                >
                  <option value="all">Semua Status</option>
                  <option value="disetujui">Disetujui Super Admin</option>
                  <option value="diverifikasi_admin">Diverifikasi Admin</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                  Rentang Tahun:
                </label>
                <select
                  value={yearsCount}
                  onChange={(e) => {
                    setYearsCount(Number(e.target.value));
                    setSelectedYear("all");
                  }}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13.5px", outline: "none" }}
                >
                  <option value={3}>3 Tahun Terakhir</option>
                  <option value={4}>4 Tahun Terakhir</option>
                  <option value={5}>5 Tahun Terakhir</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", display: "block", marginBottom: "4px" }}>
                  Tahun Akademik:
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13.5px", outline: "none" }}
                >
                  <option value="all">Semua Tahun</option>
                  {years.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loadingGrafik && <p style={{ fontSize: "13.5px", color: "#64748b" }}>Sedang memuat data grafik...</p>}
          {errGrafik && <p className="error-text" style={{ color: "#ef4444", fontWeight: "600", fontSize: "13px" }}>{errGrafik}</p>}

          {/* GRID DIAGRAM VISUAL */}
          {!loadingGrafik && !errGrafik && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "24px" }}>
              
              {/* DIAGRAM 1: BELANJA PER UNIT */}
              <div className="card">
                <div className="card-title">Grafik Belanja Unit per Tahun</div>
                <p className="card-subtitle">Perbandingan total nilai belanja ATK antar unit/fakultas tiap tahunnya.</p>
                
                {grafikData.length === 0 ? (
                  <p style={{ color: "#64748b", fontStyle: "italic", fontSize: "13px", marginTop: "16px" }}>Belum ada data belanja.</p>
                ) : (
                  <div style={{ width: "100%", height: 320, marginTop: "16px" }}>
                    <ResponsiveContainer>
                      <BarChart data={grafikData}>
                        <XAxis dataKey="unit" />
                        <YAxis />
                        <Tooltip formatter={(v) => rupiah(v)} />
                        <Legend />
                        {displayYears.map((y, idx) => (
                          <Bar key={y} dataKey={y} fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* DIAGRAM 2: PROPORSI BELANJA */}
              <div className="card">
                <div className="card-title">Proporsi Belanja per Unit</div>
                <p className="card-subtitle">Persentase kontribusi alokasi anggaran belanja ATK untuk tiap unit.</p>
                
                {pieData.length === 0 ? (
                  <p style={{ color: "#64748b", fontStyle: "italic", fontSize: "13px", marginTop: "16px" }}>Belum ada data proporsi.</p>
                ) : (
                  <div style={{ width: "100%", height: 320, marginTop: "16px" }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => rupiah(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* DIAGRAM 3: TREN BELANJA PER TAHUN */}
              <div className="card">
                <div className="card-title">Tren Akumulasi Belanja per Tahun</div>
                <p className="card-subtitle">Grafik garis pertumbuhan total belanja ATK dari tahun ke tahun.</p>
                
                {lineData.length === 0 ? (
                  <p style={{ color: "#64748b", fontStyle: "italic", fontSize: "13px", marginTop: "16px" }}>Belum ada data tren.</p>
                ) : (
                  <div style={{ width: "100%", height: 320, marginTop: "16px" }}>
                    <ResponsiveContainer>
                      <LineChart data={lineData}>
                        <XAxis dataKey="tahun" />
                        <YAxis />
                        <Tooltip formatter={(v) => rupiah(v)} />
                        <Legend />
                        <Line type="monotone" dataKey="total" name="Total Belanja (Rp)" stroke="#0284c7" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* DIAGRAM 4: DISTRIBUSI STATUS PENGAJUAN */}
              <div className="card">
                <div className="card-title">Distribusi Status Pengajuan</div>
                <p className="card-subtitle">Jumlah volume dokumen pengajuan berdasarkan tahapan status.</p>
                
                {statusData.length === 0 ? (
                  <p style={{ color: "#64748b", fontStyle: "italic", fontSize: "13px", marginTop: "16px" }}>Belum ada data status.</p>
                ) : (
                  <div style={{ width: "100%", height: 320, marginTop: "16px" }}>
                    <ResponsiveContainer>
                      <BarChart data={statusData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(v) => `${v} Dokumen`} />
                        <Bar dataKey="jumlah" fill="#16a34a" radius={[6, 6, 0, 0]} label={{ position: 'top', fill: '#0f172a', fontWeight: 'bold' }}>
                          {statusData.map((entry, index) => {
                            const statusColors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];
                            return <Cell key={`cell-st-${index}`} fill={statusColors[index % statusColors.length]} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

            </div>
          )}
        </section>
      </main>
    </div>
  );
}