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

  const [showAnalisisModal, setShowAnalisisModal] = useState(false);
  const [searchTable, setSearchTable] = useState("");

  const filteredBarangStats = useMemo(() => {
    if (!searchTable) return barangStats.allBarangStats;
    return barangStats.allBarangStats.filter(b => 
      b.nama.toLowerCase().includes(searchTable.toLowerCase()) ||
      b.satuan.toLowerCase().includes(searchTable.toLowerCase())
    );
  }, [barangStats.allBarangStats, searchTable]);

  return (
    <div className="layout">
      {/* ===================== SIDEBAR ===================== */}
      <aside className="sidebar">
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
      <main className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">Grafik & Analisis Usulan Barang ATK</div>
            <div className="topbar-sub">
              Selamat datang: {currentUser?.name || "Super Admin ATK"}
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
              <div style={{ fontSize: "11px", opacity: 0.8, marginTop: "4px" }}>Periode / filter terpilih</div>
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

          {/* FILTER PARAMETER & TAHUN AKADEMIK */}
          <div className="card" style={{ marginBottom: "24px" }}>
            <div className="card-title">Filter Parameter Grafik & Laporan</div>
            <div className="filter-row" style={{ display: "flex", gap: "20px", marginTop: "12px", flexWrap: "wrap", alignItems: "center" }}>
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
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
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

                {/* DIAGRAM 3: FREKUENSI PENGADAAN BARANG */}
                <div className="card">
                  <div className="card-title">Frekuensi Pengadaan Barang ATK</div>
                  <p className="card-subtitle">Menampilkan 5 barang ATK yang paling sering diajukan dalam transaksi.</p>

                  {barangStats.freqBarangs.length === 0 ? (
                    <p style={{ color: "#64748b", fontStyle: "italic", fontSize: "13px", marginTop: "16px" }}>Belum ada data frekuensi.</p>
                  ) : (
                    <div style={{ width: "100%", height: 320, marginTop: "16px" }}>
                      <ResponsiveContainer>
                        <BarChart data={barangStats.freqBarangs} layout="vertical">
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="nama" width={110} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v) => `${v} Kali Usulan`} />
                          <Bar dataKey="totalFreq" name="Frekuensi Pengadaan" fill="#16a34a" radius={[0, 6, 6, 0]}>
                            {barangStats.freqBarangs.map((entry, index) => (
                              <Cell key={`cell-freq-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
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
