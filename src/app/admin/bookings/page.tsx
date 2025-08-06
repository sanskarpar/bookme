"use client";
import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { initializeApp } from "firebase/app";
import Navbar from "../../../components/adminnavbar";
import Footer from "@/components/footer";
import { FiCalendar, FiClock, FiUser, FiScissors, FiPhone, FiMapPin, FiFilter, FiSearch } from "react-icons/fi";

// Constants
const COLORS = {
  primary: "#5C6F68",
  accent: "#E4DED5",
  text: "#1F1F1F",
  highlight: "#9DBE8D",
  background: "#FAFAFA",
  success: "#9DBE8D",
  warning: "#f2bd6eff",
  error: "#f36a60ff",
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

// Types
type Booking = {
  _id: string;
  salonId: string;
  salonUid: string;
  customerUid: string;
  services: {
    id: string;
    name: string;
    price: number;
    duration: number;
    employee: string;
  }[];
  date: string;
  time: string;
  total: number;
  customerName: string;
  customerPhone: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  customerAddress?: {
    street: string;
    number: string;
    zip: string;
    country: string;
  };
};

type Activity = {
  id: string;
  action: string;
  timestamp: string;
  user?: string;
};

export default function AdminBookingsPage() {
  const [user, setUser] = useState<any>(null);
  const [salon, setSalon] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent"); // Default to most recent
  const [showHistory, setShowHistory] = useState(false);
  const [viewingSalonUid, setViewingSalonUid] = useState<string | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showActivities, setShowActivities] = useState(false);

  // Get current user and fetch salon info and role
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser?.email) {
        setLoading(true);
        try {
          // Check if this is system admin viewing another salon's bookings
          const urlParams = new URLSearchParams(window.location.search);
          const salonUidParam = urlParams.get('salonUid');
          const isSystemUser = firebaseUser.email === "system@gmail.com";
          setIsSystemAdmin(isSystemUser);
          
          if (salonUidParam && isSystemUser) {
            // System admin viewing specific salon bookings
            setViewingSalonUid(salonUidParam);
            setUserRole("system");
            
            // Fetch the specific salon data
            const salonRes = await fetch(`/api/salons?uid=${encodeURIComponent(salonUidParam)}`);
            if (salonRes.ok) {
              const salonData = await salonRes.json();
              setSalon(salonData.salon);
              
              if (salonData.salon?.uid) {
                await fetchAllBookings(salonData.salon.uid);
              }
            }
          } else {
            // Normal salon user
            // Fetch user role
            const userRes = await fetch(`/api/users?email=${encodeURIComponent(firebaseUser.email)}`);
            if (userRes.ok) {
              const userData = await userRes.json();
              const role = typeof userData.role === "string"
                ? userData.role.trim().toLowerCase()
                : null;
              setUserRole(role);
            } else {
              setUserRole(null);
            }
            
            // Fetch salon info
            const res = await fetch(`/api/salons?email=${encodeURIComponent(firebaseUser.email)}`);
            if (!res.ok) throw new Error("Salon not found");
            const data = await res.json();
            
            const salonData = data.salon || data;
            setSalon(salonData);
            
            if (salonData?.uid) {
              await fetchAllBookings(salonData.uid);
            }
          }
          
        } catch (err) {
          console.error("Error fetching salon data:", err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchAllBookings = async (salonUid: string) => {
    try {
      const res = await fetch(`/api/bookings?salonUid=${encodeURIComponent(salonUid)}`);
      const data = await res.json();
      
      if (data.bookings) {
        // Sort bookings by date and time (most recent first)
        const sortedBookings = data.bookings.sort((a: Booking, b: Booking) => {
          const dateTimeA = new Date(`${a.date}T${a.time}`);
          const dateTimeB = new Date(`${b.date}T${b.time}`);
          return dateTimeB.getTime() - dateTimeA.getTime();
        });
        
        setBookings(sortedBookings);
        setFilteredBookings(sortedBookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  // Filter bookings based on search term, status, and date
  useEffect(() => {
    let filtered = bookings;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.customerPhone.includes(searchTerm) ||
        booking.services.some(service => 
          service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.employee.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      switch (dateFilter) {
        case "today":
          filtered = filtered.filter(booking => booking.date === todayStr);
          break;
        case "week":
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(booking => new Date(booking.date) >= weekAgo);
          break;
        case "month":
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(booking => new Date(booking.date) >= monthAgo);
          break;
      }
    }

    setFilteredBookings(filtered);
  }, [bookings, searchTerm, statusFilter, dateFilter]);

  // Sort bookings by selected sort option
  useEffect(() => {
    let sorted = [...bookings];
    const now = new Date();
    if (sortBy === "next") {
      sorted.sort((a, b) => {
        const aDate = new Date(`${a.date}T${a.time}`);
        const bDate = new Date(`${b.date}T${b.time}`);
        // Next booking first (future bookings ascending)
        return aDate.getTime() - bDate.getTime();
      });
    } else if (sortBy === "recent") {
      sorted.sort((a, b) => {
        const aDate = new Date(`${a.date}T${a.time}`);
        const bDate = new Date(`${b.date}T${b.time}`);
        // Most recent first (descending)
        return bDate.getTime() - aDate.getTime();
      });
    } else if (sortBy === "customer") {
      sorted.sort((a, b) => a.customerName.localeCompare(b.customerName));
    }
    setFilteredBookings(sorted);
  }, [bookings, sortBy]);

  const handleBookingAction = async (id: string, action: 'confirmed' | 'completed' | 'cancelled' | 'no-show') => {
    try {
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: id,
          status: action
        })
      });

      if (res.ok) {
        // Update local state
        setBookings(prev => 
          prev.map(booking => 
            booking._id === id ? { ...booking, status: action } : booking
          )
        );
        
        // If booking is completed, cancelled, or no-show, move to history
        if (action === 'completed' || action === 'cancelled' || action === 'no-show') {
          // Update filtered bookings to remove from current view if showing upcoming
          if (!showHistory) {
            setFilteredBookings(prev => prev.filter(booking => booking._id !== id));
          }
        }
      }
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#9DBE8D';
      case 'cancelled': return '#ef4444';
      case 'completed': return '#659ffdff';
      case 'no-show': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  // Fetch activities (recent bookings) for popup
  const fetchActivities = async (salonUid: string) => {
    try {
      const res = await fetch(`/api/bookings?salonUid=${encodeURIComponent(salonUid)}`);
      const data = await res.json();
      if (data.bookings) {
        const recentBookings = data.bookings
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 6);
        const recentActivities = recentBookings.map((booking: any) => {
          const timeAgo = getTimeAgo(new Date(booking.createdAt));
          const serviceName = booking.services[0]?.name || 'Dienstleistung';
          return {
            id: booking._id,
            action: `hat ${serviceName} für ${booking.date} gebucht`,
            timestamp: timeAgo,
            user: booking.customerName
          };
        });
        setActivities(recentActivities);
      }
    } catch (error) {
      setActivities([]);
    }
  };

  // Helper for "vor X Tagen"
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays > 0) {
      return `${diffInDays} Tag${diffInDays > 1 ? 'e' : ''} zuvor`;
    } else if (diffInHours > 0) {
      return `${diffInHours} Stunde${diffInHours > 1 ? 'n' : ''} zuvor`;
    } else {
      return 'Gerade eben';
    }
  };

  // Fetch activities when modal is opened
  useEffect(() => {
    if (showActivities && salon?.uid) {
      fetchActivities(salon.uid);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showActivities, salon?.uid]);

  // Export booking history as CSV
  const exportHistoryCSV = () => {
    if (!historyBookings.length) return;
    const headers = [
      "Datum", "Uhrzeit", "Kunde", "Telefon", "Adresse", "Dienstleistungen", "Mitarbeiter", "Dauer", "Status", "Gesamt"
    ];
    const rows = historyBookings.map(b => [
      b.date,
      b.time,
      b.customerName,
      b.customerPhone,
      // Include address if salon has storeCustomerAddress enabled and address is present
      salon?.storeCustomerAddress && b.customerAddress
        ? `${b.customerAddress.street} ${b.customerAddress.number}, ${b.customerAddress.zip} ${b.customerAddress.country}`
        : "",
      b.services.map(s => s.name).join(", "),
      b.services.map(s => s.employee).join(", "),
      b.services.reduce((sum, s) => sum + (s.duration || 0), 0), // total duration in minutes
      b.status,
      b.total
    ]);
    const csvContent =
      [headers, ...rows]
        .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
        .join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "buchungshistorie.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Only show booking history if not disabled in salon settings
  const bookingHistoryDisabled = salon?.disableBookingHistory === true;

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthPrompt />;
  }

  if (userRole && userRole !== "salon" && !isSystemAdmin) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <div className="text-center p-6 bg-white rounded-lg shadow-sm max-w-md mx-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You do not have permission to access this page.</p>
        </div>
      </main>
    );
  }

  // Split bookings into upcoming and history
  // Only show 'confirmed' bookings in upcoming, others in history
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingBookings = filteredBookings.filter(
    b => b.date >= todayStr && b.status === 'confirmed'
  );
  const historyBookings = filteredBookings.filter(
    b => b.status !== 'confirmed'
  );

  return (
    <>
      <Navbar
        user={user}
        currentPath="/admin/bookings"
        viewingSalonUid={viewingSalonUid}
        salonName={salon?.name}
        salon={salon} // <-- Pass salon object here
      />
      <main className="min-h-screen bg-gray-50 font-sans p-0">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                  <FiCalendar className="mr-3 text-[#5C6F68]" /> Alle Buchungen
                  {viewingSalonUid && isSystemAdmin && (
                    <span className="text-lg text-gray-600 block mt-1 ml-0">(System-Ansicht für {salon?.name})</span>
                  )}
                </h1>
                <p className="text-gray-600">
                  Verwalten und sehen Sie alle Ihre Salonbuchungen
                </p>
              </div>
              {/* Letzte Aktivitäten Button */}
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#E4DED5] text-[#5C6F68] font-medium shadow-sm hover:bg-[#d7d2c7] transition"
                onClick={() => setShowActivities(true)}
                type="button"
              >
                <FiUser className="w-4 h-4" />
                Letzte Aktivitäten
              </button>
            </div>
          </div>

          {/* Letzte Aktivitäten Modal */}
          {showActivities && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
              <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
                <button
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl"
                  onClick={() => setShowActivities(false)}
                  aria-label="Schließen"
                  type="button"
                >
                  ×
                </button>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FiUser className="mr-2" /> Letzte Aktivitäten
                </h2>
                <div className="space-y-4">
                  {activities.length > 0 ? activities.map((activity) => (
                    <div key={activity.id} className="flex items-start">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#E4DED5] flex items-center justify-center text-[#5C6F68]">
                        <FiScissors size={16} />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-700">
                          {activity.user && (
                            <span className="font-medium text-[#5C6F68]">{activity.user}</span>
                          )}{' '}
                          {activity.action}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-gray-500 text-sm">Keine aktuellen Aktivitäten</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Filters and Sort */}
          <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Suche Kunden, Dienstleistungen oder Mitarbeiter..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5C6F68] focus:border-transparent"
                  style={{ color: "#000" }}
                />
              </div>
              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5C6F68] focus:border-transparent"
                  style={{ color: "#000" }}
                >
                  <option value="all">Alle Status</option>
                  <option value="confirmed">Bestätigt</option>
                  <option value="completed">Abgeschlossen</option>
                  <option value="cancelled">Storniert</option>
                  <option value="no-show">Nicht erschienen</option>
                </select>
              </div>
              {/* Date Filter */}
              <div>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5C6F68] focus:border-transparent"
                  style={{ color: "#000" }}
                >
                  <option value="all">Gesamte Zeit</option>
                  <option value="today">Heute</option>
                  <option value="week">Diese Woche</option>
                  <option value="month">Diesen Monat</option>
                </select>
              </div>
              {/* Sort By */}
              <div>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5C6F68] focus:border-transparent"
                  style={{ color: "#000" }}
                >
                  <option value="next">Sortieren nach nächster Buchung</option>
                  <option value="recent">Sortieren nach zuletzt</option>
                  <option value="customer">Sortieren nach Kundenname</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${showHistory ? "bg-[#5C6F68] text-white" : "bg-gray-200 text-gray-700"}`}
                onClick={() => setShowHistory(v => !v)}
              >
                {showHistory ? "Zeige bevorstehende Buchungen" : "Zeige Buchungshistorie"}
              </button>
            </div>
          </div>

          {/* Bookings List */}
          <div className="space-y-4">
            {/* Upcoming Bookings */}
            {!showHistory && (
              upcomingBookings.length > 0 ? (
                upcomingBookings.map((booking) => (
                  <div key={booking._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-base font-semibold text-gray-900 flex items-center">
                            <FiUser className="w-4 h-4 mr-2 text-[#5C6F68]" />
                            {booking.customerName}
                          </h3>
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: getStatusColor(booking.status) }}
                          >
                            {booking.status === 'confirmed' && 'Bestätigt'}
                            {booking.status === 'completed' && 'Abgeschlossen'}
                            {booking.status === 'cancelled' && 'Storniert'}
                            {booking.status === 'no-show' && 'Nicht erschienen'}
                            {!['confirmed', 'completed', 'cancelled', 'no-show'].includes(booking.status) && booking.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-600 mb-2">
                          <div className="flex items-center">
                            <FiCalendar className="w-4 h-4 mr-1 text-[#5C6F68]" />
                            {formatDate(booking.date)}
                          </div>
                          <div className="flex items-center">
                            <FiClock className="w-4 h-4 mr-1 text-[#5C6F68]" />
                            {booking.time}
                          </div>
                          <div className="flex items-center">
                            <FiPhone className="w-4 h-4 mr-1 text-[#5C6F68]" />
                            {booking.customerPhone}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Services */}
                    <div className="border-t border-gray-200 pt-2 mb-2">
                      <h4 className="font-medium text-gray-900 mb-1 flex items-center text-sm">
                        <FiScissors className="w-4 h-4 mr-1 text-[#9DBE8D]" />
                        Dienstleistungen
                      </h4>
                      <div className={booking.services.length > 1 ? "flex flex-col gap-1" : "grid grid-cols-1 md:grid-cols-2 gap-1"}>
                        {booking.services.map((service, index) => (
                          <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                            <div>
                              <span className="font-medium text-gray-900 text-sm">{service.name}</span>
                              <div className="text-xs text-gray-500">
                                {service.employee} • {service.duration} Minuten
                              </div>
                            </div>
                            <span className="font-medium text-[#5C6F68] text-sm">€{service.price}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                        <span className="font-medium text-gray-900 text-sm">Gesamt</span>
                        <span className="text-base font-bold text-[#5C6F68]">€{booking.total}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-1">
                      {booking.status === 'confirmed' && (
                        <>
                          <button
                            onClick={() => handleBookingAction(booking._id, 'completed')}
                            className="bg-green-50 text-green-700 hover:bg-green-100 px-2 py-0.5 rounded-md text-xs font-medium transition-colors"
                          >
                            Als abgeschlossen markieren
                          </button>
                          <button
                            onClick={() => handleBookingAction(booking._id, 'no-show')}
                            className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100 px-2 py-0.5 rounded-md text-xs font-medium transition-colors"
                          >
                            Als nicht erschienen markieren
                          </button>
                          <button
                            onClick={() => handleBookingAction(booking._id, 'cancelled')}
                            className="bg-red-50 text-red-700 hover:bg-red-100 px-2 py-0.5 rounded-md text-xs font-medium transition-colors"
                          >
                            Stornieren
                          </button>
                        </>
                      )}
                      {booking.status !== 'confirmed' && booking.status !== 'completed' && (
                        <button
                          onClick={() => handleBookingAction(booking._id, 'confirmed')}
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-0.5 rounded-md text-xs font-medium transition-colors"
                        >
                          Wiederherstellen
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 bg-white rounded-lg">
                  <FiCalendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">Keine bevorstehenden Buchungen gefunden</h3>
                  <p className="text-gray-600">
                    {searchTerm || statusFilter !== "all" || dateFilter !== "all" 
                      ? "Versuchen Sie, Ihre Filter anzupassen, um mehr Buchungen zu sehen."
                      : "Sie haben noch keine bevorstehenden Buchungen."
                    }
                  </p>
                </div>
              )
            )}

            {/* Booking History */}
            {showHistory && (
              bookingHistoryDisabled ? (
                <div className="text-center py-16 bg-white rounded-lg">
                  <FiCalendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">Buchungshistorie deaktiviert</h3>
                  <p className="text-gray-600">
                    Die Anzeige der Buchungshistorie ist für diesen Salon deaktiviert.
                  </p>
                </div>
              ) : historyBookings.length > 0 ? (
                <>
                  <div className="flex justify-end gap-2 mb-2">
                    <button
                      onClick={exportHistoryCSV}
                      className="bg-[#5C6F68] text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-[#4a5a54] transition"
                      type="button"
                    >
                      Export als CSV
                    </button>
                  </div>
                  {historyBookings.map((booking) => (
                    <div key={booking._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-base font-semibold text-gray-900 flex items-center">
                              <FiUser className="w-4 h-4 mr-2 text-[#5C6F68]" />
                              {booking.customerName}
                            </h3>
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: getStatusColor(booking.status) }}
                            >
                              {booking.status === 'confirmed' && 'Bestätigt'}
                              {booking.status === 'completed' && 'Abgeschlossen'}
                              {booking.status === 'cancelled' && 'Storniert'}
                              {booking.status === 'no-show' && 'Nicht erschienen'}
                              {!['confirmed', 'completed', 'cancelled', 'no-show'].includes(booking.status) && booking.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-600 mb-2">
                            <div className="flex items-center">
                              <FiCalendar className="w-4 h-4 mr-1 text-[#5C6F68]" />
                              {formatDate(booking.date)}
                            </div>
                            <div className="flex items-center">
                              <FiClock className="w-4 h-4 mr-1 text-[#5C6F68]" />
                              {booking.time}
                            </div>
                            <div className="flex items-center">
                              <FiPhone className="w-4 h-4 mr-1 text-[#5C6F68]" />
                              {booking.customerPhone}
                            </div>
                            {/* Show address if salon allows and address is present */}
                            {salon?.storeCustomerAddress && booking.customerAddress && (
                              <div className="flex items-center md:col-span-3">
                                <FiMapPin className="w-4 h-4 mr-1 text-[#5C6F68]" />
                                <span className="text-xs">
                                  {booking.customerAddress.street} {booking.customerAddress.number}, {booking.customerAddress.zip} {booking.customerAddress.country}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Services */}
                      <div className="border-t border-gray-200 pt-2 mb-2">
                        <h4 className="font-medium text-gray-900 mb-1 flex items-center text-sm">
                          <FiScissors className="w-4 h-4 mr-1 text-[#9DBE8D]" />
                          Dienstleistungen
                        </h4>
                        <div className={booking.services.length > 1 ? "flex flex-col gap-1" : "grid grid-cols-1 md:grid-cols-2 gap-1"}>
                          {booking.services.map((service, index) => (
                            <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                              <div>
                                <span className="font-medium text-gray-900 text-sm">{service.name}</span>
                                <div className="text-xs text-gray-500">
                                  {service.employee} • {service.duration} Minuten
                                </div>
                              </div>
                              <span className="font-medium text-[#5C6F68] text-sm">€{service.price}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                          <span className="font-medium text-gray-900 text-sm">Gesamt</span>
                          <span className="text-base font-bold text-[#5C6F68]">€{booking.total}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-1">
                        {booking.status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => handleBookingAction(booking._id, 'completed')}
                              className="bg-green-50 text-green-700 hover:bg-green-100 px-2 py-0.5 rounded-md text-xs font-medium transition-colors"
                            >
                              Als abgeschlossen markieren
                            </button>
                            <button
                              onClick={() => handleBookingAction(booking._id, 'no-show')}
                              className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100 px-2 py-0.5 rounded-md text-xs font-medium transition-colors"
                            >
                              Als nicht erschienen markieren
                            </button>
                            <button
                              onClick={() => handleBookingAction(booking._id, 'cancelled')}
                              className="bg-red-50 text-red-700 hover:bg-red-100 px-2 py-0.5 rounded-md text-xs font-medium transition-colors"
                            >
                              Stornieren
                            </button>
                          </>
                        )}
                        {booking.status !== 'confirmed' && booking.status !== 'completed' && (
                          <button
                            onClick={() => handleBookingAction(booking._id, 'confirmed')}
                            className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-0.5 rounded-md text-xs font-medium transition-colors"
                          >
                            Wiederherstellen
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-16 bg-white rounded-lg">
                  <FiCalendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">Keine Buchungshistorie gefunden</h3>
                  <p className="text-gray-600">
                    {searchTerm || statusFilter !== "all" || dateFilter !== "all" 
                      ? "Versuchen Sie, Ihre Filter anzupassen, um mehr Buchungen zu sehen."
                      : "Keine vorherigen Buchungen gefunden."
                    }
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

// Loading screen component
const LoadingScreen = () => (
  <main className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#5C6F68] mx-auto mb-4"></div>
      <p className="text-[#5C6F68] text-lg">Buchungen werden geladen...</p>
    </div>
  </main>
);

const AuthPrompt = () => (
  <main className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
    <div className="text-center p-6 bg-white rounded-lg shadow-sm max-w-md mx-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff eingeschränkt</h2>
      <p className="text-gray-600 mb-4">Bitte melden Sie sich an, um die Buchungsseite zu sehen</p>
      <button className="bg-[#5C6F68] hover:bg-[#4a5a54] text-white font-medium py-2 px-4 rounded-md">
        Anmelden
      </button>
    </div>
  </main>
);
  