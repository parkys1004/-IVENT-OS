import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Users, CalendarDays, Clock, Flame, Ticket, Heart, MessageSquare, Settings, ChevronRight, Lock, ArrowUpDown } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

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
}

interface EventData {
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
  likesCount?: number;
}

type MenuKey = 'explore' | 'tickets' | 'favorites' | 'community' | 'settings';
type TabKey = string;

export default function ParticipantDashboard({ forceMarketplace = false }: { forceMarketplace?: boolean }) {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('upcoming');

  const [activeMenu, setActiveMenu] = useState<MenuKey>('tickets');
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  // Slider State
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isSliderPaused, setIsSliderPaused] = useState(false);

  const handleMenuClick = (menu: MenuKey) => {
    setActiveMenu(menu);
    setActiveTab('all');
  };

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
      
      setEvents(eventsData.filter(e => e.status === 'published'));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
      setLoading(false); 
    });

    return () => unsubscribe();
  }, []);

  const filteredEvents = events.filter(e => {
    const matchesCategory = filter === 'all' || e.category.toLowerCase() === filter.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.locationName && e.locationName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'upcoming') {
      const dateA = a.date?.toDate ? a.date.toDate().getTime() : 0;
      const dateB = b.date?.toDate ? b.date.toDate().getTime() : 0;
      return dateA - dateB;
    }
    if (sortBy === 'latest') {
      // Assuming id or some creation date if available. For now using same logic for demo.
      return b.id.localeCompare(a.id); 
    }
    if (sortBy === 'popular') {
      return (b.likesCount || 0) - (a.likesCount || 0);
    }
    return 0;
  });
  
  // Banner logic: Prefer isBanner=true, up to 5. Fallback to earliest upcoming if none.
  const bannerEvents = events.filter(e => e.isBanner).slice(0, 5);
  const displayBanners = bannerEvents.length > 0 ? bannerEvents : filteredEvents.slice(0, 1);
  const others = filteredEvents.filter(e => !displayBanners.find(b => b.id === e.id));

  // Slider Auto-play Logic
  useEffect(() => {
    if (displayBanners.length <= 1 || isSliderPaused) return;

    const timer = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % displayBanners.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [displayBanners.length, isSliderPaused]);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>;
  }

  const totalBookings = events.reduce((acc, curr) => acc + curr.currentAttendees, 0);
  const totalCapacity = events.reduce((acc, curr) => acc + curr.maxAttendees, 0);
  const bookingRate = totalCapacity > 0 ? Math.round((totalBookings / totalCapacity) * 100) : 0;

  // --- Sub-contents ---

  const renderExploreContent = () => (
    <div className={clsx("space-y-12 flex flex-col pb-20 w-full", (profile && !forceMarketplace) ? "h-full overflow-y-auto pr-2" : "")}>
      {/* Hero / Banner Area + Stats Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-[2.5fr_1fr] 2xl:grid-cols-[3fr_1fr] gap-8 xl:gap-10 shrink-0">
        <div 
          className="flex flex-col h-full min-h-[300px] overflow-hidden group/slider relative"
          onMouseEnter={() => setIsSliderPaused(true)}
          onMouseLeave={() => setIsSliderPaused(false)}
        >
          {displayBanners.length > 0 ? (
            <div className="relative w-full h-[300px] lg:h-[400px] xl:h-[460px] overflow-hidden rounded-[24px]">
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
              
              {/* Pagination Indicators (Dots) */}
              {displayBanners.length > 1 && (
                 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-20 px-4 py-2 bg-black/10 backdrop-blur-md rounded-full border border-white/10 group-hover/slider:bg-black/30 transition-all">
                    {displayBanners.map((_, i) => (
                      <button 
                        key={i} 
                        onClick={() => setCurrentBannerIndex(i)}
                        className={clsx(
                          "w-2.5 h-2.5 rounded-full transition-all duration-300",
                          i === currentBannerIndex 
                            ? "bg-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.8)]" 
                            : "bg-white/40 hover:bg-white/60"
                        )}
                        aria-label={`Show banner ${i + 1}`}
                      />
                    ))}
                 </div>
              )}

              {/* Number Indicator (Optional, but adds to the polished feel) */}
              {displayBanners.length > 1 && (
                <div className="absolute top-6 left-6 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[12px] font-bold text-white/90 z-20 border border-white/5">
                  {currentBannerIndex + 1} / {displayBanners.length}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full min-h-[300px] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 flex items-center justify-center">
              현재 등록된 배너 행사가 없습니다.
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-4 xl:gap-6 justify-start">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[12px] p-5 flex justify-between items-center shadow-sm transition-colors">
            <div>
              <div className="text-[13px] text-slate-500 dark:text-slate-400 font-medium mb-1">실시간 누적 예매율</div>
              <div className="text-[24px] font-bold text-indigo-600 dark:text-indigo-400">{bookingRate}%</div>
            </div>
            <div className="text-[#10B981] font-bold text-sm bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1.5 rounded-md">↑ 12%</div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[12px] p-5 flex justify-between items-center shadow-sm transition-colors">
            <div>
              <div className="text-[13px] text-slate-500 dark:text-slate-400 font-medium mb-1">금일 방문자수</div>
              <div className="text-[24px] font-bold text-indigo-600 dark:text-indigo-400">1,284</div>
            </div>
            <div className="text-[#10B981] font-bold text-sm bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1.5 rounded-md">↑ 45%</div>
          </div>
        </div>
      </section>

      {/* Advanced Search & Filter Bar */}
      <section className="shrink-0">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[20px] p-2 flex flex-col md:flex-row items-center gap-3 shadow-sm transition-colors">
          {/* Search Input */}
          <div className="relative w-full md:w-64 lg:w-80 group">
            <input 
              type="text" 
              placeholder={t('search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[14px] pl-4 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all font-medium text-slate-700 dark:text-slate-200"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          </div>

          {/* Middle: Categories Segmented Control */}
          <div className="h-10 border-l border-slate-200 dark:border-slate-800 hidden md:block mx-1"></div>
          
          <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-[14px] border border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar w-full md:w-auto">
            {[
              { id: 'all', label: t('search.category.all') },
              { id: 'party', label: t('search.category.party') },
              { id: 'lesson', label: t('search.category.lesson') }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={clsx(
                  "flex items-center gap-1.5 px-4 py-1.5 rounded-[10px] text-xs font-bold transition-all whitespace-nowrap",
                  filter === cat.id 
                    ? "bg-indigo-600 dark:bg-indigo-600 text-white shadow-sm" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Right: Sort Segmented Control */}
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
      </section>

      {/* Event Grid */}
      <section className="pb-8">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">다가오는 행사</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-8">
          {others.map((event, idx) => (
            <EventCard key={event.id} event={event} index={idx} />
          ))}
          {others.length === 0 && events.length > 1 && (
             <div className="col-span-full py-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
             해당 카테고리의 행사가 없습니다.
           </div>
          )}
          {events.length === 0 && (
            <div className="col-span-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-16 text-center transition-colors">
              <CalendarDays className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-1">등록된 행사가 없습니다.</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4 text-sm">기대해주세요!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );

  const renderTicketsContent = () => (
    <div className="space-y-6 flex flex-col h-full pb-20">
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <button onClick={() => setActiveTab('all')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'all' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          예매 내역
        </button>
        <button onClick={() => setActiveTab('used')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'used' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          이용 완료
        </button>
        <button onClick={() => setActiveTab('cancelled')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'cancelled' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          취소/환불
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
           <div className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-2">이번 달 남은 행사</div>
           <div className="text-3xl font-black text-orange-600">2<span className="text-sm font-normal text-slate-500 ml-1">건</span></div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
           <div className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-2">올해 방문한 총 횟수</div>
           <div className="text-3xl font-black text-slate-800 dark:text-white">5<span className="text-sm font-normal text-slate-500 ml-1">번</span></div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 mx-auto w-full rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex-1 flex flex-col p-12 text-center text-slate-500 items-center justify-center">
         <Ticket className="w-12 h-12 mb-4 text-slate-300" />
         <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">내역이 없습니다</h3>
         <p>진행 중인 행사를 둘러보고 티켓을 구매해보세요.</p>
         <button onClick={() => handleMenuClick('explore')} className="mt-6 px-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900">
           전체 행사 보기
         </button>
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
         <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">관심 목록이 비어있습니다</h3>
         <p>마음에 드는 행사나 아티스트를 팔로우하면 여기에 표시됩니다.</p>
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
         <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">활동 내역이 없습니다</h3>
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
             
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">닉네임</label>
                 <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3" defaultValue={profile?.displayName} />
               </div>
               <div>
                 <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">연락처</label>
                 <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3" placeholder="예: 010-0000-0000" />
                 <p className="text-xs text-slate-500 mt-1">예매 정보 안내 시 사용될 기본 연락처입니다.</p>
               </div>
             </div>
             
             <button className="mt-8 px-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 w-full sm:w-auto">변경사항 저장하기</button>
          </div>
      </div>
    </div>
  );

  if (!profile || forceMarketplace) {
    return (
      <div className="w-full max-w-screen-2xl mx-auto px-6 sm:px-8 lg:px-12 xl:px-16 py-8 lg:py-16">
        {renderExploreContent()}
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50/50 dark:bg-slate-950/30 h-full w-full min-h-0 backdrop-blur-3xl transition-colors">
      
      {/* LNB (Left Navigation Bar) */}
      <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-sm z-10 shrink-0 pb-4 hidden lg:flex">
        <div className="p-6">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 bg-orange-100 text-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-orange-500/10 rotate-3 transition-transform group-hover:rotate-0">
              <span className="text-3xl">🐝</span>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Welcome Back</p>
              <p className="font-black text-lg text-slate-800 dark:text-white leading-tight">
                오늘도 즐거운 댄스 생활 되세요,<br />
                <span className="text-orange-500">{profile?.displayName || '참여자'}님!</span>
              </p>
            </div>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => handleMenuClick('tickets')}
              className={clsx("w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all text-sm", activeMenu === 'tickets' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-amber-400 font-black shadow-sm" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
            >
              <div className="flex items-center gap-3"><Ticket className="w-5 h-5" /> 나의 활동 상세</div>
              {activeMenu === 'tickets' && <ChevronRight className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => handleMenuClick('favorites')}
              className={clsx("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm", activeMenu === 'favorites' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-amber-400 font-black shadow-sm" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
            >
               <Heart className="w-5 h-5" /> 관심 목록
            </button>
            <button 
              onClick={() => handleMenuClick('community')}
              className={clsx("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm", activeMenu === 'community' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-amber-400 font-black shadow-sm" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
            >
               <MessageSquare className="w-5 h-5" /> 커뮤니티
            </button>
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
        <div className="lg:hidden w-full mb-6 max-w-full overflow-x-auto flex gap-2 shrink-0 no-scrollbar">
           {['tickets', 'favorites', 'community', 'settings'].map((menu) => (
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
                {menu === 'tickets' ? '활동' : menu === 'favorites' ? '관심' : menu === 'community' ? '커뮤니티' : '설정'}
              </button>
           ))}
        </div>

        {/* Breadcrumbs (Desktop) */}
        <div className="hidden lg:flex items-center gap-2 text-sm text-slate-500 font-bold mb-8 tracking-tight shrink-0">
          <span>Participant</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-white capitalize">
            {activeMenu === 'explore' && '행사 탐색'}
            {activeMenu === 'tickets' && '예매 현황'}
            {activeMenu === 'favorites' && '관심 목록'}
            {activeMenu === 'community' && '커뮤니티'}
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
            {activeMenu === 'explore' && renderExploreContent()}
            {activeMenu === 'tickets' && renderTicketsContent()}
            {activeMenu === 'favorites' && renderFavoritesContent()}
            {activeMenu === 'community' && renderCommunityContent()}
            {activeMenu === 'settings' && renderSettingsContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function EventCard({ event, featured = false, index }: { event: EventData, featured?: boolean, index: number, key?: string | number }) {
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
          className="group relative flex flex-col justify-end h-[300px] lg:h-[400px] xl:h-[460px] w-full rounded-[24px] p-8 lg:p-12 overflow-hidden text-white shadow-sm hover:shadow-md transition-all duration-300 bg-slate-200 dark:bg-slate-800"
        >
          {coverImage && (
            <div className="absolute inset-0">
              <img src={coverImage} alt={event.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" referrerPolicy="no-referrer" />
              {/* Bottom gradient for better text readability */}
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            </div>
          )}
          
          <div className="absolute top-6 right-6 bg-red-500 px-4 py-2 rounded-full text-[13px] font-bold shadow-[0_4px_12px_rgba(239,68,68,0.3)] z-10">
            {isFull ? "모집 마감" : `마감 임박: 잔여 ${event.maxAttendees - event.currentAttendees}석`}
          </div>
          
          <div className="relative z-10 w-full lg:max-w-[80%]">
            <span className="inline-block px-4 py-1.5 rounded-lg text-[13px] font-bold bg-white/20 backdrop-blur-md shadow-sm text-white mb-4 tracking-wider uppercase border border-white/20">
              {event.category}
            </span>
            <h3 className="font-extrabold text-[32px] lg:text-[40px] xl:text-[48px] leading-tight mb-4 truncate text-white drop-shadow-xl">{event.title}</h3>
            <p className="opacity-90 text-[16px] lg:text-[18px] truncate mb-8 flex items-center gap-2 drop-shadow-lg">
              <MapPin className="w-5 h-5"/> {event.locationName} <span className="opacity-50">|</span> <Clock className="w-5 h-5"/> {format(dateObj, 'yyyy.MM.dd a h:mm', { locale: ko })}
            </p>
            
            <div className="flex gap-4">
              <div className="px-6 py-3.5 bg-white text-indigo-600 hover:bg-slate-50 font-bold text-[16px] rounded-xl shadow-lg transition-transform hover:-translate-y-0.5">참여 신청하기</div>
              <div className="px-6 py-3.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-[16px] rounded-xl transition-colors border border-white/20">관심 등록</div>
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
          <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-[18px] xl:text-[20px] leading-[1.4] line-clamp-2 mb-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {event.title}
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
