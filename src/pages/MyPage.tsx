import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Settings, Save, AtSign, ShieldCheck, Ticket, Coins, Clock, TrendingUp, History, ChevronRight, Camera, Instagram, Facebook, MessageCircle } from 'lucide-react';
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
        {/* Left Column: Form Settings */}
        <motion.div variants={itemVariants} className="lg:col-span-7 space-y-8">
          <div className="glass-panel rounded-[32px] overflow-hidden border border-white/40 dark:border-slate-800">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="font-black text-xl text-slate-800 dark:text-white flex items-center gap-3">
                <Settings className="w-6 h-6 text-indigo-500" />
                계정 및 프로필 설정
              </h2>
              <User className="w-5 h-5 text-slate-300 dark:text-slate-600" />
            </div>
            
            <form onSubmit={handleUpdateProfile} className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-1">공개 닉네임</label>
                  <input 
                    type="text" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold"
                    placeholder="활동할 이름을 입력하세요"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-1">가입 이메일</label>
                  <div className="w-full px-5 py-3.5 bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl text-slate-400 text-sm cursor-not-allowed flex items-center gap-2">
                    <AtSign className="w-3.5 h-3.5 opacity-50" />
                    {user.email}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-1">성별 선택</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={clsx(
                      "py-4 rounded-2xl text-sm font-black transition-all border-2 flex items-center justify-center gap-3",
                      gender === 'male' 
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-600/20" 
                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200"
                    )}
                  >
                    <div className={clsx("w-2.5 h-2.5 rounded-full", gender === 'male' ? "bg-white" : "bg-indigo-400")} />
                    MALE
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={clsx(
                      "py-4 rounded-2xl text-sm font-black transition-all border-2 flex items-center justify-center gap-3",
                      gender === 'female' 
                        ? "bg-rose-500 border-rose-500 text-white shadow-xl shadow-rose-500/20" 
                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200"
                    )}
                  >
                    <div className={clsx("w-2.5 h-2.5 rounded-full", gender === 'female' ? "bg-white" : "bg-rose-400")} />
                    FEMALE
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-1">SNS 채널 연동</label>
                <div className="space-y-3">
                  <div className="relative group">
                    <Instagram className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-500/60 group-focus-within:text-pink-500 transition-colors" />
                    <input 
                      type="text" 
                      value={instagramUrl} 
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      className="w-full pl-14 pr-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-500 transition-all font-bold placeholder:text-slate-400"
                      placeholder="Instagram Username (@id)"
                    />
                  </div>
                  <div className="relative group">
                    <Facebook className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600/60 group-focus-within:text-blue-600 transition-colors" />
                    <input 
                      type="text" 
                      value={facebookUrl} 
                      onChange={(e) => setFacebookUrl(e.target.value)}
                      className="w-full pl-14 pr-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-500 transition-all font-bold placeholder:text-slate-400"
                      placeholder="Facebook Profile URL"
                    />
                  </div>
                  <div className="relative group">
                    <MessageCircle className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500/60 group-focus-within:text-amber-500 transition-colors" />
                    <input 
                      type="text" 
                      value={kakaoId} 
                      onChange={(e) => setKakaoId(e.target.value)}
                      className="w-full pl-14 pr-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-500 transition-all font-bold placeholder:text-slate-400"
                      placeholder="KakaoTalk ID"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex flex-col gap-4">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white font-black rounded-2xl hover:bg-black dark:hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/10 disabled:opacity-50 flex items-center justify-center gap-3 tracking-tight"
                >
                  {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Save className="w-5 h-5" />}
                  {isSaving ? '저장 중...' : '변경사항 저장하기'}
                </button>
                <AnimatePresence>
                  {saveMessage && (
                    <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="text-sm font-black text-emerald-600 dark:text-emerald-400 text-center bg-emerald-50 dark:bg-emerald-950/30 py-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                      {saveMessage}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="pt-8 mt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="bg-rose-50 dark:bg-rose-950/20 p-6 rounded-3xl border border-rose-100 dark:border-rose-900/30 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-center md:text-left">
                    <p className="text-sm font-black text-rose-800 dark:text-rose-300">위험 구역 (Account Deletion)</p>
                    <p className="text-[12px] text-rose-600/70 dark:text-rose-400/60 font-medium">탈퇴 시 모든 활동 데이터와 포인트가 즉시 삭제됩니다.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleWithdrawal}
                    className="px-6 py-2.5 text-rose-600 dark:text-rose-400 text-xs font-black border-2 border-rose-200 dark:border-rose-900/40 rounded-xl hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 transition-all"
                  >
                    탈퇴하기
                  </button>
                </div>
              </div>
            </form>
          </div>
        </motion.div>

        {/* Right Column: Points & History */}
        <motion.div variants={itemVariants} className="lg:col-span-5 space-y-8">
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
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                  <TrendingUp className="w-6 h-6 text-indigo-200" />
                </div>
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
                <p className="text-[11px] font-black uppercase tracking-widest mt-2 text-indigo-200/60">
                   Next Level: {1000 - ((profile.points || 0) % 1000)} P Remaining
                </p>
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

          {/* Activity Logs */}
          <div className="glass-panel rounded-[32px] overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
              <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-3">
                <History className="w-5 h-5 text-indigo-500" />
                활동 로그
              </h3>
            </div>
            <div className="p-6">
              {loadingPoints ? (
                <div className="py-12 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
              ) : pointHistory.length > 0 ? (
                <div className="space-y-3">
                  {pointHistory.slice(0, 4).map((h) => (
                    <div key={h.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl group">
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          h.amount > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {h.amount > 0 ? <TrendingUp className="w-5 h-5" /> : <ChevronRight className="w-5 h-5 rotate-90" />}
                        </div>
                        <div>
                          <p className="text-[13px] font-black text-slate-800 dark:text-white leading-tight">{h.reason}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">
                            {format(new Date(h.created_at), 'MMM dd, HH:mm')}
                          </p>
                        </div>
                      </div>
                      <span className={clsx("font-[950] text-sm", h.amount > 0 ? "text-emerald-600" : "text-rose-600")}>
                        {h.amount > 0 ? `+${h.amount}` : h.amount}
                      </span>
                    </div>
                  ))}
                  {pointHistory.length > 4 && (
                    <Link to="/community" className="block w-full py-3 text-center text-[11px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors">
                      View Full History
                    </Link>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-300 font-bold italic">활동 기록이 아직 없습니다.</div>
              )}
            </div>
          </div>

          {/* Event Reservations */}
          <div className="glass-panel rounded-[32px] overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
              <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-3">
                <Ticket className="w-5 h-5 text-rose-500" />
                예매 내역
              </h3>
            </div>
            <div className="p-6">
               {loadingRegs ? (
                 <div className="py-12 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
               ) : registrations.length > 0 ? (
                 <div className="space-y-4">
                    {registrations.slice(0, 3).map(reg => (
                      <div key={reg.id} className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-rose-200 dark:hover:border-rose-900/30 transition-all transition-transform hover:-translate-y-1">
                        <div className="flex justify-between items-start mb-3">
                           <span className={clsx(
                             "text-[10px] font-black px-2 py-0.5 rounded-lg border",
                             reg.status === 'confirmed' ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-slate-50 border-slate-200 text-slate-400"
                           )}>
                              {reg.status === 'confirmed' ? 'CONFIRMED' : 'CANCELLED'}
                           </span>
                           <span className="text-[10px] font-bold text-slate-400">{format(new Date(reg.registeredAt), 'yyyy-MM-dd')}</span>
                        </div>
                        <Link to={`/event/${reg.eventId}`} className="block font-black text-slate-800 dark:text-white text-[15px] mb-2 hover:text-rose-500 transition-colors line-clamp-1">
                           {reg.eventTitle}
                        </Link>
                        <div className="flex items-center gap-2 text-[12px] text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          {reg.eventDate ? format(new Date(reg.eventDate), 'M월 d일 (E) a h시') : '날짜 미정'}
                        </div>
                      </div>
                    ))}
                    {registrations.length > 3 && (
                      <Link to="/past-events" className="block text-center py-3 text-[11px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-colors">
                        All Tickets ({registrations.length})
                      </Link>
                    )}
                 </div>
               ) : (
                 <div className="py-12 text-center text-slate-300 font-bold italic">예매 내역이 없습니다.</div>
               )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
