"use client";
import React, { useEffect, useState, Suspense } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { initializeApp } from "firebase/app";
import Navbar from "../../../components/adminnavbar";
import Footer from "@/components/footer";
import { useSearchParams } from "next/navigation";
import { 
  FiTrendingUp, FiUsers, FiClock, FiDollarSign, FiCalendar, 
  FiScissors, FiStar, FiTarget, FiBarChart, FiPieChart,
  FiActivity, FiUserCheck, FiTrendingDown, FiAlertCircle, FiArrowLeft
} from "react-icons/fi";

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

type AnalyticsData = {
  totalRevenue: number;
  totalBookings: number;
  averageBookingValue: number;
  customerRetentionRate: number;
  popularServices: Array<{name: string; count: number; revenue: number}>;
  employeePerformance: Array<{name: string; bookings: number; revenue: number; rating: number}>;
  timeSlotDemand: Array<{time: string; bookings: number}>;
  weeklyTrends: Array<{day: string; bookings: number; revenue: number}>;
  monthlyTrends: Array<{month: string; bookings: number; revenue: number}>;
  serviceTypeBreakdown: Array<{type: string; count: number; revenue: number}>;
  customerInsights: {
    newCustomers: number;
    returningCustomers: number;
    averageBookingsPerCustomer: number;
  };
  peakHours: Array<{hour: number; bookings: number}>;
  cancellationRate: number;
  noShowRate: number;
  completionRate: number;
};

function AnalyticsContent() {
  const [user, setUser] = useState<any>(null);
  const [salon, setSalon] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState("30"); // days or 'year'
  const [selectedView, setSelectedView] = useState("overview");
  const [viewingSalonUid, setViewingSalonUid] = useState<string | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  
  const searchParams = useSearchParams();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser?.email) {
        setLoading(true);
        try {
          // Check if this is system admin viewing another salon's analytics
          const salonUidParam = searchParams?.get('salonUid');
          const isSystemUser = firebaseUser.email === "system@gmail.com";
          setIsSystemAdmin(isSystemUser);
          
          if (salonUidParam && isSystemUser) {
            // System admin viewing specific salon analytics
            setViewingSalonUid(salonUidParam);
            setUserRole("system");
            
            // Fetch the specific salon data
            const salonRes = await fetch(`/api/salons?uid=${encodeURIComponent(salonUidParam)}`);
            if (salonRes.ok) {
              const salonData = await salonRes.json();
              setSalon(salonData.salon);
              await fetchAnalytics(salonUidParam);
            }
          } else {
            // Normal salon user or system admin viewing their own analytics
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
              await fetchAnalytics(salonData.uid);
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
  }, [searchParams]);

  useEffect(() => {
    if (salon?.uid) {
      fetchAnalytics(salon.uid);
    }
  }, [timeRange, salon]);

  const fetchAnalytics = async (salonUid: string) => {
    try {
      // Fetch all relevant data
      const [bookingsRes, servicesRes, reviewsRes] = await Promise.all([
        fetch(`/api/bookings?salonUid=${encodeURIComponent(salonUid)}`),
        fetch(`/api/services?uid=${encodeURIComponent(salonUid)}`),
        fetch(`/api/reviews?salonUid=${encodeURIComponent(salonUid)}`)
      ]);

      const bookingsData = await bookingsRes.json();
      const servicesData = await servicesRes.json();
      const reviewsData = await reviewsRes.json();

      const bookings = bookingsData.bookings || [];
      const services = servicesData.services || [];
      const reviews = reviewsData.reviews || [];

      // Filter bookings based on time range
      let filteredBookings = bookings;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(timeRange));
      filteredBookings = bookings.filter((booking: any) =>
        new Date(booking.createdAt) >= cutoffDate
      );

      const analyticsData = calculateAnalytics(filteredBookings, services, salon, reviews);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  // Update calculateAnalytics to accept reviews and use real employee ratings
  const calculateAnalytics = (bookings: any[], services: any[], salonData: any, reviews: any[]): AnalyticsData => {
    // Only completed bookings count for revenue
    const completedBookings = bookings.filter(b => b.status === "completed");
    const totalRevenue = completedBookings.reduce((sum, booking) => sum + (booking.total || 0), 0);

    const totalBookings = bookings.length;
    const averageBookingValue = completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0;

    // --- Popular Services: use ALL bookings ---
    const serviceStats: {[key: string]: {count: number; revenue: number}} = {};
    bookings.forEach(booking => {
      if (Array.isArray(booking.services)) {
        booking.services.forEach((service: any) => {
          if (!serviceStats[service.name]) {
            serviceStats[service.name] = {count: 0, revenue: 0};
          }
          serviceStats[service.name].count += 1;
          serviceStats[service.name].revenue += service.price || 0;
        });
      }
    });

    const popularServices = Object.entries(serviceStats)
      .map(([name, stats]) => ({name, ...stats}))
      .sort((a, b) => b.count - a.count);

    // --- Employee performance: COMPLETED bookings only ---
    const employeeStats: {[key: string]: {bookings: number; revenue: number}} = {};
    completedBookings.forEach(booking => {
      if (Array.isArray(booking.services)) {
        booking.services.forEach((service: any) => {
          const employee = service.employee || 'Unassigned';
          if (!employeeStats[employee]) {
            employeeStats[employee] = {bookings: 0, revenue: 0};
          }
          employeeStats[employee].bookings += 1;
          employeeStats[employee].revenue += service.price || 0;
        });
      }
    });

    // Calculate real employee ratings from reviews
    const employeeRatings: {[key: string]: {total: number; count: number}} = {};
    reviews.forEach((review: any) => {
      if (review.employeeName) {
        if (!employeeRatings[review.employeeName]) {
          employeeRatings[review.employeeName] = { total: 0, count: 0 };
        }
        employeeRatings[review.employeeName].total += review.rating;
        employeeRatings[review.employeeName].count += 1;
      }
    });

    const employeePerformance = Object.entries(employeeStats)
      .map(([name, stats]) => ({
        name,
        ...stats,
        rating: employeeRatings[name]
          ? Math.round((employeeRatings[name].total / employeeRatings[name].count) * 10) / 10
          : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // --- Service type breakdown: ALL bookings ---
    const serviceTypeStats: {[key: string]: {count: number; revenue: number}} = {};
    bookings.forEach(booking => {
      if (Array.isArray(booking.services)) {
        booking.services.forEach((service: any) => {
          const serviceData = Array.isArray(services) ? services.find(s => s._id === service.id) : undefined;
          const type = serviceData?.serviceType || 'Other';
          
          if (!serviceTypeStats[type]) {
            serviceTypeStats[type] = {count: 0, revenue: 0};
          }
          serviceTypeStats[type].count += 1;
          serviceTypeStats[type].revenue += service.price || 0;
        });
      }
    });

    const serviceTypeBreakdown = Object.entries(serviceTypeStats)
      .map(([type, stats]) => ({type, ...stats}));

    // Customer insights and retention
    const customerMap = new Map<string, number>();
    bookings.forEach(booking => {
      const customer = booking.customerName || booking.customerPhone;
      customerMap.set(customer, (customerMap.get(customer) || 0) + 1);
    });

    let returningCustomers = 0;
    let newCustomers = 0;
    customerMap.forEach((count) => {
      if (count > 1) {
        returningCustomers += 1;
      } else {
        newCustomers += 1;
      }
    });

    const averageBookingsPerCustomer = customerMap.size > 0
      ? bookings.length / customerMap.size
      : 0;

    // Peak hours analysis
    const hourStats: {[key: number]: number} = {};
    bookings.forEach(booking => {
      const hour = parseInt(booking.time?.split(':')[0] || '12');
      hourStats[hour] = (hourStats[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourStats)
      .map(([hour, bookings]) => ({hour: parseInt(hour), bookings}))
      .sort((a, b) => b.bookings - a.bookings);

    // Completion/cancellation/no-show rates
    const statusCounts = bookings.reduce((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {} as {[key: string]: number});

    // Only consider completed, cancelled, no-show for denominator
    const finishedCount =
      (statusCounts.completed || 0) +
      (statusCounts.cancelled || 0) +
      (statusCounts["no-show"] || 0);

    const completionRate = finishedCount > 0
      ? ((statusCounts.completed || 0) / finishedCount) * 100
      : 0;
    const cancellationRate = finishedCount > 0
      ? ((statusCounts.cancelled || 0) / finishedCount) * 100
      : 0;
    const noShowRate = finishedCount > 0
      ? ((statusCounts["no-show"] || 0) / finishedCount) * 100
      : 0;

    // Customer retention: percent of customers who are returning
    const customerRetentionRate = customerMap.size > 0
      ? (returningCustomers / customerMap.size) * 100
      : 0;

    // --- Time slot demand: ALL bookings ---
    const timeSlotStats: {[key: string]: number} = {};
    bookings.forEach(booking => {
      const time = booking.time || '12:00';
      timeSlotStats[time] = (timeSlotStats[time] || 0) + 1;
    });

    const timeSlotDemand = Object.entries(timeSlotStats)
      .map(([time, bookings]) => ({ time, bookings }))
      .sort((a, b) => a.time.localeCompare(b.time));

    // --- Weekly trends: ALL bookings ---
    const weeklyStats: {[key: string]: {bookings: number; revenue: number}} = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    bookings.forEach(booking => {
      const date = new Date(booking.date);
      const dayName = dayNames[date.getDay()];
      if (!weeklyStats[dayName]) {
        weeklyStats[dayName] = {bookings: 0, revenue: 0};
      }
      weeklyStats[dayName].bookings += 1;
      weeklyStats[dayName].revenue += booking.total || 0;
    });
    const weeklyTrends = dayNames.map(day => ({
      day,
      bookings: weeklyStats[day]?.bookings || 0,
      revenue: weeklyStats[day]?.revenue || 0
    }));

    // --- Monthly trends: keep as is (confirmed bookings) ---
    const confirmedBookings = bookings.filter(b => b.status === "confirmed");
    const monthlyStats: {[key: string]: {bookings: number; revenue: number}} = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    confirmedBookings.forEach(booking => {
      const date = new Date(booking.date);
      const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {bookings: 0, revenue: 0};
      }
      monthlyStats[monthKey].bookings += 1;
      monthlyStats[monthKey].revenue += booking.total || 0;
    });
    const monthlyTrends = Object.entries(monthlyStats)
      .map(([month, stats]) => ({month, ...stats}))
      .slice(-6);

    return {
      totalRevenue,
      totalBookings,
      averageBookingValue,
      customerRetentionRate,
      popularServices,
      employeePerformance,
      timeSlotDemand,
      weeklyTrends,
      monthlyTrends,
      serviceTypeBreakdown,
      customerInsights: {
        newCustomers,
        returningCustomers,
        averageBookingsPerCustomer
      },
      peakHours,
      cancellationRate,
      noShowRate,
      completionRate
    };
  };

  useEffect(() => {
    if (
      userRole === "salon" &&
      !isSystemAdmin &&
      salon
    ) {
      const hasAnalyticsAccess =
        salon.plan === "founders" ||
        salon.plan === "unicorn" ||
        salon.plan === "custom";
      setShowPlanModal(!hasAnalyticsAccess);
    } else {
      setShowPlanModal(false);
    }
  }, [userRole, isSystemAdmin, salon]);

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
        currentPath="/admin/analytics" 
        viewingSalonUid={viewingSalonUid}
        salonName={isSystemAdmin ? salon?.name : undefined}
        salon={salon}
      />
      <main className={`min-h-screen bg-gray-50 font-sans p-0 transition-all duration-300 ${showPlanModal ? "filter blur-sm pointer-events-none select-none" : ""}`}>
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            {viewingSalonUid && isSystemAdmin && (
              <div className="mb-4">
                <button
                  onClick={() => window.close()}
                  className="flex items-center text-[#5C6F68] hover:text-[#4a5a54] font-medium"
                >
                  <FiArrowLeft className="mr-2" /> Zurück zur Admin-Übersicht
                </button>
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <FiBarChart className="mr-3 text-[#5C6F68]" /> 
              {viewingSalonUid && isSystemAdmin ? "System-Analytics" : "Analyse-Dashboard"}
            </h1>
            <p className="text-gray-600">
              {viewingSalonUid && isSystemAdmin 
                ? `Analytics für ${salon?.name || 'Unbekannter Salon'} (System-Ansicht)`
                : `Umfassende Einblicke und Analysen für ${salon?.name}`
              }
            </p>
          </div>

          {/* Controls */}
          <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-4">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5C6F68] focus:border-transparent"
                  style={{ color: "#000" }}
                >
                  <option value="7">Letzte 7 Tage</option>
                  <option value="30">Letzte 30 Tage</option>
                  <option value="90">Letzte 3 Monate</option>
                  <option value="365">Letztes Jahr</option>
                </select>
              </div>
            </div>
          </div>

          {analytics && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard
                  title="Gesamteinnahmen"
                  value={`€${analytics.totalRevenue.toFixed(2)}`}
                  icon={<FiDollarSign size={24} />}
                  trend="up"
                  change="+12%"
                />
                <MetricCard
                  title="Gesamtbuchungen"
                  value={analytics.totalBookings.toString()}
                  icon={<FiCalendar size={24} />}
                  trend="up"
                  change="+8%"
                />
                <MetricCard
                  title="Durchschn. Buchungswert"
                  value={`€${analytics.averageBookingValue.toFixed(2)}`}
                  icon={<FiTrendingUp size={24} />}
                  trend="up"
                  change="+5%"
                />
                <MetricCard
                  title="Kundenbindung"
                  value={`${analytics.customerRetentionRate.toFixed(1)}%`}
                  icon={<FiUserCheck size={24} />}
                  trend="neutral"
                />
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <MetricCard
                  title="Abschlussrate"
                  value={`${analytics.completionRate.toFixed(1)}%`}
                  icon={<FiTarget size={24} />}
                  trend={analytics.completionRate > 80 ? "up" : "down"}
                />
                <MetricCard
                  title="Stornierungsrate"
                  value={`${analytics.cancellationRate.toFixed(1)}%`}
                  icon={<FiAlertCircle size={24} />}
                  trend={analytics.cancellationRate < 10 ? "up" : "down"}
                />
                <MetricCard
                  title="No-Show-Rate"
                  value={`${analytics.noShowRate.toFixed(1)}%`}
                  icon={<FiTrendingDown size={24} />}
                  trend={analytics.noShowRate < 5 ? "up" : "down"}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Popular Services */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <FiScissors className="mr-2 text-[#5C6F68]" /> Beliebteste Dienstleistungen
                  </h2>
                  <div className="space-y-4">
                    {analytics.popularServices.slice(0, 5).map((service, index) => (
                      <div key={service.name} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="w-8 h-8 bg-[#5C6F68] text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900">{service.name}</p>
                            <p className="text-sm text-gray-500">{service.count} Buchungen</p>
                          </div>
                        </div>
                        <span className="font-semibold text-[#5C6F68]">€{service.revenue}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Employee Performance */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <FiUsers className="mr-2 text-[#5C6F68]" /> Mitarbeiterleistung
                  </h2>
                  <div className="space-y-4">
                    {analytics.employeePerformance.map((employee, index) => (
                      <div key={employee.name} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-[#9DBE8D] text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
                            {employee.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{employee.name}</p>
                            <p className="text-sm text-gray-500">{employee.bookings} Buchungen • ⭐ {employee.rating.toFixed(1)}</p>
                          </div>
                        </div>
                        <span className="font-semibold text-[#5C6F68]">€{employee.revenue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Time Slot Demand */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <FiClock className="mr-2 text-[#5C6F68]" /> Nachgefragte Zeitfenster
                  </h2>
                  <div className="space-y-3">
                    {analytics.timeSlotDemand.slice(0, 8).map((slot) => (
                      <div key={slot.time} className="flex items-center justify-between">
                        <span className="text-gray-700">{slot.time}</span>
                        <div className="flex items-center">
                          <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                            <div 
                              className="bg-[#5C6F68] h-2 rounded-full" 
                              style={{ 
                                width: `${Math.min((slot.bookings / Math.max(...analytics.timeSlotDemand.map(s => s.bookings))) * 100, 100)}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-8">{slot.bookings}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Service Type Breakdown */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <FiPieChart className="mr-2 text-[#5C6F68]" /> Dienstleistungs-Kategorien
                  </h2>
                  <div className="space-y-4">
                    {analytics.serviceTypeBreakdown.map((type, index) => {
                      const colors = ['#5C6F68', '#9DBE8D', '#E4DED5', '#4CAF50', '#FF9800'];
                      const color = colors[index % colors.length];
                      return (
                        <div key={type.type} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded-full mr-3" 
                              style={{ backgroundColor: color }}
                            ></div>
                            <div>
                              <p className="font-medium text-gray-900">{type.type}</p>
                              <p className="text-sm text-gray-500">{type.count} Dienstleistungen</p>
                            </div>
                          </div>
                          <span className="font-semibold text-[#5C6F68]">€{type.revenue}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Weekly Trends */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <FiActivity className="mr-2 text-[#5C6F68]" /> Wöchentliche Muster
                  </h2>
                  <div className="space-y-3">
                    {analytics.weeklyTrends.map((day) => (
                      <div key={day.day} className="flex items-center justify-between">
                        <span className="text-gray-700 w-20">{day.day}</span>
                        <div className="flex items-center flex-1 mx-4">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-[#9DBE8D] h-2 rounded-full" 
                              style={{ 
                                width: `${Math.min((day.bookings / Math.max(...analytics.weeklyTrends.map(d => d.bookings))) * 100, 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{day.bookings} Buchungen</div>
                          <div className="text-xs text-gray-500">€{day.revenue}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer Insights */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <FiUserCheck className="mr-2 text-[#5C6F68]" /> Kunden-Insights
                  </h2>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Neue Kunden</p>
                        <p className="text-2xl font-bold text-[#5C6F68]">{analytics.customerInsights.newCustomers}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Wiederkehrende Kunden</p>
                        <p className="text-2xl font-bold text-[#9DBE8D]">{analytics.customerInsights.returningCustomers}</p>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <p className="text-sm text-gray-500">Durchschnittliche Buchungen pro Kunde</p>
                      <p className="text-xl font-semibold text-gray-900">{analytics.customerInsights.averageBookingsPerCustomer.toFixed(1)}</p>
                    </div>
                    <div className="border-t pt-4">
                      <p className="text-sm text-gray-500">Kundenbindungsrate</p>
                      <p className="text-xl font-semibold text-gray-900">{analytics.customerRetentionRate.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Peak Hours Chart */}
              <div className="hidden lg:block bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <FiClock className="mr-2 text-[#5C6F68]" /> Spitzenzeiten
                </h2>
                <div className="grid grid-cols-12 gap-2">
                  {Array.from({ length: 12 }, (_, i) => {
                    const hour = i + 9; // 9 AM to 8 PM
                    const peakData = analytics.peakHours.find(p => p.hour === hour);
                    const bookings = peakData?.bookings || 0;
                    const maxBookings = Math.max(...analytics.peakHours.map(p => p.bookings));
                    const height = maxBookings > 0 ? (bookings / maxBookings) * 100 : 0;
                    
                    return (
                      <div key={hour} className="text-center">
                        <div className="h-32 flex items-end justify-center mb-2">
                          <div 
                            className="w-8 bg-[#5C6F68] rounded-t"
                            style={{ height: `${height}%`, minHeight: bookings > 0 ? '8px' : '0' }}
                            title={`${hour}:00 - ${bookings} Buchungen`}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600">{hour}:00</div>
                        <div className="text-xs font-medium text-gray-900">{bookings}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
        <Footer />
      </main>
      {showPlanModal && (
        <PlanUpgradeModal plan={salon?.plan} />
      )}
    </>
  );
}

// Metric Card Component
const MetricCard = ({ 
  title, 
  value, 
  icon, 
  trend, 
  change 
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  trend?: 'up' | 'down' | 'neutral'; 
  change?: string; 
}) => {
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className="p-3 rounded-full bg-[#5C6F68] bg-opacity-10 text-[#5C6F68]">
          {icon}
        </div>
      </div>
      {trend && change && (
        <div className="mt-2">
          <span className={`inline-flex items-center text-sm ${trendColor}`}>
            {trendIcon} {change} <span className="ml-1 text-gray-500">vs. vorher</span>
          </span>
        </div>
      )}
    </div>
  );
};

// Loading screen component
const LoadingScreen = () => (
  <main className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#5C6F68] mx-auto mb-4"></div>
      <p className="text-[#5C6F68] text-lg">Analysen werden geladen...</p>
    </div>
  </main>
);

const AuthPrompt = () => (
  <main className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
    <div className="text-center p-6 bg-white rounded-lg shadow-sm max-w-md mx-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff eingeschränkt</h2>
      <p className="text-gray-600 mb-4">Bitte melden Sie sich an, um das Analyse-Dashboard zu sehen</p>
      <button className="bg-[#5C6F68] hover:bg-[#4a5a54] text-white font-medium py-2 px-4 rounded-md">
        Anmelden
      </button>
    </div>
  </main>
);

// Modal overlay for plan upgrade
const PlanUpgradeModal = ({ plan }: { plan?: string }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
    <div className="absolute inset-0 backdrop-blur-sm transition-all duration-300" />
    <div className="relative text-center p-6 bg-white rounded-lg shadow-lg max-w-md mx-4 border-2 border-[#5C6F68]">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Analytics nur für Premium-Pläne</h2>
      <p className="text-gray-600 mb-4">
        Die Analyse- und Statistikfunktionen sind nur für Founders, Unicorn und Custom Pläne verfügbar.<br />
        Ihr aktueller Plan: <strong>{plan || "Startup"}</strong>
      </p>
      <p className="text-sm text-gray-500 mb-4">
        Upgraden Sie Ihren Plan, um detaillierte Analytics und Insights zu erhalten.
      </p>
      <a
        href="/admin/plans"
        className="bg-[#5C6F68] hover:bg-[#4a5a54] text-white font-medium py-2 px-4 rounded-md inline-block mr-2"
      >
        Plan upgraden
      </a>
      <a
        href="/kontakt"
        className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md inline-block mr-2"
      >
        Kontakt
      </a>
      <button
        onClick={() => window.history.back()}
        className="mt-4 w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md"
      >
        Zurück
      </button>
    </div>
  </div>
);

// Main page component with Suspense boundary
function AnalyticsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#5C6F68] mx-auto mb-4"></div>
          <p className="text-[#5C6F68] text-lg">Analysen werden geladen...</p>
        </div>
      </main>
    }>
      <AnalyticsContent />
    </Suspense>
  );
}

export default AnalyticsPage;
