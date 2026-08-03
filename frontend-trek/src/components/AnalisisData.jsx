import React, { useEffect, useState } from "react";
import "../css/analisis.css";

const API_BASE = import.meta.env.VITE_API_BASE;
const token = localStorage.getItem("token");


export default function AnalisisData({ open, onClose }) {
  if (!open) return null;

  // =====================
  // STATE
  // =====================
  const [barangList, setBarangList] = useState([]);
  const [barangId, setBarangId] = useState("");
  const [periodeList, setPeriodeList] = useState([]);
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
  // LOAD BARANG & PERIODE
  // =====================
  useEffect(() => {
    async function loadInitialData() {
      try {
        const freshToken = localStorage.getItem("token");
        const headers = { "Authorization": `Bearer ${freshToken}` };

        // Fetch barang
        const resBarang = await fetch(`${API_BASE}/barang`, { headers });
        const dataBarang = await resBarang.json();
        setBarangList(Array.isArray(dataBarang) ? dataBarang : []);
        if (dataBarang?.length) setBarangId(String(dataBarang[0].id));

        // Fetch periode
        const resPeriode = await fetch(`${API_BASE}/periode`, { headers });
        const dataPeriode = await resPeriode.json();
        const listP = Array.isArray(dataPeriode) ? dataPeriode : (dataPeriode?.data || []);
        if (Array.isArray(listP)) {
          const uniqueYears = [...new Set(listP.map(p => p.tahun_akademik).filter(Boolean))];
          setPeriodeList(uniqueYears);
        }
      } catch (err) {
        console.error("Error load initial data:", err);
        setErrorMsg("Gagal memuat data filter");
      }
    }
    if (open) {
      loadInitialData();
    }
  }, [open]);

  // =====================
  // ANALISIS
  // =====================
  async function handleAnalisis(e) {
    if (e) e.preventDefault();
    if (!barangId) return;
    setLoading(true);
    setErrorMsg("");
    setResult(null);

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
        setErrorMsg(json.message || "Gagal mengambil data analisis");
        return;
      }

      setResult(json);
    } catch (err) {
      console.error("Error analisis:", err);
      setErrorMsg("Kesalahan koneksi ke server");
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
              {periodeList.length > 0 ? (
                periodeList.map((th) => (
                  <option key={th} value={th}>
                    {th}
                  </option>
                ))
              ) : (
                <>
                  <option value="2024/2025">2024/2025</option>
                  <option value="2025/2026">2025/2026</option>
                </>
              )}
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
        {result && !result.summary && (
          <p style={{ marginTop: "16px", color: "#64748b", fontStyle: "italic", fontSize: "13.5px" }}>
            {result.message || "Belum ada data pengajuan untuk barang ini dengan filter yang dipilih."}
          </p>
        )}

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
