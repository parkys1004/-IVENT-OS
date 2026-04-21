import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, where, or, and, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Search, CalendarDays, Clock, Flame } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import EventCard, { EventData } from '../components/EventCard';
import clsx from 'clsx';

export default function CategoryExplore() {
  const { category } = useParams<{ category: string }>();
  const { t } = useLanguage();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('upcoming');

  useEffect(() => {
    setLoading(true);
    if (!category) return;

    let q;
    if (category === 'party') {
      q = query(
        collection(db, 'events'),
        where('status', '==', 'published'),
        limit(24)
      );
    } else if (category === 'lesson') {
      // Special logic for lessons: show both general lesson category and specifically flagged lessons
      q = query(
        collection(db, 'events'),
        and(
          where('status', '==', 'published'),
          or(
            where('category', '==', 'lesson'),
            where('isLesson', '==', true)
          )
        ),
        limit(24)
      );
    } else {
      q = query(
        collection(db, 'events'),
        where('category', '==', category),
        where('status', '==', 'published'),
        limit(24)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EventData[];
      
      setEvents(eventsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching category events:', error);
      setLoading(false); 
    });

    return () => unsubscribe();
  }, [category]);

  const filteredEvents = events.filter(e => 
    searchQuery === '' || 
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.locationName && e.locationName.toLowerCase().includes(searchQuery.toLowerCase()))
  ).sort((a, b) => {
    const getTime = (val: any) => {
      if (!val) return 0;
      if (val.toDate) return val.toDate().getTime();
      if (val instanceof Date) return val.getTime();
      if (typeof val === 'string') return new Date(val).getTime();
      if (typeof val === 'number') return val;
      if (val.seconds) return val.seconds * 1000;
      return 0;
    };

    if (sortBy === 'upcoming') {
      const timeA = getTime(a.date);
      const timeB = getTime(b.date);
      return timeA - timeB;
    }
    if (sortBy === 'latest') {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (typeof a.id === 'string' ? parseInt(a.id.substring(0, 8), 16) || 0 : 0);
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (typeof b.id === 'string' ? parseInt(b.id.substring(0, 8), 16) || 0 : 0);
      
      // Fallback: if createdAt is missing, use ID or name
      if (timeA === 0 && timeB === 0) return b.id.localeCompare(a.id);
      return timeB - timeA;
    }
    if (sortBy === 'popular') {
      return (b.likesCount || 0) - (a.likesCount || 0);
    }
    return 0;
  });

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12 xl:px-20 py-8 lg:py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white capitalize mb-2">
            {t(`search.category.${category}`)}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {category === 'party' ? '즐거운 댄스 파티와 소셜을 찾아보세요.' : 
             category === 'lesson' ? '기초부터 심화까지, 당신을 위한 강습.' :
             category === 'instructor' ? '열정적인 강사의 커리큘럼.' :
             category === 'dj' ? '최고의 텐션을 선사할 DJ 라인업.' :
             category === 'media' ? '당신의 순간을 담아낼 최고의 아티스트.' :
             category === 'salsa' ? '정열적인 살사 파티와 소셜을 찾아보세요.' : 
             category === 'bachata' ? '감미로운 바차타의 선율과 함께하는 순간.' :
             category === 'kizomba' ? '매혹적인 키좀바의 세계로 여러분을 초대합니다.' :
             category === 'salsa_bachata' ? '살사와 바차타, 두 마리 토끼를 한 번에.' :
             category === 'sal_ba_ki' ? '살사, 바차타, 키좀바가 어우러진 최고의 축제.' :
             '당신의 순간을 담아낼 다양한 이벤트.'}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-2 flex flex-col md:flex-row items-center gap-3 shadow-sm transition-colors mb-12">
        <div className="relative w-full md:w-80 group">
          <input 
            type="text" 
            placeholder={t('search.placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[14px] pl-4 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all font-medium text-slate-700 dark:text-slate-200"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
        </div>

        <div className="h-10 border-l border-slate-200 dark:border-slate-800 hidden md:block mx-1"></div>

        <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-[14px] border border-slate-100 dark:border-slate-800 w-full md:w-auto">
          {[
            { id: 'upcoming', label: t('search.sort.upcoming'), icon: <Clock className="w-3.5 h-3.5" /> },
            { id: 'latest', label: t('search.sort.latest') },
            { id: 'popular', label: t('search.sort.popular'), icon: <Flame className="w-3.5 h-3.5 text-orange-500" /> }
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSortBy(s.id)}
              className={clsx(
                "flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-[10px] text-xs font-bold transition-all whitespace-nowrap",
                sortBy === s.id 
                  ? "bg-indigo-600 dark:bg-indigo-600 text-white shadow-sm" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              {s.icon && s.icon}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-8">
          <AnimatePresence mode="popLayout">
            {filteredEvents.map((event, idx) => (
              <motion.div
                key={event.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <EventCard event={event} index={idx} />
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredEvents.length === 0 && (
            <div className="col-span-full py-24 text-center bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
              <CalendarDays className="mx-auto h-16 w-16 text-slate-200 dark:text-slate-700 mb-6" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">등록된 내역이 없습니다.</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                현재 {t(`search.category.${category}`)} 카테고리에 활성화된 항목이 없습니다.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
