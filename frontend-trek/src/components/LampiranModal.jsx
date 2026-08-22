import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

const ACCEPTED_TYPES = ".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.docx,.doc";
const MAX_SIZE = 10 * 1024 * 1024;

const getFileIcon = (fileType, fileName) => {
  const ext = fileName ? fileName.split(".").pop().toLowerCase() : "";
  if (ext === "pdf" || (fileType && fileType.includes("pdf"))) return "📄";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "🖼️";
  if (["xlsx", "xls"].includes(ext)) return "📊";
  if (["docx", "doc"].includes(ext)) return "📝";
  return "📎";
};

export default function LampiranModal({ isOpen, onClose, pengajuanId, canUpload = true }) {
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  const [lampirans, setLampirans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [kategori, setKategori] = useState("lampiran_pengajuan");
  const [keterangan, setKeterangan] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && pengajuanId) {
      loadLampirans();
    }
  }, [isOpen, pengajuanId]);

  const loadLampirans = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/pengajuan/${pengajuanId}/lampiran`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        setLampirans(data.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat lampiran:", err);
    } finally {
      setLoading(false);
    }
  };

  const validateFile = (file) => {
    if (!file) return false;
    if (file.size > MAX_SIZE) {
      Swal.fire("Ukuran Terlalu Besar", "Ukuran file maksimal 10MB.", "warning");
      return false;
    }
    return true;
  };

  const processFile = (file) => {
    if (validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      Swal.fire("Peringatan", "Pilih file terlebih dahulu.", "warning");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("kategori", kategori);
      if (keterangan) formData.append("keterangan", keterangan);

      const res = await fetch(`${API_BASE}/pengajuan/${pengajuanId}/lampiran`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal mengunggah file lampiran.");
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "File lampiran berhasil diunggah.",
        timer: 1500,
        showConfirmButton: false,
      });

      setSelectedFile(null);
      setKeterangan("");
      setKategori("lampiran_pengajuan");
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadLampirans();
    } catch (err) {
      console.error(err);
      Swal.fire("Gagal", err.message || "Terjadi kesalahan.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (lampiran) => {
    try {
      const res = await fetch(`${API_BASE}/lampiran/${lampiran.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Gagal mengunduh file.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = lampiran.file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Gagal mengunduh file dari server.", "error");
    }
  };

  const handleDelete = async (lampiran) => {
    const res = await Swal.fire({
      title: "Hapus File Lampiran?",
      text: `File ${lampiran.file_name} akan dihapus secara permanen.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!res.isConfirmed) return;

    try {
      const resp = await fetch(`${API_BASE}/lampiran/${lampiran.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.message || "Gagal menghapus file.");
      }

      setLampirans((prev) => prev.filter((item) => item.id !== lampiran.id));
      Swal.fire("Terhapus", "File lampiran berhasil dihapus.", "success");
    } catch (err) {
      Swal.fire("Error", err.message || "Gagal menghapus file.", "error");
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "-";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getKategoriBadge = (kat) => {
    switch (kat) {
      case "nota": return { label: "Bukti Nota / Invoice", bg: "#dbeafe", color: "#1d4ed8" };
      case "foto_fisik": return { label: "Foto Fisik Barang", bg: "#fef3c7", color: "#b45309" };
      case "serah_tera": return { label: "Dokumen Serah Terima", bg: "#dcfce7", color: "#15803d" };
      case "lampiran_pengajuan": return { label: "Lampiran Pengajuan", bg: "#f3e8ff", color: "#6b21a8" };
      default: return { label: kat || "Lampiran Dokumen", bg: "#f1f5f9", color: "#475569" };
    }
  };

  const canDelete = (lamp) => {
    if (!currentUser) return false;
    const roleId = currentUser?.role_id;
    if (roleId === 1 || roleId === 2) return true;
    if (roleId === 3 && lamp.user_id === currentUser.id) return true;
    return false;
  };

  if (!isOpen) return null;

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
      <style>{`
        @keyframes lampiranPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .lampiran-skeleton {
          animation: lampiranPulse 1.5s ease-in-out infinite;
        }
      `}</style>

      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "700px",
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
            background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
            color: "#ffffff",
            borderTopLeftRadius: "16px",
            borderTopRightRadius: "16px",
            position: "relative",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
            📎 Dokumen & File Lampiran Pengajuan #{pengajuanId}
          </h3>
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
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: "1", minHeight: 0 }}>
          {/* Upload Form */}
          {canUpload && (
            <form
              onSubmit={handleUpload}
              style={{
                background: "#f8fafc",
                padding: "16px",
                borderRadius: "12px",
                border: "1px dashed #cbd5e1",
                marginBottom: "20px",
              }}
            >
              <h4 style={{ margin: "0 0 12px 0", fontSize: "13.5px", fontWeight: "700", color: "#1e293b" }}>
                ➕ Unggah File Pendukung Baru (PDF, PNG, JPG, XLSX, DOCX - Maks 10MB)
              </h4>

              {/* Drag & Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !selectedFile && fileInputRef.current?.click()}
                style={{
                  border: dragOver
                    ? "2px dashed #3b82f6"
                    : selectedFile
                    ? "2px dashed #94a3b8"
                    : "2px dashed #cbd5e1",
                  background: dragOver ? "#eff6ff" : "#ffffff",
                  borderRadius: "8px",
                  padding: "20px",
                  textAlign: "center",
                  cursor: selectedFile ? "default" : "pointer",
                  transition: "all 0.2s ease",
                  marginBottom: "12px",
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept={ACCEPTED_TYPES}
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />

                {selectedFile ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "24px" }}>{getFileIcon(selectedFile.type, selectedFile.name)}</span>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {selectedFile.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>{formatFileSize(selectedFile.size)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      style={{
                        padding: "4px 10px",
                        background: "#fee2e2",
                        color: "#dc2626",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Hapus
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: "36px", marginBottom: "8px" }}>📎</div>
                    <p style={{ margin: "0 0 4px 0", fontSize: "13px", color: "#475569", fontWeight: "600" }}>
                      Seret & drop file di sini, atau klik untuk memilih
                    </p>
                    <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>
                      PDF, PNG, JPG, XLSX, DOCX - Maks 10MB
                    </p>
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                    Kategori Dokumen
                  </label>
                  <select
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  >
                    <option value="lampiran_pengajuan">Lampiran Pengajuan (Umum)</option>
                    <option value="nota">Bukti Nota / Penawaran Harga</option>
                    <option value="foto_fisik">Foto Fisik Barang / Contoh</option>
                    <option value="serah_terima">Dokumen Serah Terima</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "4px" }}>
                    Keterangan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Nota dari toko XYZ..."
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                style={{
                  padding: "8px 18px",
                  background: uploading ? "#94a3b8" : "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "600",
                  cursor: uploading || !selectedFile ? "not-allowed" : "pointer",
                  fontSize: "13px",
                }}
              >
                {uploading ? "Mengunggah..." : "Unggah Dokumen"}
              </button>
            </form>
          )}

          {/* File List Header */}
          <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "700", color: "#1e293b" }}>
            Daftar File yang Terlampir ({lampirans.length}):
          </h4>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="lampiran-skeleton"
                  style={{
                    padding: "12px 14px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <div style={{ width: "20px", height: "20px", borderRadius: "4px", background: "#e2e8f0" }}></div>
                    <div style={{ flex: 1, height: "14px", background: "#e2e8f0", borderRadius: "4px" }}></div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <div style={{ width: "80px", height: "12px", background: "#e2e8f0", borderRadius: "4px" }}></div>
                    <div style={{ width: "60px", height: "12px", background: "#e2e8f0", borderRadius: "4px" }}></div>
                  </div>
                  <div style={{ width: "120px", height: "12px", marginTop: "6px", background: "#e2e8f0", borderRadius: "4px" }}></div>
                </div>
              ))}
            </div>
          ) : lampirans.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "#94a3b8",
              }}
            >
              <div style={{ fontSize: "56px", marginBottom: "12px" }}>📎</div>
              <p style={{ margin: "0 0 4px 0", fontSize: "13px", fontWeight: "600", color: "#64748b" }}>
                Belum ada file lampiran yang diunggah.
              </p>
              <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>
                Unggah dokumen pendukung pengajuan di atas.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {lampirans.map((lamp) => {
                const badge = getKategoriBadge(lamp.kategori);
                return (
                  <div
                    key={lamp.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      background: "#ffffff",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "18px", flexShrink: 0 }}>{getFileIcon(lamp.file_type, lamp.file_name)}</span>
                        <strong style={{ fontSize: "13.5px", color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {lamp.file_name}
                        </strong>
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            background: badge.bg,
                            color: badge.color,
                            fontWeight: "600",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                        <span style={{ marginRight: "8px" }}>
                          Ukuran: {formatFileSize(lamp.file_size)}
                        </span>
                        <span>
                          Tanggal: {new Date(lamp.created_at).toLocaleString("id-ID")}
                        </span>
                      </div>
                      {lamp.user?.name && (
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                          Oleh: {lamp.user.name}
                        </div>
                      )}
                      {lamp.keterangan && (
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", fontStyle: "italic" }}>
                          Keterangan: "{lamp.keterangan}"
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => handleDownload(lamp)}
                        style={{
                          padding: "6px 12px",
                          background: "#0284c7",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        ⬇️ Unduh
                      </button>
                      {canDelete(lamp) && (
                        <button
                          type="button"
                          onClick={() => handleDelete(lamp)}
                          style={{
                            padding: "6px 10px",
                            background: "#fee2e2",
                            color: "#dc2626",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#334155",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
