import React, { useState } from 'react';
import { ArrowUp, ArrowDown, RefreshCw, Trash2, Plus, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import TypeBadge from '../TypeBadge';
import { supabase } from '../../supabase';

interface EventsTabProps {
  events: any[];
  setEvents: React.Dispatch<React.SetStateAction<any[]>>;
  onlyLessons: boolean;
  activeEventTab: string;
  setActiveEventTab: (tab: string) => void;
  approvalMode: 'auto' | 'manual';
  setApprovalMode: (mode: 'auto' | 'manual') => void;
  fetchAdminData: () => Promise<void>;
}

export const EventsTab: React.FC<EventsTabProps> = ({
  events,
  setEvents,
  onlyLessons,
  activeEventTab,
  setActiveEventTab,
  approvalMode,
  setApprovalMode,
  fetchAdminData
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const safeDate = (val: any) => {
    if (!val) return new Date();
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? new Date() : d;
    } catch (e) {
      return new Date();
    }
  };

  const getTableName = (id: string) => {
    const evt = events.find(e => e.id === id);
    return evt?.isLesson ? 'lessons' : 'parties';
  };

  const handlePriorityChange = async (id: string, priority: number) => {
    const { error } = await supabase.from(getTableName(id)).update({ priority }).eq('id', id);
    if (!error) fetchAdminData();
  };

  const handleBannerToggle = async (eventId: string, currentStatus: boolean) => {
    const { error } = await supabase.from(getTableName(eventId)).update({ is_banner: !currentStatus }).eq('id', eventId);
    if (!error) fetchAdminData();
  };

  const handleApprovalModeToggle = async (mode: 'auto' | 'manual') => {
    try {
      const { error } = await supabase.from('settings').upsert({
        key: 'app_config',
        value: { approvalMode: mode }
      });
      if (error) throw error;
      setApprovalMode(mode);
    } catch (err) {
      console.error('Update approval mode failed:', err);
    }
  };

  const handleApproveEvent = async (eventId: string) => {
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from(getTableName(eventId))
        .update({ status: 'published' })
        .eq('id', eventId)
        .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('업데이트할 항목을 찾을 수 없거나 권한이 없습니다.');
      }

      await fetchAdminData();
      alert(`성공적으로 승인되었습니다.`);
    } catch (error: any) {
      alert(`승인 중 오류 발생: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm("정말로 이 항목을 영구적으로 삭제하시겠습니까? 관련 데이터(강습 정보, 신청 내역 등)가 모두 삭제됩니다.")) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase.from(getTableName(eventId)).delete().eq('id', eventId);
      if (error) throw error;

      setEvents(prev => prev.filter(e => e.id !== eventId));
      alert(`성공적으로 삭제되었습니다.`);
    } catch (error: any) {
      alert(`삭제 중 오류 발생: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full min-h-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800">
            <button onClick={() => setActiveEventTab('all')} className={clsx("px-4 py-3 font-bold transition-colors text-sm", activeEventTab === 'all' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
              전체
            </button>
            <button onClick={() => setActiveEventTab('pending')} className={clsx("px-4 py-3 font-bold transition-colors text-sm flex items-center gap-2", activeEventTab === 'pending' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
              승인 대기
              {events.filter(e => e.isLesson === onlyLessons && (e.status === 'pending' || e.status === 'draft')).length > 0 && 
                <span className={onlyLessons ? "bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full" : "bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full"}>
                  {events.filter(e => e.isLesson === onlyLessons && (e.status === 'pending' || e.status === 'draft')).length}
                </span>
              }
            </button>
            <button onClick={() => setActiveEventTab('expired')} className={clsx("px-4 py-3 font-bold transition-colors text-sm", activeEventTab === 'expired' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
              기간 만료
            </button>
          </div>

          <div className="flex gap-2">
            <Link 
              to={onlyLessons ? "/create-lesson" : "/create"}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-white shadow-lg transition-all active:scale-95",
                onlyLessons ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20" : "bg-orange-600 hover:bg-orange-700 shadow-orange-500/20"
              )}
            >
              <Plus className="w-3.5 h-3.5" /> {onlyLessons ? '강습 등록' : '행사 등록'}
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button 
            onClick={() => handleApprovalModeToggle('manual')}
            className={clsx(
              "px-3 py-1.5 text-[11px] font-black rounded-lg transition-all",
              approvalMode === 'manual' ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            수동 승인
          </button>
          <button 
            onClick={() => handleApprovalModeToggle('auto')}
            className={clsx(
              "px-3 py-1.5 text-[11px] font-black rounded-lg transition-all",
              approvalMode === 'auto' ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            자동 승인
          </button>
        </div>
      </div>
      
      {/* Table Section: Responsive Layout */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex-1 relative min-h-0 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block absolute inset-0 overflow-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-sm border-b border-slate-200 dark:border-slate-700">
              <tr className="text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-widest">
                <th className="p-5">노출 순서</th>
                <th className="p-5">{onlyLessons ? '강습명' : '행사명'}</th>
                <th className="p-5">주최자</th>
                <th className="p-5">상태</th>
                <th className="p-5">배너</th>
                <th className="p-5">일시</th>
                <th className="p-5">참석</th>
                <th className="p-5 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {events.filter(e => {
                const matchesType = e.isLesson === onlyLessons;
                if (!matchesType) return false;

                const isExpired = new Date(e.date) < new Date();
                if (activeEventTab === 'all') return true;
                if (activeEventTab === 'pending') return e.status === 'pending' || e.status === 'draft';
                if (activeEventTab === 'expired') return isExpired || e.status === 'expired';
                return true;
              }).length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-20 text-center text-slate-400 font-bold">
                    표시할 {onlyLessons ? '강습' : '행사'}이 없습니다.
                  </td>
                </tr>
              ) : (
                events.filter(e => {
                  const matchesType = e.isLesson === onlyLessons;
                  if (!matchesType) return false;

                  const isExpired = new Date(e.date) < new Date();
                  if (activeEventTab === 'all') return true;
                  if (activeEventTab === 'pending') return e.status === 'pending' || e.status === 'draft';
                  if (activeEventTab === 'expired') return isExpired || e.status === 'expired';
                  return true;
                }).map(event => {
                  const dateObj = safeDate(event.date);
                  const isPendingApproval = event.status === 'pending' || event.status === 'draft';
                  const isExpired = new Date(event.date) < new Date();
                  
                  return (
                    <tr key={event.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handlePriorityChange(event.id, (event.priority || 0) + 1)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-black text-indigo-600 dark:text-indigo-400 text-xs shadow-sm bg-indigo-50 dark:bg-indigo-900/20 py-1 rounded-md">
                            {event.priority || 0}
                          </span>
                          <button 
                            onClick={() => handlePriorityChange(event.id, Math.max(0, (event.priority || 0) - 1))}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                           <TypeBadge isLesson={event.isLesson} className="!text-[10px] px-2 py-0.5" />
                           <span className="font-black text-slate-800 dark:text-white text-sm truncate max-w-[200px]">{event.title}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 text-sm font-bold">{event.hostName}</td>
                      <td className="p-4">
                        <span className={clsx("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight",
                          event.status === 'published' && !isExpired ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' :
                          isPendingApproval ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        )}>
                          {isPendingApproval ? '승인 대기' : isExpired ? '기간 만료' : '진행 중'}
                        </span>
                      </td>
                      <td className="p-4">
                        <button 
                          onClick={() => handleBannerToggle(event.id, !!event.isBanner)}
                          className={clsx(
                            "w-12 py-1 rounded-lg text-[10px] font-black transition-all shadow-sm border",
                            event.isBanner 
                              ? "bg-indigo-600 text-white border-indigo-600" 
                              : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                          )}
                        >
                          {event.isBanner ? "ON" : "OFF"}
                        </button>
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 text-[11px] font-bold leading-tight">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">시작</span> {format(dateObj, 'yy.MM.dd', { locale: ko })}
                        </div>
                        {event.endDate && (
                          <div className="flex items-center gap-1 mt-1 font-medium">
                            <span className="text-slate-400">종료</span> {format(new Date(event.endDate), 'yy.MM.dd', { locale: ko })}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                          {event.currentAttendees || 0} / {event.maxAttendees || 0}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isPendingApproval && (
                            <button 
                              onClick={() => handleApproveEvent(event.id)}
                              className="text-white font-black text-[11px] px-3 py-2 bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                            >
                              승인하기
                            </button>
                          )}
                          <Link to={event.isLesson ? `/edit-lesson/${event.id}` : `/edit/${event.id}`} className="text-slate-600 dark:text-slate-400 font-black text-[11px] px-3 py-2 border border-slate-100 dark:border-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center gap-1.5">
                            <Edit className="w-3.5 h-3.5" /> 수정
                          </Link>
                          <Link to={`/event/${event.id}`} className="text-indigo-600 font-black text-[11px] px-3 py-2 border border-indigo-100 dark:border-indigo-900/40 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all">
                            보기
                          </Link>
                          <button 
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden absolute inset-0 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {events.filter(e => {
            const matchesType = e.isLesson === onlyLessons;
            if (!matchesType) return false;

            const isExpired = new Date(e.date) < new Date();
            if (activeEventTab === 'all') return true;
            if (activeEventTab === 'pending') return e.status === 'pending' || e.status === 'draft';
            if (activeEventTab === 'expired') return isExpired || e.status === 'expired';
            return true;
          }).length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
              <span className="text-slate-400 font-black text-sm">데이터가 없습니다.</span>
            </div>
          ) : (
            events.filter(e => {
              const matchesType = e.isLesson === onlyLessons;
              if (!matchesType) return false;

              const isExpired = new Date(e.date) < new Date();
              if (activeEventTab === 'all') return true;
              if (activeEventTab === 'pending') return e.status === 'pending' || e.status === 'draft';
              if (activeEventTab === 'expired') return isExpired || e.status === 'expired';
              return true;
            }).map(event => {
              const dateObj = safeDate(event.date);
              const isPendingApproval = event.status === 'pending' || event.status === 'draft';
              const isExpired = new Date(event.date) < new Date();

              return (
                <motion.div 
                  layout
                  key={event.id}
                  className="bg-white dark:bg-slate-900 rounded-[24px] p-5 border border-slate-100 dark:border-slate-800 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                         <TypeBadge isLesson={event.isLesson} className="!text-[10px] px-2" />
                         <span className={clsx("px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter",
                           event.status === 'published' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                         )}>
                           {event.status}
                         </span>
                      </div>
                      <h4 className="font-black text-slate-800 dark:text-white text-base leading-tight truncate">{event.title}</h4>
                      <p className="text-xs text-slate-500 font-bold flex items-center gap-1">
                        <span className="text-slate-400">Host:</span> {event.hostName || 'Unknown'}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-700 ml-3">
                       <button onClick={() => handlePriorityChange(event.id, (event.priority || 0) + 1)} className="p-1 hover:text-indigo-600"><ArrowUp className="w-3 h-3" /></button>
                       <span className="text-[11px] font-black text-indigo-600">{event.priority || 0}</span>
                       <button onClick={() => handlePriorityChange(event.id, Math.max(0, (event.priority || 0) - 1))} className="p-1 hover:text-rose-600"><ArrowDown className="w-3 h-3" /></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-5">
                     <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">일시</p>
                        <p className="text-xs font-black text-slate-700 dark:text-slate-200">{format(dateObj, 'yy.MM.dd', { locale: ko })}</p>
                     </div>
                     <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">참석</p>
                        <p className="text-xs font-black text-slate-700 dark:text-slate-200">{event.currentAttendees || 0} / {event.maxAttendees || 0}</p>
                     </div>
                     <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between col-span-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">배너 노출</p>
                        <button 
                          onClick={() => handleBannerToggle(event.id, !!event.isBanner)}
                          className={clsx(
                            "w-full py-2 rounded-lg text-[10px] font-black transition-all border",
                            event.isBanner ? "bg-indigo-600 text-white border-indigo-600" : "bg-white dark:bg-slate-800 text-slate-400"
                          )}
                        >
                          {event.isBanner ? "ON" : "OFF"}
                        </button>
                     </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPendingApproval && (
                      <button 
                        onClick={() => handleApproveEvent(event.id)}
                        className="flex-1 py-3 bg-emerald-600 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                      >
                        승인 완료하기
                      </button>
                    )}
                    <Link 
                      to={event.isLesson ? `/edit-lesson/${event.id}` : `/edit/${event.id}`}
                      className={clsx(
                        "flex-1 py-3 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-black text-xs rounded-xl border border-indigo-100 dark:border-indigo-900/30 text-center shadow-sm",
                        !isPendingApproval && "flex-[2]"
                      )}
                    >
                      상세 수정
                    </Link>
                    <button 
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};
