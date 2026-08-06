import React, { useState, useEffect, useRef } from 'react';
import '../css/DesktopSidebarToggle.css';

export default function DesktopSidebarToggle({ isSidebarOpen, setIsSidebarOpen }) {
  const [showButton, setShowButton] = useState(false);
  const hoverTimer = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      // Only run this logic on desktop
      if (window.innerWidth <= 768) return;

      // If cursor is at the far left edge (e.g., x <= 20px)
      if (e.clientX <= 20) {
        if (!hoverTimer.current && !showButton) {
          hoverTimer.current = setTimeout(() => {
            setShowButton(true);
          }, 2000); // 2 seconds delay
        }
      } else {
        // If cursor moves away and we are not hovering the button itself
        if (e.clientX > 80) {
          if (hoverTimer.current) {
            clearTimeout(hoverTimer.current);
            hoverTimer.current = null;
          }
          setShowButton(false);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, [showButton]);

  // We don't render this component on mobile since mobile uses the topbar hamburger
  if (window.innerWidth <= 768) return null;

  return (
    <button 
      className={`desktop-sidebar-toggle ${showButton ? 'visible' : ''} ${isSidebarOpen ? 'open' : ''}`}
      onClick={() => {
        setIsSidebarOpen(!isSidebarOpen);
        setShowButton(true); 
      }}
      onMouseEnter={() => setShowButton(true)}
      title="Toggle Sidebar"
    >
      <span className="dt-hamburger-line"></span>
      <span className="dt-hamburger-line"></span>
      <span className="dt-hamburger-line"></span>
    </button>
  );
}
