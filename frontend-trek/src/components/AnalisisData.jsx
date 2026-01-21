import React, { useEffect, useState } from "react";
import "../css/analisis.css";

const API_BASE = "http://127.0.0.1:8000/api";
const token = localStorage.getItem("token");


export default function AnalisisData({ open, onClose }) {
  if (!open) return null;

  // =====================
  // STATE
  // =====================
  const [barangList, setBarangList] = useState([]);
  const [barangId, setBarangId] = useState("");
  const [tahunAkademik, setTahunAkademik] = useState("all");
  const [unit, setUnit] = useState("all");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState(null);

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

  // =====================
  // LOAD BARANG
  // =====================
  useEffect(() => {
    async function loadBarang() {
      try {
        const res = await fetch(`${API_BASE}/barang`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        const data = await res.json();
        setBarangList(data || []);
        if (data?.length) setBarangId(String(data[0].id));
      } catch {
        setErrorMsg("Gagal memuat daftar barang");
      }
    }
    loadBarang();
  }, []);

  // =====================
  // ANALISIS
  // =====================
  async function handleAnalisis(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setResult(null);

    try {
      const params = new URLSearchParams({
        barang_id: barangId,
        tahun_akademik: tahunAkademik,
        unit,
      });

      const res = await fetch(`${API_BASE}/analisis-barang?${params}`, 
        { headers: { "Authorization": `Bearer ${token}` } });
      const json = await res.json();

      if (!res.ok || json.success === false) {
        setErrorMsg(json.message || "Gagal mengambil analisis");
        return;
      }

      setResult(json);
    } catch {
      setErrorMsg("Kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  }

  // =====================
  // RENDER PANEL
  // =====================
  return (
    <div className="analisis-overlay">
      <div className="analisis-panel">
        {/* CLOSE */}
        <button className="analisis-close" onClick={onClose}>
          ✖
        </button>

        <h2 className="analisis-title">Analisis Penggunaan ATK</h2>
        <p className="analisis-subtitle">
          Pilih barang, tahun akademik, dan unit untuk melihat ringkasan penggunaan
        </p>

        {/* FILTER */}
        <form onSubmit={handleAnalisis}>
          <div className="analisis-filter">
            <select value={barangId} onChange={(e) => setBarangId(e.target.value)}>
              {barangList.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nama}
                </option>
              ))}
            </select>

            <select
              value={tahunAkademik}
              onChange={(e) => setTahunAkademik(e.target.value)}
            >
              <option value="all">Semua Tahun</option>
              <option value="2023/2024">2023/2024</option>
              <option value="2024/2025">2024/2025</option>
              <option value="2025/2026">2025/2026</option>
            </select>

            <select value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="all">Semua Unit</option>
              {unitOptions.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Memproses..." : "Tampilkan Analisis"}
          </button>

          {errorMsg && <p className="error-text">{errorMsg}</p>}
        </form>

        {/* HASIL */}
        {result?.summary && (
          <div className="analisis-result">
            <h3>
              {result.barang.nama} ({result.barang.satuan})
            </h3>

            <p>
              <b>Total Kebutuhan:</b>{" "}
              {result.summary.total_kebutuhan.toLocaleString("id-ID")}
              <br />
              <b>Total Sisa Stok:</b>{" "}
              {result.summary.total_sisa_stok.toLocaleString("id-ID")}
              <br />
              <b>Total Diajukan:</b>{" "}
              {result.summary.total_diajukan.toLocaleString("id-ID")}
              <br />
              <b>Perkiraan Penggunaan:</b>{" "}
              {result.summary.penggunaan.toLocaleString("id-ID")}
            </p>

            <table className="analisis-table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Kebutuhan</th>
                  <th>Sisa Stok</th>
                  <th>Diajukan</th>
                  <th>Penggunaan</th>
                </tr>
              </thead>
              <tbody>
                {result.per_unit.map((row) => (
                  <tr key={row.unit}>
                    <td>{row.unit}</td>
                    <td>{row.total_kebutuhan}</td>
                    <td>{row.total_sisa_stok}</td>
                    <td>{row.total_diajukan}</td>
                    <td>{row.penggunaan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
