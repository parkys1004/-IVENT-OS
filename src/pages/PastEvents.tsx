import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import EventCard from '../components/EventCard';
import { motion } from 'motion/react';
import { Calendar, Music, Sparkles, Filter, Search, RotateCcw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function PastEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 16;
  const { t } = useLanguage();

  useEffect(() => {
    const fetchPastEvents = async () => {
      try {
        if (page === 0) setLoading(true);
        else setLoadingMore(true);

        const now = new Date().toISOString();
        const from = page * (PAGE_SIZE / 2);
        const to = from + (PAGE_SIZE / 2) - 1;

        // Fetch parties that passed
        const { data: partiesData, error: partiesError } = await supabase
          .from('parties')
          .select('id, title, date, location_name, category, image_url, status, end_date, max_attendees')
          .eq('status', 'published')
          .lt('end_date', now)
          .order('end_date', { ascending: false })
          .range(from, to);

        if (partiesError) throw partiesError;

        // Fetch lessons that passed
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('id, title, date, location_name, category, image_url, status, end_date, max_attendees')
          .eq('status', 'published')
          .lt('end_date', now)
          .order('end_date', { ascending: false })
          .range(from, to);

        if (lessonsError) throw lessonsError;

        const combinedData = [
          ...(partiesData || []).map(p => ({ ...p, isLesson: false, date: p.date || (p as any).start_date })),
          ...(lessonsData || []).map(l => ({ ...l, isLesson: true, date: l.date || (l as any).start_date }))
        ];

        setHasMore((partiesData?.length || 0) === PAGE_SIZE / 2 || (lessonsData?.length || 0) === PAGE_SIZE / 2);

        if (combinedData.length === 0 && page === 0) {
          setEvents([]);
          return;
        }

        // Fetch registration counts
        const { data: allRegs } = await supabase
          .from('registrations')
          .select('event_id')
          .in('event_id', combinedData.map(e => e.id))
          .limit(500);

        const regCounts: Record<string, number> = {};
        (allRegs as any[])?.forEach(r => {
          regCounts[r.event_id] = (regCounts[r.event_id] || 0) + 1;
        });

        const mappedEvents = combinedData.map(e => {
          return {
            id: e.id,
            title: e.title,
            date: e.date,
            locationName: e.location_name,
            category: e.category,
            imageUrl: e.image_url,
            isLesson: e.isLesson,
            maxAttendees: e.max_attendees || 0,
            currentAttendees: regCounts[e.id] || 0,
            status: e.status
          };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (page === 0) setEvents(mappedEvents);
        else setEvents(prev => [...prev, ...mappedEvents]);
      } catch (error) {
        console.error('Error fetching past events:', error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchPastEvents();
  }, [page]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F0A05] pb-24">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white dark:bg-[#14100B] border-b border-slate-200 dark:border-amber-900/20 pt-16 pb-20">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-orange-500 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500 blur-[120px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-black uppercase tracking-wider mb-6"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Archive
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-slate-900 dark:text-white mb-6"
          >
            지난 파티 <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">다시보기</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium"
          >
            이미 종료되었지만 열기 가득했던 지난 파티들의 현장 스튜디오와 리뷰를 확인해보세요. 
            Dancehive의 추억은 소중한 자산입니다.
          </motion.p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                <Music className="w-6 h-6 text-orange-500" /> 과거 파티 리스트
            </h2>
            <div className="text-sm font-bold text-slate-500">
                총 {events.length}개의 기록
            </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl h-[400px] animate-pulse"></div>
            ))}
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {events.map((event, idx) => (
              <EventCard key={event.id} event={event} index={idx} />
            ))}
            
            {hasMore && !loading && (
              <div className="col-span-full flex justify-center pt-12">
                <button
                  onClick={() => setPage(prev => prev + 1)}
                  disabled={loadingMore}
                  className="px-12 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-black text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-3 shadow-xl active:scale-95 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  ) : (
                    '과거 이벤트 더 보기'
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900/50 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800 py-32 text-center">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-700 shadow-sm">
                <Music className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">아직 기록된 과거 파티가 없습니다.</h3>
            <p className="text-slate-500 font-medium tracking-tight">행사가 종료되면 자동으로 이곳에 아카이브됩니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
