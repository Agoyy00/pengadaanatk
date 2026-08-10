import React from "react";

export default function SidebarLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "32px", padding: "4px 0" }}>
      {/* Gold Vertical Accent Bar */}
      <div
        style={{
          width: "3.5px",
          height: "38px",
          background: "linear-gradient(180deg, #F59E0B 0%, #D4AF37 50%, #B8860B 100%)",
          borderRadius: "4px",
          boxShadow: "0 0 14px rgba(212, 175, 55, 0.5), 0 0 4px rgba(245, 158, 11, 0.4)",
          flexShrink: 0,
        }}
      />

      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* YAS WEB TITLE */}
        <div
          style={{
            fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            fontSize: "22px",
            fontWeight: "800",
            letterSpacing: "4.5px",
            color: "#FFFFFF",
            textTransform: "uppercase",
            lineHeight: "1.05",
            background: "linear-gradient(180deg, #FFFFFF 0%, #E2E8F0 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4))",
          }}
        >
          YAS WEB
        </div>

        {/* SUBTITLE */}
        <div
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: "9.5px",
            fontWeight: "600",
            letterSpacing: "2.4px",
            color: "#94A3B8",
            textTransform: "uppercase",
            marginTop: "5px",
            opacity: 0.85,
          }}
        >
          YARSI ATK SYSTEM
        </div>
      </div>
    </div>
  );
}
