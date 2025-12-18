export default function Navbar({ onLoginClick }) {
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        background: "transparant",
        padding: "15px 40px",
        color: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 1000,
        boxShadow: "0 2px 10px rgba(0,0,0,0.4)"
      }}
    >
      <h2 style={{ margin: 0}}>Pengadaan ATK</h2>
    </nav>
  );
}