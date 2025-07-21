import React, { useState, useRef, useEffect } from "react";
import { getAuth, signOut } from "firebase/auth";
import { initializeApp } from "firebase/app";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const COLORS = {
  primary: "#5C6F68",
  accent: "#E4DED5",
  text: "#1F1F1F",
  highlight: "#9DBE8D",
};

const NAV_LINKS = [
  { name: "Analytics", href: "/admin/analytics" },
  { name: "Bookings", href: "/admin/bookings" },
  { name: "Dashboard", href: "/admin/dashboard" },
  { name: "Employee", href: "/admin/employee" },
  { name: "Reviews", href: "/admin/reviews" },
  { name: "Services", href: "/admin/services" },
  { name: "Settings", href: "/admin/settings" },
];

// Add props for user and logout
type NavbarProps = {
  user?: { email?: string | null };
  onLogout?: () => void;
  currentPath?: string;
};

export default function Navbar({ user, onLogout, currentPath }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Always initialize path to "" to avoid SSR/client mismatch
  const [path, setPath] = useState(currentPath || "");

  useEffect(() => {
    if (!currentPath && typeof window !== "undefined") {
      setPath(window.location.pathname);
    } else if (currentPath) {
      setPath(currentPath);
    }
  }, [currentPath]);

  useEffect(() => {
    if (!dropdownOpen && !mobileMenuOpen) return;
    
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen, mobileMenuOpen]);

  const handleLogout = async () => {
    try {
      // Sign out from Firebase
      await signOut(auth);

      // Clear localStorage
      localStorage.removeItem("bookme_user");

      // Call the onLogout prop if provided
      if (onLogout) {
        onLogout();
      }

      // Redirect to login page
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Overlay click closes mobile menu
  const handleOverlayClick = () => {
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
        margin: 0,
        boxShadow: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <a
          href="/"
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: "2rem",
            color: "#5C6F68",
            textDecoration: "none",
            letterSpacing: -1,
          }}
        >
          bookme
        </a>
        
        {/* Desktop Navigation */}
        <div 
          style={{ 
            display: "flex", 
            gap: 18
          }}
          className="desktop-nav"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                color: "#5C6F68",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: "1rem",
                padding: "0.3rem 0.7rem",
                borderRadius: 6,
                transition: "background 0.15s",
                background:
                  path === link.href ? COLORS.highlight : "transparent",
              }}
            >
              {link.name}
            </a>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Desktop Auth Section */}
        <div className="desktop-auth" style={{ display: "flex", alignItems: "center" }}>
          {!user ? (
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
          ) : (
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
                aria-label="Account"
              >
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
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      handleLogout();
                    }}
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
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen((open) => !open)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            display: "none",
            flexDirection: "column",
            justifyContent: "space-around",
            width: 24,
            height: 24,
          }}
          className="mobile-hamburger"
          aria-label="Menu"
        >
          <span
            style={{
              display: "block",
              height: 2,
              width: "100%",
              background: "#5C6F68",
              borderRadius: 1,
              transition: "all 0.3s",
              transform: mobileMenuOpen ? "rotate(45deg) translate(5px, 5px)" : "none",
            }}
          />
          <span
            style={{
              display: "block",
              height: 2,
              width: "100%",
              background: "#5C6F68",
              borderRadius: 1,
              transition: "all 0.3s",
              opacity: mobileMenuOpen ? 0 : 1,
            }}
          />
          <span
            style={{
              display: "block",
              height: 2,
              width: "100%",
              background: "#5C6F68",
              borderRadius: 1,
              transition: "all 0.3s",
              transform: mobileMenuOpen ? "rotate(-45deg) translate(7px, -6px)" : "none",
            }}
          />
        </button>
      </div>

      {/* Overlay for mobile menu */}
      {mobileMenuOpen && (
        <div
          onClick={handleOverlayClick}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(60,60,60,0.18)",
            zIndex: 19,
          }}
        />
      )}

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            border: `1px solid ${COLORS.primary}15`,
            borderTop: "none",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            zIndex: 20,
          }}
          className="mobile-menu"
        >
          <div style={{ padding: "1rem 2rem" }}>
            {/* Mobile Navigation Links */}
            <div style={{ marginBottom: "1rem" }}>
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    closeMobileMenu();
                  }}
                  style={{
                    display: "block",
                    color: "#5C6F68",
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: "1rem",
                    padding: "0.75rem 0",
                    borderRadius: 6,
                    background:
                      path === link.href ? COLORS.highlight : "transparent",
                    marginBottom: "0.5rem",
                  }}
                >
                  {link.name}
                </a>
              ))}
            </div>
            
            {/* Mobile Auth Section */}
            <div style={{ borderTop: `1px solid ${COLORS.primary}15`, paddingTop: "1rem" }}>
              {!user ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <a
                    href="/login"
                    onClick={() => {
                      closeMobileMenu();
                    }}
                    style={{
                      color: "#5C6F68",
                      fontWeight: 500,
                      textDecoration: "none",
                      padding: "0.75rem 0",
                    }}
                  >
                    Login
                  </a>
                  <a
                    href="/register"
                    onClick={() => {
                      closeMobileMenu();
                    }}
                    style={{
                      color: "#5C6F68",
                      fontWeight: 500,
                      textDecoration: "none",
                      padding: "0.75rem 0",
                    }}
                  >
                    Registrieren
                  </a>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    handleLogout();
                  }}
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    color: "#b00",
                    fontWeight: 500,
                    padding: "0.75rem 0",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "1rem",
                  }}
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .desktop-auth {
            display: none !important;
          }
          .mobile-hamburger {
            display: flex !important;
          }
        }
        
        @media (min-width: 769px) {
          .mobile-hamburger {
            display: none !important;
          }
          .mobile-menu {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
}