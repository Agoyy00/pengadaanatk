import React, { useState } from "react";
import "../css/DetailVerifikasi.css"; 

const API_BASE = import.meta.env.VITE_API_BASE;
const token = localStorage.getItem("token");

export default function DetailVerifikasi({ pengajuan, onClose, onSuccess }) {
  const [processing, setProcessing] = useState(false);
  const [catatanAdmin, setCatatanAdmin] = useState("");

  const [draftItems, setDraftItems] = useState(() => {
    const initial = {};
    pengajuan.items.forEach((item) => {
      initial[item.id] = {
        kebutuhan_total: item.kebutuhan_total,
        sisa_stok: item.sisa_stok,
        catatan_revisi: item.catatan_revisi || "",
        verified: true, // default: verified
      };
    });
    return initial;
  });

  const user = JSON.parse(localStorage.getItem("user"));

  const handleVerify = async () => {
    if (!window.confirm("Submit verifikasi pengajuan ini?")) return;

    for (const item of pengajuan.items) {
      const v = draftItems[item.id];
      if (!v.verified) continue; // skip validation for unchecked items
      const namaBarang = item.barang?.nama ?? "Barang";

      if (v.kebutuhan_total < 0 || v.sisa_stok < 0) {
        alert(`${namaBarang}: nilai tidak boleh negatif`);
        return;
      }

      if (v.sisa_stok > v.kebutuhan_total) {
        alert(`${namaBarang}: sisa stok melebihi kebutuhan`);
        return;
      }
    }

    try {
      setProcessing(true);

      const items = Object.entries(draftItems).map(([id, v]) => ({
        id: Number(id),
        jumlah_disetujui: v.verified ? Math.max(v.kebutuhan_total - v.sisa_stok, 0) : 0,
        kebutuhan_total: v.kebutuhan_total,
        sisa_stok: v.sisa_stok,
        catatan_revisi: v.catatan_revisi || "",
      }));

      // 1. Simpan revisi
      const resRevisi = await fetch(`${API_BASE}/pengajuan/${pengajuan.id}/revisi`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ actor_user_id: user.id, items }),
      });

      if (!resRevisi.ok) {
        alert("Gagal simpan revisi");
        setProcessing(false);
        return;
      }

      const allRejected = items.every((item) => item.jumlah_disetujui === 0);
      const targetStatus = allRejected ? "ditolak_admin" : "diverifikasi_admin";

      // 2. Set status
      const resStatus = await fetch(`${API_BASE}/pengajuan/${pengajuan.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: targetStatus,
          user_id: user.id,
          catatan_admin: catatanAdmin || (allRejected ? "Semua barang ditolak oleh Admin" : undefined),
        }),
      });

      if (!resStatus.ok) {
        alert("Gagal update status verifikasi");
        setProcessing(false);
        return;
      }

      alert("Pengajuan berhasil diverifikasi admin");
      onSuccess();
      onClose();
    } catch (err) {
      console.error("ERROR VERIFIKASI:", err);
      alert("Gagal submit verifikasi");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!catatanAdmin.trim()) {
      alert("Catatan penolakan wajib diisi saat menolak pengajuan!");
      return;
    }

    if (!window.confirm("Apakah Anda yakin ingin menolak pengajuan ini?")) return;

    try {
      setProcessing(true);

      const resStatus = await fetch(`${API_BASE}/pengajuan/${pengajuan.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: "ditolak_admin",
          user_id: user.id,
          catatan_admin: catatanAdmin,
        }),
      });

      const resJson = await resStatus.json();

      if (!resStatus.ok) {
        alert(resJson.message || "Gagal menolak pengajuan.");
        return;
      }

      alert("Pengajuan berhasil ditolak");
      onSuccess();
      onClose();
    } catch (err) {
      console.error("ERROR PENOLAKAN:", err);
      alert("Gagal menolak pengajuan");
    } finally {
      setProcessing(false);
    }
  };

  const NumericInput = ({ value, onChange, placeholder = "0", disabled = false }) => {
    const [display, setDisplay] = React.useState(() => {
      const v = value ?? 0;
      return v === 0 ? "" : String(v);
    });
    const justBlurred = React.useRef(false);

    React.useEffect(() => {
      if (justBlurred.current) {
        justBlurred.current = false;
        return;
      }
      const v = value ?? 0;
      setDisplay(v === 0 ? "" : String(v));
    }, [value]);

    const handleChange = (e) => {
      const raw = e.target.value;
      const cleaned = raw.replace(/[^0-9]/g, "");
      setDisplay(cleaned);
      const num = cleaned === "" ? 0 : parseInt(cleaned, 10) || 0;
      onChange(num);
    };

    const handleBlur = () => {
      if (display === "") {
        justBlurred.current = true;
        setDisplay("0");
        onChange(0);
      }
    };

    return (
      <input
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        style={{ width: "100%", padding: "6px 10px" }}
      />
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: "650px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <h2 style={{ marginTop: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>Detail Verifikasi Pengajuan</h2>

        <div className="modal-info" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "12px", background: "#f8fafc", borderRadius: "10px", marginBottom: "16px" }}>
          <div><strong>Pemohon:</strong> {pengajuan.nama_pemohon}</div>
          <div><strong>Unit:</strong> {pengajuan.unit}</div>
          <div><strong>Jabatan:</strong> {pengajuan.jabatan}</div>
          <div><strong>Tahun Akademik:</strong> {pengajuan.tahun_akademik}</div>
        </div>

        <hr style={{ border: "0", borderTop: "1px solid #e2e8f0", margin: "16px 0" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {pengajuan.items.map((item) => (
            <div key={item.id} className="item-box" style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", background: draftItems[item.id].verified ? "#ffffff" : "#f8fafc" }}>
              
              {/* Checkbox Verifikasi */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <input
                  type="checkbox"
                  id={`check-${item.id}`}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  checked={draftItems[item.id].verified}
                  onChange={(e) =>
                    setDraftItems((prev) => ({
                      ...prev,
                      [item.id]: {
                        ...prev[item.id],
                        verified: e.target.checked,
                      },
                    }))
                  }
                />
                <label htmlFor={`check-${item.id}`} style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#0f172a", cursor: "pointer" }}>
                  Verifikasi Barang Ini
                </label>
              </div>

              <div className="item-title" style={{ fontSize: "15px", fontWeight: "600", color: "#334155", marginBottom: "12px", opacity: draftItems[item.id].verified ? 1 : 0.5 }}>
                {item.barang?.nama} ({item.barang?.satuan})
              </div>

              {draftItems[item.id].verified ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div className="item-row">
                    <label style={{ fontSize: "12px", color: "#64748b" }}>Kebutuhan Total</label>
                    <NumericInput
                      value={draftItems[item.id].kebutuhan_total}
                      onChange={(num) => {
                        setDraftItems((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            kebutuhan_total: num,
                          },
                        }));
                      }}
                      placeholder="0"
                    />
                  </div>

                  <div className="item-row">
                    <label style={{ fontSize: "12px", color: "#64748b" }}>Sisa Stok Saat Ini</label>
                    <NumericInput
                      value={draftItems[item.id].sisa_stok}
                      onChange={(num) => {
                        setDraftItems((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            sisa_stok: num,
                          },
                        }));
                      }}
                      placeholder="0"
                    />
                  </div>

                  {/* AUTO HITUNG */}
                  <div className="item-row readonly" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <label style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Jumlah Diajukan</label>
                    <div style={{ fontWeight: "700", color: "#0284c7" }}>
                      {Math.max(
                        draftItems[item.id].kebutuhan_total -
                        draftItems[item.id].sisa_stok,
                        0
                      )}{" "}
                      {item.barang?.satuan}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: "#ef4444", fontSize: "13px", fontWeight: "700", marginBottom: "12px", background: "#fef2f2", padding: "8px 12px", borderRadius: "8px", border: "1px solid #fecaca" }}>
                  ✕ Barang ini dikecualikan (tidak diverifikasi)
                </div>
              )}

              <div className="item-row" style={{ marginTop: "8px" }}>
                <label style={{ fontSize: "12px", color: "#64748b" }}>Catatan item (revisi/keterangan)</label>
                <input
                  type="text"
                  placeholder="Contoh: Jumlah dipotong karena stok gudang cukup..."
                  style={{ width: "100%", padding: "8px 10px" }}
                  value={draftItems[item.id].catatan_revisi}
                  onChange={(e) =>
                    setDraftItems((prev) => ({
                      ...prev,
                      [item.id]: {
                        ...prev[item.id],
                        catatan_revisi: e.target.value,
                      },
                    }))
                  }
                />
              </div>
            </div>
          ))}
        </div>

        {/* Catatan Admin Global / Alasan Penolakan */}
        <div style={{ marginTop: "20px" }}>
          <label style={{ fontWeight: "700", color: "#0f172a" }}>Catatan Admin / Alasan Penolakan:</label>
          <textarea
            style={{ width: "100%", minHeight: "80px", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "6px" }}
            placeholder="Wajib diisi jika menolak pengajuan..."
            value={catatanAdmin}
            onChange={(e) => setCatatanAdmin(e.target.value)}
          />
        </div>

        <div className="modal-actions" style={{ marginTop: "24px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button 
            onClick={onClose} 
            disabled={processing}
            style={{ background: "#94a3b8", color: "#ffffff", boxShadow: "none" }}
          >
            Batal
          </button>
          
          <button
            className="btn-danger"
            onClick={handleReject}
            disabled={processing}
          >
            {processing ? "Memproses..." : "Tolak Pengajuan"}
          </button>

          <button
            className="btn-success"
            onClick={handleVerify}
            disabled={processing}
          >
            {processing ? "Memproses..." : "Verifikasi Pengajuan"}
          </button>
        </div>
      </div>
    </div>
  );
}
