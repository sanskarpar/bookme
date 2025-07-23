"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/navbar";
import Footer from "../../components/footer";
import { FiCalendar, FiClock, FiMapPin, FiUser, FiScissors } from "react-icons/fi";

const COLORS = {
  primary: "#5C6F68",
  accent: "#E4DED5",
  text: "#1F1F1F",
  highlight: "#9DBE8D",
};

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
};

type Salon = {
  _id: string;
  name: string;
  location: string;
  imageUrls: string[];
};

export default function BookingsPage() {
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [salons, setSalons] = useState<{[key: string]: Salon}>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    if (typeof window !== "undefined") {
      const userStr = window.localStorage.getItem("bookme_user");
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          setUser(userObj);
          fetchBookings(userObj.uid);
        } catch {
          router.push("/login");
        }
      } else {
        router.push("/login");
      }
    }
  }, [router]);

  const fetchBookings = async (customerUid: string) => {
    try {
      const res = await fetch(`/api/bookings?customerUid=${encodeURIComponent(customerUid)}`);
      const data = await res.json();
      
      if (data.bookings) {
        // Sort bookings by date and time (most recent first)
        const sortedBookings = data.bookings.sort((a: Booking, b: Booking) => {
          const dateTimeA = new Date(`${a.date}T${a.time}`);
          const dateTimeB = new Date(`${b.date}T${b.time}`);
          return dateTimeB.getTime() - dateTimeA.getTime();
        });
        
        setBookings(sortedBookings);
        
        // Fetch salon details for each booking
        const salonUids = [...new Set(sortedBookings.map((b: Booking) => b.salonUid))] as string[];
        fetchSalons(salonUids);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalons = async (salonUids: string[]) => {
    try {
      const salonData: {[key: string]: Salon} = {};
      
      for (const uid of salonUids) {
        const res = await fetch(`/api/salons?uid=${encodeURIComponent(uid)}`);
        const data = await res.json();
        if (data.salon) {
          salonData[uid] = data.salon;
        }
      }
      
      setSalons(salonData);
    } catch (error) {
      console.error('Error fetching salons:', error);
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("bookme_user");
    }
    router.push("/");
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#22c55e';
      case 'cancelled': return '#ef4444';
      case 'completed': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#5C6F68] mx-auto mb-4"></div>
            <p className="text-[#5C6F68] text-lg">Loading your bookings...</p>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={handleLogout} />
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <FiCalendar className="mr-2 text-[#5C6F68]" /> Ihre Buchungen
          </h1>
          <p className="text-gray-600">Sehen und verwalten Sie Ihre Salontermine</p>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-16">
            <FiScissors className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">Noch keine Buchungen</h2>
            <p className="text-gray-600 mb-6">Sie haben bisher keine Salontermine gebucht.</p>
            <a
              href="/salons"
              className="bg-[#5C6F68] hover:bg-[#4a5a54] text-white font-medium py-2 px-4 rounded-md transition"
              style={{ textDecoration: "none" }}
            >
              Salons durchsuchen
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking) => {
              const salon = salons[booking.salonUid];
              return (
                <div
                  key={booking._id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {salon?.name || 'Salon'}
                      </h3>
                      <div className="flex items-center text-gray-600 text-sm mb-2">
                        <FiMapPin className="w-4 h-4 mr-1" />
                        {salon?.location || 'Ort nicht verfügbar'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className="inline-block px-3 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: getStatusColor(booking.status) }}
                      >
                        {booking.status === 'confirmed' && 'Bestätigt'}
                        {booking.status === 'cancelled' && 'Storniert'}
                        {booking.status === 'completed' && 'Abgeschlossen'}
                        {!['confirmed', 'cancelled', 'completed'].includes(booking.status) && booking.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center text-gray-700">
                      <FiCalendar className="w-4 h-4 mr-2 text-[#5C6F68]" />
                      <span>
                        {(() => {
                          const date = new Date(booking.date);
                          return date.toLocaleDateString('de-DE', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          });
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <FiClock className="w-4 h-4 mr-2 text-[#5C6F68]" />
                      <span>{booking.time}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Dienstleistungen:</h4>
                    <div className="space-y-2">
                      {booking.services.map((service, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div className="flex items-center">
                            <FiScissors className="w-4 h-4 mr-2 text-[#9DBE8D]" />
                            <span className="text-gray-700">{service.name}</span>
                            <span className="text-gray-500 text-sm ml-2">
                              ({service.duration} Minuten)
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900">€{service.price}</div>
                            <div className="text-xs text-gray-500 flex items-center">
                              <FiUser className="w-3 h-3 mr-1" />
                              {service.employee}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between items-center">
                      <span className="font-medium text-gray-900">Gesamt:</span>
                      <span className="text-lg font-bold text-[#5C6F68]">€{booking.total}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
