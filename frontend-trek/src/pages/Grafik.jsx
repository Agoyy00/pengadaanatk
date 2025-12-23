import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Pengajuan.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

const API_BASE = "http://127.0.0.1:8000/api";

export default function Grafik() {
  const navigate = useNavigate();

  // User login (harusnya superadmin)
  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  // Dropdown data
  const [barangList, setBarangList] = useState([]);
  const [barangId, setBarangId] = useState("");
  const [tahunAkademik, setTahunAkademik] = useState("all");
  const [unit, setUnit] = useState("all");

  // Result & status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState(null);

  // Daftar unit sama seperti di Pengajuan.jsx
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

  // ==== Ambil daftar barang untuk dropdown ====
  useEffect(() => {
    async function loadBarangs() {
      try {
        const res = await fetch(`${API_BASE}/barang`);
        const data = await res.json();
        setBarangList(data || []);
        if (data && data.length > 0) {
          setBarangId(String(data[0].id));
        }
      } catch (err) {
        console.error("Gagal mengambil daftar barang:", err);
        setErrorMsg("Gagal memuat daftar barang.");
      }
    }

    loadBarangs();
  }, []);

  // ==== Submit analisis ====
  async function handleAnalisis(e) {
    e.preventDefault();
    setErrorMsg("");
    setResult(null);

    if (!barangId) {
      setErrorMsg("Silakan pilih barang terlebih dahulu.");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        barang_id: barangId,
        tahun_akademik: tahunAkademik,
        unit: unit,
      });

      const res = await fetch(`${API_BASE}/analisis-barang?${params.toString()}`);

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        console.error("Error analisis:", data);
        setErrorMsg(
          data.message || "Gagal mengambil data analisis. Coba lagi nanti."
        );
        return;
      }

      setResult(data);
    } catch (err) {
      console.error("Error jaringan:", err);
      setErrorMsg("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="layout">
      {/* SIDEBAR SUPER ADMIN */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">Sistem Pengajuan ATK</div>
          <div className="sidebar-subtitle">Universitas Yarsi</div>
        </div>

        <nav className="sidebar-menu">
          <div className="menu-item" onClick={() => navigate("/approval")}>
            Dashboard Super Admin
          </div>
          <div className="menu-item disabled">Analisis Data</div>
          <div className="menu-item" onClick={() => navigate("/tambahuser")}>
            Tambah User
          </div>
        </nav>

        <div
          className="logout"
          onClick={() => (window.location.href = "/")}
          style={{ cursor: "pointer" }}
        >
          Log Out
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        {/* TOPBAR */}
        <header className="topbar">
          <div>
            <div className="topbar-title">Analisis Data Penggunaan ATK</div>
            <div className="topbar-sub">
              Super Admin dapat menganalisis data pengajuan berdasarkan item
              spesifik (misalnya penggunaan kertas, pulpen) di seluruh unit.
            </div>
          </div>
          <div className="topbar-right">
            <span>Role: {currentUser?.role || "superadmin"}</span>
            <span className="role-pill">{currentUser?.role || "superadmin"}</span>
          </div>
        </header>

        {/* CONTENT */}
        <section className="main-content">
          <div className="card">
            <div className="card-title">Filter Analisis</div>
            <div className="card-subtitle">
              Pilih barang, tahun akademik, dan unit untuk melihat total
              pengajuan dan sisa stok di masing-masing unit.
            </div>

            <form onSubmit={handleAnalisis}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 20,
                  maxWidth: 800,
                  marginBottom: 16,
                }}
              >
                {/* Barang */}
                <div className="form-group">
                  <label>Barang</label>
                  <select
                    className="input-text"
                    value={barangId}
                    onChange={(e) => setBarangId(e.target.value)}
                  >
                    {barangList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nama}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tahun Akademik */}
                <div className="form-group">
                  <label>Tahun Akademik</label>
                  <select
                    className="input-text"
                    value={tahunAkademik}
                    onChange={(e) => setTahunAkademik(e.target.value)}
                  >
                    <option value="all">Semua Tahun</option>
                    <option value="2023/2024">2023/2024</option>
                    <option value="2024/2025">2024/2025</option>
                    <option value="2025/2026">2025/2026</option>
                  </select>
                </div>

                {/* Unit */}
                <div className="form-group">
                  <label>Unit</label>
                  <select
                    className="input-text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  >
                    <option value="all">Semua Unit</option>
                    {unitOptions.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Mengambil data..." : "Tampilkan Analisis"}
              </button>

              {errorMsg && (
                <p className="error-text" style={{ marginTop: 8 }}>
                  {errorMsg}
                </p>
              )}
            </form>
          </div>

          {/* HASIL ANALISIS */}
          {result && result.summary && (
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-title">
                Hasil Analisis – {result.barang.nama} ({result.barang.satuan})
              </div>
              <div className="card-subtitle">
                {result.tahun_akademik === "all"
                  ? "Semua tahun akademik"
                  : `Tahun Akademik: ${result.tahun_akademik || "-"}`}{" "}
                {result.unit_filter && result.unit_filter !== "all"
                  ? ` | Unit: ${result.unit_filter}`
                  : " | Semua unit"}
              </div>

              <div style={{ marginTop: 12, marginBottom: 12 }}>
                <strong>Ringkasan Total (semua unit):</strong>
                <p>
                  Total kebutuhan:{" "}
                  <b>{result.summary.total_kebutuhan.toLocaleString("id-ID")}</b>{" "}
                  {result.barang.satuan} <br />
                  Total sisa stok:{" "}
                  <b>{result.summary.total_sisa_stok.toLocaleString("id-ID")}</b>{" "}
                  {result.barang.satuan} <br />
                  Total diajukan:{" "}
                  <b>{result.summary.total_diajukan.toLocaleString("id-ID")}</b>{" "}
                  {result.barang.satuan} <br />
                  Perkiraan penggunaan (kebutuhan − sisa stok):{" "}
                  <b>{result.summary.penggunaan.toLocaleString("id-ID")}</b>{" "}
                  {result.barang.satuan}
                </p>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Unit</th>
                      <th>Total Kebutuhan</th>
                      <th>Total Sisa Stok</th>
                      <th>Total Diajukan</th>
                      <th>Perkiraan Penggunaan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.per_unit.length === 0 ? (
                      <tr>
                        <td colSpan="5">Belum ada data pengajuan untuk filter ini.</td>
                      </tr>
                    ) : (
                      result.per_unit.map((row) => (
                        <tr key={row.unit}>
                          <td>{row.unit}</td>
                          <td>{row.total_kebutuhan.toLocaleString("id-ID")}</td>
                          <td>{row.total_sisa_stok.toLocaleString("id-ID")}</td>
                          <td>{row.total_diajukan.toLocaleString("id-ID")}</td>
                          <td>{row.penggunaan.toLocaleString("id-ID")}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== GRAFIK PENGGUNAAN PER UNIT ===== */}
          {result && result.per_unit && result.per_unit.length > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-title">Grafik Penggunaan per Unit</div>
              <div style={{ width: "100%", height: 350, border: "2px solid red" }}>
                console.log("PER UNIT:", result.per_unit);
                <ResponsiveContainer>
                  <BarChart data={result.per_unit}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="unit" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="penggunaan" fill="#8884d8" name="Perkiraan Penggunaan" />
                    <Bar dataKey="total_diajukan" fill="#82ca9d" name="Total Diajukan" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {result && !result.summary && !errorMsg && (
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-title">Hasil Analisis</div>
              <p>{result.message || "Belum ada data pengajuan untuk filter ini."}</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
