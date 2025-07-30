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
  const [showSalonList, setShowSalonList] = useState(false);
  const [allSalons, setAllSalons] = useState<any[]>([]);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [bookingFilter, setBookingFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [userBookingStats, setUserBookingStats] = useState<{[uid: string]: {completed: number, cancelled: number, noShow: number, total: number, rating: number}}>({});
  const [showUserHistoryModal, setShowUserHistoryModal] = useState(false);
  const [historyUser, setHistoryUser] = useState<{ email: string; uid: string } | null>(null);
  
  // New plan management state
  const [plans, setPlans] = useState<any[]>([]);
  const [showPlanManagement, setShowPlanManagement] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',
    price: '',
    description: '',
    features: [''],
    order: 1
  });

  useEffect(() => {
    const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;
    setCurrentEmail(email);
    setIsAllowed(email === "system@gmail.com");
    
    // Fetch salons and users data
    if (email === "system@gmail.com") {
      fetchSalonsAndUsers();
      fetchPlans();
    }
  }, []);

  const fetchSalonsAndUsers = async () => {
    try {
      // Fetch salons
      const salonsRes = await fetch("/api/salons");
      if (salonsRes.ok) {
        const salonsData = await salonsRes.json();
        setSalons(salonsData.salons || []);
        setAllSalons(salonsData.salons || []);
      } else {
        setSalons([]);
        setAllSalons([]);
      }
      
      // Fetch users
      const usersRes = await fetch("/api/register");
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
        
        // Fetch booking stats for customer rating
        if (usersData.users && usersData.users.length > 0) {
          await fetchUserBookingStats(usersData.users);
        }
      } else {
        setUsers([]);
      }
    } catch (error) {
      setSalons([]);
      setAllSalons([]);
      setUsers([]);
      console.error("Error fetching data:", error);
    }
  };

  const fetchUserBookingStats = async (usersList: any[]) => {
    try {
      const stats: {[uid: string]: {completed: number, cancelled: number, noShow: number, total: number, rating: number}} = {};
      
      // Fetch all bookings to analyze user behavior
      const bookingsRes = await fetch("/api/bookings?systemAdmin=true");
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        const allBookings = bookingsData.bookings || [];
        
        // Calculate stats for each user
        usersList.forEach(user => {
          // Only consider completed, cancelled, and no-show for stats
          const userBookings = allBookings.filter((b: any) =>
            b.customerUid === user.uid &&
            (b.status === 'completed' || b.status === 'cancelled' || b.status === 'no-show')
          );
          
          const completed = userBookings.filter((b: any) => b.status === 'completed').length;
          const cancelled = userBookings.filter((b: any) => b.status === 'cancelled').length;
          const noShow = userBookings.filter((b: any) => b.status === 'no-show').length;
          const total = userBookings.length;
          
          // New rating system: completed = 5 stars, cancelled/no-show = 1 star, average
          let rating = 5;
          if (total > 0) {
            let totalStars = 0;
            userBookings.forEach((b: any) => {
              if (b.status === 'completed') totalStars += 5;
              else if (b.status === 'cancelled' || b.status === 'no-show') totalStars += 1;
            });
            rating = Math.round(totalStars / total);
            rating = Math.max(1, Math.min(5, rating));
          }
          
          stats[user.uid] = {
            completed,
            cancelled,
            noShow,
            total,
            rating
          };
        });
        
        setUserBookingStats(stats);
      }
    } catch (error) {
      console.error("Error fetching user booking stats:", error);
    }
  };

  const getRatingStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return '#22c55e'; // Green
    if (rating >= 3) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const getRatingLabel = (rating: number) => {
    return `${rating}/5 Sterne`;
  };

  const fetchAllBookings = async () => {
    try {
      const bookingsRes = await fetch("/api/bookings?systemAdmin=true");
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setAllBookings(bookingsData.bookings || []);
      } else {
        setAllBookings([]);
      }
    } catch (error) {
      setAllBookings([]);
      console.error("Error fetching bookings:", error);
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

      // 3. Create salon in /api/salons with default founders plan
      const salonRes = await fetch("/api/salons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: salonEmail,
          plan: "founders" // Default plan for new salons
        }),
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

  const handleBookingStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/bookings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          status: newStatus
        })
      });
      
      if (res.ok) {
        setDeleteStatus(`Buchungsstatus zu "${newStatus}" geändert.`);
        fetchAllBookings(); // Refresh bookings list
      } else {
        setDeleteStatus("Fehler beim Ändern des Buchungsstatus.");
      }
    } catch (error) {
      setDeleteStatus("Fehler beim Ändern des Buchungsstatus.");
    }
  };

  const filteredBookings = allBookings.filter(booking => {
    const matchesFilter = !bookingFilter || 
      booking.customerName?.toLowerCase().includes(bookingFilter.toLowerCase()) ||
      booking.customerPhone?.includes(bookingFilter) ||
      booking.salonInfo?.name?.toLowerCase().includes(bookingFilter.toLowerCase()) ||
      booking.salonInfo?.email?.toLowerCase().includes(bookingFilter.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    
    return matchesFilter && matchesStatus;
  });

  // Helper to get bookings for a user (by UID, or legacy by email as name)
  const getUserBookings = (user: { uid: string; email: string }) => {
    // Match by customerUid (main), customerEmail, and also by customerName == user.email (legacy)
    return allBookings.filter((b: any) => {
      // Primary match: by UID
      if (b.customerUid === user.uid) return true;
      
      // Secondary match: by email stored in customerEmail field
      if (b.customerEmail && b.customerEmail.toLowerCase() === user.email?.toLowerCase()) return true;
      
      // Legacy match: by customerName being the email
      if (b.customerName && b.customerName.toLowerCase() === user.email?.toLowerCase()) return true;
      
      // Additional match: check if customerInfo object exists with email
      if (b.customerInfo && b.customerInfo.email && b.customerInfo.email.toLowerCase() === user.email?.toLowerCase()) return true;
      
      return false;
    });
  };

  // Add missing handlePlanChange function
  const handlePlanChange = async (email: string, newPlan: string) => {
    try {
      const res = await fetch("/api/salons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          plan: newPlan,
        }),
      });
      
      if (res.ok) {
        setDeleteStatus(`Plan zu "${newPlan}" geändert.`);
        fetchSalonsAndUsers(); // Refresh the salon list
      } else {
        const errorData = await res.json();
        setDeleteStatus(`Fehler beim Ändern des Plans. ${errorData.error || 'Unbekannter Fehler'}`);
      }
    } catch (error: any) {
      setDeleteStatus(`Fehler beim Ändern des Plans. ${error?.message || ""}`);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      } else {
        setPlans([]);
      }
    } catch (error) {
      setPlans([]);
      console.error("Error fetching plans:", error);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.name || !newPlan.price) {
      setDeleteStatus("Name und Preis sind erforderlich.");
      return;
    }

    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newPlan,
          features: newPlan.features.filter(f => f.trim() !== '')
        }),
      });

      if (res.ok) {
        setDeleteStatus("Plan erfolgreich erstellt.");
        setNewPlan({ name: '', price: '', description: '', features: [''], order: 1 });
        setShowPlanModal(false);
        fetchPlans();
      } else {
        const error = await res.json();
        setDeleteStatus(`Fehler beim Erstellen des Plans: ${error.error}`);
      }
    } catch (error: any) {
      setDeleteStatus(`Fehler beim Erstellen des Plans: ${error.message}`);
    }
  };

  const handleUpdatePlan = async (plan: any) => {
    try {
      const res = await fetch("/api/plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });

      if (res.ok) {
        setDeleteStatus("Plan erfolgreich aktualisiert.");
        setEditingPlan(null);
        fetchPlans();
      } else {
        const error = await res.json();
        setDeleteStatus(`Fehler beim Aktualisieren des Plans: ${error.error}`);
      }
    } catch (error: any) {
      setDeleteStatus(`Fehler beim Aktualisieren des Plans: ${error.message}`);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Plan wirklich löschen?")) return;

    try {
      const res = await fetch("/api/plans", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: planId }),
      });

      if (res.ok) {
        setDeleteStatus("Plan erfolgreich gelöscht.");
        fetchPlans();
      } else {
        const error = await res.json();
        setDeleteStatus(`Fehler beim Löschen des Plans: ${error.error}`);
      }
    } catch (error: any) {
      setDeleteStatus(`Fehler beim Löschen des Plans: ${error.message}`);
    }
  };

  const addFeature = () => {
    setNewPlan(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };

  const updateFeature = (index: number, value: string) => {
    setNewPlan(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? value : f)
    }));
  };

  const removeFeature = (index: number) => {
    setNewPlan(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  // --- New: Stat cards for dashboard look ---
  const statCards = [
    {
      id: "salons",
      title: "Salons",
      value: salons.length,
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-2a4 4 0 014-4h10a4 4 0 014 4v2M16 3.13a4 4 0 010 7.75M8 3.13a4 4 0 000 7.75" />
        </svg>
      ),
    },
    {
      id: "users",
      title: "Benutzer",
      value: users.filter(u => !u.role).length,
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M16 7a4 4 0 11-8 0 4 4 0 018 0zm6 13v-2a4 4 0 00-3-3.87M6 7a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
      ),
    },
    {
      id: "bookings",
      title: "Buchungen",
      value: allBookings.length,
      icon: (
        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: "plans",
      title: "Pläne",
      value: plans.length,
      icon: (
        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F3F4F6", // match dashboard bg
        fontFamily: "'Roboto', sans-serif",
        padding: "2rem 0",
        color: "#000",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 4px 24px #5C6F6815",
          padding: "2.5rem 2rem",
          color: "#000",
        }}
      >
        {/* --- Header --- */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: "2.2rem",
              color: "#222",
              marginBottom: 6,
              letterSpacing: -1,
            }}
          >
            Willkommen, System-Admin
          </h1>
          <p style={{ color: "#666", fontSize: "1.05rem" }}>
            Übersicht & Verwaltung aller Salons, Benutzer, Buchungen und Pläne
          </p>
        </div>

        {/* --- Stat Cards --- */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 24,
            marginBottom: 36,
          }}
        >
          {statCards.map(card => (
            <div
              key={card.id}
              style={{
                background: "#f9fafb",
                borderRadius: 12,
                padding: "1.5rem 1.2rem",
                boxShadow: "0 1px 4px #5C6F6810",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div style={{
                background: "#fff",
                borderRadius: "50%",
                width: 44,
                height: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 1px 4px #5C6F6810",
              }}>
                {card.icon}
              </div>
              <div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#222" }}>{card.value}</div>
                <div style={{ fontSize: "1rem", color: "#666", fontWeight: 500 }}>{card.title}</div>
              </div>
            </div>
          ))}
        </div>

        {/* --- Section: Plan Management --- */}
        <h2
          style={{
            fontWeight: 600,
            fontSize: "1.2rem",
            color: "#222",
            marginBottom: 16,
            marginTop: 24,
            letterSpacing: -0.5,
          }}
        >
          Plan-Verwaltung
        </h2>
        <div style={{ display: "flex", gap: "12px", marginBottom: 16, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setShowPlanManagement(!showPlanManagement);
              if (!showPlanManagement) fetchPlans();
            }}
            style={{
              background: COLORS.primary,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "0.75rem 1.5rem",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: "pointer",
              transition: "background 0.2s",
              boxShadow: "0 1px 4px #5C6F6810",
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "#4a5a54"}
            onMouseOut={(e) => e.currentTarget.style.background = COLORS.primary}
          >
            {showPlanManagement ? "Plan-Verwaltung verstecken" : "Pläne verwalten"}
          </button>
          {showPlanManagement && (
            <button
              onClick={() => setShowPlanModal(true)}
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
                boxShadow: "0 1px 4px #5C6F6810",
              }}
            >
              Neuen Plan erstellen
            </button>
          )}
        </div>

        {showPlanManagement && (
          <div style={{
            background: "#f8f9fa",
            borderRadius: 8,
            padding: "1rem",
            marginBottom: 24,
            border: `1px solid ${COLORS.primary}20`,
          }}>
            <h3 style={{
              fontWeight: 600,
              fontSize: "1.1rem",
              color: "#000",
              marginBottom: 16,
            }}>
              Verfügbare Pläne ({plans.length})
            </h3>
            {plans.length === 0 ? (
              <p style={{ color: "#666", fontStyle: "italic" }}>Keine Pläne gefunden.</p>
            ) : (
              <div style={{ display: "grid", gap: "16px" }}>
                {plans.map((plan, idx) => (
                  <div
                    key={plan._id || idx}
                    style={{
                      background: "#fff",
                      borderRadius: 8,
                      padding: "1.5rem",
                      border: `1px solid ${COLORS.primary}15`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: "16px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: "300px" }}>
                      {editingPlan?._id === plan._id ? (
                        <div style={{ display: "grid", gap: "12px" }}>
                          <input
                            type="text"
                            value={editingPlan.name}
                            onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})}
                            style={{
                              padding: "8px 12px",
                              borderRadius: 6,
                              border: "1px solid #ccc",
                              fontSize: "1rem",
                              fontWeight: 600,
                            }}
                          />
                          <input
                            type="number"
                            value={editingPlan.price}
                            onChange={(e) => setEditingPlan({...editingPlan, price: e.target.value})}
                            style={{
                              padding: "8px 12px",
                              borderRadius: 6,
                              border: "1px solid #ccc",
                              fontSize: "1rem",
                            }}
                          />
                          <textarea
                            value={editingPlan.description}
                            onChange={(e) => setEditingPlan({...editingPlan, description: e.target.value})}
                            style={{
                              padding: "8px 12px",
                              borderRadius: 6,
                              border: "1px solid #ccc",
                              fontSize: "0.9rem",
                              minHeight: "60px",
                              resize: "vertical",
                            }}
                          />
                          <div>
                            <label style={{ fontSize: "0.9rem", fontWeight: 500, marginBottom: 4, display: "block" }}>
                              Features:
                            </label>
                            {editingPlan.features.map((feature: string, featureIdx: number) => (
                              <div key={featureIdx} style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
                                <input
                                  type="text"
                                  value={feature}
                                  onChange={(e) => {
                                    const newFeatures = [...editingPlan.features];
                                    newFeatures[featureIdx] = e.target.value;
                                    setEditingPlan({...editingPlan, features: newFeatures});
                                  }}
                                  style={{
                                    flex: 1,
                                    padding: "4px 8px",
                                    borderRadius: 4,
                                    border: "1px solid #ccc",
                                    fontSize: "0.85rem",
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    const newFeatures = editingPlan.features.filter((_: any, i: number) => i !== featureIdx);
                                    setEditingPlan({...editingPlan, features: newFeatures});
                                  }}
                                  style={{
                                    background: "#ef4444",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 4,
                                    padding: "4px 8px",
                                    fontSize: "0.75rem",
                                    cursor: "pointer",
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => setEditingPlan({...editingPlan, features: [...editingPlan.features, '']})}
                              style={{
                                background: COLORS.highlight,
                                color: "#000",
                                border: "none",
                                borderRadius: 4,
                                padding: "4px 8px",
                                fontSize: "0.75rem",
                                cursor: "pointer",
                                marginTop: "4px",
                              }}
                            >
                              + Feature hinzufügen
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h4 style={{
                            fontWeight: 700,
                            color: "#000",
                            marginBottom: 8,
                            fontSize: "1.2rem",
                          }}>
                            {plan.name}
                          </h4>
                          <div style={{
                            fontSize: "1.5rem",
                            fontWeight: 700,
                            color: COLORS.primary,
                            marginBottom: 8,
                          }}>
                            €{plan.price}/Monat
                          </div>
                          <p style={{
                            color: "#666",
                            fontSize: "0.95rem",
                            marginBottom: 12,
                            lineHeight: 1.4,
                          }}>
                            {plan.description}
                          </p>
                          <div>
                            <strong style={{ fontSize: "0.9rem", color: "#333" }}>Features:</strong>
                            <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                              {plan.features?.map((feature: string, featureIdx: number) => (
                                <li key={featureIdx} style={{ fontSize: "0.85rem", color: "#666", marginBottom: 2 }}>
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {editingPlan?._id === plan._id ? (
                        <>
                          <button
                            onClick={() => handleUpdatePlan(editingPlan)}
                            style={{
                              background: "#22c55e",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              padding: "0.5rem 1rem",
                              fontWeight: 500,
                              fontSize: "0.9rem",
                              cursor: "pointer",
                            }}
                          >
                            ✓ Speichern
                          </button>
                          <button
                            onClick={() => setEditingPlan(null)}
                            style={{
                              background: "#94a3b8",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              padding: "0.5rem 1rem",
                              fontWeight: 500,
                              fontSize: "0.9rem",
                              cursor: "pointer",
                            }}
                          >
                            Abbrechen
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingPlan(plan)}
                            style={{
                              background: COLORS.highlight,
                              color: "#000",
                              border: "none",
                              borderRadius: 6,
                              padding: "0.5rem 1rem",
                              fontWeight: 500,
                              fontSize: "0.9rem",
                              cursor: "pointer",
                            }}
                          >
                            ✏️ Bearbeiten
                          </button>
                          <button
                            onClick={() => handleDeletePlan(plan._id)}
                            style={{
                              background: "#ef4444",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              padding: "0.5rem 1rem",
                              fontWeight: 500,
                              fontSize: "0.9rem",
                              cursor: "pointer",
                            }}
                          >
                            🗑️ Löschen
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Plan Modal */}
        {showPlanModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}>
            <div style={{
              background: "#fff",
              borderRadius: 12,
              padding: "24px",
              maxWidth: "500px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#000", margin: 0 }}>
                  Neuen Plan erstellen
                </h3>
                <button
                  onClick={() => setShowPlanModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "1.5rem",
                    cursor: "pointer",
                    color: "#666",
                  }}
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleCreatePlan} style={{ display: "grid", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "0.9rem", fontWeight: 500, marginBottom: 4, display: "block" }}>
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #ccc",
                      fontSize: "1rem",
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ fontSize: "0.9rem", fontWeight: 500, marginBottom: 4, display: "block" }}>
                    Preis (€/Monat) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPlan.price}
                    onChange={(e) => setNewPlan({...newPlan, price: e.target.value})}
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #ccc",
                      fontSize: "1rem",
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ fontSize: "0.9rem", fontWeight: 500, marginBottom: 4, display: "block" }}>
                    Beschreibung
                  </label>
                  <textarea
                    value={newPlan.description}
                    onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #ccc",
                      fontSize: "0.9rem",
                      minHeight: "80px",
                      resize: "vertical",
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ fontSize: "0.9rem", fontWeight: 500, marginBottom: 4, display: "block" }}>
                    Features
                  </label>
                  {newPlan.features.map((feature, idx) => (
                    <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => updateFeature(idx, e.target.value)}
                        placeholder="Feature beschreiben..."
                        style={{
                          flex: 1,
                          padding: "6px 10px",
                          borderRadius: 4,
                          border: "1px solid #ccc",
                          fontSize: "0.85rem",
                        }}
                      />
                      {newPlan.features.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFeature(idx)}
                          style={{
                            background: "#ef4444",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            padding: "6px 10px",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addFeature}
                    style={{
                      background: COLORS.highlight,
                      color: "#000",
                      border: "none",
                      borderRadius: 4,
                      padding: "6px 12px",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      marginTop: "4px",
                    }}
                  >
                    + Feature hinzufügen
                  </button>
                </div>
                
                <div>
                  <label style={{ fontSize: "0.9rem", fontWeight: 500, marginBottom: 4, display: "block" }}>
                    Reihenfolge
                  </label>
                  <input
                    type="number"
                    value={newPlan.order}
                    onChange={(e) => setNewPlan({...newPlan, order: parseInt(e.target.value) || 1})}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #ccc",
                      fontSize: "1rem",
                    }}
                  />
                </div>
                
                <div style={{
                  display: "flex",
                  gap: "12px",
                  marginTop: 20,
                  paddingTop: 20,
                  borderTop: "1px solid #e5e7eb",
                }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      background: COLORS.primary,
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "12px",
                      fontSize: "1rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Plan erstellen
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPlanModal(false)}
                    style={{
                      flex: 1,
                      background: "#94a3b8",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "12px",
                      fontSize: "1rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Abbrechen
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- Section: Create Salon --- */}
        <h2
          style={{
            fontWeight: 600,
            fontSize: "1.2rem",
            color: "#222",
            marginBottom: 16,
            marginTop: 24,
            letterSpacing: -0.5,
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
              border: "1px solid #CBD5E1",
              fontSize: "1rem",
              background: "#f8fafc",
              color: "#000",
              minWidth: 180,
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
              border: "1px solid #CBD5E1",
              fontSize: "1rem",
              background: "#f8fafc",
              color: "#000",
              minWidth: 180,
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
              boxShadow: "0 1px 4px #5C6F6810",
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

        {/* --- Section: Salon Management --- */}
        <h2
          style={{
            fontWeight: 600,
            fontSize: "1.2rem",
            color: "#222",
            marginBottom: 16,
            marginTop: 32,
            letterSpacing: -0.5,
          }}
        >
          Salon-Verwaltung
        </h2>
        <button
          onClick={() => setShowSalonList(!showSalonList)}
          style={{
            background: COLORS.primary,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "0.75rem 1.5rem",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: "pointer",
            marginBottom: 16,
            transition: "background 0.2s",
            boxShadow: "0 1px 4px #5C6F6810",
          }}
          onMouseOver={(e) => e.currentTarget.style.background = "#4a5a54"}
          onMouseOut={(e) => e.currentTarget.style.background = COLORS.primary}
        >
          {showSalonList ? "Salon-Liste verstecken" : "Alle Salons anzeigen"}
        </button>

        {showSalonList && (
          <div style={{
            background: "#f8f9fa",
            borderRadius: 8,
            padding: "1rem",
            marginBottom: 24,
            border: `1px solid ${COLORS.primary}20`,
          }}>
            <h3 style={{
              fontWeight: 600,
              fontSize: "1.1rem",
              color: "#000",
              marginBottom: 16,
            }}>
              Registrierte Salons ({allSalons.length})
            </h3>
            {/* Salon search input */}
            <div style={{ display: "flex", gap: "8px", marginBottom: 16, flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Suche nach Name oder E-Mail..."
                value={salonSearch}
                onChange={e => {
                  setSalonSearch(e.target.value);
                  const val = e.target.value;
                  if (!val) {
                    setAllSalons(salons);
                  } else {
                    setAllSalons(
                      salons.filter(
                        (s: any) =>
                          (s.name && s.name.toLowerCase().includes(val.toLowerCase())) ||
                          (s.email && s.email.toLowerCase().includes(val.toLowerCase()))
                      )
                    );
                  }
                }}
                style={{
                  flex: 1,
                  padding: "0.5rem 1rem",
                  borderRadius: 6,
                  border: `1px solid ${COLORS.primary}30`,
                  fontSize: "0.9rem",
                  color: "#000",
                  background: "#fff",
                  minWidth: "180px",
                }}
              />
            </div>
            {allSalons.length === 0 ? (
              <p style={{ color: "#666", fontStyle: "italic" }}>Keine Salons gefunden.</p>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {allSalons.map((salon, idx) => (
                  <div
                    key={salon._id || idx}
                    style={{
                      background: "#fff",
                      borderRadius: 8,
                      padding: "1rem",
                      border: `1px solid ${COLORS.primary}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <h4 style={{
                        fontWeight: 600,
                        color: "#000",
                        marginBottom: 4,
                        fontSize: "1rem",
                      }}>
                        {salon.name || "Unbekannter Salon"}
                      </h4>
                      <p style={{
                        color: "#666",
                        fontSize: "0.9rem",
                        marginBottom: 2,
                      }}>
                        📧 {salon.email || "Keine E-Mail"}
                      </p>
                      <p style={{
                        color: "#666",
                        fontSize: "0.9rem",
                        marginBottom: 2,
                      }}>
                        📍 {salon.location || "Kein Standort"}
                      </p>
                      <p style={{
                        color: "#666",
                        fontSize: "0.9rem",
                      }}>
                        📞 {salon.contact || "Kein Kontakt"}
                      </p>
                      {/* Plan Management */}
                      <div style={{ marginTop: 12 }}>
                        <label style={{ fontSize: "0.92rem", color: "#333", fontWeight: 500, display: "block", marginBottom: 4 }}>
                          Aktueller Plan:
                        </label>
                        <select
                          value={salon.plan || "founders"}
                          onChange={async (e) => {
                            const newPlan = e.target.value;
                            setDeleteStatus("Plan wird geändert...");
                            await handlePlanChange(salon.email, newPlan);
                          }}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 4,
                            border: "1px solid #ccc",
                            fontSize: "0.85rem",
                            color: "#000",
                            background: "#fff",
                          }}
                        >
                          <option value="founders">Founders Plan - €0/Monat</option>
                          <option value="startup">Startup Plan - €29/Monat</option>
                          <option value="grow">Grow Plan - €59/Monat</option>
                          <option value="unicorn">Unicorn Plan - €99/Monat</option>
                          <option value="custom">Custom Plan - Individuell</option>
                        </select>
                        <div style={{ fontSize: "0.8rem", color: "#666", marginTop: 2 }}>
                          {(() => {
                            const planDescriptions: Record<"founders" | "startup" | "grow" | "unicorn" | "custom", string> = {
                              founders: "Alle Features inklusive - Kostenlos für neue Kunden",
                              startup: "Basis Features - Keine Analytics/Kalender",
                              grow: "Mit Kalender für wachsende Salons",
                              unicorn: "Premium Features mit vollständiger Analytics",
                              custom: "Individueller Plan nach Absprache"
                            };
                            const planKey = (salon.plan || "founders") as "founders" | "startup" | "grow" | "unicorn" | "custom";
                            return planDescriptions[planKey] || "Plan nicht gefunden";
                          })()}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        onClick={() => window.open(`/admin/analytics?salonUid=${encodeURIComponent(salon.uid || '')}`, '_blank')}
                        style={{
                          background: COLORS.highlight,
                          color: "#000",
                          border: "none",
                          borderRadius: 6,
                          padding: "0.5rem 1rem",
                          fontWeight: 500,
                          fontSize: "0.9rem",
                          cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = "#8aa97a"}
                        onMouseOut={(e) => e.currentTarget.style.background = COLORS.highlight}
                        disabled={!salon.uid}
                        title={!salon.uid ? "Keine Analytics verfügbar (UID fehlt)" : "Salon Inhaberseite öffnen"}
                      >
                        🏢 Salon Inhaberseite
                      </button>
                      <button
                        onClick={() => window.open(`/salon/${salon.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")}`, '_blank')}
                        style={{
                          background: COLORS.primary,
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          padding: "0.5rem 1rem",
                          fontWeight: 500,
                          fontSize: "0.9rem",
                          cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = "#4a5a54"}
                        onMouseOut={(e) => e.currentTarget.style.background = COLORS.primary}
                        disabled={!salon.name}
                        title="Salon-Seite anzeigen"
                      >
                        👁️ Ansehen
                      </button>
                      <button
                        onClick={() => handleDeleteSalon(salon.email)}
                        style={{
                          background: "#ef4444",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          padding: "0.5rem 1rem",
                          fontWeight: 500,
                          fontSize: "0.9rem",
                          cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                        title="Salon löschen"
                      >
                        🗑️ Löschen
                      </button>
                    </div>
                  </div>
                ))}

                {/* --- New: Plan management section in salon list --- */}
                {allSalons.length > 0 && (
                  <div style={{
                    marginTop: 24,
                    paddingTop: 16,
                    borderTop: `1px solid ${COLORS.primary}10`,
                  }}>
                    <h3 style={{
                      fontWeight: 600,
                      fontSize: "1.1rem",
                      color: "#000",
                      marginBottom: 16,
                    }}>
                      Plan-Management für Salons
                    </h3>
                    {allSalons.map(salon => (
                      <div key={salon._id} style={{
                        background: "#f9fafb",
                        borderRadius: 8,
                        padding: "1rem",
                        border: `1px solid ${COLORS.primary}15`,
                        marginBottom: 12,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <strong style={{ fontSize: "1rem", color: "#222" }}>{salon.name}</strong>
                            <div style={{ fontSize: "0.85rem", color: "#666" }}>
                              {salon.email} | {salon.location}
                            </div>
                          </div>
                          <div>
                            <select
                              value={salon.plan || "founders"}
                              onChange={async (e) => {
                                const newPlan = e.target.value;
                                setDeleteStatus("Plan wird geändert...");
                                await handlePlanChange(salon.email, newPlan);
                              }}
                              style={{
                                padding: "4px 8px",
                                borderRadius: 4,
                                border: "1px solid #ccc",
                                fontSize: "0.85rem",
                                color: "#000",
                                background: "#fff",
                              }}
                            >
                              <option value="founders">Founders Plan - €0/Monat</option>
                              <option value="startup">Startup Plan - €29/Monat</option>
                              <option value="grow">Grow Plan - €59/Monat</option>
                              <option value="unicorn">Unicorn Plan - €99/Monat</option>
                              <option value="custom">Custom Plan - Individuell</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- Section: User Management --- */}
        <h2
          style={{
            fontWeight: 600,
            fontSize: "1.2rem",
            color: "#222",
            marginBottom: 16,
            marginTop: 32,
            letterSpacing: -0.5,
          }}
        >
          Benutzer-Verwaltung
        </h2>
        <button
          onClick={() => {
            setShowUserList(!showUserList);
            if (!showUserList && users.length === 0) {
              fetchSalonsAndUsers();
            }
          }}
          style={{
            background: COLORS.primary,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "0.75rem 1.5rem",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: "pointer",
            marginBottom: 16,
            transition: "background 0.2s",
            boxShadow: "0 1px 4px #5C6F6810",
          }}
          onMouseOver={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.background = "#4a5a54")}
          onMouseOut={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.background = COLORS.primary)}
        >
          {showUserList ? "Benutzer-Liste verstecken" : "Alle Benutzer anzeigen"}
        </button>

        {showUserList && (
          <div style={{
            background: "#f8f9fa",
            borderRadius: 8,
            padding: "1rem",
            marginBottom: 24,
            border: `1px solid ${COLORS.primary}20`,
          }}>
            <h3 style={{
              fontWeight: 600,
              fontSize: "1.1rem",
              color: "#000",
              marginBottom: 16,
            }}>
              Registrierte Kunden ({users.filter(u => !u.role && (!userSearch || u.email?.toLowerCase().includes(userSearch.toLowerCase()))).length})
            </h3>
            {/* User search input */}
            <div style={{ display: "flex", gap: "8px", marginBottom: 16, flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Suche nach E-Mail..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                style={{
                  flex: 1,
                  padding: "0.5rem 1rem",
                  borderRadius: 6,
                  border: `1px solid ${COLORS.primary}30`,
                  fontSize: "0.9rem",
                  color: "#000",
                  background: "#fff",
                  minWidth: "180px",
                }}
              />
            </div>
            {users.filter(u => !u.role && (!userSearch || u.email?.toLowerCase().includes(userSearch.toLowerCase()))).length === 0 ? (
              <p style={{ color: "#666", fontStyle: "italic" }}>Keine Benutzer gefunden.</p>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {users
                  .filter(user => !user.role && (!userSearch || user.email?.toLowerCase().includes(userSearch.toLowerCase())))
                  .sort((a, b) => {
                    const aStats = userBookingStats[a.uid] || { rating: 5, total: 0 };
                    const bStats = userBookingStats[b.uid] || { rating: 5, total: 0 };
                    if (aStats.rating !== bStats.rating) {
                      return bStats.rating - aStats.rating;
                    }
                    return bStats.total - aStats.total;
                  })
                  .map((user, idx) => {
                    const stats = userBookingStats[user.uid] || { completed: 0, cancelled: 0, noShow: 0, total: 0, rating: 5 };
                    return (
                      <div
                        key={user.uid || idx}
                        style={{
                          background: "#fff",
                          borderRadius: 8,
                          padding: "1rem",
                          border: `2px solid ${stats.rating >= 4 ? '#22c55e' : stats.rating >= 3 ? '#f59e0b' : '#ef4444'}20`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "12px",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: "200px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: 4 }}>
                            <h4 style={{
                              fontWeight: 600,
                              color: "#000",
                              fontSize: "1rem",
                              margin: 0,
                            }}>
                              {user.email || "Unbekannter Benutzer"}
                            </h4>
                            <div style={{
                              padding: "2px 8px",
                              borderRadius: 12,
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              color: "#fff",
                              background: getRatingColor(stats.rating),
                            }}>
                              {getRatingLabel(stats.rating)}
                            </div>
                          </div>
                          {/* Customer Rating & Stats */}
                          <div style={{
                            background: "#f8f9fa",
                            padding: "8px",
                            borderRadius: 6,
                            marginTop: 8,
                          }}>
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              marginBottom: 4,
                            }}>
                              <span style={{
                                fontSize: "1.1rem",
                                color: getRatingColor(stats.rating),
                              }}>
                                {getRatingStars(stats.rating)}
                              </span>
                              <span style={{
                                fontSize: "0.9rem",
                                fontWeight: 600,
                                color: getRatingColor(stats.rating),
                              }}>
                                {stats.rating}/5
                              </span>
                            </div>
                            <div style={{
                              fontSize: "0.8rem",
                              color: "#666",
                              display: "grid",
                              gridTemplateColumns: "repeat(2, 1fr)",
                              gap: "4px",
                            }}>
                              <span>📅 Gesamt: {stats.total}</span>
                              <span style={{ color: "#22c55e" }}>✅ Abgeschlossen: {stats.completed}</span>
                              <span style={{ color: "#f59e0b" }}>❌ Storniert: {stats.cancelled}</span>
                              <span style={{ color: "#ef4444" }}>🚫 Nicht erschienen: {stats.noShow}</span>
                            </div>
                            {stats.total > 0 && (
                              <div style={{
                                fontSize: "0.75rem",
                                color: "#666",
                                marginTop: 4,
                                fontStyle: "italic",
                              }}>
                                Abschlussrate: {((stats.completed / stats.total) * 100).toFixed(1)}%
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button
                            onClick={() => handleDeleteUser(user.uid, user.email)}
                            style={{
                              background: "#ef4444",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              padding: "0.5rem 1rem",
                              fontWeight: 500,
                              fontSize: "0.9rem",
                              cursor: "pointer",
                              transition: "background 0.2s",
                            }}
                            title="Benutzer löschen"
                          >
                            🗑️ Löschen
                          </button>
                          <button
                            onClick={async () => {
                              setHistoryUser({ email: user.email, uid: user.uid });
                              // Fetch bookings if not already loaded
                              if (allBookings.length === 0) {
                                await fetchAllBookings();
                              }
                              setShowUserHistoryModal(true);
                            }}
                            style={{
                              background: "#5C6F68",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              padding: "0.5rem 1rem",
                              fontWeight: 500,
                              fontSize: "0.9rem",
                              cursor: "pointer",
                              transition: "background 0.2s",
                            }}
                            title="Buchungshistorie anzeigen"
                          >
                            📖 Buchungshistorie
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* User Booking History Modal */}
        {showUserHistoryModal && historyUser && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}>
            <div style={{
              background: "#fff",
              borderRadius: 12,
              padding: "24px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#000", margin: 0 }}>
                  Buchungshistorie für {historyUser.email}
                </h3>
                <button
                  onClick={() => setShowUserHistoryModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "1.5rem",
                    cursor: "pointer",
                    color: "#666",
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={{ display: "grid", gap: "16px" }}>
                {allBookings.length === 0 ? (
                  <div style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "#666",
                    fontStyle: "italic"
                  }}>
                    <div>Lade Buchungen...</div>
                    <button
                      onClick={fetchAllBookings}
                      style={{
                        marginTop: 16,
                        background: "#5C6F68",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 16px",
                        cursor: "pointer",
                      }}
                    >
                      Buchungen laden
                    </button>
                  </div>
                ) : getUserBookings(historyUser).length === 0 ? (
                  <div style={{ color: "#666", fontStyle: "italic", marginBottom: 16 }}>
                    Keine Buchungen für diesen Benutzer gefunden.
                  </div>
                ) : (
                  getUserBookings(historyUser)
                    .sort((a: any, b: any) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
                    .map((booking: any, idx: number) => (
                    <div key={booking._id || idx} style={{
                      background: "#f8f9fa",
                      borderRadius: 8,
                      padding: "12px",
                      border: "1px solid #eee",
                      marginBottom: "8px"
                    }}>
                      <div style={{ fontWeight: 600, color: "#000" }}>
                        {booking.date} um {booking.time}
                      </div>
                      <div style={{ fontSize: "0.95rem", color: "#333" }}>
                        Salon: {booking.salonInfo?.name || booking.salonName || "Unbekannt"}
                      </div>
                      <div style={{ fontSize: "0.95rem", color: "#333" }}>
                        Services: {booking.services?.map((s: any) => s.name).join(', ') || booking.service || 'Keine Services'}
                      </div>
                      <div style={{ fontSize: "0.95rem", color: "#333" }}>
                        Status: <span style={{
                          padding: "2px 6px",
                          borderRadius: 3,
                          fontSize: "0.8rem",
                          background: booking.status === 'completed' ? '#dcfce7' : 
                                     booking.status === 'confirmed' ? '#dbeafe' :
                                     booking.status === 'cancelled' ? '#fee2e2' :
                                     booking.status === 'no-show' ? '#fef3c7' : '#f3f4f6',
                          color: booking.status === 'completed' ? '#166534' : 
                                 booking.status === 'confirmed' ? '#1e40af' :
                                 booking.status === 'cancelled' ? '#dc2626' :
                                 booking.status === 'no-show' ? '#d97706' : '#374151',
                        }}>
                          {booking.status || 'unbekannt'}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.95rem", color: "#333" }}>
                        Gesamt: €{booking.total || booking.price || 0}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#666", marginTop: 4 }}>
                        Gebucht am: {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('de-DE') : 'Unbekannt'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <h2
          style={{
            fontWeight: 600,
            fontSize: "1.2rem",
            color: "#222",
            marginBottom: 16,
            marginTop: 32,
            letterSpacing: -0.5,
          }}
        >
          Buchungsüberwachung
        </h2>
        <button
          onClick={() => {
            setShowAllBookings(!showAllBookings);
            if (!showAllBookings) {
              fetchAllBookings();
            }
          }}
          style={{
            background: COLORS.primary,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "0.75rem 1.5rem",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: "pointer",
            marginBottom: 16,
            transition: "background 0.2s",
            boxShadow: "0 1px 4px #5C6F6810",
          }}
          onMouseOver={(e) => e.currentTarget.style.background = "#4a5a54"}
          onMouseOut={(e) => e.currentTarget.style.background = COLORS.primary}
        >
          {showAllBookings ? "Buchungen verstecken" : "Alle Buchungen anzeigen"}
        </button>

        {showAllBookings && (
          <div style={{
            background: "#f8f9fa",
            borderRadius: 8,
            padding: "1rem",
            marginBottom: 24,
            border: `1px solid ${COLORS.primary}20`,
          }}>
            <h3 style={{
              fontWeight: 600,
              fontSize: "1.1rem",
              color: "#000",
              marginBottom: 16,
            }}>
              Alle Buchungen ({filteredBookings.length})
            </h3>
            
            {/* Filters */}
            <div style={{
              display: "flex",
              gap: "12px",
              marginBottom: 16,
              flexWrap: "wrap",
            }}>
              <input
                type="text"
                placeholder="Suche nach Kunde, Salon oder Telefon..."
                value={bookingFilter}
                onChange={e => setBookingFilter(e.target.value)}
                style={{
                  flex: 1,
                  padding: "0.5rem 1rem",
                  borderRadius: 6,
                  border: `1px solid ${COLORS.primary}30`,
                  fontSize: "0.9rem",
                  color: "#000",
                  background: "#fff",
                  minWidth: "200px",
                }}
              />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: 6,
                  border: `1px solid ${COLORS.primary}30`,
                  fontSize: "0.9rem",
                  color: "#000",
                  background: "#fff",
                }}
              >
                <option value="all">Alle Status</option>
                <option value="confirmed">Bestätigt</option>
                <option value="completed">Abgeschlossen</option>
                <option value="cancelled">Storniert</option>
                <option value="no-show">Nicht erschienen</option>
              </select>
            </div>

            {filteredBookings.length === 0 ? (
              <p style={{ color: "#666", fontStyle: "italic" }}>Keine Buchungen gefunden.</p>
            ) : (
              <div style={{
                maxHeight: "600px",
                overflowY: "auto",
                background: "#fff",
                borderRadius: 8,
                border: `1px solid ${COLORS.primary}15`,
              }}>
                <table style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.85rem",
                }}>
                  <thead style={{ background: "#f1f5f9", position: "sticky", top: 0 }}>
                    <tr>
                      <th style={{ padding: "12px 8px", textAlign: "left", color: "#000", fontWeight: 600 }}>Datum/Zeit</th>
                      <th style={{ padding: "12px 8px", textAlign: "left", color: "#000", fontWeight: 600 }}>Kunde</th>
                      <th style={{ padding: "12px 8px", textAlign: "left", color: "#000", fontWeight: 600 }}>Salon</th>
                      <th style={{ padding: "12px 8px", textAlign: "left", color: "#000", fontWeight: 600 }}>Service</th>
                      <th style={{ padding: "12px 8px", textAlign: "left", color: "#000", fontWeight: 600 }}>Status</th>
                      <th style={{ padding: "12px 8px", textAlign: "left", color: "#000", fontWeight: 600 }}>Total</th>
                      <th style={{ padding: "12px 8px", textAlign: "center", color: "#000", fontWeight: 600 }}>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((booking, idx) => (
                      <tr key={booking._id || idx} style={{
                        borderBottom: `1px solid ${COLORS.primary}10`,
                        backgroundColor: idx % 2 === 0 ? "#fff" : "#f9fafb",
                      }}>
                        <td style={{ padding: "8px", color: "#000" }}>
                          <div style={{ fontWeight: 500 }}>{booking.date}</div>
                          <div style={{ fontSize: "0.75rem", color: "#666" }}>{booking.time}</div>
                        </td>
                        <td style={{ padding: "8px", color: "#000" }}>
                          <div style={{ fontWeight: 500 }}>{booking.customerName}</div>
                          <div style={{ fontSize: "0.75rem", color: "#666" }}>{booking.customerPhone}</div>
                        </td>
                        <td style={{ padding: "8px", color: "#000" }}>
                          <div style={{ fontWeight: 500 }}>{booking.salonInfo?.name || 'Unbekannt'}</div>
                          <div style={{ fontSize: "0.75rem", color: "#666" }}>{booking.salonInfo?.email}</div>
                        </td>
                        <td style={{ padding: "8px", color: "#000" }}>
                          {booking.services?.map((s: any) => s.name).join(', ') || 'Keine Services'}
                        </td>
                        <td style={{ padding: "8px" }}>
                          <span style={{
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            background: booking.status === 'completed' ? '#dcfce7' : 
                                       booking.status === 'confirmed' ? '#dbeafe' :
                                       booking.status === 'cancelled' ? '#fee2e2' :
                                       booking.status === 'no-show' ? '#fef3c7' : '#f3f4f6',
                            color: booking.status === 'completed' ? '#166534' : 
                                   booking.status === 'confirmed' ? '#1e40af' :
                                   booking.status === 'cancelled' ? '#dc2626' :
                                   booking.status === 'no-show' ? '#d97706' : '#374151',
                          }}>
                            {booking.status === 'completed' ? 'Abgeschlossen' :
                             booking.status === 'confirmed' ? 'Bestätigt' :
                             booking.status === 'cancelled' ? 'Storniert' :
                             booking.status === 'no-show' ? 'Nicht erschienen' : booking.status}
                          </span>
                        </td>
                        <td style={{ padding: "8px", color: "#000", fontWeight: 500 }}>
                          €{booking.total || 0}
                        </td>
                        <td style={{ padding: "8px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "4px", justifyContent: "center", flexWrap: "wrap" }}>
                            <button
                              onClick={() => {
                                setSelectedBooking(booking);
                                setShowBookingModal(true);
                              }}
                              style={{
                                background: COLORS.highlight,
                                color: "#000",
                                border: "none",
                                borderRadius: 4,
                                padding: "4px 8px",
                                fontSize: "0.75rem",
                                cursor: "pointer",
                                fontWeight: 500,
                              }}
                            >
                              Details
                            </button>
                            {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                              <>
                                <button
                                  onClick={() => handleBookingStatusChange(booking._id, 'completed')}
                                  style={{
                                    background: "#22c55e",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 4,
                                    padding: "4px 8px",
                                    fontSize: "0.75rem",
                                    cursor: "pointer",
                                    fontWeight: 500,
                                  }}
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => handleBookingStatusChange(booking._id, 'no-show')}
                                  style={{
                                    background: "#f59e0b",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 4,
                                    padding: "4px 8px",
                                    fontSize: "0.75rem",
                                    cursor: "pointer",
                                    fontWeight: 500,
                                  }}
                                >
                                  ✗
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Booking Details Modal */}
        {showBookingModal && selectedBooking && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}>
            <div style={{
              background: "#fff",
              borderRadius: 12,
              padding: "24px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#000", margin: 0 }}>
                  Buchungsdetails
                </h3>
                <button
                  onClick={() => setShowBookingModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "1.5rem",
                    cursor: "pointer",
                    color: "#666",
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={{ display: "grid", gap: "16px" }}>
                <div>
                  <strong style={{ color: "#000" }}>Kunde:</strong>
                  <div>{selectedBooking.customerName}</div>
                  <div style={{ fontSize: "0.9rem", color: "#666" }}>{selectedBooking.customerPhone}</div>
                </div>
                
                <div>
                  <strong style={{ color: "#000" }}>Salon:</strong>
                  <div>{selectedBooking.salonInfo?.name}</div>
                  <div style={{ fontSize: "0.9rem", color: "#666" }}>{selectedBooking.salonInfo?.email}</div>
                </div>
                
                <div>
                  <strong style={{ color: "#000" }}>Datum & Zeit:</strong>
                  <div>{selectedBooking.date} um {selectedBooking.time}</div>
                </div>
                
                <div>
                  <strong style={{ color: "#000" }}>Services:</strong>
                  {selectedBooking.services?.map((service: any, idx: number) => (
                    <div key={idx} style={{ marginLeft: "8px", marginTop: "4px" }}>
                      • {service.name} - €{service.price} ({service.employee || 'Nicht zugewiesen'})
                    </div>
                  ))}
                </div>
                
                <div>
                  <strong style={{ color: "#000" }}>Gesamtpreis:</strong>
                  <div>€{selectedBooking.total}</div>
                </div>
                
                <div>
                  <strong style={{ color: "#000" }}>Status:</strong>
                  <div>{selectedBooking.status}</div>
                </div>
                
                <div>
                  <strong style={{ color: "#000" }}>Erstellt am:</strong>
                  <div>{new Date(selectedBooking.createdAt).toLocaleString('de-DE')}</div>
                </div>
                
                {selectedBooking.updatedAt && (
                  <div>
                    <strong style={{ color: "#000" }}>Zuletzt aktualisiert:</strong>
                    <div>{new Date(selectedBooking.updatedAt).toLocaleString('de-DE')}</div>
                  </div>
                )}
              </div>
              
              <div style={{
                marginTop: 20,
                paddingTop: 20,
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
              }}>
                <button
                  onClick={() => handleBookingStatusChange(selectedBooking._id, 'confirmed')}
                  style={{
                    background: "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 16px",
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Als bestätigt markieren
                </button>
                <button
                  onClick={() => handleBookingStatusChange(selectedBooking._id, 'completed')}
                  style={{
                    background: "#22c55e",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 16px",
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Als abgeschlossen markieren
                </button>
                <button
                  onClick={() => handleBookingStatusChange(selectedBooking._id, 'no-show')}
                  style={{
                    background: "#f59e0b",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 16px",
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Als No-Show markieren
                </button>
                <button
                  onClick={() => handleBookingStatusChange(selectedBooking._id, 'cancelled')}
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 16px",
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Stornieren
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}