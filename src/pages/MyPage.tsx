import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Settings, Save, AtSign, ShieldCheck, Ticket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Link } from 'react-router-dom';

import TypeBadge from '../components/TypeBadge';

export default function MyPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);

  useEffect(() => {
    if (profile?.displayName) {
      setDisplayName(profile.displayName);
    }
  }, [profile?.displayName]);

  useEffect(() => {
    async function fetchRegistrations() {
      if (!user) return;
      setLoadingRegs(true);
      try {
        const { data, error } = await supabase
          .from('registrations')
          .select(`
            id,
            status,
            registered_at,
            event_id,
            event:events (
              title,
              date,
              is_lesson
            )
          `)
          .eq('user_id', user.id)
          .order('registered_at', { ascending: false });

        if (error) throw error;
        
        const mappedRegs = data?.map((reg: any) => ({
          id: reg.id,
          eventId: reg.event_id,
          status: reg.status,
          registeredAt: reg.registered_at,
          eventTitle: reg.event?.title || '알 수 없는 행사',
          eventDate: reg.event?.date,
          isLesson: reg.event?.is_lesson || false,
        })) || [];
        
        setRegistrations(mappedRegs);
      } catch (error) {
        console.error("Error fetching registrations:", error);
      } finally {
        setLoadingRegs(false);
      }
    }
    
    if (user?.id) {
       fetchRegistrations();
    }
  }, [user?.id]);

  if (!user || !profile) {
    return <div className="p-20 text-center text-slate-500">로그인이 필요합니다.</div>;
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', user.id);
      
      if (error) throw error;
      
      await refreshProfile();
      setSaveMessage('프로필이 성공적으로 업데이트되었습니다.');
    } catch (error) {
      console.error(error);
      setSaveMessage('업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">마이페이지 & 계정 설정</h1>
          <p className="text-slate-500 dark:text-slate-400 text-[14px]">프로필 정보를 수정하고 참가 내역을 확인하세요.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Settings */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel rounded-[20px] overflow-hidden">
             <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
               <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                 <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                 내 계정 정보
               </h2>
             </div>
             <form onSubmit={handleUpdateProfile} className="p-6 space-y-5">
               <div className="flex flex-col items-center mb-6">
                 {profile.photoURL ? (
                    <img src={profile.photoURL} alt="Profile" className="w-20 h-20 rounded-full mb-3 shadow-sm border border-slate-200 dark:border-slate-700" referrerPolicy="no-referrer" />
                 ) : (
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                      <User className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    </div>
                 )}
                 <span className="text-[11px] px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold rounded-md uppercase tracking-wider">
                   {profile.role === 'admin' ? '관리자' : profile.role === 'host' ? '주최자' : '참여자'}
                 </span>
               </div>

               <div>
                 <label className="block text-[13px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                   <AtSign className="w-3.5 h-3.5" /> 이메일 (변경 불가)
                 </label>
                 <input 
                   type="text" 
                   value={user.email || ''} 
                   disabled 
                   className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 text-sm focus:outline-none"
                 />
               </div>

               <div>
                 <label className="block text-[13px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">닉네임 / 이름</label>
                 <input 
                   type="text" 
                   value={displayName} 
                   onChange={(e) => setDisplayName(e.target.value)}
                   className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                   placeholder="이름을 입력하세요"
                 />
               </div>
               
               <button 
                 type="submit" 
                 disabled={isSaving}
                 className="w-full flex items-center justify-center gap-2 bg-slate-800 dark:bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-slate-900 dark:hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
               >
                 {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Save className="w-4 h-4" />}
                 {isSaving ? '저장 중...' : '변경사항 저장'}
               </button>
               <AnimatePresence>
                 {saveMessage && (
                   <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400 text-center mt-2">
                     {saveMessage}
                   </motion.div>
                 )}
               </AnimatePresence>
             </form>
          </div>
        </div>

        {/* Activity / Registrations */}
        <div className="lg:col-span-2">
          <div className="glass-panel rounded-[20px] overflow-hidden h-full">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
               <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                 <Ticket className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                 나의 행사 예매 내역
               </h2>
            </div>
            <div className="p-0">
               {profile.role === 'host' && registrations.length === 0 ? (
                 <div className="p-16 text-center text-slate-500 dark:text-slate-400">
                    <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="font-medium">주최자 계정입니다.</p>
                    <p className="text-sm mt-1">행사 관리는 메인 대시보드에서 진행해주세요.</p>
                 </div>
               ) : loadingRegs ? (
                 <div className="p-16 text-center">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
                 </div>
               ) : registrations.length === 0 ? (
                 <div className="p-16 text-center text-slate-500 dark:text-slate-400">
                    <Ticket className="w-12 h-12 mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                    <p className="font-medium text-slate-600 dark:text-slate-300 mb-1">참여 신청한 행사가 없습니다.</p>
                    <Link to="/" className="text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:underline">행사 둘러보기</Link>
                 </div>
               ) : (
                 <div className="divide-y divide-slate-100 dark:divide-slate-800">
                   {registrations.map(reg => {
                     const dateObj = reg.eventDate ? new Date(reg.eventDate) : null;
                     const regDateObj = reg.registeredAt ? new Date(reg.registeredAt) : new Date();

                     return (
                       <div key={reg.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                         <div>
                            <div className="flex items-center gap-2 mb-1">
                               <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
                                  {reg.status === 'confirmed' ? '예매 완료' : '취소됨'}
                               </span>
                               <span className="text-[12px] text-slate-400 dark:text-slate-500">
                                  예매일: {format(regDateObj, 'yyyy.MM.dd', { locale: ko })}
                               </span>
                            </div>
                            <Link to={`/event/${reg.eventId}`} className="font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-[16px] transition-colors flex items-center">
                              <TypeBadge isLesson={reg.isLesson} />
                              {reg.eventTitle}
                            </Link>
                            {dateObj && (
                              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                                행사일: {format(dateObj, 'yyyy년 M월 d일 (E) a h:mm', { locale: ko })}
                              </p>
                            )}
                         </div>
                         <div className="shrink-0">
                           <Link to={`/event/${reg.eventId}`} className="inline-block px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-lg hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                             행사 상세 보기
                           </Link>
                         </div>
                       </div>
                     )
                   })}
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
