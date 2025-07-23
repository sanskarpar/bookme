"use client";
import React, { useEffect, useState, useRef, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiMapPin, FiPhone, FiScissors, FiClock, FiStar, FiArrowLeft, FiUser, FiEdit, FiTrash2 } from "react-icons/fi";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import Footer from "@/components/footer";

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

type Salon = {
  _id: string;
  uid: string;
  name: string;
  contact: string;
  description: string;
  location: string;
  imageUrls: string[];
  googleMapsAddress?: string;
};

type Service = {
  _id: string;
  name: string;
  description: string;
  imageUrl: string;
  uid: string;
  salonName?: string;
  serviceType?: string;
  durationPrices?: { duration: number; price: number }[];
  selectedOption?: { duration: number; price: number };
  price?: number;
  duration?: number;
};

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

export default function SalonPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [cartServices, setCartServices] = useState<Service[]>([]);
  const [showCartDropdown, setShowCartDropdown] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [canReview, setCanReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewFormData, setReviewFormData] = useState({
    rating: 5,
    comment: "",
    serviceName: "",
    employeeName: ""
  });
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [user] = useAuthState(auth);
  const servicesRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);
  const [eligibleReviews, setEligibleReviews] = useState<any[]>([]);
  const [selectedReviewableService, setSelectedReviewableService] = useState<any>(null);
  const [detailsService, setDetailsService] = useState<Service | null>(null);
  const [serviceReviews, setServiceReviews] = useState<Review[]>([]);
  const [serviceAverageRating, setServiceAverageRating] = useState<number>(0);
  const [selectedDurations, setSelectedDurations] = useState<{ [serviceId: string]: { duration: number; price: number } }>({});

  // Load cart from localStorage on mount
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("salon_cart_services") : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCartServices(parsed);
      } catch {}
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("salon_cart_services", JSON.stringify(cartServices));
    }
  }, [cartServices]);

  useEffect(() => {
    async function fetchSalonAndServices() {
      setLoading(true);
      // Fetch salon details by name
      const salonRes = await fetch(`/api/salons?name=${encodeURIComponent(slug as string)}`);
      const salonData = await salonRes.json();
      setSalon(salonData.salon);

      // Fetch services for this salon by uid
      if (salonData.salon?.uid) {
        const servicesRes = await fetch(`/api/services?uid=${encodeURIComponent(salonData.salon.uid)}`);
        const servicesData = await servicesRes.json();
        setServices(servicesData.services);
      } else {
        setServices([]);
      }

      setLoading(false);
    }
    if (slug) fetchSalonAndServices();
  }, [slug]);

  // Carousel scroll logic
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollCarousel = (dir: "left" | "right") => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
    }
  };

  // Group services by serviceType
  const serviceTypeMap: { [type: string]: Service[] } = {};
  services.forEach(service => {
    const type = service.serviceType || "Other";
    if (!serviceTypeMap[type]) serviceTypeMap[type] = [];
    serviceTypeMap[type].push(service);
  });
  const serviceTypes = Object.keys(serviceTypeMap);

  // Add "All Services" option
  const allServiceTypes = ["All Services", ...serviceTypes];

  useEffect(() => {
    if (serviceTypes.length > 0 && !selectedType) setSelectedType("All Services");
  }, [services]);

  const scrollToServices = () => {
    servicesRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  const scrollToAbout = () => {
    aboutRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  const scrollToReviews = () => {
    reviewsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Add/remove service from cart with selected duration/price
  const toggleServiceInCart = (service: Service, selectedOption?: { duration: number; price: number }) => {
    setCartServices(prev => {
      const exists = prev.find(s => s._id === service._id);
      if (exists) {
        return prev.filter(s => s._id !== service._id);
      } else {
        const option = selectedOption || selectedDurations[service._id] || (service.durationPrices && service.durationPrices[0]);
        return [...prev, { 
          ...service, 
          price: option?.price || 0,
          duration: option?.duration || 0,
          selectedOption: option 
        }];
      }
    });
  };

  // Proceed to booking with selected services
  const proceedToBooking = () => {
    if (cartServices.length > 0 && salon) {
      // Check if user is logged in
      if (!user) {
        // Save current page URL and cart state for redirect after login
        if (typeof window !== "undefined") {
          window.localStorage.setItem("bookme_redirect_after_login", window.location.href);
          window.localStorage.setItem("salon_booking_salon", JSON.stringify(salon));
        }
        // Redirect to login
        router.push("/login");
        return;
      }

      // Save salon details to localStorage
      if (typeof window !== "undefined") {
        window.localStorage.setItem("salon_booking_salon", JSON.stringify(salon));
      }
      // Pass selected service IDs as query param
      const ids = cartServices.map(s => s._id).join(",");
      router.push(`/salon/${slug}/book?serviceIds=${ids}`);
    }
  };

  // Fetch reviews and check if user can review
  useEffect(() => {
    async function fetchReviews() {
      if (!salon?.uid) return;
      
      try {
        if (!salon) return;
        if (!salon) return;
        const reviewsRes = await fetch(`/api/reviews?salonUid=${salon.uid}`);
        const reviewsData = await reviewsRes.json();
        setReviews(reviewsData.reviews || []);
        setAverageRating(reviewsData.averageRating || 0);
        setTotalReviews(reviewsData.totalReviews || 0);

        // Check what services user can review
        if (user?.uid) {
          const bookingsRes = await fetch(`/api/bookings?salonUid=${salon.uid}&customerUid=${user.uid}`);
          const bookingsData = await bookingsRes.json();
          
          // Get all eligible service/employee combinations from completed/cancelled bookings
          const eligibleServices: any[] = [];
          bookingsData.bookings?.forEach((booking: any) => {
            if (booking.status === "completed" || booking.status === "cancelled") {
              booking.services?.forEach((service: any) => {
                // Check if this service/employee combo hasn't been reviewed yet
                const alreadyReviewed = reviewsData.reviews?.some((review: Review) => 
                  review.customerUid === user.uid && 
                  review.serviceName === service.name && 
                  review.employeeName === service.employee &&
                  review.bookingId === booking._id
                );
                
                if (!alreadyReviewed) {
                  eligibleServices.push({
                    bookingId: booking._id,
                    serviceName: service.name,
                    employeeName: service.employee,
                    date: booking.date,
                    time: booking.time
                  });
                }
              });
            }
          });
          
          setEligibleReviews(eligibleServices);
          setCanReview(eligibleServices.length > 0);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      }
    }

    fetchReviews();
  }, [salon?.uid, user?.uid]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !salon?.uid || !selectedReviewableService) return;

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonUid: salon.uid,
          customerUid: user.uid,
          rating: reviewFormData.rating,
          comment: reviewFormData.comment,
          serviceName: selectedReviewableService.serviceName,
          employeeName: selectedReviewableService.employeeName,
          bookingId: selectedReviewableService.bookingId
        })
      });

      if (response.ok) {
        // Refresh reviews and eligible services
        const reviewsRes = await fetch(`/api/reviews?salonUid=${salon.uid}`);
        const reviewsData = await reviewsRes.json();
        setReviews(reviewsData.reviews || []);
        setAverageRating(reviewsData.averageRating || 0);
        setTotalReviews(reviewsData.totalReviews || 0);
        
        // Remove the reviewed service from eligible list
        setEligibleReviews(prev => {
          const updatedList = prev.filter(item => 
            !(item.bookingId === selectedReviewableService.bookingId && 
              item.serviceName === selectedReviewableService.serviceName && 
              item.employeeName === selectedReviewableService.employeeName)
          );
          // Update canReview based on the new list length
          setCanReview(updatedList.length > 0);
          return updatedList;
        });
        
        setShowReviewForm(false);
        setSelectedReviewableService(null);
        setReviewFormData({ rating: 5, comment: "", serviceName: "", employeeName: "" });
        // Don't manually set canReview here as it's handled above
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review');
    }
  };

  const handleEditReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview || !user?.uid) return;

    try {
      const response = await fetch('/api/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: editingReview._id,
          customerUid: user.uid,
          rating: reviewFormData.rating,
          comment: reviewFormData.comment
        })
      });

      if (response.ok) {
        // Refresh reviews
        const reviewsRes = await fetch(`/api/reviews?salonUid=${salon?.uid}`);
        const reviewsData = await reviewsRes.json();
        setReviews(reviewsData.reviews || []);
        setAverageRating(reviewsData.averageRating || 0);
        
        setEditingReview(null);
        setShowReviewForm(false);
        setReviewFormData({ rating: 5, comment: "", serviceName: "", employeeName: "" });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update review');
      }
    } catch (error) {
      console.error('Error updating review:', error);
      alert('Failed to update review');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!user?.uid || !confirm('Are you sure you want to delete this review?')) return;

    try {
      const response = await fetch(`/api/reviews?reviewId=${reviewId}&customerUid=${user.uid}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Refresh reviews
        const reviewsRes = await fetch(`/api/reviews?salonUid=${salon?.uid}`);
        const reviewsData = await reviewsRes.json();
        setReviews(reviewsData.reviews || []);
        setAverageRating(reviewsData.averageRating || 0);
        setTotalReviews(reviewsData.totalReviews || 0);
        
        setEditingReview(null);
        setCanReview(true);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Failed to delete review');
    }
  };

  // Fetch reviews for a specific service
  const openServiceDetails = async (service: Service) => {
    setDetailsService(service);
    // Fetch reviews for this service in this salon
    if (salon?.uid) {
      try {
        const res = await fetch(`/api/reviews?salonUid=${salon.uid}&serviceName=${encodeURIComponent(service.name)}`);
        const data = await res.json();
        setServiceReviews(data.reviews || []);
        setServiceAverageRating(data.averageRating || 0);
      } catch {
        setServiceReviews([]);
        setServiceAverageRating(0);
      }
    }
  };

  if (loading) return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#5C6F68] mx-auto mb-4"></div>
        <p className="text-[#5C6F68] text-lg">Loading salon...</p>
      </div>
    </main>
  );
  
  if (!salon) return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
      <div className="text-center p-6 bg-white rounded-lg shadow-sm max-w-md mx-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Salon not found</h2>
        <p className="text-gray-600 mb-4">Please check the link or try again.</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen font-sans bg-[#FAFAFA]">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-[#E4DED5] sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button 
              onClick={() => router.back()}
              className="flex items-center text-[#5C6F68] hover:text-[#4a5a54] transition-colors text-base sm:text-lg"
            >
              <FiArrowLeft className="mr-2" />
              Zurück zu den Salons
            </button>
            {/* Book Your Style entfernt */}
          </div>
        </div>
      </nav>

      {/* Main Content Container */}
      <div className="px-2 sm:px-4 lg:px-8 pt-6 pb-2 w-full max-w-6xl mx-auto">
        {/* Salon Name & Ratings */}
        <section className="w-full text-left mb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-3xl sm:text-5xl font-bold text-[#1F1F1F] mb-2 sm:mb-3 break-words">{salon.name}</h1>
            <div className="flex items-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <FiStar key={i} className={`w-5 h-5 sm:w-6 sm:h-6 ${i < Math.floor(averageRating) ? 'text-[#9DBE8D] fill-current' : 'text-gray-300'}`} />
              ))}
              <span className="text-gray-600 ml-2 font-medium text-base sm:text-lg">
                {averageRating.toFixed(1)} <span className="text-xs">({totalReviews} Bewertungen)</span>
              </span>
            </div>
          </div>
          {/* Buttons: smaller and side by side on mobile */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-4 mt-2 md:mt-0 w-full sm:w-auto">
            <button
              className="bg-[#5C6F68] hover:bg-[#4a5a54] text-white font-semibold py-2 px-2 sm:py-3 sm:px-6 rounded-lg transition-all duration-200 text-xs sm:text-base"
              onClick={scrollToServices}
            >
              Jetzt buchen
            </button>
            <button
              className="bg-[#E4DED5] hover:bg-[#d2cbb7] text-[#1F1F1F] font-semibold py-2 px-2 sm:py-3 sm:px-6 rounded-lg transition-all duration-200 text-xs sm:text-base"
              onClick={scrollToAbout}
            >
              Über uns
            </button>
          </div>
        </section>

        {/* Image Carousel - Professional Layout */}
        <section className="w-full py-2 sm:py-4 mb-2">
          <div className="relative w-full">
            {salon.imageUrls && salon.imageUrls.length > 0 && (
              <>
                <button
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-2 sm:p-3 shadow-lg transition-all duration-200"
                  onClick={() => scrollCarousel("left")}
                  aria-label="Scroll left"
                  style={{ display: salon.imageUrls.length > 1 ? "block" : "none" }}
                >
                  <FiArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-[#5C6F68]" />
                </button>
                <div
                  ref={carouselRef}
                  className="flex overflow-x-auto scroll-smooth rounded-xl sm:rounded-2xl gap-2 sm:gap-4"
                  style={{ scrollSnapType: "x mandatory" }}
                >
                  {salon.imageUrls.map((url, i) => (
                    <div
                      key={i}
                      className="min-w-0 w-full sm:min-w-[350px] sm:max-w-[600px] aspect-video sm:aspect-[16/10] flex-shrink-0"
                      style={{ scrollSnapAlign: "center" }}
                    >
                      <img
                        src={url}
                        alt={`${salon.name} - Image ${i + 1}`}
                        className="w-full h-full object-cover rounded-xl sm:rounded-2xl"
                        style={{
                          objectFit: "cover",
                          objectPosition: "center"
                        }}
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
                <button
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-2 sm:p-3 shadow-lg transition-all duration-200"
                  onClick={() => scrollCarousel("right")}
                  aria-label="Scroll right"
                  style={{ display: salon.imageUrls.length > 1 ? "block" : "none" }}
                >
                  <FiArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-[#5C6F68] rotate-180" />
                </button>
              </>
            )}
          </div>
        </section>

        {/* Location & Contact */}
        <section className="w-full text-left mb-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center text-gray-700">
              <FiMapPin className="text-[#9DBE8D] w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
              <span className="font-medium text-base sm:text-lg break-words">{salon.location}</span>
            </div>
            <div className="flex items-center text-gray-700">
              <FiPhone className="text-[#5C6F68] w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
              <span className="font-medium text-base sm:text-lg break-words">{salon.contact}</span>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section ref={servicesRef} className="bg-[#FAFAFA] py-8 sm:py-16 text-left">
          <div className="w-full">
            <div className="mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-4xl font-bold text-[#1F1F1F] mb-2 sm:mb-4 tracking-tight">Unsere Dienstleistungen</h2>
              <p className="text-gray-600 text-base sm:text-lg">Wählen Sie aus unseren Premium-Salon-Dienstleistungen</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
              {/* Left: Service Types */}
              <div className="w-full sm:min-w-[280px] sm:w-auto mb-4 sm:mb-0 overflow-x-auto">
                <ul className="flex sm:block gap-2 sm:gap-0 space-y-0 sm:space-y-1">
                  {allServiceTypes.map(type => (
                    <li key={type} className="flex-shrink-0 w-auto">
                      <button
                        className={`w-full text-left px-4 sm:px-6 py-2 sm:py-4 rounded-lg font-medium transition-colors flex items-center justify-between whitespace-nowrap text-sm sm:text-base ${
                          selectedType === type
                            ? "bg-[#E4DED5] text-[#1F1F1F] shadow-sm"
                            : "bg-white text-[#5C6F68] hover:bg-[#E4DED5] hover:text-[#1F1F1F]"
                        }`}
                        onClick={() => setSelectedType(type)}
                      >
                        <div className="flex items-center">
                          <span className="font-semibold">{type}</span>
                          <span className="ml-2 text-xs sm:text-sm text-gray-500">
                            ({type === "All Services"
                              ? services.length
                              : serviceTypeMap[type]?.length || 0})
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Right: Services for selected type */}
              <div className="flex-1 w-full">
                {(selectedType === "All Services"
                  ? services.length > 0
                  : serviceTypeMap[selectedType ?? ""]?.length > 0) ? (
                  <div className="space-y-0">
                    {(selectedType === "All Services"
                      ? services
                      : serviceTypeMap[selectedType ?? ""]
                    ).map(service => (
                      <div key={service._id} className="bg-white border border-[#E4DED5] first:rounded-t-lg last:rounded-b-lg hover:shadow-md transition-all duration-200 mb-4 sm:mb-0">
                        <div className="p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row items-start justify-between mb-2 sm:mb-4 gap-2">
                            <div className="flex-1">
                              <h3 className="text-lg sm:text-xl font-semibold text-[#1F1F1F] mb-1 sm:mb-2">{service.name}</h3>
                            </div>
                            <button
                              className="text-[#5C6F68] hover:text-[#4a5a54] border border-[#E4DED5] rounded px-3 py-1 text-xs sm:text-sm font-medium ml-0 sm:ml-4 mt-2 sm:mt-0"
                              onClick={() => openServiceDetails(service)}
                              type="button"
                            >
                              Details anzeigen
                            </button>
                          </div>
                          
                          {/* Duration/Price Options */}
                          {service.durationPrices && service.durationPrices.length > 0 ? (
                            <div className="space-y-2 sm:space-y-3">
                              <h4 className="text-xs sm:text-sm font-medium text-gray-700">Optionen wählen:</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                {service.durationPrices.map((option: { duration: number; price: number }, index: number) => (
                                  <div
                                    key={index}
                                    className={`border-2 rounded-lg p-3 sm:p-4 cursor-pointer transition-colors ${
                                      selectedDurations[service._id]?.duration === option.duration
                                        ? 'border-[#5C6F68] bg-[#E4DED5]'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    onClick={() => {
                                      setSelectedDurations(prev => ({
                                        ...prev,
                                        [service._id]: option
                                      }));
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="flex items-center text-gray-600 mb-1">
                                          <FiClock className="w-4 h-4 mr-2" />
                                          <span className="text-xs sm:text-sm">{option.duration} Minuten</span>
                                        </div>
                                        <div className="text-lg sm:text-xl font-bold text-[#1F1F1F]">€{option.price}</div>
                                      </div>
                                      <button
                                        className={`bg-white border-2 ${cartServices.find(s => s._id === service._id && s.selectedOption?.duration === option.duration) ? "border-[#9DBE8D] text-[#9DBE8D] bg-[#E4DED5]" : "border-[#FF6B6B] text-[#FF6B6B]"} hover:bg-[#FF6B6B] hover:text-white font-semibold py-1 sm:py-2 px-2 sm:px-4 rounded-lg transition-all duration-200 text-xs sm:text-sm`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleServiceInCart(service, option);
                                        }}
                                      >
                                        {cartServices.find(s => s._id === service._id && s.selectedOption?.duration === option.duration) ? "Entfernen" : "Hinzufügen"}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-2 sm:py-4 text-gray-500 text-xs sm:text-base">
                              Keine Preisoptionen verfügbar
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 sm:py-12">
                    <div className="bg-white rounded-xl p-4 sm:p-8 shadow-sm border border-[#E4DED5] max-w-xs sm:max-w-md mx-auto">
                      <FiScissors className="w-8 h-8 sm:w-12 sm:h-12 text-[#E4DED5] mb-2 sm:mb-4" />
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1 sm:mb-2">Keine Dienstleistungen verfügbar</h3>
                      <p className="text-gray-600 text-xs sm:text-base">Dieser Salon hat noch keine Dienstleistungen hinzugefügt.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* About Us Section */}
        <section ref={aboutRef} className="w-full py-4 sm:py-8 text-left mb-4 sm:mb-8">
          <div className="space-y-4 sm:space-y-8 w-full">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-[#1F1F1F] mb-2 sm:mb-3">Über uns</h2>
              <p className="text-gray-700 text-base sm:text-lg leading-relaxed">{salon.description}</p>
              {/* Google Maps Embed */}
              {salon.googleMapsAddress && (
                <div className="mt-4 sm:mt-8">
                  <h3 className="text-base sm:text-lg font-semibold text-[#1F1F1F] mb-1 sm:mb-2">Finden Sie uns auf Google Maps</h3>
                  <div className="rounded-lg overflow-hidden border border-[#E4DED5]">
                    <iframe
                      src={`https://www.google.com/maps?q=${encodeURIComponent(salon.googleMapsAddress)}&output=embed`}
                      width="100%"
                      height="200"
                      className="sm:h-[350px]"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Google Maps Location"
                    />
                  </div>
                  <div className="mt-1 sm:mt-2 text-gray-600 text-xs sm:text-sm">
                    {salon.googleMapsAddress}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <section ref={reviewsRef} className="w-full py-8 sm:py-16 text-left">
          <div className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold text-[#1F1F1F] mb-2 sm:mb-4 tracking-tight">Bewertungen & Rezensionen</h2>
            <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <FiStar key={i} className={`w-6 h-6 sm:w-8 sm:h-8 ${i < Math.floor(averageRating) ? 'text-[#9DBE8D] fill-current' : 'text-gray-300'}`} />
                  ))}
                </div>
                <span className="text-lg sm:text-2xl font-bold text-[#1F1F1F]">{averageRating.toFixed(1)}</span>
                <span className="text-[#1F1F1F] text-xs sm:text-base">({totalReviews} Bewertungen)</span>
              </div>
            </div>
            
            {/* Review Form */}
            {user && canReview && !editingReview && (
              <div className="bg-white rounded-lg border border-[#E4DED5] p-4 sm:p-6 mb-4 sm:mb-8">
                <h3 className="text-xl font-semibold text-[#1F1F1F] mb-4">Bewertung schreiben</h3>
                
                {/* Service Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#1F1F1F] mb-2">
                    Dienstleistung auswählen
                  </label>
                  <div className="w-full">
                    <select
                      value={selectedReviewableService ? 
                        `${selectedReviewableService.bookingId}-${selectedReviewableService.serviceName}-${selectedReviewableService.employeeName}` : 
                        ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          const [bookingId, serviceName, employeeName] = e.target.value.split('-');
                          const service = eligibleReviews.find(s => 
                            s.bookingId === bookingId && s.serviceName === serviceName && s.employeeName === employeeName
                          );
                          setSelectedReviewableService(service);
                        } else {
                          setSelectedReviewableService(null);
                        }
                      }}
                      className="block w-full p-3 sm:p-3 border border-[#E4DED5] rounded-lg focus:ring-2 focus:ring-[#5C6F68] focus:border-transparent text-[#1F1F1F] bg-white text-base sm:text-base"
                      required
                      style={{ minHeight: '48px' }}
                    >
                      <option value="" className="text-[#1F1F1F] bg-white">Wählen Sie eine genutzte Dienstleistung...</option>
                      {eligibleReviews.map((service, index) => (
                        <option 
                          key={index} 
                          value={`${service.bookingId}-${service.serviceName}-${service.employeeName}`}
                          className="text-[#1F1F1F] bg-white"
                        >
                          {service.serviceName} bei {service.employeeName} (am {service.date} um {service.time})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedReviewableService && (
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#1F1F1F] mb-2">Bewertung</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewFormData(prev => ({ ...prev, rating: star }))}
                            className="focus:outline-none"
                          >
                            <FiStar 
                              className={`w-8 h-8 ${star <= reviewFormData.rating ? 'text-[#9DBE8D] fill-current' : 'text-gray-300'}`} 
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-[#1F1F1F] mb-2">Ihre Rezension</label>
                      <textarea
                        value={reviewFormData.comment}
                        onChange={(e) => setReviewFormData(prev => ({ ...prev, comment: e.target.value }))}
                        className="w-full p-3 border border-[#E4DED5] rounded-lg focus:ring-2 focus:ring-[#5C6F68] focus:border-transparent text-[#1F1F1F]"
                        rows={4}
                        placeholder={`Teilen Sie Ihre Erfahrung mit ${selectedReviewableService.serviceName} bei ${selectedReviewableService.employeeName}...`}
                        required
                      />
                    </div>
                    
                    <div className="bg-[#E4DED5] p-3 rounded-lg">
                      <p className="text-sm text-[#1F1F1F]">
                        <strong>Dienstleistung:</strong> {selectedReviewableService.serviceName}<br/>
                        <strong>Mitarbeiter:</strong> {selectedReviewableService.employeeName}<br/>
                        <strong>Datum:</strong> {selectedReviewableService.date} um {selectedReviewableService.time}
                      </p>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="bg-[#5C6F68] hover:bg-[#4a5a54] text-white font-semibold py-2 px-4 sm:px-6 rounded-lg transition-all duration-200 text-sm sm:text-base w-full"
                      >
                        Bewertung abschicken
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReviewableService(null);
                          setReviewFormData({ rating: 5, comment: "", serviceName: "", employeeName: "" });
                        }}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-2 px-4 sm:px-6 rounded-lg transition-all duration-200 text-sm sm:text-base w-full"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Edit Review Form */}
            {user && editingReview && (
              <div className="bg-white rounded-lg border border-[#E4DED5] p-4 sm:p-6 mb-4 sm:mb-8">
                <h3 className="text-xl font-semibold text-[#1F1F1F] mb-4">Rezension bearbeiten</h3>
                <form onSubmit={handleEditReview} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1F1F1F] mb-2">Bewertung</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewFormData(prev => ({ ...prev, rating: star }))}
                          className="focus:outline-none"
                        >
                          <FiStar 
                            className={`w-8 h-8 ${star <= reviewFormData.rating ? 'text-[#9DBE8D] fill-current' : 'text-gray-300'}`} 
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#1F1F1F] mb-2">Ihre Rezension</label>
                    <textarea
                      value={reviewFormData.comment}
                      onChange={(e) => setReviewFormData(prev => ({ ...prev, comment: e.target.value }))}
                      className="w-full p-3 border border-[#E4DED5] rounded-lg focus:ring-2 focus:ring-[#5C6F68] focus:border-transparent text-[#1F1F1F]"
                      rows={4}
                      placeholder="Teilen Sie Ihre Erfahrung..."
                      required
                    />
                  </div>
                  
                  <div className="bg-[#E4DED5] p-3 rounded-lg">
                    <p className="text-sm text-[#1F1F1F]">
                      <strong>Dienstleistung:</strong> {editingReview.serviceName}<br/>
                      <strong>Mitarbeiter:</strong> {editingReview.employeeName}
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="bg-[#5C6F68] hover:bg-[#4a5a54] text-white font-semibold py-2 px-4 sm:px-6 rounded-lg transition-all duration-200 text-sm sm:text-base w-full"
                    >
                      Rezension aktualisieren
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingReview(null);
                        setReviewFormData({ rating: 5, comment: "", serviceName: "", employeeName: "" });
                      }}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-2 px-4 sm:px-6 rounded-lg transition-all duration-200 text-sm sm:text-base w-full"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteReview(editingReview._id)}
                      className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 sm:px-6 rounded-lg transition-all duration-200 flex items-center gap-2 w-full"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      Löschen
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Reviews List */}
          <div className="space-y-4 sm:space-y-6">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <div key={review._id} className="bg-white rounded-lg border border-[#E4DED5] p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start justify-between mb-2 sm:mb-4 gap-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#E4DED5] rounded-full flex items-center justify-center">
                        <FiUser className="w-4 h-4 sm:w-5 sm:h-5 text-[#5C6F68]" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#1F1F1F] text-sm sm:text-base">{review.customerName}</h4>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <FiStar key={i} className={`w-3 h-3 sm:w-4 sm:h-4 ${i < review.rating ? 'text-[#9DBE8D] fill-current' : 'text-gray-300'}`} />
                            ))}
                          </div>
                          <span className="text-xs sm:text-sm text-[#1F1F1F]">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {user?.uid === review.customerUid && (
                      <button
                        onClick={() => {
                          setEditingReview(review);
                          setReviewFormData({
                            rating: review.rating,
                            comment: review.comment,
                            serviceName: review.serviceName,
                            employeeName: review.employeeName
                          });
                        }}
                        className="text-[#5C6F68] hover:text-[#4a5a54] p-1 sm:p-2"
                      >
                        <FiEdit className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-[#1F1F1F] mb-2 sm:mb-3 text-sm sm:text-base">{review.comment}</p>
                  {(review.serviceName || review.employeeName) && (
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs sm:text-sm text-[#1F1F1F]">
                      {review.serviceName && (
                        <span className="bg-[#E4DED5] px-2 sm:px-3 py-1 rounded-full">
                          Dienstleistung: {review.serviceName}
                        </span>
                      )}
                      {review.employeeName && (
                        <span className="bg-[#E4DED5] px-2 sm:px-3 py-1 rounded-full">
                          Mitarbeiter: {review.employeeName}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg border border-[#E4DED5] p-4 sm:p-8 text-center">
                <FiStar className="w-8 h-8 sm:w-12 sm:h-12 text-[#E4DED5] mx-auto mb-2 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-[#1F1F1F] mb-1 sm:mb-2">Noch keine Bewertungen</h3>
                <p className="text-[#1F1F1F] text-xs sm:text-base">Seien Sie der Erste, der eine Erfahrung teilt!</p>
              </div>
            )}
          </div>
        </section>

        {/* Cart summary fixed popup */}
        {cartServices.length > 0 && (
          <div className="fixed bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 bg-[#E4DED5] border border-[#9DBE8D] shadow-lg rounded-xl px-2 sm:px-6 py-2 sm:py-3 w-full max-w-xs sm:max-w-sm flex flex-col items-center">
            <div className="w-full flex items-center justify-between">
              <div className="text-base sm:text-lg font-semibold text-[#1F1F1F]">
                Gesamt: €{cartServices.reduce((sum, s) => sum + (s.price || 0), 0)}
              </div>
              {/* Dropdown toggle */}
              <button
                className="ml-2 text-[#5C6F68] hover:text-[#1F1F1F] font-semibold px-1 sm:px-2 py-0 sm:py-1 rounded text-sm"
                onClick={() => setShowCartDropdown(v => !v)}
                aria-label="Ausgewählte Dienstleistungen anzeigen"
                type="button"
              >
                {showCartDropdown ? "▲" : "▼"}
              </button>
            </div>
            <div className="w-full text-xs sm:text-sm text-gray-700 mt-1 mb-2 text-center">
              {cartServices.length} Dienstleistung{cartServices.length > 1 ? "en" : ""}
            </div>
            {/* Dropdown list */}
            {showCartDropdown && (
              <ul className="w-full mb-2 bg-white rounded-lg border border-[#E4DED5] shadow p-1 sm:p-2">
                {cartServices.map(s => (
                  <li key={`${s._id}-${s.selectedOption?.duration}`} className="flex justify-between items-center py-1 text-[#1F1F1F] text-xs sm:text-sm">
                    <span>
                      {s.name}
                      {s.selectedOption && (
                        <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs text-gray-600">
                          ({s.selectedOption.duration} Min)
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 sm:gap-2">
                      €{s.price}
                      <button
                        className="ml-1 sm:ml-2 text-[#FF6B6B] hover:text-red-700 text-base sm:text-lg font-bold px-1 sm:px-2"
                        aria-label={`Entfernen ${s.name}`}
                        onClick={() => toggleServiceInCart(s)}
                        type="button"
                      >
                        ×
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <button
              className="bg-[#5C6F68] hover:bg-[#4a5a54] text-white font-semibold py-1 sm:py-2 px-4 sm:px-6 rounded-lg transition-all duration-200 w-full text-sm sm:text-base"
              onClick={proceedToBooking}
            >
              Weiter zur Buchung ({cartServices.length})
            </button>
          </div>
        )}

        {/* Service Details Popup */}
        {detailsService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-2 p-6 relative">
              <button
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold"
                onClick={() => setDetailsService(null)}
                aria-label="Schließen"
                type="button"
              >
                ×
              </button>
              <h2 className="text-2xl font-bold text-[#1F1F1F] mb-2">{detailsService.name}</h2>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <FiStar key={i} className={`w-5 h-5 ${i < Math.floor(serviceAverageRating) ? 'text-[#9DBE8D] fill-current' : 'text-gray-300'}`} />
                  ))}
                  <span className="text-base font-medium text-[#1F1F1F]">
                    {serviceAverageRating.toFixed(1)} <span className="text-xs text-gray-600">({serviceReviews.length} Bewertungen)</span>
                  </span>
                </div>
                <p className="text-gray-700 text-base">{detailsService.description}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1F1F1F] mb-2">Bewertungen für diese Dienstleistung</h3>
                {serviceReviews.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {serviceReviews.map((review) => (
                      <div key={review._id} className="border border-[#E4DED5] rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-7 h-7 bg-[#E4DED5] rounded-full flex items-center justify-center">
                            <FiUser className="w-4 h-4 text-[#5C6F68]" />
                          </div>
                          <span className="font-semibold text-sm text-[#1F1F1F]">{review.customerName}</span>
                          <span className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                          <div className="flex ml-2">
                            {[...Array(5)].map((_, i) => (
                              <FiStar key={i} className={`w-3 h-3 ${i < review.rating ? 'text-[#9DBE8D] fill-current' : 'text-gray-300'}`} />
                            ))}
                          </div>
                        </div>
                        <div className="text-[#1F1F1F] text-sm">{review.comment}</div>
                        {review.employeeName && (
                          <div className="text-xs text-gray-600 mt-1">bei {review.employeeName}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">Noch keine Bewertungen für diese Dienstleistung.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Footer outside main content for full width */}
      <Footer />
    </main>
  );
}