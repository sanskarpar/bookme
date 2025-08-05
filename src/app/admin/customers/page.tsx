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

type Customer = {
  uid: string;
  name: string;
  phone: string;
  email?: string;
  address?: {
    street: string;
    number: string;
    zip: string;
    country: string;
  };
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  hasEverMissed: boolean;
  rating: number;
  firstBooking: string;
  lastBooking: string;
  totalSpent: number;
};

type Booking = {
  _id: string;
  customerUid?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: {
    street: string;
    number: string;
    zip: string;
    country: string;
  };
  date: string;
  time: string;
  status: string;
  total: number;
  createdAt: string;
  salonInfo?: {
    name: string;
    email: string;
  };
  services?: Array<{
    name: string;
    price: number;
    employee: string;
  }>;
};

export default function CustomersPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "totalBookings" | "rating" | "totalSpent" | "lastBooking">("rating");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [salon, setSalon] = useState<any>(null);
  const [customerRatings, setCustomerRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser?.email) {
        setLoading(true);
        try {
          const isSystemUser = firebaseUser.email === "system@gmail.com";
          setIsSystemAdmin(isSystemUser);
          
          if (isSystemUser) {
            // System admin - can see all customers or filter by salonUid param
            const urlParams = new URLSearchParams(window.location.search);
            const salonUidParam = urlParams.get('salonUid');
            if (salonUidParam) {
              // System admin viewing specific salon's customers
              const salonRes = await fetch(`/api/salons?uid=${encodeURIComponent(salonUidParam)}`);
              if (salonRes.ok) {
                const salonData = await salonRes.json();
                setSalon(salonData.salon ?? salonData);
                await fetchCustomers(salonUidParam);
                await fetchCustomerRatings(salonUidParam); // fetch ratings
              } else {
                await fetchCustomers(); // fallback to all
              }
            } else {
              await fetchCustomers();
            }
          } else {
            // Regular salon user - fetch salon data
            const res = await fetch(`/api/salons?email=${encodeURIComponent(firebaseUser.email)}`);
            if (!res.ok) throw new Error("Salon nicht gefunden.");
            const data = await res.json();
            setSalon(data.salon ?? data);
            await fetchCustomers(data.salon?.uid);
            if (data.salon?.uid) await fetchCustomerRatings(data.salon.uid); // fetch ratings
          }
        } catch (err) {
          console.error("Error loading salon:", err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchCustomers = async (salonUid?: string) => {
    try {
      // Fetch all bookings (filtered by salon for regular users)
      let bookingsUrl = "/api/bookings";
      if (isSystemAdmin) {
        bookingsUrl += "?systemAdmin=true";
      } else if (salonUid) {
        bookingsUrl += `?salonUid=${encodeURIComponent(salonUid)}`;
      } else {
        return; // No salon data, can't fetch customers
      }

      const bookingsRes = await fetch(bookingsUrl);
      if (!bookingsRes.ok) throw new Error("Failed to fetch bookings");
      
      const bookingsData = await bookingsRes.json();
      const allBookings: Booking[] = bookingsData.bookings || [];

      // Group bookings by customer
      const customerMap = new Map<string, {
        uid?: string;
        name: string;
        phone: string;
        email?: string;
        address?: any;
        bookings: Booking[];
      }>();

      allBookings.forEach(booking => {
        // Use customerUid as primary key, fallback to phone number
        const customerId = booking.customerUid || booking.customerPhone;
        
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            uid: booking.customerUid,
            name: booking.customerName,
            phone: booking.customerPhone,
            address: booking.customerAddress,
            bookings: []
          });
        }
        
        customerMap.get(customerId)!.bookings.push(booking);
      });

      // Calculate customer statistics
      const customerStats: Customer[] = Array.from(customerMap.entries()).map(([customerId, data]) => {
        const { bookings } = data;

        // Only consider completed, cancelled, and no-show for stats
        const relevantBookings = bookings.filter(
          b => b.status === 'completed' || b.status === 'cancelled' || b.status === 'no-show'
        );
        const totalBookings = relevantBookings.length;
        const completedBookings = relevantBookings.filter(b => b.status === 'completed').length;
        const cancelledBookings = relevantBookings.filter(b => b.status === 'cancelled').length;
        const noShowBookings = relevantBookings.filter(b => b.status === 'no-show').length;
        const hasEverMissed = noShowBookings > 0 || cancelledBookings > 0;

        // New rating system: completed = 5 stars, cancelled/no-show = 1 star, average
        let rating = 5;
        if (totalBookings > 0) {
          let totalStars = 0;
          relevantBookings.forEach(b => {
            if (b.status === 'completed') totalStars += 5;
            else if (b.status === 'cancelled' || b.status === 'no-show') totalStars += 1;
          });
          rating = Math.round(totalStars / totalBookings);
          rating = Math.max(1, Math.min(5, rating));
        }

        // Only sum completed bookings for totalSpent
        const totalSpent = relevantBookings
          .filter(b => b.status === 'completed')
          .reduce((sum, booking) => sum + (booking.total || 0), 0);

        const sortedBookings = bookings.sort((a, b) =>
          new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime()
        );
        
        return {
          uid: data.uid || customerId,
          name: data.name,
          phone: data.phone,
          email: data.email,
          address: data.address,
          totalBookings,
          completedBookings,
          cancelledBookings,
          noShowBookings,
          hasEverMissed,
          rating,
          firstBooking: sortedBookings[0]?.date || '',
          lastBooking: sortedBookings[sortedBookings.length - 1]?.date || '',
          totalSpent
        };
      });

      setCustomers(customerStats);
      setFilteredCustomers(customerStats);
    } catch (error) {
      console.error("Error fetching customers:", error);
      setCustomers([]);
      setFilteredCustomers([]);
    }
  };

  // Fetch reviews and map average rating per customer
  const fetchCustomerRatings = async (salonUid: string) => {
    try {
      const res = await fetch(`/api/reviews?salonUid=${encodeURIComponent(salonUid)}`);
      if (!res.ok) return setCustomerRatings({});
      const data = await res.json();
      const reviews = data.reviews || [];
      // Map: customerUid/phone -> [ratings...]
      const ratingMap: Record<string, number[]> = {};
      reviews.forEach((review: any) => {
        const key = review.customerUid || review.customerPhone;
        if (!ratingMap[key]) ratingMap[key] = [];
        ratingMap[key].push(review.rating);
      });
      // Compute average per customer
      const avgMap: Record<string, number> = {};
      Object.entries(ratingMap).forEach(([key, arr]) => {
        avgMap[key] = arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;
      });
      setCustomerRatings(avgMap);
    } catch {
      setCustomerRatings({});
    }
  };

  // Filter and sort customers
  useEffect(() => {
    let filtered = customers.filter(customer => {
      const searchLower = searchTerm.toLowerCase();
      return (
        customer.name.toLowerCase().includes(searchLower) ||
        customer.phone.includes(searchTerm) ||
        (customer.email && customer.email.toLowerCase().includes(searchLower))
      );
    });

    // Sort customers
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "totalBookings":
          comparison = a.totalBookings - b.totalBookings;
          break;
        case "rating":
          comparison = a.rating - b.rating;
          break;
        case "totalSpent":
          comparison = a.totalSpent - b.totalSpent;
          break;
        case "lastBooking":
          comparison = new Date(a.lastBooking).getTime() - new Date(b.lastBooking).getTime();
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });

    setFilteredCustomers(filtered);
  }, [customers, searchTerm, sortBy, sortOrder]);

  const getRatingStars = (rating: number) => {
    const rounded = Math.round(rating);
    return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return '#22c55e';
    if (rating >= 3) return '#f59e0b';
    return '#ef4444';
  };

  const handleCustomerClick = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(true);

    // Fetch detailed bookings for this customer
    try {
      let bookingsUrl = "/api/bookings";
      if (isSystemAdmin) {
        bookingsUrl += "?systemAdmin=true";
      } else if (salon?.uid) {
        bookingsUrl += `?salonUid=${encodeURIComponent(salon.uid)}`;
      }

      const bookingsRes = await fetch(bookingsUrl);
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        const allBookings: Booking[] = bookingsData.bookings || [];

        // Use email for segregation if available, else fallback to UID or phone
        const customerBookings = allBookings.filter(booking =>
          (customer.uid && booking.customerUid === customer.uid) ||
          (booking.customerPhone === customer.phone) ||
          (customer.name && booking.customerName && booking.customerName.toLowerCase() === customer.name.toLowerCase())
        );

        setCustomerBookings(customerBookings.sort((a, b) =>
          new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
        ));
      }
    } catch (error) {
      console.error("Error fetching customer bookings:", error);
      setCustomerBookings([]);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Name",
      "Telefon", 
      "E-Mail",
      "Adresse",
      "Gesamt Buchungen",
      "Abgeschlossen",
      "Storniert", 
      "Nicht erschienen",
      "Jemals verpasst",
      "Kundenzufriedenheit",
      "Erste Buchung",
      "Letzte Buchung",
      "Gesamt ausgegeben (€)"
    ];

    const csvData = filteredCustomers.map(customer => [
      customer.name,
      customer.phone,
      customer.email || "",
      customer.address ? `${customer.address.street} ${customer.address.number}, ${customer.address.zip} ${customer.address.country}` : "",
      customer.totalBookings,
      customer.completedBookings,
      customer.cancelledBookings,
      customer.noShowBookings,
      customer.hasEverMissed ? "Ja" : "Nein",
      `${customer.rating}/5`,
      customer.firstBooking,
      customer.lastBooking,
      customer.totalSpent.toFixed(2)
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `kunden_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <>
        <Navbar user={user} />
        <main className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-black text-lg">Lade Kundendaten...</p>
          </div>
        </main>
        <Footer />
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
            <p className="text-black mb-4">Melden Sie sich an, um die Kundenverwaltung zu sehen.</p>
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
        currentPath="/admin/customers"
        viewingSalonUid={isSystemAdmin ? (salon?.uid ?? null) : undefined}
        salonName={isSystemAdmin ? salon?.name : undefined}
        salon={salon} // <-- Pass salon object here
      />
      {/* Blur overlay when modal is open */}
      {showCustomerModal && (
        <div
          className="fixed inset-0 z-40"
          style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
        />
      )}
      <main className="min-h-screen bg-gray-50 font-sans p-0 transition-all duration-300">
        <div className="max-w-7xl mx-auto pt-8 pb-0 px-2 sm:px-4 lg:px-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">
              Kundenverwaltung
              {isSystemAdmin && (
                <span className="text-lg text-gray-600 block mt-1">
                  (System-Ansicht{salon?.name ? ` für ${salon.name}` : ""})
                </span>
              )}
            </h1>
            <p className="text-black text-base sm:text-lg">
              Verwalten Sie Ihre Kunden und analysieren Sie deren Buchungsverhalten
            </p>
          </div>

          {/* Controls */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <input
                  type="text"
                  placeholder="Suche nach Name, Telefon oder E-Mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-black"
                />
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-black"
                  >
                    <option value="rating">Bewertung</option>
                    <option value="name">Name</option>
                    <option value="totalBookings">Buchungen</option>
                    <option value="totalSpent">Ausgaben</option>
                    <option value="lastBooking">Letzte Buchung</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-black"
                    title={sortOrder === "asc" ? "Aufsteigend" : "Absteigend"}
                  >
                    {sortOrder === "asc" ? "↑" : "↓"}
                  </button>
                </div>
              </div>
              <button
                onClick={exportToCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2"
              >
                📊 CSV Export
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Gesamt Kunden</h3>
              <p className="text-2xl font-bold text-black">{filteredCustomers.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-sm font-medium text-gray-600 mb-1">🚫 No-Shows</h3>
              <p className="text-2xl font-bold text-red-600">
                {filteredCustomers.filter(c => c.noShowBookings > 0).length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-sm font-medium text-gray-600 mb-1">💰 Gesamt Umsatz</h3>
              <p className="text-2xl font-bold text-black">
                €{filteredCustomers.reduce((sum, c) => sum + c.totalSpent, 0).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Customers Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kunde
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durchschnittliche Bewertung
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Buchungen
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ausgaben
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Letzte Buchung
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCustomers.map((customer, index) => {
                    const avgRating = customerRatings[customer.uid] ?? 0;
                    return (
                      <tr 
                        key={customer.uid} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleCustomerClick(customer)}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-black">{customer.name}</div>
                            <div className="text-sm text-gray-500">{customer.phone}</div>
                            {customer.email && (
                              <div className="text-xs text-gray-400">{customer.email}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span style={{ color: getRatingColor(avgRating) }}>
                              {getRatingStars(avgRating)}
                            </span>
                            <span className="text-sm font-medium text-black">
                              {avgRating > 0 ? `${avgRating}/5` : "-"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-black">{customer.totalBookings} gesamt</div>
                          <div className="text-xs text-gray-500">
                            {customer.completedBookings} abgeschlossen
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            {customer.noShowBookings > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {customer.noShowBookings} No-Shows
                              </span>
                            )}
                            {customer.cancelledBookings > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {customer.cancelledBookings} Storniert
                              </span>
                            )}
                            {!customer.hasEverMissed && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Zuverlässig
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-black">
                          €{customer.totalSpent.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customer.lastBooking ? new Date(customer.lastBooking).toLocaleDateString('de-DE') : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {filteredCustomers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Keine Kunden gefunden.
              </div>
            )}
          </div>

          {/* Customer Detail Modal */}
          {showCustomerModal && selectedCustomer && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl relative">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-black">{selectedCustomer.name}</h2>
                      <p className="text-gray-600">{selectedCustomer.phone}</p>
                      {selectedCustomer.email && (
                        <p className="text-gray-600">{selectedCustomer.email}</p>
                      )}
                      {selectedCustomer.address && (
                        <p className="text-gray-600">
                          {selectedCustomer.address.street} {selectedCustomer.address.number}, {selectedCustomer.address.zip} {selectedCustomer.address.country}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowCustomerModal(false)}
                      className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                    >
                      ×
                    </button>
                  </div>

                  {/* Customer Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-600">Durchschnittliche Bewertung</div>
                      <div className="flex items-center gap-1">
                        <span style={{ color: getRatingColor(customerRatings[selectedCustomer.uid] ?? 0) }}>
                          {getRatingStars(customerRatings[selectedCustomer.uid] ?? 0)}
                        </span>
                        <span className="font-bold">
                          {customerRatings[selectedCustomer.uid] > 0
                            ? `${customerRatings[selectedCustomer.uid]}/5`
                            : "-"}
                        </span>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-600">Buchungen</div>
                      <div className="font-bold text-lg text-black">{selectedCustomer.totalBookings}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-600">No-Shows</div>
                      <div className="font-bold text-lg text-red-600">{selectedCustomer.noShowBookings}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-600">Ausgaben</div>
                      <div className="font-bold text-lg text-black">€{selectedCustomer.totalSpent.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Booking History */}
                  <h3 className="text-lg font-bold text-black mb-4">Buchungshistorie</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {customerBookings.map((booking, index) => (
                      <div key={booking._id || index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-black">
                              {booking.date} um {booking.time}
                            </div>
                            <div className="text-sm text-gray-600">
                              {booking.salonInfo?.name || 'Salon'}
                            </div>
                            <div className="text-sm text-gray-600">
                              {booking.services?.map(s => s.name).join(', ') || 'Services'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-black">€{booking.total}</div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                              booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                              booking.status === 'cancelled' ? 'bg-yellow-100 text-yellow-800' :
                              booking.status === 'no-show' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {booking.status === 'completed' ? 'Abgeschlossen' :
                               booking.status === 'confirmed' ? 'Bestätigt' :
                               booking.status === 'cancelled' ? 'Storniert' :
                               booking.status === 'no-show' ? 'Nicht erschienen' :
                               booking.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {customerBookings.length === 0 && (
                      <div className="text-center text-gray-500 py-4">
                        Keine Buchungshistorie verfügbar.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}