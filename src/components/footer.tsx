import React from "react";

const COLORS = {
  primary: "#5C6F68",
  accent: "#E4DED5",
};

export default function Footer() {
  return (
    <footer
      style={{
        background: COLORS.primary,
        color: COLORS.accent,
        padding: "3rem 1rem 2rem 1rem",
        marginTop: "0rem",
        textAlign: "center",
      }}
    >
      {/* Legal Links Section */}
      <div style={{ 
        display: "flex",
        justifyContent: "center",
        gap: "16px",
        marginBottom: "24px",
        flexWrap: "wrap",
        fontSize: "0.85rem"
      }}>
        <a
          href="/agb"
          style={{
            color: COLORS.accent,
            textDecoration: "none",
            opacity: 0.8,
            whiteSpace: "nowrap"
          }}
        >
          AGB
        </a>
        <span style={{ opacity: 0.6 }}>|</span>
        <a
          href="/datenschutz"
          style={{
            color: COLORS.accent,
            textDecoration: "none",
            opacity: 0.8,
            whiteSpace: "nowrap"
          }}
        >
          Datenschutz
        </a>
        <span style={{ opacity: 0.6 }}>|</span>
        <a
          href="/kontakt"
          style={{
            color: COLORS.accent,
            textDecoration: "none",
            opacity: 0.8,
            whiteSpace: "nowrap"
          }}
        >
          Kontakt
        </a>
        <span style={{ opacity: 0.6 }}>|</span>
        <a
          href="/impressum"
          style={{
            color: COLORS.accent,
            textDecoration: "none",
            opacity: 0.8,
            whiteSpace: "nowrap"
          }}
        >
          Impressum
        </a>
        <span style={{ opacity: 0.6 }}>|</span>
        <a
          href="/widerrufsbelehrung"
          style={{
            color: COLORS.accent,
            textDecoration: "none",
            opacity: 0.8,
            whiteSpace: "nowrap"
          }}
        >
          Widerrufsbelehrung
        </a>
      </div>
      
      <div style={{ 
        opacity: 0.8,
        fontSize: "0.95rem",
        marginBottom: "8px"
      }}>
        hello@bookme.com
      </div>
      <div style={{ 
        fontSize: "0.9rem", 
        opacity: 0.7,
        letterSpacing: 0.5
      }}>
        © {new Date().getFullYear()} bookme. All rights reserved.
      </div>
    </footer>
  );
}