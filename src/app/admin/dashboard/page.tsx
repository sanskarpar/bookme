"use client";
import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { initializeApp } from "firebase/app";
import Navbar from "../../../components/adminnavbar";
import { FiCalendar, FiDollarSign, FiTrendingUp, FiStar, FiClock, FiUser, FiScissors, FiChevronDown, FiChevronUp } from "react-icons/fi";

// Constants
const COLORS = {
  primary: "#5C6F68",
  accent: "#E4DED5",
  text: "#1F1F1F",
  highlight: "#9DBE8D",
  background: "#FAFAFA",
  success: "#4CAF50",
  warning: "#FF9800",
  error: "#F44336",
};

const NAV_LINKS = [
  { name: "Analytics", href: "/admin/analytics" },
  { name: "Bookings", href: "/admin/bookings" },
  { name: "Dashboard", href: "/admin/dashboard" },
  { name: "Reviews", href: "/admin/reviews" },
  { name: "Services", href: "/admin/services" },
  { name: "Settings", href: "/admin/settings" },
];

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
  id: string;
  time: string;
  service: string;
  customer: string;
  status: 'upcoming' | 'completed' | 'no-show';
  employee?: string;
};

type CalendarBooking = {
  id: string;
  time: string;
  endTime: string;
  service: string;
  customer: string;
  status: 'upcoming' | 'completed' | 'no-show' | 'confirmed';
  date: string;
  employee?: string;
};

type StatCard = {
  id: string;
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  change?: string;
};

type Activity = {
  id: string;
  action: string;
  timestamp: string;
  user?: string;
};

export default function SalonDashboard() {
  const [user, setUser] = useState<any>(null);
  const [salon, setSalon] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [stats, setStats] = useState<StatCard[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [weeklyBookings, setWeeklyBookings] = useState<{ day: string; count: number }[]>([]);
  const [calendarBookings, setCalendarBookings] = useState<CalendarBooking[]>([]);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false); // NEW

  // Get current user and fetch salon info and role
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser?.email) {
        setLoading(true);
        try {
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
          
          // Fix: data.salon instead of data
          const salonData = data.salon || data;
          setSalon(salonData);
          
          console.log('Salon data:', salonData); // Debug log
          
          if (salonData?.uid) {
            // Get today's date in correct format
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            console.log('Today\'s date string:', todayStr);
            
            await fetchTodayBookings(salonData.uid, todayStr);
            
            // Fetch stats and activities
            await fetchStats(salonData.uid);
            await fetchActivities(salonData.uid);
          } else {
            console.error('No salon UID found:', salonData);
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

  const fetchTodayBookings = async (salonUid: string, date: string) => {
    try {
      console.log('Fetching today\'s bookings for date:', date, 'salonUid:', salonUid);
      
      // Fetch all bookings for this salon
      const res = await fetch(`/api/bookings?salonUid=${encodeURIComponent(salonUid)}`);
      const data = await res.json();
      
      console.log('All bookings response:', data);

      if (data.bookings) {
        // Transform all bookings for calendar
        const allCalendarBookings = data.bookings.map((booking: any) => {
          const startTime = booking.time;
          const duration = booking.services.reduce((total: number, service: any) => total + (service.duration || 30), 0);
          const [hours, minutes] = startTime.split(':').map(Number);
          const endMinutes = hours * 60 + minutes + duration;
          const endHours = Math.floor(endMinutes / 60);
          const endMins = endMinutes % 60;
          const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

          // Get unique employee names for this booking
          const employeeNames = Array.from(
            new Set(
              (booking.services || [])
                .map((s: any) => s.employee)
                .filter(Boolean)
            )
          ).join(', ');

          return {
            id: booking._id,
            time: startTime,
            endTime: endTime,
            service: booking.services.map((s: any) => s.name).join(', '),
            customer: booking.customerName,
            status: booking.status === 'confirmed' ? 'upcoming' : booking.status,
            date: booking.date,
            employee: employeeNames // add employee field
          };
        });

        setCalendarBookings(allCalendarBookings);

        // Filter for today's bookings for the table
        const todayBookingsRaw = data.bookings.filter((b: any) => {
          const matches = String(b.date) === String(date);
          return matches;
        });

        const transformedBookings = todayBookingsRaw.map((booking: any) => {
          const employeeNames = Array.from(
            new Set(
              (booking.services || [])
                .map((s: any) => s.employee)
                .filter(Boolean)
            )
          ).join(', ');
          return {
            id: booking._id,
            time: booking.time,
            service: booking.services.map((s: any) => s.name).join(', '),
            customer: booking.customerName,
            status: booking.status === 'confirmed' ? 'upcoming' : booking.status,
            employee: employeeNames // add employee field
          };
        });

        transformedBookings.sort((a: any, b: any) => a.time.localeCompare(b.time));
        setTodayBookings(transformedBookings);
      }
    } catch (error) {
      console.error('Error fetching today\'s bookings:', error);
      setTodayBookings([]);
      setCalendarBookings([]);
    }
  };

  const fetchStats = async (salonUid: string) => {
    try {
      // Get today's date
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // Fetch all bookings for this salon
      const res = await fetch(`/api/bookings?salonUid=${encodeURIComponent(salonUid)}`);
      const data = await res.json();

      // Fetch actual average rating from reviews API
      let avgRating = "0.0";
      try {
        const reviewsRes = await fetch(`/api/reviews?salonUid=${encodeURIComponent(salonUid)}`);
        const reviewsData = await reviewsRes.json();
        if (typeof reviewsData.averageRating === "number") {
          avgRating = reviewsData.averageRating.toFixed(1);
        }
      } catch (err) {
        avgRating = "0.0";
      }

      if (data.bookings) {
        const bookings = data.bookings;

        // Bookings today (all except cancelled)
        const todayBookings = bookings.filter((booking: any) => String(booking.date) === todayStr && booking.status !== 'cancelled');
        // Completed bookings today for revenue
        const todayCompletedBookings = todayBookings.filter((booking: any) => booking.status === 'completed');

        // Calculate daily revenue
        const todayRevenue = todayCompletedBookings.reduce((sum: number, booking: any) => sum + (booking.total || 0), 0);

        // Find most popular service (from all bookings, regardless of status)
        const serviceCount: {[key: string]: number} = {};
        bookings.forEach((booking: any) => {
          if (Array.isArray(booking.services)) {
            booking.services.forEach((service: any) => {
              serviceCount[service.name] = (serviceCount[service.name] || 0) + 1;
            });
          }
        });
        const popularService = Object.keys(serviceCount).length > 0
          ? Object.keys(serviceCount).reduce((a, b) => serviceCount[a] > serviceCount[b] ? a : b)
          : 'Noch keine Dienstleistungen';

        setStats([
          {
            id: 'bookings',
            title: 'Buchungen heute',
            value: todayBookings.length,
            icon: <FiCalendar size={24} />
          },
          {
            id: 'revenue',
            title: 'Tageseinnahmen',
            value: `€${todayRevenue}`,
            icon: <FiDollarSign size={24} />
          },
          {
            id: 'popular',
            title: 'Beliebteste Dienstleistung',
            value: popularService,
            icon: <FiTrendingUp size={24} />
          },
          {
            id: 'rating',
            title: 'Durchschnittliche Bewertung',
            value: avgRating,
            icon: <FiStar size={24} />
          },
        ]);

        // Weekly bookings trend (all except cancelled)
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Calculate start and end of current week (Sunday to Saturday)
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const weeklyCounts: { [key: string]: number } = {};
        bookings.forEach((booking: any) => {
          const bookingDate = new Date(booking.date);
          bookingDate.setHours(0, 0, 0, 0);
          if (
            booking.status !== 'cancelled' &&
            bookingDate >= startOfWeek &&
            bookingDate <= endOfWeek
          ) {
            const dayName = dayNames[bookingDate.getDay()];
            weeklyCounts[dayName] = (weeklyCounts[dayName] || 0) + 1;
          }
        });
        const weeklyBookingsArr = dayNames.map(day => ({
          day,
          count: weeklyCounts[day] || 0,
        }));
        setWeeklyBookings(weeklyBookingsArr);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchActivities = async (salonUid: string) => {
    try {
      // Fetch recent bookings for activity feed
      const res = await fetch(`/api/bookings?salonUid=${encodeURIComponent(salonUid)}`);
      const data = await res.json();
      
      if (data.bookings) {
        const recentBookings = data.bookings
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 4);
        
        const recentActivities = recentBookings.map((booking: any, index: number) => {
          const timeAgo = getTimeAgo(new Date(booking.createdAt));
          const serviceName = booking.services[0]?.name || 'Dienstleistung';
          // German: "{user} hat {service} für {date} gebucht"
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
      console.error('Error fetching activities:', error);
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const handleBookingAction = (id: string, action: 'complete' | 'no-show') => {
    setTodayBookings(prev => 
      prev.map(booking => 
        booking.id === id 
          ? { ...booking, status: action === 'complete' ? 'completed' : 'no-show' } 
          : booking
      )
    );
    
    // Update booking status in database
    fetch('/api/bookings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: id,
        status: action === 'complete' ? 'completed' : 'no-show'
      })
    }).catch(console.error);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthPrompt />;
  }

  if (userRole && userRole !== "salon") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <div className="text-center p-6 bg-white rounded-lg shadow-sm max-w-md mx-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You do not have permission to access this page.</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <Navbar user={user} currentPath="/admin/dashboard" />
      <main className="min-h-screen bg-gray-50 font-sans p-0">
        <div className="max-w-6xl mx-auto py-6 px-2 sm:px-4 lg:px-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Willkommen zurück, {salon?.name || 'Saloninhaber'}
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Das passiert heute in Ihrem Salon.
            </p>
          </div>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {stats.map((stat) => (
              <StatCard key={stat.id} stat={stat} />
            ))}
          </div>
          {/* Today's Bookings */}
          <section className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                <FiClock className="mr-2" /> Buchungen heute
              </h2>
              <span className="text-xs sm:text-sm text-gray-500">
                {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uhrzeit</th>
                      <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dienstleistung</th>
                      <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kunde</th>
                      <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mitarbeiter</th>
                      <th className="px-2 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {todayBookings.length > 0 ? (
                      todayBookings.map((booking) => (
                        <tr key={booking.id} className={booking.status !== 'upcoming' ? 'opacity-50' : ''}>
                          <td className="px-2 sm:px-6 py-3 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                            {booking.time}
                          </td>
                          <td className="px-2 sm:px-6 py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            {booking.service}
                          </td>
                          <td className="px-2 sm:px-6 py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            {booking.customer}
                          </td>
                          <td className="px-2 sm:px-6 py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            {booking.employee || <span className="italic text-gray-400">-</span>}
                          </td>
                          <td className="px-2 sm:px-6 py-3 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                            {booking.status === 'upcoming' && (
                              <div className="space-x-1 sm:space-x-2 flex flex-col sm:flex-row gap-1 sm:gap-0">
                                <button
                                  onClick={() => handleBookingAction(booking.id, 'complete')}
                                  className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-2 sm:px-3 py-1 rounded-md text-xs font-medium"
                                >
                                  Abschließen
                                </button>
                                <button
                                  onClick={() => handleBookingAction(booking.id, 'no-show')}
                                  className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 sm:px-3 py-1 rounded-md text-xs font-medium"
                                >
                                  Nicht erschienen
                                </button>
                              </div>
                            )}
                            {booking.status === 'completed' && (
                              <span className="text-green-600 bg-green-50 px-2 py-1 rounded-md text-xs font-medium">
                                Abgeschlossen
                              </span>
                            )}
                            {booking.status === 'no-show' && (
                              <span className="text-red-600 bg-red-50 px-2 py-1 rounded-md text-xs font-medium">
                                Nicht erschienen
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-2 sm:px-6 py-4 text-center text-xs sm:text-sm text-gray-500">
                          Keine Buchungen für heute geplant
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Calendar Widget */}
            <section className="bg-white p-4 sm:p-6 rounded-lg shadow-sm mb-6 lg:mb-0">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                    <FiCalendar className="mr-2" /> Buchungskalender
                  </h2>
                  <p className="text-gray-500 mt-1 text-xs sm:text-sm">
                    {'Heutige Termine'}
                  </p>
                </div>
                <button
                  onClick={() => setIsCalendarModalOpen(true)}
                  className="flex items-center text-black hover:text-gray-900 text-sm font-medium"
                >
                  {'Erweitern'}
                  <FiChevronDown className="ml-1" />
                </button>
              </div>
              <CalendarWidget 
                bookings={calendarBookings} 
                isExpanded={false}
                salon={salon}
              />
            </section>

            {/* Recent Activity */}
            <section className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center mb-3 sm:mb-4">
                <FiUser className="mr-2" /> Letzte Aktivitäten
              </h2>
              <div className="space-y-3 sm:space-y-4">
                {activities.length > 0 ? activities.map((activity) => (
                  <div key={activity.id} className="flex items-start">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                      <FiScissors size={16} />
                    </div>
                    <div className="ml-2 sm:ml-3">
                      <p className="text-xs sm:text-sm text-gray-700">
                        {activity.user && (
                          <span className="font-medium text-primary-600">{activity.user}</span>
                        )}{' '}
                        {activity.action}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-500 text-xs sm:text-sm">Keine aktuellen Aktivitäten</p>
                )}
              </div>
            </section>
          </div>
        </div>
        {/* Calendar Modal */}
        {isCalendarModalOpen && (
          <CalendarModal
            bookings={calendarBookings}
            salon={salon}
            onClose={() => setIsCalendarModalOpen(false)}
          />
        )}
      </main>
    </>
  );
}

// Component for stat cards
const StatCard = ({ stat }: { stat: StatCard }) => {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm mb-2 sm:mb-0">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm font-medium text-gray-500">{stat.title}</p>
          <p className="mt-1 text-xl sm:text-2xl font-semibold text-gray-900">{stat.value}</p>
        </div>
        <div className="p-2 sm:p-3 rounded-full bg-primary-50 text-primary-600">
          {stat.icon}
        </div>
      </div>
    </div>
  );
};

// Loading screen component
const LoadingScreen = () => (
  <main className="min-h-screen bg-gray-50 flex items-center justify-center font-sans px-2">
    <div className="text-center">
      <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
      <p className="text-primary-600 text-base sm:text-lg">Dashboard wird geladen...</p>
    </div>
  </main>
);

const AuthPrompt = () => (
  <main className="min-h-screen bg-gray-50 flex items-center justify-center font-sans px-2">
    <div className="text-center p-4 sm:p-6 bg-white rounded-lg shadow-sm max-w-md mx-2 sm:mx-4">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Zugriff eingeschränkt</h2>
      <p className="text-gray-600 mb-4 text-xs sm:text-base">Bitte melden Sie sich an, um das Salon-Dashboard zu sehen</p>
      <button className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md w-full sm:w-auto">
        Anmelden
      </button>
    </div>
  </main>
);

// Calendar Modal Component
const CalendarModal = ({
  bookings,
  salon,
  onClose,
}: {
  bookings: CalendarBooking[];
  salon: any;
  onClose: () => void;
}) => {
  // Prevent background scroll when modal is open
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Handle click outside to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50"
      onClick={handleOverlayClick}
    >
      <div className="relative bg-white rounded-2xl shadow-xl max-w-7xl w-full mx-6 max-h-[95vh] overflow-hidden">
        <div className="border-b border-gray-100 px-8 py-6 bg-gradient-to-r from-slate-50 to-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                Calendar Overview
              </h2>
              <p className="text-sm text-gray-600">
                {salon?.name} • {new Date().toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all duration-200"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-8 overflow-auto" style={{ maxHeight: "calc(95vh - 140px)" }}>
          <EnhancedCalendarWidget
            bookings={bookings}
            salon={salon}
          />
        </div>
      </div>
    </div>
  );
};

// Enhanced Calendar Widget Component
const EnhancedCalendarWidget = ({ 
  bookings, 
  salon 
}: { 
  bookings: CalendarBooking[], 
  salon: any 
}) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  // Get week days starting from Monday
  const getWeekDays = (baseDate: Date) => {
    const startOfWeek = new Date(baseDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday
    startOfWeek.setDate(diff);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      // Get German day name for working days lookup
      const germanDayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
      const germanDayName = germanDayNames[date.getDay()];
      
      // Check if salon is open on this day
      const workingDay = salon?.workingDays?.[germanDayName];
      const isOpen = workingDay?.open || false;
      
      // Check if it's a holiday
      const isHoliday = salon?.holidays?.includes(dateStr) || false;
      
      weekDays.push({
        date: dateStr,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        isToday: date.toDateString() === new Date().toDateString(),
        isCurrentMonth: date.getMonth() === baseDate.getMonth(),
        isOpen: isOpen && !isHoliday,
        isHoliday: isHoliday,
        workingHours: isOpen && !isHoliday ? {
          start: workingDay.start || '09:00',
          end: workingDay.end || '18:00'
        } : null,
        germanDayName
      });
    }
    return weekDays;
  };

  const weekDays = getWeekDays(currentWeek);
  
  // Generate time slots based on salon's earliest and latest hours
  const getTimeSlots = () => {
    let earliestHour = 24;
    let latestHour = 0;
    
    // Find the earliest start and latest end time across all working days
    weekDays.forEach(day => {
      if (day.workingHours) {
        const startHour = parseInt(day.workingHours.start.split(':')[0]);
        const endHour = parseInt(day.workingHours.end.split(':')[0]);
        earliestHour = Math.min(earliestHour, startHour);
        latestHour = Math.max(latestHour, endHour);
      }
    });
    
    // Default to 7-21 if no working hours found
    if (earliestHour === 24) earliestHour = 7;
    if (latestHour === 0) latestHour = 21;
    
    // Extend range slightly for better visibility
    earliestHour = Math.max(7, earliestHour - 1);
    latestHour = Math.min(22, latestHour + 1);
    
    const timeSlots: string[] = [];
    for (let hour = earliestHour; hour <= latestHour; hour++) {
      timeSlots.push(`${String(hour).padStart(2, '0')}:00`);
      if (hour < latestHour) timeSlots.push(`${String(hour).padStart(2, '0')}:30`);
    }
    return timeSlots;
  };

  const timeSlots = getTimeSlots();

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  const getBookingsForSlot = (date: string, time: string) => {
    return bookings.filter(booking => {
      if (booking.date !== date) return false;
      
      const bookingStart = booking.time;
      const bookingEnd = booking.endTime;
      
      // Check if this time slot overlaps with the booking
      return bookingStart <= time && bookingEnd > time;
    });
  };

  // Check if a time slot is within working hours
  const isTimeSlotAvailable = (day: any, time: string) => {
    if (!day.isOpen || day.isHoliday || !day.workingHours) return false;
    
    const slotTime = time;
    const startTime = day.workingHours.start;
    const endTime = day.workingHours.end;
    
    return slotTime >= startTime && slotTime < endTime;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
      case 'confirmed':
        return 'bg-blue-50 text-blue-800 border-l-4 border-blue-500';
      case 'completed':
        return 'bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500';
      case 'no-show':
        return 'bg-red-50 text-red-800 border-l-4 border-red-500';
      default:
        return 'bg-gray-50 text-gray-800 border-l-4 border-gray-400';
    }
  };

  const getBookingDuration = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return Math.max(1, Math.ceil((endMinutes - startMinutes) / 30)); // Minimum 1 slot
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header with Navigation */}
      <div className="flex items-center justify-between bg-slate-50 p-5 rounded-xl border border-slate-200">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all duration-200 shadow-sm border border-transparent hover:border-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h3 className="text-lg font-semibold text-gray-900">
            {currentWeek.toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </h3>
          
          <button
            onClick={() => navigateWeek('next')}
            className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all duration-200 shadow-sm border border-transparent hover:border-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <button
          onClick={goToToday}
          className="px-4 py-2 text-sm font-medium text-blue-700 hover:text-blue-800 bg-white hover:bg-blue-50 border border-blue-200 hover:border-blue-300 rounded-lg transition-all duration-200 shadow-sm"
        >
          Today
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 text-sm bg-white p-4 rounded-xl border border-gray-100">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-sm mr-2 shadow-sm"></div>
          <span className="text-gray-700 font-medium">Upcoming</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-emerald-500 rounded-sm mr-2 shadow-sm"></div>
          <span className="text-gray-700 font-medium">Completed</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-sm mr-2 shadow-sm"></div>
          <span className="text-gray-700 font-medium">No Show</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-gray-300 rounded-sm mr-2 shadow-sm"></div>
          <span className="text-gray-700 font-medium">Closed/Holiday</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Week header */}
        <div className="grid grid-cols-8 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
          <div className="p-4 text-center border-r border-gray-200">
            <span className="text-sm font-semibold text-gray-600">Time</span>
          </div>
          {weekDays.map(day => (
            <div 
              key={day.date} 
              className={`p-4 text-center border-r border-gray-200 last:border-r-0 ${
                day.isToday 
                  ? 'bg-blue-100 text-blue-900' 
                  : day.isCurrentMonth 
                    ? 'text-gray-900' 
                    : 'text-gray-400'
              } ${
                day.isHoliday
                  ? 'bg-red-50 border-red-100'
                  : !day.isOpen
                    ? 'bg-gray-100 opacity-60'
                    : ''
              }`}
            >
              <div className="text-xs font-medium uppercase tracking-wider mb-1">{day.dayName}</div>
              <div className={`text-xl font-bold ${day.isToday ? 'text-blue-800' : ''}`}>
                {day.dayNumber}
              </div>
              {day.isHoliday && (
                <div className="text-xs text-red-600 font-medium mt-1">Holiday</div>
              )}
              {!day.isOpen && !day.isHoliday && (
                <div className="text-xs text-gray-500 font-medium mt-1">Closed</div>
              )}
              {day.workingHours && (
                <div className="text-xs text-gray-600 mt-1">
                  {day.workingHours.start}-{day.workingHours.end}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Time slots grid */}
        <div className="relative">
          {timeSlots.map((time, timeIndex) => (
            <div key={time} className="grid grid-cols-8 border-b border-gray-100 last:border-b-0 min-h-[70px]">
              <div className="p-4 text-right border-r border-gray-200 bg-slate-25 flex items-center justify-end">
                <span className="text-sm text-gray-600 font-mono font-medium">{time}</span>
              </div>
              {weekDays.map((day, dayIndex) => {
                const slotBookings = getBookingsForSlot(day.date, time);
                const isAvailable = isTimeSlotAvailable(day, time);
                
                return (
                  <div 
                    key={`${day.date}-${time}`} 
                    className={`relative border-r border-gray-200 last:border-r-0 p-1 ${
                      day.isToday ? 'bg-blue-25' : ''
                    } ${
                      !isAvailable 
                        ? 'bg-gray-100 opacity-50' 
                        : 'hover:bg-gray-25 transition-colors duration-150'
                    } ${
                      day.isHoliday ? 'bg-red-25' : ''
                    }`}
                  >
                    {/* Grey overlay for unavailable slots */}
                    {!isAvailable && (
                      <div className="absolute inset-0 bg-gray-200 opacity-30 pointer-events-none"></div>
                    )}
                    
                    {slotBookings.map(booking => {
                      const duration = getBookingDuration(booking.time, booking.endTime);
                      const isFirstSlot = booking.time === time;
                      
                      if (!isFirstSlot) return null; // Only render on first slot
                      
                      return (
                        <div
                          key={booking.id}
                          className={`absolute inset-x-1.5 rounded-lg p-3 ${getStatusColor(booking.status)} hover:shadow-md transition-all duration-200 cursor-pointer group z-10`}
                          style={{
                            height: `${duration * 70 - 8}px`
                          }}
                          title={`${booking.customer} - ${booking.service}`}
                        >
                          <div className="text-sm font-semibold truncate group-hover:font-bold transition-all">
                            {booking.customer}
                          </div>
                          <div className="text-xs text-gray-600 truncate mt-1 font-medium">
                            {booking.service}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-6 rounded-xl border border-slate-200">
        <h4 className="font-semibold text-gray-900 mb-4 text-lg">Weekly Summary</h4>
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map(day => {
            const dayBookings = bookings.filter(b => b.date === day.date);
            return (
              <div key={day.date} className={`text-center p-3 rounded-lg shadow-sm border ${
                day.isHoliday 
                  ? 'bg-red-50 border-red-200' 
                  : !day.isOpen 
                    ? 'bg-gray-100 border-gray-200 opacity-60' 
                    : 'bg-white border-gray-100'
              }`}>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">{day.dayName}</div>
                <div className={`text-2xl font-bold mb-1 ${
                  day.isHoliday ? 'text-red-600' : !day.isOpen ? 'text-gray-400' : 'text-gray-900'
                }`}>
                  {day.isHoliday ? '🏖️' : !day.isOpen ? '❌' : dayBookings.length}
                </div>
                <div className={`text-xs font-medium ${(!day.isHoliday && day.isOpen) ? 'text-black' : ''}`}>
                  {day.isHoliday 
                    ? 'Holiday' 
                    : !day.isOpen 
                      ? 'Closed' 
                      : dayBookings.length === 1 
                        ? 'Appointment' 
                        : 'Appointments'
                  }
                </div>
                {day.workingHours && (
                  <div className="text-xs text-gray-500 mt-1">
                    {day.workingHours.start}-{day.workingHours.end}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Calendar Widget Component (simplified for daily view)
const CalendarWidget = ({ bookings, isExpanded, salon }: { 
  bookings: CalendarBooking[], 
  isExpanded: boolean,
  salon: any 
}) => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  // Check if salon is open today
  const germanDayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const todayGermanName = germanDayNames[today.getDay()];
  const todayWorkingDay = salon?.workingDays?.[todayGermanName];
  const isOpenToday = todayWorkingDay?.open || false;
  const isTodayHoliday = salon?.holidays?.includes(todayStr) || false;
  const canTakeBookingsToday = isOpenToday && !isTodayHoliday;
  
  // For daily view only
  const todayBookings = bookings.filter(b => b.date === todayStr);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
      case 'confirmed':
        return 'bg-blue-50 text-blue-800 border-l-4 border-blue-500';
      case 'completed':
        return 'bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500';
      case 'no-show':
        return 'bg-red-50 text-red-800 border-l-4 border-red-500';
      default:
        return 'bg-gray-50 text-gray-800 border-l-4 border-gray-400';
    }
  };

  return (
    <div className="space-y-4" style={{ minHeight: "200px", maxHeight: "400px", overflowY: "auto" }}>
      <div className={`text-center py-4 rounded-xl border mb-4 ${
        isTodayHoliday 
          ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-100'
          : !canTakeBookingsToday
            ? 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-100'
            : 'bg-gradient-to-r from-blue-50 to-slate-50 border-blue-100'
      }`}>
        <h3 className={`font-semibold text-lg mb-1 ${
          isTodayHoliday ? 'text-red-900' : !canTakeBookingsToday ? 'text-gray-700' : 'text-blue-900'
        }`}>
          {today.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h3>
        {isTodayHoliday ? (
          <p className="text-sm text-red-700 font-medium">🏖️ Holiday - Salon Closed</p>
        ) : !canTakeBookingsToday ? (
          <p className="text-sm text-gray-600 font-medium">❌ Salon Closed Today</p>
        ) : (
          <>
            <p className="text-sm text-blue-700 font-medium">
              {todayBookings.length} {todayBookings.length === 1 ? 'appointment' : 'appointments'} scheduled
            </p>
            {todayWorkingDay && (
              <p className="text-xs text-blue-600 mt-1">
                Open: {todayWorkingDay.start} - {todayWorkingDay.end}
              </p>
            )}
          </>
        )}
      </div>
      
      {!canTakeBookingsToday ? (
        <div className="text-center py-12 text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            {isTodayHoliday ? (
              <span className="text-2xl">🏖️</span>
            ) : (
              <span className="text-2xl">❌</span>
            )}
          </div>
          <p className="text-lg font-medium mb-2 text-gray-600">
            {isTodayHoliday ? 'Holiday Today' : 'Salon Closed Today'}
          </p>
          <p className="text-sm text-gray-500">
            {isTodayHoliday ? 'Enjoy your holiday!' : 'No appointments scheduled'}
          </p>
        </div>
      ) : todayBookings.length > 0 ? (
        <div className="space-y-3">
          {todayBookings
            .sort((a, b) => a.time.localeCompare(b.time))
            .map(booking => (
              <div
                key={booking.id}
                className={`p-4 rounded-xl ${getStatusColor(booking.status)} hover:shadow-md transition-all duration-200 group cursor-pointer`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="font-semibold text-sm group-hover:font-bold transition-all">{booking.customer}</div>
                  <div className="text-xs font-mono bg-white/60 px-3 py-1.5 rounded-full font-semibold">
                    {booking.time} - {booking.endTime}
                  </div>
                </div>
                <div className="text-sm opacity-90 mb-2 font-medium">{booking.service}</div>
                {booking.employee && (
                  <div className="text-xs opacity-80 flex items-center bg-white/30 px-2 py-1 rounded-lg inline-flex">
                    <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    {booking.employee}
                  </div>
                )}
              </div>
            ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-lg font-medium mb-2 text-gray-600">No appointments today</p>
          <p className="text-sm text-gray-500">Enjoy your free schedule!</p>
        </div>
      )}
    </div>
  );
};