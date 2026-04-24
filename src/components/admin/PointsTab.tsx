import React, { useState } from 'react';
import { TrendingUp, Wallet, History, Save, RefreshCw, Ticket, Sparkles, Lock } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { supabase } from '../../supabase';

interface PointsTabProps {
  pointStats: {
    totalIssued: number;
    totalUsed: number;
    history: any[];
  };
  pointPolicies: any;
  setPointPolicies: React.Dispatch<React.SetStateAction<any>>;
  users: Array<any>;
}

export const PointsTab: React.FC<PointsTabProps> = ({
  pointStats,
  pointPolicies,
  setPointPolicies,
  users
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSavePolicies = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('settings').upsert({
        key: 'point_policies',
        value: pointPolicies
      });
      if (error) throw error;
      alert('포인트 정책이 저장되었습니다.');
    } catch (err) {
      alert('정책 저장 실패');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto no-scrollbar pb-12">
      {/* 1. Point Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-2">
             <TrendingUp className="w-4 h-4" />
             <span className="text-xs font-black uppercase">총 발행 포인트</span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            {pointStats.totalIssued.toLocaleString()}
            <span className="text-xs text-slate-400 font-bold">P</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-2">
             <Wallet className="w-4 h-4" />
             <span className="text-xs font-black uppercase">총 사용(차감) 포인트</span>
          </div>
          <div className="text-3xl font-black text-rose-600 flex items-center gap-2">
            {pointStats.totalUsed.toLocaleString()}
            <span className="text-xs text-slate-400 font-bold">P</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-2">
             <History className="w-4 h-4" />
             <span className="text-xs font-black uppercase">활성 유저 포인트 잔액</span>
          </div>
          <div className="text-3xl font-black text-indigo-600 flex items-center gap-2">
            {(pointStats.totalIssued - pointStats.totalUsed).toLocaleString()}
            <span className="text-xs text-slate-400 font-bold">P</span>
          </div>
        </div>
      </div>

      {/* 2. Point Policies */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/30">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">포인트 자동화 정책 설정</h3>
            <p className="text-sm text-slate-500 font-medium">행동별 적립 포인트를 설정합니다. (단위: Point)</p>
          </div>
          <button 
            onClick={handleSavePolicies}
            disabled={isSaving}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-sm shadow-xl shadow-indigo-600/20 hover:scale-105 transition-all flex items-center gap-2"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            정책 저장
          </button>
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
           <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Ticket className="w-4 h-4" /> 예매 및 활동 보상
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <label className="text-sm font-bold text-slate-700 dark:text-slate-300">회원가입 완료 보너스</label>
                   <input 
                    type="number" 
                    value={(pointPolicies as any).signup_reward || 0} 
                    onChange={e => setPointPolicies((prev: any) => ({ ...prev, signup_reward: Number(e.target.value) }))}
                    className="w-20 bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-2 text-right font-black outline-none focus:ring-2 focus:ring-indigo-500/20" 
                   />
                </div>
                <div className="flex items-center justify-between">
                   <label className="text-sm font-bold text-slate-700 dark:text-slate-300">티켓 금액별 적립률 (%)</label>
                   <input 
                    type="number" 
                    value={(pointPolicies as any).booking_reward_percent} 
                    onChange={e => setPointPolicies((prev: any) => ({ ...prev, booking_reward_percent: Number(e.target.value) }))}
                    className="w-20 bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-2 text-right font-black outline-none focus:ring-2 focus:ring-indigo-500/20" 
                   />
                </div>
                <div className="flex items-center justify-between">
                   <label className="text-sm font-bold text-slate-700 dark:text-slate-300">커뮤니티 글쓰기 보너스</label>
                   <input 
                    type="number" 
                    value={(pointPolicies as any).community_post} 
                    onChange={e => setPointPolicies((prev: any) => ({ ...prev, community_post: Number(e.target.value) }))}
                    className="w-20 bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-2 text-right font-black outline-none focus:ring-2 focus:ring-indigo-500/20" 
                   />
                </div>
                <div className="flex items-center justify-between">
                   <label className="text-sm font-bold text-slate-700 dark:text-slate-300">댓글 작성 보너스</label>
                   <input 
                    type="number" 
                    value={(pointPolicies as any).community_comment} 
                    onChange={e => setPointPolicies((prev: any) => ({ ...prev, community_comment: Number(e.target.value) }))}
                    className="w-20 bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-2 text-right font-black outline-none focus:ring-2 focus:ring-indigo-500/20" 
                   />
                </div>
              </div>
           </div>

           <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> 커뮤니티 활성화 보너스
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <label className="text-sm font-bold text-slate-700 dark:text-slate-300">행사 리뷰 작성</label>
                   <input 
                    type="number" 
                    value={(pointPolicies as any).event_review} 
                    onChange={e => setPointPolicies((prev: any) => ({ ...prev, event_review: Number(e.target.value) }))}
                    className="w-20 bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-2 text-right font-black outline-none focus:ring-2 focus:ring-indigo-500/20" 
                   />
                </div>
                <div className="flex items-center justify-between">
                   <label className="text-sm font-bold text-slate-700 dark:text-slate-300">갤러리 사진 업로드</label>
                   <input 
                    type="number" 
                    value={(pointPolicies as any).event_photo_upload} 
                    onChange={e => setPointPolicies((prev: any) => ({ ...prev, event_photo_upload: Number(e.target.value) }))}
                    className="w-20 bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-2 text-right font-black outline-none focus:ring-2 focus:ring-indigo-500/20" 
                   />
                </div>
                <div className="flex items-center justify-between">
                   <label className="text-sm font-bold text-slate-700 dark:text-slate-300">일일 댓글 최대 적립 횟수</label>
                   <input 
                    type="number" 
                    value={(pointPolicies as any).daily_max_comment_reward} 
                    onChange={e => setPointPolicies((prev: any) => ({ ...prev, daily_max_comment_reward: Number(e.target.value) }))}
                    className="w-20 bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-2 text-right font-black outline-none focus:ring-2 focus:ring-indigo-500/20" 
                   />
                </div>
              </div>
           </div>

           <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-500" /> 등록 차감 정책
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <label className="text-sm font-bold text-slate-700 dark:text-slate-300">파티 등록 차감</label>
                   <input 
                    type="number" 
                    value={(pointPolicies as any).party_registration_cost} 
                    onChange={e => setPointPolicies((prev: any) => ({ ...prev, party_registration_cost: Number(e.target.value) }))}
                    className="w-20 bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-2 text-right font-black outline-none focus:ring-2 focus:ring-indigo-500/20 text-rose-600" 
                   />
                </div>
                <div className="flex items-center justify-between">
                   <label className="text-sm font-bold text-slate-700 dark:text-slate-300">강습 등록 차감</label>
                   <input 
                    type="number" 
                    value={(pointPolicies as any).lesson_registration_cost} 
                    onChange={e => setPointPolicies((prev: any) => ({ ...prev, lesson_registration_cost: Number(e.target.value) }))}
                    className="w-20 bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-2 text-right font-black outline-none focus:ring-2 focus:ring-indigo-500/20 text-rose-600" 
                   />
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* 3. Point History Log */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
          <h3 className="text-xl font-black text-slate-900 dark:text-white">최근 포인트 변동 내역</h3>
          <p className="text-sm text-slate-500 font-medium">플랫폼 전체 유저의 포인트 흐름입니다.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-6">일시</th>
                <th className="p-6">회원 이메일</th>
                <th className="p-6">변동량</th>
                <th className="p-6">사유</th>
              </tr>
            </thead>
            <tbody>
              {pointStats.history.map((h) => {
                const userEmail = users.find(u => u.uid === h.user_id)?.email || '알 수 없음';
                return (
                  <tr key={h.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-6 text-[12px] font-mono text-slate-400">
                      {h.created_at ? format(new Date(h.created_at), 'yyyy-MM-dd HH:mm:ss') : '-'}
                    </td>
                    <td className="p-6 text-sm font-bold text-slate-600 dark:text-slate-300">{userEmail}</td>
                    <td className={clsx("p-6 text-sm font-black", h.amount > 0 ? "text-emerald-600" : "text-rose-600")}>
                      {h.amount > 0 ? `+${h.amount}` : h.amount} P
                    </td>
                    <td className="p-6 text-sm text-slate-600 dark:text-slate-400">{h.reason}</td>
                  </tr>
                );
              })}
              {pointStats.history.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-20 text-center text-slate-400 font-bold italic">내역이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
