import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion } from 'motion/react';
import { MapPin, Clock, Users, Heart, CalendarDays } from 'lucide-react';
import clsx from 'clsx';

import TypeBadge from './TypeBadge';

export interface EventData {
  id: string;
  title: string;
  category: string;
  date: any;
  endDate: any;
  locationName: string;
  formattedAddress?: string;
  country?: string;
  city?: string;
  geoPoint?: { lat: number, lng: number };
  imageUrl?: string;
  imageUrls?: string[];
  coverImageIndex?: number;
  maxAttendees: number;
  currentAttendees: number;
  status: string;
  isBanner?: boolean;
  isLesson?: boolean;
  likesCount?: number;
}

export default function EventCard({ event, featured = false, index }: { event: EventData, featured?: boolean, index: number, key?: string | number }) {
  const isFull = event.currentAttendees >= event.maxAttendees;
  const fillPercentage = Math.min((event.currentAttendees / event.maxAttendees) * 100, 100);
  
  const dateObj = event.date?.toDate ? event.date.toDate() : new Date();
  const coverImage = event.imageUrls && event.imageUrls.length > 0 && event.coverImageIndex !== undefined 
                       ? event.imageUrls[event.coverImageIndex] 
                       : (event.imageUrl || null);
  
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
          className="group relative flex flex-col justify-end h-[300px] lg:h-[400px] xl:h-[460px] w-full rounded-[24px] p-6 sm:p-8 lg:p-12 overflow-hidden text-white shadow-sm hover:shadow-md transition-all duration-300 bg-slate-200 dark:bg-slate-800"
        >
          {coverImage && (
            <div className="absolute inset-0">
              <img src={coverImage} alt={event.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" referrerPolicy="no-referrer" />
              {/* Bottom gradient for better text readability */}
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            </div>
          )}
          
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-red-500 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[11px] sm:text-[13px] font-black shadow-[0_4px_12px_rgba(239,68,68,0.3)] z-10 transition-transform active:scale-95">
            {isFull ? "모집 마감" : `마감 임박: 잔여 ${event.maxAttendees - event.currentAttendees}석`}
          </div>
          
          <div className="relative z-10 w-full lg:max-w-[80%]">
            <span className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 rounded-lg text-[11px] sm:text-[13px] font-black bg-black/40 backdrop-blur-md shadow-sm text-white mb-3 sm:mb-4 tracking-wider uppercase border border-white/20">
              {event.category}
            </span>
            <h3 className="font-black text-[24px] sm:text-[32px] lg:text-[40px] xl:text-[48px] leading-tight mb-4 truncate text-white drop-shadow-2xl flex items-center gap-3">
              <TypeBadge isLesson={event.isLesson} className="!text-[14px] sm:!text-[18px] px-2 sm:px-3 py-0.5 sm:py-1 border-white/30 shrink-0" />
              <span className="truncate">{event.title}</span>
            </h3>
            <p className="opacity-90 text-[14px] sm:text-[16px] lg:text-[18px] truncate mb-6 sm:mb-8 flex items-center gap-2 drop-shadow-lg font-medium">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"/> <span className="truncate">{event.locationName}</span> <span className="opacity-30">|</span> <Clock className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"/> <span className="truncate">{format(dateObj, 'yyyy.MM.dd a h:mm', { locale: ko })}</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="h-12 sm:h-14 flex items-center justify-center px-6 bg-white text-indigo-600 hover:bg-slate-50 font-black text-[15px] sm:text-[16px] rounded-xl shadow-lg transition-all hover:translate-y-[-2px] active:scale-95 cursor-pointer text-center">참여 신청하기</div>
              <div className="h-12 sm:h-14 flex items-center justify-center px-6 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-black text-[15px] sm:text-[16px] rounded-xl transition-all border border-white/20 active:scale-95 cursor-pointer text-center">관심 등록</div>
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
        className="group flex flex-col h-full bg-white dark:bg-slate-900 rounded-[20px] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 overflow-hidden"
      >
        {coverImage ? (
          <div className="w-full h-[180px] xl:h-[220px] bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
            <img src={coverImage} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
            <div className="absolute top-4 left-4">
              <span className="inline-block px-3 py-1.5 rounded-lg text-[12px] font-bold bg-white/90 text-indigo-700 shadow-sm backdrop-blur">
                {event.category}
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full h-[180px] xl:h-[220px] bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center relative">
            <CalendarDays className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-2" />
            <div className="absolute top-4 left-4">
              <span className="inline-block px-3 py-1.5 rounded-lg text-[12px] font-bold bg-white border border-slate-200 text-indigo-700 shadow-sm">
                {event.category}
              </span>
            </div>
          </div>
        )}

        <div className="p-6 flex flex-col flex-1">
          <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-[18px] xl:text-[20px] leading-[1.4] line-clamp-2 mb-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-start">
            <TypeBadge isLesson={event.isLesson} className="mt-1 shrink-0" />
            <span className="line-clamp-2">{event.title}</span>
          </h3>

          <div className="text-[14px] text-slate-500 dark:text-slate-400 space-y-2.5 mb-6">
            <div className="flex items-center gap-2 truncate">
              <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" /> <span className="truncate">{event.locationName}</span>
            </div>
            <div className="flex items-center gap-2">
               <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" /> <span>{format(dateObj, 'M월 d일 (E) a h:mm', { locale: ko })}</span>
            </div>
          </div>

          <div className="mt-auto pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex -space-x-2 mr-3">
               <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900 shadow-sm flex items-center justify-center"><Users className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400"/></div>
               <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/50 border-2 border-white dark:border-slate-900 shadow-sm flex items-center justify-center text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">+{event.currentAttendees}</div>
            </div>
            
            <div className="flex items-center gap-1.5 mr-auto">
              <Heart className="w-4 h-4 text-rose-500 fill-current" />
              <span className="text-[14px] font-bold text-slate-700 dark:text-slate-300">{event.likesCount || 0}</span>
            </div>
            
            <div className="text-[13px] font-bold flex flex-col items-end gap-1.5 focus-visible:outline-none">
              <span className={clsx("text-right", isFull ? "text-red-500" : "text-slate-500 dark:text-slate-400")}>
                {isFull ? "마감" : `${fillPercentage}%`}
              </span>
              <div className="w-24 lg:w-32 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
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
