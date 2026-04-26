import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link, useNavigate } from 'react-router-dom';
import { RefreshCw, Users, CalendarDays, Home, Coins, ChevronRight, Image as ImageIcon, LayoutGrid, Settings, Bot, AlertCircle, Layout, MessageSquare, Menu, X as CloseIcon } from 'lucide-react';
import { useAuth, UserProfile } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { DEFAULT_POINT_POLICIES } from '../lib/points';

import { HomeTab } from '../components/admin/HomeTab';
import { UsersTab } from '../components/admin/UsersTab';
import { EventsTab } from '../components/admin/EventsTab';
import { PointsTab } from '../components/admin/PointsTab';
import { BannersTab } from '../components/admin/BannersTab';
import { ConfigTab } from '../components/admin/ConfigTab';
import { SettingsTab } from '../components/admin/SettingsTab';
import { CommunityTab } from '../components/admin/CommunityTab';

interface EventData {
  id: string;
  title: string;
  category: string;
  date: string;
  currentAttendees: number;
  maxAttendees: number;
  status: string;
  host_id: string;
  hostName: string;
  isBanner?: boolean;
  isLesson?: boolean;
  priority?: number;
}

interface PromoBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
}

interface DashboardConfig {
  partiesLimit: number;
  lessonsLimit: number;
  instructorsLimit: number;
  djMediaLimit: number;
  sectionOrder: string[];
}

type MenuKey = 'home' | 'users' | 'events' | 'lessons' | 'banners' | 'config' | 'points' | 'settings' | 'community';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [activeMenu, setActiveMenu] = useState<MenuKey>('home');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Shared State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [promoBanners, setPromoBanners] = useState<PromoBanner[]>([]);
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>({
    partiesLimit: 9,
    lessonsLimit: 6,
    instructorsLimit: 6,
    djMediaLimit: 6,
    sectionOrder: ['parties', 'lessons', 'instructors', 'djMedia']
  });
  const [pointPolicies, setPointPolicies] = useState(DEFAULT_POINT_POLICIES);
  const [pointStats, setPointStats] = useState({ totalIssued: 0, totalUsed: 0, history: [] as any[] });
  const [dbHealth, setDbHealth] = useState<Record<string, any>>({});
  
  // UI State for tabs
  const [activeTab, setActiveTab] = useState('all');
  const [activeEventTab, setActiveEventTab] = useState('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [approvalMode, setApprovalMode] = useState<'auto' | 'manual'>('manual');

  const fetchAdminData = async () => {
    setIsRefreshing(true);
    setFetchError(null);
    console.log("AdminDashboard: Starting data fetch...");
    try {
      // 1. Fetch profiles first to build profileMap
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      const profileMap: Record<string, string> = {};
      const localErrors: string[] = [];

      if (profilesError) {
        localErrors.push(`Profiles Fetch: ${profilesError.message}`);
      } else if (profilesData) {
        console.log(`AdminDashboard: Loaded ${profilesData.length} profiles`);
        profilesData.forEach(p => profileMap[p.id] = p.display_name || p.email?.split('@')[0] || '이름 없음');
        setUsers(profilesData.map(u => ({
          uid: u.id, 
          email: u.email || '', 
          displayName: u.display_name || u.email?.split('@')[0] || '이름 없음', 
          photoURL: u.photo_url || '', 
          role: u.role as any,
          isApproved: u.is_approved,
          createdAt: u.created_at, 
          priority: u.priority || 0, 
          points: u.points || 0
        })));
      }

      // 2. Fetch the rest in parallel
      const fetchResults = await Promise.allSettled([
        supabase.from('parties').select('*').order('priority', { ascending: false }),
        supabase.from('lessons').select('*').order('priority', { ascending: false }),
        supabase.from('registrations').select('event_id, status'), // Fetch all registrations to compute currentAttendees
        supabase.from('promo_banners').select('*').order('updated_at', { ascending: false }),
        supabase.from('settings').select('value').eq('key', 'dashboard').maybeSingle(),
        supabase.from('settings').select('value').eq('key', 'point_policies').maybeSingle(),
        supabase.from('point_history').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('settings').select('value').eq('key', 'app_config').maybeSingle()
      ]);

      const [
        partyListRes, lessonListRes, regsRes, bannersRes, dashConfigRes, pConfigRes, pHistoryRes, appConfigRes
      ] = fetchResults;

      // Map registrations count
      const attendanceMap: Record<string, number> = {};
      if (regsRes.status === 'fulfilled' && regsRes.value.data) {
        regsRes.value.data.forEach((r: any) => {
          if (r.status !== 'cancelled') {
            attendanceMap[r.event_id] = (attendanceMap[r.event_id] || 0) + 1;
          }
        });
      } else if (regsRes.status === 'fulfilled' && regsRes.value.error) {
        localErrors.push(`Registrations Fetch: ${regsRes.value.error.message}`);
      }

      // Parties
      let mappedParties: any[] = [];
      if (partyListRes.status === 'fulfilled') {
        if (partyListRes.value.error) {
          localErrors.push(`Parties Fetch: ${partyListRes.value.error.message}`);
        } else if (partyListRes.value.data) {
          const partyList = partyListRes.value.data;
          console.log(`AdminDashboard: Loaded ${partyList.length} parties`);
          mappedParties = partyList.map(p => ({
            id: p.id, 
            title: p.title || '제목 없음', 
            category: p.category || 'party', 
            date: p.date || (p as any).start_date, 
            status: p.status,
            isBanner: p.is_banner, 
            host_id: p.host_id, 
            hostName: profileMap[p.host_id] || '알 수 없는 사용자',
            isLesson: false, 
            priority: p.priority || 0,
            endDate: p.end_date,
            maxAttendees: p.max_attendees || 100,
            currentAttendees: attendanceMap[p.id] || 0
          }));
        }
      }

      // Lessons
      let mappedLessons: any[] = [];
      if (lessonListRes.status === 'fulfilled') {
        if (lessonListRes.value.error) {
          localErrors.push(`Lessons Fetch: ${lessonListRes.value.error.message}`);
        } else if (lessonListRes.value.data) {
          const lessonList = lessonListRes.value.data;
          console.log(`AdminDashboard: Loaded ${lessonList.length} lessons`);
          mappedLessons = lessonList.map(l => ({
            id: l.id, 
            title: l.title || '제목 없음', 
            category: l.category || 'lesson', 
            date: l.date || (l as any).start_date, 
            status: l.status,
            isBanner: l.is_banner, 
            host_id: l.host_id, 
            hostName: profileMap[l.host_id] || '알 수 없는 강사',
            isLesson: true, 
            priority: l.priority || 0,
            endDate: l.end_date,
            maxAttendees: l.max_attendees || 50,
            currentAttendees: attendanceMap[l.id] || 0
          }));
        }
      }

      setEvents([...mappedParties, ...mappedLessons]);

      // Other Configs
      if (bannersRes.status === 'fulfilled') {
        if (bannersRes.value.error) localErrors.push(`Banners Fetch: ${bannersRes.value.error.message}`);
        else if (bannersRes.value.data) {
          setPromoBanners(bannersRes.value.data.map(b => ({ id: b.id, imageUrl: b.image_url, linkUrl: b.link_url, isActive: b.is_active })));
        }
      }
      
      if (dashConfigRes.status === 'fulfilled' && dashConfigRes.value.data) {
        setDashboardConfig(dashConfigRes.value.data.value as DashboardConfig);
      }
      
      if (pConfigRes.status === 'fulfilled' && pConfigRes.value.data) {
        setPointPolicies({ ...DEFAULT_POINT_POLICIES, ...pConfigRes.value.data.value });
      }
      
      if (appConfigRes.status === 'fulfilled' && appConfigRes.value.data) {
        setApprovalMode((appConfigRes.value.data.value as any).approvalMode || 'manual');
      }

      if (pHistoryRes.status === 'fulfilled') {
        if (pHistoryRes.value.error) localErrors.push(`Point History Fetch: ${pHistoryRes.value.error.message}`);
        else if (pHistoryRes.value.data) {
          const pHistory = pHistoryRes.value.data;
          const issued = pHistory.filter(h => h.amount > 0).reduce((acc: number, curr: any) => acc + curr.amount, 0);
          const used = Math.abs(pHistory.filter(h => h.amount < 0).reduce((acc: number, curr: any) => acc + curr.amount, 0));
          setPointStats({ totalIssued: issued, totalUsed: used, history: pHistory });
        }
      }

      if (localErrors.length > 0) {
        setFetchError('데이터 불러오기 문제: ' + localErrors.join(' / '));
      }

      // 5. Health checks
      const health: Record<string, any> = {};
      const tables = ['profiles', 'parties', 'lessons', 'registrations', 'promo_banners', 'settings', 'point_history', 'community_posts'];
      
      await Promise.allSettled(tables.map(async (table) => {
        const { error, count } = await supabase.from(table).select('count', { head: true, count: 'exact' }).limit(1);
        health[table] = { 
          status: error ? 'error' : 'ok', 
          message: error ? error.message : '정상',
          count: count || 0
        };
      }));

      setDbHealth(health);
    } catch (err: any) {
      console.error("AdminDashboard global fetch error:", err);
      setFetchError(err.message || '데이터 로드 중 예상치 못한 오류 발생');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (profile && profile.role !== 'admin') navigate('/');
    else if (profile) fetchAdminData();
  }, [profile, navigate]);

  const handleMenuClick = (menu: MenuKey) => {
    setActiveMenu(menu);
    setActiveTab('all');
    setIsSidebarOpen(false);
  };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-indigo-600" /></div>;

  const pendingUsers = users.filter(u => ['dj', 'instructor', 'media'].includes(u.role || '') && !u.isApproved).length;
  const pendingRegularEvents = events.filter(e => !e.isLesson && (e.status === 'pending' || e.status === 'draft')).length;
  const pendingLessons = events.filter(e => e.isLesson && (e.status === 'pending' || e.status === 'draft')).length;

  const menuItems: { key: MenuKey, label: string, icon: any, badge?: number, color?: string }[] = [
    { key: 'home', label: '대시보드', icon: Home },
    { key: 'users', label: '회원 관리', icon: Users, badge: pendingUsers },
    { key: 'events', label: '행사 관리', icon: CalendarDays, badge: pendingRegularEvents },
    { key: 'lessons', label: '강습 관리', icon: LayoutGrid, badge: pendingLessons, color: 'emerald' },
    { key: 'points', label: '포인트 관리', icon: Coins },
    { key: 'banners', label: '배너 관리', icon: ImageIcon },
    { key: 'community', label: '게시판 관리', icon: MessageSquare, color: 'indigo' },
    { key: 'config', label: '홈 화면 설정', icon: Layout },
  ];

  return (
    <div className="flex-1 flex overflow-hidden glass-panel h-full w-full min-h-0 bg-white dark:bg-slate-950 relative">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 z-[100] transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:z-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 h-16 flex items-center justify-between border-b lg:border-none border-slate-200 dark:border-slate-800">
          <h2 className="text-xs font-black text-slate-400 tracking-widest uppercase">Admin Panel</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-full">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
          <nav className="space-y-1.5">
            {menuItems.map(item => (
              <NavItem 
                key={item.key}
                icon={item.icon} 
                label={item.label} 
                active={activeMenu === item.key} 
                onClick={() => handleMenuClick(item.key)} 
                badge={item.badge} 
                color={item.color as any}
              />
            ))}
            <Link to="/ai-settings" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group">
              <Bot className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" /> 
              <span>AI API 설정</span>
            </Link>
          </nav>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <NavItem icon={Settings} label="시스템 설정" active={activeMenu === 'settings'} onClick={() => handleMenuClick('settings')} />
          <div className="flex items-center gap-3 px-4 py-3">
             <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
             </div>
             <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{profile?.displayName || 'Admin'}</p>
                <p className="text-[10px] text-slate-500 truncate">{profile?.email}</p>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 lg:h-20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 bg-white dark:bg-slate-950 sticky top-0 z-[80]">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-xl hover:bg-slate-200 transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
              <span className="hidden sm:inline">Admin</span> 
              <ChevronRight className="w-4 h-4 hidden sm:inline" /> 
              <span className="text-slate-900 dark:text-white capitalize">{activeMenu}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={fetchAdminData} 
              className={clsx(
                "flex items-center gap-2 px-3 lg:px-4 py-2 lg:py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-xl text-xs lg:text-sm font-bold hover:bg-slate-200 transition-all shadow-sm",
                isRefreshing && "opacity-80"
              )}
            >
              <RefreshCw className={clsx("w-3.5 h-3.5", isRefreshing && "animate-spin")} /> 
              <span className="hidden sm:inline">새로고침</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 no-scrollbar bg-slate-50/30 dark:bg-slate-950">
          {fetchError && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-600 shadow-sm animate-in fade-in slide-in-from-top-4">
              <AlertCircle className="w-5 h-5 shrink-0" /> <span className="font-bold text-sm">{fetchError}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeMenu}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto"
            >
              {activeMenu === 'home' && (
                <HomeTab 
                  dbHealth={dbHealth} 
                  fetchAdminData={fetchAdminData} 
                  profile={profile} 
                  users={users} 
                  events={events} 
                  pendingUsers={pendingUsers} 
                  pendingRegularEvents={pendingRegularEvents} 
                  pendingLessons={pendingLessons} 
                  viewMode={(useAuth() as any).viewMode} 
                />
              )}
              {activeMenu === 'users' && (
                <UsersTab 
                  users={users} 
                  setUsers={setUsers}
                  activeTab={activeTab} 
                  setActiveTab={setActiveTab} 
                  userSearchQuery={userSearchQuery} 
                  setUserSearchQuery={setUserSearchQuery} 
                  pendingUsers={pendingUsers} 
                  navigate={navigate} 
                  fetchAdminData={fetchAdminData}
                />
              )}
              {activeMenu === 'events' && (
                <EventsTab 
                  onlyLessons={false} 
                  events={events} 
                  setEvents={setEvents}
                  activeEventTab={activeEventTab} 
                  setActiveEventTab={setActiveEventTab} 
                  approvalMode={approvalMode} 
                  setApprovalMode={setApprovalMode}
                  fetchAdminData={fetchAdminData}
                />
              )}
              {activeMenu === 'lessons' && (
                <EventsTab 
                  onlyLessons={true} 
                  events={events} 
                  setEvents={setEvents}
                  activeEventTab={activeEventTab} 
                  setActiveEventTab={setActiveEventTab} 
                  approvalMode={approvalMode} 
                  setApprovalMode={setApprovalMode}
                  fetchAdminData={fetchAdminData}
                />
              )}
              {activeMenu === 'points' && (
                <PointsTab 
                  pointStats={pointStats} 
                  pointPolicies={pointPolicies} 
                  setPointPolicies={setPointPolicies}
                  users={users}
                />
              )}
              {activeMenu === 'banners' && (
                <BannersTab 
                  promoBanners={promoBanners} 
                  setPromoBanners={setPromoBanners} 
                  events={events} 
                  handleBannerToggle={async (id, current) => {
                    const evt = events.find(e => e.id === id);
                    const tableName = evt?.isLesson ? 'lessons' : 'parties';
                    const { error } = await supabase.from(tableName).update({ is_banner: !current }).eq('id', id);
                    if (!error) fetchAdminData();
                  }}
                />
              )}
              {activeMenu === 'community' && (
                <CommunityTab />
              )}
              {activeMenu === 'config' && (
                <ConfigTab 
                  dashboardConfig={dashboardConfig} 
                  setDashboardConfig={setDashboardConfig} 
                />
              )}
              {activeMenu === 'settings' && (
                <SettingsTab 
                  maintenanceMode={false} 
                  setMaintenanceMode={() => {}} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick, badge, color = 'orange' }: any) {
  const colorMap: any = {
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      text: 'text-orange-600 dark:text-orange-400',
      icon: 'text-orange-500',
      badge: 'bg-orange-500'
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      icon: 'text-emerald-500',
      badge: 'bg-emerald-500'
    },
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      text: 'text-indigo-600 dark:text-indigo-400',
      icon: 'text-indigo-500',
      badge: 'bg-indigo-500'
    }
  };

  const colors = colorMap[color] || colorMap.orange;

  return (
    <button 
      onClick={onClick}
      className={clsx(
        "w-full flex items-center justify-between px-5 py-3.5 rounded-2xl font-bold transition-all text-sm group",
        active 
          ? `${colors.bg} ${colors.text} shadow-sm` 
          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
      )}
    >
      <div className="flex items-center gap-3.5">
        <Icon className={clsx("w-5.5 h-5.5 transition-transform group-hover:scale-110", active && colors.icon)} />
        <span className="tracking-tight">{label}</span>
      </div>
      {badge > 0 && (
        <span className={clsx(
          "text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse",
          colors.badge
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}

