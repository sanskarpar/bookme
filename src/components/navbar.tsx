import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";

const COLORS = {
  primary: "#5C6F68",
  accent: "#E4DED5",
  text: "#1F1F1F",
  highlight: "#9DBE8D",
};

type NavbarProps = {
  user?: { email?: string | null };
  onLogout?: () => void;
};

export default function Navbar({ user, onLogout }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Ensure consistent client/server rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

  // Only calculate active states after client hydration
  const isSalons = isClient ? pathname === "/salons" : false;
  const isBookings = isClient ? pathname === "/bookings" : false;

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    
    // Clear localStorage first
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("bookme_user");
    }
    
    // Call the onLogout callback if provided
    if (onLogout) {
      await onLogout();
    }
    
    // Force a full page reload to clear all state and trigger re-render
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  const handleMobileLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav
      style={{
        width: "100%",
        background: "#fff",
        borderBottom: `1px solid ${COLORS.primary}15`,
        padding: "1rem 2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <a
        href="/"
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 700,
          fontSize: "2rem",
          color: COLORS.primary,
          textDecoration: "none",
          letterSpacing: -1,
        }}
      >
        bookme
      </a>
      
      {/* Desktop Navigation */}
      <div 
        className="desktop-nav"
        style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 24
        }}
      >
        <a
          href="/salons"
          style={{
            color: "rgb(0, 0, 0)",
            fontWeight: 500,
            textDecoration: isSalons ? "underline" : "none",
            fontFamily: "Inter, sans-serif",
            fontSize: "1rem",
            marginRight: 8,
            padding: "4px 12px",
            borderRadius: 6,
            background: "none",
            transition: "background 0.2s",
          }}
        >
          Entdecken
        </a>
        <a
          href="/bookings"
          style={{
            color: "rgb(0, 0, 0)",
            fontWeight: 500,
            textDecoration: isBookings ? "underline" : "none",
            fontFamily: "Inter, sans-serif",
            fontSize: "1rem",
            marginRight: 8,
            padding: "4px 12px",
            borderRadius: 6,
            background: "none",
            transition: "background 0.2s",
          }}
        >
          Ihre Buchungen
        </a>
        {/* Only show Login/Register if NOT logged in */}
        {!user && (
          <>
            <a
              href="/login"
              style={{
                marginRight: 18,
                color: "#5C6F68",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Login
            </a>
            <a
              href="/register"
              style={{
                color: "#5C6F68",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Registrieren
            </a>
          </>
        )}
        {/* Show Account Circle with dropdown if logged in */}
        {user && (
          <div
            ref={dropdownRef}
            style={{ position: "relative", display: "inline-block" }}
          >
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
              }}
              aria-label="Konto"
            >
              {/* Simple Account Circle SVG */}
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="#5C6F68"
                style={{ marginRight: 8 }}
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M12 14c-4 0-7 2-7 4v2h14v-2c0-2-3-4-7-4z" />
              </svg>
            </button>
            {dropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "110%",
                  background: "#fff",
                  border: "1px solid #eee",
                  borderRadius: 8,
                  boxShadow: "0 2px 8px #0001",
                  minWidth: 160,
                  zIndex: 10,
                }}
              >
                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    color: "#b00",
                    fontWeight: 500,
                    padding: "12px 16px",
                    textAlign: "left",
                    cursor: "pointer",
                    borderTop: "none",
                  }}
                >
                  Abmelden
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Hamburger Button */}
      <div 
        ref={mobileMenuRef}
        className="mobile-nav"
        style={{ display: "none" }}
      >
        <button
          onClick={() => setMobileMenuOpen((open) => !open)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="Menü öffnen"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke={COLORS.primary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div
            style={{
              position: "absolute",
              right: "0",
              top: "100%",
              background: "#fff",
              border: "1px solid #eee",
              borderRadius: 8,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              minWidth: 200,
              zIndex: 20,
              marginTop: "8px",
            }}
          >
            <div style={{ padding: "8px 0" }}>
              <a
                href="/salons"
                onClick={handleMobileLinkClick}
                style={{
                  display: "block",
                  color: "rgb(0, 0, 0)",
                  fontWeight: 500,
                  textDecoration: isSalons ? "underline" : "none",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "1rem",
                  padding: "12px 16px",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                Entdecken
              </a>
              <a
                href="/bookings"
                onClick={handleMobileLinkClick}
                style={{
                  display: "block",
                  color: "rgb(0, 0, 0)",
                  fontWeight: 500,
                  textDecoration: isBookings ? "underline" : "none",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "1rem",
                  padding: "12px 16px",
                  borderBottom: user ? "1px solid #f0f0f0" : "none",
                }}
              >
                Ihre Buchungen
              </a>
              
              {!user && (
                <>
                  <a
                    href="/login"
                    onClick={handleMobileLinkClick}
                    style={{
                      display: "block",
                      color: "#5C6F68",
                      fontWeight: 500,
                      textDecoration: "none",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "1rem",
                      padding: "12px 16px",
                      borderBottom: "1px solid #f0f0f0",
                    }}
                  >
                    Login
                  </a>
                  <a
                    href="/register"
                    onClick={handleMobileLinkClick}
                    style={{
                      display: "block",
                      color: "#5C6F68",
                      fontWeight: 500,
                      textDecoration: "none",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "1rem",
                      padding: "12px 16px",
                    }}
                  >
                    Registrieren
                  </a>
                </>
              )}
              
              {user && (
                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    color: "#b00",
                    fontWeight: 500,
                    fontFamily: "Inter, sans-serif",
                    fontSize: "1rem",
                    padding: "12px 16px",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  Abmelden
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-nav {
            display: block !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-nav {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
}