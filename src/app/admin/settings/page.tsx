"use client";
import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { initializeApp } from "firebase/app";
import Navbar from "../../../components/adminnavbar";
import Footer from "@/components/footer";

const COLORS = {
  primary: "#5C6F68",
  accent: "#E4DED5",
  text: "#1F1F1F",
  highlight: "#9DBE8D",
  lightGray: "#F8F9FA",
  border: "#E5E7EB",
  success: "#10B981",
  error: "#EF4444",
};

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

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [salon, setSalon] = useState<{
    uid?: string;
    email: string;
    disableBookingHistory?: boolean;
    storeCustomerAddress?: boolean;
  } | null>(null);
  const [viewingSalonUid, setViewingSalonUid] = useState<string | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [disableBookingHistory, setDisableBookingHistory] = useState(false);
  const [storeCustomerAddress, setStoreCustomerAddress] = useState(false);

  // Only update settings when salon changes, not on every render
  useEffect(() => {
    if (salon && typeof salon.disableBookingHistory === "boolean") {
      setDisableBookingHistory(!!salon.disableBookingHistory);
    }
    if (salon && typeof salon.storeCustomerAddress === "boolean") {
      setStoreCustomerAddress(!!salon.storeCustomerAddress);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salon?.disableBookingHistory, salon?.storeCustomerAddress]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser?.email) {
        setLoading(true);
        try {
          // Check if this is system admin viewing another salon's settings
          const urlParams = new URLSearchParams(window.location.search);
          const salonUidParam = urlParams.get('salonUid');
          const isSystemUser = firebaseUser.email === "system@gmail.com";
          setIsSystemAdmin(isSystemUser);
          
          if (salonUidParam && isSystemUser) {
            // System admin viewing specific salon settings
            setViewingSalonUid(salonUidParam);
            
            // Fetch the specific salon data
            const salonRes = await fetch(`/api/salons?uid=${encodeURIComponent(salonUidParam)}`);
            if (salonRes.ok) {
              const salonData = await salonRes.json();
              const salon = salonData.salon;
              setSalon(salon);
              setStoreCustomerAddress(!!salon.storeCustomerAddress);
            }
          } else {
            // Normal flow for salon users
            const res = await fetch(`/api/salons?email=${encodeURIComponent(firebaseUser.email)}`);
            if (!res.ok) throw new Error("Salon nicht gefunden.");
            const data = await res.json();
            const salonData = data.salon ?? data;
            setSalon(salonData);
            setStoreCustomerAddress(!!salonData.storeCustomerAddress);
          }
        } catch (err) {
          setStatus("Fehler beim Laden des Salons.");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (!salon) return;

    try {
      const res = await fetch("/api/salons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: salon.email,
          disableBookingHistory,
          storeCustomerAddress
        }),
      });
      if (!res.ok) throw new Error("Update fehlgeschlagen.");
      setStatus("Einstellungen erfolgreich aktualisiert.");
      setSalon({
        ...salon,
        disableBookingHistory,
        storeCustomerAddress
      });
    } catch {
      setStatus("Fehler beim Aktualisieren der Einstellungen.");
    }
  };

  if (loading) {
    return (
      <>
        <Navbar user={user} />
        <div className="min-h-screen flex flex-col">
          <main className="flex-1 bg-gray-50 flex items-center justify-center font-sans">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-black text-lg">Lade Einstellungen...</p>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Navbar user={user} viewingSalonUid={viewingSalonUid} />
        <div className="min-h-screen flex flex-col">
          <main className="flex-1 bg-gray-50 flex items-center justify-center font-sans">
            <div className="text-center p-6 bg-white rounded-lg shadow-sm max-w-md mx-4">
              <h2 className="text-xl font-semibold text-black mb-2">Bitte einloggen</h2>
              <p className="text-black mb-4">Melden Sie sich an, um die Einstellungen zu sehen.</p>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar
        user={user}
        currentPath="/admin/settings"
        viewingSalonUid={viewingSalonUid}
        salonName={isSystemAdmin ? salon?.uid : undefined}
      />
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 bg-gray-50 font-sans p-0">
          <div className="max-w-4xl mx-auto py-8 px-2 sm:px-4 lg:px-8">
            {/* Header */}
            <div className="mb-8 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">
                Einstellungen
                {viewingSalonUid && isSystemAdmin && (
                  <span className="text-lg text-gray-600 block mt-1">(System-Ansicht)</span>
                )}
              </h1>
              <p className="text-black text-base sm:text-lg">
                Verwalten Sie Ihre Buchungs- und Datenschutzeinstellungen
              </p>
            </div>

            <form onSubmit={handleUpdate} className="space-y-8">
              {/* Booking History Tracking Toggle */}
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-base sm:text-lg font-semibold text-black mb-4 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-primary-600 text-white font-bold">B</span>
                  Buchungshistorie-Einstellungen
                </h3>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!disableBookingHistory}
                      onChange={e => setDisableBookingHistory(!e.target.checked)}
                      className="accent-primary-600 w-5 h-5"
                    />
                    <span className="text-black font-medium">
                      Buchungshistorie anzeigen/tracken
                    </span>
                  </label>
                  <span className="text-xs text-gray-500">
                    Wenn deaktiviert, können Sie Ihre Buchungshistorie nicht einsehen.
                  </span>
                </div>
              </div>

              {/* Customer Address Storage Toggle */}
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-base sm:text-lg font-semibold text-black mb-4 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-primary-600 text-white font-bold">A</span>
                  Kundenadress-Einstellungen
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={storeCustomerAddress}
                        onChange={e => setStoreCustomerAddress(e.target.checked)}
                        className="accent-primary-600 w-5 h-5"
                      />
                      <span className="text-black font-medium">
                        Kundenadresse beim Buchen erfassen
                      </span>
                    </label>
                  </div>
                  <div className="text-xs text-gray-600">
                    Wenn aktiviert, können Kunden ihre Adresse (Straße, Hausnummer, PLZ, Land) beim Buchungsprozess eingeben. 
                    Diese Informationen werden gespeichert und sind in Ihrer Buchungsübersicht verfügbar.
                  </div>
                </div>
              </div>

              {/* Save Button */}
                <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="hover:bg-[#8bb87a] text-white font-semibold px-6 sm:px-8 py-2 sm:py-3 rounded-lg shadow transition min-w-[120px] sm:min-w-[140px]"
                  style={{ backgroundColor: "#9DBE8D", color: "#000" }}
                >
                  Speichern
                </button>
                </div>
            </form>

            {/* Status Message */}
            {status && (
              <div
                className={`mt-8 flex items-center gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-base ${
                  status.startsWith("Fehler")
                    ? "bg-red-50 text-black border border-red-200"
                    : "bg-green-50 text-black border border-green-200"
                }`}
              >
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full font-bold ${
                  status.startsWith("Fehler") ? "bg-red-600 text-white" : "bg-green-600 text-white"
                }`}>
                  {status.startsWith("Fehler") ? "!" : "✓"}
                </span>
                {status}
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}