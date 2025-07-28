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

const WEEKDAYS = [
  "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"
];

function getDefaultSchedule(salonSchedule: { [key: string]: { open: boolean; start: string; end: string } }) {
  return { ...salonSchedule };
}

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [salon, setSalon] = useState<{
    uid?: string;
    name: string;
    email: string;
    imageUrl?: string | null;
    imageUrls?: string[];
    description?: string;
    location?: string;
    contact?: string;
    googleMapsAddress?: string;
    workingDays?: { [key: string]: { open: boolean; start: string; end: string } };
    holidays?: string[];
    disableBookingHistory?: boolean;
    storeCustomerAddress?: boolean;
  } | null>(null);
  const [viewingSalonUid, setViewingSalonUid] = useState<string | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState<boolean>(false);
  const [salonName, setSalonName] = useState("");
  const [salonDescription, setSalonDescription] = useState("");
  const [salonLocation, setSalonLocation] = useState("");
  const [googleMapsAddress, setGoogleMapsAddress] = useState("");
  const [salonContact, setSalonContact] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [workingDays, setWorkingDays] = useState<{ [key: string]: { open: boolean; start: string; end: string } }>(() =>
    Object.fromEntries(WEEKDAYS.map(day => [day, { open: day !== "Sonntag", start: "09:00", end: "18:00" }]))
  );
  const [holidays, setHolidays] = useState<string[]>([]);
  const [newHoliday, setNewHoliday] = useState("");
  // Add new state for holiday range
  const [holidayRangeStart, setHolidayRangeStart] = useState("");
  const [holidayRangeEnd, setHolidayRangeEnd] = useState("");
  const [disableBookingHistory, setDisableBookingHistory] = useState(false);
  const [storeCustomerAddress, setStoreCustomerAddress] = useState(false);

  // Only update disableBookingHistory when salon changes, not on every render
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
              setSalonName(salon.name);
              setSalonDescription(salon.description ?? "");
              setSalonLocation(salon.location ?? "");
              setGoogleMapsAddress(salon.googleMapsAddress ?? "");
              setSalonContact(salon.contact ?? "");
              setImagePreviews(
                salon.imageUrls || salon.imageUrl
                  ? (salon.imageUrls ?? [salon.imageUrl]).filter(Boolean)
                  : []
              );
              setImageFiles([]);
              setWorkingDays(salon.workingDays ?? Object.fromEntries(WEEKDAYS.map(day => [day, { open: day !== "Sonntag", start: "09:00", end: "18:00" }])));
              setHolidays(salon.holidays ?? []);
              // Add storeCustomerAddress initialization
              setStoreCustomerAddress(!!salon.storeCustomerAddress);
            }
          } else {
            // Normal flow for salon users
            const res = await fetch(`/api/salons?email=${encodeURIComponent(firebaseUser.email)}`);
            if (!res.ok) throw new Error("Salon nicht gefunden.");
            const data = await res.json();
            const salonData = data.salon ?? data;
            setSalon(salonData);
            setSalonName(salonData.name);
            setSalonDescription(salonData.description ?? "");
            setSalonLocation(salonData.location ?? "");
            setGoogleMapsAddress(salonData.googleMapsAddress ?? "");
            setSalonContact(salonData.contact ?? "");
            setImagePreviews(
              salonData.imageUrls || salonData.imageUrl
                ? (salonData.imageUrls ?? [salonData.imageUrl]).filter(Boolean)
                : []
            );
            setImageFiles([]);
            setWorkingDays(salonData.workingDays ?? Object.fromEntries(WEEKDAYS.map(day => [day, { open: day !== "Sonntag", start: "09:00", end: "18:00" }])));
            setHolidays(salonData.holidays ?? []);
            // Add storeCustomerAddress initialization
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imageFiles.length >= 8) {
      setStatus("Maximal 8 Bilder erlaubt.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageFiles(prev => [...prev, file]);
      setImagePreviews(prev => [...prev, reader.result as string]);
    };
    reader.readAsDataURL(file);
    // Reset input value so same file can be selected again if needed
    e.target.value = "";
  };

  const handleRemoveImage = async (idx: number) => {
    // Determine if this is an existing image (URL) or a new image (File)
    const isExisting = idx < imagePreviews.length - imageFiles.length;
    if (isExisting) {
      // Remove from backend and state
      const url = imagePreviews[idx];
      // Extract image id from URL (assuming /api/salons/image/[id])
      const match = url.match(/\/api\/salons\/image\/([a-zA-Z0-9]+)/);
      const imageId = match ? match[1] : null;
      if (imageId && salon?.email) {
        await fetch("/api/salons/delete-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: salon.email, imageId }),
        });
      }
      // Remove from previews
      setImagePreviews(prev => prev.filter((_, i) => i !== idx));
      // Also update salon.imageUrls if present
      setSalon(salon => salon ? {
        ...salon,
        imageUrls: (salon.imageUrls ?? []).filter((_, i) => i !== idx)
      } : salon);
    } else {
      // Remove from previews and files for new images
      setImagePreviews(prev => prev.filter((_, i) => i !== idx));
      setImageFiles(prev => {
        // New files are at the end of previews
        const fileIdx = idx - (imagePreviews.length - imageFiles.length);
        return prev.filter((_, i) => i !== fileIdx);
      });
    }
  };

  const handleWorkingDayChange = (day: string, field: "open" | "start" | "end", value: any) => {
    setWorkingDays(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: field === "open" ? value : value }
    }));
  };

  const handleAddHoliday = () => {
    if (newHoliday && !holidays.includes(newHoliday)) {
      setHolidays(prev => [...prev, newHoliday]);
      setNewHoliday("");
    }
  };

  // Add handler for adding a range of holidays
  const handleAddHolidayRange = () => {
    if (!holidayRangeStart || !holidayRangeEnd) return;
    const start = new Date(holidayRangeStart);
    const end = new Date(holidayRangeEnd);
    if (end < start) return;
    const dates: string[] = [];
    let d = new Date(start);
    while (d <= end) {
      const dateStr = d.toISOString().slice(0, 10);
      if (!holidays.includes(dateStr)) {
        dates.push(dateStr);
      }
      d.setDate(d.getDate() + 1);
    }
    if (dates.length > 0) {
      setHolidays(prev => [...prev, ...dates]);
    }
    setHolidayRangeStart("");
    setHolidayRangeEnd("");
  };

  const handleRemoveHoliday = (date: string) => {
    setHolidays(prev => prev.filter(d => d !== date));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (!salon) return;
    // Always use current imagePreviews for update (to allow all images to be deleted)
    let imageUrls = imagePreviews.filter(src => src.startsWith("/api/salons/image/"));
    try {
      if (imageFiles.length > 0) {
        // Convert images to base64 and upload to /api/salons/upload-image
        const base64s = await Promise.all(
          imageFiles.map(
            file =>
              new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              })
          )
        );
        const imgRes = await fetch("/api/salons/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: salon.email, images: base64s }),
        });
        if (!imgRes.ok) throw new Error("Bild-Upload fehlgeschlagen.");
        const imgData = await imgRes.json();
        imageUrls = [...imageUrls, ...imgData.urls];
      }
      const res = await fetch("/api/salons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: salon.email,
          name: salonName,
          description: salonDescription,
          location: salonLocation,
          googleMapsAddress,
          contact: salonContact,
          imageUrls,
          workingDays,
          holidays,
          disableBookingHistory,
          storeCustomerAddress // Add the new setting
        }),
      });
      if (!res.ok) throw new Error("Update fehlgeschlagen.");
      setStatus("Salonname und Bilder erfolgreich aktualisiert.");
      setSalon({
        ...salon,
        name: salonName,
        description: salonDescription,
        location: salonLocation,
        googleMapsAddress,
        contact: salonContact,
        imageUrls,
        workingDays,
        holidays,
        disableBookingHistory,
        storeCustomerAddress // Update local state
      });
      setImageFiles([]);
      setImagePreviews(imageUrls); // Update previews to match backend
    } catch {
      setStatus("Fehler beim Aktualisieren des Salons oder Bilder.");
    }
  };

  if (loading) {
    return (
      <>
        <Navbar user={user} />
        <main className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-black text-lg">Lade Einstellungen...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Navbar user={user} viewingSalonUid={viewingSalonUid} />
        <main className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
          <div className="text-center p-6 bg-white rounded-lg shadow-sm max-w-md mx-4">
            <h2 className="text-xl font-semibold text-black mb-2">Bitte einloggen</h2>
            <p className="text-black mb-4">Melden Sie sich an, um die Einstellungen zu sehen.</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar
        user={user}
        currentPath="/admin/settings"
        viewingSalonUid={viewingSalonUid}
        salonName={isSystemAdmin ? salon?.name : undefined}
      />
      <main className="min-h-screen bg-gray-50 font-sans p-0">
        <div className="max-w-4xl mx-auto py-8 px-2 sm:px-4 lg:px-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">
              Salon Einstellungen
              {viewingSalonUid && isSystemAdmin && (
                <span className="text-lg text-gray-600 block mt-1">(System-Ansicht für {salon?.name})</span>
              )}
            </h1>
            <p className="text-black text-base sm:text-lg">
              Verwalten Sie Ihren Salon und aktualisieren Sie Ihre Informationen
            </p>
          </div>

          <form
            onSubmit={handleUpdate}
            className="space-y-8"
          >
            {/* Salon Name Card */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-black mb-4 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-primary-600 text-white font-bold">S</span>
                Salon Information
              </h3>
              <label className="block text-black font-medium mb-2">
                Salonname
              </label>
              <input
                type="text"
                value={salonName ?? ""}
                onChange={e => setSalonName(e.target.value)}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-md border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 text-black text-base outline-none transition"
                required
              />
              {/* Description */}
              <label className="block text-black font-medium mt-4 mb-2">
                Beschreibung
              </label>
              <textarea
                value={salonDescription}
                onChange={e => setSalonDescription(e.target.value)}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-md border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 text-black text-base outline-none transition"
                rows={3}
                placeholder="Beschreiben Sie Ihren Salon..."
              />
              {/* Location */}
              <label className="block text-black font-medium mt-4 mb-2">
                Standort (Adresse)
              </label>
              <input
                type="text"
                value={salonLocation}
                onChange={e => setSalonLocation(e.target.value)}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-md border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 text-black text-base outline-none transition"
                placeholder="Adresse oder Stadt"
              />
              {/* Google Maps Adresse */}
              <label className="block text-black font-medium mt-4 mb-2">
                Google Maps Adresse
              </label>
              <input
                type="text"
                value={googleMapsAddress}
                onChange={e => setGoogleMapsAddress(e.target.value)}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-md border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 text-black text-base outline-none transition"
                placeholder="Google Maps Link oder Adresse"
              />
              {/* Contact */}
              <label className="block text-black font-medium mt-4 mb-2">
                Kontaktinformation
              </label>
              <input
                type="text"
                value={salonContact}
                onChange={e => setSalonContact(e.target.value)}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-md border border-gray-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-100 text-black text-base outline-none transition"
                placeholder="Telefon, E-Mail oder Webseite"
              />
            </div>

            {/* Image Gallery Card */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-black mb-4 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8"></span>
                Salon Bilder
              </h3>
              {/* Primary image */}
              <div className="mb-6">
                <div className="text-xs font-semibold text-black uppercase mb-2">Hauptbild</div>
                <div className={`relative w-full h-40 sm:h-60 rounded-lg overflow-hidden border ${imagePreviews[0] ? "border-gray-200" : "border-dashed border-2 border-gray-200"} bg-white flex items-center justify-center`}>
                  {imagePreviews[0] ? (
                    <>
                      <img
                        src={imagePreviews[0]}
                        alt="Hauptbild des Salons"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(0)}
                        className="absolute top-2 right-2 bg-white border border-gray-200 rounded-full px-3 py-1 text-red-600 font-semibold shadow hover:bg-red-50 transition"
                      >
                        Entfernen
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="primary-image-input"
                      />
                      <label
                        htmlFor="primary-image-input"
                        className="flex flex-col items-center justify-center w-full h-full cursor-pointer text-black hover:text-green-600 transition"
                      >
                        <div className="w-16 h-16 rounded-full border-2 border-current flex items-center justify-center mb-3 text-3xl font-light">+</div>
                        <div className="font-semibold">Hauptbild hinzufügen</div>
                        <div className="text-xs text-gray-500 mt-1">Dies wird als Titelbild angezeigt</div>
                      </label>
                    </>
                  )}
                </div>
              </div>
              {/* Gallery images */}
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                  <span className="text-xs font-semibold text-black uppercase">Galerie</span>
                  <span className="bg-primary-600 text-white px-2 py-0.5 rounded-full text-xs font-medium">{imagePreviews.length - 1}/8</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  {imagePreviews.slice(1).map((src, idx) => (
                    <div
                      key={idx + 1}
                      className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group"
                    >
                      <img
                        src={src}
                        alt={`Galeriebild ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx + 1)}
                        className="absolute top-2 right-2 bg-white border border-gray-200 rounded-full px-2 py-0.5 text-red-600 font-bold shadow opacity-0 group-hover:opacity-100 transition"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {/* Add more images button */}
                  {imagePreviews.length < 9 && (
                    <div className="aspect-square rounded-lg border-2 border-dashed border-gray-200 bg-white flex items-center justify-center cursor-pointer hover:border-primary-600 transition">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="gallery-image-input"
                      />
                      <label
                        htmlFor="gallery-image-input"
                        className="flex flex-col items-center justify-center w-full h-full cursor-pointer text-black hover:text-green-600 transition"
                      >
                        <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center mb-2 text-xl font-light">+</div>
                        <div className="text-xs font-semibold">Bild hinzufügen</div>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Working Days & Timings Card */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-black mb-4 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-primary-600 text-white font-bold">W</span>
                Arbeitstage & Zeiten
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs sm:text-base">
                  <thead>
                    <tr>
                      <th className="text-left text-black font-semibold py-2 px-3">Tag</th>
                      <th className="text-center text-black font-semibold py-2 px-3">Geöffnet</th>
                      <th className="text-center text-black font-semibold py-2 px-3">Start</th>
                      <th className="text-center text-black font-semibold py-2 px-3">Ende</th>
                    </tr>
                  </thead>
                  <tbody>
                    {WEEKDAYS.map(day => (
                      <tr key={day} className="bg-gray-50 border-b">
                        <td className="py-2 px-3 font-medium text-black">{day}</td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={workingDays[day]?.open ?? false}
                            onChange={e => handleWorkingDayChange(day, "open", e.target.checked)}
                            className="accent-primary-600 w-5 h-5"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="time"
                            value={workingDays[day]?.start ?? "09:00"}
                            onChange={e => handleWorkingDayChange(day, "start", e.target.value)}
                            disabled={!workingDays[day]?.open}
                            className="border rounded-md px-3 py-1 text-black bg-white font-semibold shadow-sm w-28"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="time"
                            value={workingDays[day]?.end ?? "18:00"}
                            onChange={e => handleWorkingDayChange(day, "end", e.target.value)}
                            disabled={!workingDays[day]?.open}
                            className="border rounded-md px-3 py-1 text-black bg-white font-semibold shadow-sm w-28"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Holidays Card */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-black mb-4 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-primary-600 text-white font-bold">F</span>
                Feiertage & Schließtage
              </h3>
              {/* Single day holiday */}
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mb-4">
                <input
                  type="date"
                  value={newHoliday}
                  onChange={e => setNewHoliday(e.target.value)}
                  className="border rounded-md px-2 py-2 sm:px-3 text-black bg-white font-semibold shadow-sm w-full sm:w-auto"
                  style={{ color: "#000" }}
                />
                <button
                  type="button"
                  onClick={handleAddHoliday}
                  className="bg-primary-600 hover:bg-primary-700 px-4 sm:px-5 py-2 rounded-md font-semibold shadow-sm transition w-full sm:w-auto"
                  style={{ color: "#000" }}
                >
                  + Feiertag hinzufügen
                </button>
              </div>
              {/* Range holiday */}
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mb-4">
                <input
                  type="date"
                  value={holidayRangeStart}
                  onChange={e => setHolidayRangeStart(e.target.value)}
                  className="border rounded-md px-2 py-2 sm:px-3 text-black bg-white font-semibold shadow-sm w-full sm:w-auto"
                  style={{ color: "#000" }}
                  placeholder="Startdatum"
                />
                <span className="text-black font-semibold">bis</span>
                <input
                  type="date"
                  value={holidayRangeEnd}
                  onChange={e => setHolidayRangeEnd(e.target.value)}
                  className="border rounded-md px-2 py-2 sm:px-3 text-black bg-white font-semibold shadow-sm w-full sm:w-auto"
                  style={{ color: "#000" }}
                  placeholder="Enddatum"
                />
                <button
                  type="button"
                  onClick={handleAddHolidayRange}
                  className="bg-primary-600 hover:bg-primary-700 px-4 sm:px-5 py-2 rounded-md font-semibold shadow-sm transition w-full sm:w-auto"
                  style={{ color: "#000" }}
                >
                  + Zeitraum als Feiertage
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {holidays.length === 0 && <span className="text-black text-sm">Keine Feiertage eingetragen.</span>}
                {holidays
                  .sort()
                  .map(date => (
                  <span key={date} className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-full text-black font-medium shadow-sm">
                    <span>{date}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveHoliday(date)}
                      className="text-red-600 text-xs px-2 py-1 rounded-full hover:bg-red-50 font-bold transition"
                      style={{ color: "#000" }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="text-xs text-black mt-3">
                Sie können spezielle Schließtage oder Feiertage deklarieren. Um einen Zeitraum zu blockieren, wählen Sie Start- und Enddatum und klicken Sie auf <b>+ Zeitraum als Feiertage</b>.
              </div>
            </div>

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
                className="bg-green-400 hover:bg-green-500 text-white font-semibold px-6 sm:px-8 py-2 sm:py-3 rounded-lg shadow transition min-w-[120px] sm:min-w-[140px]"
                style={{ color: "#000" }}
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
        <Footer />
      </main>
    </>
  );
}