"use client";
import React, { useState } from "react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { FirebaseError } from "firebase/app";

// Firebase configuration (use actual values, not process.env)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const COLORS = {
  primary: "#5C6F68",
  accent: "#E4DED5",
  text: "#1F1F1F",
  highlight: "#9DBE8D",
};

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(""); // Add name state

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validate inputs
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    try {
      setLoading(true);
      
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Prepare user data for MongoDB
      const userData = {
        uid: user.uid,
        email: user.email,
        name: name.trim(), // Add name to user data
        createdAt: new Date().toISOString(),
      };

      // Store user in MongoDB
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error('Failed to store user data');
      }

      // Save user state to localStorage (auto-login)
      localStorage.setItem("bookme_user", JSON.stringify(user));

      // Redirect or show success message
      window.location.href = '/'; // Or use Next.js router

    } catch (err) {
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case 'auth/email-already-in-use':
            setError('Email already in use');
            break;
          case 'auth/invalid-email':
            setError('Invalid email address');
            break;
          case 'auth/weak-password':
            setError('Password is too weak');
            break;
          default:
            setError('Registration failed. Please try again.');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: COLORS.accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Roboto', sans-serif",
      }}
    >
      <form
        style={{
          background: "#fff",
          padding: "2.5rem 2rem",
          borderRadius: 14,
          boxShadow: `0 4px 16px ${COLORS.primary}15`,
          minWidth: 420,
          maxWidth: 490,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
        onSubmit={handleSubmit}
      >
        <div
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: "2rem",
            color: COLORS.primary,
            textAlign: "center",
            marginBottom: 8,
            letterSpacing: -1,
          }}
        >
          bookme
        </div>
        <div
          style={{
            fontWeight: 500,
            fontSize: "1.1rem",
            color: COLORS.text,
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          Registrieren
        </div>
        
        {error && (
          <div style={{
            color: "#d32f2f",
            backgroundColor: "#fdecea",
            padding: "12px 16px",
            borderRadius: 8,
            fontSize: "0.9rem",
          }}>
            {error}
          </div>
        )}
        
        <label style={{ color: COLORS.text, fontWeight: 500, fontSize: "1rem" }}>
          Name
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ihr Name"
            style={{
              marginTop: 6,
              width: "100%",
              padding: "0.75rem 1rem",
              borderRadius: 8,
              border: `1px solid ${COLORS.primary}30`,
              fontSize: "1rem",
              marginBottom: 8,
              background: "#fafafa",
            }}
            required
          />
        </label>
        <label style={{ color: COLORS.text, fontWeight: 500, fontSize: "1rem" }}>
          E-Mail
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Ihre E-Mail"
            style={{
              marginTop: 6,
              width: "100%",
              padding: "0.75rem 1rem",
              borderRadius: 8,
              border: `1px solid ${COLORS.primary}30`,
              fontSize: "1rem",
              marginBottom: 8,
              background: "#fafafa",
            }}
            required
          />
        </label>
        <label style={{ color: COLORS.text, fontWeight: 500, fontSize: "1rem" }}>
          Passwort
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Ihr Passwort"
            style={{
              marginTop: 6,
              width: "100%",
              padding: "0.75rem 1rem",
              borderRadius: 8,
              border: `1px solid ${COLORS.primary}30`,
              fontSize: "1rem",
              marginBottom: 8,
              background: "#fafafa",
            }}
            required
            minLength={6}
          />
        </label>
        <label style={{ color: COLORS.text, fontWeight: 500, fontSize: "1rem" }}>
          Passwort bestätigen
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Passwort wiederholen"
            style={{
              marginTop: 6,
              width: "100%",
              padding: "0.75rem 1rem",
              borderRadius: 8,
              border: `1px solid ${COLORS.primary}30`,
              fontSize: "1rem",
              marginBottom: 8,
              background: "#fafafa",
            }}
            required
            minLength={6}
          />
        </label>
        <button
          type="submit"
          style={{
            background: COLORS.primary,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "0.75rem 0",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: "pointer",
            marginTop: 8,
            transition: "background 0.2s",
            opacity: loading ? 0.7 : 1,
            pointerEvents: loading ? "none" : "auto",
          }}
          disabled={loading}
        >
          {loading ? "Verarbeitung..." : "Registrieren"}
        </button>
        <div style={{ textAlign: "center", marginTop: 8, fontSize: "0.98rem", color: COLORS.text }}>
          Bereits ein Konto?{" "}
          <a
            href="/login"
            style={{
              color: COLORS.primary,
              textDecoration: "underline",
              fontWeight: 500,
            }}
          >
            Zum Login
          </a>
        </div>
      </form>
    </main>
  );
}