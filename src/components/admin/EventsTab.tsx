import React, { useState } from 'react';
import { ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
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

  const handlePriorityChange = async (tableName: any, id: string, priority: number) => {
    const { error } = await supabase.from(tableName).update({ priority }).eq('id', id);
    if (!error) fetchAdminData();
  };

  const handleBannerToggle = async (eventId: string, currentStatus: boolean) => {
    const { error } = await supabase.from('events').update({ is_banner: !currentStatus }).eq('id', eventId);
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
      const event = events.find(e => e.id === eventId);
      const tableName = event?.isLesson ? 'classes' : 'events';

      const { error } = await supabase.from(tableName).update({ status: 'published' }).eq('id', eventId);
      if (error) throw error;

      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: 'published' } : e));
      alert(`${event?.isLesson ? '강습' : '행사'}가 승인되었습니다.`);
    } catch (error: any) {
      alert(`승인 중 오류 발생: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full min-h-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
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
      
      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex-1 relative min-h-0">
        <div className="absolute inset-0 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-sm">
              <tr className="text-slate-500 dark:text-slate-400 text-[12px] uppercase tracking-wider">
                <th className="p-4 font-bold">노출 순서</th>
                <th className="p-4 font-bold">{onlyLessons ? '강습명' : '행사명'}</th>
                <th className="p-4 font-bold">주최자</th>
                <th className="p-4 font-bold">상태</th>
                <th className="p-4 font-bold">배너</th>
                <th className="p-4 font-bold">일시</th>
                <th className="p-4 font-bold text-right">관리</th>
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
              }).map(event => {
                const dateObj = safeDate(event.date);
                const isPendingApproval = event.status === 'pending' || event.status === 'draft';
                const isExpired = new Date(event.date) < new Date();
                
                return (
                  <tr key={event.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handlePriorityChange('events', event.id, (event.priority || 0) + 1)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-bold text-indigo-600 text-xs">
                          {event.priority || 0}
                        </span>
                        <button 
                          onClick={() => handlePriorityChange('events', event.id, Math.max(0, (event.priority || 0) - 1))}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-rose-600"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                      <TypeBadge isLesson={event.isLesson} />
                      <span className="truncate max-w-[200px]">{event.title}</span>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 text-sm font-medium">{event.hostName}</td>
                    <td className="p-4">
                      <span className={clsx("px-2 py-1 rounded-md text-[10px] font-bold",
                        event.status === 'published' && !isExpired ? 'bg-emerald-100 text-emerald-700' :
                        isPendingApproval ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      )}>
                        {isPendingApproval ? '승인 대기' : isExpired ? '기간 만료' : '진행 중'}
                      </span>
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => handleBannerToggle(event.id, !!event.isBanner)}
                        className={clsx(
                          "px-2 py-1 rounded-md text-[10px] font-bold transition-colors",
                          event.isBanner 
                            ? "bg-indigo-600 text-white" 
                            : "bg-slate-100 text-slate-400 dark:bg-slate-800 hover:bg-slate-200 shadow-sm"
                        )}
                      >
                        {event.isBanner ? "ON" : "OFF"}
                      </button>
                    </td>
                    <td className="p-4 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                      {format(dateObj, 'yy.MM.dd', { locale: ko })}
                      {event.endDate && (
                        <>
                          <br />
                          ~ {format(new Date(event.endDate), 'yy.MM.dd', { locale: ko })}
                        </>
                      )}
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      {isPendingApproval && (
                        <button 
                          onClick={() => handleApproveEvent(event.id)}
                          className="text-white font-black text-[11px] px-3 py-1.5 bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                        >
                          승인하기
                        </button>
                      )}
                      <Link to={`/event/${event.id}`} className="text-indigo-600 font-bold hover:text-white text-xs px-3 py-1.5 border border-indigo-200 hover:bg-indigo-600 rounded-lg transition-all">
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
};
