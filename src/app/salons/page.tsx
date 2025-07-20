"use client";
import React, { useEffect, useState } from "react";
import { FiMapPin, FiPhone, FiScissors, FiStar, FiFilter, FiX } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import Navbar from "../../components/navbar";

// Color palette (same as dashboard)
const COLORS = {
  primary: "#5C6F68",
  accent: "#E4DED5",
  text: "#1F1F1F",
  highlight: "#9DBE8D",
  background: "#FAFAFA",
  card: "#fff",
  border: "#E4DED5"
};

// Replace with your actual fetch function or API endpoint
const fetchSalons = async () => {
  const res = await fetch("/api/salons"); // Adjust endpoint as needed
  if (!res.ok) throw new Error("Failed to fetch salons");
  return res.json();
};

function slugify(name: string | undefined) {
  if (!name || typeof name !== "string") return "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

const fetchServices = async (uids: string[]) => {
  const url = `/api/services?${uids.map(uid => `uids=${encodeURIComponent(uid)}`).join('&')}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch services");
  const data = await res.json();
  return data.services || [];
};

export default function SalonsPage() {
  const [salons, setSalons] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [filterText, setFilterText] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price-low" | "price-high">("name");
  const [ratings, setRatings] = useState<{ [uid: string]: number }>({});
  const [filterRating, setFilterRating] = useState<number>(0);
  const [filterService, setFilterService] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");
  const [initialLoad, setInitialLoad] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const salonData = await fetchSalons();
        const salonsArray = Array.isArray(salonData.salons) ? salonData.salons : [];
        // Only use salons with a valid uid
        const uids = salonsArray
          .filter((salon: any) => typeof salon.uid === "string" && salon.uid.length > 0)
          .map((salon: any) => salon.uid);

        const services = await fetchServices(uids);

        setSalons(salonsArray);
        setServices(services);
      } catch (error) {
        setSalons([]);
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = window.localStorage.getItem("bookme_user");
      if (userStr) {
        try {
          setUser(JSON.parse(userStr));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    }
  }, []);

  // Fetch ratings for salons
  useEffect(() => {
    async function fetchRatings() {
      const ratingsObj: { [uid: string]: number } = {};
      await Promise.all(
        salons.map(async salon => {
          if (salon.uid) {
            try {
              const res = await fetch(`/api/reviews?salonUid=${encodeURIComponent(salon.uid)}`);
              const data = await res.json();
              ratingsObj[salon.uid] = typeof data.averageRating === "number" ? data.averageRating : 0;
            } catch {
              ratingsObj[salon.uid] = 0;
            }
          }
        })
      );
      setRatings(ratingsObj);
    }
    if (salons.length > 0) fetchRatings();
  }, [salons]);

  // Pre-fill search bar from URL params on first load only
  useEffect(() => {
    if (initialLoad && searchParams) {
      const name = searchParams.get("name") || "";
      const treatment = searchParams.get("treatment") || "";
      const date = searchParams.get("date") || "";
      
      // Set the search bar value from URL params
      if (name || treatment) {
        setFilterText(name || treatment);
      }
      if (treatment) setFilterService(treatment);
      if (date) setFilterDate(date);
      
      setInitialLoad(false);
    }
  }, [searchParams, initialLoad]);

  // Helper function to check if salon is open on a specific date
  const isSalonOpenAt = (salon: any, date: string) => {
    if (!date) return true; // No date filter means show all
    
    const checkDate = new Date(date);
    const dayName = checkDate.toLocaleDateString('de-DE', { weekday: 'long' });
    
    // Check salon working hours
    const workingDay = salon.workingDays?.[dayName];
    if (!workingDay?.open) return false;
    
    // Check if it's a holiday
    if (Array.isArray(salon.holidays) && salon.holidays.includes(date)) return false;
    
    // Check employee availability if employees are defined
    if (Array.isArray(salon.employees) && salon.employees.length > 0) {
      const hasAvailableEmployee = salon.employees.some((employee: any) => {
        const empSchedule = employee.schedule?.[dayName];
        const empHolidays = employee.holidays || [];
        
        if (!empSchedule?.open || empHolidays.includes(date)) return false;
        
        return true;
      });
      
      return hasAvailableEmployee;
    }
    
    return true;
  };

  // Helper to get price range for a salon by uid
  function getPriceRange(uid: string) {
    const salonServices = Array.isArray(services) ? services.filter((s) => s.uid === uid) : [];
    if (salonServices.length === 0) return null;

    const allPrices: number[] = [];
    for (const service of salonServices) {
      // Handle new durationPrices structure
      if (service.durationPrices && Array.isArray(service.durationPrices)) {
        service.durationPrices.forEach((dp: any) => {
          if (dp.price && !isNaN(Number(dp.price))) {
            allPrices.push(Number(dp.price));
          }
        });
      }
      // Fallback for old structure
      else if (service.price !== undefined && service.price !== null && !isNaN(Number(service.price))) {
        allPrices.push(Number(service.price));
      }
      else if (
        service.pricePerBlock !== undefined && service.pricePerBlock !== null && !isNaN(Number(service.pricePerBlock)) &&
        service.priceBlockSize !== undefined && service.priceBlockSize !== null && !isNaN(Number(service.priceBlockSize)) &&
        service.duration !== undefined && service.duration !== null && !isNaN(Number(service.duration))
      ) {
        const blocks = Math.ceil(Number(service.duration) / Number(service.priceBlockSize));
        const totalPrice = blocks * Number(service.pricePerBlock);
        allPrices.push(totalPrice);
      }
      else if (service.pricePerBlock !== undefined && service.pricePerBlock !== null && !isNaN(Number(service.pricePerBlock))) {
        allPrices.push(Number(service.pricePerBlock));
      }
    }

    if (allPrices.length === 0) return null;

    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);

    if (minPrice === maxPrice) return `€${minPrice}`;
    return `€${minPrice} - €${maxPrice}`;
  }

  // Filter and sort salons
  let filteredSalons = salons
    .filter(salon => {
      if (filterText === "") return true;
      
      const searchTerm = filterText.toLowerCase();
      
      // First priority: salon name match
      if (salon.name?.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Second priority: service name match
      const hasMatchingService = services.some(s => 
        s.uid === salon.uid && s.name?.toLowerCase().includes(searchTerm)
      );
      
      return hasMatchingService;
    })
    .filter(salon =>
      filterRating === 0 || (ratings[salon.uid] ?? 0) >= filterRating
    )
    .filter(salon => {
      if (!filterService) return true;
      // Check if this is from homepage "treatment" search (match by service name)
      const treatmentParam = searchParams?.get("treatment");
      if (treatmentParam && filterService === treatmentParam) {
        return services.some(s => s.uid === salon.uid && s.name?.toLowerCase().includes(filterService.toLowerCase()));
      }
      // Otherwise match by serviceType (for dropdown filter)
      return services.some(s => s.uid === salon.uid && s.serviceType === filterService);
    })
    .filter(salon => {
      // Check if salon is open on the selected date
      return isSalonOpenAt(salon, filterDate);
    });

  // Sorting logic - with priority for salon name matches when searching
  if (sortBy === "name") {
    filteredSalons = filteredSalons.sort((a, b) => {
      const aName = typeof a.name === "string" ? a.name : "";
      const bName = typeof b.name === "string" ? b.name : "";
      return aName.localeCompare(bName);
    });
  } else if (sortBy === "price-low" || sortBy === "price-high") {
    filteredSalons = filteredSalons.slice().sort((a, b) => {
      const aPrices = (() => {
        const pr = getPriceRange(a.uid);
        if (!pr) return Infinity;
        const nums = pr.replace(/[^\d\-]/g, "").split("-").map(Number);
        return nums.length === 2 ? nums[0] : nums[0];
      })();
      const bPrices = (() => {
        const pr = getPriceRange(b.uid);
        if (!pr) return Infinity;
        const nums = pr.replace(/[^\d\-]/g, "").split("-").map(Number);
        return nums.length === 2 ? nums[0] : nums[0];
      })();
      return sortBy === "price-low" ? aPrices - bPrices : bPrices - aPrices;
    });
  } else if (sortBy === "rating") {
    filteredSalons = filteredSalons.slice().sort((a, b) => {
      const aRating = ratings[a.uid] ?? 0;
      const bRating = ratings[b.uid] ?? 0;
      return bRating - aRating; // Descending order
    });
  }

  // Use serviceType for filter dropdown
  const allServiceTypes = Array.from(
    new Set(Array.isArray(services) ? services.map(s => s.serviceType).filter(Boolean) : [])
  );

  return (
    <main className="min-h-screen bg-gray-50 font-sans p-0">
      {/* Pass user to Navbar */}
      <Navbar user={user} />
      <div className="max-w-6xl mx-auto py-4 sm:py-8 px-2 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <FiScissors className="mr-2 text-[#5C6F68]" /> Alle Salons
              </h1>
            </div>
            <div className="flex items-center w-full md:w-auto">
              <input
                type="text"
                placeholder="Suche nach Salonname oder Dienstleistung..."
                value={filterText}
                onChange={e => {
                  setFilterText(e.target.value);
                  if (filterService) {
                    setFilterService("");
                  }
                }}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm text-[#1F1F1F] bg-white w-full md:w-auto focus:ring-2 focus:ring-[#5C6F68] focus:border-transparent"
                style={{ minWidth: 0 }}
              />
            </div>
          </div>
          {/* Mobile Filters & Sort Button */}
          <div className="flex sm:hidden mt-2">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-[#5C6F68] text-white rounded-md font-medium w-full justify-center"
              onClick={() => setShowFilterModal(true)}
            >
              <FiFilter className="w-5 h-5" />
              Filter & Sortieren
            </button>
          </div>
          {/* Desktop Filters & Sort */}
          <div className="hidden sm:flex flex-col sm:flex-row gap-2 md:gap-4 items-stretch sm:items-center">
            <div className="flex flex-col sm:flex-row gap-2 flex-1 overflow-x-auto">
              <select
                value={filterService}
                onChange={e => setFilterService(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm text-[#1F1F1F] bg-white w-full sm:min-w-[160px] focus:ring-2 focus:ring-[#5C6F68] focus:border-transparent"
              >
                <option value="">Alle Dienstleistungsarten</option>
                {allServiceTypes.map(serviceType => (
                  <option key={serviceType} value={serviceType}>
                    {serviceType}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm text-[#1F1F1F] bg-white w-full sm:min-w-[140px] focus:ring-2 focus:ring-[#5C6F68] focus:border-transparent"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm text-[#1F1F1F] bg-white w-full sm:min-w-[140px] focus:ring-2 focus:ring-[#5C6F68] focus:border-transparent"
              >
                <option value="name" className="text-[#1F1F1F] bg-white">Sortieren nach Name</option>
                <option value="price-low" className="text-[#1F1F1F] bg-white">Preis: aufsteigend</option>
                <option value="price-high" className="text-[#1F1F1F] bg-white">Preis: absteigend</option>
                <option value="rating" className="text-[#1F1F1F] bg-white">Sortieren nach Bewertung</option>
              </select>
              <select
                value={filterRating}
                onChange={e => setFilterRating(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm text-[#1F1F1F] bg-white w-full sm:min-w-[120px] focus:ring-2 focus:ring-[#5C6F68] focus:border-transparent"
              >
                <option value={0}>Alle Bewertungen</option>
                <option value={1}>1+ Sterne</option>
                <option value={2}>2+ Sterne</option>
                <option value={3}>3+ Sterne</option>
                <option value={4}>4+ Sterne</option>
                <option value={5}>5 Sterne</option>
              </select>
            </div>
          </div>
          {/* Mobile Filters Modal */}
          {showFilterModal && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-white/60">
              <div className="bg-white w-full sm:w-[400px] rounded-t-lg sm:rounded-lg shadow-lg p-6 relative animate-slide-up">
              <button
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                onClick={() => setShowFilterModal(false)}
                aria-label="Schließen"
              >
                <FiX className="w-6 h-6" />
              </button>
                <h2 className="text-lg font-semibold mb-4 text-[#5C6F68] flex items-center">
                  <FiFilter className="mr-2" /> Filter & Sortieren
                </h2>
                <div className="flex flex-col gap-4">
                  <select
                    value={filterService}
                    onChange={e => setFilterService(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm text-[#1F1F1F] bg-white"
                  >
                    <option value="">Alle Dienstleistungsarten</option>
                    {allServiceTypes.map(serviceType => (
                      <option key={serviceType} value={serviceType}>
                        {serviceType}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm text-[#1F1F1F] bg-white"
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm text-[#1F1F1F] bg-white"
                  >
                    <option value="name" className="text-[#1F1F1F] bg-white">Sortieren nach Name</option>
                    <option value="price-low" className="text-[#1F1F1F] bg-white">Preis: aufsteigend</option>
                    <option value="price-high" className="text-[#1F1F1F] bg-white">Preis: absteigend</option>
                    <option value="rating" className="text-[#1F1F1F] bg-white">Sortieren nach Bewertung</option>
                  </select>
                  <select
                    value={filterRating}
                    onChange={e => setFilterRating(Number(e.target.value))}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm text-[#1F1F1F] bg-white"
                  >
                    <option value={0}>Alle Bewertungen</option>
                    <option value={1}>1+ Sterne</option>
                    <option value={2}>2+ Sterne</option>
                    <option value={3}>3+ Sterne</option>
                    <option value={4}>4+ Sterne</option>
                    <option value={5}>5 Sterne</option>
                  </select>
                  <button
                    className="mt-2 bg-[#5C6F68] text-white rounded-md px-4 py-2 font-medium"
                    onClick={() => setShowFilterModal(false)}
                  >
                    Anwenden
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <p className="text-gray-600 mb-6 sm:mb-8 text-center text-sm sm:text-base px-2">
          Durchstöbern Sie alle Salons und finden Sie Ihren nächsten Termin.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {filteredSalons
            .filter(salon => typeof salon.name === "string" && salon.name.length > 0)
            .map(salon => {
              const slug = slugify(salon.name);
              return (
                <div
                  key={salon._id}
                  className="bg-white rounded-lg shadow-sm border border-[#E4DED5] flex flex-col overflow-hidden hover:shadow-md transform hover:-translate-y-1 transition-all duration-200"
                >
                  {salon.imageUrls && salon.imageUrls.length > 0 && (
                    <img
                      src={salon.imageUrls[0]}
                      alt={salon.name}
                      className="w-full h-40 sm:h-48 object-cover"
                      style={{ background: COLORS.accent }}
                    />
                  )}
                  <div className="p-4 sm:p-6 flex-1 flex flex-col">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 flex items-start break-words">
                      <FiScissors className="mr-2 text-[#5C6F68] flex-shrink-0 mt-1" /> 
                      <span className="break-words">{salon.name}</span>
                    </h2>
                    <p className="text-[#5C6F68] font-medium mb-2 text-sm sm:text-base">
                      {getPriceRange(salon.uid) ? (
                        <>Preisbereich: {getPriceRange(salon.uid)}</>
                      ) : (
                        <>Keine Preisinformation</>
                      )}
                    </p>
                    <div className="flex items-center mb-2">
                      {[...Array(5)].map((_, i) => (
                        <FiStar
                          key={i}
                          className={`w-4 h-4 sm:w-5 sm:h-5 ${i < Math.round(ratings[salon.uid] || 0) ? "text-[#9DBE8D] fill-current" : "text-gray-300"}`}
                        />
                      ))}
                      <span className="ml-2 text-[#1F1F1F] font-medium text-sm sm:text-base">
                        {typeof ratings[salon.uid] === "number" ? ratings[salon.uid].toFixed(1) : "0.0"}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2 text-sm sm:text-base line-clamp-3 flex-grow">{salon.description}</p>
                    <div className="mt-auto space-y-1">
                      <div className="flex items-start text-gray-600 text-xs sm:text-sm">
                        <FiMapPin className="mr-1 text-[#9DBE8D] flex-shrink-0 mt-0.5" />
                        <span className="break-words">{salon.location}</span>
                      </div>
                      <div className="flex items-center text-gray-600 text-xs sm:text-sm">
                        <FiPhone className="mr-1 text-[#5C6F68] flex-shrink-0" />
                        <span className="break-all">{salon.contact}</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <button
                        className="bg-[#5C6F68] hover:bg-[#4a5a54] text-white font-medium py-2.5 px-4 rounded-md w-full transition-colors duration-200 text-sm sm:text-base active:bg-[#3d4a44]"
                        onClick={() => router.push(`/salon/${slug}`)}
                      >
                        Jetzt buchen
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>
    </main>
  );
}