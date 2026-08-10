import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  processing: { label: "Processing", bg: "#fef3c7", color: "#d97706", border: "#fde68a", icon: "⚙️" },
  completed: { label: "Completed", bg: "#dcfce7", color: "#16a34a", border: "#bbf7d0", icon: "✅" },
};

const STATUS_FLOW = ["open", "read", "processing", "completed"];

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
  const isAdmin = currentUser?.is_admin || currentUser?.is_superadmin || false;

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

        <div style={{ background: "#f8fafc", padding: 20, borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Pesan Awal
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#1e293b", whiteSpace: "pre-wrap" }}>{ticket.message}</p>
          <div style={{ marginTop: 12, fontSize: 12, color: "#94a3b8" }}>
            {new Date(ticket.created_at).toLocaleString("id-ID")}
          </div>
        </div>

        {isAdmin && (
          <div style={{ background: "#fffbeb", padding: 16, borderRadius: 10, border: "1px solid #fcd34d", marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#92400e", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Pesan Admin
            </div>
            <textarea
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              placeholder="Tulis pesan untuk user..."
              rows={3}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #fcd34d",
                fontSize: 14,
                resize: "vertical",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>
        )}

        {isAdmin && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {STATUS_FLOW.map((status) => {
              const statusIndex = STATUS_FLOW.indexOf(status);
              const isActive = status === ticket.status;
              const isPast = statusIndex < currentStatusIndex;
              const config = STATUS_CONFIG[status];

              return (
                <button
                  key={status}
                  onClick={() => !isPast && handleStatusUpdate(status)}
                  disabled={isPast || updating}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: isActive ? "none" : `1.5px solid ${config.color}`,
                    background: isActive ? config.color : isPast ? "#e2e8f0" : "#fff",
                    color: isActive ? "#fff" : isPast ? "#94a3b8" : config.color,
                    cursor: isPast || updating ? "not-allowed" : "pointer",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {isActive ? "● " : isPast ? "✓ " : "○ "}
                  {config.label}
                </button>
              );
            })}
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

      <div style={{ background: "#fff", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: "#0f172a" }}>
          Balasan ({replies.length})
        </div>
        {replies.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
            <p style={{ margin: 0, fontSize: 14 }}>Belum ada balasan.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {replies.map((reply) => (
              <div key={reply.id} style={{
                padding: 16,
                borderRadius: 10,
                background: reply.sender_type === "admin" ? "#f0f9ff" : "#f8fafc",
                border: `1px solid ${reply.sender_type === "admin" ? "#bae6fd" : "#e2e8f0"}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      padding: "3px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      background: reply.sender_type === "admin" ? "#0ea5e9" : "#64748b",
                      color: "#fff",
                    }}>
                      {reply.sender_type === "admin" ? "Admin / Superadmin" : "User"}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: reply.sender_type === "admin" ? "#0369a1" : "#475569" }}>
                      {reply.sender_type === "admin" ? "Tim Support" : reply.user?.name || "User"}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>
                    {new Date(reply.created_at).toLocaleString("id-ID")}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#1e293b", whiteSpace: "pre-wrap" }}>{reply.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: "#fff", padding: 24, borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: "#0f172a" }}>
          Tulis Balasan
        </div>
        <form onSubmit={handleSendReply}>
          <textarea
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            placeholder="Tulis balasan Anda..."
            rows={4}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 14,
              resize: "vertical",
              marginBottom: 12,
              outline: "none",
              fontFamily: "inherit",
              lineHeight: 1.6,
            }}
            onFocus={(e) => e.target.style.borderColor = "#2563eb"}
            onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={sendingReply}
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                border: "none",
                background: sendingReply ? "#94a3b8" : "#2563eb",
                color: "#fff",
                cursor: sendingReply ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {sendingReply ? "Mengirim..." : "Kirim Balasan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
