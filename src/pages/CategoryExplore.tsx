import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Search, CalendarDays, Clock, Flame, Users, Sparkles, BrainCircuit, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import EventCard, { EventData } from '../components/EventCard';
import ProfessionalCard from '../components/ProfessionalCard';
import { UserProfile, useAuth } from '../context/AuthContext';
import { extractTagsFromInput, getRecommendations, RecommendationTags } from '../services/recommendationService';
import clsx from 'clsx';

export default function CategoryExplore() {
  const { category } = useParams<{ category: string }>();
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [events, setEvents] = useState<EventData[]>([]);
  const [professionals, setProfessionals] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('upcoming');

  // AI Recommendation States
  const [aiSearchMode, setAiSearchMode] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTags, setAiTags] = useState<RecommendationTags | null>(null);
  const [aiResults, setAiResults] = useState<EventData[]>([]);

  const isProfessionalCategory = ['instructor', 'dj', 'media', 'dj_media'].includes(category || '');

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    setAiLoading(true);
    try {
      const tags = await extractTagsFromInput(aiInput);
      setAiTags(tags);
      const results = await getRecommendations(tags);
      
      const mappedResults = results.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description || '',
        date: e.date,
        end_date: e.end_date,
        category: e.category,
        locationName: e.location_name,
        imageUrl: e.image_url,
        isLesson: false, // Assuming 'parties' for now, can be extended
        likesCount: e.likes_count || 0,
        createdAt: e.created_at,
        metadata: e.metadata || {},
        maxAttendees: e.max_attendees || 0,
      }));

      setAiResults(mappedResults as any);
    } catch (error) {
      console.error('AI Search Error:', error);
    } finally {
      setAiLoading(false);
    }
  };

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
        
        // Auto-apply preferences if enabled
        let matchesPreferences = true;
        if (profile?.preferences?.autoApplied && !searchQuery) {
          const prefs = profile.preferences;
          const genreMatch = !prefs.genres?.length || prefs.genres.some(g => e.title.includes(g) || e.category.includes(g) || (e.description || '').includes(g));
          const regionMatch = !prefs.regions?.length || prefs.regions.some(r => (e.locationName || '').includes(r) || (e as any).formattedAddress?.includes(r));
          matchesPreferences = genreMatch && regionMatch;
        }

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

        return matchesSearch && matchesPreferences && isUpcomingOrOngoing;
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

      <div className={clsx(
        "bg-white dark:bg-slate-900 border rounded-[24px] p-2 flex flex-col gap-3 shadow-sm transition-all mb-12",
        aiSearchMode ? "border-indigo-500/50 ring-4 ring-indigo-500/5" : "border-slate-200 dark:border-slate-800"
      )}>
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative w-full group">
            {aiSearchMode ? (
              <form onSubmit={handleAiSearch} className="flex gap-2 w-full">
                <div className="relative flex-1">
                  <input 
                    type="text" 
                    placeholder="예: 서울 강남에서 이번 주말 살사 파티 추천해줘"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    className="w-full bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-[16px] pl-10 pr-4 py-3 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                  />
                  <BrainCircuit className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-pulse" />
                </div>
                <button 
                  type="submit"
                  disabled={aiLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-[16px] font-black text-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {aiLoading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  분석 및 추천
                </button>
              </form>
            ) : (
              <div className="relative">
                <input 
                  type="text" 
                  placeholder={isProfessionalCategory ? "전문가 이름으로 검색..." : t('search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[16px] pl-10 pr-4 py-3 text-sm outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all font-medium text-slate-700 dark:text-slate-200"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
            )}
          </div>

          <button 
            onClick={() => {
              setAiSearchMode(!aiSearchMode);
              if (aiSearchMode) {
                setAiResults([]);
                setAiTags(null);
                setAiInput('');
              }
            }}
            className={clsx(
              "p-3 rounded-[16px] transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest",
              aiSearchMode 
                ? "bg-rose-50 text-rose-600 dark:bg-rose-950/20" 
                : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 hover:scale-105"
            )}
          >
            {aiSearchMode ? <X className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {aiSearchMode ? "AI 끄기" : "AI 추천 모드"}
          </button>
        </div>

        {aiSearchMode && aiTags && (
          <div className="px-4 pb-2 flex flex-wrap gap-2 items-center border-t border-indigo-50 dark:border-indigo-950/50 pt-3 animate-in fade-in slide-in-from-top-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mr-2">Extracted Tags:</span>
            {Object.entries(aiTags).map(([key, vals]) => 
              (vals as string[]).map(val => (
                <span key={val} className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 rounded-full text-[10px] font-black text-indigo-600 dark:text-indigo-400 shadow-sm flex items-center gap-1">
                  <span className="text-[8px] opacity-40">{key}:</span> {val}
                </span>
              ))
            )}
          </div>
        )}

        {!isProfessionalCategory && !aiSearchMode && (
          <div className="flex bg-slate-50 dark:bg-slate-950 p-1.5 rounded-[16px] border border-slate-100 dark:border-slate-800 w-full overflow-x-auto scrollbar-none">
            {[
              { id: 'upcoming', label: t('search.sort.upcoming'), icon: <Clock className="w-3.5 h-3.5" /> },
              { id: 'latest', label: t('search.sort.latest') },
              { id: 'popular', label: t('search.sort.popular'), icon: <Flame className="w-3.5 h-3.5 text-orange-500" /> }
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSortBy(s.id)}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-[12px] text-xs font-bold transition-all whitespace-nowrap",
                  sortBy === s.id 
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                {s.icon && s.icon}
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-indigo-100 rounded-full animate-pulse" />
            <div className="absolute inset-0 w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
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
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                >
                  <ProfessionalCard professional={pro} index={idx} />
                </motion.div>
              ))
            ) : (
              (aiSearchMode && aiResults.length > 0 ? aiResults : filteredItems as EventData[]).map((event, idx) => (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                >
                  <EventCard event={event} index={idx} />
                </motion.div>
              ))
            )}
          </AnimatePresence>

          {((aiSearchMode && aiResults.length === 0 && !aiLoading) || (!aiSearchMode && filteredItems.length === 0)) && (
            <div className="col-span-full py-32 text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800 transition-colors">
              <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center border border-slate-100 dark:border-slate-700 mx-auto mb-8 shadow-sm">
                {isProfessionalCategory ? <Users className="h-10 w-10 text-slate-300" /> : <CalendarDays className="h-10 w-10 text-slate-300" />}
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">
                {aiSearchMode ? "AI가 검색 중입니다..." : "등록된 내역이 없습니다."}
              </h3>
              <p className="text-slate-400 max-w-xs mx-auto font-medium">
                {aiSearchMode 
                  ? "준비되셨나요? 자연스러운 문장으로 댄스 이벤트를 찾아보세요!"
                  : isProfessionalCategory 
                    ? '협회 및 주최진이 곧 새로운 전문가를 등록할 예정입니다.' 
                    : t(`search.category.${category}`) + ' 카테고리에 활성화된 항목이 없습니다.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
