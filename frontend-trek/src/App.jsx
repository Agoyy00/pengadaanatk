import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import "./App.css";

import Navbar from "./components/Navbar";
import Login from "./components/Login";
import Pengajuan from "./components/Pengajuan";
import DashboardUser from "./components/DashboardUser";
import History from "./components/History";
import DashboardAdmin from "./components/DashboardAdmin";
import Verifikasi from "./components/Verifikasi";
import Periode from "./components/Periode";

function App() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <BrowserRouter>
      <Routes>

        {/* LANDING PAGE */}
        <Route
          path="/"
          element={
            <>
              <Navbar onLoginClick={() => setShowLogin(true)} />

              <div className="landing">
                <h1>Selamat Datang di Website Pengadaan ATK</h1>
              </div>

              {showLogin && <Login onClose={() => setShowLogin(false)} />}
            </>
          }
        />

        {/* USER ROUTES */}
        <Route
          path="/pengajuan"
          element={<Pengajuan onLogout={() => setShowLogin(true)} />}
        />
        <Route path="/dashboarduser" element={<DashboardUser />} />
        <Route path="/riwayat" element={<History />} />

        {/* ADMIN ROUTES */}
        <Route path="/dashboardadmin" element={<DashboardAdmin />} />
        <Route path="/verifikasi" element={<Verifikasi />} />
        <Route path="/periode" element={<Periode />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
