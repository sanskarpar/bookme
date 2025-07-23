"use client";
import React, { useEffect, useState } from "react";
import Navbar from "../../../components/adminnavbar";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { initializeApp } from "firebase/app";

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

type CalendarBooking = {
  id: string;
  time: string;
  endTime: string;
  service: string;
  customer: string;
  status: 'upcoming' | 'completed' | 'no-show' | 'confirmed';
  date: string;
  employee?: string;
};

export default function CalendarPage() {
  const [user, setUser] = useState<any>(null);
  const [salon, setSalon] = useState<any>(null);
  const [calendarBookings, setCalendarBookings] = useState<CalendarBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingSalonUid, setViewingSalonUid] = useState<string | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser?.email) {
        setLoading(true);
        try {
          // Check if this is system admin viewing another salon's calendar
          const urlParams = new URLSearchParams(window.location.search);
          const salonUidParam = urlParams.get('salonUid');
          const isSystemUser = firebaseUser.email === "system@gmail.com";
          setIsSystemAdmin(isSystemUser);

          let salonUid = null;
          if (salonUidParam && isSystemUser) {
            setViewingSalonUid(salonUidParam);
            salonUid = salonUidParam;
            // Fetch the specific salon data
            const salonRes = await fetch(`/api/salons?uid=${encodeURIComponent(salonUidParam)}`);
            if (salonRes.ok) {
              const salonData = await salonRes.json();
              setSalon(salonData.salon);
            }
          } else {
            // Normal salon user or system admin viewing their own calendar
            const res = await fetch(`/api/salons?email=${encodeURIComponent(firebaseUser.email)}`);
            if (!res.ok) throw new Error("Salon not found");
            const data = await res.json();
            const salonData = data.salon || data;
            setSalon(salonData);
            salonUid = salonData?.uid;
          }

          if (salonUid) {
            // Fetch all bookings for this salon
            const res = await fetch(`/api/bookings?salonUid=${encodeURIComponent(salonUid)}`);
            const data = await res.json();
            if (data.bookings) {
              const allCalendarBookings = data.bookings.map((booking: any) => {
                const startTime = booking.time;
                const duration = booking.services.reduce((total: number, service: any) => total + (service.duration || 30), 0);
                const [hours, minutes] = startTime.split(':').map(Number);
                const endMinutes = hours * 60 + minutes + duration;
                const endHours = Math.floor(endMinutes / 60);
                const endMins = endMinutes % 60;
                const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
                const employeeNames = Array.from(
                  new Set(
                    (booking.services || [])
                      .map((s: any) => s.employee)
                      .filter(Boolean)
                  )
                ).join(', ');
                return {
                  id: booking._id,
                  time: startTime,
                  endTime: endTime,
                  service: booking.services.map((s: any) => s.name).join(', '),
                  customer: booking.customerName,
                  status: booking.status === 'confirmed' ? 'upcoming' : booking.status,
                  date: booking.date,
                  employee: employeeNames
                };
              });
              setCalendarBookings(allCalendarBookings);
            }
          }
        } catch (err) {
          setCalendarBookings([]);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    setShowHolidayModal(true);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center font-sans px-2">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-primary-600 text-base sm:text-lg">Kalender wird geladen...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center font-sans px-2">
        <div className="text-center p-4 sm:p-6 bg-white rounded-lg shadow-sm max-w-md mx-2 sm:mx-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Zugriff eingeschränkt</h2>
          <p className="text-gray-600 mb-4 text-xs sm:text-base">Bitte melden Sie sich an, um den Kalender zu sehen</p>
          <a href="/login" className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md w-full sm:w-auto inline-block">
            Anmelden
          </a>
        </div>
      </main>
    );
  }

  return (
    <>
      <Navbar 
        user={user} 
        currentPath="/admin/calendar" 
        viewingSalonUid={viewingSalonUid}
      />
      <main className="min-h-screen bg-gray-50 font-sans p-0">
        <div className="max-w-6xl mx-auto py-6 px-2 sm:px-4 lg:px-8">
          <div className="mb-6 sm:mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Kalendar Übersicht
              {viewingSalonUid && isSystemAdmin && (
                <span className="text-lg text-gray-600 block mt-1">(System-Ansicht)</span>
              )}
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Wochenansicht aller Termine im Salon. Klicken Sie auf Tagesnamen für ganztägige Feiertage.
            </p>
          </div>
          <EnhancedCalendarWidget
            bookings={calendarBookings}
            salon={salon}
            onDateClick={handleDateClick}
          />
        </div>

        {/* Holiday Management Modal */}
        {showHolidayModal && selectedDate && (
          <HolidayModal
            selectedDate={selectedDate}
            salon={salon}
            onClose={() => {
              setShowHolidayModal(false);
              setSelectedDate(null);
            }}
            onHolidayUpdated={() => {
              const currentSalonUid = viewingSalonUid || salon?.uid;
              if (currentSalonUid) {
                fetchSalonData(currentSalonUid);
              }
            }}
          />
        )}
      </main>
    </>
  );

  // Add helper function to fetch salon data
  async function fetchSalonData(salonUid: string) {
    try {
      const salonRes = await fetch(`/api/salons?uid=${encodeURIComponent(salonUid)}`);
      if (salonRes.ok) {
        const salonData = await salonRes.json();
        setSalon(salonData.salon);
      }
    } catch (error) {
      console.error('Error fetching salon data:', error);
    }
  }
}

// Enhanced Calendar Widget Component with holiday management
const EnhancedCalendarWidget = ({ 
  bookings, 
  salon,
  onDateClick
}: { 
  bookings: CalendarBooking[], 
  salon: any,
  onDateClick?: (date: string) => void
}) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  // German day names and month names
  const germanDayNamesShort = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const germanDayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const germanMonthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  // Get week days starting from Monday
  const getWeekDays = (baseDate: Date) => {
    const startOfWeek = new Date(baseDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday
    startOfWeek.setDate(diff);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const germanDayName = germanDayNames[date.getDay()];
      const workingDay = salon?.workingDays?.[germanDayName];
      const isOpen = workingDay?.open || false;
      const isHoliday = salon?.holidays?.includes(dateStr) || false;
      weekDays.push({
        date: dateStr,
        dayName: germanDayNamesShort[date.getDay()],
        dayNumber: date.getDate(),
        isToday: date.toDateString() === new Date().toDateString(),
        isCurrentMonth: date.getMonth() === baseDate.getMonth(),
        isOpen: isOpen && !isHoliday,
        isHoliday: isHoliday,
        workingHours: isOpen && !isHoliday ? {
          start: workingDay.start || '09:00',
          end: workingDay.end || '18:00'
        } : null,
        germanDayName
      });
    }
    return weekDays;
  };

  const weekDays = getWeekDays(currentWeek);
  
  // Generate time slots based on salon's earliest and latest hours
  const getTimeSlots = () => {
    let earliestHour = 24;
    let latestHour = 0;
    
    // Find the earliest start and latest end time across all working days
    weekDays.forEach(day => {
      if (day.workingHours) {
        const startHour = parseInt(day.workingHours.start.split(':')[0]);
        const endHour = parseInt(day.workingHours.end.split(':')[0]);
        earliestHour = Math.min(earliestHour, startHour);
        latestHour = Math.max(latestHour, endHour);
      }
    });
    
    // Default to 7-21 if no working hours found
    if (earliestHour === 24) earliestHour = 7;
    if (latestHour === 0) latestHour = 21;
    
    // Extend range slightly for better visibility
    earliestHour = Math.max(7, earliestHour - 1);
    latestHour = Math.min(22, latestHour + 1);
    
    const timeSlots: string[] = [];
    for (let hour = earliestHour; hour <= latestHour; hour++) {
      timeSlots.push(`${String(hour).padStart(2, '0')}:00`);
      if (hour < latestHour) timeSlots.push(`${String(hour).padStart(2, '0')}:30`);
    }
    return timeSlots;
  };

  const timeSlots = getTimeSlots();

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  const getBookingsForSlot = (date: string, time: string) => {
    return bookings.filter(booking => {
      if (booking.date !== date) return false;
      
      const bookingStart = booking.time;
      const bookingEnd = booking.endTime;
      
      // Check if this time slot overlaps with the booking
      return bookingStart <= time && bookingEnd > time;
    });
  };

  // Check if a time slot is within working hours
  const isTimeSlotAvailable = (day: any, time: string) => {
    if (!day.isOpen || day.isHoliday || !day.workingHours) return false;
    
    const slotTime = time;
    const startTime = day.workingHours.start;
    const endTime = day.workingHours.end;
    
    return slotTime >= startTime && slotTime < endTime;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
      case 'confirmed':
        return 'bg-blue-50 text-blue-800 border-l-4 border-blue-500';
      case 'completed':
        return 'bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500';
      case 'no-show':
        return 'bg-red-50 text-red-800 border-l-4 border-red-500';
      default:
        return 'bg-gray-50 text-gray-800 border-l-4 border-gray-400';
    }
  };

  const getBookingDuration = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return Math.max(1, Math.ceil((endMinutes - startMinutes) / 30)); // Minimum 1 slot
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header with Navigation */}
      <div className="flex items-center justify-between bg-slate-50 p-5 rounded-xl border border-slate-200">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all duration-200 shadow-sm border border-transparent hover:border-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h3 className="text-lg font-semibold text-gray-900">
            {/* German month and year */}
            {germanMonthNames[currentWeek.getMonth()]} {currentWeek.getFullYear()}
          </h3>
          
          <button
            onClick={() => navigateWeek('next')}
            className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all duration-200 shadow-sm border border-transparent hover:border-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <button
          onClick={goToToday}
          className="px-4 py-2 text-sm font-medium text-blue-700 hover:text-blue-800 bg-white hover:bg-blue-50 border border-blue-200 hover:border-blue-300 rounded-lg transition-all duration-200 shadow-sm"
        >
          Heute
        </button>
      </div>

      {/* Legende */}
      <div className="flex flex-wrap gap-6 text-sm bg-white p-4 rounded-xl border border-gray-100">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-sm mr-2 shadow-sm"></div>
          <span className="text-gray-700 font-medium">Bevorstehend</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-emerald-500 rounded-sm mr-2 shadow-sm"></div>
          <span className="text-gray-700 font-medium">Abgeschlossen</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-sm mr-2 shadow-sm"></div>
          <span className="text-gray-700 font-medium">Nicht erschienen</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-gray-300 rounded-sm mr-2 shadow-sm"></div>
          <span className="text-gray-700 font-medium">Geschlossen/Feiertag</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Week header */}
        <div className="grid grid-cols-8 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
          <div className="p-4 text-center border-r border-gray-200">
            <span className="text-sm font-semibold text-gray-600">Zeit</span>
          </div>
          {weekDays.map(day => (
            <div 
              key={day.date} 
              className={`p-4 text-center border-r border-gray-200 last:border-r-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                day.isToday 
                  ? 'bg-blue-100 text-blue-900' 
                  : day.isCurrentMonth 
                    ? 'text-gray-900' 
                    : 'text-gray-400'
              } ${
                day.isHoliday
                  ? 'bg-red-50 border-red-100'
                  : !day.isOpen
                    ? 'bg-gray-100 opacity-60'
                    : ''
              }`}
              onClick={() => onDateClick && onDateClick(day.date)}
              title={day.isHoliday ? "Feiertag - Klicken zum Entfernen" : "Klicken um als Feiertag zu markieren"}
            >
              <div className="text-xs font-medium uppercase tracking-wider mb-1">{day.dayName}</div>
              <div className={`text-xl font-bold ${day.isToday ? 'text-blue-800' : ''}`}>
                {day.dayNumber}
              </div>
              {day.isHoliday && (
                <div className="text-xs font-medium mt-1 text-black">Feiertag</div>
              )}
              {!day.isOpen && !day.isHoliday && (
                <div className="text-xs text-gray-500 font-medium mt-1">Geschlossen</div>
              )}
              {day.workingHours && (
                <div className="text-xs text-gray-600 mt-1">
                  {day.workingHours.start}-{day.workingHours.end}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Time slots grid */}
        <div className="relative">
          {timeSlots.map((time, timeIndex) => (
            <div key={time} className="grid grid-cols-8 border-b border-gray-100 last:border-b-0 min-h-[70px]">
              <div className="p-4 text-right border-r border-gray-200 bg-slate-25 flex items-center justify-end">
                <span className="text-sm text-gray-600 font-mono font-medium">{time}</span>
              </div>
              {weekDays.map((day, dayIndex) => {
                const slotBookings = getBookingsForSlot(day.date, time);
                const isAvailable = isTimeSlotAvailable(day, time);
                
                return (
                  <div 
                    key={`${day.date}-${time}`} 
                    className={`relative border-r border-gray-200 last:border-r-0 p-1 ${
                      day.isToday ? 'bg-blue-25' : ''
                    } ${
                      !isAvailable 
                        ? 'bg-gray-100 opacity-50' 
                        : 'hover:bg-gray-25 transition-colors duration-150'
                    } ${
                      day.isHoliday ? 'bg-red-25' : ''
                    }`}
                  >
                    {/* Grey overlay for unavailable slots */}
                    {!isAvailable && (
                      <div className="absolute inset-0 bg-gray-200 opacity-30 pointer-events-none"></div>
                    )}
                    
                    {slotBookings.map(booking => {
                      const duration = getBookingDuration(booking.time, booking.endTime);
                      const isFirstSlot = booking.time === time;
                      
                      if (!isFirstSlot) return null; // Only render on first slot
                      
                      return (
                        <div
                          key={booking.id}
                          className={`absolute inset-x-1.5 rounded-lg p-3 ${getStatusColor(booking.status)} hover:shadow-md transition-all duration-200 cursor-pointer group z-10`}
                          style={{
                            height: `${duration * 70 - 8}px`
                          }}
                          title={`${booking.customer} - ${booking.service}`}
                        >
                          <div className="text-sm font-semibold truncate group-hover:font-bold transition-all">
                            {booking.customer}
                          </div>
                          <div className="text-xs text-gray-600 truncate mt-1 font-medium">
                            {booking.service}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Zusammenfassung */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-6 rounded-xl border border-slate-200">
        <h4 className="font-semibold text-gray-900 mb-4 text-lg">Wochenübersicht</h4>
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map(day => {
            const dayBookings = bookings.filter(b => b.date === day.date);
            return (
              <div key={day.date} className={`text-center p-3 rounded-lg shadow-sm border ${
                day.isHoliday 
                  ? 'bg-red-50 border-red-200' 
                  : !day.isOpen 
                    ? 'bg-gray-100 border-gray-200 opacity-60' 
                    : 'bg-white border-gray-100'
              }`}>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">{day.dayName}</div>
                <div className={`text-2xl font-bold mb-1 ${
                  day.isHoliday ? 'text-red-600' : !day.isOpen ? 'text-gray-400' : 'text-gray-900'
                }`}>
                  {day.isHoliday ? '🏖️' : !day.isOpen ? '❌' : dayBookings.length}
                </div>
                <div className={`text-xs font-medium ${(!day.isHoliday && day.isOpen) ? 'text-black' : ''}`}>
                  {day.isHoliday 
                    ? 'Feiertag' 
                    : !day.isOpen 
                      ? 'Geschlossen' 
                      : dayBookings.length === 1 
                        ? 'Termin' 
                        : 'Termine'
                  }
                </div>
                {day.workingHours && (
                  <div className="text-xs text-gray-500 mt-1">
                    {day.workingHours.start}-{day.workingHours.end}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Holiday Management Modal
const HolidayModal = ({
  selectedDate,
  salon,
  onClose,
  onHolidayUpdated
}: {
  selectedDate: string,
  salon: any,
  onClose: () => void,
  onHolidayUpdated: () => void
}) => {
  const [isHoliday, setIsHoliday] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsHoliday(salon?.holidays?.includes(selectedDate) || false);
  }, [selectedDate, salon]);

  const handleToggleHoliday = async () => {
    if (!salon?.email) return;
    
    setLoading(true);
    try {
      let newHolidays = [...(salon.holidays || [])];
      
      if (isHoliday) {
        // Remove holiday
        newHolidays = newHolidays.filter(date => date !== selectedDate);
      } else {
        // Add holiday
        newHolidays.push(selectedDate);
      }

      const response = await fetch('/api/salons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: salon.email,
          holidays: newHolidays
        })
      });

      if (response.ok) {
        setIsHoliday(!isHoliday);
        onHolidayUpdated();
        setTimeout(onClose, 1000);
      }
    } catch (error) {
      console.error('Error updating holiday:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ganztägigen Feiertag verwalten</h3>
          <p className="text-gray-600 mb-6">
            <strong>{new Date(selectedDate).toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
          </p>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-6">
            <div>
              <div className="font-medium text-gray-900">
                {isHoliday ? 'Ist ein Feiertag' : 'Normaler Arbeitstag'}
              </div>
              <div className="text-sm text-gray-600">
                {isHoliday ? 'Salon ist den ganzen Tag geschlossen' : 'Salon ist nach normalen Öffnungszeiten geöffnet'}
              </div>
            </div>
            <button
              onClick={handleToggleHoliday}
              disabled={loading}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                isHoliday
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              } disabled:opacity-50`}
            >
              {loading ? 'Wird gespeichert...' : (isHoliday ? 'Feiertag entfernen' : 'Als Feiertag markieren')}
            </button>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};