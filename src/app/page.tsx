"use client";
import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { FiMapPin, FiPhone, FiScissors, FiStar } from "react-icons/fi";

// --- Styles ---
const COLORS = {
  primary: "#5C6F68",
  accent: "#E4DED5",
  text: "#1F1F1F",
  highlight: "#9DBE8D",
};

const featuredSalons = [
  {
    name: "Urban Bliss Spa",
    location: "Innenstadt",
    slug: "urban-bliss-spa",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Serenity Salon",
    location: "Vorstadt",
    slug: "serenity-salon",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Glow & Go",
    location: "Stadtmitte",
    slug: "glow-and-go",
    image: "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=400&q=80",
  },
];

// Firebase config (use env variables)
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

// --- Components ---
function HeroSection({ onSearch }: { onSearch: (query: { name: string; treatment: string; date: string }) => void }) {
  const [input, setInput] = useState("");
  const [treatment, setTreatment] = useState("");
  const [date, setDate] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <section
      style={{
        background: COLORS.accent,
        color: COLORS.text,
        padding: isMobile ? "2rem 1rem 3rem" : "3.5rem 1.5rem 5rem",
        position: "relative",
        borderBottom: `1px solid ${COLORS.primary}20`,
        minHeight: isMobile ? "auto" : 420,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? "2rem" : "3rem",
          width: "100%",
          maxWidth: 1100,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Search - Moves to top on mobile */}
        <div
          style={{
            flex: 1,
            background: "white",
            borderRadius: 16,
            padding: isMobile ? "1.5rem 1rem" : "2.5rem 2rem",
            boxShadow: `0 8px 24px ${COLORS.primary}10`,
            border: `1px solid ${COLORS.primary}10`,
            minWidth: isMobile ? "100%" : 320,
            maxWidth: isMobile ? "100%" : 420,
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            order: isMobile ? 1 : 0,
          }}
        >
          <div
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 600,
              fontSize: isMobile ? "1.2rem" : "1.4rem",
              marginBottom: "0.5rem",
              color: COLORS.primary,
              textAlign: "left",
            }}
          >
            Salon-Suche
          </div>
          <input
            type="text"
            placeholder="Salonname"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              padding: "0.8rem 1rem",
              borderRadius: 10,
              border: `1px solid ${COLORS.primary}30`,
              fontSize: "1rem",
              fontFamily: "'Roboto', sans-serif",
              background: "#f9fafb",
              transition: "all 0.2s",
              marginBottom: 0,
            }}
          />
          <input
            type="text"
            placeholder="Behandlung (z.B. Haarschnitt, Massage)"
            value={treatment}
            onChange={(e) => setTreatment(e.target.value)}
            style={{
              padding: "0.8rem 1rem",
              borderRadius: 10,
              border: `1px solid ${COLORS.primary}30`,
              fontSize: "1rem",
              fontFamily: "'Roboto', sans-serif",
              background: "#f9fafb",
              transition: "all 0.2s",
              marginBottom: 0,
            }}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: "0.8rem 1rem",
              borderRadius: 10,
              border: `1px solid ${COLORS.primary}30`,
              fontSize: "1rem",
              fontFamily: "'Roboto', sans-serif",
              background: "#f9fafb",
              transition: "all 0.2s",
              marginBottom: 0,
            }}
          />
          <button
            onClick={() =>
              onSearch({
                name: input.trim(),
                treatment: treatment.trim(),
                date: date.trim(),
              })
            }
            style={{
              background: COLORS.highlight,
              color: COLORS.text,
              border: "none",
              borderRadius: 10,
              padding: "0.8rem 0",
              fontWeight: 600,
              fontFamily: "'Poppins', sans-serif",
              cursor: "pointer",
              fontSize: "1rem",
              marginTop: "0.5rem",
              transition: "all 0.2s",
              boxShadow: `0 3px 8px ${COLORS.primary}10`,
              width: "100%",
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 6px 16px ${COLORS.primary}20`)}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 3px 8px ${COLORS.primary}10`)}
          >
            Suchen
          </button>
        </div>
        {/* Branding - Moves below search on mobile */}
        <div
          style={{
            flex: 1,
            minWidth: isMobile ? "100%" : 320,
            display: "flex",
            flexDirection: "column",
            alignItems: isMobile ? "center" : "flex-end",
            justifyContent: "center",
            textAlign: isMobile ? "center" : "right",
            gap: isMobile ? "1.5rem" : "2.2rem",
            paddingRight: isMobile ? "0" : "2.5rem",
          }}
        >
          <div
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: isMobile ? "3rem" : "4.2rem",
              letterSpacing: "-1px",
              color: COLORS.primary,
              marginBottom: isMobile ? "0.5rem" : "0.7rem",
              lineHeight: 1.08,
            }}
          >
            bookme
          </div>
          <div
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 500,
              fontSize: isMobile ? "1.4rem" : "1.7rem",
              color: COLORS.text,
              maxWidth: isMobile ? "100%" : "440px",
              lineHeight: 1.45,
              opacity: 0.95,
              marginBottom: isMobile ? "0.5rem" : "0.7rem",
              padding: isMobile ? "0 1rem" : "0",
            }}
          >
            Ihr digitaler Begleiter für Salonbuchungen.
          </div>
          <div
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: isMobile ? "1rem" : "1.18rem",
              color: COLORS.primary,
              maxWidth: isMobile ? "100%" : "440px",
              lineHeight: 1.7,
              opacity: 0.85,
              padding: isMobile ? "0 1rem" : "0",
            }}
          >
            Finden, vergleichen und buchen Sie Salons in Ihrer Nähe – einfach, schnell und zuverlässig.
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const steps = [
    {
      title: "Finden Sie Ihren Salon",
      description: "Durchstöbern Sie unsere handverlesene Auswahl an Top-Salons",
    },
    {
      title: "Buchen Sie Ihren Termin",
      description: "Wählen Sie Ihre bevorzugte Dienstleistung und Uhrzeit",
    },
    {
      title: "Genießen Sie",
      description: "Entspannen Sie und freuen Sie sich auf Ihren Termin",
    },
  ];
  return (
    <section
      style={{
        padding: isMobile ? "3rem 1rem" : "5rem 1.5rem",
        maxWidth: "1280px",
        margin: "0 auto",
        borderBottom: `1px solid ${COLORS.primary}20`,
      }}
    >
      <h2
        style={{
          fontFamily: "'Poppins', sans-serif",
          textAlign: "center",
          color: COLORS.primary,
          fontWeight: 600,
          marginBottom: isMobile ? 40 : 56,
          fontSize: isMobile ? "1.5rem" : "1.75rem",
          letterSpacing: 0.3,
        }}
      >
        So funktioniert's
      </h2>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: isMobile ? 24 : 32,
          flexWrap: "wrap",
        }}
      >
        {steps.map((step, idx) => (
          <div
            key={step.title}
            style={{
              background: "white",
              borderRadius: 16,
              padding: isMobile ? "1.5rem 1rem" : "2.5rem 2rem",
              width: isMobile ? "100%" : "300px",
              maxWidth: isMobile ? "350px" : "none",
              textAlign: "center",
              border: `1px solid ${COLORS.primary}15`,
              boxShadow: `0 4px 14px ${COLORS.primary}10`,
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = `0 6px 18px ${COLORS.primary}15`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = `0 4px 14px ${COLORS.primary}10`;
            }}
          >
            <div
              style={{
                fontSize: isMobile ? "2rem" : "2.5rem",
                marginBottom: isMobile ? 12 : 20,
                lineHeight: 1,
                color: COLORS.highlight,
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {idx + 1}
            </div>
            <h3
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 600,
                fontSize: isMobile ? "1.1rem" : "1.3rem",
                marginBottom: isMobile ? 8 : 12,
                color: COLORS.primary,
              }}
            >
              {step.title}
            </h3>
            <p
              style={{
                fontFamily: "'Roboto', sans-serif",
                color: COLORS.text,
                opacity: 0.85,
                lineHeight: 1.6,
                fontSize: isMobile ? "0.9rem" : "1rem",
              }}
            >
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturedSalons() {
  const [topSalons, setTopSalons] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    async function fetchTopSalons() {
      // Fetch all salons
      const salonsRes = await fetch("/api/salons");
      const salonsData = await salonsRes.json();
      const salons = Array.isArray(salonsData.salons) ? salonsData.salons : [];

      // Fetch all bookings
      const bookingsRes = await fetch("/api/bookings");
      const bookingsData = await bookingsRes.json();
      const bookings = Array.isArray(bookingsData.bookings) ? bookingsData.bookings : [];

      // Count bookings per salonUid
      const bookingCounts: Record<string, number> = {};
      bookings.forEach((b: any) => {
        if (b.salonUid) {
          bookingCounts[b.salonUid] = (bookingCounts[b.salonUid] || 0) + 1;
        }
      });

      // Sort salons by booking count descending
      const sortedSalons = salons
        .map((salon: any) => ({
          ...salon,
          bookingCount: bookingCounts[salon.uid] || 0
        }))
        .sort((a: any, b: any) => b.bookingCount - a.bookingCount)
        .slice(0, 3);

      setTopSalons(sortedSalons);
    }
    fetchTopSalons();
  }, []);

  return (
    <section
      style={{
        padding: isMobile ? "3rem 1rem" : "5rem 1.5rem",
        maxWidth: "1280px",
        margin: "0 auto",
      }}
    >
      <h2
        style={{
          fontFamily: "'Poppins', sans-serif",
          textAlign: "center",
          color: COLORS.primary,
          fontWeight: 600,
          marginBottom: isMobile ? 40 : 56,
          fontSize: isMobile ? "1.5rem" : "1.75rem",
          letterSpacing: 0.3,
        }}
      >
        Empfohlene Salons
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
          gap: isMobile ? 24 : 40,
          justifyContent: "center",
          padding: isMobile ? "0 0.5rem" : "0",
        }}
      >
        {topSalons.map((salon) => (
          <FeaturedSalonCard key={salon.uid} salon={salon} isMobile={isMobile} />
        ))}
      </div>
    </section>
  );
}

function FeaturedSalonCard({ salon, isMobile }: { salon: any, isMobile: boolean }) {
  const [isHovered, setIsHovered] = useState(false);
  const slug = salon.name ? salon.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") : "";

  // Fetch services for price range
  const [services, setServices] = useState<any[]>([]);
  useEffect(() => {
    async function fetchServices() {
      if (salon.uid) {
        const res = await fetch(`/api/services?uid=${encodeURIComponent(salon.uid)}`);
        const data = await res.json();
        setServices(data.services || []);
      }
    }
    fetchServices();
  }, [salon.uid]);

  function getPriceRange(uid: string) {
    const salonServices = Array.isArray(services) ? services.filter((s) => s.uid === uid) : [];
    if (salonServices.length === 0) return null;

    const allPrices: number[] = [];
    for (const service of salonServices) {
      if (service.price !== undefined && service.price !== null && !isNaN(Number(service.price))) {
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

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-[#E4DED5] flex flex-col overflow-hidden"
      style={{
        transition: "box-shadow 0.2s, transform 0.2s",
        transform: isHovered && !isMobile ? "translateY(-4px)" : "translateY(0)",
        boxShadow: isHovered && !isMobile ? `0 8px 20px ${COLORS.primary}15` : `0 4px 14px ${COLORS.primary}10`
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {salon.imageUrls && salon.imageUrls.length > 0 && (
        <img
          src={salon.imageUrls[0]}
          alt={salon.name}
          className="w-full h-48 object-cover"
          style={{ background: COLORS.accent }}
        />
      )}
      <div className="p-6 flex-1 flex flex-col" style={{ padding: isMobile ? "1.5rem" : "1.5rem 2rem" }}>
        <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center font-sans" style={{ fontSize: isMobile ? "1.1rem" : "1.25rem" }}>
          <FiScissors className="mr-2 text-[#5C6F68]" /> {salon.name}
        </h2>
        {/* Price range */}
        <p className="text-[#5C6F68] font-medium mb-2" style={{ fontSize: isMobile ? "0.9rem" : "1rem" }}>
          {getPriceRange(salon.uid) ? (
            <>Price Range: {getPriceRange(salon.uid)}</>
          ) : (
            <>No price info</>
          )}
        </p>
        <p className="text-gray-700 mb-2" style={{ fontSize: isMobile ? "0.9rem" : "1rem" }}>{salon.description}</p>
        <div className="flex items-center text-gray-600 mb-1" style={{ fontSize: isMobile ? "0.9rem" : "1rem" }}>
          <FiMapPin className="mr-1 text-[#9DBE8D]" />
          <span>{salon.location}</span>
        </div>
        <div className="flex items-center text-gray-600 mb-1" style={{ fontSize: isMobile ? "0.9rem" : "1rem" }}>
          <FiPhone className="mr-1 text-[#5C6F68]" />
          <span>{salon.contact}</span>
        </div>
        <div className="mt-4">
          <a
            href={`/salon/${slug}`}
            className="bg-[#5C6F68] hover:bg-[#4a5a54] text-white font-medium py-2 px-4 rounded-md w-full transition block text-center"
            style={{ 
              textDecoration: "none",
              fontSize: isMobile ? "0.9rem" : "1rem",
              padding: isMobile ? "0.5rem" : "0.5rem 1rem"
            }}
          >
            Book Now
          </a>
        </div>
      </div>
    </div>
  );
}

// --- Hauptseite ---
export default function HomePage() {
  const router = useRouter();
  const [searchError, setSearchError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Check for login state from router
    // @ts-ignore
    const stateUser = typeof window !== "undefined" && window.history.state && window.history.state.user;
    if (stateUser) {
      setUser(stateUser);
    } else {
      const unsubscribe = onAuthStateChanged(auth, setUser);
      return () => unsubscribe();
    }
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.reload();
  };

  function handleSearch(query: { name: string; treatment: string; date: string }) {
    if (!query.name && !query.treatment && !query.date) {
      setSearchError("Bitte geben Sie mindestens ein Suchkriterium ein.");
      return;
    }
    // Redirect to /salons with query params
    const params = new URLSearchParams();
    if (query.name) params.append("name", query.name);
    if (query.treatment) params.append("treatment", query.treatment);
    if (query.date) params.append("date", query.date);
    router.push(`/salons?${params.toString()}`);
  }

  return (
    <main
      style={{
        fontFamily: "'Roboto', -apple-system, sans-serif",
        background: "#fafafa",
        minHeight: "100vh",
        lineHeight: 1.6,
      }}
    >
      {/* Pass user and logout handler to Navbar */}
      <Navbar user={user ? { email: user.email } : undefined} onLogout={handleLogout} />
      <link
        href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&family=Poppins:wght@500;600;700&display=swap"
        rel="stylesheet"
      />
      <HeroSection onSearch={handleSearch} />
      {searchError && (
        <div
          style={{
            fontFamily: "'Roboto', sans-serif",
            color: "#b00",
            textAlign: "center",
            padding: isMobile ? "1rem" : "1.25rem",
            fontWeight: 500,
            background: "#ffebee",
            maxWidth: isMobile ? "90%" : "600px",
            margin: "0 auto 2rem",
            borderRadius: 10,
            border: `1px solid #b0030`,
            boxShadow: `0 3px 6px ${COLORS.primary}10`,
            fontSize: isMobile ? "0.9rem" : "1rem",
          }}
        >
          {searchError}
        </div>
      )}
      <HowItWorks />
      <FeaturedSalons />
      <Footer />
    </main>
  );
}