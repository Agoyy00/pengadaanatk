import { useEffect } from "react";
import "../css/import.css";

export default function ImportExcelBarang({
  open,
  onClose,
  excelFile,
  setExcelFile,
  onSubmit,
  loading,
}) {
  useEffect(() => {
    console.log("IMPORT MODAL RENDERED", open);
  }, [open]);

  if (!open) return null;

  return (
    <div className="import-overlay">
      <div className="import-panel">
        <button className="import-close" onClick={onClose}>
          ✖
        </button>

        <h2 className="import-title">Import Data Barang ATK</h2>

        <p className="import-desc">
          Unggah file Excel untuk menambahkan data barang secara massal.
          Pastikan format kolom sesuai contoh di bawah.
        </p>

        {/* CONTOH FORMAT */}
        <div className="import-instruction">
          <div className="instruction-title">
            Contoh format file Excel
          </div>

          <div className="import-table-wrapper">
            <table className="import-table">
              <thead>
                <tr>
                  <th></th>
                  <th>A</th>
                  <th>B</th>
                  <th>C</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="row-index">1</td>
                  <td>Nama Barang</td>
                  <td>Satuan</td>
                  <td>Harga</td>  
                </tr>
                <tr>
                  <td className="row-index">2</td>
                  <td>Kertas A4</td>
                  <td>dus</td>
                  <td>40000</td>
                </tr>
                <tr>
                  <td className="row-index">3</td>
                  <td>Pulpen Biru</td>
                  <td>pcs</td>
                  <td>3500</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="import-note">
            <b>1</b> = Sesuaikan Baris Pertama  <br />
            <b>A</b> = Nama Barang <br />
            <b>B</b> = Satuan Barang (dus) <br />
            <b>C</b> = Harga (angka tanpa titik)
          </div>
        </div>

        {/* FILE INPUT */}
        <div className="import-file-wrapper">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setExcelFile(e.target.files[0])}
          />

          {excelFile && (
            <div className="import-file">
              📄 {excelFile.name}
            </div>
          )}
        </div>

        {/* ACTION */}
        <div className="import-actions">
          <button
            className="import-btn-cancel"
            onClick={onClose}
          >
            Batal
          </button>

          <button
            className="import-btn-submit"
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? "Mengimpor..." : "Import Data"}
          </button>
        </div>
      </div>
    </div>
  );
}
