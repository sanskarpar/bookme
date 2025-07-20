"use client";
import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { initializeApp } from "firebase/app";
import Navbar from "../../../components/adminnavbar";
import { FiCalendar, FiDollarSign, FiTrendingUp, FiStar, FiClock, FiUser, FiScissors } from "react-icons/fi";

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

      // Debug: log each booking's date
      if (data.bookings) {
        data.bookings.forEach((b: any, i: number) => {
          console.log(`Booking ${i}:`, {
            _id: b._id,
            date: b.date,
            time: b.time,
            customerName: b.customerName,
            services: b.services?.map((s: any) => s.name)
          });
        });
      }

      // Filter bookings for today's date
      const todayBookingsRaw = Array.isArray(data.bookings)
        ? data.bookings.filter((b: any) => {
            const matches = String(b.date) === String(date);
            console.log(`Booking ${b._id} date ${b.date} matches ${date}:`, matches);
            return matches;
          })
        : [];

      console.log('Filtered today\'s bookings:', todayBookingsRaw);

      const transformedBookings = todayBookingsRaw.map((booking: any) => ({
        id: booking._id,
        time: booking.time,
        service: booking.services.map((s: any) => s.name).join(', '),
        customer: booking.customerName,
        status: booking.status === 'confirmed' ? 'upcoming' : booking.status
      }));

      console.log('Transformed bookings:', transformedBookings);

      transformedBookings.sort((a: any, b: any) => a.time.localeCompare(b.time));
      setTodayBookings(transformedBookings);
    } catch (error) {
      console.error('Error fetching today\'s bookings:', error);
      setTodayBookings([]);
    }
  };

  const fetchStats = async (salonUid: string) => {
    try {
      // Get date ranges for this week and last week
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const startOfLastWeek = new Date(startOfWeek);
      startOfLastWeek.setDate(startOfWeek.getDate() - 7);
      startOfLastWeek.setHours(0, 0, 0, 0);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      endOfLastWeek.setHours(23, 59, 59, 999);
      
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
        // fallback to 0.0
        avgRating = "0.0";
      }

    if (data.bookings) {
      const bookings = data.bookings;
      
      // Calculate this week's COMPLETED bookings for revenue
      const thisWeekCompletedBookings = bookings.filter((booking: any) => {
        const bookingDate = new Date(booking.date);
        return booking.status === 'completed' && 
               bookingDate >= startOfWeek && 
               bookingDate <= endOfWeek;
      });

      // Calculate last week's COMPLETED bookings for revenue
      const lastWeekCompletedBookings = bookings.filter((booking: any) => {
        const bookingDate = new Date(booking.date);
        return booking.status === 'completed' && 
               bookingDate >= startOfLastWeek && 
               bookingDate <= endOfLastWeek;
      });

      // Calculate this week's CONFIRMED bookings for booking count
      const thisWeekConfirmedBookings = bookings.filter((booking: any) => {
        const bookingDate = new Date(booking.date);
        return booking.status === 'confirmed' && 
               bookingDate >= startOfWeek && 
               bookingDate <= endOfWeek;
      });

      // Calculate last week's CONFIRMED bookings for booking count
      const lastWeekConfirmedBookings = bookings.filter((booking: any) => {
        const bookingDate = new Date(booking.date);
        return booking.status === 'confirmed' && 
               bookingDate >= startOfLastWeek && 
               bookingDate <= endOfLastWeek;
      });
      
      // Calculate this week's ALL bookings for booking count
      const thisWeekAllBookings = bookings.filter((booking: any) => {
        const bookingDate = new Date(booking.date);
        return bookingDate >= startOfWeek && 
               bookingDate <= endOfWeek;
      });

      // Calculate last week's ALL bookings for booking count
      const lastWeekAllBookings = bookings.filter((booking: any) => {
        const bookingDate = new Date(booking.date);
        return bookingDate >= startOfLastWeek && 
               bookingDate <= endOfLastWeek;
      });
      
      // Calculate revenue from COMPLETED bookings only
      const thisWeekRevenue = thisWeekCompletedBookings.reduce((sum: number, booking: any) => sum + (booking.total || 0), 0);
      const lastWeekRevenue = lastWeekCompletedBookings.reduce((sum: number, booking: any) => sum + (booking.total || 0), 0);

      // Calculate percentage changes
      const bookingsChange = lastWeekAllBookings.length > 0 
        ? ((thisWeekAllBookings.length - lastWeekAllBookings.length) / lastWeekAllBookings.length) * 100 
        : thisWeekAllBookings.length > 0 ? 100 : 0;

      const revenueChange = lastWeekRevenue > 0 
        ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 
        : thisWeekRevenue > 0 ? 100 : 0;
      
      // Find most popular service (from confirmed bookings only)
      const serviceCount: {[key: string]: number} = {};
      const confirmedBookings = bookings.filter((booking: any) => booking.status === 'confirmed');
      confirmedBookings.forEach((booking: any) => {
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
          title: 'Buchungen diese Woche',
          value: thisWeekAllBookings.length,
          icon: <FiCalendar size={24} />,
          trend: bookingsChange > 0 ? 'up' : bookingsChange < 0 ? 'down' : 'neutral',
          change: `${bookingsChange >= 0 ? '+' : ''}${bookingsChange.toFixed(1)}%`
        },
        {
          id: 'revenue',
          title: 'Wocheneinnahmen',
          value: `€${thisWeekRevenue}`,
          icon: <FiDollarSign size={24} />,
          trend: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'neutral',
          change: `${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}%`
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
      const weeklyCounts: { [key: string]: number } = {};
      bookings.forEach((booking: any) => {
        const bookingDate = new Date(booking.date);
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
                        <td colSpan={4} className="px-2 sm:px-6 py-4 text-center text-xs sm:text-sm text-gray-500">
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
            {/* Bookings Chart */}
            <section className="bg-white p-4 sm:p-6 rounded-lg shadow-sm mb-6 lg:mb-0">
              {/* Section header */}
              <div className="mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                  <FiTrendingUp className="mr-2" /> Buchungsübersicht
                </h2>
                <p className="text-gray-500 mt-1 text-xs sm:text-sm">
                  Wöchentlicher Buchungstrend für Ihren Salon
                </p>
              </div>
              {/* Graph */}
              <div className="flex flex-col items-center bg-gray-50 rounded-md py-4 sm:py-6" style={{ minHeight: "180px" }}>
                <div className="flex items-end mb-2 space-x-2 sm:space-x-4 px-2 sm:px-4 w-full" style={{ height: "100px" }}>
                  {weeklyBookings.map((day, idx) => {
                    const max = Math.max(...weeklyBookings.map(d => d.count), 1);
                    const pxHeight = max > 0 ? Math.max((day.count / max) * 80, 8) : 8;
                    return (
                      <div key={day.day} className="flex flex-col items-center flex-1">
                        <div
                          style={{
                            height: `${pxHeight}px`,
                            width: '20px',
                            backgroundColor: '#9DBE8D',
                            borderRadius: '8px 8px 0 0',
                            border: '1.5px solid #7AA86E',
                            transition: 'height 0.3s',
                          }}
                          title={`${day.day}: ${day.count} bookings`}
                        ></div>
                        <span className="mt-2 text-xs text-gray-500">{day.day}</span>
                        <span className="text-xs font-medium text-gray-900">{day.count}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Metrics below the graph */}
                <div className="flex flex-col items-center mt-4 sm:mt-6 w-full">
                  <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-8 w-full">
                    <div className="bg-white rounded-lg shadow px-3 py-2 flex flex-col items-center min-w-[100px] sm:min-w-[120px] mb-2 sm:mb-0">
                      <span className="text-xs text-gray-500 mb-1">Buchungen diese Woche</span>
                      <span className="text-lg font-bold text-[#5C6F68]">
                        {stats.find(s => s.id === 'bookings')?.value || 0}
                      </span>
                    </div>
                    <div className="bg-white rounded-lg shadow px-3 py-2 flex flex-col items-center min-w-[100px] sm:min-w-[120px]">
                      <span className="text-xs text-gray-500 mb-1">Einnahmen</span>
                      <span className="text-lg font-bold text-[#5C6F68]">
                        {stats.find(s => s.id === 'revenue')?.value || '€0'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
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
      </main>
    </>
  );
}

// Component for stat cards
const StatCard = ({ stat }: { stat: StatCard }) => {
  const trendColor = stat.trend === 'up' ? 'text-green-600' : stat.trend === 'down' ? 'text-red-600' : 'text-gray-600';
  const trendIcon = stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '→';

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
      {stat.trend && stat.change && (
        <div className="mt-2">
          <span className={`inline-flex items-center text-xs sm:text-sm ${trendColor}`}>
            {trendIcon} {stat.change} <span className="ml-1 text-gray-500">vs. letzte Woche</span>
          </span>
        </div>
      )}
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