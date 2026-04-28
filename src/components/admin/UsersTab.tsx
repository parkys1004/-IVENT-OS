import React, { useState } from 'react';
import { Search, Filter, Coins, Trash2, PlusCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../../context/AuthContext';
import { supabase } from '../../supabase';
import { awardPoints } from '../../lib/points';

interface UsersTabProps {
  users: UserProfile[];
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userSearchQuery: string;
  setUserSearchQuery: (query: string) => void;
  pendingUsers: number;
  navigate: (path: string) => void;
  fetchAdminData: () => Promise<void>;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  users,
  setUsers,
  activeTab,
  setActiveTab,
  userSearchQuery,
  setUserSearchQuery,
  pendingUsers,
  navigate,
  fetchAdminData
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [managingUserPoints, setManagingUserPoints] = useState<{ userId: string, email: string, currentPoints: number } | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const [userToKick, setUserToKick] = useState<{ userId: string, name: string } | null>(null);

  const safeDate = (val: any) => {
    if (!val) return new Date();
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? new Date() : d;
    } catch (e) {
      return new Date();
    }
  };

  const handleRoleChange = async (uid: string, newRole: string) => {
    const trimmedRole = newRole.trim();
    console.log("Updating role:", { uid, role: trimmedRole });
    try {
      setIsSaving(true);
      // Auto approve if changing to admin or participant
      const isApproved = ['admin', 'participant', 'host'].includes(trimmedRole);
      const { error } = await supabase.from('profiles').update({ role: trimmedRole, is_approved: isApproved }).eq('id', uid);
      if (error) {
        console.error("Supabase update error:", error);
        throw error;
      }
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: trimmedRole as any, isApproved: isApproved } : u));
      alert("회원 유형 및 승인 상태가 변경되었습니다.");
    } catch (error: any) {
      alert(`오류: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdjustPoints = async () => {
    if (!managingUserPoints || adjustmentAmount === 0 || !adjustmentReason) return;
    setIsSaving(true);
    try {
      const result = await awardPoints(managingUserPoints.userId, adjustmentAmount, `[관리자 조정] ${adjustmentReason}`);
      
      if (result.success) {
        setUsers(prev => prev.map(u => 
          (u.uid === managingUserPoints.userId) 
            ? { ...u, points: (u.points || 0) + adjustmentAmount } 
            : u
        ));
        alert('포인트가 조정되었습니다.');
        setManagingUserPoints(null);
        setAdjustmentAmount(0);
        setAdjustmentReason('');
        fetchAdminData();
      } else {
        alert('조정 실패');
      }
    } catch (err: any) {
      alert('오류 발생');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlacklistUser = async (uid: string) => {
    if (!window.confirm('블랙리스트로 지정하시겠습니까?')) return;
    await handleRoleChange(uid, 'banned');
  };

  const confirmKick = async () => {
    if (!userToKick) return;
    try {
      setIsSaving(true);
      const { error } = await supabase.from('profiles').delete().eq('id', userToKick.userId);
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.uid !== userToKick.userId));
      alert("회원 삭제 완료");
      setUserToKick(null);
      fetchAdminData();
    } catch (error: any) {
      alert("삭제 실패");
    } finally {
      setIsSaving(false);
    }
  };
  const handleApproveUser = async (uid: string) => {
    try {
      setIsSaving(true);
      const { error } = await supabase.from('profiles').update({ is_approved: true }).eq('id', uid);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isApproved: true } : u));
      alert("전문가 승인이 완료되었습니다.");
    } catch (error: any) {
      alert(`승인 오류: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full min-h-0 relative">
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <button onClick={() => setActiveTab('all')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'all' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          전체
        </button>
        <button onClick={() => setActiveTab('pending')} className={clsx("px-4 py-3 font-bold transition-colors flex items-center gap-2", activeTab === 'pending' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          전문가 승인
          {pendingUsers > 0 && <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingUsers}</span>}
        </button>
        <button onClick={() => setActiveTab('blacklist')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'blacklist' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          블랙리스트
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="이름, 이메일 검색..." 
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-64 focus:ring-2 focus:ring-orange-500 outline-none" 
          />
        </div>
        <button className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
          <Filter className="w-4 h-4" /> 필터
        </button>
      </div>

      {/* User List: Table for Desktop, Cards for Mobile */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex-1 relative min-h-0 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block absolute inset-0 overflow-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-sm border-b border-slate-200 dark:border-slate-700">
              <tr className="text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-widest">
                <th className="p-5">사용자</th>
                <th className="p-5">이메일</th>
                <th className="p-5 text-center">포인트</th>
                <th className="p-5">유형</th>
                <th className="p-5">가입일</th>
                <th className="p-5 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => {
                const matchesTab = activeTab === 'all' || 
                  (activeTab === 'pending' && ['dj','instructor','media'].includes(u.role || '') && !u.isApproved) || 
                  (activeTab === 'blacklist' && u.role === 'banned');
                
                const matchesSearch = userSearchQuery === '' || 
                  u.displayName?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                  u.email?.toLowerCase().includes(userSearchQuery.toLowerCase());
                
                return matchesTab && matchesSearch;
              }).length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center text-slate-400 font-bold">
                    검색 결과가 없거나 회원이 없습니다.
                  </td>
                </tr>
              ) : (
                users.filter(u => {
                  const matchesTab = activeTab === 'all' || 
                    (activeTab === 'pending' && ['dj','instructor','media'].includes(u.role || '') && !u.isApproved) || 
                    (activeTab === 'blacklist' && u.role === 'banned');
                  
                  const matchesSearch = userSearchQuery === '' || 
                    u.displayName?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                    u.email?.toLowerCase().includes(userSearchQuery.toLowerCase());
                  
                  return matchesTab && matchesSearch;
                }).map(u => {
                  const createdAt = safeDate(u.createdAt);
                  return (
                    // ... existing row content ...
                    <tr key={u.uid} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        {u.photoURL ? (
                          <img src={u.photoURL} className="w-10 h-10 rounded-2xl border border-slate-200 shadow-sm" alt="profile" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 text-xs font-black shadow-sm">?</div>
                        )}
                        <div className="min-w-0">
                          <span className="font-black text-slate-800 dark:text-white text-sm block truncate">{u.displayName || '이름 없음'}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{u.role}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 text-sm font-medium">{u.email}</td>
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-black">
                          <Coins className="w-3.5 h-3.5" />
                          {(u.points || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <select 
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                          className={clsx(
                            "px-2.5 py-1.5 rounded-lg text-[11px] font-black outline-none cursor-pointer appearance-none text-center shadow-sm border border-transparent focus:border-slate-300 dark:focus:border-slate-600 transition-all",
                            u.role === 'admin' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30' :
                            u.role === 'host' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30' :
                            u.role === 'banned' ? 'bg-slate-900 text-white' :
                            ['dj','instructor','media'].includes(u.role || '') ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          )}
                        >
                           <option value="admin">관리자</option>
                           <option value="host">주최자</option>
                           <option value="dj">DJ</option>
                           <option value="instructor">강사</option>
                           <option value="media">미디어</option>
                           <option value="participant">참여자</option>
                           <option value="unassigned">미지정</option>
                           <option value="banned">블랙리스트</option>
                        </select>
                      </td>
                      <td className="p-4 text-slate-500 text-xs font-medium">
                        {format(createdAt, 'yy.MM.dd', { locale: ko })}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {activeTab === 'pending' && !u.isApproved && (
                            <button 
                              onClick={() => handleApproveUser(u.uid)}
                              className="bg-orange-600 text-white font-black hover:bg-orange-700 text-[11px] px-3 py-1.5 rounded-lg shadow-lg shadow-orange-600/20 transition-all active:scale-95"
                            >
                              승인하기
                            </button>
                          )}
                          <button 
                            onClick={() => navigate(`/profile/${u.uid}`)}
                            className="text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                          >
                            상세
                          </button>
                          {u.role !== 'admin' && (
                            <>
                              <button 
                                onClick={() => setManagingUserPoints({ userId: u.uid, email: u.email || '', currentPoints: u.points || 0 })}
                                className="text-indigo-600 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-[11px] px-3 py-1.5 border border-indigo-100 dark:border-indigo-900/30 rounded-lg transition-colors"
                                title="포인트 지급"
                              >
                                지급
                              </button>
                              <button 
                                onClick={() => handleBlacklistUser(u.uid)}
                                className="text-rose-600 font-bold hover:bg-rose-50 dark:hover:bg-rose-900/20 text-[11px] px-3 py-1.5 border border-rose-100 dark:border-rose-900/30 rounded-lg transition-colors"
                                title="블랙리스트 지정"
                              >
                                블랙
                              </button>
                              <button 
                                onClick={() => setUserToKick({ userId: u.uid, name: u.displayName || '이름 없음' })}
                                className="bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 p-2 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
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
          {users.filter(u => {
            const matchesTab = activeTab === 'all' || 
              (activeTab === 'pending' && ['dj','instructor','media'].includes(u.role || '') && !u.isApproved) || 
              (activeTab === 'blacklist' && u.role === 'banned');
            
            const matchesSearch = userSearchQuery === '' || 
              u.displayName?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
              u.email?.toLowerCase().includes(userSearchQuery.toLowerCase());
            
            return matchesTab && matchesSearch;
          }).map(u => {
            const createdAt = safeDate(u.createdAt);
            return (
              <motion.div 
                layout
                key={u.uid}
                className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm"
              >
                <div className="flex items-center gap-4 mb-4">
                  {u.photoURL ? (
                    <img src={u.photoURL} className="w-12 h-12 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm" alt="profile" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400 text-xs font-black">?</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-slate-800 dark:text-white truncate">{u.displayName || '이름 없음'}</h4>
                    <p className="text-[10px] text-slate-500 font-bold truncate">{u.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                     <span className={clsx("px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter",
                        u.role === 'admin' ? 'bg-rose-100 text-rose-700' :
                        u.role === 'host' ? 'bg-indigo-100 text-indigo-700' :
                        u.role === 'participant' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                     )}>
                       {u.role}
                     </span>
                     <span className="text-[9px] text-slate-400 font-bold">{format(createdAt, 'yy.MM.dd', { locale: ko })}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                   <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm font-black text-slate-700 dark:text-slate-200">{(u.points || 0).toLocaleString()} <span className="text-[10px] opacity-60">Points</span></span>
                   </div>
                   <select 
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                      className="bg-slate-100 dark:bg-slate-700 px-2 py-1.5 rounded-lg text-xs font-black outline-none border-none"
                    >
                       <option value="admin">관리자</option>
                       <option value="host">주최자</option>
                       <option value="dj">DJ</option>
                       <option value="instructor">강사</option>
                       <option value="media">미디어</option>
                       <option value="participant">참여자</option>
                       <option value="unassigned">미지정</option>
                       <option value="banned">블랙리스트</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => navigate(`/profile/${u.uid}`)}
                    className="py-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
                  >
                    프로필 보기
                  </button>
                  <button 
                    onClick={() => setManagingUserPoints({ userId: u.uid, email: u.email || '', currentPoints: u.points || 0 })}
                    className="py-2.5 bg-indigo-600 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/20"
                  >
                    포인트 지급
                  </button>
                  {activeTab === 'pending' && !u.isApproved && (
                    <button 
                      onClick={() => handleApproveUser(u.uid)}
                      className="col-span-2 py-3 bg-orange-600 text-white font-black text-xs rounded-xl shadow-lg shadow-orange-600/20"
                    >
                      승인 완료하기
                    </button>
                  )}
                  {u.role !== 'admin' && (
                    <button 
                      onClick={() => setUserToKick({ userId: u.uid, name: u.displayName || '이름 없음' })}
                      className="col-span-2 py-2.5 text-rose-600 font-bold text-xs hover:bg-rose-50 rounded-xl transition-colors"
                    >
                      강퇴하기
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>


      {/* Point Adjustment Modal */}
      <AnimatePresence>
        {managingUserPoints && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setManagingUserPoints(null);
                setAdjustmentAmount(0);
                setAdjustmentReason('');
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-900/20">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                    <Coins className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">포인트 지급</h3>
                    <p className="text-xs text-slate-500 font-bold">{managingUserPoints.email}</p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">지급 금액 선택</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[100, 1000, 10000].map(amount => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => {
                          setAdjustmentAmount(amount);
                          if (!adjustmentReason) setAdjustmentReason('관리자 특별 지급');
                        }}
                        className={clsx(
                          "py-3 rounded-xl font-black text-sm transition-all border-2",
                          adjustmentAmount === amount 
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                            : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-200"
                        )}
                      >
                        +{amount.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">직접 입력</label>
                    <div className="relative">
                      <input 
                        type="number"
                        value={adjustmentAmount || ''}
                        onChange={(e) => setAdjustmentAmount(parseInt(e.target.value) || 0)}
                        placeholder="금액을 입력하세요"
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-black text-xl text-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-300"
                      />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-400">P</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">지급 사유</label>
                    <input 
                      type="text"
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      placeholder="사유를 입력하세요 (예: 이벤트 부상)"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setManagingUserPoints(null);
                      setAdjustmentAmount(0);
                      setAdjustmentReason('');
                    }}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-2xl hover:bg-slate-200 transition-colors"
                  >
                    취소
                  </button>
                  <button 
                    type="button"
                    onClick={handleAdjustPoints}
                    disabled={isSaving || adjustmentAmount === 0 || !adjustmentReason}
                    className="flex-[2] py-4 bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <PlusCircle className="w-5 h-5" />}
                    포인트 지급하기
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {userToKick && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setUserToKick(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">회원 강퇴</h3>
              <p className="text-sm text-slate-500 mb-6 font-bold">{userToKick.name} 님을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
              <div className="flex gap-3">
                <button onClick={() => setUserToKick(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl">취소</button>
                <button onClick={confirmKick} className="flex-1 py-3 bg-rose-600 text-white font-black rounded-xl">삭제하기</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

