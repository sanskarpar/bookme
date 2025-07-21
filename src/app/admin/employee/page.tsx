"use client";
import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { initializeApp } from "firebase/app";
import Navbar from "../../../components/adminnavbar";

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
    }[];
  } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingDays, setWorkingDays] = useState<{ [key: string]: { open: boolean; start: string; end: string } }>(() =>
    Object.fromEntries(WEEKDAYS.map(day => [day, { open: day !== "Sonntag", start: "09:00", end: "18:00" }]))
  );
  const [employees, setEmployees] = useState<
    { name: string; email?: string; schedule: { [key: string]: { open: boolean; start: string; end: string } }, holidays?: string[], services?: string[] }[]
  >([]);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeEmail, setNewEmployeeEmail] = useState("");
  const [expandedEmployeeIdx, setExpandedEmployeeIdx] = useState<number | null>(null);
  const [newEmployeeHoliday, setNewEmployeeHoliday] = useState<{ [idx: number]: string }>({});
  const [services, setServices] = useState<{ _id: string; name: string }[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser?.email) {
        setLoading(true);
        try {
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
        holidays: []
      }
    ]);
    setNewEmployeeName("");
    setNewEmployeeEmail("");
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

  if (loading) {
    return (
      <>
        <Navbar user={user} />
        <main className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-black text-lg">Lade Mitarbeiter...</p>
          </div>
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Navbar user={user} />
        <main className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
          <div className="text-center p-6 bg-white rounded-lg shadow-sm max-w-md mx-4">
            <h2 className="text-xl font-semibold text-black mb-2">Bitte einloggen</h2>
            <p className="text-black mb-4">Melden Sie sich an, um die Mitarbeiter zu verwalten.</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar user={user} currentPath="/admin/employee" />
      <main className="min-h-screen bg-gray-50 font-sans p-0">
        <div className="max-w-4xl mx-auto py-8 px-2 sm:px-4 lg:px-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">
              Mitarbeiter Verwaltung
            </h1>
            <p className="text-black text-base sm:text-lg">
              Verwalten Sie Ihre Mitarbeiter, deren Arbeitszeiten und Services
            </p>
          </div>

          <form onSubmit={handleUpdate} className="space-y-8">
            {/* Employees Card */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-black mb-4 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-primary-600 text-white font-bold">E</span>
                Mitarbeiter & Arbeitszeiten
              </h3>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 flex-wrap">
                <input
                  type="text"
                  value={newEmployeeName}
                  onChange={e => setNewEmployeeName(e.target.value)}
                  placeholder="Name des Mitarbeiters"
                  className="border rounded-md px-2 py-2 sm:px-3 text-black font-semibold shadow-sm w-full sm:w-auto"
                  style={{ color: "#000" }}
                />
                <input
                  type="email"
                  value={newEmployeeEmail}
                  onChange={e => setNewEmployeeEmail(e.target.value)}
                  placeholder="E-Mail (optional)"
                  className="border rounded-md px-2 py-2 sm:px-3 text-black font-semibold shadow-sm w-full sm:w-auto"
                  style={{ color: "#000" }}
                />
                <button
                  type="button"
                  onClick={handleAddEmployee}
                  className="bg-primary-600 hover:bg-primary-700 px-4 sm:px-5 py-2 rounded-md font-semibold shadow-sm transition w-full sm:w-auto"
                  style={{ color: "#000" }}
                >
                  Hinzufügen
                </button>
              </div>
              {employees.length === 0 && (
                <div className="text-black text-sm mb-2">Keine Mitarbeiter eingetragen.</div>
              )}
              {employees.map((emp, idx) => (
                <div key={idx} className="mb-6 border rounded-lg p-4 bg-gray-50 shadow-sm">
                  <div className="flex items-center justify-between cursor-pointer gap-2" onClick={() => handleExpandEmployee(idx)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-black">{emp.name}</span>
                      {emp.email && (
                        <span className="text-xs text-black">({emp.email})</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); handleRemoveEmployee(idx); }}
                        className="text-xs text-red-600 px-2 py-1 rounded-md hover:bg-red-50 font-bold"
                        style={{ color: "#000" }}
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
                  </div>
                  {expandedEmployeeIdx === idx && (
                    <div className="mt-4">
                      <div className="mb-3 font-semibold text-black">Arbeitszeiten</div>
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
                              <tr key={day} className="bg-white border-b">
                                <td className="py-2 px-3 font-medium text-black">{day}</td>
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
                                    className="border rounded-md px-3 py-1 text-black bg-white font-semibold shadow-sm w-28"
                                    style={{ color: "#000" }}
                                  />
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <input
                                    type="time"
                                    value={emp.schedule[day]?.end ?? "18:00"}
                                    onChange={e => handleEmployeeScheduleChange(idx, day, "end", e.target.value)}
                                    disabled={!emp.schedule[day]?.open}
                                    className="border rounded-md px-3 py-1 text-black bg-white font-semibold shadow-sm w-28"
                                    style={{ color: "#000" }}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mb-3 font-semibold text-black mt-4">Feiertage / Urlaub</div>
                      <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 sm:gap-3 mb-3">
                        <input
                          type="date"
                          value={newEmployeeHoliday[idx] ?? ""}
                          onChange={e => handleEmployeeHolidayChange(idx, e.target.value)}
                          className="border rounded-md px-2 py-2 sm:px-3 text-black bg-white font-semibold shadow-sm w-full sm:w-auto"
                          style={{ color: "#000" }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddEmployeeHoliday(idx)}
                          className="bg-primary-600 hover:bg-primary-700 px-4 sm:px-5 py-2 rounded-md font-semibold shadow-sm transition w-full sm:w-auto"
                          style={{ color: "#000" }}
                        >
                          + Urlaubstag
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {(!emp.holidays || emp.holidays.length === 0) && <span className="text-black text-sm">Keine Urlaubstage eingetragen.</span>}
                        {emp.holidays?.map(date => (
                          <span key={date} className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-full text-black font-medium shadow-sm">
                            <span>{date}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveEmployeeHoliday(idx, date)}
                              className="text-red-600 text-xs px-2 py-1 rounded-full hover:bg-red-50 font-bold transition"
                              style={{ color: "#000" }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="mb-3 font-semibold text-black">Services</div>
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
                    </div>
                  )}
                </div>
              ))}
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
      </main>
    </>
  );
}
