export default function Navbar({ onLoginClick }) {
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        background: "#1a1a1a",
        padding: "15px 40px",
        color: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 1000,
        boxShadow: "0 2px 10px rgba(0,0,0,0.4)"
      }}
    >
      <h2 style={{ margin: 0 }}>Pengadaan ATK</h2>

      <button
        style={{
          padding: "8px 15px",
          background: "#646cff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          color: "white",
          fontSize: "16px",
          marginRight:"50px",
        }}
        onClick={onLoginClick}
      >
        Login
      </button>
    </nav>
  );
}
