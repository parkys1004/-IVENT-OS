import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Users, CalendarDays, Key, Settings, Trash2, Home, CreditCard, ChevronRight, UserCheck, Search, Filter } from 'lucide-react';
import { useAuth, UserProfile } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';

interface EventData {
  id: string;
  title: string;
  category: string;
  date: any;
  currentAttendees: number;
  maxAttendees: number;
  status: string;
  hostName: string;
  isBanner?: boolean;
}

type MenuKey = 'home' | 'users' | 'events' | 'finance' | 'banners' | 'settings';
type TabKey = string;

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<EventData[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation State
  const [activeMenu, setActiveMenu] = useState<MenuKey>('home');
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const handleRoleChange = async (uid: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        role: newRole
      });
    } catch (error) {
      console.error("Failed to update user role:", error);
      alert("회원 유형 변경 중 오류가 발생했습니다.");
    }
  };

  const handleBannerToggle = async (eventId: string, currentStatus: boolean) => {
    const bannerCount = events.filter(e => e.isBanner).length;
    if (!currentStatus && bannerCount >= 5) {
      alert("배너는 최대 5개까지만 등록 가능합니다.");
      return;
    }
    try {
      await updateDoc(doc(db, 'events', eventId), {
        isBanner: !currentStatus
      });
    } catch (error) {
      console.error("Failed to update banner status:", error);
    }
  };

  useEffect(() => {
    // Admin needs full access, so we just query everything
    let unsubEvents: () => void;
    let unsubUsers: () => void;

    const fetchAdminData = () => {
      try {
        const eventsQ = query(collection(db, 'events'), orderBy('date', 'desc'));
        const usersQ = query(collection(db, 'users'), orderBy('createdAt', 'desc'));

        // Realtime for events
        unsubEvents = onSnapshot(eventsQ, (snapshot) => {
          setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as EventData[]);
        }, (error) => {
          console.error("Admin events snapshot error:", error);
          setLoading(false);
        });

        // Realtime for users
        unsubUsers = onSnapshot(usersQ, (snapshot) => {
          setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[]);
          setLoading(false);
        }, (error) => {
          console.error("Admin users snapshot error:", error);
          setLoading(false);
        });

      } catch (err) {
        console.error("Admin fetch error", err);
        setLoading(false);
      }
    };

    fetchAdminData();
    
    return () => {
      if (unsubEvents) unsubEvents();
      if (unsubUsers) unsubUsers();
    };
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  // Analytics & Stats
  const roleCounts = {
    admin: users.filter(u => u.role === 'admin').length,
    host: users.filter(u => u.role === 'host').length,
    dj: users.filter(u => u.role === 'dj').length,
    instructor: users.filter(u => u.role === 'instructor').length,
    media: users.filter(u => u.role === 'media').length,
    user: users.filter(u => u.role === 'user').length,
  };
  
  // Fake Badges counts
  const pendingUsers = users.filter(u => ['dj', 'instructor', 'media'].includes(u.role)).length; // Just an example
  const pendingEvents = events.filter(e => e.status === 'draft').length;

  const handleMenuClick = (menu: MenuKey) => {
    setActiveMenu(menu);
    // Reset tab on menu change
    setActiveTab('all');
  };

  // -----------------------------------------------------
  // Sub-components for Main Content
  // -----------------------------------------------------

  const renderHomeContent = () => (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 pb-px">
        <button className="px-4 py-3 font-bold text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white">종합 현황</button>
        <button className="px-4 py-3 font-bold text-slate-400 hover:text-slate-600 transition-colors">투데이 이슈</button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-2">총 가입자</div>
          <div className="text-3xl font-black text-slate-800 dark:text-white">{users.length}<span className="text-sm font-normal text-slate-500 ml-1">명</span></div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-2">등록된 행사</div>
          <div className="text-3xl font-black text-slate-800 dark:text-white">{events.length}<span className="text-sm font-normal text-slate-500 ml-1">건</span></div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-2">승인 대기 전문가</div>
          <div className="text-3xl font-black text-orange-600">{pendingUsers}<span className="text-sm font-normal text-slate-500 ml-1">명</span></div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-2">승인 대기 행사</div>
          <div className="text-3xl font-black text-emerald-600">{pendingEvents}<span className="text-sm font-normal text-slate-500 ml-1">건</span></div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm h-64 flex items-center justify-center text-slate-400">
        (여기에 실시간 방문자 트래픽 차트가 들어갑니다)
      </div>
    </div>
  );

  const renderUsersContent = () => (
    <div className="space-y-6 flex flex-col h-full min-h-0">
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <button onClick={() => setActiveTab('all')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'all' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          전체
        </button>
        <button onClick={() => setActiveTab('pending')} className={clsx("px-4 py-3 font-bold transition-colors flex items-center gap-2", activeTab === 'pending' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          전문가 승인
          {pendingUsers > 0 && <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingUsers}</span>}
        </button>
        <button onClick={() => setActiveTab('blacklist')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'blacklist' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          블랙리스트
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="이름, 이메일 검색..." className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-64 focus:ring-2 focus:ring-orange-500 outline-none" />
        </div>
        <button className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
          <Filter className="w-4 h-4" /> 필터
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex-1 relative min-h-0">
        <div className="absolute inset-0 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-sm">
              <tr className="text-slate-500 dark:text-slate-400 text-[12px] uppercase tracking-wider">
                <th className="p-4 font-bold">사용자</th>
                <th className="p-4 font-bold">이메일</th>
                <th className="p-4 font-bold">유형</th>
                <th className="p-4 font-bold">가입일</th>
                <th className="p-4 font-bold text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => activeTab === 'all' || (activeTab === 'pending' && ['dj','instructor','media'].includes(u.role)) || (activeTab === 'blacklist' && u.role === 'banned')).map(u => {
                const createdAt = u.createdAt?.toDate ? u.createdAt.toDate() : new Date();
                return (
                  <tr key={u.uid} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      {u.photoURL ? (
                        <img src={u.photoURL} className="w-8 h-8 rounded-full border border-slate-200" alt="profile" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">?</div>
                      )}
                      <span className="font-bold text-slate-800 dark:text-white text-sm">{u.displayName || '이름 없음'}</span>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 text-sm">{u.email}</td>
                    <td className="p-4">
                      <select 
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                        className={clsx(
                          "px-2 py-1 rounded-md text-[11px] font-bold outline-none cursor-pointer appearance-none text-center",
                          u.role === 'admin' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                          u.role === 'host' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                          ['dj','instructor','media'].includes(u.role) ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        )}
                      >
                         <option value="admin">관리자</option>
                         <option value="host">주최자</option>
                         <option value="dj">DJ</option>
                         <option value="instructor">강사</option>
                         <option value="media">미디어</option>
                         <option value="user">참여자</option>
                      </select>
                    </td>
                    <td className="p-4 text-slate-500 text-xs">
                      {format(createdAt, 'yy.MM.dd', { locale: ko })}
                    </td>
                    <td className="p-4 text-right">
                      {/* Using a simulation of a Drawer open action */}
                      <button className="text-orange-500 font-bold hover:text-orange-600 text-sm px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 transition-colors">
                        상세보기
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderEventsContent = () => (
    <div className="space-y-6 flex flex-col h-full min-h-0">
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <button onClick={() => setActiveTab('all')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'all' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          전체
        </button>
        <button onClick={() => setActiveTab('pending')} className={clsx("px-4 py-3 font-bold transition-colors flex items-center gap-2", activeTab === 'pending' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          승인 대기
          {pendingEvents > 0 && <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingEvents}</span>}
        </button>
        <button onClick={() => setActiveTab('active')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'active' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          진행 중
        </button>
        <button onClick={() => setActiveTab('ended')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'ended' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          종료/정산
        </button>
      </div>
      
      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex-1 relative min-h-0">
        <div className="absolute inset-0 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-sm">
              <tr className="text-slate-500 dark:text-slate-400 text-[12px] uppercase tracking-wider">
                <th className="p-4 font-bold">행사명</th>
                <th className="p-4 font-bold">주최자</th>
                <th className="p-4 font-bold">상태</th>
                <th className="p-4 font-bold">배너</th>
                <th className="p-4 font-bold">일시</th>
                <th className="p-4 font-bold text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {events.filter(e => activeTab === 'all' || e.status === activeTab || (activeTab === 'pending' && e.status === 'draft')).map(event => {
                const dateObj = event.date?.toDate ? event.date.toDate() : new Date();
                return (
                  <tr key={event.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-bold text-slate-800 dark:text-white text-sm">{event.title}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 text-sm">{event.hostName}</td>
                    <td className="p-4">
                      <span className={clsx("px-2 py-1 rounded-md text-[11px] font-bold",
                        event.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                        event.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      )}>
                        {event.status === 'published' ? '진행 중' : event.status === 'draft' ? '승인 대기' : '종료됨'}
                      </span>
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => handleBannerToggle(event.id, !!event.isBanner)}
                        className={clsx(
                          "px-2 py-1 rounded-md text-[11px] font-bold transition-colors",
                          event.isBanner 
                            ? "bg-indigo-600 text-white" 
                            : "bg-slate-100 text-slate-400 dark:bg-slate-800 hover:bg-slate-200"
                        )}
                      >
                        {event.isBanner ? "ON" : "OFF"}
                      </button>
                    </td>
                    <td className="p-4 text-slate-500 text-xs">{format(dateObj, 'yyyy.MM.dd', { locale: ko })}</td>
                    <td className="p-4 text-right">
                      <Link to={`/event/${event.id}`} className="text-indigo-600 font-bold hover:text-indigo-800 text-sm px-3 py-1.5 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
                        보기
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-slate-950 h-full w-full min-h-0">
      {/* LNB (Left Navigation Bar) */}
      <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-sm z-10 shrink-0 pb-4">
        <div className="p-6">
          <h2 className="text-xs font-black text-slate-400 tracking-widest uppercase mb-4">Admin System</h2>
          <nav className="space-y-1">
            <button 
              onClick={() => handleMenuClick('home')}
              className={clsx("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm", activeMenu === 'home' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-amber-400" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
            >
              <Home className="w-5 h-5" /> 종합 대시보드
            </button>
            <button 
              onClick={() => handleMenuClick('users')}
              className={clsx("w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all text-sm", activeMenu === 'users' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-amber-400" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
            >
              <div className="flex items-center gap-3"><Users className="w-5 h-5" /> 회원 관리</div>
              {pendingUsers > 0 && <div className="w-2 h-2 bg-rose-500 rounded-full" title="승인 대기 존재"></div>}
            </button>
            <button 
              onClick={() => handleMenuClick('events')}
              className={clsx("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm", activeMenu === 'events' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-amber-400" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
            >
               <CalendarDays className="w-5 h-5" /> 행사 관리
            </button>
            <button 
              onClick={() => handleMenuClick('banners')}
              className={clsx("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm", activeMenu === 'banners' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-amber-400" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
            >
               <Home className="w-5 h-5 text-indigo-500" /> 배너 관리
            </button>
            <button 
              onClick={() => handleMenuClick('finance')}
              className={clsx("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm", activeMenu === 'finance' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-amber-400" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
            >
               <CreditCard className="w-5 h-5" /> 정산 관리
            </button>
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-slate-100 dark:border-slate-800">
           <button 
              onClick={() => handleMenuClick('settings')}
              className={clsx("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm", activeMenu === 'settings' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-amber-400" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
            >
              <Settings className="w-5 h-5" /> 시스템 설정
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col p-6 lg:p-10 min-h-0">
        <div className="flex items-center gap-2 text-sm text-slate-500 font-bold mb-6 tracking-tight shrink-0">
          <span>Admin</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-white">
            {activeMenu === 'home' && '종합 대시보드'}
            {activeMenu === 'users' && '회원 관리'}
            {activeMenu === 'events' && '행사 관리'}
            {activeMenu === 'banners' && '메인 배너 관리'}
            {activeMenu === 'finance' && '정산 관리'}
            {activeMenu === 'settings' && '시스템 설정'}
          </span>
        </div>

        {/* Render body by activeMenu */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMenu}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-hidden flex flex-col h-full min-h-0"
          >
            {activeMenu === 'home' && renderHomeContent()}
            {activeMenu === 'users' && renderUsersContent()}
            {activeMenu === 'events' && renderEventsContent()}
            {activeMenu === 'banners' && (
              <div className="space-y-6 flex flex-col h-full min-h-0">
                <div className="flex justify-between items-center shrink-0">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">메인 배너 설정 (최대 5개)</h3>
                  <p className="text-sm text-slate-500">현재 {events.filter(e => e.isBanner).length}/5 등록됨</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex-1 relative overflow-auto p-6">
                  {events.filter(e => e.isBanner).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <Home className="w-12 h-12 mb-4 opacity-20" />
                      <p>등록된 배너가 없습니다. '행사 관리' 탭에서 등록해주세요.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {events.filter(e => e.isBanner).map(e => (
                        <div key={e.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                          <div className="flex-1 min-w-0 mr-4">
                            <p className="font-bold text-slate-800 dark:text-white truncate">{e.title}</p>
                            <p className="text-xs text-slate-500">{e.hostName}</p>
                          </div>
                          <button 
                            onClick={() => handleBannerToggle(e.id, true)}
                            className="text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-lg"
                          >
                            해제
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeMenu === 'finance' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                <CreditCard className="w-12 h-12 mb-4 text-slate-300" />
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">정산 관리 시스템 구성 중</h3>
                <p>곧 상세 내역 및 매출 통계가 제공됩니다.</p>
              </div>
            )}
            {activeMenu === 'settings' && (
               <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                 <Settings className="w-12 h-12 mb-4 text-slate-300" />
                 <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">시스템 환경설정</h3>
                 <p>플랫폼 수수료율, 글로벌 약관 등을 관리할 수 있습니다.</p>
               </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
