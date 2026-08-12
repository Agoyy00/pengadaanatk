import React, { useState, useEffect, useRef } from "react";
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
  open: { label: "Open", bg: "#dbeafe", color: "#2563eb", border: "#bfdbfe" },
  read: { label: "Read", bg: "#cffafe", color: "#0891b2", border: "#a5f3fc" },
  process: { label: "Process", bg: "#fef3c7", color: "#d97706", border: "#fde68a" },
  complete: { label: "Complete", bg: "#dcfce7", color: "#16a34a", border: "#bbf7d0" },
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
  const repliesEndRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = String(currentUser?.role || "").toLowerCase();
  const isAdmin = userRole === "admin" || userRole === "superadmin";
  const activeRoleHeader = userRole || "user";

  const loadTicket = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/support-tickets/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "X-Active-Role": activeRoleHeader,
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

  const markTicketAsRead = async () => {
    try {
      await fetch(`${API_BASE}/support-tickets/${id}/mark-read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "X-Active-Role": activeRoleHeader,
        },
      });
    } catch (err) {
      console.error("Gagal menandai notifikasi tiket sebagai dibaca:", err);
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadTicket();
      await markTicketAsRead();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (repliesEndRef.current) {
      repliesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [replies]);

  const handleStatusUpdate = async (newStatus) => {
    const result = await Swal.fire({
      title: `Tandai sebagai ${STATUS_CONFIG[newStatus]?.label || newStatus}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Tandai",
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
          "X-Active-Role": activeRoleHeader,
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
        text: `Tiket berhasil ditandai sebagai ${STATUS_CONFIG[newStatus]?.label || newStatus}.`,
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
          "X-Active-Role": activeRoleHeader,
        },
        body: JSON.stringify({ message: replyMessage.trim() }),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Gagal mengirim balasan");
      }

      setReplyMessage("");
      await loadTicket();
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

  const handleDeleteTicket = async () => {
    const result = await Swal.fire({
      title: "Hapus Tiket?",
      html: `Anda akan menghapus tiket <b>${ticket?.subject}</b>.<br>Tindakan ini tidak dapat dibatalkan.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${API_BASE}/support-tickets/${ticket.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "X-Active-Role": activeRoleHeader,
        },
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Gagal menghapus tiket");
      }

      Swal.fire({
        icon: "success",
        title: "Terhapus",
        text: "Tiket berhasil dihapus.",
        timer: 1500,
        showConfirmButton: false,
      }).then(() => {
        navigate("/support");
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err.message || "Terjadi kesalahan saat menghapus tiket.",
      });
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

  const allMessages = [
    {
      id: ticket.id,
      type: "user",
      message: ticket.message,
      createdAt: ticket.created_at,
      userName: ticket.user?.name || "User",
    },
    ...replies.map((reply) => ({
      id: reply.id,
      type: reply.sender_type === "admin" ? "admin" : "user",
      message: reply.message,
      createdAt: reply.created_at,
      userName: reply.sender_type === "admin" ? "Tim Support" : reply.user?.name || "User",
    })),
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", height: "calc(100vh - 40px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        background: "#fff",
        padding: "18px 24px",
        borderRadius: 16,
        border: "1px solid #e2e8f0",
        marginBottom: 16,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#94a3b8"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#cbd5e1"; }}
          >
            ← Kembali
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a", fontWeight: 700 }}>{ticket.subject}</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 10px",
                borderRadius: 999,
                fontSize: 11,
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
                    padding: "3px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    background: isActive ? config.bg : isPast ? "#f1f5f9" : "#fff",
                    color: isActive ? config.color : isPast ? "#64748b" : "#94a3b8",
                    border: `1px solid ${isActive ? config.border : isPast ? "#cbd5e1" : "#e2e8f0"}`,
                  }}>
                    {isPast ? "✓" : config.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {isAdmin && ticket.status !== 'complete' && (
            <button
              onClick={() => handleStatusUpdate('complete')}
              disabled={updating}
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                border: "none",
                background: "#16a34a",
                color: "#fff",
                cursor: updating ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 13,
                boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(22, 163, 74, 0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(22, 163, 74, 0.2)'; }}
            >
              ✅ Selesai
            </button>
          )}
          {(isAdmin || ticket.user_id === (currentUser?.id)) && (
            <button
              onClick={handleDeleteTicket}
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                border: "none",
                background: "#dc2626",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 13,
                boxShadow: "0 2px 4px rgba(220, 38, 38, 0.2)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(220, 38, 38, 0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(220, 38, 38, 0.2)'; }}
            >
              🗑️ Hapus
            </button>
          )}
          {ticket.status === 'complete' && (
            <span style={{ padding: "8px 16px", borderRadius: 8, background: "#dcfce7", color: "#16a34a", fontWeight: 700, fontSize: 12 }}>
              ✅ Percakapan Ditutup
            </span>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{
        flex: 1,
        background: "#f8fafc",
        borderRadius: 16,
        border: "1px solid #e2e8f0",
        marginBottom: 16,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        overflowY: "auto",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}>
        {allMessages.map((msg, idx) => {
          const isUser = msg.type === "user";
          return (
            <div key={msg.id || idx} style={{
              display: "flex",
              flexDirection: isUser ? "row" : "row-reverse",
              alignItems: "flex-end",
              gap: 10,
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: isUser ? "#64748b" : "#0ea5e9",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 13,
                flexShrink: 0,
              }}>
                {isUser ? "U" : "A"}
              </div>
              <div style={{
                maxWidth: "75%",
                background: isUser ? "#fff" : "#f0f9ff",
                padding: "14px 18px",
                borderRadius: isUser ? "4px 18px 18px 18px" : "18px 4px 18px 18px",
                border: `1px solid ${isUser ? "#e2e8f0" : "#bae6fd"}`,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: isUser ? "#475569" : "#0369a1", marginBottom: 4 }}>
                  {msg.userName}
                </div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#1e293b", whiteSpace: "pre-wrap" }}>{msg.message}</p>
                <div style={{ marginTop: 8, fontSize: 11, color: "#94a3b8", textAlign: isUser ? "left" : "right" }}>
                  {new Date(msg.createdAt).toLocaleString("id-ID")}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={repliesEndRef} />
      </div>

      {/* Reply Input */}
      <div style={{
        background: "#fff",
        padding: "18px 24px",
        borderRadius: 16,
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        opacity: ticket.status === 'complete' ? 0.6 : 1,
        pointerEvents: ticket.status === 'complete' ? 'none' : 'auto',
      }}>
        {ticket.status === 'complete' && (
          <div style={{ marginBottom: 12, color: "#16a34a", fontWeight: 600, fontSize: 13, textAlign: 'center' }}>
            ✅ Tiket ini sudah selesai. Percakapan ditutup.
          </div>
        )}
        <form onSubmit={handleSendReply} style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <textarea
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            placeholder={ticket.status === 'complete' ? "Percakapan ini sudah ditutup." : (isAdmin ? "Ketik balasan untuk user..." : "Tulis balasan Anda...")}
            rows={1}
            disabled={ticket.status === 'complete'}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendReply(e);
              }
            }}
            style={{
              flex: 1,
              padding: "12px 18px",
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              fontSize: 14,
              resize: "none",
              outline: "none",
              fontFamily: "inherit",
              lineHeight: 1.6,
              minHeight: 48,
              maxHeight: 120,
              transition: "border-color 0.2s ease",
              background: ticket.status === 'complete' ? '#f1f5f9' : '#fff',
              cursor: ticket.status === 'complete' ? 'not-allowed' : 'text',
            }}
            onFocus={(e) => e.target.style.borderColor = "#2563eb"}
            onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
          />
          <button
            type="submit"
            disabled={sendingReply || ticket.status === 'complete'}
            style={{
              padding: "12px 24px",
              borderRadius: 10,
              border: "none",
              background: (sendingReply || ticket.status === 'complete') ? "#94a3b8" : "#2563eb",
              color: "#fff",
              cursor: (sendingReply || ticket.status === 'complete') ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: 14,
              boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
              transition: "all 0.2s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => { if (!sendingReply && ticket.status !== 'complete') { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 10px rgba(37, 99, 235, 0.35)'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(37, 99, 235, 0.25)'; }}
          >
            {sendingReply ? "..." : "Kirim"}
          </button>
        </form>
      </div>
    </div>
  );
}
