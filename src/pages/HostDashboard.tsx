import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarDays, Users, PlusCircle, Camera, BarChart3, TrendingUp, Eye,
  Edit3, CheckCircle2, Clock, XCircle, ChevronRight, Ticket,
  GraduationCap, Star, AlertCircle, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

interface EventData {
  id: string;
  title: string;
  category: string;
  date: string;
  currentAttendees: number;
  maxAttendees: number;
  status: string;
  isLesson: boolean;
}

const statusConfig = {
  published: { label: '공개', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/50' },
  draft: { label: '임시저장', icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/50' },
  cancelled: { label: '취소됨', icon: XCircle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800/50' },
};

function StatCard({ icon: Icon, label, value, sub, colorClass }: { icon: any; label: string; value: string | number; sub?: string; colorClass: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center mb-4', colorClass)}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{value}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1">{sub}</p>}
    </div>
  );
}

export default function HostDashboard() {
  const { user, profile } = useAuth();
  const [myEvents, setMyEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const cols = 'id, title, category, date, status, max_attendees, current_attendees, metadata';
        const [partiesRes, lessonsRes] = await Promise.all([
          supabase.from('parties').select(cols).eq('host_id', user.id).order('created_at', { ascending: false }),
          supabase.from('lessons').select(cols).eq('host_id', user.id).order('created_at', { ascending: false })
        ]);

        const mapEvents = (data: any[], isLesson: boolean) =>
          (data || []).map(e => ({
            id: e.id, title: e.title, category: e.category,
            date: e.date || e.start_date,
            currentAttendees: e.current_attendees || 0,
            maxAttendees: (e.metadata as any)?.maxAttendees || e.max_attendees || 0,
            status: e.status, isLesson
          }));

        setMyEvents([...mapEvents(partiesRes.data || [], false), ...mapEvents(lessonsRes.data || [], true)]);
      } catch (error) {
        console.error('Error fetching host events:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [user, refreshKey]);

  const filtered = activeFilter === 'all' ? myEvents : myEvents.filter(e => e.status === activeFilter);
  const totalAttendees = myEvents.reduce((s, e) => s + e.currentAttendees, 0);
  const activeCount = myEvents.filter(e => e.status === 'published').length;
  const totalCapacity = myEvents.reduce((s, e) => s + e.maxAttendees, 0);
  const fillRate = totalCapacity > 0 ? Math.round((totalAttendees / totalCapacity) * 100) : 0;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-40">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
          <p className="text-slate-400 font-bold text-sm">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-24">

      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <p className="text-indigo-500 dark:text-indigo-400 font-black text-sm mb-1">
              {profile?.displayName || '주최자'}님, 환영합니다 👋
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-tight">
              현재 <span className="text-indigo-600 dark:text-indigo-400">{activeCount}개</span>의 행사를 진행 중
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold mt-1">
              참여율, 통계를 확인하고 행사를 관리하세요.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="새로고침"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <Link
              to="/scan-tickets"
              className="flex items-center gap-2 px-4 sm:px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Camera className="w-4 h-4" /> <span className="hidden sm:inline">스캐너</span>
            </Link>
            <Link
              to="/create"
              className="flex items-center gap-2 px-4 sm:px-5 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20"
            >
              <PlusCircle className="w-4 h-4" /> <span className="hidden sm:inline">새 행사</span>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard icon={CalendarDays} label="공개 행사" value={`${activeCount}건`} sub="현재 진행 중" colorClass="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" />
        <StatCard icon={Users} label="총 참여자" value={`${totalAttendees}명`} sub="누적 확정 참여" colorClass="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" />
        <StatCard icon={TrendingUp} label="평균 참여율" value={`${fillRate}%`} sub={`${totalAttendees} / ${totalCapacity}석`} colorClass="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
        <StatCard icon={Ticket} label="전체 행사" value={`${myEvents.length}건`} sub="파티 + 강습 합산" colorClass="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" />
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <Link
          to="/create"
          className="flex items-center gap-4 p-6 bg-indigo-600 dark:bg-indigo-500 text-white rounded-3xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors group shadow-lg shadow-indigo-500/20"
        >
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
            <Star className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-lg">파티 행사 만들기</p>
            <p className="text-indigo-100 text-sm font-bold">파티, 페스티벌, 행사를 등록하세요</p>
          </div>
          <ChevronRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link
          to="/create-lesson"
          className="flex items-center gap-4 p-6 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors group shadow-sm"
        >
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-lg">강습 만들기</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">댄스 강습, 워크샵을 등록하세요</p>
          </div>
          <ChevronRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform text-slate-400 dark:text-slate-600" />
        </Link>
      </motion.div>

      {/* Event List */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">내 행사 관리</h2>
            <p className="text-slate-400 dark:text-slate-500 text-sm font-bold">총 {myEvents.length}개 행사</p>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit">
            {(['all', 'published', 'draft'] as const).map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={clsx(
                  'px-4 py-2 rounded-xl text-xs font-black transition-all',
                  activeFilter === f
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                )}
              >
                {f === 'all' ? '전체' : f === 'published' ? '공개' : '임시저장'}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center px-6"
            >
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-lg font-black text-slate-500 dark:text-slate-400 mb-2">
                {activeFilter === 'all' ? '아직 주최한 행사가 없습니다' : '해당 상태의 행사가 없습니다'}
              </p>
              <p className="text-slate-400 dark:text-slate-500 font-bold text-sm mb-6">
                새로운 행사를 만들고 참가자를 모집해보세요!
              </p>
              <Link
                to="/create"
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-colors"
              >
                <PlusCircle className="w-4 h-4" /> 행사 만들기
              </Link>
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((event, idx) => {
                const dateObj = event.date ? new Date(event.date) : null;
                const fill = event.maxAttendees > 0 ? Math.min(Math.round((event.currentAttendees / event.maxAttendees) * 100), 100) : 0;
                const st = statusConfig[event.status as keyof typeof statusConfig] || statusConfig.draft;
                const StatusIcon = st.icon;
                const isPast = dateObj ? dateObj < new Date() : false;

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    {/* Type icon */}
                    <div className={clsx('w-10 h-10 rounded-2xl flex items-center justify-center shrink-0', event.isLesson ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'bg-amber-50 dark:bg-amber-900/30')}>
                      {event.isLesson
                        ? <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        : <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border', st.color, st.bg, st.border)}>
                          <StatusIcon className="w-3 h-3" /> {st.label}
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg">
                          {event.category}
                        </span>
                        {isPast && event.status === 'published' && (
                          <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg">종료</span>
                        )}
                      </div>
                      <p className="font-black text-slate-800 dark:text-white truncate text-[15px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {event.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {dateObj && (
                          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {format(dateObj, 'yyyy.MM.dd (E)', { locale: ko })}
                          </span>
                        )}
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {event.currentAttendees} / {event.maxAttendees}명
                        </span>
                      </div>
                    </div>

                    {/* Progress + Actions */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="hidden sm:flex flex-col items-end gap-1 w-24">
                        <span className={clsx('text-xs font-black', fill >= 80 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400')}>
                          {fill}%
                        </span>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={clsx('h-full rounded-full transition-all', fill >= 80 ? 'bg-rose-500' : fill >= 50 ? 'bg-amber-500' : 'bg-indigo-500')}
                            style={{ width: `${fill}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          to={`/event/${event.id}`}
                          className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          title="미리보기"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={event.isLesson ? `/edit-lesson/${event.id}` : `/edit/${event.id}`}
                          className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                          title="수정"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-start gap-4 p-6 bg-indigo-50 dark:bg-indigo-950/20 rounded-3xl border border-indigo-100 dark:border-indigo-900/30"
      >
        <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-700/70 dark:text-indigo-400/70 font-bold leading-relaxed">
          공개 행사는 메인 페이지와 탐색 페이지에 노출됩니다. 이미지와 상세 설명을 충실히 작성하면 참여율이 높아집니다.
          QR 스캐너로 입장 확인을 빠르게 처리하세요.
        </p>
      </motion.div>
    </div>
  );
}
