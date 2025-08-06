"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FiMapPin, FiPhone, FiScissors, FiCalendar, FiClock, FiUser, FiChevronLeft, FiChevronRight } from "react-icons/fi";

type Salon = {
  _id: string;
  uid: string;
  name: string;
  contact: string;
  description: string;
  location: string;
  imageUrls: string[];
  googleMapsAddress?: string;
  storeCustomerAddress?: boolean;
  workingDays?: {
    [key: string]: {
      open: boolean;
      start: string;
      end: string;
    };
  };
  holidays?: string[];
  employees?: {
    name: string;
    schedule: {
      [key: string]: {
        open: boolean;
        start: string;
        end: string;
      };
    };
    holidays: string[];
    services: string[];
    imageUrl?: string;
    description?: string;
  }[];
};

type Service = {
  _id: string;
  name: string;
  imageUrl?: string;
  uid: string;
  salonName?: string;
  serviceType?: string;
  durationPrices?: { duration: number; price: number }[];
  // For selected cart items
  price?: number;
  duration?: number;
  selectedOption?: { duration: number; price: number };
};

type BookingStep = 'professional' | 'datetime' | 'summary' | 'confirmation';

type ServiceSelection = {
  service: Service;
  employee: any | null;
};

export default function BookingSummaryPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<BookingStep>('professional');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookingId, setBookingId] = useState<string>('');

  // Store booked intervals for the selected date/employee
  const [bookedIntervals, setBookedIntervals] = useState<{start: string, end: string, employee: string}[]>([]);
  const [serviceSelections, setServiceSelections] = useState<ServiceSelection[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState({
    street: '',
    number: '',
    zip: '',
    country: ''
  });

  useEffect(() => {
    let loadedSalon = false;
    let loadedServices = false;

    async function fetchSalon() {
      // Try to get salon from localStorage first
      let salonFromStorage: Salon | null = null;
      if (typeof window !== "undefined") {
        const savedSalon = window.localStorage.getItem("salon_booking_salon");
        if (savedSalon) {
          try {
            salonFromStorage = JSON.parse(savedSalon);
          } catch {}
        }
      }
      if (salonFromStorage) {
        setSalon(salonFromStorage);
        loadedSalon = true;
        if (loadedServices) setLoading(false);
        return;
      }

      console.log("Fetching salon with uid:", slug);
      const res = await fetch(`/api/salons?uid=${encodeURIComponent(slug as string)}`);
      const data = await res.json();
      console.log("Fetched salon response:", data);
      console.log("Fetched salon object:", data.salon);
      setSalon(data.salon || null);
      loadedSalon = true;
      if (loadedServices) setLoading(false);
    }

    function fetchServices() {
      const saved = typeof window !== "undefined" ? window.localStorage.getItem("salon_cart_services") : null;
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setServices(parsed);
        } catch {}
      }
      loadedServices = true;
      if (loadedSalon) setLoading(false);
    }

    setLoading(true);
    fetchSalon();
    fetchServices();
  }, [slug]);

  // Fetch all services when salon is loaded
  useEffect(() => {
    if (salon?.uid) {
      fetchAllServices();
    }
  }, [salon?.uid]);

  async function fetchAllServices() {
    if (!salon?.uid) return;
    try {
      const res = await fetch(`/api/services?uid=${salon.uid}`);
      const data = await res.json();
      setAllServices(data.services || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  }

  // When services change, reset selections
  useEffect(() => {
    if (services.length) {
      setServiceSelections(
        services.map(s => ({
          service: s,
          employee: null
        }))
      );
    } else {
      setServiceSelections([]);
    }
  }, [services]);

  // Check if all services have an employee selected
  const allEmployeesSelected = serviceSelections.length > 0 && serviceSelections.every(sel => sel.employee);

  // Get all selected employees (unique)
  const selectedEmployees = React.useMemo(() => (
    serviceSelections
      .map(sel => sel.employee)
      .filter((emp, index, arr) => emp && arr.findIndex(e => e?.name === emp.name) === index)
  ), [serviceSelections]);

  // Helper to get Date object in German time (Europe/Berlin)
  function getGermanDate(dateStr: string, timeStr?: string) {
    // dateStr: 'YYYY-MM-DD', timeStr: 'HH:mm'
    const [year, month, day] = dateStr.split('-').map(Number);
    let date = new Date(Date.UTC(year, month - 1, day));
    if (timeStr) {
      const [h, m] = timeStr.split(':').map(Number);
      date.setUTCHours(h - getGermanTimezoneOffset(date), m, 0, 0);
    }
    return date;
  }

  // Helper to get the timezone offset in hours for Europe/Berlin
  function getGermanTimezoneOffset(date: Date) {
    // Europe/Berlin is UTC+1 or UTC+2 (DST)
    // Use Intl.DateTimeFormat to get offset
    const options = { timeZone: 'Europe/Berlin', hour: '2-digit' } as const;
    const localHour = Number(date.toLocaleString('de-DE', options));
    const utcHour = date.getUTCHours();
    let offset = localHour - utcHour;
    // Adjust for day wrap
    if (offset < -12) offset += 24;
    if (offset > 12) offset -= 24;
    return offset;
  }

  // For date availability, check if any of the selected employees is available
  function isDateAvailable(date: Date) {
    if (!salon || selectedEmployees.length === 0) return false;

    // Use YYYY-MM-DD format without timezone conversion
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const dayName = date.toLocaleDateString('de-DE', { weekday: 'long', timeZone: 'Europe/Berlin' });

    // Fix: Allow booking for today and future dates
    const today = new Date();
    // Use German time for today
    const berlinNow = new Date(today.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
    berlinNow.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    // Only block past dates (before today)
    if (checkDate < berlinNow) return false;

    // Check salon holidays
    if (salon.holidays?.includes(dateStr)) return false;
    // Check if salon is open that day
    if (!salon.workingDays?.[dayName]?.open) return false;
    // Check if at least one selected employee is available
    return selectedEmployees.some(employee => {
      // Check employee holidays
      if (employee.holidays?.includes(dateStr)) return false;
      // Check if employee is available that day
      if (!employee.schedule?.[dayName]?.open) return false;
      return true;
    });
  }

  // Fetch bookings for all selected employees on the selected date
  useEffect(() => {
    async function fetchAllBookedTimes() {
      if (selectedEmployees.length === 0 || !selectedDate || !salon) {
        setBookedIntervals([]);
        return;
      }
      
      try {
        const allIntervals: {start: string, end: string, employee: string}[] = [];
        
        // Fetch bookings for each employee
        for (const employee of selectedEmployees) {
          const res = await fetch(
            `/api/bookings?salonUid=${salon.uid}&employee=${encodeURIComponent(employee.name)}&date=${selectedDate}`
          );
          const data = await res.json();
          
          console.log(`Bookings for ${employee.name} on ${selectedDate}:`, data.bookings);
          
          const employeeIntervals = (data.bookings || []).map((b: any) => {
            const start = b.time;
            
            // Calculate total duration from services array
            let totalDuration = 0;
            if (Array.isArray(b.services)) {
              // New format: services array with employee assignments
              const employeeServices = b.services.filter((s: any) => s.employee === employee.name);
              totalDuration = employeeServices.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
              console.log(`Services for ${employee.name}:`, employeeServices, `Total duration: ${totalDuration}`);
            } else {
              // Fallback: if no services or old format, try to get duration
              totalDuration = b.duration || 60; // Default to 60 minutes if no duration found
              console.log(`Fallback duration for ${employee.name}: ${totalDuration}`);
            }
            
            // Skip if no duration (employee not involved in this booking)
            if (totalDuration === 0) {
              console.log(`Skipping booking - ${employee.name} not involved`);
              return null;
            }
            
            // Calculate end time
            const [hours, minutes] = start.split(':').map(Number);
            const startMinutes = hours * 60 + minutes;
            const endMinutes = startMinutes + totalDuration;
            const endHours = Math.floor(endMinutes / 60);
            const endMins = endMinutes % 60;
            const end = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
            
            console.log(`Booking interval: ${start} - ${end} (${totalDuration} mins) for ${employee.name}`);
            
            return { start, end, employee: employee.name };
          }).filter(Boolean); // Remove null entries
          
          allIntervals.push(...employeeIntervals);
        }
        
        console.log('All booked intervals:', allIntervals);
        setBookedIntervals(allIntervals);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setBookedIntervals([]);
      }
    }
    fetchAllBookedTimes();
  }, [selectedDate, salon, selectedEmployees]);

  // Check if a time slot can accommodate all services with optimal employee scheduling
  function canScheduleServices(startTime: string): boolean {
    if (selectedEmployees.length === 0) return false;

    // Create date object from selectedDate string to get the day name
    const [year, month, day] = selectedDate.split('-').map(Number);
    // Use German time for day name
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    const dayName = dateObj.toLocaleDateString('de-DE', { weekday: 'long', timeZone: 'Europe/Berlin' });

    const requestedStartTime = timeToMinutes(startTime);
    
    // For each service, check if it can be scheduled at the exact requested time
    // without any rescheduling
    for (const selection of serviceSelections) {
      const service = selection.service;
      const employee = selection.employee;
      
      if (!employee) {
        return false;
      }
      
      // Check if employee is working that day
      const employeeSchedule = employee.schedule[dayName];
      if (!employeeSchedule?.open) {
        return false;
      }
      
      const employeeStart = timeToMinutes(employeeSchedule.start);
      const employeeEnd = timeToMinutes(employeeSchedule.end);
      
      // Check if the requested time is within employee working hours
      const serviceDuration = service.duration ?? 0;
      if (requestedStartTime < employeeStart || requestedStartTime + serviceDuration > employeeEnd) {
        return false;
      }
      
      // Check for conflicts with existing bookings for this employee
      const employeeBookings = bookedIntervals.filter(interval => interval.employee === employee.name);
      
      const hasConflict = employeeBookings.some(booking => {
        const bookStart = timeToMinutes(booking.start);
        const bookEnd = timeToMinutes(booking.end);
        const duration = service.duration ?? 0;
        const overlap = requestedStartTime < bookEnd && (requestedStartTime + duration) > bookStart;
        
        if (startTime === '12:00') {
          const duration = service.duration ?? 0;
          console.log(`Checking ${startTime}: Service ${service.name} (${requestedStartTime}-${requestedStartTime + duration}) vs booking ${booking.start}-${booking.end} (${bookStart}-${bookEnd}): ${overlap ? 'CONFLICT' : 'OK'}`);
        }
        
        return overlap;
      });
      
      if (hasConflict) {
        return false;
      }
    }
    
    return true;
  }

  // Generate time slots that can accommodate the optimal scheduling
  function generateTimeSlots() {
    if (!selectedDate || selectedEmployees.length === 0 || !salon) return;

    // Create date object from selectedDate string to get the day name
    const [year, month, day] = selectedDate.split('-').map(Number);
    // Use German time for day name
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    const dayName = dateObj.toLocaleDateString('de-DE', { weekday: 'long', timeZone: 'Europe/Berlin' });
    
    // Find the earliest start time among all selected employees
    const earliestStart = selectedEmployees.reduce((earliest, employee) => {
      const schedule = employee.schedule[dayName];
      if (!schedule?.open) return earliest;
      const startMinutes = timeToMinutes(schedule.start);
      return Math.min(earliest, startMinutes);
    }, 24 * 60); // Start with end of day
    
    // Find the latest end time among all selected employees
    const latestEnd = selectedEmployees.reduce((latest, employee) => {
      const schedule = employee.schedule[dayName];
      if (!schedule?.open) return latest;
      const endMinutes = timeToMinutes(schedule.end);
      return Math.max(latest, endMinutes);
    }, 0);
    
    if (earliestStart >= latestEnd) {
      console.log('No valid working hours found');
      setAvailableSlots([]);
      return;
    }

    const slots: string[] = [];
    const totalDuration = services.reduce((sum, service) => sum + (service.duration ?? 0), 0);

    // Get current time in minutes if booking for today
    let minTimeMinutes = earliestStart;
    const today = new Date();
    // Use German time for today
    const berlinNow = new Date(today.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
    const [selYear, selMonth, selDay] = selectedDate.split('-').map(Number);
    if (
      berlinNow.getFullYear() === selYear &&
      berlinNow.getMonth() + 1 === selMonth &&
      berlinNow.getDate() === selDay
    ) {
      minTimeMinutes = Math.max(minTimeMinutes, berlinNow.getHours() * 60 + berlinNow.getMinutes());
    }

    // Generate slots every 30 minutes
    for (let timeMinutes = earliestStart; timeMinutes <= latestEnd - totalDuration; timeMinutes += 30) {
      // Only show slots in the future (for today)
      if (timeMinutes < minTimeMinutes) continue;
      const hours = Math.floor(timeMinutes / 60);
      const minutes = timeMinutes % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      if (canScheduleServices(timeStr)) {
        slots.push(timeStr);
      }
    }

    setAvailableSlots(slots);
  }

  // Update the useEffect to use new logic
  useEffect(() => {
    if (selectedDate && selectedEmployees.length > 0 && salon && allEmployeesSelected) {
      generateTimeSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [selectedDate, selectedEmployees, salon, services, bookedIntervals, allEmployeesSelected]);

  // Customer info validation
  const isCustomerInfoValid = customerName.trim() !== '' && customerPhone.trim() !== '' && 
    (!salon?.storeCustomerAddress || (
      customerAddress.street.trim() !== '' && 
      customerAddress.number.trim() !== '' && 
      customerAddress.zip.trim() !== '' && 
      customerAddress.country.trim() !== ''
    ));

  async function createBooking() {
    if (!salon || !selectedDate || !selectedTime || !services.length || !allEmployeesSelected || !isCustomerInfoValid) {
      alert('Please complete all booking details, select employees for each service, and enter your name and phone.');
      return;
    }

    // Verify the slot is still available before booking
    if (!canScheduleServices(selectedTime)) {
      alert('This time slot is no longer available. Please choose another time.');
      return;
    }

    setLoading(true);
    try {
      // Get logged-in user from localStorage
      let customerUid = "";
      if (typeof window !== "undefined") {
        const userStr = window.localStorage.getItem("bookme_user");
        if (userStr) {
          try {
            const userObj = JSON.parse(userStr);
            customerUid = userObj.uid || "";
          } catch {}
        }
      }

      const bookingData = {
        salonId: salon._id,
        salonUid: salon.uid,
        customerUid,
        services: serviceSelections.map(sel => ({
          id: sel.service._id,
          name: sel.service.name,
          price: sel.service.price || 0,
          duration: sel.service.duration || 0,
          employee: sel.employee?.name || "",
          selectedOption: sel.service.selectedOption
        })),
        date: selectedDate,
        time: selectedTime,
        total,
        customerName,
        customerPhone,
        customerAddress: salon.storeCustomerAddress ? customerAddress : null, // Only include address if salon requires it
        status: 'confirmed'
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });

      const result = await res.json();
      if (result.ok) {
        setBookingId(result.bookingId);
        setStep('confirmation');
        // Clear cart
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("salon_cart_services");
          window.localStorage.removeItem("salon_booking_salon");
        }
      } else {
        alert('Failed to create booking: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Get employees for a specific service
  function getEmployeesForService(service: Service) {
    if (!salon?.employees) return [];
    return salon.employees.filter(emp =>
      emp.services && Array.isArray(emp.services) && emp.services.map(String).includes(String(service._id))
    );
  }

  // Calendar functions
  function getDaysInMonth(date: Date) {
    // Use German time for month calculation
    const berlinDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
    return new Date(berlinDate.getFullYear(), berlinDate.getMonth() + 1, 0).getDate();
  }

  function getFirstDayOfMonth(date: Date) {
    // Use German time for first day calculation
    const berlinDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
    return new Date(berlinDate.getFullYear(), berlinDate.getMonth(), 1).getDay();
  }

  function timeToMinutes(time: string) {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }

  // Remove service from booking summary
  const removeService = (serviceId: string) => {
    setServices(prev => prev.filter(s => s._id !== serviceId));
    setServiceSelections(prev => prev.filter(sel => sel.service._id !== serviceId));
    // Also update localStorage so the cart stays in sync
    if (typeof window !== "undefined") {
      const updated = services.filter((s) => s._id !== serviceId);
      window.localStorage.setItem("salon_cart_services", JSON.stringify(updated));
    }
  };

  const total = services.reduce((sum, s) => sum + (s.price || 0), 0);
  const totalDuration = services.reduce((sum, s) => sum + (s.duration || 0), 0);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#E4DED5' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin"></div>
          <p className="text-gray-600 text-sm">Loading booking summary...</p>
        </div>
      </main>
    );
  }

  if (!salon || services.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#E4DED5' }}>
        <div className="text-center max-w-md">
          <h2 className="text-xl font-medium mb-6 text-gray-900">No salon or services selected</h2>
          <button
            className="bg-black text-white px-6 py-3 text-sm font-medium hover:bg-gray-800 transition-colors rounded"
            onClick={() => router.push("/salons")}
          >
            Browse Salons
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#fafafaff' }}>
      <div className="max-w-7xl mx-auto py-16 px-6 xl:px-24">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-2xl font-light text-gray-900 mb-2">
            {step === 'professional' && 'Mitarbeiter auswählen'}
            {step === 'datetime' && 'Datum & Uhrzeit wählen'}
            {step === 'summary' && 'Buchungsübersicht'}
            {step === 'confirmation' && 'Buchung bestätigt'}
          </h1>
          <div className="w-12 h-px bg-gray-300 mx-auto"></div>
        </div>

        {/* Step Progress */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-4">
            {['professional', 'datetime', 'summary', 'confirmation'].map((stepName, index) => (
              <div key={stepName} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === stepName
                      ? 'bg-black text-white'
                      : ['professional', 'datetime', 'summary', 'confirmation'].indexOf(step) > index
                        ? 'text-white'
                        : 'bg-gray-200 text-gray-600'
                  }`}
                  style={
                    ['professional', 'datetime', 'summary', 'confirmation'].indexOf(step) > index
                      ? { backgroundColor: '#9DBE8D' }
                      : undefined
                  }
                >
                  {index + 1}
                </div>
                {index < 3 && <div className="w-8 h-px bg-gray-300 mx-2"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Professional Selection Step */}
        {step === 'professional' && (
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8 mb-8">
              {serviceSelections.map((sel, idx) => (
                <div key={sel.service._id} className="border-b pb-6 mb-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {sel.service.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {sel.service.selectedOption ? (
                        <>Dauer: {sel.service.selectedOption.duration} Minuten • Preis: €{sel.service.selectedOption.price}</>
                      ) : (
                        <>Dauer: {sel.service.duration} Minuten • Preis: €{sel.service.price}</>
                      )}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getEmployeesForService(sel.service).map((emp, i) => (
                      <div
                        key={emp.name}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                          sel.employee === emp ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setServiceSelections(selections =>
                            selections.map((s, sidx) =>
                              sidx === idx ? { ...s, employee: emp } : s
                            )
                          );
                        }}
                        // Make employee select button border radius match
                        style={{ borderRadius: '0.5rem' }}
                      >
                        <div className="flex items-center mb-2 gap-3">
                          {/* Show employee image if available */}
                          {emp.imageUrl && (
                            <img
                              src={emp.imageUrl}
                              alt={emp.name}
                              className="w-10 h-10 object-cover rounded-full border"
                            />
                          )}
                          <FiUser className="w-4 h-4 text-gray-600" />
                          <span className="font-medium text-gray-900">{emp.name}</span>
                        </div>
                        {/* Show employee description if available */}
                        {emp.description && (
                          <div className="text-xs text-gray-500 mb-1">{emp.description}</div>
                        )}
                        <div className="text-xs text-gray-500">
                          Verfügbar für diese Dienstleistung
                        </div>
                      </div>
                    ))}
                    {getEmployeesForService(sel.service).length === 0 && (
                      <div className="col-span-full text-center py-4 text-gray-500">
                        Keine Mitarbeiter für diese Dienstleistung verfügbar.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                className="bg-black text-white px-6 py-3 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                style={{ borderRadius: '0.5rem' }}
                onClick={() => setStep('datetime')}
                disabled={!serviceSelections.every(sel => sel.employee)}
              >
                Weiter zu Datum & Uhrzeit
              </button>
            </div>
          </div>
        )}

        {/* Date & Time Selection Step */}
        {step === 'datetime' && (
          <div className="max-w-4xl mx-auto">
            {!allEmployeesSelected && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800 text-sm">
                  Bitte wählen Sie für jede Dienstleistung einen Mitarbeiter aus, bevor Sie Datum und Uhrzeit wählen.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Calendar */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Datum auswählen</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                      className="p-1 hover:bg-gray-200"
                      style={{ borderRadius: '0.5rem' }}
                    >
                      <FiChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium">
                      {currentMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                      className="p-1 hover:bg-gray-200"
                      style={{ borderRadius: '0.5rem' }}
                    >
                      <FiChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-gray-600 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: getFirstDayOfMonth(currentMonth) }, (_, i) => (
                    <div key={i} className="p-2"></div>
                  ))}
                  {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => {
                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;
                    
                    const isAvailable = isDateAvailable(date);
                    const isSelected = selectedDate === dateStr;
                    
                    return (
                      <button
                        key={i}
                        onClick={() => isAvailable && allEmployeesSelected && setSelectedDate(dateStr)}
                        className={`p-2 text-sm transition-colors ${
                          isSelected ? 'bg-black text-white' :
                          isAvailable && allEmployeesSelected ? 'hover:bg-gray-200 text-gray-900' :
                          'text-gray-400 cursor-not-allowed'
                        }`}
                        style={{ borderRadius: '0.5rem' }}
                        disabled={!isAvailable || !allEmployeesSelected}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Uhrzeit auswählen</h3>
                {selectedDate && allEmployeesSelected ? (
                  <>
                    <div className="text-xs text-gray-600 mb-3">
                      Es werden Zeiten angezeigt, zu denen alle ausgewählten Mitarbeiter Ihre Dienstleistungen optimal ausführen können.
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {availableSlots.map(time => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`p-2 text-sm transition-colors ${
                            selectedTime === time ? 'bg-black text-white' : 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-200'
                          }`}
                          style={{ borderRadius: '0.5rem' }}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </>
                ) : !allEmployeesSelected ? (
                  <p className="text-gray-600 text-sm">Bitte wählen Sie zuerst Mitarbeiter für alle Dienstleistungen aus</p>
                ) : (
                  <p className="text-gray-600 text-sm">Bitte wählen Sie zuerst ein Datum aus</p>
                )}
                {selectedDate && allEmployeesSelected && availableSlots.length === 0 && (
                  <p className="text-gray-600 text-sm">Keine verfügbaren Zeiten für dieses Datum mit Ihren ausgewählten Mitarbeitern</p>
                )}
              </div>
            </div>
            {/* Buttons: make mobile friendly */}
            <div className="flex flex-col sm:flex-row justify-between mt-8 gap-3 sm:gap-0">
              <button
                className="bg-gray-200 text-gray-700 px-6 py-3 text-sm font-medium hover:bg-gray-300 transition-colors"
                style={{ borderRadius: '0.5rem' }}
                onClick={() => setStep('professional')}
              >
                Zurück zu Mitarbeiter
              </button>
              <button
                className="bg-black text-white px-6 py-3 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                style={{ borderRadius: '0.5rem' }}
                onClick={() => setStep('summary')}
                disabled={!selectedDate || !selectedTime || !allEmployeesSelected}
              >
                Weiter zur Übersicht
              </button>
            </div>
          </div>
        )}

        {/* Booking Summary Step */}
        {step === 'summary' && (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Salon Information */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">{salon.name}</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <FiMapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{salon.location}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <FiCalendar className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">
                        {selectedDate && (() => {
                          const [year, month, day] = selectedDate.split('-').map(Number);
                          // Use German time for display
                          const dateObj = new Date(Date.UTC(year, month - 1, day));
                          return dateObj.toLocaleDateString('de-DE', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            timeZone: 'Europe/Berlin'
                          });
                        })()}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <FiClock className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">
                        {/* Show selectedTime in German time */}
                        {selectedTime} ({totalDuration} Minuten gesamt)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Services & Total */}
              <div className="lg:col-span-1">
                <div className="border border-gray-200 p-6 space-y-6 rounded-lg bg-gray-50 w-full min-w-[340px] max-w-xs mx-auto">
                  <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wider">Dienstleistungen</h3>
                  <div className="space-y-4">
                    {serviceSelections.map(sel => (
                      <div key={sel.service._id} className="flex flex-col py-2">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-sm text-gray-700 max-w-[120px] truncate">
                            {sel.service.name}
                            {sel.service.selectedOption && (
                              <span className="ml-2 text-xs text-gray-600">
                                ({sel.service.selectedOption.duration} Min)
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">€{sel.service.price}</span>
                            <button
                              className="ml-2 text-red-500 hover:text-red-700 text-lg font-bold px-2"
                              onClick={() => removeService(sel.service._id)}
                            >
                              ×
                            </button>
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 max-w-[120px] truncate">
                          Mitarbeiter: {sel.employee?.name || "Nicht ausgewählt"}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900 uppercase tracking-wider">Gesamt</span>
                      <span className="text-lg font-medium text-gray-900">€{total}</span>
                    </div>
                  </div>
                  
                  {/* Customer Info Fields */}
                  <div className="border-t border-gray-200 pt-4 space-y-4">
                    <div>
                      {/* Removed label for name */}
                      <input
                        type="text"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="Geben Sie Ihren vollständigen Namen ein"
                        required
                        style={{ color: "#000" }}
                      />
                    </div>
                    <div>
                      {/* Removed label for phone */}
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="Geben Sie Ihre Telefonnummer ein"
                        required
                        style={{ color: "#000" }}
                      />
                    </div>
                    
                    {/* Customer Address Fields - Only show if salon requires it */}
                    {salon?.storeCustomerAddress && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={customerAddress.street}
                              onChange={e => setCustomerAddress(prev => ({ ...prev, street: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                              placeholder="Straße"
                              required
                              style={{ color: "#000" }}
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={customerAddress.number}
                              onChange={e => setCustomerAddress(prev => ({ ...prev, number: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                              placeholder="Nr."
                              required
                              style={{ color: "#000" }}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <input
                              type="text"
                              value={customerAddress.zip}
                              onChange={e => setCustomerAddress(prev => ({ ...prev, zip: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                              placeholder="PLZ"
                              required
                              style={{ color: "#000" }}
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={customerAddress.country}
                              onChange={e => setCustomerAddress(prev => ({ ...prev, country: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                              placeholder="Stadt"
                              required
                              style={{ color: "#000" }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons: make mobile friendly */}
            <div className="flex flex-col sm:flex-row justify-between mt-8 gap-3 sm:gap-0">
              <button
                className="bg-gray-200 text-gray-700 px-6 py-3 text-sm font-medium hover:bg-gray-300 transition-colors"
                style={{ borderRadius: '0.5rem' }}
                onClick={() => setStep('datetime')}
              >
                Zurück zu Datum & Uhrzeit
              </button>
              <button
                className="bg-[#5C6F68] hover:bg-[#4a5a54] text-white py-3 px-6 text-sm font-semibold transition-colors disabled:opacity-50"
                style={{ borderRadius: '0.5rem' }}
                onClick={createBooking}
                disabled={loading || !isCustomerInfoValid}
              >
                {loading ? 'Bestätige...' : 'Buchung bestätigen'}
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Step */}
        {step === 'confirmation' && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-8">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: '#9DBE8D' }}
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-medium text-gray-900 mb-4">Buchung bestätigt!</h2>
              <p className="text-gray-600 mb-6">
                Ihre Buchung wurde erfolgreich erstellt. Buchungs-ID: <strong>{bookingId}</strong>
              </p>
              <div className="space-y-2 text-sm text-gray-700 mb-6">
                <p><strong>Kunde:</strong> {customerName}</p>
                <p><strong>Telefon:</strong> {customerPhone}</p>
                {salon?.storeCustomerAddress && customerAddress.street && (
                  <p><strong>Adresse:</strong> {customerAddress.street} {customerAddress.number}, {customerAddress.zip} {customerAddress.country}</p>
                )}
                <p><strong>Salon:</strong> {salon.name}</p>
                <p><strong>Datum & Uhrzeit:</strong> {selectedDate && (() => {
                  const [year, month, day] = selectedDate.split('-').map(Number);
                  // Use German time for display
                  const dateObj = new Date(Date.UTC(year, month - 1, day));
                  return dateObj.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' });
                })()} um {selectedTime}</p>
                <p><strong>Dienstleistungen:</strong> {serviceSelections.map(sel => `${sel.service.name} (${sel.employee?.name})`).join(', ')}</p>
                <p><strong>Gesamt:</strong> €{total}</p>
              </div>
              <button
                className="bg-black text-white px-6 py-3 text-sm font-medium hover:bg-gray-800 transition-colors"
                style={{ borderRadius: '0.5rem' }}
                onClick={() => router.push('/salons')}
              >
                Weitere Salons ansehen
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}