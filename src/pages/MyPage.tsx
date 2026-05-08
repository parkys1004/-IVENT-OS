import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Settings, Save, AtSign, ShieldCheck, Ticket, Coins, Clock, TrendingUp, History, ChevronRight, Camera, Instagram, Facebook, MessageCircle, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { uploadImageToStorage } from '../lib/storage';

import TypeBadge from '../components/TypeBadge';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export default function MyPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [kakaoId, setKakaoId] = useState('');
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
      const publicUrl = await uploadImageToStorage(file, 'profiles');
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
    if (profile) {
      setDisplayName(profile.displayName || '');
      setGender(profile.gender as any || null);
      setInstagramUrl(profile.instagram_url || '');
      setFacebookUrl(profile.facebook_url || '');
      setKakaoId(profile.kakao_id || '');
    }
  }, [profile]);

  useEffect(() => {
    async function fetchPoints() {
      if (!user) return;
      setLoadingPoints(true);
      try {
        const { data, error } = await supabase
          .from('point_history')
          .select('id, amount, description, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);
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
          .select('id, event_id, status, registered_at')
          .eq('user_id', user.id)
          .order('registered_at', { ascending: false })
          .limit(10);

        if (regsError) throw regsError;
        
        if (!regsData || regsData.length === 0) {
          setRegistrations([]);
          return;
        }

        const eventIds = regsData.map(r => r.event_id);
        const [partiesRes, lessonsRes] = await Promise.all([
          supabase.from('parties').select('id, title, date, start_date').in('id', eventIds),
          supabase.from('lessons').select('id, title, date, start_date').in('id', eventIds)
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
        .update({ 
          display_name: displayName,
          gender: gender,
          instagram_url: instagramUrl,
          facebook_url: facebookUrl,
          kakao_id: kakaoId
        })
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
      const { error } = await supabase.from('profiles').delete().eq('id', user.id);
      if (error) throw error;
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
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-6xl mx-auto w-full px-4 py-8 md:py-12 space-y-10"
    >
      {/* Header Info */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="relative group cursor-pointer" onClick={() => profilePictureInputRef.current?.click()}>
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-[32px] overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl relative">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-indigo-50 dark:bg-slate-800 flex items-center justify-center">
                  <User className="w-10 h-10 text-indigo-300 dark:text-slate-600" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white leading-tight">
                {profile.displayName || '댄서'}님, 안녕하세요!
              </h1>
              <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-black rounded-lg uppercase tracking-tighter">
                LV. {Math.floor((profile.points || 0) / 1000) + 1}
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">{user.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[11px] font-black rounded-full uppercase tracking-wider border border-indigo-200/50 dark:border-indigo-800/50">
                {profile.role === 'admin' ? 'Administrator' : profile.role === 'host' ? 'Event Host' : 'Dance Member'}
              </span>
              {profile.gender && (
                <span className={clsx(
                  "px-3 py-1 text-[11px] font-black rounded-full uppercase tracking-wider border",
                  profile.gender === 'male' 
                    ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400" 
                    : "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400"
                )}>
                  {profile.gender === 'male' ? 'Male' : 'Female'}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Link to="/community" className="flex-1 md:flex-none px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-700 dark:text-slate-200 font-bold text-sm hover:border-indigo-500 transition-all shadow-sm flex items-center justify-center gap-2">
            커뮤니티 활동하기
          </Link>
          <Link to="/dashboard" className="flex-1 md:flex-none px-6 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-black dark:hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2">
             대시보드 바로가기
          </Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Quick Summary & Navigation */}
        <motion.div variants={itemVariants} className="lg:col-span-4 space-y-6">
          {/* Profile Quick Card */}
          <div className="glass-panel rounded-[32px] p-8 border border-white/40 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors" />
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-800">
                  <User className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">My Account</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-none">Personal Info Summary</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">SNS Link</span>
                  {profile.instagram_url || profile.kakao_id ? (
                    <div className="flex gap-2">
                       {profile.instagram_url && <Instagram className="w-4 h-4 text-pink-500" />}
                       {profile.kakao_id && <MessageCircle className="w-4 h-4 text-amber-500" />}
                    </div>
                  ) : <span className="text-[10px] font-black text-slate-300">NOT LINKED</span>}
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gender</span>
                  <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">
                    {profile.gender || '미지정'}
                  </span>
                </div>
              </div>

              <Link to="/settings" className="w-full py-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs text-center border border-slate-100 dark:border-slate-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all flex items-center justify-center gap-2">
                <Settings className="w-4 h-4" />
                계정 및 개인정보 수정
              </Link>
            </div>
          </div>

          {/* Quick Stats or Promotions */}
          <Link to="/points" className="block p-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-[32px] border border-indigo-100 dark:border-indigo-800/30 group">
             <div className="flex items-center gap-4 mb-4">
               <div className="w-10 h-10 bg-white dark:bg-indigo-900 rounded-xl flex items-center justify-center shadow-sm">
                 <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
               </div>
               <h4 className="font-black text-indigo-900 dark:text-indigo-200">포인트 추가 충전</h4>
             </div>
             <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold leading-relaxed mb-4">
                강습 예매와 커뮤니티 활동을 위해<br />포인트를 미리 충전해보세요!
             </p>
             <div className="flex items-center text-xs font-black text-indigo-700 dark:text-indigo-300 gap-1 group-hover:translate-x-1 transition-transform">
                Go to Recharge <ChevronRight className="w-3.5 h-3.5" />
             </div>
          </Link>
        </motion.div>

        {/* Right Column: Points & History SUMMARY */}
        <motion.div variants={itemVariants} className="lg:col-span-8 space-y-8">
          {/* Enhanced Point Card */}
          <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-800 rounded-[32px] p-8 text-white shadow-2xl shadow-indigo-500/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[100px] translate-x-32 -translate-y-32 pointer-events-none group-hover:bg-amber-400/10 transition-colors duration-700" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-12">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 w-fit">
                    <Coins className="w-4 h-4 text-amber-300" />
                    <span className="text-[10px] font-black tracking-widest uppercase">My Balance</span>
                  </div>
                  <p className="text-indigo-100/60 text-[12px] font-bold">누적된 소중한 포인트입니다.</p>
                </div>
                <Link to="/settings" className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 hover:bg-white/20 transition-colors">
                  <History className="w-6 h-6 text-indigo-200" />
                </Link>
              </div>

              <div className="mb-10">
                <div className="flex items-baseline gap-2">
                  <span className="text-7xl font-[950] tracking-tighter">
                    {profile.points?.toLocaleString() || '0'}
                  </span>
                  <span className="text-2xl font-black text-amber-300">P</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full mt-4 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(((profile.points || 0) % 1000) / 10, 100)}%` }}
                    className="h-full bg-gradient-to-r from-amber-300 to-orange-400 rounded-full"
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-[11px] font-black uppercase tracking-widest text-indigo-200/60">
                    Next Level: {1000 - ((profile.points || 0) % 1000)} P Remaining
                  </p>
                  <Link to="/settings" className="text-[10px] font-black text-indigo-300 hover:text-white transition-colors underline underline-offset-4">상세 내역 보기</Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Link to="/points" className="py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm text-center shadow-lg hover:bg-indigo-50 transition-colors">
                  포인트 충전
                </Link>
                <Link to="/community" className="py-4 bg-indigo-500/30 backdrop-blur-md text-white border border-white/10 rounded-2xl font-black text-sm text-center hover:bg-indigo-500/50 transition-colors">
                  포인트 벌기
                </Link>
              </div>
            </div>
          </div>

          {/* Event Reservations */}
          <div className="glass-panel rounded-[32px] overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex justify-between items-center">
              <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-3">
                <Ticket className="w-5 h-5 text-rose-500" />
                나의 예매 내역 요약
              </h3>
              <Link to="/past-events" className="text-[10px] font-black text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest">View All</Link>
            </div>
            <div className="p-6">
               {loadingRegs ? (
                 <div className="py-12 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
               ) : registrations.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {registrations.slice(0, 4).map(reg => (
                      <div key={reg.id} className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-rose-200 dark:hover:border-rose-900/30 transition-all transition-transform hover:-translate-y-1">
                        <div className="flex justify-between items-start mb-3">
                           <span className={clsx(
                             "text-[10px] font-black px-2 py-0.5 rounded-lg border",
                             reg.status === 'confirmed' ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-slate-50 border-slate-200 text-slate-400"
                           )}>
                              {reg.status === 'confirmed' ? 'CONFIRMED' : 'CANCELLED'}
                           </span>
                           <span className="text-[10px] font-bold text-slate-400">{format(new Date(reg.registeredAt), 'MM.dd')}</span>
                        </div>
                        <Link to={`/event/${reg.eventId}`} className="block font-black text-slate-800 dark:text-white text-[14px] mb-2 hover:text-rose-500 transition-colors line-clamp-1">
                           {reg.eventTitle}
                        </Link>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <Clock className="w-3 h-3" />
                          {reg.eventDate ? format(new Date(reg.eventDate), 'M월 d일') : '날짜 미정'}
                        </div>
                      </div>
                    ))}
                 </div>
               ) : (
                 <div className="py-12 text-center text-slate-300 font-bold italic">최근 예매 내역이 없습니다.</div>
               )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
