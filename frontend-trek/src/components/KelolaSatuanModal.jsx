import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

export default function KelolaSatuanModal({ isOpen, onClose, barang, onUpdate }) {
  const token = localStorage.getItem("token");

  const [satuans, setSatuans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [namaSatuan, setNamaSatuan] = useState("");
  const [faktorKonversi, setFaktorKonversi] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && barang?.id) {
      loadSatuans();
    }
  }, [isOpen, barang]);

  const loadSatuans = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/barang/${barang.id}/satuans`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        setSatuans(data.satuans || []);
      }
    } catch (err) {
      console.error("Gagal memuat satuan konversi:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSatuan = async (e) => {
    e.preventDefault();
    if (!namaSatuan.trim()) {
      Swal.fire("Peringatan", "Nama satuan wajib diisi.", "warning");
      return;
    }
    if (!faktorKonversi || Number(faktorKonversi) <= 0) {
      Swal.fire("Peringatan", "Faktor konversi harus berupa angka positif.", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/barang/${barang.id}/satuans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          nama_satuan: namaSatuan,
          faktor_konversi: Number(faktorKonversi),
          keterangan: keterangan,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal menambahkan satuan.");
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: `Satuan ${namaSatuan} (1 = ${faktorKonversi} ${barang.satuan}) berhasil ditambahkan.`,
        timer: 1500,
        showConfirmButton: false,
      });

      setNamaSatuan("");
      setFaktorKonversi("");
      setKeterangan("");
      loadSatuans();
      if (onUpdate) onUpdate();
    } catch (err) {
      Swal.fire("Error", err.message || "Terjadi kesalahan.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (satuanId, nama) => {
    const confirm = await Swal.fire({
      title: "Hapus Satuan Konversi?",
      text: `Satuan ${nama} akan dihapus dari barang ini.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`${API_BASE}/barang-satuans/${satuanId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Gagal menghapus.");

      setSatuans((prev) => prev.filter((s) => s.id !== satuanId));
      Swal.fire("Terhapus", "Satuan konversi berhasil dihapus.", "success");
      if (onUpdate) onUpdate();
    } catch (err) {
      Swal.fire("Error", err.message || "Gagal menghapus satuan.", "error");
    }
  };

  if (!isOpen || !barang) return null;

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
          maxWidth: "650px",
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            color: "#ffffff",
            borderTopLeftRadius: "16px",
            borderTopRightRadius: "16px",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>
              ⚖️ Kelola Satuan Konversi Barang
            </h3>
            <div style={{ fontSize: "12px", opacity: 0.9, marginTop: "2px" }}>
              {barang.kode} - {barang.nama} (Satuan Dasar: <strong>{barang.satuan}</strong>)
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#fff",
              borderRadius: "50%",
              width: "28px",
              height: "28px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "20px" }}>
          {/* Form Tambah Satuan */}
          <form
            onSubmit={handleAddSatuan}
            style={{
              background: "#f0f9ff",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid #bae6fd",
              marginBottom: "20px",
            }}
          >
            <h4 style={{ margin: "0 0 10px 0", fontSize: "13.5px", fontWeight: "700", color: "#0369a1" }}>
              ➕ Tambah Satuan Ukuran Baru
            </h4>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                  Nama Satuan Baru (misal: Box, Dus, Pack) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Box"
                  value={namaSatuan}
                  onChange={(e) => setNamaSatuan(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                  Faktor Konversi (1 Satuan = Berapa {barang.satuan}?) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder={`Contoh: 100 (${barang.satuan})`}
                  value={faktorKonversi}
                  onChange={(e) => setFaktorKonversi(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                Keterangan (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: 1 Box isi 10 Pack @ 10 Pcs"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "8px 18px",
                background: submitting ? "#94a3b8" : "#0284c7",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontWeight: "600",
                cursor: submitting ? "not-allowed" : "pointer",
                fontSize: "13px",
              }}
            >
              {submitting ? "Menyimpan..." : "Simpan Satuan"}
            </button>
          </form>

          {/* Daftar Satuan yang Terdaftar */}
          <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: "700", color: "#1e293b" }}>
            Satuan Ukuran yang Berlaku:
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Satuan Dasar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
              }}
            >
              <div>
                <strong>1 {barang.satuan}</strong> (Satuan Dasar / Base Unit)
              </div>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Unit Utama Gudang</span>
            </div>

            {/* Satuan Konversi Tambahan */}
            {loading ? (
              <p style={{ color: "#64748b", fontStyle: "italic" }}>Memuat...</p>
            ) : (
              satuans.map((sat) => (
                <div
                  key={sat.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                  }}
                >
                  <div>
                    <strong style={{ color: "#0369a1" }}>1 {sat.nama_satuan}</strong> ={" "}
                    <strong>{sat.faktor_konversi} {barang.satuan}</strong>
                    {sat.keterangan && (
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                        {sat.keterangan}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(sat.id, sat.nama_satuan)}
                    style={{
                      padding: "4px 8px",
                      background: "#fee2e2",
                      color: "#dc2626",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    🗑️ Hapus
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
