import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const API_BASE = import.meta.env.VITE_API_BASE;
const token = localStorage.getItem("token");

export default function OpenTicket() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("medium");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!subject.trim() || !message.trim()) {
      Swal.fire("Error", "Semua field wajib diisi.", "error");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/support-tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          subject: subject.trim(),
          priority,
          message: message.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Gagal membuat tiket.");
      }

      Swal.fire({
        icon: "success",
        title: "Tiket Dibuat",
        text: "Tiket support Anda berhasil dikirim.",
        confirmButtonColor: "#10b981",
      }).then(() => {
        navigate("/support");
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err.message || "Terjadi kesalahan saat membuat tiket.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 22, color: "#0f172a" }}>Buat Tiket Support Baru</h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
          Ceritakan masalah atau pertanyaan Anda, tim support akan membantu Anda.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ background: "#fff", padding: 28, borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14, color: "#1e293b" }}>
            Perihal <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Contoh: Tidak bisa mengajukan pengajuan ATK"
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 14,
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => e.target.style.borderColor = "#2563eb"}
            onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14, color: "#1e293b" }}>
            Level Prioritas <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { value: "low", label: "Low", icon: "🟢", desc: "Masalah minor, tidak mengganggu" },
              { value: "medium", label: "Medium", icon: "🟡", desc: "Masalah sedang, butuh perhatian" },
              { value: "high", label: "High", icon: "🔴", desc: "Masalah kritis, blocking" },
            ].map((opt) => (
              <div
                key={opt.value}
                onClick={() => setPriority(opt.value)}
                style={{
                  flex: 1,
                  minWidth: 180,
                  padding: 16,
                  borderRadius: 10,
                  border: `2px solid ${priority === opt.value ? "#2563eb" : "#e2e8f0"}`,
                  background: priority === opt.value ? "#eff6ff" : "#fff",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 6 }}>{opt.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: priority === opt.value ? "#2563eb" : "#1e293b", marginBottom: 4 }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{opt.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14, color: "#1e293b" }}>
            Isi Pesan <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Jelaskan masalah atau pertanyaan Anda secara detail..."
            rows={6}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 14,
              resize: "vertical",
              outline: "none",
              fontFamily: "inherit",
              lineHeight: 1.6,
            }}
            onFocus={(e) => e.target.style.borderColor = "#2563eb"}
            onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
          />
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 20, borderTop: "1px solid #e2e8f0" }}>
          <button
            type="button"
            onClick={() => navigate("/support")}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#475569",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              border: "none",
              background: loading ? "#94a3b8" : "#2563eb",
              color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {loading ? "Mengirim..." : "Kirim Tiket"}
          </button>
        </div>
      </form>
    </div>
  );
}
