import React, { useState, useEffect } from "react";
import "../css/PeriodeTimer.css";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function PeriodeTimer() {
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
        const res = await fetch(`${API_BASE}/periode/active`);
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
  }, []);

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

  if (timeLeft.status === "closed" || !periodeData) {
    return (
      <div className="periode-timer-badge timer-badge-red" title="Periode pengajuan sedang ditutup">
        <span className="timer-dot red-dot"></span>
        <span className="timer-text">Periode Ditutup</span>
      </div>
    );
  }

  const { days, hours, minutes, seconds, status } = timeLeft;

  let badgeClass = "timer-badge-green";
  let dotClass = "green-dot";
  let statusIcon = "⏱️";

  if (status === "yellow") {
    badgeClass = "timer-badge-yellow";
    dotClass = "yellow-dot";
    statusIcon = "⏳";
  } else if (status === "red") {
    badgeClass = "timer-badge-red";
    dotClass = "red-dot";
    statusIcon = "🔥";
  }

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div
      className={`periode-timer-badge ${badgeClass}`}
      title={`Periode berakhir: ${new Date(periodeData.selesai).toLocaleString("id-ID")}`}
    >
      <span className={`timer-dot ${dotClass}`}></span>
      <span className="timer-icon">{statusIcon}</span>
      <span className="timer-text">
        {status === "red" && days === 0 ? "H-1: " : ""}
        {days > 0 ? `${days}h ` : ""}
        {pad(hours)}j {pad(minutes)}m {pad(seconds)}s
      </span>
    </div>
  );
}
