"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Service = {
  _id: string;
  name: string;
  price: number;
  duration: number;
};

export default function BookingPage() {
  const [services, setServices] = useState<Service[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Read selected services from localStorage
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("salon_cart_services") : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setServices(parsed);
      } catch {}
    }
  }, []);

  const total = services.reduce((sum, s) => sum + (s.price || 0), 0);

  if (services.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#FAFAFA] font-sans">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">No services selected</h2>
          <button
            className="bg-[#5C6F68] text-white px-6 py-3 rounded-lg font-semibold"
            onClick={() => router.push("/salons")}
          >
            Go to Salons
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA] font-sans">
      <div className="max-w-xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-[#1F1F1F] mb-6">Booking Summary</h1>
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Selected Services</h2>
          <ul className="mb-4">
            {services.map(s => (
              <li key={s._id} className="flex justify-between items-center py-2 border-b border-[#E4DED5]">
                <span className="font-medium">{s.name}</span>
                <span className="text-[#5C6F68] font-semibold">€{s.price}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between items-center text-lg font-bold mt-4">
            <span>Total</span>
            <span>€{total}</span>
          </div>
        </div>
        {/* Add booking form or next steps here */}
        <button
          className="bg-[#5C6F68] hover:bg-[#4a5a54] text-white font-semibold py-3 px-8 rounded-lg w-full"
          onClick={() => alert("Booking confirmed!")}
        >
          Confirm Booking
        </button>
      </div>
    </main>
  );
}
