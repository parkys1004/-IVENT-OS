import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Search, CalendarDays, Clock, Flame, Users } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import EventCard, { EventData } from '../components/EventCard';
import ProfessionalCard from '../components/ProfessionalCard';
import { UserProfile } from '../context/AuthContext';
import clsx from 'clsx';

export default function CategoryExplore() {
  const { category } = useParams<{ category: string }>();
  const { t } = useLanguage();
  const [events, setEvents] = useState<EventData[]>([]);
  const [professionals, setProfessionals] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('upcoming');

  const isProfessionalCategory = ['instructor', 'dj', 'media', 'dj_media'].includes(category || '');

  useEffect(() => {
    setLoading(true);
    if (!category) return;

    if (isProfessionalCategory) {
      const fetchProfessionals = async () => {
        try {
          let roles = [category];
          if (category === 'dj_media') roles = ['dj', 'media'];
          
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .in('role', roles)
            .limit(100);
          
          if (error) throw error;
          
          const usersData = data.map(u => ({
            uid: u.id,
            email: u.email,
            displayName: u.display_name,
            photoURL: u.photo_url,
            role: u.role,
            priority: u.priority
          })) as any;
          
          setProfessionals(usersData);
          setLoading(false);
        } catch (error) {
          console.error('Error fetching professionals:', error);
          setLoading(false);
        }
      };
      fetchProfessionals();
      return;
    }

    const fetchItems = async () => {
      try {
        const combinedData: any[] = [];
        
        // Fetch Parties
        if (category !== 'lesson') {
          let partiesQuery = supabase.from('parties').select('*').eq('status', 'published');
          if (category !== 'all' && category !== 'party') {
            partiesQuery = partiesQuery.eq('category', category);
          }
          const { data, error } = await partiesQuery.limit(50);
          if (error) console.error("Party fetch error:", error);
          if (data) combinedData.push(...data.map(p => ({ ...p, isLesson: false })));
        }

        // Fetch Lessons
        if (category !== 'party') {
          let lessonsQuery = supabase.from('lessons').select('*').eq('status', 'published');
          if (category !== 'all' && category !== 'lesson') {
            lessonsQuery = lessonsQuery.eq('category', category);
          }
          const { data, error } = await lessonsQuery.limit(50);
          if (error) console.error("Lesson fetch error:", error);
          if (data) combinedData.push(...data.map(l => ({ ...l, isLesson: true })));
        }

        if (combinedData.length === 0) {
          setEvents([]);
          setLoading(false);
          return;
        }
        
        // Fetch registration counts
        const { data: allRegs } = await supabase
          .from('registrations')
          .select('event_id')
          .in('event_id', combinedData.map(e => e.id));

        const regCounts: Record<string, number> = {};
        allRegs?.forEach(r => {
          regCounts[r.event_id] = (regCounts[r.event_id] || 0) + 1;
        });

        const mappedItems = combinedData.map(e => ({
          id: e.id,
          title: e.title,
          description: e.description || '',
          date: e.date || (e as any).start_date, // Handle potential schema variance
          end_date: e.end_date,
          category: e.category,
          locationName: e.location_name,
          imageUrl: e.image_url,
          isLesson: e.isLesson,
          likesCount: e.likes_count || 0,
          createdAt: e.created_at,
          metadata: e.metadata || {},
          maxAttendees: e.max_attendees || 0,
          currentAttendees: regCounts[e.id] || 0,
          level: (e as any).level,
          classTime: (e as any).class_time
        }));
        
        setEvents(mappedItems as any);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching category items:', error);
        setLoading(false); 
      }
    };

    fetchItems();
  }, [category, isProfessionalCategory]);

  const filteredItems = isProfessionalCategory 
    ? professionals.filter(p => 
        searchQuery === '' || 
        (p.displayName || '').toLowerCase().includes(searchQuery.toLowerCase())
      ).sort((a, b) => ((b as any).priority || 0) - ((a as any).priority || 0))
    : events.filter(e => {
        const matchesSearch = searchQuery === '' || 
          e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (e.locationName && e.locationName.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const getTime = (val: any) => {
          if (!val) return 0;
          return new Date(val).getTime();
        };

        const now = new Date().getTime();
        const eventTime = getTime(e.date);
        const meta = (e as any).metadata || {};
        const endDateStr = meta.endDate || (e as any).end_date;
        const endTime = endDateStr ? getTime(endDateStr) : eventTime + (4 * 60 * 60 * 1000);
        const isUpcomingOrOngoing = endTime > now;

        return matchesSearch && isUpcomingOrOngoing;
      }).sort((a, b) => {
        const getTime = (val: any) => {
          if (!val) return 0;
          return new Date(val).getTime();
        };

        if (sortBy === 'upcoming') {
          return getTime(a.date) - getTime(b.date);
        }
        if (sortBy === 'latest') {
          const timeA = getTime(a.createdAt);
          const timeB = getTime(b.createdAt);
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
            {category === 'dj_media' ? 'DJ & 전문가' : t(`search.category.${category}`)}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {category === 'party' ? '즐거운 댄스 파티와 소셜을 찾아보세요.' : 
             category === 'lesson' ? '기초부터 심화까지, 당신을 위한 강습.' :
             category === 'instructor' ? '열정적인 강사와 함께하는 댄스 여행.' :
             category === 'dj' ? '최고의 텐션을 선사할 DJ 라인업.' :
             category === 'media' || category === 'dj_media' ? '당신의 순간을 담아낼 최고의 아티스트.' :
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
            placeholder={isProfessionalCategory ? "전문가 이름으로 검색..." : t('search.placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[14px] pl-4 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all font-medium text-slate-700 dark:text-slate-200"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
        </div>

        {!isProfessionalCategory && (
          <>
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
          </>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <div className={clsx(
          "grid gap-6 xl:gap-8",
          isProfessionalCategory ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
        )}>
          <AnimatePresence mode="popLayout">
            {isProfessionalCategory ? (
              (filteredItems as UserProfile[]).map((pro, idx) => (
                <motion.div
                  key={pro.uid}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProfessionalCard professional={pro} index={idx} />
                </motion.div>
              ))
            ) : (
              (filteredItems as EventData[]).map((event, idx) => (
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
              ))
            )}
          </AnimatePresence>

          {filteredItems.length === 0 && (
            <div className="col-span-full py-24 text-center bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
              {isProfessionalCategory ? <Users className="mx-auto h-16 w-16 text-slate-200 dark:text-slate-700 mb-6" /> : <CalendarDays className="mx-auto h-16 w-16 text-slate-200 dark:text-slate-700 mb-6" />}
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">등록된 내역이 없습니다.</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                현재 {isProfessionalCategory ? '요청하신 분야의 전문가가' : t(`search.category.${category}`) + ' 카테고리에 활성화된 항목이'} 없습니다.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
