import React from "react";
import { BRANDING } from "../components/Branding";

export default function Navbar({ onLoginClick }) {
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        padding: "0 64px", // Padding disesuaikan untuk keseimbangan vertikal
        height: "85px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 1000,
        boxSizing: "border-box",

        /* PREMIUM FROSTED GLASS */
        background: "rgba(10, 47, 82, 0.75)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",

        /* SOFT LIGHTING EFFECTS */
        borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 10px 40px rgba(0, 0, 0, 0.4)",
      }}
    >
      {/* BRAND SECTION */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        {/* VERTICAL GOLD ACCENT - More Refined */}
        <div
          style={{
            width: "3px",
            height: "44px",
            background: "linear-gradient(180deg, #D4AF37 0%, #B8860B 100%)",
            borderRadius: "4px",
            boxShadow: "0 0 15px rgba(212, 175, 55, 0.3)",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* LOGO TITLE - Luxury Typography */}
          <div
            style={{
              fontSize: "26px",
              fontWeight: "800",
              letterSpacing: "5px",
              color: "#FFFFFF",
              textTransform: "uppercase",
              lineHeight: "1",
              background: "linear-gradient(180deg, #FFFFFF 0%, #E2E8F0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.5))",
            }}
          >
            YAS WEB
          </div>

          {/* SUBTITLE - Minimalist */}
          <div
            style={{
              fontSize: "11px",
              fontWeight: "400",
              letterSpacing: "2.8px",
              color: "#94A3B8",
              textTransform: "uppercase",
              marginTop: "6px",
              opacity: 0.9,
            }}
          >
            {BRANDING.fullName}
          </div>
        </div>
      </div>
    </nav>
  );
}