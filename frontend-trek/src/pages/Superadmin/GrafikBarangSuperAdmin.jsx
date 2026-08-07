import DesktopSidebarToggle from '../../components/DesktopSidebarToggle';
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
} from "recharts";
import "../../css/layout.css";
import "../../css/tabel.css";
import RoleSwitcher from "../../components/RoleSwitcher";


const API_BASE = import.meta.env.VITE_API_BASE;
const COLORS = ["#0284c7", "#16a34a", "#8b5cf6", "#ea580c", "#e11d48", "#06b6d4", "#d97706", "#475569"];
const DEFAULT_UNITS = [
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

export default function GrafikBarangSuperAdmin() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [barangs, setBarangs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [periodes, setPeriodes] = useState([]);

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  const sidebarMenus = useMemo(() => {
    return [
      { label: "Dashboard Super Admin", to: "/dashboardsuperadmin" },
      { label: "Monitoring Admin", to: "/superadmin/monitoring-admin" },
      { label: "Monitoring User", to: "/superadmin/monitoring-user" },
      { label: "Grafik Barang", to: "/superadmin/grafik-barang", active: true },
      { label: "Grafik Belanja", to: "/superadmin/grafik-belanja" },
      { label: "Approval Pengajuan", to: "/approval" },
      { label: "Tambah & Kelola User", to: "/tambahuser" },
      { label: "Atur Periode", to: "/periode" },
      { label: "Daftar Barang ATK", to: "/superadmin/daftar-barang" },
      { label: "Stock Opname Barang", to: "/stock-opname" },
      { label: "Template Dokumen", to: "/template-dokumen" },
    ];
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = { "Authorization": `Bearer ${token}` };

      // 1. Fetch Barangs
      const resB = await fetch(`${API_BASE}/barang`, { headers });
      const dataB = await resB.json();
      setBarangs(Array.isArray(dataB) ? dataB : []);

      // 2. Fetch User Requests for analytics
      const resR = await fetch(`${API_BASE}/monitoring/user`, { headers });
      const dataR = await resR.json();
      setRequests(dataR.success ? dataR.requests || [] : []);

      // 3. Fetch Registered Periodes from Atur Periode
      const resP = await fetch(`${API_BASE}/periode`, { headers });
      const dataP = await resP.json();
      const pList = Array.isArray(dataP) ? dataP : (dataP?.data || []);
      setPeriodes(pList);
    } catch (err) {
      console.error("Gagal memuat data grafik barang:", err);
    } finally {
      setLoading(false);
    }
  };

  const [selectedYear, setSelectedYear] = useState("all");
  const [yearsCount, setYearsCount] = useState(3);

  // Extract available years/periodes (Automatic & Dynamic)
  const availableYears = useMemo(() => {
    const yearsSet = new Set();

    // From Atur Periode
    periodes.forEach((p) => {
      if (p.tahun_akademik) yearsSet.add(p.tahun_akademik);
    });

    // From submitted requests
    requests.forEach((r) => {
      if (r.tahun_akademik) {
        yearsSet.add(r.tahun_akademik);
      } else if (r.created_at) {
        const y = new Date(r.created_at).getFullYear();
        if (y) yearsSet.add(String(y));
      }
    });

    return Array.from(yearsSet).sort();
  }, [periodes, requests]);

  // Filter requests based on selected year or yearsCount
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (selectedYear !== "all") {
        return req.tahun_akademik === selectedYear;
      }
      return true;
    });
  }, [requests, selectedYear]);

  // Analytics computation
  const barangStats = useMemo(() => {
    const counts = {};
    const unitCounts = {};

    filteredRequests.forEach((req) => {
      const unitName = req.unit || "Lainnya";
      if (!unitCounts[unitName]) unitCounts[unitName] = 0;

      (req.items || []).forEach((item) => {
        const bName = item.barang?.nama || "Barang";
        const qty = item.jumlah_diajukan || 0;

        if (!counts[bName]) {
          counts[bName] = { nama: bName, totalQty: 0, totalFreq: 0, satuan: item.barang?.satuan || "pcs" };
        }
        counts[bName].totalQty += qty;
        counts[bName].totalFreq += 1;
        unitCounts[unitName] += qty;
      });
    });

    const sortedBarangs = Object.values(counts).sort((a, b) => b.totalQty - a.totalQty);
    const maxQty = sortedBarangs.length > 0 ? sortedBarangs[0].totalQty : 1;

    const unitList = Object.entries(unitCounts)
      .map(([unit, totalQty]) => ({ name: unit, value: totalQty }))
      .sort((a, b) => b.value - a.value);

    const freqSorted = [...sortedBarangs].sort((a, b) => b.totalFreq - a.totalFreq).slice(0, 5);

    return {
      topBarangs: sortedBarangs.slice(0, 5),
      freqBarangs: freqSorted,
      allBarangStats: sortedBarangs,
      maxQty: maxQty,
      unitList: unitList,
    };
  }, [filteredRequests]);

  // Dynamic list of available Units
  const availableUnits = useMemo(() => {
    const unitSet = new Set(DEFAULT_UNITS);
    requests.forEach((r) => {
      if (r.unit) unitSet.add(r.unit);
    });
    return Array.from(unitSet).sort();
  }, [requests]);

  // Filter Perbandingan State
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

  // Suggestions for search column
  const barangSuggestions = useMemo(() => {
    if (!compareSearch.trim()) return [];
    const query = compareSearch.toLowerCase();
    const names = new Set();
    barangs.forEach((b) => {
      if (b.nama && b.nama.toLowerCase().includes(query)) names.add(b.nama);
    });
    requests.forEach((r) => {
      (r.items || []).forEach((it) => {
        const n = it.barang?.nama;
        if (n && n.toLowerCase().includes(query)) names.add(n);
      });
    });
    return Array.from(names).slice(0, 8);
  }, [compareSearch, barangs, requests]);

  // Computed comparison results
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

        list.push({
          id: `${req.id}-${item.id || bName}`,
          nama: bName,
          satuan: item.barang?.satuan || "pcs",
          unit: req.unit || "Lainnya",
          periode: req.tahun_akademik || "-",
          jumlahDiajukan: item.jumlah_diajukan || 0,
          jumlahDisetujui: item.jumlah_disetujui || item.jumlah_diajukan || 0,
          pemohon: req.user?.name || req.nama_pemohon || "User",
          status: req.status || "diproses",
        });
      });
    });
    return list;
  }, [requests, compareSearch, comparePeriode, selectedUnits]);

  // Aggregate stats for comparison table
  const comparisonSummary = useMemo(() => {
    const totalQty = comparisonResults.reduce((acc, c) => acc + c.jumlahDiajukan, 0);
    const uniqueUnits = new Set(comparisonResults.map(c => c.unit)).size;
    const uniqueItems = new Set(comparisonResults.map(c => c.nama)).size;
    return { totalQty, uniqueUnits, uniqueItems, totalRecords: comparisonResults.length };
  }, [comparisonResults]);

  const [showAnalisisModal, setShowAnalisisModal] = useState(false);
  const [searchTable, setSearchTable] = useState("");

  const filteredBarangStats = useMemo(() => {
    if (!searchTable) return barangStats.allBarangStats;
    return barangStats.allBarangStats.filter(b => 
      b.nama.toLowerCase().includes(searchTable.toLowerCase()) ||
      b.satuan.toLowerCase().includes(searchTable.toLowerCase())
    );
  }, [barangStats.allBarangStats, searchTable]);

  
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  return (
    <div className="layout">
      <DesktopSidebarToggle isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      {/* ===================== SIDEBAR ===================== */}
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
            const isActive = m.active || location.pathname === m.to;
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
          style={{ cursor: "pointer" }}
          onClick={() => {
            localStorage.removeItem("user");
            window.location.href = "/";
          }}
        >
          Log Out
        </div>
      </aside>

      {/* ===================== MAIN ===================== */}
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
            <div className="topbar-title">Grafik & Analisis Usulan Barang ATK</div>
            <div className="topbar-sub">
              Selamat datang: {currentUser?.name || "Super Admin ATK"}
            </div>
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

          {/* STAT CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div className="card" style={{ padding: "20px", background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "#fff" }}>
              <div style={{ fontSize: "12.5px", opacity: 0.9, fontWeight: 600 }}>Total Jenis Barang</div>
              <div style={{ fontSize: "26px", fontWeight: 800, marginTop: "6px" }}>{barangs.length} Item</div>
              <div style={{ fontSize: "11px", opacity: 0.8, marginTop: "4px" }}>Katalog Master ATK</div>
            </div>

            <div className="card" style={{ padding: "20px", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff" }}>
              <div style={{ fontSize: "12.5px", opacity: 0.9, fontWeight: 600 }}>Total Usulan Barang</div>
              <div style={{ fontSize: "26px", fontWeight: 800, marginTop: "6px" }}>
                {filteredRequests.reduce((acc, r) => acc + (r.items?.length || 0), 0)} Item
              </div>
              <div style={{ fontSize: "11px", opacity: 0.8, marginTop: "4px" }}>Akumulasi dari pengajuan</div>
            </div>

            <div className="card" style={{ padding: "20px", background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "#fff" }}>
              <div style={{ fontSize: "12.5px", opacity: 0.9, fontWeight: 600 }}>Barang Terfavorit</div>
              <div style={{ fontSize: "18px", fontWeight: 700, marginTop: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {barangStats.topBarangs[0]?.nama || "-"}
              </div>
              <div style={{ fontSize: "11px", opacity: 0.8, marginTop: "4px" }}>
                {barangStats.topBarangs[0]?.totalQty || 0} unit diminta
              </div>
            </div>
          </div>

          {/* =========================================================
              🔥 FILTER UNIFIKASI PARAMETER & PERBANDINGAN DATA BARANG
          ========================================================= */}
          <div className="card" style={{ marginBottom: "24px", border: "1px solid #3b82f6", backgroundColor: "#f0f9ff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
              <div>
                <div className="card-title" style={{ color: "#1d4ed8", display: "flex", alignItems: "center", gap: "8px" }}>
                  ⚖️ Filter Parameter & Perbandingan Data Barang
                </div>
                <p className="card-subtitle" style={{ color: "#3b82f6" }}>
                  Cari nama barang, pilih rentang tahun, periode, dan unit untuk menyaring data grafik dan laporan perbandingan.
                </p>
              </div>
              {(compareSearch || selectedYear !== "all" || selectedUnits.length > 0 || yearsCount !== 3) && (
                <button
                  onClick={() => {
                    setCompareSearch("");
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

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "16px" }}>
              {/* Kolom 1: Nama Barang */}
              <div style={{ position: "relative" }}>
                <label style={{ fontSize: "12px", color: "#1e3a8a", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                  Nama Barang:
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="🔍 Cari nama barang"
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
                        📦 {sug}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Kolom 2: Periode (Tahun Akademik) */}
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
                  {availableYears.map((yr) => (
                    <option key={`cmp-yr-${yr}`} value={yr}>
                      📅 {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Kolom 3: Unit / Fakultas (Multi-Select) */}
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
                    🏢 {selectedUnits.length === 0 ? "Semua Unit / Fakultas" : `${selectedUnits.length} Unit Terpilih`}
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
                          key={`unit-chk-${u}`}
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
                          🏢 {u}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Kolom 4: Rentang Tahun */}
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
                  <option value={5}>5 Tahun Terakhir</option>
                </select>
              </div>
            </div>

            {/* HASIL RINGKASAN & TABEL PERBANDINGAN */}
            <div style={{ backgroundColor: "#ffffff", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#0284c7", backgroundColor: "#e0f2fe", padding: "4px 10px", borderRadius: "20px" }}>
                  📊 Total Usulan Ditemukan: {comparisonSummary.totalRecords} Transaksi
                </span>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#16a34a", backgroundColor: "#dcfce7", padding: "4px 10px", borderRadius: "20px" }}>
                  📦 Total Volume Requested: {comparisonSummary.totalQty} Item
                </span>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#8b5cf6", backgroundColor: "#f3e8ff", padding: "4px 10px", borderRadius: "20px" }}>
                  🏢 Unit Terlibat: {comparisonSummary.uniqueUnits} Unit
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                      <th style={{ padding: "10px" }}>Nama Barang</th>
                      <th style={{ padding: "10px" }}>Unit / Fakultas</th>
                      <th style={{ padding: "10px" }}>Periode</th>
                      <th style={{ padding: "10px", textAlign: "center" }}>Jumlah Diajukan</th>
                      <th style={{ padding: "10px" }}>Pemohon</th>
                      <th style={{ padding: "10px", textAlign: "center" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonResults.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "16px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
                          Tidak ada data yang sesuai dengan kombinasi filter perbandingan terpilih.
                        </td>
                      </tr>
                    ) : (
                      comparisonResults.slice(0, 15).map((row, idx) => (
                        <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                          <td style={{ padding: "10px", fontWeight: "700", color: "#0f172a" }}>{row.nama}</td>
                          <td style={{ padding: "10px", color: "#334155" }}>{row.unit}</td>
                          <td style={{ padding: "10px", color: "#64748b" }}>{row.periode}</td>
                          <td style={{ padding: "10px", textAlign: "center", fontWeight: "700", color: "#16a34a" }}>
                            {row.jumlahDiajukan} {row.satuan}
                          </td>
                          <td style={{ padding: "10px", color: "#475569" }}>{row.pemohon}</td>
                          <td style={{ padding: "10px", textAlign: "center" }}>
                            <span style={{
                              padding: "3px 8px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: "700",
                              textTransform: "capitalize",
                              backgroundColor: row.status === "disetujui" ? "#dcfce7" : row.status === "ditolak" ? "#fee2e2" : "#fef3c7",
                              color: row.status === "disetujui" ? "#15803d" : row.status === "ditolak" ? "#b91c1c" : "#b45309"
                            }}>
                              {row.status}
                            </span>
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

          {loading ? (
            <p style={{ fontSize: "13.5px", color: "#64748b" }}>Sedang memuat data grafik barang...</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* GRID DIAGRAM RECHARTS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "24px" }}>
                
                {/* DIAGRAM 1: BAR CHART TOP 5 BARANG DIAJUKAN */}
                <div className="card">
                  <div className="card-title">Grafik Permintaan Top 5 Barang ATK</div>
                  <p className="card-subtitle">Volume kuantitas usulan terbanyak dari seluruh pengajuan user.</p>

                  {barangStats.topBarangs.length === 0 ? (
                    <p style={{ color: "#64748b", fontStyle: "italic", fontSize: "13px", marginTop: "16px" }}>Belum ada data usulan barang.</p>
                  ) : (
                    <div style={{ width: "100%", height: 320, marginTop: "16px" }}>
                      <ResponsiveContainer>
                        <BarChart data={barangStats.topBarangs}>
                          <XAxis dataKey="nama" tick={{ fontSize: 11 }} />
                          <YAxis />
                          <Tooltip formatter={(v) => `${v} Unit`} />
                          <Bar dataKey="totalQty" name="Total Kuantitas Diajukan" fill="#0284c7" radius={[6, 6, 0, 0]}>
                            {barangStats.topBarangs.map((entry, index) => (
                              <Cell key={`cell-top-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* DIAGRAM 2: PIE / DONUT CHART DISTRIBUSI PERMINTAAN PER UNIT */}
                <div className="card">
                  <div className="card-title">Proporsi Kebutuhan Barang per Unit / Fakultas</div>
                  <p className="card-subtitle">Persentase akumulasi volume barang yang dibutuhkan oleh tiap unit.</p>

                  {barangStats.unitList.length === 0 ? (
                    <p style={{ color: "#64748b", fontStyle: "italic", fontSize: "13px", marginTop: "16px" }}>Belum ada data pengajuan unit.</p>
                  ) : (
                    <div style={{ width: "100%", height: 320, marginTop: "16px" }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={barangStats.unitList}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={95}
                            paddingAngle={3}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {barangStats.unitList.map((entry, index) => (
                              <Cell key={`cell-u-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => `${v} Barang`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

          {/* MODAL TAMPILKAN ANALISIS (BERISI TABEL RINCIAN PERMINTAAN BARANG MASTER ATK) */}
          {showAnalisisModal && (
            <div className="analisis-overlay" style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(15, 23, 42, 0.65)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "20px"
            }}>
              <div style={{
                backgroundColor: "#fff",
                borderRadius: "16px",
                maxWidth: "950px",
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                padding: "28px",
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                position: "relative"
              }}>
                <button
                  onClick={() => setShowAnalisisModal(false)}
                  style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    backgroundColor: "#ef4444",
                    color: "#fff",
                    border: "none",
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
                  Analisis & Tabel Rincian Permintaan Barang ATK
                </h2>
                <p style={{ fontSize: "13.5px", color: "#64748b", marginBottom: "20px" }}>
                  Rincian akumulasi statistik seluruh barang ATK yang diajukan oleh pengguna sistem.
                </p>

                {/* SEARCH INPUT FILTER */}
                <div style={{ marginBottom: "16px" }}>
                  <input
                    type="text"
                    placeholder="🔍 Cari nama barang ATK..."
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
                        <th style={{ padding: "14px", textAlign: "center" }}>FREKUENSI PENGADAAN</th>
                        <th style={{ padding: "14px", textAlign: "center" }}>TOTAL QUANTITY USULAN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBarangStats.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
                            Belum ada statistik barang yang tercatat atau cocok dengan pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredBarangStats.map((b, idx) => (
                          <tr key={b.nama} style={{ background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                            <td style={{ padding: "12px", textAlign: "center", fontWeight: "700", color: "#64748b" }}>{idx + 1}</td>
                            <td style={{ padding: "12px", fontWeight: "700", color: "#0f172a" }}>{b.nama}</td>
                            <td style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>{b.satuan}</td>
                            <td style={{ padding: "12px", textAlign: "center" }}>{b.totalFreq} kali</td>
                            <td style={{ padding: "12px", textAlign: "center", fontWeight: "700", color: "#16a34a" }}>{b.totalQty} {b.satuan}</td>
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