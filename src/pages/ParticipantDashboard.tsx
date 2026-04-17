import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion } from 'motion/react';
import { MapPin, Users, CalendarDays, Clock, Flame } from 'lucide-react';
import clsx from 'clsx';

// Error handling spec
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email ?? undefined,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId ?? undefined,
      providerInfo: currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface EventData {
  id: string;
  title: string;
  category: string;
  date: any;
  endDate: any;
  locationName: string;
  imageUrl?: string;
  maxAttendees: number;
  currentAttendees: number;
  status: string;
}

export default function ParticipantDashboard() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const q = query(
      collection(db, 'events'),
      orderBy('date', 'asc') // Show upcoming first
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EventData[];
      
      // Filter out drafts or cancelled for non-admins (simplified for MVP)
      setEvents(eventsData.filter(e => e.status === 'published'));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });

    return () => unsubscribe();
  }, []);

  const filteredEvents = events.filter(e => filter === 'all' || e.category === filter);
  
  // Fake "ending soon" logic: first two events
  const endingSoon = filteredEvents.slice(0, 1);
  const others = filteredEvents.slice(1);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  // Calculate some fake stats based on events
  const totalBookings = events.reduce((acc, curr) => acc + curr.currentAttendees, 0);
  const totalCapacity = events.reduce((acc, curr) => acc + curr.maxAttendees, 0);
  const bookingRate = totalCapacity > 0 ? Math.round((totalBookings / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-8 md:space-y-12 w-full">
      {/* Hero / Banner Area + Stats Grid equivalent to the dashboard layout */}
      <section className="grid grid-cols-1 lg:grid-cols-[2.5fr_1fr] 2xl:grid-cols-[3.5fr_1fr] gap-6 xl:gap-8">
        <div className="flex flex-col h-full min-h-[300px]">
          {endingSoon.map((event, idx) => (
            <EventCard key={event.id} event={event} featured={true} index={idx} />
          ))}
          {endingSoon.length === 0 && (
            <div className="w-full h-full min-h-[300px] bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500 flex items-center justify-center">
              현재 마감 임박 행사가 없습니다.
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-4 xl:gap-6 justify-start">
          <div className="bg-white border border-slate-200 rounded-[12px] p-5 flex justify-between items-center shadow-sm">
            <div>
              <div className="text-[13px] text-slate-500 font-medium mb-1">실시간 누적 예매율</div>
              <div className="text-[24px] font-bold text-indigo-600">{bookingRate}%</div>
            </div>
            <div className="text-[#10B981] font-bold text-sm bg-emerald-50 px-2.5 py-1.5 rounded-md">↑ 12%</div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-[12px] p-5 flex justify-between items-center shadow-sm">
            <div>
              <div className="text-[13px] text-slate-500 font-medium mb-1">금일 방문자수</div>
              <div className="text-[24px] font-bold text-indigo-600">1,284</div>
            </div>
            <div className="text-[#10B981] font-bold text-sm bg-emerald-50 px-2.5 py-1.5 rounded-md">↑ 45%</div>
          </div>
        </div>
      </section>

      {/* Categories Filter */}
      <section>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          {['all', 'IT', 'Music', 'Networking', 'Education'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={clsx(
                "px-6 py-3 rounded-[12px] text-[14px] font-bold whitespace-nowrap transition-colors",
                filter === cat 
                  ? "bg-slate-800 text-white shadow-md shadow-slate-200" 
                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700"
              )}
            >
              {cat === 'all' ? '전체 보기' : cat}
            </button>
          ))}
        </div>
      </section>

      {/* Event Grid */}
      <section>
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">예정된 행사</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 xl:gap-8">
          {others.map((event, idx) => (
            <EventCard key={event.id} event={event} index={idx} />
          ))}
          {others.length === 0 && events.length > 1 && (
             <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed">
             해당 카테고리의 행사가 없습니다.
           </div>
          )}
          {events.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
              <CalendarDays className="mx-auto h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-1">등록된 행사가 없습니다.</h3>
              <p className="text-slate-500 mb-4 text-sm">첫 번째 행사를 만들어보세요!</p>
              <Link to="/create" className="text-indigo-600 font-bold hover:text-indigo-500">
                행사 만들기 &rarr;
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function EventCard({ event, featured = false, index }: { event: EventData, featured?: boolean, index: number }) {
  const isFull = event.currentAttendees >= event.maxAttendees;
  const fillPercentage = Math.min((event.currentAttendees / event.maxAttendees) * 100, 100);
  
  const dateObj = event.date?.toDate ? event.date.toDate() : new Date();
  
  if (featured) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1, duration: 0.4 }}
        className="h-full"
      >
        <Link 
          to={`/event/${event.id}`}
          className="group relative flex flex-col justify-end h-[300px] lg:h-[400px] xl:h-[460px] w-full rounded-[24px] p-8 lg:p-12 overflow-hidden text-white shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-indigo-600 to-violet-600"
        >
          {event.imageUrl && (
            <div className="absolute inset-0 opacity-40 mix-blend-overlay">
              <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" referrerPolicy="no-referrer" />
            </div>
          )}
          
          <div className="absolute top-6 right-6 bg-red-500 px-4 py-2 rounded-full text-[13px] font-bold shadow-[0_4px_12px_rgba(239,68,68,0.3)] z-10 animate-pulse">
            마감 임박: 잔여 {event.maxAttendees - event.currentAttendees}석
          </div>
          
          <div className="relative z-10 w-full lg:max-w-[70%]">
            <span className="inline-block px-4 py-1.5 rounded-lg text-[13px] font-bold bg-white/20 backdrop-blur-md shadow-sm text-white mb-4 tracking-wider uppercase">
              {event.category}
            </span>
            <h3 className="font-extrabold text-[32px] lg:text-[40px] xl:text-[48px] leading-tight mb-4 truncate text-white drop-shadow-md">{event.title}</h3>
            <p className="opacity-90 text-[16px] lg:text-[18px] truncate mb-8 flex items-center gap-2 drop-shadow">
              <MapPin className="w-5 h-5"/> {event.locationName} <span className="opacity-50">|</span> <Clock className="w-5 h-5"/> {format(dateObj, 'yyyy.MM.dd a h:mm', { locale: ko })}
            </p>
            
            <div className="flex gap-4">
              <div className="px-6 py-3.5 bg-white text-indigo-600 hover:bg-slate-50 font-bold text-[16px] rounded-xl shadow-lg transition-transform hover:-translate-y-0.5">참여 신청하기</div>
              <div className="px-6 py-3.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-[16px] rounded-xl transition-colors">관심 등록</div>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="h-full"
    >
      <Link 
        to={`/event/${event.id}`}
        className="group flex flex-col h-full bg-white rounded-[20px] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-slate-300 transition-all duration-300 overflow-hidden"
      >
        {event.imageUrl ? (
          <div className="w-full h-[180px] xl:h-[220px] bg-slate-100 overflow-hidden relative">
            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
            <div className="absolute top-4 left-4">
              <span className="inline-block px-3 py-1.5 rounded-lg text-[12px] font-bold bg-white/90 text-indigo-700 shadow-sm backdrop-blur">
                {event.category}
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full h-[180px] xl:h-[220px] bg-slate-50 flex flex-col items-center justify-center relative">
            <CalendarDays className="w-12 h-12 text-slate-300 mb-2" />
            <div className="absolute top-4 left-4">
              <span className="inline-block px-3 py-1.5 rounded-lg text-[12px] font-bold bg-white border border-slate-200 text-indigo-700 shadow-sm">
                {event.category}
              </span>
            </div>
          </div>
        )}

        <div className="p-6 flex flex-col flex-1">
          <h3 className="font-extrabold text-slate-800 text-[18px] xl:text-[20px] leading-[1.4] line-clamp-2 mb-4 group-hover:text-indigo-600 transition-colors">
            {event.title}
          </h3>

          <div className="text-[14px] text-slate-500 space-y-2.5 mb-6">
            <div className="flex items-center gap-2 truncate">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" /> <span className="truncate">{event.locationName}</span>
            </div>
            <div className="flex items-center gap-2">
               <Clock className="w-4 h-4 text-slate-400 shrink-0" /> <span>{format(dateObj, 'M월 d일 (E) a h:mm', { locale: ko })}</span>
            </div>
          </div>

          <div className="mt-auto pt-5 border-t border-slate-100 flex items-center justify-between">
            <div className="flex -space-x-2">
               <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center"><Users className="w-3.5 h-3.5 text-slate-500"/></div>
               <div className="w-8 h-8 rounded-full bg-indigo-50 border-2 border-white shadow-sm flex items-center justify-center text-[11px] text-indigo-600 font-bold">+{event.currentAttendees}</div>
            </div>
            
            <div className="text-[13px] font-bold flex flex-col items-end gap-1.5 focus-visible:outline-none">
              <span className={clsx("text-right", isFull ? "text-red-500" : "text-slate-500")}>
                {isFull ? "마감" : `${fillPercentage}%`}
              </span>
              <div className="w-24 lg:w-32 bg-slate-100 rounded-full h-2 overflow-hidden">
                 <div 
                    className={clsx(
                      "h-full rounded-full transition-all duration-1000",
                      isFull ? "bg-red-500" : fillPercentage > 80 ? "bg-orange-500" : "bg-indigo-500"
                    )} 
                    style={{ width: `${fillPercentage}%` }}
                 ></div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
