import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, MapPin, Users, CalendarDays, Clock, Flame, Ticket, Heart, MessageSquare, 
  Settings, ChevronRight, Lock, ArrowUpDown, Camera, User, Plus, BarChart3, 
  Award, Trophy, Zap, LayoutGrid, List, QrCode, TrendingUp, Archive, Gift, Compass, Coins, Bot,
  CheckCircle2, AlertCircle, Info, Star, Music, Filter, Sparkles, Download
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import EventCard, { EventData } from '../components/EventCard';
import ProfessionalCard from '../components/ProfessionalCard';
import { UserProfile } from '../context/AuthContext';
import { handleSupabaseError, OperationType } from '../lib/supabaseError';
import { uploadImageToStorage } from '../lib/storage';

interface PromoBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
}

type MenuKey = 'bookings' | 'records' | 'find' | 'favorites' | 'community' | 'rewards' | 'settings' | 'tickets' | 'recommendation_settings';
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
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [followedArtistIds, setFollowedArtistIds] = useState<Set<string>>(new Set());
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [saveToast, setSaveToast] = useState('');

  const downloadQR = async (regId: string, eventTitle: string) => {
    try {
      const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${regId}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR_${eventTitle.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("QR Download failed:", error);
      setSaveToast("QR 코드 다운로드에 실패했습니다.");
      setTimeout(() => setSaveToast(''), 3000);
    }
  };
  
  // Gamification Metrics
  const [points, setPoints] = useState(0);
  const [rankPercentile, setRankPercentile] = useState(0);
  const [monthlyGoal, setMonthlyGoal] = useState(10);
  const [currentMonthVisits, setCurrentMonthVisits] = useState(0);

  const fetchGoalMetrics = async () => {
    if (!user) return;
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // 1. Fetch Registrations count
    const { data: regs, error: regsError } = await supabase
      .from('registrations')
      .select('event_id, registered_at')
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .gte('registered_at', firstDay.toISOString());

    if (!regsError && regs) {
      setCurrentMonthVisits(regs.length);
    }

    // 2. Fetch Goal
    const { data: goal, error: goalError } = await supabase
      .from('user_goals')
      .select('target_count')
      .eq('user_id', user.id)
      .eq('year_month', firstDay.toISOString())
      .maybeSingle();

    if (!goalError && goal) {
      setMonthlyGoal(goal.target_count);
    }
  };

  const updateGoal = async (newGoal: number) => {
    if (!user) return;
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    // Log the payload to debug
    const payload = {
      user_id: user.id,
      year_month: firstDay.toISOString(),
      target_count: newGoal
    };
    console.log("Updating goal payload:", payload);

    const { data, error } = await supabase
      .from('user_goals')
      .upsert(payload, { onConflict: 'user_id, year_month' })
      .select();

    if (!error) {
      setMonthlyGoal(newGoal);
      setEditingGoal(false);
      setSaveToast('목표가 저장되었습니다!');
      setTimeout(() => setSaveToast(''), 2500);
    } else {
      console.error("Goal update error:", error);
      setSaveToast(`저장 실패: ${error.message}`);
      setTimeout(() => setSaveToast(''), 3000);
    }
  };

  const fetchGamificationData = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('points, rank_percentile')
        .eq('id', user.id)
        .single();
      
      if (!error && data) {
        setPoints(data.points);
        setRankPercentile(data.rank_percentile);
      }
    } catch (e) {
      console.error("Error fetching gamification data", e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchGoalMetrics();
      fetchGamificationData();
    }
  }, [user]);

  const [dashboardConfig, setDashboardConfig] = useState({
    partiesLimit: 9,
    lessonsLimit: 6,
    instructorsLimit: 6,
    djMediaLimit: 6,
    sectionOrder: ['parties', 'lessons', 'instructors', 'djMedia']
  });

  const [bookings, setBookings] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [follows, setFollows] = useState<any[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  useEffect(() => {
    if (user && activeMenu === 'favorites') {
      const fetchFavorites = async () => {
        setLoadingFavorites(true);
        // Fetch Bookmarks
        const { data: bData } = await supabase
          .from('event_bookmarks')
          .select('*, parties(*), lessons(*)')
          .eq('user_id', user.id);
        
        // Fetch Follows
        const { data: fData } = await supabase
          .from('artist_follows')
          .select('*, profiles(*)')
          .eq('user_id', user.id);

        setBookmarks(bData || []);
        setFollows(fData || []);
        setLoadingFavorites(false);
      };
      fetchFavorites();
    }
  }, [user, activeMenu]);
  const [isSaving, setIsSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    phone: '',
    photoURL: ''
  });
  const [preferenceForm, setPreferenceForm] = useState<UserProfile['preferences']>({
    genres: [],
    regions: [],
    roles: [],
    types: [],
    autoApplied: false
  });
  const profilePictureInputRef = useRef<HTMLInputElement>(null);

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = await uploadImageToStorage(file, 'profiles');
        setProfileForm(prev => ({ ...prev, photoURL: url }));
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
      setPreferenceForm(profile.preferences || {
        genres: [],
        regions: [],
        roles: [],
        types: [],
        autoApplied: false
      });
    }
  }, [profile]);

  const handlePreferenceSave = async () => {
    if (!user) {
      console.error("User not found during preference save");
      return;
    }
    
    setIsSaving(true);
    try {
      // 데이터 구조 안전장치 및 기본값 보장
      const payload = {
        genres: Array.isArray(preferenceForm?.genres) ? preferenceForm.genres : [],
        regions: Array.isArray(preferenceForm?.regions) ? preferenceForm.regions : [],
        roles: Array.isArray(preferenceForm?.roles) ? preferenceForm.roles : [],
        types: Array.isArray(preferenceForm?.types) ? preferenceForm.types : [],
        autoApplied: Boolean(preferenceForm?.autoApplied)
      };

      const { data, error } = await supabase
        .from('profiles')
        .update({
          preferences: payload,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select();

      if (error) {
        console.error('Supabase Update Error:', error);
        throw error;
      }
      
      console.log('Update result:', data);
      
      // 상태 최신화
      await refreshProfile();
      setSaveToast('취향 설정이 저장되었습니다!');
      setTimeout(() => setSaveToast(''), 2500);
    } catch (error: any) {
      console.error('Failed to save preferences:', error);
      const msg = error?.message || '알 수 없는 오류가 발생했습니다.';
      setSaveToast(`저장 실패: ${msg}`);
      setTimeout(() => setSaveToast(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

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
      setSaveToast('프로필이 저장되었습니다.');
      setTimeout(() => setSaveToast(''), 2500);
    } catch (error) {
      console.error(error);
      setSaveToast('저장 중 오류가 발생했습니다.');
      setTimeout(() => setSaveToast(''), 3000);
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
        // 1. Fetch Parties (필요한 컬럼 명시)
        const eventColumns = 'id, title, description, date, end_date, category, location_name, formatted_address, status, price, max_attendees, host_id, image_url, is_banner, priority, likes_count, created_at';
        
        const { data: partiesData, error: partiesError } = await supabase
          .from('parties')
          .select(eventColumns)
          .eq('status', 'published')
          .limit(40);

        if (partiesError) throw partiesError;

        // 1.1 Fetch Lessons (필요한 컬럼 명시)
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select(eventColumns + ', level')
          .eq('status', 'published')
          .limit(30);

        if (lessonsError) {
          console.warn("Lessons table error:", lessonsError);
        }

        // Fetch registration counts for these items
        const parties = (partiesData || []) as any[];
        const lessons = (lessonsData || []) as any[];
        
        const allItemIds = [...parties.map(e => e.id), ...lessons.map(c => c.id)];
        
        const { data: allRegs } = await supabase
          .from('registrations')
          .select('event_id')
          .in('event_id', allItemIds)
          .limit(1000);

        const regCounts: Record<string, number> = {};
        (allRegs as any[])?.forEach(r => {
          regCounts[r.event_id] = (regCounts[r.event_id] || 0) + 1;
        });
        
        const mappedParties = parties.map(e => ({
          ...e,
          currentAttendees: regCounts[e.id] || 0,
          isLesson: false,
          isBanner: e.is_banner,
          likesCount: e.likes_count,
          createdAt: e.created_at,
          maxAttendees: e.max_attendees || 0,
          locationName: e.location_name,
          formattedAddress: e.formatted_address,
          hostId: e.host_id,
          imageUrl: e.image_url
        }));

        const mappedLessons = lessons.map(c => ({
          ...c,
          currentAttendees: regCounts[c.id] || 0,
          isLesson: true,
          isBanner: (c as any).is_banner,
          likesCount: (c as any).likes_count,
          createdAt: (c as any).created_at,
          maxAttendees: c.max_attendees || 50,
          locationName: c.location_name,
          formattedAddress: c.formatted_address,
          hostId: c.host_id,
          imageUrl: c.image_url
        }));
        
        // Combine and sort by date
        const combined = [...mappedParties, ...mappedLessons].sort((a, b) => {
          const timeA = a.date ? new Date(a.date).getTime() : 0;
          const timeB = b.date ? new Date(b.date).getTime() : 0;
          return timeA - timeB;
        });

        setEvents(combined as unknown as EventData[]);

        // 2. Fetch Professionals (필요한 컬럼 명시)
        const { data: proData, error: proError } = await supabase
          .from('profiles')
          .select(`id, email, display_name, photo_url, role, created_at, points, followers_count, specialties, priority, instagram_url, facebook_url, kakao_id, portfolio_url`)
          .in('role', ['instructor', 'dj', 'media'])
          .order('priority', { ascending: false })
          .limit(10);

        if (proError) throw proError;
        const mappedPros = proData.map(p => ({
          uid: p.id,
          email: p.email,
          displayName: p.display_name,
          photoURL: p.photo_url,
          role: p.role,
          createdAt: p.created_at,
          points: p.points,
          followersCount: p.followers_count || 0,
          specialties: p.specialties,
          priority: p.priority,
          instagram_url: p.instagram_url,
          facebook_url: p.facebook_url,
          kakao_id: p.kakao_id,
          portfolioUrl: p.portfolio_url
        } as any));
        setProfessionals(mappedPros);

        // 2-1. 현재 사용자가 팔로우 중인 전문가 ID 목록 조회
        if (user) {
          const { data: followData } = await supabase
            .from('artist_follows')
            .select('artist_id')
            .eq('user_id', user.id);
          if (followData) {
            setFollowedArtistIds(new Set(followData.map((f: any) => f.artist_id)));
          }
        }

        // 3. Fetch Banners
        const { data: bannerData, error: bannerError } = await supabase
          .from('promo_banners')
          .select('id, image_url, link_url, is_active')
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
        // If we were querying parties/lessons, the error might be there
        if (error.message?.includes('parties') || error.message?.includes('lessons')) {
           handleSupabaseError(error, OperationType.LIST, error.message.includes('parties') ? 'parties' : 'lessons');
        } else {
           handleSupabaseError(error, OperationType.LIST, 'registrations');
        }
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
          const { data: regsData, error: regsError } = await supabase
            .from('registrations')
            .select('id, event_id, status, registered_at')
            .eq('user_id', user.id)
            .order('registered_at', { ascending: false })
            .limit(50);

          if (regsError) throw regsError;

          if (!regsData || regsData.length === 0) {
            setRegistrations([]);
            return;
          }

          const eventIds = regsData.map(r => r.event_id);
          const BOOKING_COLS = 'id, title, category, date, image_url, location_name';
          const [partiesRes, lessonsRes] = await Promise.all([
            supabase.from('parties').select(BOOKING_COLS).in('id', eventIds),
            supabase.from('lessons').select(BOOKING_COLS).in('id', eventIds)
          ]);

          const partiesMap: Record<string, any> = {};
          partiesRes.data?.forEach(p => partiesMap[p.id] = { 
            ...p, 
            isLesson: false,
            date: p.date || (p as any).start_date // Graceful fallback
          });
          
          const lessonsMap: Record<string, any> = {};
          lessonsRes.data?.forEach(l => lessonsMap[l.id] = { 
            ...l, 
            isLesson: true,
            date: l.date || (l as any).start_date // Graceful fallback
          });

          const orphanIds: string[] = [];
          const mappedRegs = regsData
            .map((r: any) => {
              const eventInfo = partiesMap[r.event_id] || lessonsMap[r.event_id];
              if (!eventInfo) {
                orphanIds.push(r.id);
                return null;
              }
              return {
                id: r.id,
                status: r.status,
                registeredAt: r.registered_at,
                event: {
                  id: eventInfo.id,
                  title: eventInfo.title,
                  category: eventInfo.category,
                  imageUrl: eventInfo.image_url,
                  date: eventInfo.date,
                  locationName: eventInfo.location_name,
                  isLesson: eventInfo.isLesson
                } as unknown as EventData
              };
            })
            .filter(Boolean) as any[];

          if (orphanIds.length > 0) {
            await supabase.from('registrations').delete().in('id', orphanIds);
          }

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

    // 2. Secondary Sort: Recommendation Scoring (Tie-breaker)
    let scoreA = 0;
    let scoreB = 0;

    if (profile?.preferences) {
      const prefs = profile.preferences;
      
      // Match Genres
      prefs.genres?.forEach(g => {
        if (a.title.includes(g) || a.category.includes(g) || (a.description || '').includes(g)) scoreA += 10;
        if (b.title.includes(g) || b.category.includes(g) || (b.description || '').includes(g)) scoreB += 10;
      });

      // Match Regions
      prefs.regions?.forEach(r => {
        if ((a.locationName || '').includes(r) || (a as any).formattedAddress?.includes(r)) scoreA += 5;
        if ((b.locationName || '').includes(r) || (b as any).formattedAddress?.includes(r)) scoreB += 5;
      });

      // Match Types
      prefs.types?.forEach(t => {
        if ((a.description || '').includes(t) || a.category.includes(t)) scoreA += 3;
        if ((b.description || '').includes(t) || b.category.includes(t)) scoreB += 3;
      });
    }

    if (scoreA !== scoreB) return scoreB - scoreA;

    // 3. Tertiary Sort: Priority (Featured/Pinned items higher among ties)
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
                {parties.length === 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                    현재 대기 중인 파티가 없습니다.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
                    {parties.map((event, idx) => (
                      <EventCard key={event.id} event={event} index={idx} />
                    ))}
                  </div>
                )}
              </section>
            );
          }
          if (sectionKey === 'lessons') {
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
                {lessons.length === 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                    현재 모집 중인 강습이 없습니다.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
                    {lessons.map((event, idx) => (
                      <EventCard key={event.id} event={event} index={idx} />
                    ))}
                  </div>
                )}
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
                    <ProfessionalCard key={pro.uid} professional={pro} index={idx} currentUserId={user?.id} initialFollowed={followedArtistIds.has(pro.uid)} />
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
                    <ProfessionalCard key={pro.uid} professional={pro} index={idx} currentUserId={user?.id} initialFollowed={followedArtistIds.has(pro.uid)} />
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
          찜한 행사 ({bookmarks.length})
        </button>
        <button onClick={() => setActiveTab('following')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'following' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          팔로잉 ({follows.length})
        </button>
      </div>

      {loadingFavorites ? (
        <div className="flex-1 flex items-center justify-center">로딩 중...</div>
      ) : activeTab === 'all' ? (
        bookmarks.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 mx-auto w-full rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex-1 flex flex-col p-12 text-center text-slate-500 items-center justify-center">
             <Heart className="w-12 h-12 mb-4 text-slate-300" />
             <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">찜한 행사가 없습니다</h3>
             <p className="font-bold text-slate-500 mb-6">마음에 드는 행사를 찜해두고 빠르게 확인해보세요.</p>
             <button onClick={() => handleMenuClick('find')} className="px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-black transition-colors shadow-lg shadow-indigo-200">행사 둘러보기</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {bookmarks.map((b) => {
                const event = (b.parties || b.lessons);
                if (!event) return null;
                return <EventCard key={b.id} event={event as EventData} index={0} />;
             })}
          </div>
        )
      ) : (
        follows.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 mx-auto w-full rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex-1 flex flex-col p-12 text-center text-slate-500 items-center justify-center">
             <Users className="w-12 h-12 mb-4 text-slate-300" />
             <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">팔로우 중인 아티스트가 없습니다</h3>
             <p className="font-bold text-slate-500 mb-6">좋아하는 DJ나 강사를 팔로우하고 소식을 받아보세요.</p>
             <button onClick={() => handleMenuClick('find')} className="px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-black transition-colors shadow-lg shadow-indigo-200">아티스트 찾기</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {follows.map((f) => {
                if (!f.profiles) return null;
                return <ProfessionalCard key={f.id} professional={f.profiles} index={0} />;
             })}
          </div>
        )
      )}
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
                 className="mt-8 px-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-black w-full sm:w-auto disabled:opacity-50"
               >
                 {isSaving ? '저장 중...' : '변경사항 저장하기'}
               </button>
             </form>
          </div>
      </div>
    </div>
  );

  const renderRecommendationSettingsContent = () => {
    const GENRES = ['살사', '바차타', '키좀바', '라인댄스', '온1', '온2', '쿠반', '센슈얼'];
    const REGIONS = ['서울', '강남', '홍대', '부산', '포항', '대구', '대전', '광주', '경기', '인천'];
    const TYPES = ['파티', '소셜', '강습', '워크숍', '페스티벌', '공연'];

    const toggleItem = (category: 'genres' | 'regions' | 'types', item: string) => {
      setPreferenceForm(prev => {
        if (!prev) return prev;
        const currentItems = (prev[category as keyof typeof prev] as string[]) || [];
        const newItems = currentItems.includes(item) 
          ? currentItems.filter(i => i !== item)
          : [...currentItems, item];
        return { ...prev, [category]: newItems };
      });
    };

    return (
      <div className="space-y-8 flex flex-col h-full pb-20 overflow-y-auto no-scrollbar">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white">자동 추천 설정</h3>
              <p className="text-sm text-slate-500 font-bold">회원님의 취향을 등록하면 맞춤형 이벤트를 추천해드립니다.</p>
            </div>
          </div>

          <div className="space-y-10">
            {/* Genre Selection */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                <Music className="w-4 h-4 text-emerald-500" /> 선호 장르
              </label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map(genre => (
                  <button
                    key={genre}
                    onClick={() => toggleItem('genres', genre)}
                    className={clsx(
                      "px-5 py-2.5 rounded-2xl text-xs font-black transition-all border-2",
                      preferenceForm?.genres?.includes(genre)
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-300"
                    )}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Region Selection */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                <MapPin className="w-4 h-4 text-rose-500" /> 선호 지역
              </label>
              <div className="flex flex-wrap gap-2">
                {REGIONS.map(region => (
                  <button
                    key={region}
                    onClick={() => toggleItem('regions', region)}
                    className={clsx(
                      "px-5 py-2.5 rounded-2xl text-xs font-black transition-all border-2",
                      preferenceForm?.regions?.includes(region)
                        ? "bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-500/20"
                        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-300"
                    )}
                  >
                    {region}
                  </button>
                ))}
              </div>
            </div>

            {/* Type Selection */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest pl-1">
                <Flame className="w-4 h-4 text-orange-500" /> 관심 행사 유형
              </label>
              <div className="flex flex-wrap gap-2">
                {TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => toggleItem('types', type)}
                    className={clsx(
                      "px-5 py-2.5 rounded-2xl text-xs font-black transition-all border-2",
                      preferenceForm?.types?.includes(type)
                        ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20"
                        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-300"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Applied Toggle */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
               <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <p className="font-black text-slate-800 dark:text-white">메인화면 자동 적용</p>
                    <p className="text-xs text-slate-500 font-bold">검색 페이지 진입 시 해당 필터를 자동으로 적용합니다.</p>
                  </div>
                  <button 
                    onClick={() => setPreferenceForm(prev => prev ? ({ ...prev, autoApplied: !prev.autoApplied }) : prev)}
                    className={clsx(
                      "w-14 h-8 rounded-full relative transition-colors",
                      preferenceForm?.autoApplied ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                    )}
                  >
                    <motion.div 
                      animate={{ x: preferenceForm?.autoApplied ? 24 : 4 }}
                      className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm"
                    />
                  </button>
               </div>
            </div>

            <button
               onClick={handlePreferenceSave}
               disabled={isSaving}
               className={clsx(
                 "w-full py-4 rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2",
                 isSaving 
                   ? "bg-slate-400 text-white cursor-not-allowed" 
                   : "bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-900 shadow-slate-900/10"
               )}
            >
               {isSaving ? (
                 <>
                   <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                   저장 중...
                 </>
               ) : '맞춤 설정 저장하기'}
            </button>
          </div>
        </div>

        <div className="p-8 bg-indigo-50 dark:bg-indigo-950/20 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-4">
          <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-sm text-indigo-800/70 dark:text-indigo-400/70 font-bold leading-relaxed">
            등록된 취향 정보는 실시간 자동 추천 알고리즘에 반영되어, 회원님께 가장 적합한 행사를 우선적으로 노출합니다. 
            더 정확한 추천을 위해 AI와 대화하듯 행사를 검색해보고 싶다면 'AI 추천 모드'를 활용해보세요!
          </p>
        </div>
      </div>
    );
  };

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
          <h3 className="text-xl font-black text-slate-800 dark:text-white">포인트 활용 안내</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-3">
            <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-lg uppercase">포인트 사용</span>
            <p className="text-base font-black text-slate-800 dark:text-white">강습 예매 시 포인트로 결제</p>
            <p className="text-xs text-slate-500 font-bold">보유 포인트를 강습 예매에 사용하세요.</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-3">
            <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-lg uppercase">포인트 적립</span>
            <p className="text-base font-black text-slate-800 dark:text-white">커뮤니티 활동으로 포인트 적립</p>
            <p className="text-xs text-slate-500 font-bold">댓글, 후기 작성 시 포인트가 쌓입니다.</p>
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
                <h4 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                  이번 달 활동 목표
                  {!editingGoal ? (
                    <button
                      onClick={() => { setGoalInput(monthlyGoal.toString()); setEditingGoal(true); }}
                      className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-bold text-xs rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-100 dark:border-indigo-800"
                    >
                      수정
                    </button>
                  ) : (
                    <span className="flex items-center gap-1">
                      <input
                        type="number"
                        value={goalInput}
                        onChange={e => setGoalInput(e.target.value)}
                        className="w-14 px-2 py-1 border border-indigo-300 dark:border-indigo-700 rounded-lg text-sm font-black text-center bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                        min={1} max={100}
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') { const n = parseInt(goalInput); if (!isNaN(n) && n > 0) updateGoal(n); } if (e.key === 'Escape') setEditingGoal(false); }}
                      />
                      <button onClick={() => { const n = parseInt(goalInput); if (!isNaN(n) && n > 0) updateGoal(n); }} className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-xs font-black">확인</button>
                      <button onClick={() => setEditingGoal(false)} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg text-xs font-black">취소</button>
                    </span>
                  )}
                </h4>
              </div>
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-2xl font-black text-slate-800 dark:text-white">{currentMonthVisits} <span className="text-sm text-slate-500">/ {monthlyGoal}회</span></span>
                <span className="text-indigo-600 dark:text-amber-400 font-bold text-sm">{Math.min(100, Math.round((currentMonthVisits / monthlyGoal) * 100))}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (currentMonthVisits / monthlyGoal) * 100)}%` }}
                  className="h-full bg-indigo-600 dark:bg-amber-400 rounded-full"
                />
              </div>
              <p className="text-[11px] text-slate-500 font-bold mt-3 italic">
                {currentMonthVisits >= monthlyGoal 
                  ? "목표를 달성했습니다! 🎉" 
                  : `목표 달성까지 ${monthlyGoal - currentMonthVisits}회 남았습니다! 🔥`}
              </p>
            </div>
          </div>

          {/* Points & Rank Card */}
            <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-gradient-to-br from-indigo-600 to-violet-700 dark:from-slate-900 dark:to-slate-800 rounded-3xl p-6 shadow-xl shadow-indigo-500/10 border border-white/10 flex flex-col justify-between text-white overflow-hidden"
          >
            {/* Animated Shimmer background */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
            />

            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <p className="text-indigo-200 dark:text-slate-400 text-[11px] font-black uppercase tracking-wider mb-1">Activity Reward</p>
                <h4 className="text-xl font-black">댄스 활동 점수</h4>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
            </div>
            
            <div className="relative z-10">
              <div className="space-y-1 mb-4">
                <p className="text-3xl font-black tracking-tighter">{points.toLocaleString()} <span className="text-sm font-bold opacity-80">Point</span></p>
                <div className="flex justify-between items-center text-sm font-bold">
                    <p className="text-indigo-100 dark:text-amber-400">현재 커뮤니티 상위 {rankPercentile}%</p>
                    <p className="opacity-80">Next: 2,000 P</p>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden mb-4">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (points / 2000) * 100)}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-amber-400 rounded-full"
                />
              </div>

              <div className="flex gap-2">
                 <span title="1,000점 달성 시 획득" className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black border border-white/10 uppercase cursor-default select-none opacity-80">Level. Pro</span>
                 <span title="바차타 행사 5회 참여 시 획득" className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black border border-white/10 uppercase cursor-default select-none opacity-80">Bachata Master</span>
              </div>
            </div>
          </motion.div>

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
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 30 }}
                        className="fixed inset-0 lg:absolute bg-white dark:bg-slate-950 lg:bg-white/95 lg:dark:bg-slate-900/95 z-[100] lg:z-30 flex flex-col items-center justify-start lg:justify-center p-8 pt-24 lg:pt-8 backdrop-blur-3xl lg:rounded-3xl"
                      >
                         <button onClick={() => setShowQR(null)} className="absolute top-8 right-8 lg:top-4 lg:right-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-full shadow-lg z-[110]">
                           <Plus className="w-6 h-6 rotate-45" />
                         </button>

                         <div className="w-full max-w-xs mb-10 text-center">
                           <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-full mb-3 inline-block">
                             Ticket Valid
                           </span>
                           <h4 className="text-xl font-[1000] text-slate-900 dark:text-white mb-2 line-clamp-2 leading-tight">
                             {reg.event.title}
                           </h4>
                           <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
                             {reg.event.locationName} • {format(new Date(reg.event.date), 'MM.dd(eee)', { locale: ko })}
                           </p>
                         </div>

                         <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl mb-8 relative group/qr scale-125 lg:scale-100 border-8 border-indigo-50">
                           <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${reg.id}`} alt="QR Code" className="w-40 h-40" />
                           <button 
                             onClick={() => downloadQR(reg.id, reg.event.title)}
                             className="absolute inset-0 bg-indigo-600/90 opacity-0 group-hover/qr:opacity-100 transition-opacity flex flex-col items-center justify-center text-white rounded-[2rem]"
                           >
                             <Download className="w-10 h-10 mb-1" />
                             <span className="text-[11px] font-black uppercase">Save Ticket</span>
                           </button>
                         </div>
                         
                         <div className="text-center space-y-2">
                           <p className="text-base font-black text-slate-900 dark:text-white">Quick Pass QR</p>
                           <p className="text-xs text-slate-500 font-bold max-w-[200px] leading-relaxed">
                             행사 입장 시 스태프에게 <br/> 이 화면을 제시해주세요.
                           </p>
                         </div>

                         <button 
                           onClick={() => downloadQR(reg.id, reg.event.title)}
                           className="lg:hidden mt-auto mb-10 flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black uppercase shadow-xl shadow-indigo-200 dark:shadow-none"
                         >
                           <Download className="w-5 h-5" /> 이미지 다운로드
                         </button>
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
      {/* Toast 알림 */}
      <AnimatePresence>
        {saveToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-2xl text-sm font-black flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            {saveToast}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* LNB (Left Navigation Bar) */}
      <div className="w-64 bg-white/20 dark:bg-slate-900/20 border-r border-slate-200/30 dark:border-slate-800/20 backdrop-blur-3xl h-full flex flex-col shadow-sm z-10 shrink-0 hidden lg:flex">
        <div className="p-6 flex-1 overflow-y-auto no-scrollbar">
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

          <nav className="space-y-6 pb-4">
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
                onClick={() => handleMenuClick('recommendation_settings')}
                className={clsx("w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold transition-all text-sm", activeMenu === 'recommendation_settings' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-amber-400 font-black shadow-sm" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
              >
                 <Sparkles className="w-5 h-5" /> 자동 추천 설정
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
              <Link 
                to="/points"
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold transition-all text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white"
              >
                <Coins className="w-5 h-5 text-amber-500" /> 포인트 충전
              </Link>
              <Link 
                to="/settings"
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold transition-all text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white"
              >
                <Bot className="w-5 h-5 text-indigo-500" /> AI API 설정
              </Link>
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
      <div className="flex-1 overflow-hidden flex flex-col p-2 lg:p-10 min-h-0">
        
        {/* Mobile Navigation */}
        <div className="lg:hidden w-full mb-4 max-w-full overflow-x-auto flex gap-2 shrink-0 no-scrollbar py-2 px-2">
           {['bookings', 'find', 'recommendation_settings', 'records', 'favorites', 'community', 'rewards', 'settings'].map((menu) => (
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
                {menu === 'bookings' ? '예매' : menu === 'find' ? '탐색' : menu === 'recommendation_settings' ? '추천' : menu === 'records' ? '기록' : menu === 'favorites' ? '관심' : menu === 'community' ? '소통' : menu === 'rewards' ? '혜택' : '설정'}
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
            {activeMenu === 'recommendation_settings' && '자동 추천 설정'}
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
            {activeMenu === 'recommendation_settings' && renderRecommendationSettingsContent()}
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
