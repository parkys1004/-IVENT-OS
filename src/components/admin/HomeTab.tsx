import React, { useState } from 'react';
import { ShieldAlert, Key, Database, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { UserProfile } from '../../context/AuthContext';
import { supabase } from '../../supabase';

interface HomeTabProps {
  dbHealth: Record<string, any>;
  fetchAdminData: () => Promise<void>;
  profile: UserProfile | null;
  users: UserProfile[];
  events: any[];
  pendingUsers: number;
  pendingRegularEvents: number;
  pendingLessons: number;
  viewMode: string;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  dbHealth,
  fetchAdminData,
  profile,
  users,
  events,
  pendingUsers,
  pendingRegularEvents,
  pendingLessons,
  viewMode
}) => {
  const [loading, setLoading] = useState(false);

  const handleMigration = async () => {
    if (!window.confirm('기존 데이터를 신규 분리 테이블로 마이그레이션하시겠습니까? (이 작업은 되돌릴 수 없습니다)')) return;
    
    setLoading(true);
    try {
      let log = '';

      // 1. Migrate Lessons (events -> classes)
      const { data: legacyLessons, error: lError } = await supabase
        .from('events')
        .select('*')
        .eq('is_lesson', true);
      
      if (lError) throw new Error(`강습 로드 실패: ${lError.message}`);
      
      if (legacyLessons && legacyLessons.length > 0) {
        log += `추출된 구 강습 데이터: ${legacyLessons.length}건\n`;
        const classEntries = legacyLessons.map(e => ({
          id: e.id,
          title: e.title,
          instructor_id: e.host_id,
          level: (e.metadata as any)?.level || 'all',
          category: e.category,
          start_date: e.date,
          end_date: e.end_date || (e.metadata as any)?.endDate || e.date,
          class_time: (e as any).time || '저녁',
          price: (e.metadata as any)?.tickets?.[0]?.price || 0,
          location_name: e.location_name,
          address: (e.metadata as any)?.formattedAddress || '',
          lat: (e.metadata as any)?.geoPoint?.lat,
          lng: (e.metadata as any)?.geoPoint?.lng,
          created_at: e.created_at
        }));

        const { error: cError } = await supabase.from('classes').upsert(classEntries);
        if (cError) throw new Error(`실제 마이그레이션 실패 (classes): ${cError.message}`);
        log += `✅ 강습 테이블 마이그레이션 완료\n`;
      } else {
        log += `마이그레이션할 강습 데이터가 없습니다.\n`;
      }

      // 2. Migrate Professionals (profiles -> specialized tables)
      const { data: pros, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['instructor', 'dj', 'media']);
      
      if (pError) throw new Error(`전문가 로드 실패: ${pError.message}`);

      if (pros && pros.length > 0) {
        const instructors = pros.filter(p => p.role === 'instructor').map(p => ({
          id: p.id,
          specialty_genres: p.specialties ? p.specialties.split(',').map((s: string) => s.trim()) : [],
          bio: (p as any).description || '',
          updated_at: new Date().toISOString()
        }));

        const djs = pros.filter(p => p.role === 'dj').map(p => ({
          id: p.id,
          music_style: p.specialties ? p.specialties.split(',').map((s: string) => s.trim()) : [],
          updated_at: new Date().toISOString()
        }));

        const creators = pros.filter(p => p.role === 'media').map(p => ({
          id: p.id,
          category: 'both',
          updated_at: new Date().toISOString()
        }));

        if (instructors.length > 0) await supabase.from('instructors').upsert(instructors);
        if (djs.length > 0) await supabase.from('djs').upsert(djs);
        if (creators.length > 0) await supabase.from('creators').upsert(creators);

        log += `✅ 전문가 테이블 (${instructors.length + djs.length + creators.length}명) 초기화 완료\n`;
      }

      alert(`마이그레이션 성공!\n\n${log}`);
      fetchAdminData();
    } catch (error: any) {
      console.error("Migration fatal error:", error);
      alert(`마이그레이션 중 치명적 오류 발생: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 overflow-y-auto no-scrollbar">
      <div className="flex justify-between items-center bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-600/20">
        <div>
          <h3 className="text-xl font-black mb-1 flex items-center gap-2">
            <Database className="w-6 h-6" /> 시스템 데이터 관리
          </h3>
          <p className="text-indigo-100 text-sm font-medium">기존 데이터를 신규 구조로 이전하거나 정리합니다.</p>
        </div>
        <button 
          onClick={handleMigration}
          disabled={loading}
          className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          데이터 마이그레이션 실행
        </button>
      </div>
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 pb-px">
        <button className="px-4 py-3 font-bold text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white">종합 현황</button>
        <button className="px-4 py-3 font-bold text-slate-400 hover:text-slate-600 transition-colors">데이터베이스 자가진단</button>
      </div>

      {/* Database Health Check Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
             <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
               <ShieldAlert className="w-5 h-5 text-indigo-500" /> DB 자가진단 (Database Health)
             </h3>
             <button onClick={fetchAdminData} className="text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded">Re-check</button>
          </div>
          <div className="space-y-3">
             {Object.entries(dbHealth).map(([table, health]: [string, any]) => (
                <div key={table} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                   <div className="flex items-center gap-3">
                     <div className={clsx(
                       "w-2 h-2 rounded-full animate-pulse",
                       health.status === 'ok' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-none' : 
                       health.status === 'error' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-amber-500'
                     )}></div>
                     <span className="text-sm font-bold text-slate-700 dark:text-slate-300 capitalize">{table === 'promo_banners' ? 'banners' : table} table</span>
                   </div>
                   <div className="flex items-center gap-2">
                     {health.status === 'ok' ? (
                       <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded">정상 연결됨</span>
                     ) : health.status === 'error' ? (
                       <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded" title={health.message}>연결 실패 (SQL 필요)</span>
                     ) : (
                       <span className="text-[10px] font-black text-slate-400 italic">Cheking...</span>
                     )}
                   </div>
                </div>
             ))}
          </div>
          {Object.values(dbHealth).some((h: any) => h.status === 'error') && (
            <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
               <p className="text-xs text-orange-800 dark:text-orange-300 leading-relaxed font-medium">
                 일부 테이블에 연결할 수 없습니다. <strong>SUPABASE_SCHEMA.sql</strong> 파일의 내용을 복사하여 Supabase SQL Editor에서 실행해 주세요.
               </p>
            </div>
          )}
        </div>

        {/* User Auth Info Diagnostics */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
           <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 mb-4">
             <Key className="w-5 h-5 text-amber-500" /> 현재 계정 권한 정보
           </h3>
           <div className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">내 역할 (Role)</span>
                    <span className="px-2 py-0.5 bg-amber-600 text-white text-[10px] font-black rounded uppercase">{profile?.role || 'Guest'}</span>
                 </div>
                 <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80">
                   {profile?.role === 'admin' 
                     ? '현재 관리자 권한으로 로그인되어 모든 시스템 데이터를 볼 수 있습니다.' 
                     : '현재 계정은 관리자 권한이 아닙니다. profiles 테이블에서 role을 admin으로 변경해야 합니다.'}
                 </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                    <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">Profile Sync</div>
                    <div className={clsx("text-xs font-black", profile ? "text-emerald-500" : "text-rose-500")}>
                       {profile ? 'Synced' : 'None'}
                    </div>
                 </div>
                 <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                    <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">View Mode</div>
                    <div className="text-xs font-black text-indigo-500 uppercase tracking-tighter">
                       {viewMode}
                    </div>
                 </div>
              </div>
           </div>
        </div>
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
          <div className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-2">승인 대기 행사/강습</div>
          <div className="text-3xl font-black text-emerald-600">{pendingRegularEvents + pendingLessons}<span className="text-sm font-normal text-slate-500 ml-1">건</span></div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm h-64 flex items-center justify-center text-slate-400">
        (여기에 실시간 방문자 트래픽 차트가 들어갑니다)
      </div>
    </div>
  );
};
