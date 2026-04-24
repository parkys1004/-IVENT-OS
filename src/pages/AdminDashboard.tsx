import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link, useNavigate } from 'react-router-dom';
import { RefreshCw, Users, CalendarDays, Home, Coins, ChevronRight, Image as ImageIcon, LayoutGrid, Settings, Bot, AlertCircle, Layout } from 'lucide-react';
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

type MenuKey = 'home' | 'users' | 'events' | 'lessons' | 'banners' | 'config' | 'points' | 'settings';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [activeMenu, setActiveMenu] = useState<MenuKey>('home');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
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
    try {
      const [
        { data: profiles },
        { data: evts },
        { data: classes },
        { data: banners },
        { data: dashConfig },
        { data: pConfig },
        { data: pHistory },
        { data: appConfig }
      ] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('events').select('*').order('priority', { ascending: false }),
        supabase.from('classes').select('*').order('created_at', { ascending: false }),
        supabase.from('promo_banners').select('*').order('updated_at', { ascending: false }),
        supabase.from('settings').select('value').eq('key', 'dashboard').maybeSingle(),
        supabase.from('settings').select('value').eq('key', 'point_policies').maybeSingle(),
        supabase.from('point_history').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('settings').select('value').eq('key', 'app_config').maybeSingle()
      ]);

      const profileMap: Record<string, string> = {};
      if (profiles) {
        profiles.forEach(p => profileMap[p.id] = p.display_name || '이름 없음');
        setUsers(profiles.map(u => ({
          uid: u.id, email: u.email, displayName: u.display_name, photoURL: u.photo_url, role: u.role,
          createdAt: u.created_at, priority: u.priority || 0, points: u.points || 0
        })));
      }

      const mappedEvents = (evts || []).map(e => ({
        id: e.id, 
        title: e.title, 
        category: e.category, 
        date: e.date, 
        status: e.status,
        isBanner: e.is_banner, 
        host_id: e.host_id, 
        hostName: profileMap[e.host_id] || '알 수 없는 사용자',
        isLesson: e.is_lesson, 
        priority: e.priority || 0,
        endDate: e.end_date // Added this for date range display
      }));

      setEvents(mappedEvents);
      if (banners) setPromoBanners(banners.map(b => ({ id: b.id, imageUrl: b.image_url, linkUrl: b.link_url, isActive: b.is_active })));
      if (dashConfig) setDashboardConfig(dashConfig.value as DashboardConfig);
      if (pConfig) setPointPolicies({ ...DEFAULT_POINT_POLICIES, ...pConfig.value });
      if (appConfig) setApprovalMode((appConfig.value as any).approvalMode || 'manual');

      if (pHistory) {
        const issued = pHistory.filter(h => h.amount > 0).reduce((acc: number, curr: any) => acc + curr.amount, 0);
        const used = Math.abs(pHistory.filter(h => h.amount < 0).reduce((acc: number, curr: any) => acc + curr.amount, 0));
        setPointStats({ totalIssued: issued, totalUsed: used, history: pHistory });
      }

      setDbHealth({ profiles: { status: 'ok' }, events: { status: 'ok' }, promo_banners: { status: 'ok' }, settings: { status: 'ok' } });
    } catch (err: any) {
      setFetchError(err.message || '데이터 로드 실패');
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
  };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="animate-spin" /></div>;

  const pendingUsers = users.filter(u => ['dj', 'instructor', 'media'].includes(u.role || '') && !u.isApproved).length;
  const pendingRegularEvents = events.filter(e => !e.isLesson && (e.status === 'pending' || e.status === 'draft')).length;
  const pendingLessons = events.filter(e => e.isLesson && (e.status === 'pending' || e.status === 'draft')).length;

  return (
    <div className="flex-1 flex overflow-hidden glass-panel h-full w-full min-h-0 bg-white dark:bg-slate-950">
      {/* Sidebar */}
      <div className="w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
        <div className="p-6">
          <h2 className="text-xs font-black text-slate-400 tracking-widest uppercase mb-4">Admin Dashboard</h2>
          <nav className="space-y-1">
            <NavItem icon={Home} label="대시보드" active={activeMenu === 'home'} onClick={() => handleMenuClick('home')} />
            <NavItem icon={Users} label="회원 관리" active={activeMenu === 'users'} onClick={() => handleMenuClick('users')} badge={pendingUsers} />
            <NavItem icon={CalendarDays} label="행사 관리" active={activeMenu === 'events'} onClick={() => handleMenuClick('events')} badge={pendingRegularEvents} />
            <NavItem icon={LayoutGrid} label="강습 관리" active={activeMenu === 'lessons'} onClick={() => handleMenuClick('lessons')} badge={pendingLessons} color="emerald" />
            <NavItem icon={Coins} label="포인트 관리" active={activeMenu === 'points'} onClick={() => handleMenuClick('points')} />
            <NavItem icon={ImageIcon} label="배너 관리" active={activeMenu === 'banners'} onClick={() => handleMenuClick('banners')} />
            <NavItem icon={Layout} label="홈 화면 설정" active={activeMenu === 'config'} onClick={() => handleMenuClick('config')} />
            <Link to="/ai-settings" className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
              <Bot className="w-5 h-5 text-indigo-500" /> AI API 설정
            </Link>
          </nav>
        </div>
        <div className="mt-auto p-6 border-t border-slate-200 dark:border-slate-800">
          <NavItem icon={Settings} label="시스템 설정" active={activeMenu === 'settings'} onClick={() => handleMenuClick('settings')} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <span>Admin</span> <ChevronRight className="w-4 h-4" /> 
            <span className="text-slate-900 dark:text-white capitalize">{activeMenu}</span>
          </div>
          <button onClick={fetchAdminData} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all">
            <RefreshCw className={clsx("w-3.5 h-3.5", isRefreshing && "animate-spin")} /> 새로고침
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-8 no-scrollbar">
          {fetchError && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-5 h-5" /> <span>{fetchError}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeMenu}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
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
                />
              )}
              {activeMenu === 'banners' && (
                <BannersTab 
                  promoBanners={promoBanners} 
                  setPromoBanners={setPromoBanners} 
                  events={events} 
                  handleBannerToggle={async (id, current) => {
                    const { error } = await supabase.from('events').update({ is_banner: !current }).eq('id', id);
                    if (!error) fetchAdminData();
                  }}
                />
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
  return (
    <button 
      onClick={onClick}
      className={clsx(
        "w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all text-sm",
        active 
          ? `bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400 shadow-sm` 
          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={clsx("w-5 h-5", active && `text-${color}-500`)} />
        {label}
      </div>
      {badge > 0 && <span className={`bg-${color}-500 text-white text-[10px] px-1.5 py-0.5 rounded-full`}>{badge}</span>}
    </button>
  );
}
