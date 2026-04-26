import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion } from 'motion/react';
import { CalendarDays, Users, BarChart3, PlusCircle, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface EventData {
  id: string;
  title: string;
  category: string;
  date: string;
  currentAttendees: number;
  maxAttendees: number;
  status: string;
}

export default function HostDashboard() {
  const { user, profile } = useAuth();
  const [myEvents, setMyEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchEvents = async () => {
      try {
        const [partiesRes, lessonsRes] = await Promise.all([
          supabase.from('parties').select('*').eq('host_id', user.id).order('created_at', { ascending: false }),
          supabase.from('lessons').select('*').eq('host_id', user.id).order('created_at', { ascending: false })
        ]);

        if (partiesRes.error) throw partiesRes.error;
        if (lessonsRes.error) throw lessonsRes.error;
        
        const mappedParties = (partiesRes.data || []).map(p => ({
          id: p.id,
          title: p.title,
          category: p.category,
          date: p.date || (p as any).start_date,
          currentAttendees: p.current_attendees || 0,
          maxAttendees: (p.metadata as any)?.maxAttendees || p.max_attendees || (p as any).capacity || 0,
          status: p.status,
          isLesson: false
        }));

        const mappedLessons = (lessonsRes.data || []).map(l => ({
          id: l.id,
          title: l.title,
          category: l.category,
          date: l.date || (l as any).start_date,
          currentAttendees: l.current_attendees || 0,
          maxAttendees: (l.metadata as any)?.maxAttendees || l.max_attendees || (l as any).capacity || 0,
          status: l.status,
          isLesson: true
        }));

        setMyEvents([...mappedParties, ...mappedLessons]);
      } catch (error) {
        console.error("Error fetching host events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [user]);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  const totalAttendees = myEvents.reduce((sum, e) => sum + (e.currentAttendees || 0), 0);
  const activeEvents = myEvents.filter(e => e.status === 'published').length;

  return (
    <div className="w-full space-y-8 pb-20">
      
      {/* Header section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="text-center sm:text-left z-10 flex-1">
          <p className="text-orange-500 font-bold mb-1">{profile?.displayName || '주최자'}님, 오늘도 멋진 행사를 준비해보세요! 🎉</p>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-2">현재 {activeEvents}개의 행사를 진행 중입니다</h1>
          <p className="text-slate-500 dark:text-slate-400">
            예매율, 방문자 통계 등을 한눈에 확인하고 이벤트를 관리하세요.
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mr-5">
             <CalendarDays className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <div className="text-slate-500 text-sm font-bold mb-1">총 운영 중인 행사</div>
            <div className="text-3xl font-extrabold text-slate-800">{activeEvents}건</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mr-5">
             <Users className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <div className="text-slate-500 text-sm font-bold mb-1">총 누적 참여자</div>
            <div className="text-3xl font-extrabold text-slate-800">{totalAttendees}명</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-center gap-2">
           <Link to="/scan-tickets" className="flex items-center justify-center gap-3 bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition active:scale-95 shadow-xl shadow-indigo-300 border-2 border-indigo-400">
             <Camera className="w-6 h-6"/>
             입장 스캐너 열기
           </Link>
           <Link to="/create" className="flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition active:scale-95 shadow-lg shadow-indigo-100">
             <PlusCircle className="w-5 h-5"/>
             새 행사 만들기
           </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-800">내가 주최한 행사 목록</h2>
        </div>
        
        {myEvents.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
             <BarChart3 className="w-16 h-16 mx-auto text-slate-300 mb-4" />
             <p className="text-lg font-medium text-slate-700 mb-2">아직 주최한 행사가 없습니다.</p>
             <p>새로운 행사를 만들고 참가자들을 모집해보세요!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[13px] uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 font-bold">행사명</th>
                  <th className="p-4 font-bold">카테고리</th>
                  <th className="p-4 font-bold">일시</th>
                  <th className="p-4 font-bold">상태</th>
                  <th className="p-4 font-bold text-center">참여자 / 정원</th>
                  <th className="p-4 font-bold text-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {myEvents.map(event => {
                  const dateObj = event.date ? new Date(event.date) : new Date();
                  const fillPercentage = event.maxAttendees > 0 ? Math.min(Math.round((event.currentAttendees / event.maxAttendees) * 100), 100) : 0;
                  
                  return (
                    <tr key={event.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{event.title}</td>
                      <td className="p-4 text-slate-600"><span className="bg-slate-100 px-3 py-1 rounded-full text-xs">{event.category}</span></td>
                      <td className="p-4 text-slate-600">{format(dateObj, 'yyyy.MM.dd (E)', { locale: ko })}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-md text-xs font-bold ${event.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                          {event.status === 'published' ? '진행중' : '임시저장'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3 justify-center">
                          <span className="text-sm font-medium">{event.currentAttendees} / {event.maxAttendees}</span>
                          <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${fillPercentage}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <Link to={event.isLesson ? `/edit-lesson/${event.id}` : `/edit/${event.id}`} className="text-indigo-600 font-bold hover:text-indigo-800 text-sm px-3 py-1.5 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors mr-2">
                          수정
                        </Link>
                        <Link to={`/event/${event.id}`} className="text-slate-600 font-bold hover:text-slate-800 text-sm px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                          보기
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
