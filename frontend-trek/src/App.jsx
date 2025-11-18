import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import Pengajuan from "./components/Pengajuan";

function App() {
  const [count, setCount] = useState(0)
  const [showLogin, setShowLogin] = useState(false);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Navbar onLoginClick={() => setShowLogin(true)} />

              <div className="landing">
                <h1>Selamat Datang di Website Pengadaan ATK</h1>
              </div>

              {showLogin && (
                <Login onClose={() => setShowLogin(false)} />
              )}
            </>
          }
        />

        <Route path="/pengajuan" element={<Pengajuan />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;