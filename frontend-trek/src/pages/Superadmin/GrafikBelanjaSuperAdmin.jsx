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
} from "recharts";
import "../../css/layout.css";
import "../../css/Grafik.css";
import Analisis from "../../components/AnalisisData.jsx";
// sesuaikan path kalau beda folder


const API_BASE = import.meta.env.VITE_API_BASE;
const token = localStorage.getItem("token");



const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(Number(n || 0));

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
      { label: "Approval Pengajuan", to: "/approval" },
      { label: "Tambah & Kelola User", to: "/tambahuser" },
      { label: "Atur Periode", to: "/periode" },
      { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang" },
      { label: "Grafik Belanja", to: "/superadmin/grafik-belanja", active: true },
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
      const res = await fetch(`${API_BASE}/barang`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const json = await res.json();
      setBarangList(json || []);
      if (json?.length) setBarangId(String(json[0].id));
    }
    loadBarang();
  }, []);

  async function handleAnalisis(e) {
    e.preventDefault();
    setLoadingAnalisis(true);
    setErrorAnalisis("");
    setResultAnalisis(null);

    try {
      const params = new URLSearchParams({
        barang_id: barangId,
        tahun_akademik: tahunAkademik,
        unit,
      });

      const res = await fetch(`${API_BASE}/analisis-barang?${params}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const json = await res.json();

      if (!res.ok || json.success === false) {
        setErrorAnalisis(json.message || "Gagal mengambil analisis");
        return;
      }

      setResultAnalisis(json);
    } catch {
      setErrorAnalisis("Kesalahan jaringan");
    } finally {
      setLoadingAnalisis(false);
    }
  }

  /* =========================
     STATE GRAFIK
  ========================= */
  const [loadingGrafik, setLoadingGrafik] = useState(false);
  const [errGrafik, setErrGrafik] = useState("");
  const [years, setYears] = useState([]);
  const [grafikData, setGrafikData] = useState([]);
  const [status, setStatus] = useState("disetujui");
  const [yearsCount, setYearsCount] = useState(3);

  async function loadGrafik() {
    setLoadingGrafik(true);
    setErrGrafik("");

    try {
      const res = await fetch(
        `${API_BASE}/laporan/grafik-belanja?years=${yearsCount}&status=${status}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      );
      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrGrafik(json.message || "Gagal ambil grafik");
        return;
      }

      setYears(json.years || []);
      setGrafikData(json.data || []);
    } catch {
      setErrGrafik("Kesalahan jaringan grafik");
    } finally {
      setLoadingGrafik(false);
    }
  }

  useEffect(() => {
    loadGrafik();
  }, [status, yearsCount]);

  /* =========================
     RENDER
  ========================= */
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
          onClick={() => {
            localStorage.removeItem("user");
            window.location.href = "/";
          }}
        >
          Log Out
        </div>
      </aside>

       {/* MAIN */}
      <main className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">Analisis & Grafik ATK</div>
            <div className="topbar-sub">
              Selamat datang: {currentUser?.name || "Super Admin"}
            </div>
          </div>
          <div className="topbar-right">
            <span>Role: </span>
            <RoleSwitcher />
          </div>
        </header>

        <section className="main-content">
                <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowAnalisis(true)}
              >
                Tampilkan Analisis
              </button>
            <Analisis
              open={showAnalisis}
              onClose={() => setShowAnalisis(false)}
            />

          {/* GRAFIK */}
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-title">Grafik Belanja Unit</div>

            <div className="filter-row">
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="disetujui">Disetujui</option>
                <option value="diverifikasi">Diverifikasi</option>
                <option value="diajukan">Diajukan</option>
              </select>

              <select
                value={yearsCount}
                onChange={(e) => setYearsCount(Number(e.target.value))}
              >
                <option value={3}>3 Tahun</option>
                <option value={4}>4 Tahun</option>
                <option value={5}>5 Tahun</option>
              </select>
            </div>

            {loadingGrafik && <p>Loading grafik...</p>}
            {errGrafik && <p className="error-text">{errGrafik}</p>}

            {!loadingGrafik && grafikData.length > 0 && (
              <div style={{ width: "100%", height: 400 }}>
                <ResponsiveContainer>
                  <BarChart data={grafikData}>
                    <XAxis dataKey="unit" />
                    <YAxis />
                    <Tooltip formatter={(v) => rupiah(v)} />
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
