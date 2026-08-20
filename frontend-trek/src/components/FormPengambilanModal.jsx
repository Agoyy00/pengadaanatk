import React, { useState, useRef, useEffect } from "react";
import Swal from "sweetalert2";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

export default function FormPengambilanModal({ isOpen, onClose, pengajuan, onSuccess }) {
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  const [namaPenerima, setNamaPenerima] = useState("");
  const [unit, setUnit] = useState("");
  const [tanggalPengambilan, setTanggalPengambilan] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [catatanKondisi, setCatatanKondisi] = useState("");
  const [fotoSerahTerima, setFotoSerahTerima] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [pengambilansHistory, setPengambilansHistory] = useState([]);
  const [isFullyTaken, setIsFullyTaken] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const NumericInput = ({ value, onChange, placeholder = "0", disabled = false, className = "", readOnly = false, max }) => {
    const [display, setDisplay] = useState(() => {
      const v = value ?? 0;
      return v === 0 ? "" : String(v);
    });
    const justBlurred = useRef(false);

    useEffect(() => {
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
      const num = cleaned === "" ? 0 : parseInt(cleaned, 10) || 0;
      if (max !== undefined && num > max) {
        setDisplay(String(max));
        onChange(max);
        return;
      }
      setDisplay(cleaned);
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
        className={`${className}`}
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
      />
    );
  };

  useEffect(() => {
    if (isOpen && pengajuan) {
      setNamaPenerima(pengajuan.nama_pemohon || currentUser?.name || "");
      setUnit(pengajuan.unit || currentUser?.unit || "");
      setTanggalPengambilan(new Date().toISOString().split("T")[0]);
      setCatatanKondisi("");
      setFotoSerahTerima(null);
      setFotoPreview(null);
      setHasSignature(false);

      loadHandoverData();
    }
  }, [isOpen, pengajuan]);

  const loadHandoverData = async () => {
    if (!pengajuan?.id) return;
    try {
      setLoadingData(true);
      const res = await fetch(`${API_BASE}/pengajuan/${pengajuan.id}/pengambilan`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        setPengambilansHistory(data.pengambilans || []);
        setIsFullyTaken(data.is_fully_taken || false);

        // Build items based on items_status (with sisa_belum_diambil)
        const statusItems = data.items_status || [];
        const initialItems = statusItems.map((item) => {
          const sisa = item.sisa_belum_diambil ?? 0;
          return {
            pengajuan_item_id: item.id,
            barang_id: item.barang_id,
            nama: item.barang?.nama || `Barang #${item.barang_id}`,
            kode: item.barang?.kode || "-",
            satuan: item.barang?.satuan || "Pcs",
            stok_gudang: item.barang?.stok ?? 0,
            jumlah_disetujui: item.jumlah_disetujui_final ?? 0,
            jumlah_diambil_kumulatif: item.jumlah_diambil_kumulatif ?? 0,
            sisa_belum_diambil: sisa,
            jumlah_diambil: sisa, // Default to remaining qty
            catatan: "",
          };
        });
        setItems(initialItems);
      }
    } catch (err) {
      console.error("Gagal cek data pengambilan:", err);
    } finally {
      setLoadingData(false);
    }
  };

  // Canvas drawing handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        Swal.fire("Peringatan", "Ukuran foto maksimal 10MB.", "warning");
        return;
      }
      setFotoSerahTerima(file);
      const reader = new FileReader();
      reader.onload = () => setFotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleItemQtyChange = (index, rawValue) => {
    const cleaned = String(rawValue).replace(/[^0-9]/g, "");
    const num = cleaned === "" ? 0 : parseInt(cleaned, 10) || 0;
    const updated = [...items];
    const maxAllowed = updated[index].sisa_belum_diambil;

    if (num > maxAllowed) {
      Swal.fire(
        "Peringatan",
        `Jumlah yang diambil tidak boleh melebihi sisa yang belum diambil (${maxAllowed} ${updated[index].satuan}).`,
        "warning"
      );
      updated[index].jumlah_diambil = maxAllowed;
    } else {
      updated[index].jumlah_diambil = num;
    }
    setItems(updated);
  };

  const handleItemCatatanChange = (index, value) => {
    const updated = [...items];
    updated[index].catatan = value;
    setItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!namaPenerima.trim()) {
      Swal.fire("Validasi Gagal", "Nama penerima / pengambil wajib diisi.", "error");
      return;
    }
    if (!unit.trim()) {
      Swal.fire("Validasi Gagal", "Unit / Departemen wajib diisi.", "error");
      return;
    }

    const totalDiambil = items.reduce((acc, it) => acc + (parseInt(it.jumlah_diambil) || 0), 0);
    if (totalDiambil <= 0) {
      Swal.fire("Validasi Gagal", "Setidaknya harus ada 1 barang yang diambil (kuantitas > 0).", "error");
      return;
    }

    let signatureDataUrl = null;
    if (hasSignature && canvasRef.current) {
      signatureDataUrl = canvasRef.current.toDataURL("image/png");
    }

    const confirmRes = await Swal.fire({
      title: "Konfirmasi Pengambilan Barang",
      html: `Pastikan fisik barang telah diserahkan sejumlah <b>${totalDiambil} item</b>.<br><b>Stok di sistem akan otomatis berkurang.</b> Lanjutkan?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#059669",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Simpan Serah Terima",
      cancelButtonText: "Batal",
    });

    if (!confirmRes.isConfirmed) return;

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("nama_penerima", namaPenerima);
      formData.append("unit", unit);
      formData.append("tanggal_pengambilan", tanggalPengambilan);
      if (catatanKondisi) formData.append("catatan_kondisi", catatanKondisi);
      if (signatureDataUrl) formData.append("tanda_tangan", signatureDataUrl);
      if (fotoSerahTerima) formData.append("foto_serah_terima", fotoSerahTerima);

      items.forEach((item, index) => {
        formData.append(`items[${index}][barang_id]`, item.barang_id);
        formData.append(`items[${index}][jumlah_diambil]`, item.jumlah_diambil || 0);
        if (item.catatan) formData.append(`items[${index}][catatan]`, item.catatan);
      });

      const res = await fetch(`${API_BASE}/pengajuan/${pengajuan.id}/pengambilan`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal memproses form pengambilan barang.");
      }

      Swal.fire({
        icon: "success",
        title: data.tipe_pengambilan === 'COMPLETE' ? "Selesai Penuh (COMPLETE)!" : "Dicatat Sebagian (PARTIAL)!",
        text: data.message || "Stok barang telah otomatis dipotong dari gudang.",
        confirmButtonColor: "#059669",
      });

      if (onSuccess) onSuccess(data.data);
      onClose();
    } catch (err) {
      console.error(err);
      Swal.fire("Gagal", err.message || "Terjadi kesalahan saat memproses data.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = (pengambilanId) => {
    window.open(`${API_BASE}/pengambilan-barang/${pengambilanId}/pdf`, "_blank");
  };

  if (!isOpen || !pengajuan) return null;

  return (
    <div
      style={{
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
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "850px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "linear-gradient(135deg, #065f46 0%, #047857 100%)",
            color: "#ffffff",
            borderTopLeftRadius: "16px",
            borderTopRightRadius: "16px",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
              📦 Form Serah Terima & Pengambilan Barang ATK
            </h2>
            <div style={{ fontSize: "12px", opacity: 0.9, marginTop: "4px" }}>
              Pengajuan #{pengajuan.id} • {pengajuan.tahun_akademik} • {pengajuan.nama_pemohon} ({pengajuan.unit})
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#fff",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              cursor: "pointer",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "24px" }}>
          {loadingData ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
              Memuat data pengambilan barang...
            </div>
          ) : (
            <>
              {/* STATUS BANNER JIKA SUDAH SELESAI PENUH */}
              {isFullyTaken && (
                <div
                  style={{
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <span style={{ fontSize: "28px" }}>🎉</span>
                  <div>
                    <strong style={{ color: "#065f46", fontSize: "14px" }}>
                      Seluruh Barang Sudah Selesai Diambil Penuh (COMPLETED)
                    </strong>
                    <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#047857" }}>
                      Semua barang yang disetujui telah diserahterimakan ke pemohon. Lihat rincian berita acara di riwayat bawah.
                    </p>
                  </div>
                </div>
              )}

              {/* FORM PENGAMBILAN (Hanya muncul jika belum tuntas) */}
              {!isFullyTaken && (
                <form onSubmit={handleSubmit}>
                  {/* Form Metadata */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "16px",
                      marginBottom: "20px",
                      background: "#f8fafc",
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                        Nama Penerima / Pengambil *
                      </label>
                      <input
                        type="text"
                        required
                        value={namaPenerima}
                        onChange={(e) => setNamaPenerima(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "13px",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                        Unit / Departemen *
                      </label>
                      <input
                        type="text"
                        required
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "13px",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                        Tanggal Pengambilan *
                      </label>
                      <input
                        type="date"
                        required
                        value={tanggalPengambilan}
                        onChange={(e) => setTanggalPengambilan(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "13px",
                        }}
                      />
                    </div>
                  </div>

                  {/* Items Table */}
                  <div style={{ marginBottom: "20px" }}>
                    <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: "700", color: "#1e293b" }}>
                      Daftar Barang & Sisa yang Boleh Diambil:
                    </h4>
                    <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                        <thead>
                          <tr style={{ background: "#f1f5f9", textAlign: "left", color: "#475569" }}>
                            <th style={{ padding: "10px", width: "40px" }}>No</th>
                            <th style={{ padding: "10px" }}>Nama Barang</th>
                            <th style={{ padding: "10px", width: "80px" }}>Satuan</th>
                            <th style={{ padding: "10px", width: "90px", textAlign: "center" }}>Disetujui</th>
                            <th style={{ padding: "10px", width: "90px", textAlign: "center" }}>Sudah Diambil</th>
                            <th style={{ padding: "10px", width: "90px", textAlign: "center" }}>Sisa</th>
                            <th style={{ padding: "10px", width: "120px", textAlign: "center" }}>Diambil Sekarang *</th>
                            <th style={{ padding: "10px" }}>Keterangan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, idx) => (
                            <tr key={item.barang_id} style={{ borderTop: "1px solid #e2e8f0" }}>
                              <td style={{ padding: "10px", textAlign: "center" }}>{idx + 1}</td>
                              <td style={{ padding: "10px" }}>
                                <strong>{item.nama}</strong>
                                <div style={{ fontSize: "11px", color: "#64748b" }}>Kode: {item.kode} • Stok Gudang: {item.stok_gudang}</div>
                              </td>
                              <td style={{ padding: "10px" }}>{item.satuan}</td>
                              <td style={{ padding: "10px", textAlign: "center", fontWeight: "600", color: "#0284c7" }}>
                                {item.jumlah_disetujui}
                              </td>
                              <td style={{ padding: "10px", textAlign: "center", color: "#64748b" }}>
                                {item.jumlah_diambil_kumulatif}
                              </td>
                              <td style={{ padding: "10px", textAlign: "center", fontWeight: "700", color: item.sisa_belum_diambil > 0 ? "#d97706" : "#059669" }}>
                                {item.sisa_belum_diambil}
                              </td>
                               <td style={{ padding: "10px", textAlign: "center" }}>
                                  <NumericInput
                                    value={item.jumlah_diambil}
                                    onChange={(val) => handleItemQtyChange(idx, val)}
                                    placeholder="0"
                                    disabled={item.sisa_belum_diambil === 0}
                                    max={item.sisa_belum_diambil}
                                    style={{
                                      width: "80px",
                                      padding: "6px 8px",
                                      borderRadius: "6px",
                                      border: item.sisa_belum_diambil > 0 ? "1px solid #059669" : "1px solid #cbd5e1",
                                      textAlign: "center",
                                      fontWeight: "700",
                                      color: item.sisa_belum_diambil > 0 ? "#065f46" : "#94a3b8",
                                      background: item.sisa_belum_diambil === 0 ? "#f1f5f9" : "#ffffff",
                                    }}
                                  />
                              </td>
                              <td style={{ padding: "10px" }}>
                                <input
                                  type="text"
                                  placeholder="Kondisi baik, segel utuh, dsb."
                                  value={item.catatan}
                                  disabled={item.sisa_belum_diambil === 0}
                                  onChange={(e) => handleItemCatatanChange(idx, e.target.value)}
                                  style={{
                                    width: "100%",
                                    padding: "6px 8px",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "12px",
                                  }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Catatan Kondisi & Bukti Serah Terima */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                        Catatan Kondisi Barang / Serah Terima
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Contoh: Barang dalam kondisi lengkap dan baik..."
                        value={catatanKondisi}
                        onChange={(e) => setCatatanKondisi(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          fontSize: "13px",
                          resize: "vertical",
                        }}
                      />

                      <div style={{ marginTop: "12px" }}>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                          📷 Foto Penyerahan Barang (Opsional, Maks 10MB)
                        </label>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleFileChange}
                          style={{ fontSize: "12px" }}
                        />
                        {fotoPreview && (
                          <div style={{ marginTop: "8px" }}>
                            <img
                              src={fotoPreview}
                              alt="Preview Bukti"
                              style={{ maxHeight: "80px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Digital Signature */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>
                          ✍️ Tanda Tangan Digital Penerima
                        </label>
                        {hasSignature && (
                          <button
                            type="button"
                            onClick={clearSignature}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#ef4444",
                              fontSize: "11px",
                              fontWeight: "600",
                              cursor: "pointer",
                            }}
                          >
                            Hapus TTD
                          </button>
                        )}
                      </div>
                      <div
                        style={{
                          border: "2px dashed #cbd5e1",
                          borderRadius: "8px",
                          background: "#fafafa",
                          cursor: "crosshair",
                        }}
                      >
                        <canvas
                          ref={canvasRef}
                          width={340}
                          height={120}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          style={{ width: "100%", height: "120px", display: "block" }}
                        />
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", textAlign: "center" }}>
                        Goreskan tanda tangan penerima di atas kotak
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "16px", marginBottom: "24px" }}>
                    <button
                      type="button"
                      onClick={onClose}
                      style={{
                        padding: "10px 18px",
                        background: "#f1f5f9",
                        color: "#475569",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "600",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        padding: "10px 22px",
                        background: submitting ? "#94a3b8" : "linear-gradient(135deg, #059669 0%, #047857 100%)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "700",
                        cursor: submitting ? "not-allowed" : "pointer",
                        fontSize: "13px",
                        boxShadow: "0 4px 6px -1px rgba(5, 150, 105, 0.3)",
                      }}
                    >
                      {submitting ? "Menyimpan & Memotong Stok..." : "Konfirmasi Penyerahan Barang"}
                    </button>
                  </div>
                </form>
              )}

              {/* RIWAYAT PENGAMBILAN SEBELUMNYA (Multi-Handover History) */}
              {pengambilansHistory.length > 0 && (
                <div style={{ borderTop: "2px dashed #e2e8f0", paddingTop: "20px" }}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: "700", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                    📜 Riwayat Penyerahan Barang ({pengambilansHistory.length} kali penyerahan):
                  </h4>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {pengambilansHistory.map((pk, idx) => (
                      <div
                        key={pk.id}
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "10px",
                          padding: "14px 16px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                          <div>
                            <span style={{ fontSize: "11px", fontWeight: "700", color: "#065f46", background: "#d1fae5", padding: "2px 8px", borderRadius: "6px", marginRight: "8px" }}>
                              Tahap #{pengambilansHistory.length - idx} • {pk.tipe_pengambilan || 'COMPLETE'}
                            </span>
                            <strong style={{ fontSize: "13.5px", color: "#0f172a" }}>{pk.nomor_pengambilan}</strong>
                            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                              Penerima: <b>{pk.nama_penerima}</b> ({pk.unit}) • Tanggal: {new Date(pk.tanggal_pengambilan).toLocaleDateString("id-ID", { dateStyle: "long" })}
                              {pk.creator?.name && ` • Petugas: ${pk.creator.name}`}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(pk.id)}
                            style={{
                              padding: "6px 12px",
                              background: "#0284c7",
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            📄 Unduh PDF
                          </button>
                        </div>

                        {/* Items taken in this handover */}
                        <div style={{ fontSize: "12px", color: "#334155", background: "#ffffff", padding: "8px 12px", borderRadius: "6px", border: "1px solid #f1f5f9" }}>
                          <span style={{ fontWeight: "600" }}>Barang diserahkan: </span>
                          {(pk.items || []).map((it, i) => (
                            <span key={it.id || i} style={{ marginRight: "10px" }}>
                              • {it.barang?.nama || 'Barang'}: <b>{it.jumlah_diambil} {it.satuan}</b>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
