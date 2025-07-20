"use client";
import React, { useState, useEffect } from "react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { FirebaseError } from "firebase/app";

const COLORS = {
  primary: "#5C6F68",
  accent: "#E4DED5",
  text: "#1F1F1F",
  highlight: "#9DBE8D",
};

// Firebase configuration (use actual values, not process.env)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export default function AdminDashboard() {
  const [salonName, setSalonName] = useState("");
  const [salonLocation, setSalonLocation] = useState("");
  const [salonEmail, setSalonEmail] = useState("");
  const [salonPassword, setSalonPassword] = useState("");
  const [salons, setSalons] = useState([]);
  const [users, setUsers] = useState<{ email: string; role: string; uid: string }[]>([]);
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [salonSearch, setSalonSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;
    setCurrentEmail(email);
    setIsAllowed(email === "system@gmail.com");
    
    // Fetch salons and users data
    if (email === "system@gmail.com") {
      fetchSalonsAndUsers();
    }
  }, []);

  const fetchSalonsAndUsers = async () => {
    try {
      // Fetch salons
      const salonsRes = await fetch("/api/salons");
      if (salonsRes.ok) {
        const salonsData = await salonsRes.json();
        setSalons(salonsData.salons || []);
      } else {
        setSalons([]);
      }
      
      // Fetch users
      const usersRes = await fetch("/api/register");
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      } else {
        setUsers([]);
      }
    } catch (error) {
      setSalons([]);
      setUsers([]);
      console.error("Error fetching data:", error);
    }
  };

  const handleDeleteSalon = async (email: string) => {
    if (!confirm(`Salon mit E-Mail ${email} wirklich löschen?`)) return;
    setDeleteStatus(null);
    try {
      const res = await fetch("/api/salons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setDeleteStatus("Salon erfolgreich gelöscht.");
        fetchSalonsAndUsers();
      } else {
        const errMsg = await res.text();
        setDeleteStatus(`Fehler beim Löschen des Salons. ${errMsg}`);
      }
    } catch (error: any) {
      setDeleteStatus(`Fehler beim Löschen des Salons. ${error?.message || ""}`);
    }
  };

  const handleDeleteUser = async (uid: string, email: string) => {
    if (!confirm(`Benutzer ${email} wirklich löschen?`)) return;
    setDeleteStatus(null);
    try {
      const res = await fetch("/api/register", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
      if (res.ok) {
        setDeleteStatus("Benutzer erfolgreich gelöscht.");
        fetchSalonsAndUsers();
      } else {
        const errMsg = await res.text();
        setDeleteStatus(`Fehler beim Löschen des Benutzers. ${errMsg}`);
      }
    } catch (error: any) {
      setDeleteStatus(`Fehler beim Löschen des Benutzers. ${error?.message || ""}`);
    }
  };

  // Placeholder for creating a salon user in a new collection
  const handleCreateSalonUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateStatus(null);
    if (!salonEmail || !salonPassword) {
      setCreateStatus("Bitte E-Mail und Passwort eingeben.");
      return;
    }
    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, salonEmail, salonPassword);
      const user = userCredential.user;

      // 2. Store user in MongoDB via /api/register
      const userData = {
        uid: user.uid,
        email: user.email,
        role: "salon",
        createdAt: new Date().toISOString(),
      };
      const userRes = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      if (!userRes.ok) {
        if (userRes.status === 404) {
          throw new Error("API endpoint /api/register nicht gefunden.");
        }
        const errMsg = await userRes.text();
        throw new Error(errMsg || "Fehler beim Erstellen des Benutzers.");
      }

      // 3. Create salon in /api/salons
      const salonRes = await fetch("/api/salons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: salonEmail }),
      });
      if (!salonRes.ok) {
        if (salonRes.status === 404) {
          throw new Error("API endpoint /api/salons nicht gefunden.");
        }
        const errMsg = await salonRes.text();
        throw new Error(errMsg || "Fehler beim Erstellen des Salons.");
      }

      setCreateStatus("Salon-Benutzer erfolgreich erstellt.");
      setSalonEmail("");
      setSalonPassword("");
    } catch (err: any) {
      let msg = "Fehler beim Erstellen des Salon-Benutzers.";
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case "auth/email-already-in-use":
            msg = "Ein Benutzer mit dieser E-Mail existiert bereits.";
            break;
          case "auth/invalid-email":
            msg = "Ungültige E-Mail-Adresse.";
            break;
          case "auth/weak-password":
            msg = "Das Passwort ist zu schwach.";
            break;
          default:
            msg += ` (Firebase: ${err.message})`;
        }
      } else if (err?.message?.includes("Salon already exists")) {
        // Treat as success if salon already exists
        msg = "Salon-Benutzer erfolgreich erstellt.";
      } else if (err?.message) {
        msg += ` (${err.message})`;
      }
      setCreateStatus(msg);
    }
  };

  if (isAllowed === null) {
    // Loading state
    return (
      <main style={{ minHeight: "100vh", background: COLORS.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: COLORS.primary, fontSize: "1.2rem", textAlign: "center" }}>
          Lade...<br />
          <span style={{ fontSize: "0.95rem", color: COLORS.text, opacity: 0.7 }}>
            Aktuelle E-Mail: {currentEmail ?? "(nicht gesetzt)"}
          </span>
        </div>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main style={{ minHeight: "100vh", background: COLORS.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          background: "#fff",
          borderRadius: 14,
          boxShadow: `0 4px 16px ${COLORS.primary}15`,
          padding: "2.5rem 2rem",
          color: "#d32f2f",
          fontWeight: 600,
          fontSize: "1.2rem",
          textAlign: "center"
        }}>
          Zugriff verweigert. Nur System-Admin erlaubt.<br />
          <span style={{ fontSize: "0.95rem", color: COLORS.text, opacity: 0.7 }}>
            Aktuelle E-Mail: {currentEmail ?? "(nicht gesetzt)"}
          </span>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: COLORS.accent,
        fontFamily: "'Roboto', sans-serif",
        padding: "2rem 0",
        color: "#000",
      }}
    >
      <div
        style={{
          maxWidth: 700,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 14,
          boxShadow: `0 4px 16px ${COLORS.primary}15`,
          padding: "2.5rem 2rem",
          color: "#000",
        }}
      >
        <h1
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: "2rem",
            color: "#000",
            textAlign: "center",
            marginBottom: 24,
            letterSpacing: -1,
          }}
        >
          Admin Dashboard
        </h1>
        <h2
          style={{
            fontWeight: 600,
            fontSize: "1.2rem",
            color: "#000",
            marginBottom: 16,
            marginTop: 32,
          }}
        >
          Neuen Salon-Account anlegen
        </h2>
        <form
          onSubmit={handleCreateSalonUser}
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 18,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            type="email"
            placeholder="Salon E-Mail"
            value={salonEmail}
            onChange={(e) => setSalonEmail(e.target.value)}
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              borderRadius: 8,
              border: `1px solid ${COLORS.primary}30`,
              fontSize: "1rem",
              background: "#fafafa",
              color: "#000",
            }}
            required
          />
          <input
            type="password"
            placeholder="Passwort"
            value={salonPassword}
            onChange={(e) => setSalonPassword(e.target.value)}
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              borderRadius: 8,
              border: `1px solid ${COLORS.primary}30`,
              fontSize: "1rem",
              background: "#fafafa",
              color: "#000",
            }}
            required
          />
          <button
            type="submit"
            style={{
              background: COLORS.highlight,
              color: "#000",
              border: "none",
              borderRadius: 8,
              padding: "0.75rem 1.5rem",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            Salon-Account erstellen
          </button>
        </form>
        {createStatus && (
          <div
            style={{
              color: createStatus.startsWith("Fehler") ? "#d32f2f" : "#000",
              background: "#f5f5f5",
              borderRadius: 8,
              padding: "0.6rem 1rem",
              marginBottom: 18,
              fontSize: "0.98rem",
            }}
          >
            {createStatus}
          </div>
        )}
        {deleteStatus && (
          <div
            style={{
              color: deleteStatus.startsWith("Fehler") ? "#d32f2f" : "#000",
              background: "#f5f5f5",
              borderRadius: 8,
              padding: "0.6rem 1rem",
              marginBottom: 18,
              fontSize: "0.98rem",
            }}
          >
            {deleteStatus}
          </div>
        )}
        <h2
          style={{
            fontWeight: 600,
            fontSize: "1.2rem",
            color: "#000",
            marginBottom: 16,
            marginTop: 32,
          }}
        >
          Salons löschen
        </h2>
        <input
          type="text"
          placeholder="Suche Salon nach Name oder E-Mail..."
          value={salonSearch}
          onChange={e => setSalonSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "0.6rem 1rem",
            borderRadius: 8,
            border: `1px solid ${COLORS.primary}30`,
            fontSize: "1rem",
            marginBottom: 12,
            color: "#000",
            background: "#fafafa",
          }}
        />
        <div>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {salonSearch.trim() === ""
              ? (
                <li style={{ color: "#000", opacity: 0.7, padding: "1rem 0" }}>
                  Bitte Suchbegriff eingeben.
                </li>
              )
              : salons
                  .filter((salon: any) =>
                    (salon.name && salon.name.toLowerCase().includes(salonSearch.toLowerCase())) ||
                    (salon.email && salon.email.toLowerCase().includes(salonSearch.toLowerCase()))
                  )
                  .map((salon: any, idx) => (
                    <li
                      key={salon._id || idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.75rem 0",
                        borderBottom: `1px solid ${COLORS.primary}10`,
                        color: "#000",
                      }}
                    >
                      <span>
                        <b>{salon.name || "Unbekannt"}</b> – {salon.email || "Keine E-Mail"}
                      </span>
                      <button
                        onClick={() => handleDeleteSalon(salon.email)}
                        style={{
                          background: "#d32f2f",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          padding: "0.4rem 1rem",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Löschen
                      </button>
                    </li>
                  ))
            }
            {salonSearch.trim() !== "" &&
              salons.filter((salon: any) =>
                (salon.name && salon.name.toLowerCase().includes(salonSearch.toLowerCase())) ||
                (salon.email && salon.email.toLowerCase().includes(salonSearch.toLowerCase()))
              ).length === 0 && (
                <li style={{ color: "#000", opacity: 0.7, padding: "1rem 0" }}>
                  Kein Salon gefunden.
                </li>
              )}
          </ul>
        </div>

        <h2
          style={{
            fontWeight: 600,
            fontSize: "1.2rem",
            color: "#000",
            marginBottom: 16,
            marginTop: 32,
          }}
        >
          Benutzer löschen
        </h2>
        <input
          type="text"
          placeholder="Suche Benutzer nach E-Mail..."
          value={userSearch}
          onChange={e => setUserSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "0.6rem 1rem",
            borderRadius: 8,
            border: `1px solid ${COLORS.primary}30`,
            fontSize: "1rem",
            marginBottom: 12,
            color: "#000",
            background: "#fafafa",
          }}
        />
        <div>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {userSearch.trim() === ""
              ? (
                <li style={{ color: "#000", opacity: 0.7, padding: "1rem 0" }}>
                  Bitte Suchbegriff eingeben.
                </li>
              )
              : users
                  .filter(user =>
                    user.email && user.email.toLowerCase().includes(userSearch.toLowerCase())
                  )
                  .map((user, idx) => (
                    <li
                      key={user.uid || idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.75rem 0",
                        borderBottom: `1px solid ${COLORS.primary}10`,
                        color: "#000",
                      }}
                    >
                      <span>
                        <b>{user.email}</b> – {user.role}
                      </span>
                      <button
                        onClick={() => handleDeleteUser(user.uid, user.email)}
                        style={{
                          background: "#d32f2f",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          padding: "0.4rem 1rem",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Löschen
                      </button>
                    </li>
                  ))
            }
            {userSearch.trim() !== "" &&
              users.filter(user =>
                user.email && user.email.toLowerCase().includes(userSearch.toLowerCase())
              ).length === 0 && (
                <li style={{ color: "#000", opacity: 0.7, padding: "1rem 0" }}>
                  Kein Benutzer gefunden.
                </li>
              )}
          </ul>
        </div>
      </div>
    </main>
  );
}
