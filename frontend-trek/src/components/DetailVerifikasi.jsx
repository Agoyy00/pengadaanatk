import React, { useState } from "react";
import "../css/DetailVerifikasi.css"; 

const API_BASE = "http://127.0.0.1:8000/api";

export default function DetailVerifikasi({ pengajuan, onClose, onSuccess }) {
  const [processing, setProcessing] = useState(false);

  const [draftItems, setDraftItems] = useState(() => {
  const initial = {};
  pengajuan.items.forEach((item) => {
    initial[item.id] = {
      kebutuhan_total: item.kebutuhan_total,
      sisa_stok: item.sisa_stok,
      catatan_revisi: item.catatan_revisi || "",
    };
  });
  return initial;
});

  const user = JSON.parse(localStorage.getItem("user"));

  const handleSubmit = async () => {
  if (!window.confirm("Submit verifikasi pengajuan ini?")) return;
  for (const item of pengajuan.items) {
  const v = draftItems[item.id];
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
  jumlah_disetujui: Math.max(
    v.kebutuhan_total - v.sisa_stok,
    0
  ),
  catatan_revisi: v.catatan_revisi || "",
}));

    console.log("KIRIM ITEMS:", items);
    console.log(
  `${API_BASE}/pengajuan/${pengajuan.id}/revisi`
);


    const resRevisi = await fetch(
  `${API_BASE}/pengajuan/${pengajuan.id}/revisi`,
  {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({ items }),
  }
);


    const revisiJson = await resRevisi.json();
    console.log("RESP REVISI:", revisiJson);

    if (!resRevisi.ok) {
      alert("Gagal simpan revisi");
      return;
    }

    const resStatus = await fetch(
  `${API_BASE}/pengajuan/${pengajuan.id}/status`,
  {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      status: "diverifikasi_admin",
      role: user.role, // HARUS ADA
    }),
  }
);

    const statusJson = await resStatus.json();
    console.log("RESP STATUS:", statusJson);

    if (!resStatus.ok) {
      alert("Gagal update status");
      return;
    }

    alert("Pengajuan berhasil diverifikasi");
    onSuccess();
    onClose();
  } catch (err) {
    console.error("ERROR SUBMIT:", err);
    alert("Gagal submit verifikasi");
  } finally {
    setProcessing(false);
  }
};


  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2>Detail Verifikasi Pengajuan</h2>

        <div className="modal-info">
          <div><strong>Pemohon:</strong> {pengajuan.nama_pemohon}</div>
          <div><strong>Unit:</strong> {pengajuan.unit}</div>
          <div><strong>Jabatan:</strong> {pengajuan.jabatan}</div>
          <div><strong>Tahun Akademik:</strong> {pengajuan.tahun_akademik}</div>
        </div>

        <hr />

        {pengajuan.items.map((item) => (
          <div key={item.id} className="item-box">
            <div className="item-title">
              {item.barang?.nama} ({item.barang?.satuan})
            </div>

            <div className="item-row">
  <label>Kebutuhan Total</label>
  <input
    type="number"
    min="0"
    value={draftItems[item.id].kebutuhan_total}
    onChange={(e) =>
      setDraftItems((prev) => ({
        ...prev,
        [item.id]: {
          ...prev[item.id],
          kebutuhan_total: Number(e.target.value),
        },
      }))
    }
  />
</div>

<div className="item-row">
  <label>Sisa Stok Saat Ini</label>
  <input
    type="number"
    min="0"
    value={draftItems[item.id].sisa_stok}
    onChange={(e) =>
      setDraftItems((prev) => ({
        ...prev,
        [item.id]: {
          ...prev[item.id],
          sisa_stok: Number(e.target.value),
        },
      }))
    }
  />
</div>

{/* AUTO HITUNG */}
<div className="item-row readonly">
  <label>Jumlah Diajukan</label>
  <div className="auto-value">
    {Math.max(
      draftItems[item.id].kebutuhan_total -
      draftItems[item.id].sisa_stok,
      0
    )}{" "}
    {item.barang?.satuan}
  </div>
</div>


            <div className="item-row">
              <label>Catatan (opsional)</label>
              <textarea
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

        <div className="modal-actions">
          <button onClick={onClose} disabled={processing}>
            Batal
          </button>
          <button
            className="btn-status-verif"
            onClick={handleSubmit}
            disabled={processing}
          >
            {processing ? "Memproses..." : "Submit Verifikasi"}
          </button>
        </div>
      </div>
    </div>
  );
}
