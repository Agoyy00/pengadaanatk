import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function OpenTicket() {
  const navigate = useNavigate();

  // Form State
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("medium");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);

  // UI & Validation State
  const [touched, setTouched] = useState({});
  const [fileError, setFileError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);
  const [serverError, setServerError] = useState("");
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef(null);

  const priorityOptions = [
    {
      value: "low",
      label: "LOW",
      badgeText: "Minor",
      icon: "🟢",
      desc: "Masalah minor, tidak mengganggu",
      color: "#10b981",
      bgColor: "#f0fdf4",
      borderColor: "#34d399",
      badgeBg: "#dcfce7",
      badgeColor: "#15803d",
      shadow: "0 6px 16px rgba(16, 185, 129, 0.12)",
    },
    {
      value: "medium",
      label: "MEDIUM",
      badgeText: "Sedang",
      icon: "🟡",
      desc: "Masalah sedang, butuh perhatian",
      color: "#f59e0b",
      bgColor: "#fffbeb",
      borderColor: "#fbbf24",
      badgeBg: "#fef3c7",
      badgeColor: "#b45309",
      shadow: "0 6px 16px rgba(245, 158, 11, 0.12)",
    },
    {
      value: "high",
      label: "HIGH",
      badgeText: "Kritis",
      icon: "🔴",
      desc: "Masalah kritis, blocking",
      color: "#f43f5e",
      bgColor: "#fff1f2",
      borderColor: "#fb7185",
      badgeBg: "#ffe4e6",
      badgeColor: "#be123c",
      shadow: "0 6px 16px rgba(244, 63, 94, 0.12)",
    },
  ];

  // Validation Logic
  const getErrors = () => {
    const errors = {};
    if (!subject.trim()) {
      errors.subject = "Perihal tiket wajib diisi.";
    } else if (subject.trim().length < 5) {
      errors.subject = "Perihal minimal 5 karakter.";
    }

    if (!priority) {
      errors.priority = "Level prioritas wajib dipilih.";
    }

    if (!message.trim()) {
      errors.message = "Isi pesan wajib diisi.";
    } else if (message.trim().length < 20) {
      errors.message = "Isi pesan minimal 20 karakter agar jelas bagi tim support.";
    } else if (message.trim().length > 2000) {
      errors.message = "Isi pesan maksimal 2000 karakter.";
    }

    return errors;
  };

  const errors = getErrors();

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Attachment File Handling
  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf", ".docx"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_FILES = 5;

  const validateAndAddFiles = (newFiles) => {
    setFileError("");
    const fileList = Array.from(newFiles);

    if (files.length + fileList.length > MAX_FILES) {
      setFileError(`Maksimal ${MAX_FILES} file yang dapat diunggah.`);
      return;
    }

    const validFiles = [];

    for (let file of fileList) {
      const ext = "." + file.name.split(".").pop().toLowerCase();
      const isValidType = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext);

      if (!isValidType) {
        setFileError(`File "${file.name}" tidak didukung. Gunakan format JPG, PNG, PDF, atau DOCX.`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setFileError(`File "${file.name}" melebihi ukuran batas 10MB.`);
        return;
      }

      validFiles.push(file);
    }

    setFiles((prev) => [...prev, ...validFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileError("");
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileBadge = (file) => {
    const ext = file.name.split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png"].includes(ext)) {
      return { label: ext.toUpperCase(), bg: "#e0f2fe", color: "#0284c7" };
    }
    if (ext === "pdf") {
      return { label: "PDF", bg: "#fee2e2", color: "#dc2626" };
    }
    return { label: "DOCX", bg: "#dbeafe", color: "#2563eb" };
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    setTouched({
      subject: true,
      priority: true,
      message: true,
    });

    if (Object.keys(errors).length > 0) {
      return;
    }

    setLoading(true);
    setServerError("");

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("subject", subject.trim());
      formData.append("priority", priority);
      formData.append("message", message.trim());

      files.forEach((f) => {
        formData.append("attachments[]", f);
      });

      const res = await fetch(`${API_BASE}/support-tickets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formData,
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (res.ok && data?.success !== false) {
        setCreatedTicket(data?.ticket || {
          id: data?.id || Math.floor(10000 + Math.random() * 90000),
          subject: subject.trim(),
          priority,
          status: "open",
          fileCount: files.length,
          created_at: new Date().toISOString(),
        });
      } else {
        if (!res.ok && data?.message) {
          throw new Error(data.message);
        }

        // Fallback JSON
        const jsonRes = await fetch(`${API_BASE}/support-tickets`, {
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

        const jsonData = await jsonRes.json();
        if (!jsonRes.ok || jsonData?.success === false) {
          throw new Error(jsonData?.message || "Gagal membuat tiket support.");
        }

        setCreatedTicket(jsonData?.ticket || {
          id: jsonData?.id || Math.floor(10000 + Math.random() * 90000),
          subject: subject.trim(),
          priority,
          status: "open",
          fileCount: files.length,
          created_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Ticket submission error:", err);
      setServerError(err.message || "Terjadi kesalahan saat mengirim tiket. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSubject("");
    setPriority("medium");
    setMessage("");
    setFiles([]);
    setTouched({});
    setFileError("");
    setCreatedTicket(null);
    setServerError("");
  };

  const handleCopyTicketId = (ticketIdStr) => {
    navigator.clipboard.writeText(ticketIdStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // SUCCESS STATE SCREEN
  if (createdTicket) {
    const ticketIdStr = createdTicket.id ? `#TKT-${String(createdTicket.id).padStart(5, '0')}` : "#TKT-NEW";
    const selectedPriorityObj = priorityOptions.find((p) => p.value === (createdTicket.priority || priority));

    return (
      <div style={{ maxWidth: 780, margin: "10px auto 40px auto", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748b", marginBottom: 20 }}>
          <Link to="/support" style={{ color: "#0284c7", textDecoration: "none", fontWeight: 600 }}>
            Support
          </Link>
          <span style={{ color: "#cbd5e1" }}>/</span>
          <span style={{ color: "#0f172a", fontWeight: 600 }}>OpenTicket</span>
        </div>

        {/* Success Card Container */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 20,
            border: "1px solid rgba(226, 232, 240, 0.9)",
            boxShadow: "0 20px 30px -10px rgba(15, 23, 42, 0.05), 0 10px 15px -5px rgba(15, 23, 42, 0.02)",
            padding: "44px 36px",
            textAlign: "center",
          }}
        >
          {/* Animated Success Badge Icon */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #dcfce7 0%, #a7f3d0 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px auto",
              boxShadow: "0 10px 25px rgba(16, 185, 129, 0.25)",
            }}
          >
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#15803d" strokeWidth="2.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0", letterSpacing: "-0.02em" }}>
            Tiket Berhasil Terkirim!
          </h2>
          <p style={{ fontSize: 14.5, color: "#64748b", maxWidth: 520, margin: "0 auto 28px auto", lineHeight: 1.6 }}>
            Tiket Anda telah berhasil masuk ke sistem support. Tim teknis akan segera menindaklanjuti kendala Anda.
          </p>

          {/* Ticket Summary Details Box */}
          <div
            style={{
              background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              padding: 24,
              textAlign: "left",
              marginBottom: 32,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>ID Tiket</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#0284c7", fontFamily: "monospace", letterSpacing: 0.5 }}>
                  {ticketIdStr}
                </span>
                <button
                  onClick={() => handleCopyTicketId(ticketIdStr)}
                  style={{
                    background: copied ? "#dcfce7" : "#e0f2fe",
                    color: copied ? "#15803d" : "#0284c7",
                    border: "none",
                    padding: "4px 8px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {copied ? "Copied! ✓" : "Copy"}
                </button>
              </div>
            </div>

            <div style={{ height: 1, background: "#e2e8f0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Perihal</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", textAlign: "right", maxWidth: 420 }}>
                {createdTicket.subject || subject}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Level Prioritas</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: 20,
                  background: selectedPriorityObj?.badgeBg,
                  color: selectedPriorityObj?.badgeColor,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {selectedPriorityObj?.icon} {selectedPriorityObj?.label} ({selectedPriorityObj?.badgeText})
              </span>
            </div>

            {files.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Lampiran</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>
                  📎 {files.length} File Terlampir
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate(`/support/${createdTicket.id}`)}
              style={{
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                color: "#ffffff",
                padding: "12px 26px",
                borderRadius: 10,
                border: "none",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 6px 18px rgba(2, 132, 199, 0.3)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
            >
              Lihat Detail Tiket
            </button>

            <button
              onClick={() => navigate("/support")}
              style={{
                background: "#ffffff",
                color: "#334155",
                padding: "12px 22px",
                borderRadius: 10,
                border: "1.5px solid #cbd5e1",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => (e.target.style.borderColor = "#94a3b8")}
              onMouseLeave={(e) => (e.target.style.borderColor = "#cbd5e1")}
            >
              Kembali ke Support
            </button>

            <button
              onClick={handleReset}
              style={{
                background: "#f1f5f9",
                color: "#475569",
                padding: "12px 20px",
                borderRadius: 10,
                border: "none",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Buat Tiket Baru
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MAIN FORM RENDER
  return (
    <div style={{ maxWidth: 840, margin: "10px auto 50px auto", fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      {/* Header & Breadcrumb */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748b", marginBottom: 12 }}>
          <Link to="/support" style={{ color: "#0284c7", textDecoration: "none", fontWeight: 600 }}>
            Support
          </Link>
          <span style={{ color: "#cbd5e1" }}>/</span>
          <span style={{ color: "#0f172a", fontWeight: 600 }}>OpenTicket</span>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: "0 0 6px 0", letterSpacing: "-0.025em" }}>
          Buat Tiket Support Baru
        </h1>
        <p style={{ fontSize: 14.5, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
          Ceritakan masalah atau pertanyaan Anda, tim support akan membantu Anda.
        </p>
      </div>

      {/* Global Server Error Alert */}
      {serverError && (
        <div
          style={{
            marginBottom: 24,
            padding: "16px 20px",
            borderRadius: 14,
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            color: "#b91c1c",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 4px 12px rgba(239, 68, 68, 0.08)",
          }}
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span style={{ flex: 1, fontWeight: 500 }}>{serverError}</span>
        </div>
      )}

      {/* Main Form Container */}
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#ffffff",
          padding: "36px",
          borderRadius: 20,
          border: "1px solid rgba(226, 232, 240, 0.9)",
          boxShadow: "0 20px 30px -10px rgba(15, 23, 42, 0.04), 0 8px 10px -6px rgba(15, 23, 42, 0.02)",
        }}
      >
        {/* 1. PERIHAL */}
        <div style={{ marginBottom: 30 }}>
          <label
            htmlFor="ticket-subject"
            style={{ display: "block", marginBottom: 10, fontWeight: 700, fontSize: 14, color: "#1e293b" }}
          >
            Perihal <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            id="ticket-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onBlur={() => handleBlur("subject")}
            placeholder="Contoh: Tidak bisa mengajukan pengajuan ATK"
            style={{
              width: "100%",
              padding: "13px 18px",
              borderRadius: 10,
              border: `1.5px solid ${touched.subject && errors.subject ? "#ef4444" : "#e2e8f0"}`,
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              transition: "all 0.2s ease",
              background: "#ffffff",
              color: "#0f172a",
            }}
            onFocus={(e) => {
              if (!(touched.subject && errors.subject)) {
                e.target.style.borderColor = "#0284c7";
                e.target.style.boxShadow = "0 0 0 4px rgba(2, 132, 199, 0.12)";
              }
            }}
            onBlurCapture={(e) => {
              e.target.style.boxShadow = "none";
              if (!(touched.subject && errors.subject)) {
                e.target.style.borderColor = "#e2e8f0";
              }
            }}
          />
          {touched.subject && errors.subject && (
            <div style={{ marginTop: 7, fontSize: 13, color: "#ef4444", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
              <span>⚠️</span> {errors.subject}
            </div>
          )}
        </div>

        {/* 2. LEVEL PRIORITAS */}
        <div style={{ marginBottom: 30 }}>
          <label style={{ display: "block", marginBottom: 10, fontWeight: 700, fontSize: 14, color: "#1e293b" }}>
            Level Prioritas <span style={{ color: "#ef4444" }}>*</span>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {priorityOptions.map((opt) => {
              const isSelected = priority === opt.value;
              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    setPriority(opt.value);
                    setTouched((prev) => ({ ...prev, priority: true }));
                  }}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setPriority(opt.value);
                      setTouched((prev) => ({ ...prev, priority: true }));
                    }
                  }}
                  style={{
                    padding: "16px 18px",
                    borderRadius: 12,
                    border: `2px solid ${isSelected ? opt.color : "#e2e8f0"}`,
                    background: isSelected ? opt.bgColor : "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    outline: "none",
                    boxShadow: isSelected ? opt.shadow : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = "#cbd5e1";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                      e.currentTarget.style.transform = "translateY(0)";
                    }
                  }}
                >
                  {/* Card Header Row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{opt.icon}</span>
                      <span style={{ fontWeight: 800, fontSize: 14, color: isSelected ? opt.color : "#1e293b", letterSpacing: 0.2 }}>
                        {opt.label}
                      </span>
                    </div>

                    {/* Radio Check Circle */}
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: `2px solid ${isSelected ? opt.color : "#cbd5e1"}`,
                        background: isSelected ? opt.color : "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {isSelected && (
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ffffff" }} />
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.45 }}>{opt.desc}</div>
                </div>
              );
            })}
          </div>
          {touched.priority && errors.priority && (
            <div style={{ marginTop: 7, fontSize: 13, color: "#ef4444", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
              <span>⚠️</span> {errors.priority}
            </div>
          )}
        </div>

        {/* 3. ISI PESAN */}
        <div style={{ marginBottom: 30 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <label
              htmlFor="ticket-message"
              style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", margin: 0 }}
            >
              Isi Pesan <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 12,
                background: message.length > 2000 ? "#fee2e2" : "#f1f5f9",
                color: message.length > 2000 ? "#dc2626" : "#64748b",
                fontFamily: "monospace",
              }}
            >
              {message.length} / 2000
            </span>
          </div>

          <textarea
            id="ticket-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onBlur={() => handleBlur("message")}
            placeholder="Jelaskan masalah atau pertanyaan Anda secara detail..."
            rows={6}
            style={{
              width: "100%",
              padding: "14px 18px",
              borderRadius: 10,
              border: `1.5px solid ${touched.message && errors.message ? "#ef4444" : "#e2e8f0"}`,
              fontSize: 14,
              resize: "vertical",
              outline: "none",
              fontFamily: "inherit",
              lineHeight: 1.6,
              boxSizing: "border-box",
              transition: "all 0.2s ease",
              background: "#ffffff",
              color: "#0f172a",
            }}
            onFocus={(e) => {
              if (!(touched.message && errors.message)) {
                e.target.style.borderColor = "#0284c7";
                e.target.style.boxShadow = "0 0 0 4px rgba(2, 132, 199, 0.12)";
              }
            }}
            onBlurCapture={(e) => {
              e.target.style.boxShadow = "none";
              if (!(touched.message && errors.message)) {
                e.target.style.borderColor = "#e2e8f0";
              }
            }}
          />

          {/* Lightbulb Helper Box */}
          <div
            style={{
              marginTop: 10,
              padding: "10px 14px",
              borderRadius: 8,
              background: "#f0f9ff",
              border: "1px solid #bae6fd",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>💡</span>
            <p style={{ margin: 0, fontSize: 12.5, color: "#0369a1", lineHeight: 1.4, fontWeight: 500 }}>
              Jelaskan kronologi masalah, error yang muncul, dan langkah yang sudah Anda coba.
            </p>
          </div>

          {touched.message && errors.message && (
            <div style={{ marginTop: 7, fontSize: 13, color: "#ef4444", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
              <span>⚠️</span> {errors.message}
            </div>
          )}
        </div>

        {/* 4. LAMPIRAN UPLOAD */}
        <div style={{ marginBottom: 34 }}>
          <label style={{ display: "block", marginBottom: 10, fontWeight: 700, fontSize: 14, color: "#1e293b" }}>
            Lampiran <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 13 }}>(Opsional)</span>
          </label>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? "#0284c7" : "#cbd5e1"}`,
              borderRadius: 14,
              padding: "28px 20px",
              textAlign: "center",
              background: isDragging ? "#f0f9ff" : "#f8fafc",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (!isDragging) {
                e.currentTarget.style.borderColor = "#0284c7";
                e.currentTarget.style.background = "#f0f9ff";
              }
            }}
            onMouseLeave={(e) => {
              if (!isDragging) {
                e.currentTarget.style.borderColor = "#cbd5e1";
                e.currentTarget.style.background = "#f8fafc";
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf,.docx"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />

            {/* Cloud Icon Circle */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "#e0f2fe",
                color: "#0284c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px auto",
                boxShadow: "0 4px 12px rgba(2, 132, 199, 0.15)",
              }}
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>

            <div style={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
              Klik atau geser file ke sini untuk mengunggah
            </div>
            <div style={{ fontSize: 12.5, color: "#64748b" }}>
              Format yang didukung: <strong>JPG, PNG, PDF, DOCX</strong> (Maks. 10MB per file, Maks. 5 file)
            </div>
          </div>

          {/* File Error Alert */}
          {fileError && (
            <div style={{ marginTop: 8, fontSize: 13, color: "#ef4444", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
              <span>⚠️</span> {fileError}
            </div>
          )}

          {/* Uploaded Files List */}
          {files.length > 0 && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {files.map((file, idx) => {
                const badge = getFileBadge(file);
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderRadius: 12,
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 2px 6px rgba(15, 23, 42, 0.03)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, overflow: "hidden" }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          padding: "4px 8px",
                          borderRadius: 6,
                          background: badge.bg,
                          color: badge.color,
                          letterSpacing: 0.5,
                          flexShrink: 0,
                        }}
                      >
                        {badge.label}
                      </span>

                      <div style={{ overflow: "hidden" }}>
                        <div
                          style={{
                            fontSize: 13.5,
                            fontWeight: 600,
                            color: "#0f172a",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 380,
                          }}
                        >
                          {file.name}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{formatFileSize(file.size)}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                        padding: 6,
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#ef4444";
                        e.currentTarget.style.background = "#fee2e2";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#94a3b8";
                        e.currentTarget.style.background = "transparent";
                      }}
                      title="Hapus file"
                    >
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ACTIONS BUTTON BAR */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 12,
            paddingTop: 24,
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/support")}
            style={{
              padding: "11px 22px",
              borderRadius: 10,
              border: "1.5px solid #cbd5e1",
              background: "#ffffff",
              color: "#475569",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => (e.target.style.borderColor = "#94a3b8")}
            onMouseLeave={(e) => (e.target.style.borderColor = "#cbd5e1")}
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "11px 26px",
              borderRadius: 10,
              border: "none",
              background: loading ? "#94a3b8" : "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 14,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 6px 16px rgba(2, 132, 199, 0.28)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {loading ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                <span>Mengirim Tiket...</span>
              </>
            ) : (
              <span>Kirim Tiket</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
