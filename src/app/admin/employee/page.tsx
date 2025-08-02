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

export default function EmployeePage() {
  const [user, setUser] = useState<any>(null);
  const [salon, setSalon] = useState<{
    uid?: string;
    name: string;
    email: string;
    workingDays?: { [key: string]: { open: boolean; start: string; end: string } };
    employees?: {
      name: string;
      email?: string;
      schedule: { [key: string]: { open: boolean; start: string; end: string } };
      holidays?: string[];
      services?: string[];
      imageUrl?: string;
      description?: string;
    }[];
  } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingDays, setWorkingDays] = useState<{ [key: string]: { open: boolean; start: string; end: string } }>(
    () => Object.fromEntries(WEEKDAYS.map(day => [day, { open: day !== "Sonntag", start: "09:00", end: "18:00" }]))
  );
  const [employees, setEmployees] = useState<
    { name: string; email?: string; schedule: { [key: string]: { open: boolean; start: string; end: string } }, holidays?: string[], services?: string[], imageUrl?: string, description?: string }[]
  >([]);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeEmail, setNewEmployeeEmail] = useState("");
  const [expandedEmployeeIdx, setExpandedEmployeeIdx] = useState<number | null>(null);
  const [newEmployeeHoliday, setNewEmployeeHoliday] = useState<{ [idx: number]: string }>({});
  // Add state for holiday range per employee
  const [newEmployeeHolidayRange, setNewEmployeeHolidayRange] = useState<{ [idx: number]: { start: string; end: string } }>({});
  const [services, setServices] = useState<{ _id: string; name: string }[]>([]);
  const [viewingSalonUid, setViewingSalonUid] = useState<string | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [newEmployeeImage, setNewEmployeeImage] = useState<string | null>(null);
  const [newEmployeeDescription, setNewEmployeeDescription] = useState<string>("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser?.email) {
        setLoading(true);
        try {
          // Check if this is system admin viewing another salon's employees
          const urlParams = new URLSearchParams(window.location.search);
          const salonUidParam = urlParams.get('salonUid');
          const isSystemUser = firebaseUser.email === "system@gmail.com";
          setIsSystemAdmin(isSystemUser);
          
          if (salonUidParam && isSystemUser) {
            // System admin viewing specific salon employees
            setViewingSalonUid(salonUidParam);
            
            // Fetch the specific salon data
            const salonRes = await fetch(`/api/salons?uid=${encodeURIComponent(salonUidParam)}`);
            if (salonRes.ok) {
              const salonData = await salonRes.json();
              const salon = salonData.salon;
              setSalon(salon);
              setWorkingDays(salon.workingDays ?? Object.fromEntries(WEEKDAYS.map(day => [day, { open: day !== "Sonntag", start: "09:00", end: "18:00" }])));
              setEmployees(
                (salon.employees ?? []).map((emp: any) => ({
                  ...emp,
                  holidays: emp.holidays ?? [],
                  services: emp.services ?? []
                }))
              );
              
              // Fetch services for this salon
              if (salon.uid) {
                try {
                  const servicesRes = await fetch(`/api/services?uid=${encodeURIComponent(salon.uid)}`);
                  if (servicesRes.ok) {
                    const servicesData = await servicesRes.json();
                    setServices((servicesData.services ?? []).map((s: any) => ({ _id: s._id, name: s.name })));
                  }
                } catch (error) {
                  console.error('Error fetching services:', error);
                  setServices([]);
                }
              }
            }
          } else {
            // Normal flow for salon users
            const res = await fetch(`/api/salons?email=${encodeURIComponent(firebaseUser.email)}`);
            if (!res.ok) throw new Error("Salon nicht gefunden.");
            const data = await res.json();
            const salonData = data.salon ?? data;
            setSalon(salonData);
            setWorkingDays(salonData.workingDays ?? Object.fromEntries(WEEKDAYS.map(day => [day, { open: day !== "Sonntag", start: "09:00", end: "18:00" }])));
            setEmployees(
              (salonData.employees ?? []).map((emp: any) => ({
                ...emp,
                holidays: emp.holidays ?? [],
                services: emp.services ?? []
              }))
            );
            
            if (salonData.uid) {
              try {
                const servicesRes = await fetch(`/api/services?uid=${encodeURIComponent(salonData.uid)}`);
                if (servicesRes.ok) {
                  const servicesData = await servicesRes.json();
                  setServices((servicesData.services ?? []).map((s: any) => ({ _id: s._id, name: s.name })));
                } else {
                  console.error('Failed to fetch services:', servicesRes.status);
                  setServices([]);
                }
              } catch (error) {
                console.error('Error fetching services:', error);
                setServices([]);
              }
            } else {
              console.warn('No salon uid found, cannot fetch services');
              setServices([]);
            }
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

  const handleAddEmployee = () => {
    if (!newEmployeeName.trim()) return;
    setEmployees(prev => [
      ...prev,
      {
        name: newEmployeeName.trim(),
        email: newEmployeeEmail.trim() || undefined,
        schedule: getDefaultSchedule(workingDays),
        holidays: [],
        imageUrl: newEmployeeImage || undefined,
        description: newEmployeeDescription || undefined,
      }
    ]);
    setNewEmployeeName("");
    setNewEmployeeEmail("");
    setNewEmployeeImage(null);
    setNewEmployeeDescription("");
  };

  const handleRemoveEmployee = (idx: number) => {
    setEmployees(prev => prev.filter((_, i) => i !== idx));
  };

  const handleEmployeeScheduleChange = (
    idx: number,
    day: string,
    field: "open" | "start" | "end",
    value: any
  ) => {
    setEmployees(prev => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        schedule: {
          ...updated[idx].schedule,
          [day]: { ...updated[idx].schedule[day], [field]: field === "open" ? value : value }
        }
      };
      return updated;
    });
  };

  const handleResetEmployeeSchedule = (idx: number) => {
    setEmployees(prev => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        schedule: getDefaultSchedule(workingDays)
      };
      return updated;
    });
  };

  const handleExpandEmployee = (idx: number) => {
    setExpandedEmployeeIdx(expandedEmployeeIdx === idx ? null : idx);
  };

  const handleEmployeeHolidayChange = (idx: number, value: string) => {
    setNewEmployeeHoliday(prev => ({ ...prev, [idx]: value }));
  };

  const handleEmployeeHolidayRangeChange = (idx: number, field: "start" | "end", value: string) => {
    setNewEmployeeHolidayRange(prev => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        [field]: value
      }
    }));
  };

  // Helper to get all dates in a range (inclusive)
  function getDatesInRange(start: string, end: string): string[] {
    const dates: string[] = [];
    if (!start || !end) return dates;
    
    // Use UTC to avoid DST issues
    let current = new Date(start + 'T00:00:00.000Z');
    const endDate = new Date(end + 'T00:00:00.000Z');
    
    while (current <= endDate) {
      dates.push(current.toISOString().slice(0, 10));
      // Use UTC methods to avoid DST issues
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    }
    return dates;
  }

  const handleAddEmployeeHoliday = (idx: number) => {
    const date = newEmployeeHoliday[idx];
    if (!date) return;
    setEmployees(prev => {
      const updated = [...prev];
      if (!updated[idx].holidays) updated[idx].holidays = [];
      if (!updated[idx].holidays.includes(date)) {
        updated[idx].holidays = [...updated[idx].holidays, date];
      }
      return updated;
    });
    setNewEmployeeHoliday(prev => ({ ...prev, [idx]: "" }));
  };

  const handleAddEmployeeHolidayRange = (idx: number) => {
    const range = newEmployeeHolidayRange[idx];
    if (!range?.start || !range?.end) return;
    const dates = getDatesInRange(range.start, range.end);
    if (dates.length === 0) return;
    setEmployees(prev => {
      const updated = [...prev];
      if (!updated[idx].holidays) updated[idx].holidays = [];
      const newHolidays = dates.filter(date => !updated[idx].holidays!.includes(date));
      updated[idx].holidays = [...updated[idx].holidays!, ...newHolidays];
      return updated;
    });
    setNewEmployeeHolidayRange(prev => ({ ...prev, [idx]: { start: "", end: "" } }));
  };

  const handleRemoveEmployeeHoliday = (idx: number, date: string) => {
    setEmployees(prev => {
      const updated = [...prev];
      updated[idx].holidays = updated[idx].holidays?.filter(d => d !== date) ?? [];
      return updated;
    });
  };

  const handleEmployeeServiceToggle = (empIdx: number, serviceId: string) => {
    setEmployees(prev => {
      const updated = [...prev];
      const emp = { ...updated[empIdx] };
      if (!emp.services) emp.services = [];
      
      if (emp.services.includes(serviceId)) {
        emp.services = emp.services.filter(id => id !== serviceId);
      } else {
        emp.services = [...emp.services, serviceId];
      }
      updated[empIdx] = emp;
      return updated;
    });
  };

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
          employees
        }),
      });
      if (!res.ok) throw new Error("Update fehlgeschlagen.");
      setStatus("Mitarbeiter erfolgreich aktualisiert.");
      setSalon({
        ...salon,
        employees
      });
    } catch {
      setStatus("Fehler beim Aktualisieren der Mitarbeiter.");
    }
  };

  // Handle image upload and convert to base64
  const handleEmployeeImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setNewEmployeeImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle editing image/description for existing employees
  const handleEditEmployeeImage = (idx: number, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setEmployees(prev => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], imageUrl: reader.result as string };
        return updated;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleEditEmployeeDescription = (idx: number, value: string) => {
    setEmployees(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], description: value };
      return updated;
    });
  };

  // --- Employee statistics for cards ---
  const employeeStats = React.useMemo(() => {
    const total = employees.length;
    const withServices = employees.filter(e => e.services && e.services.length > 0).length;
    const withoutServices = total - withServices;
    const withImage = employees.filter(e => !!e.imageUrl).length;
    return { total, withServices, withoutServices, withImage };
  }, [employees]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} salonName={salon?.name} salon={salon} />
        <main className="flex-1 bg-gray-50 flex items-center justify-center font-sans">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-black text-lg">Lade Mitarbeiter...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} viewingSalonUid={viewingSalonUid} salonName={salon?.name} salon={salon} />
        <main className="flex-1 bg-gray-50 flex items-center justify-center font-sans">
          <div className="text-center p-6 bg-white rounded-lg shadow-sm max-w-md mx-4">
            <h2 className="text-xl font-semibold text-black mb-2">Bitte einloggen</h2>
            <p className="text-black mb-4">Melden Sie sich an, um die Mitarbeiter zu verwalten.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        user={user}
        currentPath="/admin/employee"
        viewingSalonUid={viewingSalonUid}
        salonName={salon?.name}
        salon={salon}
      />
      <main className="flex-1 bg-gray-50 font-sans p-0 transition-all duration-300">
        <div className="max-w-7xl mx-auto py-8 px-2 sm:px-4 lg:px-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">
              Mitarbeiterverwaltung
              {viewingSalonUid && isSystemAdmin && (
                <span className="text-lg text-gray-600 block mt-1">(System-Ansicht für {salon?.name})</span>
              )}
            </h1>
            <p className="text-black text-base sm:text-lg">
              Verwalten Sie Ihre Mitarbeiter, deren Arbeitszeiten und Services
            </p>
          </div>

          {/* Controls */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <input
                  type="text"
                  value={newEmployeeName}
                  onChange={e => setNewEmployeeName(e.target.value)}
                  placeholder="Name des Mitarbeiters"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-black"
                />
                <input
                  type="email"
                  value={newEmployeeEmail}
                  onChange={e => setNewEmployeeEmail(e.target.value)}
                  placeholder="E-Mail (optional)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-black"
                />
              </div>
                {/* Make the button always visible, not wrapped in flex-1 */}
                <button
                type="button"
                onClick={handleAddEmployee}
                className="bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-md font-medium flex items-center gap-2 mt-4 sm:mt-0 border"
                style={{ minWidth: 140, color: "#000", borderColor: "#000" }}
                >
                + Hinzufügen
                </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Gesamt Mitarbeiter</h3>
              <p className="text-2xl font-bold text-black">{employeeStats.total}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Mit Services</h3>
              <p className="text-2xl font-bold text-green-600">{employeeStats.withServices}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Ohne Services</h3>
              <p className="text-2xl font-bold text-red-600">{employeeStats.withoutServices}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Mit Bild</h3>
              <p className="text-2xl font-bold text-black">{employeeStats.withImage}</p>
            </div>
          </div>

          {/* Employees Table */}
          <form onSubmit={handleUpdate} className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mitarbeiter
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        E-Mail
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Services
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bild
                      </th>
                      {/* Aktionen moved to end */}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employees.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-gray-500">
                          Keine Mitarbeiter eingetragen.
                        </td>
                      </tr>
                    )}
                    {employees.map((emp, idx) => (
                      <React.Fragment key={idx}>
                        <tr
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setExpandedEmployeeIdx(expandedEmployeeIdx === idx ? null : idx)}
                        >
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {emp.imageUrl && (
                                <img
                                  src={emp.imageUrl}
                                  alt={emp.name}
                                  className="w-8 h-8 object-cover rounded-full border"
                                />
                              )}
                              <span className="text-sm font-medium text-black">{emp.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {emp.email || "-"}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-black">
                            {emp.services && emp.services.length > 0
                              ? emp.services.map(sid => services.find(s => s._id === sid)?.name).filter(Boolean).join(", ")
                              : <span className="text-gray-400">Keine</span>
                            }
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {emp.imageUrl
                              ? <img src={emp.imageUrl} alt={emp.name} className="w-8 h-8 object-cover rounded-full border" />
                              : <span className="text-gray-400">-</span>
                            }
                          </td>
                          {/* Aktionen at end, right-aligned */}
                          <td className="px-4 py-4 whitespace-nowrap text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); handleRemoveEmployee(idx); }}
                                className="text-xs text-red-600 px-2 py-1 rounded-md hover:bg-red-50"
                              >
                                Entfernen
                              </button>
                              <button
                                type="button"
                                className="text-xs px-2 py-1 rounded-md border border-gray-300 bg-white shadow-sm"
                                style={{ color: "#000" }}
                              >
                                {expandedEmployeeIdx === idx ? "Schließen" : "Details"}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedEmployeeIdx === idx && (
                          <tr>
                            <td colSpan={5} className="bg-gray-50 px-6 py-6">
                              {/* Editable image and description */}
                              <div className="flex items-center gap-4 mb-3">
                                <div>
                                  <label
                                    htmlFor={`employee-image-upload-${idx}`}
                                    className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded-md shadow-sm cursor-pointer text-xs"
                                    style={{ color: "#000", display: "inline-block" }}
                                  >
                                    Upload
                                  </label>
                                  <input
                                    id={`employee-image-upload-${idx}`}
                                    type="file"
                                    accept="image/*"
                                    onChange={e => {
                                      const file = e.target.files?.[0];
                                      if (file) handleEditEmployeeImage(idx, file);
                                    }}
                                    className="hidden"
                                  />
                                </div>
                                {emp.imageUrl && (
                                  <img
                                    src={emp.imageUrl}
                                    alt={emp.name}
                                    className="w-12 h-12 object-cover rounded-full border"
                                  />
                                )}
                              </div>
                              <div className="mb-3">
                                <input
                                  type="text"
                                  value={emp.description || ""}
                                  onChange={e => handleEditEmployeeDescription(idx, e.target.value)}
                                  placeholder="Beschreibung (optional)"
                                  className="border rounded-md px-2 py-2 text-black shadow-sm w-full"
                                />
                              </div>
                              <div className="mb-3 text-black">Arbeitszeiten</div>
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-xs sm:text-base">
                                  <thead>
                                    <tr>
                                      <th className="text-left text-black py-2 px-3">Tag</th>
                                      <th className="text-center text-black py-2 px-3">Geöffnet</th>
                                      <th className="text-center text-black py-2 px-3">Start</th>
                                      <th className="text-center text-black py-2 px-3">Ende</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {WEEKDAYS.map(day => (
                                      <tr key={day} className="bg-white border-b">
                                        <td className="py-2 px-3 text-black">{day}</td>
                                        <td className="py-2 px-3 text-center">
                                          <input
                                            type="checkbox"
                                            checked={emp.schedule[day]?.open ?? false}
                                            onChange={e => handleEmployeeScheduleChange(idx, day, "open", e.target.checked)}
                                            className="accent-primary-600 w-5 h-5"
                                          />
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          <input
                                            type="time"
                                            value={emp.schedule[day]?.start ?? "09:00"}
                                            onChange={e => handleEmployeeScheduleChange(idx, day, "start", e.target.value)}
                                            disabled={!emp.schedule[day]?.open}
                                            className="border rounded-md px-3 py-1 text-black bg-white shadow-sm w-28"
                                            style={{ color: "#000" }}
                                          />
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          <input
                                            type="time"
                                            value={emp.schedule[day]?.end ?? "18:00"}
                                            onChange={e => handleEmployeeScheduleChange(idx, day, "end", e.target.value)}
                                            disabled={!emp.schedule[day]?.open}
                                            className="border rounded-md px-3 py-1 text-black bg-white shadow-sm w-28"
                                            style={{ color: "#000" }}
                                          />
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div className="mb-3 text-black mt-4">Feiertage / Urlaub</div>
                              <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 sm:gap-3 mb-3">
                                {/* Single day holiday */}
                                <input
                                  type="date"
                                  value={newEmployeeHoliday[idx] ?? ""}
                                  onChange={e => handleEmployeeHolidayChange(idx, e.target.value)}
                                  className="border rounded-md px-2 py-2 sm:px-3 text-black bg-white shadow-sm w-full sm:w-auto"
                                  style={{ color: "#000" }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddEmployeeHoliday(idx)}
                                  className="bg-primary-600 hover:bg-primary-700 px-4 sm:px-5 py-2 rounded-md shadow-sm transition w-full sm:w-auto"
                                  style={{ color: "#000" }}
                                >
                                  + Urlaubstag
                                </button>
                              </div>
                              {/* Holiday range - moved below */}
                              <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 sm:gap-3 mb-3">
                                <input
                                  type="date"
                                  value={newEmployeeHolidayRange[idx]?.start ?? ""}
                                  onChange={e => handleEmployeeHolidayRangeChange(idx, "start", e.target.value)}
                                  className="border rounded-md px-2 py-2 sm:px-3 text-black bg-white shadow-sm w-full sm:w-auto"
                                  style={{ color: "#000" }}
                                />
                                <span className="text-black text-xs">bis</span>
                                <input
                                  type="date"
                                  value={newEmployeeHolidayRange[idx]?.end ?? ""}
                                  onChange={e => handleEmployeeHolidayRangeChange(idx, "end", e.target.value)}
                                  className="border rounded-md px-2 py-2 sm:px-3 text-black bg-white shadow-sm w-full sm:w-auto"
                                  style={{ color: "#000" }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddEmployeeHolidayRange(idx)}
                                  className="bg-primary-600 hover:bg-primary-700 px-4 sm:px-5 py-2 rounded-md shadow-sm transition w-full sm:w-auto"
                                  style={{ color: "#000" }}
                                >
                                  + Bereich
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2 mb-4">
                                {/* Show holiday ranges as a range, but store all dates individually */}
                                {(!emp.holidays || emp.holidays.length === 0) && <span className="text-black text-sm">Keine Urlaubstage eingetragen.</span>}
                                {emp.holidays && emp.holidays.length > 0 && (() => {
                                  // Group holidays into ranges
                                  const sorted = [...emp.holidays].sort();
                                  const ranges: { start: string, end: string }[] = [];
                                  let rangeStart = sorted[0];
                                  let prev = sorted[0];
                                  for (let i = 1; i < sorted.length; i++) {
                                    const curr = sorted[i];
                                    const prevDate = new Date(prev);
                                    prevDate.setDate(prevDate.getDate() + 1);
                                    const expected = prevDate.toISOString().slice(0, 10);
                                    if (curr !== expected) {
                                      ranges.push({ start: rangeStart, end: prev });
                                      rangeStart = curr;
                                    }
                                    prev = curr;
                                  }
                                  ranges.push({ start: rangeStart, end: prev });
                                  return ranges.map(({ start, end }) => (
                                    <span key={start + "-" + end} className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-full text-black shadow-sm">
                                      <span>
                                        {start === end
                                          ? start
                                          : `${start} bis ${end}`}
                                      </span>
                                      {/* Remove all dates in this range */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const datesToRemove: string[] = [];
                                          let d = new Date(start);
                                          const endDate = new Date(end);
                                          while (d <= endDate) {
                                            datesToRemove.push(d.toISOString().slice(0, 10));
                                            d.setDate(d.getDate() + 1);
                                          }
                                          setEmployees(prev => {
                                            const updated = [...prev];
                                            updated[idx].holidays = updated[idx].holidays?.filter(date => !datesToRemove.includes(date)) ?? [];
                                            return updated;
                                          });
                                        }}
                                        className="text-red-600 text-xs px-2 py-1 rounded-full hover:bg-red-50 transition"
                                        style={{ color: "#000" }}
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ));
                                })()}
                              </div>
                              <div className="mb-3 text-black">Services</div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                                {services.length === 0 ? (
                                  <div className="text-black text-sm">
                                    {salon?.uid ? 'Keine Services verfügbar. Erstellen Sie zuerst Services für Ihren Salon.' : 'Salon UID nicht gefunden.'}
                                  </div>
                                ) : (
                                  services.map(service => (
                                    <label key={service._id} className="flex items-center gap-2 text-black cursor-pointer hover:bg-gray-100 p-2 rounded-md transition">
                                      <input
                                        type="checkbox"
                                        checked={emp.services?.includes(service._id) ?? false}
                                        onChange={() => handleEmployeeServiceToggle(idx, service._id)}
                                        className="accent-primary-600 w-4 h-4"
                                      />
                                      <span className="select-none">{service.name}</span>
                                    </label>
                                  ))
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg shadow transition min-w-[120px] sm:min-w-[140px]"
              >
                Speichern
              </button>
            </div>
          </form>

          {/* Status Message */}
          {status && (
            <div
              className={`mt-8 flex items-center gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base ${
                status.startsWith("Fehler")
                  ? "bg-red-50 text-black border border-red-200"
                  : "bg-green-50 text-black border border-green-200"
              }`}
            >
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${
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
  );
}
