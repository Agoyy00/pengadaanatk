import { useState } from "react";
import "../css/import.css";
import "../css/layout.css";

export default function ImportExcelBarang() {
  const [showPanel, setShowPanel] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!file) {
      alert("Silakan pilih file Excel terlebih dahulu");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await fetch(
        "http://127.0.0.1:8000/api/barang/import-excel",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) throw new Error();

      alert("Import data barang berhasil ✅");
      setShowPanel(false);
      setFile(null);
    } catch {
      alert("Import gagal ❌");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      {/* BUTTON */}
      <button className="btn-excel" onClick={() => setShowPanel(!showPanel)}>
        📤 Import Excel
      </button>

      {/* PANEL */}
      {showPanel && (
        <div className="excel-panel">
          <h3 className="excel-title">Import Barang ATK</h3>

          <div className="excel-subtitle">
            Gunakan template Excel berikut agar proses import berjalan lancar dan
            data tersimpan dengan konsisten.
          </div>

          <div className="excel-format-box">
            <div><b>Kolom wajib (urutan harus sama):</b></div>
            <ul style={{ paddingLeft: 18, margin: "6px 0" }}>
              <li>Nama Barang</li>
              <li>Satuan <b>(dus)</b></li>
              <li>Harga Satuan (Rp)</li>
            </ul>

            <div style={{ fontSize: 12, marginTop: 6 }}>
              • Kode barang akan <b>dibuat otomatis</b> oleh sistem<br />
              • Harga harus berupa angka (tanpa titik / koma)
            </div>
          </div>

          <input
            type="file"
            accept=".xlsx,.xls"
            className="excel-file"
            onChange={(e) => setFile(e.target.files[0])}
          />

          {file && (
            <div className="excel-file-name">
              📄 File dipilih: <b>{file.name}</b>
            </div>
          )}

          <div className="excel-actions">
            <button
              className="btn-cancel"
              onClick={() => setShowPanel(false)}
            >
              Batal
            </button>

            <button
              className="btn-submit"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Mengimpor..." : "Submit Import"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
