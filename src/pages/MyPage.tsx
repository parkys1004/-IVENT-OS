import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Settings, Save, AtSign, ShieldCheck, Ticket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export default function MyPage() {
  const { user, profile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);

  useEffect(() => {
    if (profile?.displayName) {
      setDisplayName(profile.displayName);
    }
  }, [profile]);

  useEffect(() => {
    async function fetchRegistrations() {
      if (!user) return;
      setLoadingRegs(true);
      try {
        const q = query(collection(db, 'registrations'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        const regs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Fetch event details for each registration
        const regsWithEvents = await Promise.all(regs.map(async (reg: any) => {
          const eventSnap = await getDocs(query(collection(db, 'events'), where('__name__', '==', reg.eventId)));
          const evData = eventSnap.docs[0]?.data();
          return {
            ...reg,
            eventTitle: evData?.title || '알 수 없는 행사',
            eventDate: evData?.date,
          };
        }));
        
        setRegistrations(regsWithEvents);
      } catch (error) {
        console.error("Error fetching registrations:", error);
      } finally {
        setLoadingRegs(false);
      }
    }
    
    if (profile?.role === 'user' || profile?.role === 'admin') {
       fetchRegistrations();
    }
  }, [user, profile]);

  if (!user || !profile) {
    return <div className="p-20 text-center text-slate-500">로그인이 필요합니다.</div>;
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { displayName });
      setSaveMessage('프로필이 성공적으로 업데이트되었습니다.');
      // Update local profile object if necessary, but AuthContext handles real-time ideally?
      // AuthContext fetches once on auth state load. Real-time updates for profile might need page reload.
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
        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">마이페이지 & 계정 설정</h1>
          <p className="text-slate-500 text-[14px]">프로필 정보를 수정하고 참가 내역을 확인하세요.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Settings */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[20px] shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-6 border-b border-slate-100 bg-slate-50/50">
               <h2 className="font-bold text-slate-800 flex items-center gap-2">
                 <User className="w-4 h-4 text-slate-500" />
                 내 계정 정보
               </h2>
             </div>
             <form onSubmit={handleUpdateProfile} className="p-6 space-y-5">
               <div className="flex flex-col items-center mb-6">
                 {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-20 h-20 rounded-full mb-3 shadow-sm border border-slate-200" referrerPolicy="no-referrer" />
                 ) : (
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                      <User className="w-8 h-8 text-slate-300" />
                    </div>
                 )}
                 <span className="text-[11px] px-2 py-1 bg-indigo-50 text-indigo-600 font-bold rounded-md uppercase tracking-wider">
                   {profile.role === 'admin' ? '관리자' : profile.role === 'host' ? '주최자' : '참여자'}
                 </span>
               </div>

               <div>
                 <label className="block text-[13px] font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                   <AtSign className="w-3.5 h-3.5" /> 이메일 (변경 불가)
                 </label>
                 <input 
                   type="text" 
                   value={user.email || ''} 
                   disabled 
                   className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm focus:outline-none"
                 />
               </div>

               <div>
                 <label className="block text-[13px] font-bold text-slate-600 mb-1.5">닉네임 / 이름</label>
                 <input 
                   type="text" 
                   value={displayName} 
                   onChange={(e) => setDisplayName(e.target.value)}
                   className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                   placeholder="이름을 입력하세요"
                 />
               </div>
               
               <button 
                 type="submit" 
                 disabled={isSaving}
                 className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50"
               >
                 {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Save className="w-4 h-4" />}
                 {isSaving ? '저장 중...' : '변경사항 저장'}
               </button>
               <AnimatePresence>
                 {saveMessage && (
                   <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} className="text-[13px] font-bold text-emerald-600 text-center mt-2">
                     {saveMessage}
                   </motion.div>
                 )}
               </AnimatePresence>
             </form>
          </div>
        </div>

        {/* Activity / Registrations */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[20px] shadow-sm border border-slate-200 overflow-hidden h-full">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
               <h2 className="font-bold text-slate-800 flex items-center gap-2">
                 <Ticket className="w-5 h-5 text-indigo-500" />
                 나의 행사 예매 내역
               </h2>
            </div>
            <div className="p-0">
               {profile.role === 'host' && registrations.length === 0 ? (
                 <div className="p-16 text-center text-slate-500">
                    <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="font-medium">주최자 계정입니다.</p>
                    <p className="text-sm mt-1">행사 관리는 메인 대시보드에서 진행해주세요.</p>
                 </div>
               ) : loadingRegs ? (
                 <div className="p-16 text-center">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                 </div>
               ) : registrations.length === 0 ? (
                 <div className="p-16 text-center text-slate-500">
                    <Ticket className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                    <p className="font-medium text-slate-600 mb-1">참여 신청한 행사가 없습니다.</p>
                    <Link to="/" className="text-indigo-600 text-sm font-bold hover:underline">행사 둘러보기</Link>
                 </div>
               ) : (
                 <div className="divide-y divide-slate-100">
                   {registrations.map(reg => {
                     const dateObj = reg.eventDate?.toDate ? reg.eventDate.toDate() : null;
                     const regDateObj = reg.registeredAt?.toDate ? reg.registeredAt.toDate() : new Date();

                     return (
                       <div key={reg.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                         <div>
                            <div className="flex items-center gap-2 mb-1">
                               <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">
                                  {reg.status === 'confirmed' ? '예매 완료' : '취소됨'}
                               </span>
                               <span className="text-[12px] text-slate-400">
                                  예매일: {format(regDateObj, 'yyyy.MM.dd', { locale: ko })}
                               </span>
                            </div>
                            <Link to={`/event/${reg.eventId}`} className="font-bold text-slate-800 hover:text-indigo-600 text-[16px] transition-colors">
                              {reg.eventTitle}
                            </Link>
                            {dateObj && (
                              <p className="text-[13px] text-slate-500 mt-1">
                                행사일: {format(dateObj, 'yyyy년 M월 d일 (E) a h:mm', { locale: ko })}
                              </p>
                            )}
                         </div>
                         <div className="shrink-0">
                           <Link to={`/event/${reg.eventId}`} className="inline-block px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-colors">
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
