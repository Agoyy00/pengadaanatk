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


const API_BASE = import.meta.env.VITE_API_BASE;

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(Number(n || 0));

const COLORS = ["#0284c7", "#16a34a", "#8b5cf6", "#ea580c", "#e11d48", "#06b6d4", "#d97706", "#475569"];

import SidebarLogo from "../../components/SidebarLogo";
import useSupportUnread from "../../hooks/useSupportUnread";

export default function GrafikBelanjaSuperAdmin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { supportUnreadCount } = useSupportUnread("superadmin");
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
  const sidebarMenus = useMemo(() => {
    return [
      { label: "Dashboard Super Admin", to: "/dashboardsuperadmin" },
      { label: "Monitoring Admin & User", to: "/superadmin/monitoring"},
      { label: "Grafik Barang", to: "/superadmin/grafik-barang" },
      { label: "Grafik Belanja", to: "/superadmin/grafik-belanja", active: true},
      { label: "Approval Pengajuan", to: "/approval" },
      { label: "Tambah & Kelola User", to: "/tambahuser" },
      { label: "Atur Periode", to: "/periode" },
      { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang" },
      { label: "Stock Opname Barang", to: "/stock-opname" },
      { label: "Support", to: "/support" },
    ];
  }, []);

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

  const [requests, setRequests] = useState([]);
  const [compareSearch, setCompareSearch] = useState("");
  const [comparePeriode, setComparePeriode] = useState("all");
  const [selectedUnits, setSelectedUnits] = useState([]); // empty = all units
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const toggleUnit = (uName) => {
    if (uName === "all") {
      setSelectedUnits([]);
    } else {
      setSelectedUnits((prev) =>
        prev.includes(uName) ? prev.filter((item) => item !== uName) : [...prev, uName]
      );
    }
  };

  useEffect(() => {
    async function fetchRequests() {
      try {
        const freshToken = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/monitoring/user`, {
          headers: { "Authorization": `Bearer ${freshToken}` }
        });
        const data = await res.json();
        setRequests(data.success ? data.requests || [] : []);
      } catch (e) {
        console.error("Error load requests for belanja comparison:", e);
      }
    }
    fetchRequests();
  }, []);

  const availableUnits = useMemo(() => {
    const unitSet = new Set(unitOptions);
    requests.forEach((r) => {
      if (r.unit) unitSet.add(r.unit);
    });
    return Array.from(unitSet).sort();
  }, [requests]);

  const barangSuggestions = useMemo(() => {
    if (!compareSearch.trim()) return [];
    const query = compareSearch.toLowerCase();
    const names = new Set();
    barangList.forEach((b) => {
      if (b.nama && b.nama.toLowerCase().includes(query)) names.add(b.nama);
    });
    requests.forEach((r) => {
      (r.items || []).forEach((it) => {
        const n = it.barang?.nama;
        if (n && n.toLowerCase().includes(query)) names.add(n);
      });
    });
    return Array.from(names).slice(0, 8);
  }, [compareSearch, barangList, requests]);

  const comparisonResults = useMemo(() => {
    const list = [];
    requests.forEach((req) => {
      if (comparePeriode !== "all" && req.tahun_akademik !== comparePeriode) return;
      if (selectedUnits.length > 0 && !selectedUnits.includes(req.unit)) return;

      (req.items || []).forEach((item) => {
        const bName = item.barang?.nama || "Barang";
        if (compareSearch.trim() && !bName.toLowerCase().includes(compareSearch.toLowerCase())) {
          return;
        }

        const hargaSatuan = Number(
          item.harga_satuan ||
          item.barang?.harga_satuan ||
          item.barang?.harga ||
          (item.subtotal && item.jumlah_diajukan ? item.subtotal / item.jumlah_diajukan : 0) ||
          0
        );
        const qtyDiajukan = Number(item.jumlah_diajukan || 0);
        const qtyDisetujui = Number(item.jumlah_disetujui || qtyDiajukan);
        const subtotal = Number(
          item.subtotal ||
          (hargaSatuan * qtyDisetujui) ||
          0
        );

        list.push({
          id: `${req.id}-${item.id || bName}`,
          nama: bName,
          satuan: item.barang?.satuan || "pcs",
          hargaSatuan,
          unit: req.unit || "Lainnya",
          periode: req.tahun_akademik || "-",
          jumlahDiajukan: qtyDiajukan,
          jumlahDisetujui: qtyDisetujui,
          subtotal,
          pemohon: req.user?.name || req.nama_pemohon || "User",
          status: req.status || "diproses",
        });
      });
    });
    return list;
  }, [requests, compareSearch, comparePeriode, selectedUnits]);

  const comparisonSummary = useMemo(() => {
    const totalEstBelanja = comparisonResults.reduce((acc, c) => acc + c.subtotal, 0);
    const totalQtyDisetujui = comparisonResults.reduce((acc, c) => acc + c.jumlahDisetujui, 0);
    const uniqueUnits = new Set(comparisonResults.map(c => c.unit)).size;
    return { totalEstBelanja, totalQtyDisetujui, uniqueUnits, totalRecords: comparisonResults.length };
  }, [comparisonResults]);

  const allYearsCombined = useMemo(() => {
    const setY = new Set(years.map(String));
    periodes.forEach((p) => {
      if (p.tahun_akademik) setY.add(p.tahun_akademik);
    });
    return Array.from(setY).sort();
  }, [years, periodes]);

  const [showAnalisisModal, setShowAnalisisModal] = useState(false);
  const [searchTable, setSearchTable] = useState("");

  const barangStatsBelanja = useMemo(() => {
    const map = {};
    requests.forEach((req) => {
      (req.items || []).forEach((item) => {
        const bName = item.barang?.nama || "Barang";
        const satuan = item.barang?.satuan || "pcs";
        const hargaSatuan = Number(
          item.harga_satuan ||
          item.barang?.harga_satuan ||
          item.barang?.harga ||
          (item.subtotal && item.jumlah_diajukan ? item.subtotal / item.jumlah_diajukan : 0) ||
          0
        );
        const qtyDisetujui = Number(item.jumlah_disetujui || item.jumlah_diajukan || 0);
        const subtotal = Number(item.subtotal || (hargaSatuan * qtyDisetujui) || 0);

        if (!map[bName]) {
          map[bName] = {
            nama: bName,
            satuan,
            totalDisetujui: 0,
            hargaSatuan,
            totalBelanja: 0,
          };
        }
        map[bName].totalDisetujui += qtyDisetujui;
        map[bName].totalBelanja += subtotal;
        if (hargaSatuan > 0 && map[bName].hargaSatuan === 0) {
          map[bName].hargaSatuan = hargaSatuan;
        }
      });
    });

    return Object.values(map).sort((a, b) => b.totalBelanja - a.totalBelanja);
  }, [requests]);

  const filteredBarangStatsBelanja = useMemo(() => {
    if (!searchTable) return barangStatsBelanja;
    const q = searchTable.toLowerCase();
    return barangStatsBelanja.filter(
      (b) => b.nama.toLowerCase().includes(q) || b.satuan.toLowerCase().includes(q)
    );
  }, [barangStatsBelanja, searchTable]);

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
        <SidebarLogo />

        <nav className="sidebar-menu">
          {sidebarMenus.map((m) => {
            const isActive = location.pathname === m.to;
            const isSupport = m.label === "Support";
            return (
              <div
                key={m.label}
                className={`menu-item ${isActive ? "active" : ""}`}
                style={{ cursor: isActive ? "default" : "pointer" }}
                onClick={() => !isActive && navigate(m.to)}
              >
                {m.label}
                {isSupport && supportUnreadCount > 0 && (
                  <span className="support-badge">{supportUnreadCount}</span>
                )}
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
            onClick={() => setShowAnalisisModal(true)}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#16a34a")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#005826")}
            style={{
              padding: "10px 18px",
              backgroundColor: "#005826",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: "20px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              transition: "all 0.2s ease",
            }}
          >
            Tampilkan Analisis
          </button>

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

          {/* =========================================================
              🔥 FILTER UNIFIKASI PARAMETER & PERBANDINGAN BELANJA BARANG
          ========================================================= */}
          <div className="card" style={{ marginBottom: "24px", border: "1.5px solid #005826", backgroundColor: "#f0fdf4" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
              <div>
                <div className="card-title" style={{ color: "#005826", display: "flex", alignItems: "center", gap: "8px" }}>
                  Filter Parameter & Perbandingan Belanja Barang
                </div>
                <p className="card-subtitle" style={{ color: "#15803d" }}>
                  Cari nama barang, atur status pengajuan, rentang tahun, periode, dan unit untuk menyaring data grafik dan belanja.
                </p>
              </div>
              {(compareSearch || status !== "all" || selectedYear !== "all" || selectedUnits.length > 0 || yearsCount !== 3) && (
                <button
                  onClick={() => {
                    setCompareSearch("");
                    setStatus("all");
                    setSelectedYear("all");
                    setComparePeriode("all");
                    setSelectedUnits([]);
                    setYearsCount(3);
                  }}
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#dc2626",
                    backgroundColor: "#fee2e2",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer"
                  }}
                >
                  Reset Filter
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" }}>
              {/* Kolom 1: Nama Barang */}
              <div style={{ position: "relative" }}>
                <label style={{ fontSize: "12px", color: "#1e3a8a", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                  Nama Barang:
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Cari nama barang"
                    value={compareSearch}
                    onChange={(e) => {
                      setCompareSearch(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    style={{
                      width: "100%",
                      padding: "9px 32px 9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #93c5fd",
                      fontSize: "13.5px",
                      outline: "none",
                      backgroundColor: "#ffffff"
                    }}
                  />
                  {compareSearch && (
                    <button
                      onClick={() => {
                        setCompareSearch("");
                        setShowSuggestions(false);
                      }}
                      style={{
                        position: "absolute",
                        right: "8px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "bold"
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Dropdown Suggestion Box */}
                {showSuggestions && barangSuggestions.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      zIndex: 50,
                      backgroundColor: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      marginTop: "4px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                      maxHeight: "200px",
                      overflowY: "auto"
                    }}
                  >
                    {barangSuggestions.map((sug) => (
                      <div
                        key={sug}
                        onClick={() => {
                          setCompareSearch(sug);
                          setShowSuggestions(false);
                        }}
                        style={{
                          padding: "8px 12px",
                          fontSize: "13px",
                          cursor: "pointer",
                          borderBottom: "1px solid #f1f5f9",
                          color: "#334155"
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {sug}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Kolom 2: Status Pengajuan */}
              <div>
                <label style={{ fontSize: "12px", color: "#1e3a8a", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                  Status Pengajuan:
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #93c5fd",
                    fontSize: "13.5px",
                    outline: "none",
                    backgroundColor: "#ffffff"
                  }}
                >
                  <option value="all">Semua Status</option>
                  <option value="disetujui">Disetujui Super Admin</option>
                  <option value="diverifikasi_admin">Diverifikasi Admin</option>
                </select>
              </div>

              {/* Kolom 3: Periode (Tahun Akademik) */}
              <div>
                <label style={{ fontSize: "12px", color: "#1e3a8a", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                  Periode (Tahun Akademik):
                </label>
                <select
                  value={comparePeriode}
                  onChange={(e) => {
                    setComparePeriode(e.target.value);
                    setSelectedYear(e.target.value);
                  }}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #93c5fd",
                    fontSize: "13.5px",
                    outline: "none",
                    backgroundColor: "#ffffff"
                  }}
                >
                  <option value="all">Semua Periode</option>
                  {allYearsCombined.map((yr) => (
                    <option key={`cmp-b-yr-${yr}`} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Kolom 4: Unit / Fakultas (Multi-Select) */}
              <div style={{ position: "relative" }}>
                <label style={{ fontSize: "12px", color: "#1e3a8a", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                  Unit / Fakultas:
                </label>
                <div
                  onClick={() => setShowUnitDropdown(!showUnitDropdown)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #93c5fd",
                    fontSize: "13.5px",
                    backgroundColor: "#ffffff",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    userSelect: "none"
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedUnits.length === 0 ? "Semua Unit / Fakultas" : `${selectedUnits.length} Unit Terpilih`}
                  </span>
                  <span style={{ fontSize: "10px", color: "#64748b" }}>{showUnitDropdown ? "▲" : "▼"}</span>
                </div>

                {showUnitDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      zIndex: 50,
                      backgroundColor: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      marginTop: "4px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                      maxHeight: "220px",
                      overflowY: "auto",
                      padding: "6px 0"
                    }}
                  >
                    <label
                      onClick={() => toggleUnit("all")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 12px",
                        fontSize: "13px",
                        cursor: "pointer",
                        backgroundColor: selectedUnits.length === 0 ? "#eff6ff" : "transparent",
                        fontWeight: selectedUnits.length === 0 ? "bold" : "normal",
                        borderBottom: "1px solid #f1f5f9"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUnits.length === 0}
                        onChange={() => toggleUnit("all")}
                        style={{ cursor: "pointer" }}
                      />
                      Semua Unit / Fakultas
                    </label>

                    {availableUnits.map((u) => {
                      const isChecked = selectedUnits.includes(u);
                      return (
                        <label
                          key={`unit-b-chk-${u}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleUnit(u);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 12px",
                            fontSize: "13px",
                            cursor: "pointer",
                            backgroundColor: isChecked ? "#f0fdf4" : "transparent",
                            fontWeight: isChecked ? "bold" : "normal",
                            borderBottom: "1px solid #f1f5f9"
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{ cursor: "pointer" }}
                          />
                          {u}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Kolom 5: Rentang Tahun */}
              <div>
                <label style={{ fontSize: "12px", color: "#1e3a8a", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                  Rentang Tahun:
                </label>
                <select
                  value={yearsCount}
                  onChange={(e) => {
                    setYearsCount(Number(e.target.value));
                    setSelectedYear("all");
                    setComparePeriode("all");
                  }}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #93c5fd",
                    fontSize: "13.5px",
                    outline: "none",
                    backgroundColor: "#ffffff"
                  }}
                >
                  <option value={3}>3 Tahun Terakhir</option>
                  <option value={4}>4 Tahun Terakhir</option>
                </select>
              </div>
            </div>

            {/* HASIL RINGKASAN & TABEL PERBANDINGAN BELANJA */}
            <div style={{ backgroundColor: "#ffffff", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#005826", backgroundColor: "#dcfce7", padding: "4px 10px", borderRadius: "20px" }}>
                  Transaksi Terkait: {comparisonSummary.totalRecords} Items
                </span>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#005826", backgroundColor: "#dcfce7", padding: "4px 10px", borderRadius: "20px" }}>
                  Est. Total Belanja: {rupiah(comparisonSummary.totalEstBelanja)}
                </span>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#8b5cf6", backgroundColor: "#f3e8ff", padding: "4px 10px", borderRadius: "20px" }}>
                  Unit Terlibat: {comparisonSummary.uniqueUnits} Unit
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                      <th style={{ padding: "10px" }}>Nama Barang</th>
                      <th style={{ padding: "10px" }}>Unit / Fakultas</th>
                      <th style={{ padding: "10px" }}>Periode</th>
                      <th style={{ padding: "10px", textAlign: "center" }}>Jumlah Disetujui</th>
                      <th style={{ padding: "10px", textAlign: "right" }}>Harga Estimasi</th>
                      <th style={{ padding: "10px", textAlign: "right" }}>Total Belanja</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonResults.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "16px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
                          Tidak ada data belanja yang sesuai dengan kombinasi filter perbandingan terpilih.
                        </td>
                      </tr>
                    ) : (
                      comparisonResults.slice(0, 15).map((row, idx) => (
                        <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                          <td style={{ padding: "10px", fontWeight: "700", color: "#0f172a" }}>{row.nama}</td>
                          <td style={{ padding: "10px", color: "#334155" }}>{row.unit}</td>
                          <td style={{ padding: "10px", color: "#64748b" }}>{row.periode}</td>
                          <td style={{ padding: "10px", textAlign: "center", fontWeight: "700", color: "#0284c7" }}>
                            {row.jumlahDisetujui} {row.satuan}
                          </td>
                          <td style={{ padding: "10px", textAlign: "right", color: "#475569" }}>
                            {rupiah(row.hargaSatuan)}
                          </td>
                          <td style={{ padding: "10px", textAlign: "right", fontWeight: "700", color: "#16a34a" }}>
                            {rupiah(row.subtotal)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {comparisonResults.length > 15 && (
                <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "8px", fontStyle: "italic", textAlign: "right" }}>
                  * Menampilkan 15 transaksi pertama dari total {comparisonResults.length} hasil.
                </div>
              )}
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

          {/* MODAL ANALISIS RINCIAN BELANJA BARANG */}
          {showAnalisisModal && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                backdropFilter: "blur(4px)",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px"
              }}
              onClick={() => setShowAnalisisModal(false)}
            >
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  width: "100%",
                  maxWidth: "920px",
                  maxHeight: "85vh",
                  overflowY: "auto",
                  padding: "24px",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                  position: "relative"
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setShowAnalisisModal(false)}
                  style={{
                    position: "absolute",
                    top: "16px",
                    right: "16px",
                    background: "#f1f5f9",
                    border: "none",
                    color: "#64748b",
                    borderRadius: "50%",
                    width: "32px",
                    height: "32px",
                    fontWeight: "bold",
                    fontSize: "16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  ✖
                </button>

                <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", marginBottom: "4px" }}>
                  Analisis & Tabel Rincian Belanja Barang ATK
                </h2>
                <p style={{ fontSize: "13.5px", color: "#64748b", marginBottom: "20px" }}>
                  Rincian akumulasi statistik seluruh belanja barang ATK berdasarkan total kuantitas disetujui dan estimasi nilai transaksi.
                </p>

                {/* SEARCH INPUT FILTER */}
                <div style={{ marginBottom: "16px" }}>
                  <input
                    type="text"
                    placeholder="Cari nama barang ATK..."
                    value={searchTable}
                    onChange={(e) => setSearchTable(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13.5px",
                      outline: "none"
                    }}
                  />
                </div>

                <div className="table-wrapper" style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "12px" }}>
                  <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc" }}>
                        <th style={{ width: "60px", padding: "14px", textAlign: "center" }}>NO</th>
                        <th style={{ padding: "14px" }}>NAMA BARANG ATK</th>
                        <th style={{ padding: "14px", textAlign: "center" }}>SATUAN</th>
                        <th style={{ padding: "14px", textAlign: "center" }}>JUMLAH DISETUJUI</th>
                        <th style={{ padding: "14px", textAlign: "right" }}>HARGA ESTIMASI</th>
                        <th style={{ padding: "14px", textAlign: "right" }}>ESTIMASI TOTAL BELANJA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBarangStatsBelanja.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: "20px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
                            Belum ada statistik belanja barang yang tercatat atau cocok dengan pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredBarangStatsBelanja.map((b, idx) => (
                          <tr key={b.nama} style={{ background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                            <td style={{ padding: "12px", textAlign: "center", fontWeight: "700", color: "#64748b" }}>{idx + 1}</td>
                            <td style={{ padding: "12px", fontWeight: "700", color: "#0f172a" }}>{b.nama}</td>
                            <td style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>{b.satuan}</td>
                            <td style={{ padding: "12px", textAlign: "center", fontWeight: "700", color: "#0284c7" }}>{b.totalDisetujui} {b.satuan}</td>
                            <td style={{ padding: "12px", textAlign: "right", color: "#475569" }}>{rupiah(b.hargaSatuan)}</td>
                            <td style={{ padding: "12px", textAlign: "right", fontWeight: "700", color: "#16a34a" }}>{rupiah(b.totalBelanja)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}