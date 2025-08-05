"use client";
import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { initializeApp } from "firebase/app";
import Navbar from "../../../components/adminnavbar";
import Footer from "@/components/footer";
import { FiCalendar, FiTrendingUp, FiStar, FiClock, FiUser, FiScissors } from "react-icons/fi";
import { FaEuroSign } from "react-icons/fa";

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
  endTime: string;
  duration?: number;
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
  // Add optional extra fields for today's bookings
  upcomingCount?: number;
  completedCount?: number;
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
  const [viewingSalonUid, setViewingSalonUid] = useState<string | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  // Use German time for current time
  const [currentTime, setCurrentTime] = useState<string>(() => {
    const now = new Date();
    const berlinNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
    return berlinNow.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  });

  // Get current user and fetch salon info and role
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser?.email) {
        setLoading(true);
        try {
          // Check if this is system admin viewing another salon's dashboard
          const urlParams = new URLSearchParams(window.location.search);
          const salonUidParam = urlParams.get('salonUid');
          const isSystemUser = firebaseUser.email === "system@gmail.com";
          setIsSystemAdmin(isSystemUser);
          
          if (salonUidParam && isSystemUser) {
            // System admin viewing specific salon dashboard
            setViewingSalonUid(salonUidParam);
            setUserRole("system");
            
            // Fetch the specific salon data
            const salonRes = await fetch(`/api/salons?uid=${encodeURIComponent(salonUidParam)}`);
            if (salonRes.ok) {
              const salonData = await salonRes.json();
              setSalon(salonData.salon);
              
              if (salonData.salon?.uid) {
                // Get today's date in correct format
                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                
                await fetchTodayBookings(salonData.salon.uid, todayStr);
                await fetchStats(salonData.salon.uid);
                await fetchActivities(salonData.salon.uid);
              }
            }
          } else {
            // Normal salon user or system admin viewing their own dashboard
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
            
            console.log('Salon data:', salonData);
            
            if (salonData?.uid) {
              // Get today's date in correct format
              const today = new Date();
              const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              console.log('Today\'s date string:', todayStr);
              
              await fetchTodayBookings(salonData.uid, todayStr);
              await fetchStats(salonData.uid);
              await fetchActivities(salonData.uid);
            } else {
              console.error('No salon UID found:', salonData);
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

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const berlinNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
      setCurrentTime(berlinNow.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchTodayBookings = async (salonUid: string, date: string) => {
    try {
      console.log('Fetching today\'s bookings for date:', date, 'salonUid:', salonUid);
      
      // Fetch all bookings for this salon
      const res = await fetch(`/api/bookings?salonUid=${encodeURIComponent(salonUid)}`);
      const data = await res.json();
      if (data.bookings) {
        // Use German time for all date logic
        const berlinNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
        const berlinYear = berlinNow.getFullYear();
        const berlinMonth = berlinNow.getMonth() + 1;
        const berlinDay = berlinNow.getDate();
        const todayStrBerlin = `${berlinYear}-${String(berlinMonth).padStart(2, '0')}-${String(berlinDay).padStart(2, '0')}`;

        // Transform all bookings for calendar
        const allCalendarBookings = data.bookings.map((booking: any) => {
          const startTime = booking.time;
          const duration = booking.services.reduce((total: number, service: any) => total + (service.duration || 30), 0);
          const [hours, minutes] = startTime.split(':').map(Number);
          const endMinutes = hours * 60 + minutes + duration;
          const endHours = Math.floor(endMinutes / 60);
          const endMins = endMinutes % 60;
          const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
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
            duration,
            service: booking.services.map((s: any) => s.name).join(', '),
            customer: booking.customerName,
            status: booking.status === 'confirmed' ? 'upcoming' : booking.status,
            date: booking.date,
            employee: employeeNames
          };
        });
        setCalendarBookings(allCalendarBookings);
        // Filter for today's bookings for the table (in German time)
        const todayBookingsRaw = data.bookings.filter((b: any) => String(b.date) === todayStrBerlin);
        // Only show upcoming bookings (whose end time is in the future)
        const nowMinutes = berlinNow.getHours() * 60 + berlinNow.getMinutes();
        const transformedBookings = todayBookingsRaw.map((booking: any) => {
          const startTime = booking.time;
          const duration = booking.services.reduce((total: number, service: any) => total + (service.duration || 30), 0);
          const [hours, minutes] = startTime.split(':').map(Number);
          const endMinutes = hours * 60 + minutes + duration;
          const endHours = Math.floor(endMinutes / 60);
          const endMins = endMinutes % 60;
          const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
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
            endTime,
            duration,
            service: booking.services.map((s: any) => s.name).join(', '),
            customer: booking.customerName,
            status: booking.status === 'confirmed' ? 'upcoming' : booking.status,
            employee: employeeNames
          };
        })
        .filter((booking: any) => {
          if (booking.status !== 'upcoming') return false;
          const [endHour, endMin] = booking.endTime.split(':').map(Number);
          const bookingEndMinutes = endHour * 60 + endMin;
          return bookingEndMinutes > nowMinutes;
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
      // Get today's date in German time
      const berlinNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
      const todayStr = `${berlinNow.getFullYear()}-${String(berlinNow.getMonth() + 1).padStart(2, '0')}-${String(berlinNow.getDate()).padStart(2, '0')}`;

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
        // Upcoming bookings today
        const todayUpcomingBookings = todayBookings.filter((booking: any) => booking.status === 'confirmed' || booking.status === 'upcoming');

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
            // Show as "upcoming / total" (completed + upcoming)
            value: `${todayUpcomingBookings.length} / ${todayBookings.length}`,
            icon: <FiCalendar size={24} color="#222" />,
            upcomingCount: todayUpcomingBookings.length,
            completedCount: todayCompletedBookings.length
          },
          {
            id: 'popular',
            title: 'Beliebteste Dienstleistung',
            value: popularService,
            icon: <FiTrendingUp size={24} color="#222" />
          },
          {
            id: 'rating',
            title: 'Durchschnittliche Bewertung',
            value: avgRating,
            icon: <FiStar size={24} color="#222" />
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

  // Find the next appointment (first in sorted todayBookings)
  const nextAppointment = todayBookings.length > 0 ? todayBookings[0] : null;

  // Prepare stat cards, swap order: Buchungen heute first, then Nächster Termin
  const statCards = [
    stats[0], // Buchungen heute
    {
      id: 'next',
      title: 'Nächster Termin',
      value: nextAppointment
        ? (
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-base sm:text-lg text-gray-900">{nextAppointment.service}</span>
              <span className="text-xs text-gray-700">
                {nextAppointment.time} - {nextAppointment.endTime}
                <span className="ml-2 text-gray-400">({nextAppointment.duration} min)</span>
              </span>
              <span className="text-xs text-gray-700 flex items-center">
                <FiUser className="mr-1" /> {nextAppointment.customer}
              </span>
              {nextAppointment.employee && (
                <span className="text-xs text-gray-700 flex items-center">
                  <FiScissors className="mr-1" /> {nextAppointment.employee}
                </span>
              )}
            </div>
          )
        : <span className="text-xs text-gray-500">Kein nächster Termin</span>,
      icon: <FiClock size={24} color="#222" />,
    },
    ...stats.slice(1),
  ];

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

  return (
    <>
      <Navbar 
        user={user} 
        currentPath="/admin/dashboard" 
        viewingSalonUid={viewingSalonUid}
        salonName={isSystemAdmin ? salon?.name : undefined}
        salon={salon}
      />
      <div className="flex flex-col min-h-screen bg-gray-50 font-sans p-0">
        <main className="flex-1">
          <div className="max-w-6xl mx-auto py-6 px-2 sm:px-4 lg:px-8">
            {/* Header */}
            <div className="mb-6 sm:mb-8 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Willkommen zurück, {salon?.name || 'Saloninhaber'}
                {viewingSalonUid && isSystemAdmin && (
                  <span className="text-lg text-gray-600 block mt-1">(System-Ansicht)</span>
                )}
              </h1>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-1">
                <span className="text-black text-lg font-mono">{currentTime}</span>
              </div>
              <p className="text-gray-600 text-sm sm:text-base">
                Das passiert heute in Deinem Salon.
              </p>
            </div>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {statCards.map((stat) => (
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
                  {(() => {
                    const berlinNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
                    return berlinNow.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
                  })()}
                </span>
              </div>
              <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Uhrzeit / Dauer
                        </th>
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
                              {/* Show time range and duration */}
                              {booking.time} - {booking.endTime}
                              <span className="ml-2 text-gray-400 text-xs">
                                ({booking.duration} min)
                              </span>
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
                                <div className="flex justify-end items-center gap-1 sm:gap-2 -mr-2 sm:-mr-6">
                                  <button
                                    onClick={() => handleBookingAction(booking.id, 'no-show')}
                                    className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 sm:px-3 py-1 rounded-md text-xs font-medium"
                                  >
                                    Nicht erschienen
                                  </button>
                                  <button
                                    onClick={() => handleBookingAction(booking.id, 'complete')}
                                    className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-2 sm:px-3 py-1 rounded-md text-xs font-medium mr-3"
                                  >
                                    Abschließen
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
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}

// Component for stat cards
const StatCard = ({ stat }: { stat: StatCard | any }) => {
  // Special rendering for "Buchungen heute"
  if (stat.id === 'bookings' && typeof stat.upcomingCount === 'number' && typeof stat.completedCount === 'number') {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md mb-2 sm:mb-0 border border-gray-100 flex items-center min-h-[90px]">
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-xs sm:text-sm font-normal text-gray-500">{stat.title}</p>
          <div className="mt-1 flex items-end gap-2">
            <span className="text-2xl sm:text-3xl font-semibold text-gray-900">{stat.upcomingCount}</span>
            <span className="text-base sm:text-lg text-gray-400">/</span>
            <span className="text-lg sm:text-xl font-medium text-green-700">{stat.completedCount}</span>
          </div>
          <div className="flex gap-2 mt-1">
            <span className="text-xs text-gray-500">offen</span>
            <span className="text-xs text-green-700">abgeschlossen</span>
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center justify-center ml-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-[#e4ded5] to-[#9dbe8d]/30 shadow-inner border border-gray-200">
            <span className="text-primary-600 flex items-center justify-center" style={{ lineHeight: 0 }}>
              {typeof stat.icon === "function"
                ? React.createElement(stat.icon, { size: 28, color: "#222" })
                : React.isValidElement(stat.icon)
                  ? React.cloneElement(stat.icon as React.ReactElement<any>, { color: "#222", size: 28 })
                  : stat.icon}
            </span>
          </div>
        </div>
      </div>
    );
  }
  // Special rendering for "Nächster Termin"
  if (stat.id === 'next') {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md mb-2 sm:mb-0 border border-gray-100 flex items-center min-h-[90px]">
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-xs sm:text-sm font-normal text-gray-500">{stat.title}</p>
          <div className="mt-1">{stat.value}</div>
        </div>
        <div className="flex-shrink-0 flex items-center justify-center ml-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-[#e4ded5] to-[#9dbe8d]/30 shadow-inner border border-gray-200">
            <span className="text-primary-600 flex items-center justify-center" style={{ lineHeight: 0 }}>
              {typeof stat.icon === "function"
                ? React.createElement(stat.icon, { size: 28, color: "#222" })
                : React.isValidElement(stat.icon)
                  ? React.cloneElement(stat.icon as React.ReactElement<any>, { color: "#222", size: 28 })
                  : stat.icon}
            </span>
          </div>
        </div>
      </div>
    );
  }
  // ...existing code for other stat cards...
  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md mb-2 sm:mb-0 border border-gray-100 flex items-center min-h-[90px]">
      <div className="flex-1 flex flex-col justify-center">
        <p className="text-xs sm:text-sm font-normal text-gray-500">{stat.title}</p>
        <p className="mt-1 text-2xl sm:text-3xl font-semibold text-gray-900">{stat.value}</p>
      </div>
      <div className="flex-shrink-0 flex items-center justify-center ml-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-[#e4ded5] to-[#9dbe8d]/30 shadow-inner border border-gray-200">
          <span className="text-primary-600 flex items-center justify-center" style={{ lineHeight: 0 }}>
            {typeof stat.icon === "function"
              ? React.createElement(stat.icon, { size: 28, color: "#222" })
              : React.isValidElement(stat.icon)
                ? React.cloneElement(stat.icon as React.ReactElement<any>, { color: "#222", size: 28 })
                : stat.icon}
          </span>
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

// Calendar Widget Component (simplified for daily view)
const CalendarWidget = ({ bookings, isExpanded, salon }: { 
  bookings: CalendarBooking[], 
  isExpanded: boolean,
  salon: any 
}) => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  // German day and month names
  const germanDayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const germanMonthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];
  const todayGermanName = germanDayNames[today.getDay()];
  const todayGermanDateStr = `${todayGermanName}, ${today.getDate()}. ${germanMonthNames[today.getMonth()]}`;

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
          {todayGermanDateStr}
        </h3>
        {isTodayHoliday ? (
          <p className="text-sm text-red-700 font-medium">🏖️ Feiertag - Salon geschlossen</p>
        ) : !canTakeBookingsToday ? (
          <p className="text-sm text-gray-600 font-medium">❌ Salon heute geschlossen</p>
        ) : (
          <>
            <p className="text-sm text-blue-700 font-medium">
              {todayBookings.length} Termin{todayBookings.length === 1 ? '' : 'e'} geplant
            </p>
            {todayWorkingDay && (
              <p className="text-xs text-blue-600 mt-1">
                Verfügbar: {todayWorkingDay.start} - {todayWorkingDay.end}
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