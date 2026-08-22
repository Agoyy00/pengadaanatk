import React from "react";
import logoYarsi from "./LogoYarsi-removebg-preview.png";

export default function SidebarLogo() {
  return (
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "32px", padding: "4px 0" }}>
      {/* Logo YARSI - White */}
      <img
        src={logoYarsi}
        alt="Logo YARSI"
        style={{
          width: "38px",
          height: "38px",
          objectFit: "contain",
          flexShrink: 0,
          filter: "brightness(0) invert(1) sepia(0) saturate(100)",
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
