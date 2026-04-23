import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { RefreshCw, Users, CalendarDays, Key, Settings, Trash2, Home, CreditCard, ChevronRight, UserCheck, Search, Filter, Plus, Image as ImageIcon, Link as LinkIcon, Save, X, Upload, FileImage, Ticket, ArrowUp, ArrowDown, LayoutGrid, Layout, ShieldAlert, AlertCircle, GraduationCap, Flame, Clock, Music } from 'lucide-react';
import { useAuth, UserProfile } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';

// Utility for image processing
const resizeAndCompressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        resolve(dataUrl);
      };
      img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
  });
};

interface EventData {
  id: string;
  title: string;
  category: string;
  date: string;
  currentAttendees: number;
  maxAttendees: number;
  status: string;
  hostName: string;
  isBanner?: boolean;
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

type MenuKey = 'home' | 'users' | 'events' | 'finance' | 'banners' | 'config' | 'settings';
type TabKey = string;

import TypeBadge from '../components/TypeBadge';
import { Hash } from 'lucide-react';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<EventData[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [promoBanners, setPromoBanners] = useState<PromoBanner[]>([]);
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>({
    partiesLimit: 9,
    lessonsLimit: 6,
    instructorsLimit: 6,
    djMediaLimit: 6,
    sectionOrder: ['parties', 'lessons', 'instructors', 'djMedia']
  });
  const [loading, setLoading] = useState(true);
  
  const [editBannerId, setEditBannerId] = useState<string | null>(null);
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState<MenuKey>('home');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const safeDate = (val: any) => {
    if (!val) return new Date();
    try {
      if (typeof val.toDate === 'function') return val.toDate();
      const d = new Date(val);
      return isNaN(d.getTime()) ? new Date() : d;
    } catch (e) {
      return new Date();
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    setIsRefreshing(true);
    try {
      const [{ data: eventsData }, { data: usersData }, { data: promoData }, { data: configData }] = await Promise.all([
        supabase.from('events').select('*').order('date', { ascending: false }).limit(100),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('promo_banners').select('*').order('updated_at', { ascending: false }),
        supabase.from('settings').select('value').eq('key', 'dashboard').maybeSingle()
      ]);

      if (eventsData) setEvents(eventsData.map(e => ({ 
        id: e.id, 
        title: e.title,
        category: e.category,
        date: e.date,
        status: e.status,
        isBanner: e.is_banner,
        hostName: e.host_id, // For now, mapping host_id to hostName or fetch joinly
        isLesson: e.is_lesson
      })) as any);

      if (usersData) setUsers(usersData.map(u => ({
        uid: u.id,
        email: u.email,
        displayName: u.display_name,
        photoURL: u.photo_url,
        role: u.role,
        createdAt: u.created_at
      })));

      if (promoData) setPromoBanners(promoData.map(b => ({
        id: b.id,
        imageUrl: b.image_url,
        linkUrl: b.link_url,
        isActive: b.is_active
      })));
      
      if (configData) setDashboardConfig(configData.value as DashboardConfig);
    } catch (err) {
      console.error("Admin fetch error", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRoleChange = async (uid: string, newRole: string) => {
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', uid);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole as any } : u));
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
      const { error } = await supabase.from('events').update({ is_banner: !currentStatus }).eq('id', eventId);
      if (error) throw error;
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, isBanner: !currentStatus } : e));
    } catch (error) {
      console.error("Failed to update banner status:", error);
    }
  };

  const handleApproveEvent = async (eventId: string) => {
    try {
      const { error } = await supabase.from('events').update({ status: 'published' }).eq('id', eventId);
      if (error) throw error;
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: 'published' } : e));
      alert('행사가 승인 및 공개되었습니다.');
    } catch (error) {
      console.error("Failed to approve event:", error);
      alert('행사 승인 중 오류가 발생했습니다.');
    }
  };

  const handlePromoBannerSave = async (id: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('promo_banners').upsert({
        id,
        image_url: editImageUrl,
        link_url: editLinkUrl,
        is_active: true,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      
      setPromoBanners(prev => {
        const existing = prev.find(b => b.id === id);
        const bannerData = { id, imageUrl: editImageUrl, linkUrl: editLinkUrl, isActive: true };
        if (existing) {
          return prev.map(b => b.id === id ? { ...b, ...bannerData } : b);
        }
        return [bannerData, ...prev];
      });

      setEditBannerId(null);
      alert('홍보 배너가 저장되었습니다.');
    } catch (error) {
      console.error("Failed to save promo banner:", error);
      alert('배너 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditBanner = (banner: PromoBanner) => {
    setEditBannerId(banner.id);
    setEditImageUrl(banner.imageUrl);
    setEditLinkUrl(banner.linkUrl);
  };

  const handlePriorityChange = async (tableName: 'events' | 'profiles', id: string, priority: number) => {
    try {
      const { error } = await supabase.from(tableName).update({ priority }).eq(id === 'profiles' ? 'uid' : 'id', id);
      if (error) throw error;
      
      if (tableName === 'events') {
        setEvents(prev => prev.map(e => e.id === id ? { ...e, priority } : e));
      } else {
        setUsers(prev => prev.map(u => (u.id === id || u.uid === id) ? { ...u, priority } : u));
      }
    } catch (error) {
      console.error(`Failed to update ${tableName} priority:`, error);
    }
  };

  const handleConfigSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('settings').upsert({
        key: 'dashboard',
        value: dashboardConfig,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
      if (error) throw error;
      alert('화면 설정이 저장되었습니다.');
    } catch (error) {
      console.error("Failed to save dashboard config:", error);
      alert('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePayoutApprove = (id: string) => {
    alert(`정산 요청 ${id}가 승인되었습니다. (실제 기능은 PG사 연동 필요)`);
  };

  const handleImageFile = async (file: File) => {
    setIsResizing(true);
    try {
      const base64 = await resizeAndCompressImage(file);
      setEditImageUrl(base64);
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("이미지 처리 중 오류가 발생했습니다.");
    } finally {
      setIsResizing(false);
    }
  };

  const handleDrag = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActiveId(id);
    } else if (e.type === "dragleave") {
      setDragActiveId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveId(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  useEffect(() => {
    fetchAdminData();
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
                const createdAt = safeDate(u.createdAt);
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
                         <option value="participant">참여자</option>
                      </select>
                    </td>
                    <td className="p-4 text-slate-500 text-xs">
                      {format(createdAt, 'yy.MM.dd', { locale: ko })}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => navigate(`/profile/${u.id || u.uid}`)}
                        className="text-orange-500 font-bold hover:text-orange-600 text-sm px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 transition-colors"
                      >
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
                const dateObj = safeDate(event.date);
                return (
                  <tr key={event.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-bold text-slate-800 dark:text-white text-sm flex items-center">
                      <TypeBadge isLesson={event.isLesson} />
                      {event.title}
                    </td>
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
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      {event.status === 'draft' && (
                        <button 
                          onClick={() => handleApproveEvent(event.id)}
                          className="text-white font-bold text-xs px-3 py-1.5 bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          승인하기
                        </button>
                      )}
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
    <div className="flex-1 flex overflow-hidden glass-panel h-full w-full min-h-0 transition-colors">
      {/* LNB (Left Navigation Bar) */}
      <div className="w-64 bg-white/20 dark:bg-slate-900/20 border-r border-slate-200/30 dark:border-slate-800/20 backdrop-blur-3xl h-full flex flex-col shadow-sm z-10 shrink-0 pb-4">
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
               <ImageIcon className="w-5 h-5 text-indigo-500" /> 배너 관리
            </button>
            <button 
              onClick={() => handleMenuClick('config')}
              className={clsx("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm", activeMenu === 'config' ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-amber-400" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
            >
               <LayoutGrid className="w-5 h-5" /> 홈 화면 설정
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
        <div className="text-slate-800 dark:text-white flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            <span>Admin</span>
            <ChevronRight className="w-4 h-4" />
            <span>
              {activeMenu === 'banners' && '메인 배너 관리'}
              {activeMenu === 'config' && '홈 화면 설정'}
              {activeMenu === 'finance' && '정산 관리'}
              {activeMenu === 'settings' && '시스템 설정'}
              {activeMenu === 'home' && '종합 대시보드'}
              {activeMenu === 'users' && '회원 관리'}
              {activeMenu === 'events' && '행사 관리'}
            </span>
          </div>
          
          <button 
            onClick={fetchAdminData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw className={clsx("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
            {isRefreshing ? '새로고침 중...' : '데이터 새로고침'}
          </button>
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
              <div className="space-y-8 flex flex-col h-full min-h-0 overflow-y-auto no-scrollbar pb-10">
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-center shrink-0">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">메인 배너 설정 (최대 5개)</h3>
                    <p className="text-sm text-slate-500">현재 {events.filter(e => e.isBanner).length}/5 등록됨</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                    {events.filter(e => e.isBanner).length === 0 ? (
                      <div className="py-10 flex flex-col items-center justify-center text-slate-400">
                        <Home className="w-12 h-12 mb-4 opacity-20" />
                        <p>등록된 배너가 없습니다. '행사 관리' 탭에서 등록해주세요.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {events.filter(e => e.isBanner).map(e => (
                          <div key={e.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div className="flex-1 min-w-0 mr-4">
                              <p className="font-bold text-slate-800 dark:text-white truncate flex items-center">
                                <TypeBadge isLesson={e.isLesson} />
                                <span className="truncate">{e.title}</span>
                              </p>
                              <p className="text-xs text-slate-500">{e.hostName}</p>
                            </div>
                            <button 
                              onClick={() => handleBannerToggle(e.id, true)}
                              className="text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              해제
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-center shrink-0">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">홍보용 사이드 배너 (2개)</h3>
                    <p className="text-sm text-slate-500">사이드바 방문자수 하단에 노출되는 배너입니다.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                    {[1, 2].map((num) => {
                      const bannerId = `sidebar${num}`;
                      const banner = promoBanners.find(b => b.id === bannerId) || { id: bannerId, imageUrl: '', linkUrl: '', isActive: false };
                      const isEditing = editBannerId === bannerId;

                      return (
                        <div key={bannerId} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">Banner #{num}</span>
                            {!isEditing && (
                              <button 
                                onClick={() => startEditBanner(banner)}
                                className="text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                수정하기
                              </button>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="space-y-4">
                               <div 
                                 className={clsx(
                                   "relative aspect-[16/9] w-full rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 overflow-hidden group cursor-pointer",
                                   dragActiveId === bannerId 
                                    ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10" 
                                    : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                 )}
                                 onDragEnter={(e) => handleDrag(e, bannerId)}
                                 onDragLeave={(e) => handleDrag(e, bannerId)}
                                 onDragOver={(e) => handleDrag(e, bannerId)}
                                 onDrop={(e) => handleDrop(e, bannerId)}
                                 onClick={() => fileInputRef.current?.click()}
                               >
                                  {isResizing ? (
                                    <div className="flex flex-col items-center gap-2">
                                      <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                                      <span className="text-[10px] font-bold text-slate-500">이미지 압축 중...</span>
                                    </div>
                                  ) : editImageUrl ? (
                                    <>
                                      <img src={editImageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="bg-white/90 dark:bg-slate-900/90 p-2 rounded-full shadow-lg">
                                          <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className={clsx(
                                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                        dragActiveId === bannerId ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600" : "bg-white dark:bg-slate-800 text-slate-400"
                                      )}>
                                        <FileImage className="w-5 h-5" />
                                      </div>
                                      <div className="text-center px-4">
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">파일을 드래그하거나 클릭하여 로드</p>
                                        <p className="text-[10px] text-slate-400 mt-1">포스터 또는 홍보 이미지 (WEBP/JPG/PNG)</p>
                                      </div>
                                    </>
                                  )}
                                  <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])}
                                  />
                               </div>

                               <div>
                                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">이미지 URL (직접 입력도 가능)</label>
                                 <div className="relative">
                                   <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                   <input 
                                     type="text" 
                                     value={editImageUrl}
                                     onChange={(e) => setEditImageUrl(e.target.value)}
                                     placeholder="https://..."
                                     className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                                   />
                                 </div>
                               </div>
                               <div>
                                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">연결 링크 (기본 #)</label>
                                 <div className="relative">
                                   <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                   <input 
                                     type="text" 
                                     value={editLinkUrl}
                                     onChange={(e) => setEditLinkUrl(e.target.value)}
                                     placeholder="https://..."
                                     className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                                   />
                                 </div>
                               </div>
                               <div className="flex gap-2 pt-2">
                                 <button 
                                   onClick={() => handlePromoBannerSave(bannerId)}
                                   disabled={isSaving || isResizing}
                                   className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-sm transition-all disabled:opacity-50"
                                 >
                                    <Save className="w-4 h-4" /> 저장
                                 </button>
                                 <button 
                                   onClick={() => setEditBannerId(null)}
                                   className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                 >
                                   취소
                                 </button>
                               </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                               {banner.imageUrl ? (
                                  <div className="relative aspect-[16/9] w-full bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden group">
                                     <img 
                                      src={banner.imageUrl} 
                                      alt={`Promo Banner ${num}`} 
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                      referrerPolicy="no-referrer"
                                     />
                                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                        <ImageIcon className="w-8 h-8 text-white opacity-50" />
                                     </div>
                                  </div>
                               ) : (
                                  <div className="aspect-[16/9] w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-2">
                                     <ImageIcon className="w-8 h-8 opacity-20" />
                                     <p className="text-xs font-medium">배너를 등록해주세요</p>
                                  </div>
                               )}
                               <div className="flex items-center gap-2 text-xs truncate text-slate-500">
                                  <LinkIcon className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{banner.linkUrl || '링크 없음'}</span>
                               </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            
            {activeMenu === 'config' && (
              <div className="space-y-8 h-full flex flex-col min-h-0 overflow-y-auto no-scrollbar pb-10">
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm shrink-0 mb-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-black text-slate-800 dark:text-white">메인 섹션 순서 관리</h3>
                      <p className="text-sm text-slate-500 mt-1">홈 화면에 노출될 각 섹션의 위아래 순서를 조정합니다.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {dashboardConfig.sectionOrder.map((section, idx) => {
                      const getSectionInfo = (id: string) => {
                        switch(id) {
                          case 'parties': return { label: '🐝 파티 & 이벤트', color: 'text-indigo-600' };
                          case 'lessons': return { label: '🎓 댄스 강습', color: 'text-emerald-600' };
                          case 'instructors': return { label: '🕺 전문 강사', color: 'text-blue-600' };
                          case 'djMedia': return { label: '🎧 DJ & 미디어', color: 'text-amber-600' };
                          default: return { label: id, color: '' };
                        }
                      };
                      const info = getSectionInfo(section);
                      
                      return (
                        <div key={section} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center font-bold text-slate-400 border border-slate-100 dark:border-slate-800">
                              {idx + 1}
                            </div>
                            <span className={clsx("font-extrabold", info.color)}>{info.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                if (idx === 0) return;
                                const newOrder = [...dashboardConfig.sectionOrder];
                                [newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]];
                                setDashboardConfig({ ...dashboardConfig, sectionOrder: newOrder });
                              }}
                              disabled={idx === 0}
                              className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-indigo-600 transition-all disabled:opacity-30"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                if (idx === dashboardConfig.sectionOrder.length - 1) return;
                                const newOrder = [...dashboardConfig.sectionOrder];
                                [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
                                setDashboardConfig({ ...dashboardConfig, sectionOrder: newOrder });
                              }}
                              disabled={idx === dashboardConfig.sectionOrder.length - 1}
                              className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-indigo-600 transition-all disabled:opacity-30"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm shrink-0">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-black text-slate-800 dark:text-white">메인 그리드 갯수 설정</h3>
                      <p className="text-sm text-slate-500 mt-1">홈 화면 각 섹션에 노출할 최대 카드 갯수를 지정합니다.</p>
                    </div>
                    <button 
                      onClick={handleConfigSave}
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" /> 설정 저장
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { key: 'partiesLimit', label: '파티 섹션 (기본 9)', icon: <Ticket className="text-indigo-500" /> },
                      { key: 'lessonsLimit', label: '강습 섹션 (기본 6)', icon: <GraduationCap className="text-emerald-500" /> },
                      { key: 'instructorsLimit', label: '강사 섹션 (기본 6)', icon: <Users className="text-blue-500" /> },
                      { key: 'djMediaLimit', label: 'DJ/미디어 (기본 6)', icon: <Music className="text-amber-500" /> }
                    ].map((item) => (
                      <div key={item.key} className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          {item.icon}
                          <label className="text-xs font-black uppercase tracking-wider">{item.label}</label>
                        </div>
                        <input 
                          type="number"
                          value={(dashboardConfig as any)[item.key]}
                          onChange={(e) => setDashboardConfig({ ...dashboardConfig, [item.key]: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 font-black text-lg text-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 shrink-0">
                  {/* Event Priority Management */}
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <ArrowUp className="w-5 h-5 text-indigo-500" /> 행사 노출 순서 (우선순위)
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1">숫자가 높을수록 상단에 노출됩니다. (기본값: 0)</p>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[500px]">
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {events.filter(e => e.status === 'published').map(event => (
                          <div key={event.id} className="p-6 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 truncate">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-indigo-600">
                                {(event as any).priority || 0}
                              </div>
                              <div className="truncate">
                                <div className="flex items-center gap-2 mb-1">
                                  <TypeBadge isLesson={event.isLesson} />
                                  <p className="font-bold text-slate-800 dark:text-white truncate">{event.title}</p>
                                </div>
                                <p className="text-xs text-slate-500 truncate">{event.hostName}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <button 
                                 onClick={() => handlePriorityChange('events', event.id, ((event as any).priority || 0) + 1)}
                                 className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                               >
                                 <ArrowUp className="w-4 h-4" />
                               </button>
                               <button 
                                 onClick={() => handlePriorityChange('events', event.id, Math.max(0, ((event as any).priority || 0) - 1))}
                                 className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                               >
                                 <ArrowDown className="w-4 h-4" />
                               </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Professional Priority Management */}
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-emerald-500" /> 전문가 노출 순서
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1">숫자가 높을수록 홈 화면 좌측 상단에 노출됩니다.</p>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[500px]">
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {users.filter(u => ['instructor', 'dj', 'media'].includes(u.role)).map(user => (
                          <div key={user.uid} className="p-6 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 truncate">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-emerald-600">
                                {(user as any).priority || 0}
                              </div>
                              <div className="truncate">
                                <p className="font-bold text-slate-800 dark:text-white truncate">{user.displayName}</p>
                                <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <button 
                                 onClick={() => handlePriorityChange('profiles', user.uid, ((user as any).priority || 0) + 1)}
                                 className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors"
                               >
                                 <ArrowUp className="w-4 h-4" />
                               </button>
                               <button 
                                 onClick={() => handlePriorityChange('profiles', user.uid, Math.max(0, ((user as any).priority || 0) - 1))}
                                 className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                               >
                                 <ArrowDown className="w-4 h-4" />
                               </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeMenu === 'finance' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Volume (Gross)</p>
                    <h3 className="text-3xl font-black text-slate-800 dark:text-white">₩ 12,450,000</h3>
                    <p className="text-xs text-emerald-500 font-bold mt-2">+12.5% from last month</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Platform Fees (Net)</p>
                    <h3 className="text-3xl font-black text-indigo-600">₩ 1,245,000</h3>
                    <p className="text-xs text-slate-400 font-bold mt-2">Current fee rate: 10%</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Pending Payouts</p>
                    <h3 className="text-3xl font-black text-amber-500">₩ 3,120,000</h3>
                    <p className="text-xs text-slate-400 font-bold mt-2">Next payout: May 1st</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-black text-slate-800 dark:text-white">최근 정산 요청 내역</h3>
                    <button className="text-xs font-black text-indigo-600 hover:underline">전체 보기</button>
                  </div>
                  <div className="p-8 text-center text-slate-400 text-sm font-bold">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    현재 처리 중인 정산 요청이 없습니다.
                  </div>
                </div>
              </div>
            )}
            {activeMenu === 'settings' && (
               <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                   <h3 className="text-xl font-black text-slate-800 dark:text-white mb-8 border-b border-slate-50 dark:border-slate-800 pb-4">Global Infrastructure Configuration</h3>
                   
                   <div className="space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                         <label className="text-sm font-black text-slate-600 dark:text-slate-400">Platform Name</label>
                         <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" defaultValue="Dancehive" />
                       </div>
                       <div className="space-y-2">
                         <label className="text-sm font-black text-slate-600 dark:text-slate-400">Default Currency</label>
                         <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold outline-none">
                           <option>KRW (₩)</option>
                           <option>JPY (¥)</option>
                           <option>USD ($)</option>
                           <option>SGD ($)</option>
                         </select>
                       </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                         <label className="text-sm font-black text-slate-600 dark:text-slate-400">Platform Service Fee (%)</label>
                         <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold outline-none" defaultValue="10" />
                       </div>
                       <div className="space-y-2">
                         <label className="text-sm font-black text-slate-600 dark:text-slate-400">System Notification Email</label>
                         <input type="email" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold outline-none" defaultValue="admin@dancehive.app" />
                       </div>
                     </div>

                     <div className="pt-4 flex justify-end">
                       <button className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 hover:scale-105 transition-transform">
                         Save Global Settings
                       </button>
                     </div>
                   </div>
                 </div>

                 <div className="bg-rose-50 dark:bg-rose-900/10 rounded-[32px] border border-rose-100 dark:border-rose-900/30 p-8">
                    <h4 className="text-rose-800 dark:text-rose-400 font-black mb-2 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" /> Danger Zone
                    </h4>
                    <p className="text-rose-600 dark:text-rose-500 text-sm font-bold mb-4">플랫폼 데이터를 초기화하거나 시스템을 즉시 셧다운 할 수 있습니다.</p>
                    <button 
                      onClick={() => setMaintenanceMode(!maintenanceMode)}
                      className={clsx(
                        "px-6 py-3 rounded-xl font-black text-sm transition-all shadow-md active:scale-95",
                        maintenanceMode 
                          ? "bg-rose-600 text-white hover:bg-rose-700" 
                          : "bg-white dark:bg-rose-900/40 text-rose-600 border border-rose-200 dark:border-rose-800"
                      )}
                    >
                      {maintenanceMode ? 'Maintenance Mode DISABLE' : 'Maintenance Mode ENABLE'}
                    </button>
                 </div>
               </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
