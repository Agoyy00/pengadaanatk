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
  process: { label: "Process", bg: "#fef3c7", color: "#d97706", border: "#fde68a", icon: "⚙️" },
  complete: { label: "Complete", bg: "#dcfce7", color: "#16a34a", border: "#bbf7d0", icon: "✅" },
};

export default function TicketList({ showCreateButton = true }) {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  const loadTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/support-tickets`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error("Gagal memuat tiket:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const filteredTickets = tickets.filter((ticket) => {
    const matchStatus = filterStatus === "all" || ticket.status === filterStatus;
    const matchPriority = filterPriority === "all" || ticket.priority === filterPriority;
    return matchStatus && matchPriority;
  });

  const handleDelete = async (ticket) => {
    const result = await Swal.fire({
      title: "Hapus Tiket?",
      html: `Anda akan menghapus tiket <b>${ticket.subject}</b>.<br>Tindakan ini tidak dapat dibatalkan.`,
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
        },
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Gagal menghapus tiket");
      }

      setTickets((prev) => prev.filter((t) => t.id !== ticket.id));

      Swal.fire({
        icon: "success",
        title: "Terhapus",
        text: "Tiket berhasil dihapus.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err.message || "Terjadi kesalahan saat menghapus tiket.",
      });
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "high": return "🔴";
      case "medium": return "🟡";
      case "low": return "🟢";
      default: return "⚪";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "open": return "📋";
      case "read": return "👁️";
      case "process": return "⚙️";
      case "complete": return "✅";
      default: return "📋";
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: "0 0 4px 0", fontSize: 20, color: "#0f172a" }}>Daftar Tiket Support</h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
            {showCreateButton ? "Buat dan kelola tiket support Anda" : "Kelola dan pantau tiket support dari user"}
          </p>
        </div>
        {showCreateButton && (
          <button
            onClick={() => navigate("/support/open-ticket")}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>+</span> Buat Tiket Baru
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <p>Memuat tiket...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8", background: "#f8fafc", borderRadius: 12, border: "2px dashed #e2e8f0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎫</div>
          <p style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600, color: "#475569" }}>
            {tickets.length === 0 ? "Belum ada tiket support" : "Tidak ada tiket yang cocok dengan filter"}
          </p>
          <p style={{ margin: "0 0 20px 0", fontSize: 14 }}>
            {tickets.length === 0 ? "Buat tiket pertama untuk mendapatkan bantuan dari tim kami" : "Coba ubah filter untuk melihat tiket lain"}
          </p>
          {tickets.length === 0 && showCreateButton && (
            <button
              onClick={() => navigate("/support/open-ticket")}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                background: "#2563eb",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Buat Tiket Pertama
            </button>
          )}
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 13,
                background: "#fff",
                cursor: "pointer",
              }}
            >
              <option value="all">Semua Status</option>
              <option value="open">Open</option>
              <option value="read">Read</option>
              <option value="process">Process</option>
              <option value="complete">Complete</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 13,
                background: "#fff",
                cursor: "pointer",
              }}
            >
              <option value="all">Semua Prioritas</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f8fafc" }}>
                    <th style={{ padding: "14px 16px", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>No</th>
                    <th style={{ padding: "14px 16px", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Perihal</th>
                    <th style={{ padding: "14px 16px", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Prioritas</th>
                    <th style={{ padding: "14px 16px", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                    <th style={{ padding: "14px 16px", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Dibuat</th>
                    <th style={{ padding: "14px 16px", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket, index) => {
                    const priorityConfig = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
                    const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;

                    return (
                      <tr key={ticket.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "16px", fontSize: 13, color: "#64748b", fontWeight: 600 }}>{index + 1}</td>
                        <td style={{ padding: "16px", maxWidth: 300 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>{ticket.subject}</div>
                          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {ticket.message}
                          </div>
                        </td>
                        <td style={{ padding: "16px" }}>
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
                            <span>{getPriorityIcon(ticket.priority)}</span>
                            {priorityConfig.label}
                          </span>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "5px 12px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            background: statusConfig.bg,
                            color: statusConfig.color,
                            border: `1px solid ${statusConfig.border}`,
                          }}>
                            <span>{getStatusIcon(ticket.status)}</span>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td style={{ padding: "16px", fontSize: 13, color: "#64748b" }}>
                          {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }) : "-"}
                        </td>
                        <td style={{ padding: "16px", textAlign: "right" }}>
                          <button
                            onClick={() => navigate(`/support/${ticket.id}`)}
                            style={{
                              padding: "7px 14px",
                              marginRight: 6,
                              background: "#0ea5e9",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              cursor: "pointer",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            Lihat
                          </button>
                          <button
                            onClick={() => handleDelete(ticket)}
                            style={{
                              padding: "7px 14px",
                              background: "#dc2626",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              cursor: "pointer",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
