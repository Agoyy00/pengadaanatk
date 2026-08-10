import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

const API_BASE = import.meta.env.VITE_API_BASE;
const token = localStorage.getItem("token");

const PRIORITY_CONFIG = {
  low: { label: "Low", bg: "#dcfce7", color: "#16a34a", border: "#bbf7d0" },
  medium: { label: "Medium", bg: "#fef3c7", color: "#d97706", border: "#fde68a" },
  high: { label: "High", bg: "#fee2e2", color: "#dc2626", border: "#fecaca" },
};

const STATUS_CONFIG = {
  open: { label: "Open", bg: "#dbeafe", color: "#2563eb", border: "#bfdbfe", icon: "📋" },
  read: { label: "Read", bg: "#cffafe", color: "#0891b2", border: "#a5f3fc", icon: "👁️" },
  process: { label: "Process", bg: "#fef3c7", color: "#d97706", border: "#fde68a", icon: "⚙️" },
  complete: { label: "Complete", bg: "#dcfce7", color: "#16a34a", border: "#bbf7d0", icon: "✅" },
};

const STATUS_FLOW = ["open", "read", "process", "complete"];

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [updating, setUpdating] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = String(currentUser?.role || "").toLowerCase();
  const isAdmin = userRole === "admin" || userRole === "superadmin";

  const loadTicket = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/support-tickets/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        setTicket(data.ticket);
        setReplies(data.ticket.replies || []);
        setAdminMessage(data.ticket.admin_message || "");
      }
    } catch (err) {
      console.error("Gagal memuat tiket:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
  }, [id]);

  const handleStatusUpdate = async (newStatus) => {
    const result = await Swal.fire({
      title: `Ubah Status ke ${STATUS_CONFIG[newStatus]?.label || newStatus}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Ubah",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      setUpdating(true);
      const res = await fetch(`${API_BASE}/support-tickets/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          admin_message: adminMessage,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Gagal memperbarui status");
      }

      setTicket(data.ticket);
      Swal.fire({
        icon: "success",
        title: "Status Diperbarui",
        text: `Status tiket berhasil diubah ke ${STATUS_CONFIG[newStatus]?.label || newStatus}.`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err.message || "Terjadi kesalahan.",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();

    if (!replyMessage.trim()) {
      Swal.fire("Error", "Pesan balasan tidak boleh kosong.", "error");
      return;
    }

    try {
      setSendingReply(true);
      const res = await fetch(`${API_BASE}/support-tickets/${id}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({ message: replyMessage.trim() }),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Gagal mengirim balasan");
      }

      setReplies((prev) => [...prev, data.reply]);
      setReplyMessage("");
      Swal.fire({
        icon: "success",
        title: "Balasan Dikirim",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err.message || "Terjadi kesalahan.",
      });
    } finally {
      setSendingReply(false);
    }
  };

  const getCurrentStatusIndex = () => STATUS_FLOW.indexOf(ticket?.status);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <p>Memuat detail tiket...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "#dc2626" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>❌</div>
        <p>Tiket tidak ditemukan.</p>
      </div>
    );
  }

  const currentStatusIndex = getCurrentStatusIndex();
  const priorityConfig = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;

  return (
    <div>
      <button
        onClick={() => navigate("/support")}
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          background: "#fff",
          color: "#475569",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: 13,
          marginBottom: 20,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        ← Kembali
      </button>

      <div style={{ background: "#fff", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={{ margin: "0 0 10px 0", fontSize: 20, color: "#0f172a" }}>{ticket.subject}</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                background: priorityConfig.bg,
                color: priorityConfig.color,
                border: `1px solid ${priorityConfig.border}`,
              }}>
                {ticket.priority === "high" ? "🔴" : ticket.priority === "medium" ? "🟡" : "🟢"}
                {priorityConfig.label}
              </span>
              {STATUS_FLOW.map((status) => {
                const config = STATUS_CONFIG[status];
                const statusIndex = STATUS_FLOW.indexOf(status);
                const isActive = status === ticket.status;
                const isPast = statusIndex < currentStatusIndex;
                return (
                  <span key={status} style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "5px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    background: isActive ? config.bg : isPast ? "#f1f5f9" : "#fff",
                    color: isActive ? config.color : isPast ? "#64748b" : "#94a3b8",
                    border: `1px solid ${isActive ? config.border : isPast ? "#cbd5e1" : "#e2e8f0"}`,
                  }}>
                    <span>{isPast ? "✓" : isActive ? config.icon : "○"}</span>
                    {config.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pesan Awal (User) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", marginLeft: 4 }}>
            Pesan Pengguna
          </div>
          <div style={{ 
            background: "#f8fafc", 
            padding: "16px 20px", 
            borderRadius: "4px 20px 20px 20px", 
            border: "1px solid #e2e8f0",
            maxWidth: "85%",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
          }}>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#334155", whiteSpace: "pre-wrap" }}>{ticket.message}</p>
            <div style={{ marginTop: 10, fontSize: 11, color: "#94a3b8" }}>
              {new Date(ticket.created_at).toLocaleString("id-ID")}
            </div>
          </div>
        </div>

        {/* Pesan Admin / Balasan (Admin) */}
        {isAdmin ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#0284c7", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 4 }}>
              Tulis Balasan
            </div>
            <div style={{
              background: "#f0f9ff",
              padding: "16px 20px",
              borderRadius: "20px 4px 20px 20px",
              border: "1px solid #bae6fd",
              width: "100%",
              maxWidth: "85%",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
            }}>
              <textarea
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                placeholder="Ketik balasan untuk user di sini..."
                rows={4}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 12,
                  border: "1px solid #7dd3fc",
                  fontSize: 15,
                  resize: "vertical",
                  fontFamily: "inherit",
                  outline: "none",
                  background: "#fff",
                  lineHeight: 1.6,
                  color: "#0f172a",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => { e.target.style.borderColor = "#0ea5e9"; e.target.style.boxShadow = "0 0 0 3px rgba(14, 165, 233, 0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#7dd3fc"; e.target.style.boxShadow = "none"; }}
              />
            </div>
          </div>
        ) : (
          adminMessage && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#0284c7", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 4 }}>
                Balasan Admin
              </div>
              <div style={{
                background: "#f0f9ff",
                padding: "16px 20px",
                borderRadius: "20px 4px 20px 20px",
                border: "1px solid #bae6fd",
                maxWidth: "85%",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#0c4a6e", whiteSpace: "pre-wrap" }}>
                  {adminMessage}
                </p>
              </div>
            </div>
          )
        )}

        {isAdmin && ticket.status !== 'complete' && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
            {ticket.status !== 'process' && (
              <button
                onClick={() => handleStatusUpdate('process')}
                disabled={updating}
                style={{
                  padding: "10px 24px",
                  borderRadius: 8,
                  border: "none",
                  background: "#2563eb",
                  color: "#fff",
                  cursor: updating ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  fontSize: 14,
                  boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(37, 99, 235, 0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(37, 99, 235, 0.2)'; }}
              >
                Kirim Balasan & Proses
              </button>
            )}
            <button
              onClick={() => handleStatusUpdate('complete')}
              disabled={updating}
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                border: "none",
                background: "#16a34a",
                color: "#fff",
                cursor: updating ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 14,
                boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(22, 163, 74, 0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(22, 163, 74, 0.2)'; }}
            >
              ✅ Tandai Selesai
            </button>
          </div>
        )}

        {!isAdmin && (
          <div style={{ marginBottom: 20, padding: 16, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#475569", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Progress Tiket
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {STATUS_FLOW.map((status, idx) => {
                const config = STATUS_CONFIG[status];
                const isActive = status === ticket.status;
                const isPast = idx < currentStatusIndex;
                return (
                  <div key={status} style={{
                    flex: 1,
                    minWidth: 120,
                    padding: "12px",
                    borderRadius: 8,
                    background: isActive ? config.bg : isPast ? "#f1f5f9" : "#fff",
                    color: isActive ? config.color : isPast ? "#64748b" : "#94a3b8",
                    fontWeight: 700,
                    fontSize: 12,
                    textAlign: "center",
                    border: `1.5px solid ${isActive ? config.border : isPast ? "#cbd5e1" : "#e2e8f0"}`,
                  }}>
                    {isPast ? "✓ " : isActive ? config.icon : "○ "}
                    {config.label}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
