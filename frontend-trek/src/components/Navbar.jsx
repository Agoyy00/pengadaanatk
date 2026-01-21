import { BRANDING } from "../components/Branding";

export default function Navbar({ onLoginClick }) {
  return (
     <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        padding: "16px 48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 1000,

        /* DARK GLASS PREMIUM */
        background:
          "linear-gradient(180deg, rgba(10,47,82,0.88), rgba(10,47,82,0.75))",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",

        borderBottom: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 12px 32px rgba(0,0,0,0.55)",
      }}
    >
      {/* BRAND */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* GOLD ACCENT */}
        <div
          style={{
            width: "5px",
            height: "42px",
            background: "linear-gradient(180deg, #e6c35c, #b18a1f)",
            borderRadius: "6px",
            boxShadow: "0 0 8px rgba(225,185,90,0.4)",
          }}
        />

         <div style={{ lineHeight: 1.05 }}>
          {/* SHORT NAME */}
          <div
            style={{
              fontSize: "30px",
              fontWeight: 900,
              letterSpacing: "4px",
              color: "#eafff5",
              textTransform: "uppercase",
              textShadow:
                "0 4px 18px rgba(0,0,0,0.95), 0 0 12px rgba(34,197,94,0.35)",
            }}
          >
            YAS WEB
          </div>

          {/* FULL NAME */}
          <div
            style={{
              marginTop: "2px",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "2.4px",
                color: "#f2f2f2",
                opacity: 0.92,
                textShadow: "0 1px 4px rgba(0,0,0,0.75)",
              }}
            >
              {BRANDING.fullName}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
