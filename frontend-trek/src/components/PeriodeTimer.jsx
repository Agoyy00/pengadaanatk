import React, { useState, useEffect } from "react";
import "../css/PeriodeTimer.css";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function PeriodeTimer({ typeFilter }) {
  const [periodeData, setPeriodeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    status: "loading", // "green" | "yellow" | "red" | "closed"
  });

  useEffect(() => {
    async function fetchPeriode() {
      try {
        const url = `${API_BASE}/periode/active${typeFilter ? `?jenis=${typeFilter}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) {
          setTimeLeft((prev) => ({ ...prev, status: "closed" }));
          return;
        }
        const data = await res.json();

        const isOpen =
          data.is_open === true ||
          data.is_open === 1 ||
          data.is_open === "1" ||
          data.is_open === "open";

        if (isOpen && data.periode) {
          setPeriodeData(data.periode);
        } else {
          setPeriodeData(null);
          setTimeLeft((prev) => ({ ...prev, status: "closed" }));
        }
      } catch (err) {
        console.error("Gagal load timer periode:", err);
        setTimeLeft((prev) => ({ ...prev, status: "closed" }));
      } finally {
        setLoading(false);
      }
    }

    fetchPeriode();
  }, [typeFilter]);

  useEffect(() => {
    if (!periodeData || !periodeData.selesai) return;

    function updateTimer() {
      const now = new Date().getTime();
      const end = new Date(periodeData.selesai).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          status: "closed",
        });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      // Color rules:
      // Green: Sisa > 3 hari
      // Yellow: Sisa 1 - 3 hari
      // Red: Sisa <= 1 hari / H-1
      let status = "green";
      if (diff <= 1 * 24 * 60 * 60 * 1000) {
        status = "red";
      } else if (diff <= 3 * 24 * 60 * 60 * 1000) {
        status = "yellow";
      } else {
        status = "green";
      }

      setTimeLeft({ days, hours, minutes, seconds, status });
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [periodeData]);

  if (loading) return null;

  // 👉 Hanya role "user" (Pemohon) yang dapat melihat timer periode di topbar
  const storedUser = localStorage.getItem("user");
  const userObj = storedUser ? JSON.parse(storedUser) : null;
  const userRole = String(userObj?.role || "").toLowerCase().trim();

  if (userRole !== "user") {
    return null;
  }

  const isStockOpnamePeriod = periodeData?.jenis_periode?.toLowerCase()?.includes("stock opname");

  if (typeFilter === "stock_opname" && !isStockOpnamePeriod) {
    return (
      <div className="periode-timer-badge timer-badge-red" title="Periode Stock Opname sedang ditutup">
        <span className="timer-dot red-dot"></span>
        <span className="timer-text">Periode Stock Opname: Ditutup</span>
      </div>
    );
  }
  if (typeFilter === "pengajuan" && isStockOpnamePeriod) {
    return (
      <div className="periode-timer-badge timer-badge-red" title="Periode Pengajuan sedang ditutup">
        <span className="timer-dot red-dot"></span>
        <span className="timer-text">Periode Pengajuan: Ditutup</span>
      </div>
    );
  }

  let jenisLabel = typeFilter === "stock_opname" ? "Periode Stock Opname" : "Periode Pengajuan";
  if (periodeData?.jenis_periode) {
    if (periodeData.jenis_periode.toLowerCase().includes("stock opname")) {
      jenisLabel = "Periode Stock Opname";
    } else {
      jenisLabel = "Periode Pengajuan";
    }
  }

  if (timeLeft.status === "closed" || !periodeData) {
    return (
      <div className="periode-timer-badge timer-badge-red" title={`${jenisLabel} sedang ditutup`}>
        <span className="timer-dot red-dot"></span>
        <span className="timer-text">{jenisLabel}: Ditutup</span>
      </div>
    );
  }

  const { days, hours, minutes, seconds, status } = timeLeft;

  let badgeClass = "timer-badge-green";
  let dotClass = "green-dot";

  if (status === "yellow") {
    badgeClass = "timer-badge-yellow";
    dotClass = "yellow-dot";
  } else if (status === "red") {
    badgeClass = "timer-badge-red";
    dotClass = "red-dot";
  }

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div
      className={`periode-timer-badge ${badgeClass}`}
      title={`${jenisLabel} - Berakhir: ${new Date(periodeData.selesai).toLocaleString("id-ID")}`}
    >
      <span className={`timer-dot ${dotClass}`}></span>
      <span className="timer-text">
        <span style={{ fontFamily: "inherit", fontWeight: 700, marginRight: "5px" }}>
          {jenisLabel}:
        </span>
        {days > 0 ? `${days}h ` : ""}
        {pad(hours)}j {pad(minutes)}m {pad(seconds)}d
      </span>
    </div>
  );
}
