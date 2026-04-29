import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Settings, Save, AtSign, ShieldCheck, Ticket, Coins, Clock, TrendingUp, History, ChevronRight, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { uploadImageToStorage } from '../lib/storage';

import TypeBadge from '../components/TypeBadge';

export default function MyPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [pointHistory, setPointHistory] = useState<any[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const profilePictureInputRef = useRef<HTMLInputElement>(null);

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsSaving(true);
    try {
      // 1. Upload to Supabase Storage using helper
      const publicUrl = await uploadImageToStorage(file, 'profiles');

      // 2. Update Profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      setSaveMessage('프로필 사진이 변경되었습니다.');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('사진 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  useEffect(() => {
    if (profile?.displayName) {
      setDisplayName(profile.displayName);
    }
  }, [profile?.displayName]);

  useEffect(() => {
    async function fetchPoints() {
      if (!user) return;
      setLoadingPoints(true);
      try {
        const { data, error } = await supabase
          .from('point_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setPointHistory(data || []);
      } catch (err) {
        console.error("Error fetching points:", err);
      } finally {
        setLoadingPoints(false);
      }
    }

    async function fetchRegistrations() {
      if (!user) return;
      setLoadingRegs(true);
      try {
        const { data: regsData, error: regsError } = await supabase
          .from('registrations')
          .select('*')
          .eq('user_id', user.id)
          .order('registered_at', { ascending: false });

        if (regsError) throw regsError;
        
        if (!regsData || regsData.length === 0) {
          setRegistrations([]);
          return;
        }

        // Fetch parties and lessons for these registrations
        const eventIds = regsData.map(r => r.event_id);
        
        const [partiesRes, lessonsRes] = await Promise.all([
          supabase.from('parties').select('*').in('id', eventIds),
          supabase.from('lessons').select('*').in('id', eventIds)
        ]);

        const partiesMap: Record<string, any> = {};
        partiesRes.data?.forEach(p => partiesMap[p.id] = { ...p, isLesson: false });
        
        const lessonsMap: Record<string, any> = {};
        lessonsRes.data?.forEach(l => lessonsMap[l.id] = { ...l, isLesson: true });

        const mappedRegs = regsData.map((reg: any) => {
          const eventInfo = partiesMap[reg.event_id] || lessonsMap[reg.event_id];
          
          if (!eventInfo) {
            return {
              id: reg.id,
              eventId: reg.event_id,
              status: reg.status,
              registeredAt: reg.registered_at,
              eventTitle: '알 수 없는 행사',
              eventDate: null,
              isLesson: false,
            };
          }
          
          return {
            id: reg.id,
            eventId: reg.event_id,
            status: reg.status,
            registeredAt: reg.registered_at,
            eventTitle: eventInfo.title,
            eventDate: eventInfo.date || (eventInfo as any).start_date,
            isLesson: eventInfo.isLesson,
          };
        });
        
        setRegistrations(mappedRegs);
      } catch (error) {
        console.error("Error fetching registrations:", error);
      } finally {
        setLoadingRegs(false);
      }
    }
    
    if (user?.id) {
       fetchRegistrations();
       fetchPoints();
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

  const handleWithdrawal = async () => {
    const confirm1 = window.confirm('정말 탈퇴하시겠습니까? 등록하신 파티와 강습 구인글은 유지되지만, 그 외 모든 활동 내역(포인트, 댓글, 게시글 등)은 영구 삭제됩니다.');
    if (!confirm1) return;
    
    const confirm2 = window.confirm('마지막 확인입니다. 정말로 계정을 삭제하고 모든 데이터를 정리하시겠습니까?');
    if (!confirm2) return;

    setIsSaving(true);
    try {
      // 1. Delete profile record (triggers cascades)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
      
      if (error) throw error;

      // 2. Sign out
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error("Withdrawal failed:", error);
      alert('탈퇴 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8 pb-20">
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
                 <div className="relative group cursor-pointer" onClick={() => profilePictureInputRef.current?.click()}>
                   {profile.photoURL ? (
                      <img src={profile.photoURL} alt="Profile" className="w-24 h-24 rounded-full mb-3 shadow-md border-2 border-white dark:border-slate-700 object-cover" referrerPolicy="no-referrer" />
                   ) : (
                      <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3 border-2 border-white dark:border-slate-700 shadow-sm">
                        <User className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                      </div>
                   )}
                   <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity mb-3">
                     <Camera className="w-6 h-6 text-white" />
                   </div>
                 </div>
                 <input 
                   type="file"
                   ref={profilePictureInputRef}
                   onChange={handleProfilePictureChange}
                   accept="image/*"
                   className="hidden"
                 />
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

               <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                 <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3 text-center">
                   계정을 삭제하고 모든 활동 데이터를 정리하시겠습니까?<br/>
                   (등록하신 파티/강습은 유지됩니다)
                 </p>
                 <button 
                   type="button" 
                   onClick={handleWithdrawal}
                   disabled={isSaving}
                   className="w-full flex items-center justify-center gap-2 text-rose-500 dark:text-rose-400 text-[13px] font-bold hover:bg-rose-50 dark:hover:bg-rose-900/20 py-2.5 rounded-xl transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50"
                 >
                   탈퇴하기 (계정 삭제)
                 </button>
               </div>
             </form>
          </div>
        </div>

        {/* Points & Activity / Registrations */}
        <div className="lg:col-span-2 space-y-8">
          {/* Points Summary Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-800 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-32 -translate-y-32 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-10">
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                  <Coins className="w-5 h-5 text-amber-300" />
                  <span className="text-sm font-black tracking-tight">MY POINTS</span>
                </div>
                <Link to="/community" className="text-[11px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg border border-white/10 transition-colors">
                  Get More Points
                </Link>
              </div>

              <div className="flex items-end gap-3 mb-2">
                <span className="text-6xl font-black tracking-tighter leading-none">
                  {profile.points?.toLocaleString() || '0'}
                </span>
                <span className="text-xl font-bold opacity-60 mb-1">P</span>
              </div>
              <p className="text-indigo-100/60 font-medium text-sm">현재 사용 가능한 전체 포인트입니다.</p>
              
              <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-indigo-200/50">Total Earned</p>
                  <p className="text-lg font-black">+{pointHistory.filter(h => h.amount > 0).reduce((acc, c) => acc + c.amount, 0).toLocaleString()} P</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-indigo-200/50">Total Spent</p>
                  <p className="text-lg font-black">-{Math.abs(pointHistory.filter(h => h.amount < 0).reduce((acc, c) => acc + c.amount, 0)).toLocaleString()} P</p>
                </div>
              </div>
            </div>
          </div>

          {/* Point History */}
          <div className="glass-panel rounded-[32px] overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20">
              <h2 className="font-black text-xl text-slate-800 dark:text-white flex items-center gap-3">
                <History className="w-6 h-6 text-indigo-600" />
                적립/사용 내역
              </h2>
            </div>
            <div className="p-4 sm:p-8">
              {loadingPoints ? (
                <div className="py-12 flex justify-center">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : pointHistory.length > 0 ? (
                <div className="space-y-4">
                  {pointHistory.slice(0, 5).map((history) => (
                    <div key={history.id} className="flex items-center justify-between p-5 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl hover:border-indigo-200 dark:hover:border-indigo-900/30 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className={clsx(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shrink-0",
                          history.amount > 0 
                            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100" 
                            : "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 group-hover:bg-rose-100"
                        )}>
                          {history.amount > 0 ? <TrendingUp className="w-5 h-5" /> : <ChevronRight className="w-5 h-5 rotate-90" />}
                        </div>
                        <div>
                          <p className="text-[15px] font-black text-slate-800 dark:text-white leading-tight mb-1">{history.reason}</p>
                          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <Clock className="w-3 h-3" />
                            {format(new Date(history.created_at), 'yyyy.MM.dd HH:mm')}
                          </div>
                        </div>
                      </div>
                      <div className={clsx(
                        "text-lg font-[950] tracking-tighter shrink-0",
                        history.amount > 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {history.amount > 0 ? `+${history.amount}` : history.amount}
                      </div>
                    </div>
                  ))}
                  {pointHistory.length > 5 && (
                    <p className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest pt-2">Showing last 5 records</p>
                  )}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-300 italic font-bold">포인트 내역이 없습니다. 활동을 시작해보세요!</div>
              )}
            </div>
          </div>

          <div className="glass-panel rounded-[20px] overflow-hidden">
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
