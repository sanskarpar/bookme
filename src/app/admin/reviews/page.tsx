"use client";
import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { initializeApp } from "firebase/app";
import Navbar from "../../../components/adminnavbar";
import Footer from "@/components/footer";
import { FiMessageSquare, FiStar, FiAward, FiUser, FiTrash2 } from "react-icons/fi";

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
type Review = {
  _id: string;
  salonUid: string;
  salonName: string;
  customerUid: string;
  customerName: string;
  rating: number;
  comment: string;
  serviceName: string;
  employeeName: string;
  bookingId: string;
  createdAt: string;
  updatedAt: string;
};

type ReviewStats = {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: { [key: number]: number };
  topServices: { name: string; avgRating: number; count: number }[];
  topEmployees: { name: string; avgRating: number; count: number }[];
  recentTrend: 'up' | 'down' | 'neutral';
  trendPercentage: number;
};

export default function ReviewsPage() {
  const [user, setUser] = useState<any>(null);
  const [salon, setSalon] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: {},
    topServices: [],
    topEmployees: [],
    recentTrend: 'neutral',
    trendPercentage: 0
  });
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating-high' | 'rating-low'>('newest');
  const [viewingSalonUid, setViewingSalonUid] = useState<string | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);

  // Get current user and fetch salon info
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser?.email) {
        setLoading(true);
        try {
          // Check if this is system admin viewing another salon's reviews
          const urlParams = new URLSearchParams(window.location.search);
          const salonUidParam = urlParams.get('salonUid');
          const isSystemUser = firebaseUser.email === "system@gmail.com";
          setIsSystemAdmin(isSystemUser);
          
          if (salonUidParam && isSystemUser) {
            // System admin viewing specific salon reviews
            setViewingSalonUid(salonUidParam);
            setUserRole("system");
            
            // Fetch the specific salon data
            const salonRes = await fetch(`/api/salons?uid=${encodeURIComponent(salonUidParam)}`);
            if (salonRes.ok) {
              const salonData = await salonRes.json();
              setSalon(salonData.salon);
              
              if (salonData.salon?.uid) {
                await fetchReviews(salonData.salon.uid);
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
              await fetchReviews(salonData.uid);
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

  const fetchReviews = async (salonUid: string) => {
    try {
      const res = await fetch(`/api/reviews?salonUid=${encodeURIComponent(salonUid)}`);
      const data = await res.json();
      
      if (data.reviews) {
        setReviews(data.reviews);
        calculateStats(data.reviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const calculateStats = (reviewsData: Review[]) => {
    const totalReviews = reviewsData.length;
    const averageRating = totalReviews > 0 
      ? Math.round((reviewsData.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10 
      : 0;

    // Rating distribution
    const ratingDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviewsData.forEach(review => {
      ratingDistribution[review.rating]++;
    });

    // Top services
    const serviceStats: { [key: string]: { total: number; count: number } } = {};
    reviewsData.forEach(review => {
      if (!serviceStats[review.serviceName]) {
        serviceStats[review.serviceName] = { total: 0, count: 0 };
      }
      serviceStats[review.serviceName].total += review.rating;
      serviceStats[review.serviceName].count++;
    });

    const topServices = Object.entries(serviceStats)
      .map(([name, stats]) => ({
        name,
        avgRating: Math.round((stats.total / stats.count) * 10) / 10,
        count: stats.count
      }))
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 5);

    // Top employees
    const employeeStats: { [key: string]: { total: number; count: number } } = {};
    reviewsData.forEach(review => {
      if (!employeeStats[review.employeeName]) {
        employeeStats[review.employeeName] = { total: 0, count: 0 };
      }
      employeeStats[review.employeeName].total += review.rating;
      employeeStats[review.employeeName].count++;
    });

    const topEmployees = Object.entries(employeeStats)
      .map(([name, stats]) => ({
        name,
        avgRating: Math.round((stats.total / stats.count) * 10) / 10,
        count: stats.count
      }))
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 5);

    // Recent trend (compare last 30 days vs previous 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentReviews = reviewsData.filter(r => new Date(r.createdAt) >= thirtyDaysAgo);
    const previousReviews = reviewsData.filter(r => {
      const date = new Date(r.createdAt);
      return date >= sixtyDaysAgo && date < thirtyDaysAgo;
    });

    const recentAvg = recentReviews.length > 0 
      ? recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length 
      : 0;
    const previousAvg = previousReviews.length > 0 
      ? previousReviews.reduce((sum, r) => sum + r.rating, 0) / previousReviews.length 
      : 0;

    let recentTrend: 'up' | 'down' | 'neutral' = 'neutral';
    let trendPercentage = 0;

    if (previousAvg > 0) {
      const change = ((recentAvg - previousAvg) / previousAvg) * 100;
      trendPercentage = Math.abs(Math.round(change * 10) / 10);
      if (change > 5) recentTrend = 'up';
      else if (change < -5) recentTrend = 'down';
    }

    setStats({
      totalReviews,
      averageRating,
      ratingDistribution,
      topServices,
      topEmployees,
      recentTrend,
      trendPercentage
    });
  };

  // Filter and sort reviews
  useEffect(() => {
    let filtered = [...reviews];

    // Filter by rating
    if (filterRating !== null) {
      filtered = filtered.filter(review => review.rating === filterRating);
    }

    // Sort reviews
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'rating-high':
          return b.rating - a.rating;
        case 'rating-low':
          return a.rating - b.rating;
        default:
          return 0;
      }
    });

    setFilteredReviews(filtered);
  }, [reviews, filterRating, sortBy]);

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      const response = await fetch(`/api/reviews?reviewId=${reviewId}&customerUid=admin`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Refresh reviews
        if (salon?.uid) {
          await fetchReviews(salon.uid);
        }
      } else {
        alert('Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Failed to delete review');
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
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
        currentPath="/admin/reviews"
        viewingSalonUid={viewingSalonUid}
        salonName={isSystemAdmin ? salon?.name : undefined}
        salon={salon} // <-- Pass salon object here
      />
      <main className="min-h-screen bg-gray-50 font-sans p-0">
        <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Bewertungen & Rezensionen
              {viewingSalonUid && isSystemAdmin && (
                <span className="text-lg text-gray-600 block mt-1">(System-Ansicht für {salon?.name})</span>
              )}
            </h1>
            <p className="text-gray-600">Verwalten und analysieren Sie Kundenfeedback für {salon?.name}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Gesamtbewertungen</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalReviews}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                  <FiMessageSquare size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Durchschnittliche Bewertung</p>
                  <div className="flex items-center mt-1">
                    <p className="text-2xl font-semibold text-gray-900 mr-2">{stats.averageRating}</p>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <FiStar 
                          key={i} 
                          className={`w-5 h-5 ${i < Math.floor(stats.averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-yellow-50 text-yellow-600">
                  <FiStar size={24} />
                </div>
              </div>
              {stats.recentTrend !== 'neutral' && (
                <div className="mt-2">
                  <span className={`inline-flex items-center text-sm ${
                    stats.recentTrend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stats.recentTrend === 'up' ? '↑' : '↓'} {stats.trendPercentage}% 
                    <span className="ml-1 text-gray-500">im Vergleich zum letzten Monat</span>
                  </span>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Top Dienstleistung</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {stats.topServices[0]?.name || 'Keine Daten'}
                  </p>
                  {stats.topServices[0] && (
                    <p className="text-sm text-gray-600">
                      {stats.topServices[0].avgRating}★ ({stats.topServices[0].count} Bewertungen)
                    </p>
                  )}
                </div>
                <div className="p-3 rounded-full bg-green-50 text-green-600">
                  <FiAward size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Top Mitarbeiter</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {stats.topEmployees[0]?.name || 'Keine Daten'}
                  </p>
                  {stats.topEmployees[0] && (
                    <p className="text-sm text-gray-600">
                      {stats.topEmployees[0].avgRating}★ ({stats.topEmployees[0].count} Bewertungen)
                    </p>
                  )}
                </div>
                <div className="p-3 rounded-full bg-purple-50 text-purple-600">
                  <FiUser size={24} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Rating Distribution */}
            <section className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Bewertungsverteilung</h2>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map(rating => {
                  const count = stats.ratingDistribution[rating] || 0;
                  const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center">
                      <span className="text-sm font-medium w-6">{rating}</span>
                      <FiStar className="w-4 h-4 text-yellow-400 fill-current mx-2" />
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-8">{count}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Top Services */}
            <section className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Dienstleistungen</h2>
              <div className="space-y-4">
                {stats.topServices.slice(0, 5).map((service, index) => (
                  <div key={service.name} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{service.name}</p>
                      <p className="text-sm text-gray-600">{service.count} Bewertungen</p>
                    </div>
                    <div className="flex items-center">
                      <FiStar className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                      <span className="font-semibold">{service.avgRating}</span>
                    </div>
                  </div>
                ))}
                {stats.topServices.length === 0 && (
                  <p className="text-gray-500 text-sm">Noch keine Dienstleistungsbewertungen</p>
                )}
              </div>
            </section>

            {/* Top Employees */}
            <section className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Mitarbeiter</h2>
              <div className="space-y-4">
                {stats.topEmployees.slice(0, 5).map((employee, index) => (
                  <div key={employee.name} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{employee.name}</p>
                      <p className="text-sm text-gray-600">{employee.count} Bewertungen</p>
                    </div>
                    <div className="flex items-center">
                      <FiStar className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                      <span className="font-semibold">{employee.avgRating}</span>
                    </div>
                  </div>
                ))}
                {stats.topEmployees.length === 0 && (
                  <p className="text-gray-500 text-sm">Noch keine Mitarbeiterbewertungen</p>
                )}
              </div>
            </section>
          </div>

          {/* Reviews List */}
          <section className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-xl font-semibold text-gray-900">Alle Bewertungen</h2>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
                  {/* Filter by rating */}
                  <select
                    value={filterRating || ''}
                    onChange={(e) => setFilterRating(e.target.value ? Number(e.target.value) : null)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm text-[#1F1F1F] bg-white w-full sm:w-auto"
                  >
                    <option value="" className="text-[#1F1F1F] bg-white">Alle Bewertungen</option>
                    <option value="5" className="text-[#1F1F1F] bg-white">5 Sterne</option>
                    <option value="4" className="text-[#1F1F1F] bg-white">4 Sterne</option>
                    <option value="3" className="text-[#1F1F1F] bg-white">3 Sterne</option>
                    <option value="2" className="text-[#1F1F1F] bg-white">2 Sterne</option>
                    <option value="1" className="text-[#1F1F1F] bg-white">1 Stern</option>
                  </select>
                  
                  {/* Sort by */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm text-[#1F1F1F] bg-white w-full sm:w-auto"
                  >
                    <option value="newest" className="text-[#1F1F1F] bg-white">Neueste zuerst</option>
                    <option value="oldest" className="text-[#1F1F1F] bg-white">Älteste zuerst</option>
                    <option value="rating-high" className="text-[#1F1F1F] bg-white">Höchste Bewertung</option>
                    <option value="rating-low" className="text-[#1F1F1F] bg-white">Niedrigste Bewertung</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {filteredReviews.length > 0 ? (
                filteredReviews.map((review) => (
                  <div key={review._id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <FiStar 
                                key={i} 
                                className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                          <span className="font-medium text-gray-900">{review.customerName}</span>
                          <span className="text-sm text-gray-500">{getTimeAgo(review.createdAt)}</span>
                        </div>
                        
                        <p className="text-gray-700 mb-3">{review.comment}</p>
                        
                        <div className="flex gap-4 text-sm">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Dienstleistung: {review.serviceName}
                          </span>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                            Mitarbeiter: {review.employeeName}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteReview(review._id)}
                        className="text-red-600 hover:text-red-800 p-2"
                        title="Bewertung löschen"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <FiMessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Bewertungen gefunden</h3>
                  <p className="text-gray-600">
                    {filterRating ? 'Keine Bewertungen entsprechen dem ausgewählten Filter.' : 'Es wurden noch keine Bewertungen abgegeben.'}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
        <Footer />
      </main>
    </>
  );
}

// Loading screen component
const LoadingScreen = () => (
  <main className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
      <p className="text-primary-600 text-lg">Bewertungen werden geladen...</p>
    </div>
  </main>
);

// Auth prompt component
const AuthPrompt = () => (
  <main className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
    <div className="text-center p-6 bg-white rounded-lg shadow-sm max-w-md mx-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff eingeschränkt</h2>
      <p className="text-gray-600 mb-4">Bitte melden Sie sich an, um das Bewertungs-Dashboard zu sehen</p>
      <button className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md">
        Anmelden
      </button>
    </div>
  </main>
);
