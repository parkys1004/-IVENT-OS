import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, MapPin, Users, CalendarDays, Clock, Flame, Ticket, Heart, MessageSquare, 
  Settings, ChevronRight, Lock, ArrowUpDown, Camera, User, Plus, BarChart3, 
  Award, Trophy, Zap, LayoutGrid, List, QrCode, TrendingUp, Archive, Gift, Compass,
  CheckCircle2, AlertCircle, Info, Star, Music, Filter, Sparkles
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import EventCard, { EventData } from '../components/EventCard';
import ProfessionalCard from '../components/ProfessionalCard';
import { UserProfile } from '../context/AuthContext';
import { handleSupabaseError, OperationType } from '../lib/supabaseError';

interface PromoBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
}

type MenuKey = 'bookings' | 'records' | 'find' | 'favorites' | 'community' | 'rewards' | 'settings' | 'tickets';
type TabKey = string;

export default function ParticipantDashboard({ forceMarketplace = false }: { forceMarketplace?: boolean }) {
  const navigate = useNavigate();
  const { profile, user, refreshProfile } = useAuth();
  const { t, categoryFilter, setCategoryFilter } = useLanguage();
  const [events, setEvents] = useState<EventData[]>([]);
  const [professionals, setProfessionals] = useState<UserProfile[]>([]);
  const [promoBanners, setPromoBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilterLocal] = useState(categoryFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('upcoming');

  const setFilter = (f: string) => {
    setFilterLocal(f);
    setCategoryFilter(f);
  };

  useEffect(() => {
    setFilterLocal(categoryFilter);
  }, [categoryFilter]);

  const [activeMenu, setActiveMenu] = useState<MenuKey>('bookings');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showQR, setShowQR] = useState<string | null>(null);
  
  // Gamification Metrics
  const [points] = useState(1250);
  const [rankPercentile] = useState(15);
  const [monthlyGoal] = useState(10);
  const [currentMonthVisits] = useState(7);

  const [dashboardConfig, setDashboardConfig] = useState({
    partiesLimit: 9,
    lessonsLimit: 6,
    instructorsLimit: 6,
    djMediaLimit: 6,
    sectionOrder: ['parties', 'lessons', 'instructors', 'djMedia']
  });

  const [registrations, setRegistrations] = useState<{id: string, event: EventData, status: string, registeredAt: any}[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    phone: '',
    photoURL: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const profilePictureInputRef = useRef<HTMLInputElement>(null);

  const resizeAndCompressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
          } else {
            if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/webp', 0.8));
        };
        img.onerror = error => reject(error);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await resizeAndCompressImage(file);
        setProfileForm(prev => ({ ...prev, photoURL: base64 }));
      } catch (error) {
        console.error("Image processing failed:", error);
      }
    }
  };

  useEffect(() => {
    if (profile) {
      setProfileForm({
        displayName: profile.displayName || '',
        phone: (profile as any).phone || '',
        photoURL: profile.photoURL || ''
      });
    }
  }, [profile]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: profileForm.displayName,
          phone: profileForm.phone,
          photo_url: profileForm.photoURL
        })
        .eq('id', user.id);

      if (error) throw error;
      await refreshProfile();
      alert('프로필이 저장되었습니다.');
    } catch (error) {
      console.error(error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // Slider State
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isSliderPaused, setIsSliderPaused] = useState(false);

  const handleMenuClick = (menu: MenuKey) => {
    setActiveMenu(menu);
    setActiveTab('all');
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Events
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('status', 'published')
          // .eq('is_lesson', false) // Optional: filter out lessons from events if we move them all
          .order('date', { ascending: true })
          .limit(60);

        if (eventsError) throw eventsError;

        // 1.1 Fetch Classes (Lessons)
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('*')
          .order('start_date', { ascending: true })
          .limit(40);

        if (classesError) {
          console.warn("Classes table might not exist or has errors:", classesError);
        }

        // Fetch registration counts for these items
        const allEventIds = [...(eventsData?.map(e => e.id) || []), ...(classesData?.map(c => c.id) || [])];
        
        const { data: allRegs } = await supabase
          .from('registrations')
          .select('event_id')
          .in('event_id', allEventIds);

        const regCounts: Record<string, number> = {};
        allRegs?.forEach(r => {
          regCounts[r.event_id] = (regCounts[r.event_id] || 0) + 1;
        });
        
        const mappedEvents = eventsData.map(e => ({
          id: e.id,
          title: e.title,
          description: e.description,
          date: e.date,
          end_date: e.end_date,
          category: e.category,
          locationName: e.location_name,
          status: e.status,
          price: e.price,
          maxAttendees: (e.metadata as any)?.maxAttendees || e.max_attendees || (e as any).capacity || 0,
          currentAttendees: regCounts[e.id] || 0,
          hostId: e.host_id,
          imageUrl: e.image_url,
          isBanner: e.is_banner,
          isLesson: e.is_lesson,
          priority: e.priority,
          likesCount: e.likes_count,
          createdAt: e.created_at,
          metadata: e.metadata || {}
        }));

        const mappedClasses = (classesData || []).map(c => ({
          id: c.id,
          title: c.title,
          description: '', // Missing in schema
          date: c.start_date,
          end_date: c.end_date,
          category: c.category || 'lesson',
          locationName: c.location_name,
          status: 'published', // Assume published
          price: c.price,
          maxAttendees: 50, // Default since missing in schema
          currentAttendees: regCounts[c.id] || 0,
          hostId: c.instructor_id,
          imageUrl: '', // Missing in schema
          isBanner: false,
          isLesson: true,
          priority: 0,
          likesCount: 0,
          createdAt: c.created_at,
          metadata: {
            level: c.level,
            classTime: c.class_time,
            address: c.address,
            geoPoint: { lat: c.lat, lng: c.lng }
          }
        }));
        
        setEvents([...mappedEvents, ...mappedClasses] as unknown as EventData[]);

        // 2. Fetch Professionals
        const { data: proData, error: proError } = await supabase
          .from('profiles')
          .select(`
            *,
            instructors(*),
            djs(*),
            creators(*)
          `)
          .in('role', ['instructor', 'dj', 'media'])
          .order('priority', { ascending: false })
          .limit(20);

        if (proError) throw proError;
        const mappedPros = proData.map(p => {
          let specialized = null;
          if (p.role === 'instructor') specialized = p.instructors?.[0];
          else if (p.role === 'dj') specialized = p.djs?.[0];
          else if (p.role === 'media') specialized = p.creators?.[0];

          return {
            uid: p.id,
            email: p.email,
            displayName: p.display_name,
            photoURL: p.photo_url,
            role: p.role,
            createdAt: p.created_at,
            points: p.points,
            followersCount: p.followers_count || 0,
            specialties: p.specialties,
            specialized: specialized
          } as any;
        });
        setProfessionals(mappedPros);

        // 3. Fetch Banners
        const { data: bannerData, error: bannerError } = await supabase
          .from('promo_banners')
          .select('*')
          .eq('is_active', true);

        if (bannerError) throw bannerError;
        const mappedBanners = bannerData.map(b => ({
          id: b.id,
          imageUrl: b.image_url,
          linkUrl: b.link_url,
          isActive: b.is_active
        }));
        setPromoBanners(mappedBanners);

        // 4. Fetch Config
        const { data: configData } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'dashboard')
          .maybeSingle();
        
        if (configData) setDashboardConfig(prev => ({ ...prev, ...configData.value }));

      } catch (error: any) {
        setFetchError(error.message || '데이터를 불러오는 중 오류가 발생했습니다.');
        handleSupabaseError(error, OperationType.LIST, 'events');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (user && activeMenu === 'bookings') {
      const fetchRegs = async () => {
        setLoadingRegistrations(true);
        try {
          const { data, error } = await supabase
            .from('registrations')
            .select(`
              id,
              status,
              registered_at,
              event:events(*)
            `)
            .eq('user_id', user.id);

          if (error) throw error;
          
          const mappedRegs = data.map((r: any) => ({
            id: r.id,
            status: r.status,
            registeredAt: r.registered_at,
            event: {
              id: r.event.id,
              title: r.event.title,
              category: r.event.category,
              imageUrl: r.event.image_url,
              date: r.event.date,
              locationName: r.event.location_name
            } as unknown as EventData
          }));

          setRegistrations(mappedRegs);
        } catch (error) {
          handleSupabaseError(error, OperationType.LIST, 'registrations');
        } finally {
          setLoadingRegistrations(false);
        }
      };
      fetchRegs();
    }
  }, [user, activeMenu]);

  const getTime = (val: any) => {
    if (!val) return 0;
    try {
      // Defensive check for Firebase Timestamp or similar structures
      let d: Date;
      if (val && typeof val.toDate === 'function') {
        d = val.toDate();
      } else {
        d = new Date(val);
      }
      return isNaN(d.getTime()) ? 0 : d.getTime();
    } catch (e) {
      return 0;
    }
  };

  const filteredEvents = events.filter(e => {
    // Robust category equality check with null safety
    const eventCategory = e.category?.toLowerCase() || '';
    const currentFilter = filter?.toLowerCase() || 'all';

    // Note: for categorized sections like 'parties' and 'lessons', 
    // we want all events that match search and date, regardless of the top-level category filter.
    // However, for the main "Search & Discover" area (if we were using one), we'd use matchesCategory.
    
    const matchesSearch = searchQuery === '' || 
      e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.locationName && e.locationName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter out past events (expired) from the discovery list
    const now = new Date().getTime();
    const eventTime = getTime(e.date);
    const meta = (e as any).metadata || {};
    const endDateStr = meta.endDate || (e as any).end_date;
    const endTime = endDateStr ? getTime(endDateStr) : eventTime + (4 * 60 * 60 * 1000);
    
    // An event is relevant if it hasn't ended yet
    const isUpcomingOrOngoing = endTime > now;

    return matchesSearch && isUpcomingOrOngoing;
  }).sort((a, b) => {
    // 1. Primary Sort logic based on selected sortBy
    let comparison = 0;

    if (sortBy === 'upcoming') {
      const timeA = getTime(a.date);
      const timeB = getTime(b.date);
      comparison = timeA - timeB;
    } else if (sortBy === 'latest') {
      const timeA = getTime(a.createdAt);
      const timeB = getTime(b.createdAt);
      comparison = timeB - timeA;
    } else if (sortBy === 'popular') {
      comparison = (b.likesCount || 0) - (a.likesCount || 0);
    }

    if (comparison !== 0) return comparison;

    // 2. Secondary Sort: Priority (Featured/Pinned items higher among ties)
    const priorityA = (a as any).priority || 0;
    const priorityB = (b as any).priority || 0;
    if (priorityA !== priorityB) return priorityB - priorityA;

    return 0;
  });
  
  // Banner logic: Prefer isBanner=true, up to 5. Fallback to earliest upcoming if none.
  const bannerEvents = events.filter(e => e.isBanner).sort((a, b) => ((b as any).priority || 0) - ((a as any).priority || 0)).slice(0, 5);
  const displayBanners = bannerEvents.length > 0 ? bannerEvents : filteredEvents.slice(0, 1);
  const others = filteredEvents.filter(e => !displayBanners.find(b => b.id === e.id));

  // Grouping for categorized grids - Apply priority sorting to professors too
  const sortedProfessionals = [...professionals].sort((a, b) => ((b as any).priority || 0) - ((a as any).priority || 0));

  const parties = others.filter(e => {
    const isActuallyParty = !e.isLesson;
    const matchesCategoryFilter = filter === 'all' || filter === 'party' || e.category === filter;
    return isActuallyParty && matchesCategoryFilter;
  }).slice(0, dashboardConfig.partiesLimit || 9);

  const lessons = others.filter(e => {
    const isActuallyLesson = e.isLesson;
    const matchesCategoryFilter = filter === 'all' || filter === 'lesson' || e.category === filter;
    return isActuallyLesson && matchesCategoryFilter;
  }).slice(0, dashboardConfig.lessonsLimit || 6);
  const instructors = sortedProfessionals.filter(u => u.role === 'instructor').slice(0, dashboardConfig.instructorsLimit || 6);
  const djAndMedia = sortedProfessionals.filter(u => ['dj', 'media'].includes(u.role)).slice(0, dashboardConfig.djMediaLimit || 6);

  // Slider Auto-play Logic
  useEffect(() => {
    if (displayBanners.length <= 1 || isSliderPaused) return;

    const timer = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % displayBanners.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [displayBanners.length, isSliderPaused]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20 min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-slate-400 font-medium animate-pulse">정보를 불러오고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center min-h-[400px]">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mb-6 text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">데이터를 불러오지 못했습니다</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8 leading-relaxed">
          {fetchError.includes('Failed to fetch') 
            ? '서버와의 연결이 원활하지 않습니다. 인터넷 연결이나 Supabase 설정을 확인해 주세요.' 
            : fetchError}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
        >
          다시 시도하기
        </button>
        {import.meta.env.VITE_SUPABASE_URL?.includes('placeholder') && (
          <p className="mt-4 text-[10px] text-rose-500 font-mono">Warning: Using placeholder Supabase URL</p>
        )}
      </div>
    );
  }

  // --- Sub-contents ---

  const renderFindContent = () => (
    <div className={clsx("space-y-12 flex flex-col pb-20 w-full", (profile && !forceMarketplace) ? "h-full overflow-y-auto pr-2 no-scrollbar" : "")}>
      {/* Hero / Banner Area */}
      <section className="grid grid-cols-1 lg:grid-cols-[2.5fr_1fr] 2xl:grid-cols-[3fr_1fr] gap-8 xl:gap-10 shrink-0 lg:h-[400px] xl:h-[460px]">
        <div 
          className="flex flex-col h-[300px] lg:h-full overflow-hidden group/slider relative"
          onMouseEnter={() => setIsSliderPaused(true)}
          onMouseLeave={() => setIsSliderPaused(false)}
        >
          {displayBanners.length > 0 ? (
            <div className="relative w-full h-full overflow-hidden rounded-[24px]">
              {displayBanners.map((event, idx) => (
                <div 
                  key={event.id} 
                  className={clsx(
                    "absolute inset-0 transition-opacity duration-1000 ease-in-out",
                    idx === currentBannerIndex ? "opacity-100 z-10" : "opacity-0 z-0"
                  )}
                >
                  <EventCard event={event} featured={true} index={idx} />
                </div>
              ))}
              
              {displayBanners.length > 1 && (
                 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-20 px-4 py-2 bg-black/10 backdrop-blur-md rounded-full border border-white/10 group-hover/slider:bg-black/30 transition-all">
                    {displayBanners.map((_, i) => (
                      <button 
                        key={i} 
                        onClick={() => setCurrentBannerIndex(i)}
                        className={clsx(
                          "w-2.5 h-2.5 rounded-full transition-all duration-300",
                          i === currentBannerIndex ? "bg-white scale-125" : "bg-white/40"
                        )}
                      />
                    ))}
                 </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 flex items-center justify-center">
              현재 등록된 배너 행사가 없습니다.
            </div>
          )}
        </div>
        
        <div className="flex flex-col h-full gap-4 xl:gap-6 min-h-[300px] lg:min-h-0">
          {promoBanners.find(b => b.id === 'sidebar1') ? (
            <a 
              href={promoBanners.find(b => b.id === 'sidebar1')?.linkUrl || '#'} 
              target={promoBanners.find(b => b.id === 'sidebar1')?.linkUrl?.startsWith('http') ? "_blank" : "_self"}
              rel="noreferrer"
              className="relative flex-1 overflow-hidden rounded-[2rem] shadow-xl group cursor-pointer min-h-[140px]"
            >
              <img 
                src={promoBanners.find(b => b.id === 'sidebar1')?.imageUrl} 
                alt="Promotion 1" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
            </a>
          ) : (
            <div className="bg-indigo-600 dark:bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden flex-1 shadow-xl flex items-center justify-center min-h-[140px]">
              <div className="text-center">
                <Zap className="w-8 h-8 text-indigo-200 mb-2 mx-auto opacity-50" />
                <p className="text-xs font-black uppercase tracking-widest opacity-40">Side Ad 1</p>
              </div>
            </div>
          )}

          {promoBanners.find(b => b.id === 'sidebar2') ? (
            <a 
              href={promoBanners.find(b => b.id === 'sidebar2')?.linkUrl || '#'} 
              target={promoBanners.find(b => b.id === 'sidebar2')?.linkUrl?.startsWith('http') ? "_blank" : "_self"}
              rel="noreferrer"
              className="relative flex-1 overflow-hidden rounded-[2rem] shadow-xl group cursor-pointer min-h-[140px]"
            >
              <img 
                src={promoBanners.find(b => b.id === 'sidebar2')?.imageUrl} 
                alt="Promotion 2" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
            </a>
          ) : (
            <div className="bg-slate-800 dark:bg-slate-950 rounded-[2rem] p-8 text-white relative overflow-hidden flex-1 shadow-xl flex items-center justify-center min-h-[140px]">
               <div className="text-center">
                <Music className="w-8 h-8 text-slate-400 mb-2 mx-auto opacity-50" />
                <p className="text-xs font-black uppercase tracking-widest opacity-40">Side Ad 2</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Search & Sort Enhanced Bar */}
      <div className="px-2">
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-4 lg:p-6 shadow-sm flex flex-col xl:flex-row items-center gap-6">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              type="text" 
              placeholder="지역, 참여자, 행사명으로 검색하세요..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-transparent focus:border-indigo-100 dark:focus:border-indigo-900/30 rounded-[1.5rem] pl-16 pr-8 py-5 text-base focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-slate-400 font-bold"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 hover:text-rose-500 underline"
              >
                CLEAR
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3 shrink-0 w-full xl:w-auto overflow-x-auto no-scrollbar pb-1 xl:pb-0">
            <div className="flex items-center gap-2 mr-2 text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">
              <Filter className="w-3 h-3" />
              Sort BY:
            </div>
            {[
              { id: 'upcoming', label: '가까운 날짜순', icon: CalendarDays },
              { id: 'latest', label: '최신 등록순', icon: Sparkles },
              { id: 'popular', label: '인기순', icon: TrendingUp },
            ].map((option) => {
              const Icon = option.icon;
              const isActive = sortBy === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setSortBy(option.id)}
                  className={clsx(
                    "flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[14px] font-black tracking-tight whitespace-nowrap transition-all border shrink-0 active:scale-95",
                    isActive 
                      ? "bg-slate-900 dark:bg-indigo-600 border-slate-900 dark:border-indigo-600 text-white shadow-xl shadow-indigo-500/10" 
                      : "bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-indigo-300 dark:hover:border-indigo-900 hover:text-slate-800 dark:hover:text-white"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Events Grid - Restored Categorized Sections */}
      <div className="space-y-16">
        {dashboardConfig.sectionOrder.map((sectionKey) => {
          if (sectionKey === 'parties') {
            if (parties.length === 0) return null;
            return (
              <section key="parties" className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">HOT 파티 & 이벤트</h3>
                  </div>
                  <button onClick={() => navigate('/explore/party')} className="text-xs font-bold text-slate-400 hover:text-orange-500 transition-colors uppercase tracking-wider flex items-center gap-1 group">
                    {t('ui.viewAll')}
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
                  {parties.map((event, idx) => (
                    <EventCard key={event.id} event={event} index={idx} />
                  ))}
                </div>
              </section>
            );
          }
          if (sectionKey === 'lessons') {
            if (lessons.length === 0) return null;
            return (
              <section key="lessons" className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" />
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">BEST 댄스 강습</h3>
                  </div>
                  <button onClick={() => navigate('/explore/lesson')} className="text-xs font-bold text-slate-400 hover:text-amber-500 transition-colors uppercase tracking-wider flex items-center gap-1 group">
                    {t('ui.viewAll')}
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
                  {lessons.map((event, idx) => (
                    <EventCard key={event.id} event={event} index={idx} />
                  ))}
                </div>
              </section>
            );
          }
          if (sectionKey === 'instructors') {
            if (instructors.length === 0) return null;
            return (
              <section key="instructors" className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">전문 강사</h3>
                  </div>
                  <button onClick={() => navigate('/explore/instructor')} className="text-xs font-bold text-slate-400 hover:text-indigo-500 transition-colors uppercase tracking-wider flex items-center gap-1 group">
                    {t('ui.viewAll')}
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {instructors.map((pro, idx) => (
                    <ProfessionalCard key={pro.uid} professional={pro} index={idx} />
                  ))}
                </div>
              </section>
            );
          }
          if (sectionKey === 'djMedia') {
            if (djAndMedia.length === 0) return null;
            return (
              <section key="djMedia" className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Music className="w-5 h-5 text-fuchsia-500" />
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">DJ & 미디어</h3>
                  </div>
                  <button onClick={() => navigate('/explore/dj_media')} className="text-xs font-bold text-slate-400 hover:text-fuchsia-500 transition-colors uppercase tracking-wider flex items-center gap-1 group">
                    {t('ui.viewAll')}
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {djAndMedia.map((pro, idx) => (
                    <ProfessionalCard key={pro.uid} professional={pro} index={idx} />
                  ))}
                </div>
              </section>
            );
          }
          return null;
        })}
      </div>
    </div>
  );

  const renderTicketsContent = () => (
    <div className="space-y-8 flex flex-col h-full overflow-y-auto no-scrollbar pb-20 px-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 shadow-sm">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center">
                 <Flame className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white">활동 통계 요약</h3>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl">
                 <p className="text-slate-400 text-[10px] font-black uppercase mb-1">Total Bookings</p>
                 <p className="text-2xl font-black text-slate-800 dark:text-white">{registrations.length}건</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl">
                 <p className="text-slate-400 text-[10px] font-black uppercase mb-1">Total Visits</p>
                 <p className="text-2xl font-black text-slate-800 dark:text-white">{currentMonthVisits}회</p>
              </div>
           </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 shadow-sm flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8" />
           </div>
           <p className="text-slate-500 font-bold mb-4">상세 통계 분석 리포트가<br />정기적으로 생성됩니다.</p>
           <button className="px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full text-[11px] font-black uppercase">준비 중</button>
        </div>
      </div>
    </div>
  );

  const renderFavoritesContent = () => (
    <div className="space-y-6 flex flex-col h-full pb-20">
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <button onClick={() => setActiveTab('all')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'all' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          찜한 행사
        </button>
        <button onClick={() => setActiveTab('following')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'following' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          팔로잉 (DJ/강사)
        </button>
      </div>
      <div className="bg-white dark:bg-slate-900 mx-auto w-full rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex-1 flex flex-col p-12 text-center text-slate-500 items-center justify-center">
         <Heart className="w-12 h-12 mb-4 text-slate-300" />
         <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">관심 목록이 비어있습니다</h3>
         <p className="font-bold text-slate-500 mb-6">마음에 드는 행사나 아티스트를 팔로우하면 여기에 표시됩니다.</p>
         <button onClick={() => handleMenuClick('find')} className="px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-black transition-colors shadow-lg shadow-indigo-200">행사 둘러보기</button>
      </div>
    </div>
  );

  const renderCommunityContent = () => (
    <div className="space-y-6 flex flex-col h-full pb-20">
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <button onClick={() => setActiveTab('all')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'all' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          내가 쓴 글
        </button>
        <button onClick={() => setActiveTab('comments')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'comments' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          댓글 단 글
        </button>
        <button onClick={() => setActiveTab('messages')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'messages' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          쪽지함
        </button>
      </div>
      <div className="bg-white dark:bg-slate-900 mx-auto w-full rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex-1 flex flex-col p-12 text-center text-slate-500 items-center justify-center">
         <MessageSquare className="w-12 h-12 mb-4 text-slate-300" />
         <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">활동 내역이 없습니다</h3>
         <p className="font-bold text-slate-500 mb-6">커뮤니티에서 다른 댄서들과 소통을 시작해보세요!</p>
         <button className="px-6 py-3 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition-colors shadow-lg">커뮤니티 바로가기</button>
      </div>
    </div>
  );

  const renderSettingsContent = () => (
    <div className="space-y-6 flex flex-col h-full pb-20">
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <button onClick={() => setActiveTab('all')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'all' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          개인정보
        </button>
        <button onClick={() => setActiveTab('notifications')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'notifications' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          알림 설정
        </button>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 flex-1">
          <div className="max-w-xl">
             <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6">사용자 프로필 설정</h3>
             
             <form onSubmit={handleProfileSubmit} className="space-y-4">
               <div className="flex flex-col items-center gap-4 mb-8">
                 <div className="relative group/avatar cursor-pointer" onClick={() => profilePictureInputRef.current?.click()}>
                   <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl group-hover/avatar:opacity-80 transition-opacity">
                     {profileForm.photoURL ? (
                       <img src={profileForm.photoURL} alt="Profile" className="w-full h-full object-cover" />
                     ) : (
                       <User className="w-12 h-12 text-slate-300" />
                     )}
                   </div>
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                      <Camera className="w-8 h-8 text-white drop-shadow-md" />
                   </div>
                   <div className="absolute -bottom-1 -right-1 bg-slate-800 text-white p-2 rounded-full shadow-lg border-2 border-white">
                     <Plus className="w-4 h-4" />
                   </div>
                 </div>
                 <input 
                   type="file" 
                   ref={profilePictureInputRef} 
                   onChange={handleProfilePictureChange} 
                   accept="image/*" 
                   className="hidden" 
                 />
                 <p className="text-[11px] font-bold text-slate-400">클릭하여 프로필 사진 변경</p>
               </div>

               <div>
                 <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">닉네임</label>
                 <input 
                   type="text" 
                   className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3" 
                   value={profileForm.displayName} 
                   onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                 />
               </div>
               <div>
                 <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">연락처</label>
                 <input 
                    type="text" 
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3" 
                    placeholder="예: 010-0000-0000" 
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                 />
                 <p className="text-xs text-slate-500 mt-1">예매 정보 안내 시 사용될 기본 연락처입니다.</p>
               </div>
               
               <button 
                 type="submit"
                 disabled={isSaving}
                 className="mt-8 px-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 w-full sm:w-auto disabled:opacity-50"
               >
                 {isSaving ? '저장 중...' : '변경사항 저장하기'}
               </button>
             </form>
          </div>
      </div>
    </div>
  );

  const renderRecordsContent = () => (
    <div className="space-y-6 flex flex-col h-full items-center justify-center text-center p-10">
      <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-3xl flex items-center justify-center mb-6">
        <Archive className="w-10 h-10" />
      </div>
      <h2 className="text-2xl font-black text-slate-800 dark:text-white">내 댄스 기록</h2>
      <p className="text-slate-500 max-w-sm font-bold">
        다녀온 파티의 소중한 추억을 사진과 메모로 남겨보세요.<br/>
        나만의 댄스 아카이브가 곧 찾아옵니다!
      </p>
      <div className="mt-8 px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full text-xs font-bold uppercase tracking-widest">
        Coming Soon
      </div>
    </div>
  );

  const renderRewardsContent = () => (
    <div className="space-y-8 flex flex-col h-full pb-20 overflow-y-auto no-scrollbar">
      <div className="bg-gradient-to-br from-orange-500 to-amber-400 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-orange-500/20">
        <div className="absolute top-0 right-0 p-10 opacity-10">
          <Gift className="w-48 h-48 -rotate-12" />
        </div>
        <div className="relative z-10">
          <p className="text-orange-100 text-sm font-black uppercase tracking-widest mb-2">Member Rewards</p>
          <h2 className="text-4xl font-black mb-6">즐거운 댄스 생활을 위한<br />특별한 혜택</h2>
          <div className="flex items-center gap-4">
            <div className="px-6 py-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 text-center">
              <p className="text-[10px] font-black uppercase opacity-80 mb-1">Available Points</p>
              <p className="text-2xl font-black">{points.toLocaleString()}</p>
            </div>
            <div className="px-6 py-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 text-center">
              <p className="text-[10px] font-black uppercase opacity-80 mb-1">Active Coupons</p>
              <p className="text-2xl font-black">2장</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <Zap className="w-5 h-5 text-amber-500 fill-current" />
          <h3 className="text-xl font-black text-slate-800 dark:text-white">사용 가능한 쿠폰</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex items-center justify-between group hover:border-indigo-500 transition-colors">
            <div className="space-y-1">
              <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-lg uppercase">Welcome</span>
              <p className="text-lg font-black text-slate-800 dark:text-white">첫 예매 3,000원 할인권</p>
              <p className="text-xs text-slate-500 font-bold">有効期限: 2026.05.31</p>
            </div>
            <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black shadow-lg">다운로드</button>
          </div>
          <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex items-center justify-between opacity-50 grayscale">
            <div className="space-y-1">
              <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg uppercase">Expired</span>
              <p className="text-lg font-black text-slate-800 dark:text-white">봄 맞이 이벤트 할인권</p>
              <p className="text-xs text-slate-500 font-bold">有効期限: 2026.03.31</p>
            </div>
            <span className="text-xs font-black text-slate-400">만료됨</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBookingsContent = () => {
    const nextEvent = registrations
      .filter(r => r.status === 'confirmed' && r.event?.date)
      .sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime())[0];

    return (
      <div className="space-y-8 flex flex-col h-full pb-20 overflow-y-auto no-scrollbar">
        {/* --- Summary Header --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
          {/* Monthly Progress Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-400 text-[11px] font-black uppercase tracking-wider mb-1">Monthly Goal</p>
                <h4 className="text-xl font-black text-slate-800 dark:text-white">이번 달 활동 목표</h4>
              </div>
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-2xl font-black text-slate-800 dark:text-white">{currentMonthVisits} <span className="text-sm text-slate-500">/ {monthlyGoal}회</span></span>
                <span className="text-indigo-600 dark:text-amber-400 font-bold text-sm">{Math.round((currentMonthVisits / monthlyGoal) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentMonthVisits / monthlyGoal) * 100}%` }}
                  className="h-full bg-indigo-600 dark:bg-amber-400 rounded-full"
                />
              </div>
              <p className="text-[11px] text-slate-500 font-bold mt-3 italic">목표 달성까지 {monthlyGoal - currentMonthVisits}회 남았습니다! 🔥</p>
            </div>
          </div>

          {/* Points & Rank Card */}
          <div className="bg-indigo-600 dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-indigo-500/10 border border-indigo-500/10 dark:border-slate-800 flex flex-col justify-between text-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-indigo-200 dark:text-slate-400 text-[11px] font-black uppercase tracking-wider mb-1">Activity Reward</p>
                <h4 className="text-xl font-black">댄스 활동 점수</h4>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="space-y-1">
                <p className="text-3xl font-black tracking-tighter">{points.toLocaleString()} <span className="text-sm font-bold opacity-80">Point</span></p>
                <p className="text-indigo-100 dark:text-amber-400 font-bold text-sm">현재 커뮤니티 상위 {rankPercentile}%</p>
              </div>
              <div className="mt-4 flex gap-2">
                 <div className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black border border-white/10 uppercase">Level. Pro</div>
                 <div className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black border border-white/10 uppercase">Bachata Master</div>
              </div>
            </div>
          </div>

          {/* Quick Banner / D-Day Card */}
          {nextEvent ? (
            <div className="bg-amber-100 dark:bg-amber-900/20 rounded-3xl p-6 shadow-sm border border-amber-200 dark:border-amber-900/30 flex flex-col justify-between overflow-hidden relative group">
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-amber-200 dark:bg-amber-800/20 rounded-full blur-3xl opacity-50 group-hover:scale-125 transition-transform" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <p className="text-amber-700 dark:text-amber-400 text-[11px] font-black uppercase tracking-wider mb-1">Upcoming Event</p>
                  <h4 className="text-xl font-black text-amber-900 dark:text-amber-100">가장 가까운 행사</h4>
                </div>
                <div className="px-3 py-1 bg-amber-900 text-white rounded-lg text-[11px] font-black shadow-lg">D-Day</div>
              </div>
              <div className="relative z-10">
                <h5 className="font-black text-slate-800 dark:text-white text-lg line-clamp-1 mb-1">{nextEvent.event.title}</h5>
                <p className="text-amber-800/70 dark:text-amber-400/70 text-sm font-bold flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4" /> 
                  {format(new Date(nextEvent.event.date), 'M월 d일 (eee) a h:mm', { locale: ko })}
                </p>
                <Link to={`/event/${nextEvent.event.id}`} className="mt-4 block w-full py-2.5 bg-amber-900 text-white text-center font-black rounded-xl text-xs hover:bg-black transition-colors">
                  입장권 확인하기
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-slate-100 dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center opacity-60">
              <CalendarDays className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm font-bold text-slate-500">예정된 행사가 없습니다.<br/>새로운 행사를 찾아보세요!</p>
            </div>
          )}
        </div>

        {/* --- Main Content Title & View Toggle --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">예매/이용 내역</h2>
            <p className="text-slate-500 text-sm font-bold">참여 예정 및 완료된 행사 목록입니다.</p>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit">
            <button 
              onClick={() => setViewMode('list')}
              className={clsx("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all", viewMode === 'list' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-800")}
            >
              <List className="w-4 h-4" /> 리스트
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={clsx("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all", viewMode === 'calendar' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-800")}
            >
              <LayoutGrid className="w-4 h-4" /> 캘린더
            </button>
          </div>
        </div>

        {loadingRegistrations ? (
          <div className="flex-1 flex items-center justify-center p-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : registrations.length > 0 ? (
          viewMode === 'list' ? (
            <div className="flex flex-col gap-4">
              {registrations.map((reg) => (
                <div key={reg.id} className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-4 transition-all hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none group relative overflow-hidden">
                  <div className="w-full md:w-24 h-24 rounded-2xl overflow-hidden shrink-0">
                    <img src={reg.event.imageUrl || 'https://picsum.photos/seed/dance/300/300'} alt={reg.event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={clsx(
                          "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight",
                          reg.status === 'confirmed' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                        )}>
                          {reg.status === 'confirmed' ? '예매 완료' : '취소됨'}
                        </span>
                        <p className="text-[11px] font-bold text-slate-400">예매일: {reg.registeredAt ? format(new Date(reg.registeredAt), 'MM.dd') : '04.21'}</p>
                      </div>
                      <h3 className="text-lg font-black text-slate-800 dark:text-white truncate pr-10">{reg.event.title}</h3>
                      <div className="flex items-center gap-3 text-slate-500 text-xs font-bold">
                        <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> {format(new Date(reg.event.date), 'M월 d일 (eee)', { locale: ko })}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {reg.event.locationName}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                       <button 
                        onClick={() => setShowQR(reg.id)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-900 rounded-2xl text-xs font-black hover:bg-indigo-600 transition-colors shadow-lg shadow-slate-900/10"
                       >
                         <QrCode className="w-4 h-4" /> 퀵 패스
                       </button>
                       <Link 
                        to={`/event/${reg.event.id}`}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white rounded-2xl text-xs font-black hover:bg-slate-200 transition-colors"
                       >
                         상세 보기
                       </Link>
                    </div>
                  </div>

                  {/* QR Layer Overlay */}
                  <AnimatePresence>
                    {showQR === reg.id && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 z-30 flex flex-col items-center justify-center p-4"
                      >
                         <button onClick={() => setShowQR(null)} className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                           <Plus className="w-5 h-5 rotate-45" />
                         </button>
                         <div className="bg-white p-4 rounded-3xl shadow-2xl mb-4">
                           <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${reg.id}`} alt="QR Code" className="w-32 h-32" />
                         </div>
                         <p className="text-xs font-black text-slate-800 dark:text-white mb-1">전자 입장권 (QR)</p>
                         <p className="text-[10px] text-slate-500 font-bold">행사 입장 시 스태프에게 제시해주세요.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-100 dark:border-slate-800 flex items-center justify-center h-96">
              <div className="text-center">
                 <CalendarDays className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                 <p className="text-slate-400 font-bold">캘린더 뷰는 더 넓은 화면에서 최적화됩니다.</p>
                 <p className="text-xs text-slate-400 mt-2">준비 중인 기능입니다.</p>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-10">
            {/* Improved Empty State */}
            <div className="bg-white dark:bg-slate-900 mx-auto w-full rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col p-16 text-center text-slate-500 items-center justify-center relative">
               <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden">
                  <div className="grid grid-cols-6 gap-8 rotate-12 -translate-y-20">
                     {Array.from({length: 30}).map((_, i) => (
                       <Zap key={i} className="w-12 h-12" />
                     ))}
                  </div>
               </div>
               <div className="w-24 h-24 bg-orange-50 dark:bg-orange-900/30 text-orange-500 rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-xl shadow-orange-500/10">
                  <Flame className="w-12 h-12" />
               </div>
               <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-3">첫 번째 스텝을 밟아보세요!</h3>
               <p className="max-w-xs mx-auto text-slate-500 font-bold leading-relaxed mb-8">
                  아직 예약된 행사가 없네요.<br/>
                  회원님의 댄스 열정을 깨울 환상적인 이벤트가 기다리고 있습니다.
               </p>
               <button onClick={() => handleMenuClick('find')} className="bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-900 px-8 py-4 rounded-2xl font-black text-lg hover:scale-105 transition-transform shadow-xl shadow-slate-900/20 dark:shadow-none">
                 전체 행사 둘러보기
               </button>
            </div>

            {/* Smart Recommendations */}
            <div className="space-y-6">
               <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Star className="w-5 h-5 fill-current" />
                   </div>
                   <h3 className="text-xl font-black text-slate-800 dark:text-white">회원님이 좋아하실 만한 추천 행사</h3>
                 </div>
                 <button onClick={() => navigate('/explore/party')} className="text-xs font-bold text-slate-400 hover:text-indigo-500 transition-colors uppercase tracking-wider flex items-center gap-1 group">
                   {t('ui.viewAll')}
                   <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                 </button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {events.slice(0, 3).map((event, idx) => (
                   <EventCard key={event.id} event={event} index={idx} />
                 ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!profile || forceMarketplace) {
    return (
      <div className="w-full max-w-screen-2xl mx-auto px-6 sm:px-8 lg:px-12 xl:px-16 py-8 lg:py-16">
        {renderFindContent()}
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden glass-panel h-full w-full min-h-0 transition-colors">
      
      {/* LNB (Left Navigation Bar) */}
      <div className="w-64 bg-white/20 dark:bg-slate-900/20 border-r border-slate-200/30 dark:border-slate-800/20 backdrop-blur-3xl h-full flex flex-col shadow-sm z-10 shrink-0 pb-4 hidden lg:flex">
        <div className="p-6">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 bg-orange-100 text-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-orange-500/10 rotate-3 transition-transform group-hover:rotate-0">
              <span className="text-3xl">🐝</span>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Welcome Back</p>
              <p className="font-black text-lg text-slate-800 dark:text-white leading-tight">
                오늘도 즐거운<br /> 
                댄스 생활 되세요,<br />
                <span className="text-orange-500">{profile?.displayName || '참여자'}님!</span>
              </p>
            </div>
          </div>

          <nav className="space-y-6">
            {/* [나의 활동] */}
            <div className="space-y-1">
              <p className="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">나의 활동</p>
              <button 
                onClick={() => handleMenuClick('bookings')}
                className={clsx("w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-bold transition-all text-sm group/menu", activeMenu === 'bookings' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-amber-400 font-black shadow-sm" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
              >
                <div className="flex items-center gap-3"><Ticket className="w-5 h-5" /> 예매/이용 내역</div>
              </button>
              <button 
                onClick={() => handleMenuClick('tickets')}
                className={clsx("w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold transition-all text-sm", activeMenu === 'tickets' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-amber-400 font-black shadow-sm" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
              >
                <BarChart3 className="w-5 h-5" /> 활동 통계 상세
              </button>
              <button 
                onClick={() => handleMenuClick('records')}
                className={clsx("w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold transition-all text-sm", activeMenu === 'records' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-amber-400 font-black shadow-sm" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
              >
                <Archive className="w-5 h-5" /> 내 댄스 기록
              </button>
            </div>

            {/* [탐색 및 소통] */}
            <div className="space-y-1">
              <p className="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">탐색 및 소통</p>
              <button 
                onClick={() => handleMenuClick('find')}
                className={clsx("w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold transition-all text-sm", activeMenu === 'find' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-amber-400 font-black shadow-sm" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
              >
                <Compass className="w-5 h-5" /> 행사 찾기
              </button>
              <button 
                onClick={() => handleMenuClick('favorites')}
                className={clsx("w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold transition-all text-sm", activeMenu === 'favorites' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-amber-400 font-black shadow-sm" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
              >
                 <Heart className="w-5 h-5" /> 관심 목록
              </button>
              <button 
                onClick={() => handleMenuClick('community')}
                className={clsx("w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold transition-all text-sm", activeMenu === 'community' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-amber-400 font-black shadow-sm" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
              >
                 <MessageSquare className="w-5 h-5" /> 커뮤니티
              </button>
            </div>

            {/* [혜택] */}
            <div className="space-y-1">
              <p className="px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">혜택</p>
              <button 
                onClick={() => handleMenuClick('rewards')}
                className={clsx("w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold transition-all text-sm", activeMenu === 'rewards' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-amber-400 font-black shadow-sm" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
              >
                <Gift className="w-5 h-5" /> 쿠폰/포인트
              </button>
            </div>
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-slate-100 dark:border-slate-800">
           <button 
              onClick={() => handleMenuClick('settings')}
              className={clsx("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm", activeMenu === 'settings' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-amber-400 font-black shadow-sm" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
            >
              <Settings className="w-5 h-5" /> 계정 설정
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col p-4 lg:p-10 min-h-0">
        
        {/* Mobile Navigation */}
        <div className="lg:hidden w-full mb-6 max-w-full overflow-x-auto flex gap-2 shrink-0 no-scrollbar pb-2">
           {['bookings', 'find', 'records', 'favorites', 'community', 'rewards', 'settings'].map((menu) => (
              <button 
                key={menu}
                onClick={() => handleMenuClick(menu as MenuKey)}
                className={clsx(
                  "whitespace-nowrap px-4 py-2 rounded-xl font-black text-sm border transition-all shadow-sm", 
                  activeMenu === menu 
                    ? "bg-slate-800 dark:bg-amber-400 text-white dark:text-slate-900 border-slate-800 dark:border-amber-400 scale-105" 
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                )}
              >
                {menu === 'bookings' ? '예매' : menu === 'find' ? '탐색' : menu === 'records' ? '기록' : menu === 'favorites' ? '관심' : menu === 'community' ? '소통' : menu === 'rewards' ? '혜택' : '설정'}
              </button>
           ))}
        </div>

        {/* Breadcrumbs (Desktop) */}
        <div className="hidden lg:flex items-center gap-2 text-sm text-slate-500 font-bold mb-8 tracking-tight shrink-0">
          <span>Participant</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-white capitalize text-lg font-black tracking-tighter">
            {activeMenu === 'bookings' && '예매/이용 내역'}
            {activeMenu === 'records' && '내 댄스 기록'}
            {activeMenu === 'find' && '행사 찾기'}
            {activeMenu === 'tickets' && '활동 통계 상세'}
            {activeMenu === 'favorites' && '관심 목록'}
            {activeMenu === 'community' && '커뮤니티'}
            {activeMenu === 'rewards' && '쿠폰/포인트'}
            {activeMenu === 'settings' && '계정 설정'}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeMenu}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-hidden flex flex-col h-full min-h-0"
          >
            {activeMenu === 'bookings' && renderBookingsContent()}
            {activeMenu === 'find' && renderFindContent()}
            {activeMenu === 'records' && renderRecordsContent()}
            {activeMenu === 'tickets' && renderTicketsContent()}
            {activeMenu === 'favorites' && renderFavoritesContent()}
            {activeMenu === 'community' && renderCommunityContent()}
            {activeMenu === 'rewards' && renderRewardsContent()}
            {activeMenu === 'settings' && renderSettingsContent()}
          </motion.div>
        </AnimatePresence>

        {/* Floating Action Button (FAB) - For Mobile */}
        <div className="lg:hidden fixed bottom-6 right-6 z-50">
          <button 
            onClick={() => handleMenuClick('find')}
            className="w-14 h-14 bg-indigo-600 dark:bg-amber-400 text-white dark:text-slate-900 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
          >
            <Compass className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
