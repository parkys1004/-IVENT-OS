import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coins, 
  History, 
  CreditCard, 
  Plus, 
  CheckCircle2, 
  ChevronRight, 
  ArrowUpRight,
  TrendingUp,
  Clock,
  Smartphone,
  Wallet,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import clsx from 'clsx';

interface PointPackage {
  id: string;
  name: string;
  points: number;
  bonus_points: number;
  price_amount: number;
  currency: string;
}

export default function PointRecharge() {
  const { user, profile, refreshProfile } = useAuth();
  const [packages, setPackages] = useState<PointPackage[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<PointPackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'kakao' | 'toss' | 'card' | 'transfer' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rechargeSuccess, setRechargeSuccess] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        // Fetch packages
        const { data: pkgData, error: pkgErr } = await supabase
          .from('point_packages')
          .select('*')
          .eq('is_active', true)
          .order('price_amount', { ascending: true });
        
        if (pkgErr) throw pkgErr;
        
        // If no packages exist in DB, provide defaults
        if (!pkgData || pkgData.length === 0) {
          setPackages([
            { id: '1', name: 'Lite Pack', points: 3000, bonus_points: 0, price_amount: 3300, currency: 'KRW' },
            { id: '2', name: 'Value Pack', points: 10000, bonus_points: 500, price_amount: 11000, currency: 'KRW' },
            { id: '3', name: 'Pro Pack', points: 30000, bonus_points: 2000, price_amount: 33000, currency: 'KRW' },
            { id: '4', name: 'VIP Pack', points: 50000, bonus_points: 5000, price_amount: 55000, currency: 'KRW' },
          ]);
        } else {
          setPackages(pkgData);
        }

        // Fetch history
        const { data: histData, error: histErr } = await supabase
          .from('point_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (histErr) throw histErr;
        setHistory(histData || []);

      } catch (err) {
        console.error("Error fetching point data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const handleRecharge = async () => {
    if (!selectedPackage || !paymentMethod || !user) return;

    setIsProcessing(true);
    try {
      // Simulate payment delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const totalPointsToAdd = selectedPackage.points + selectedPackage.bonus_points;

      // Update user points in DB
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ points: (profile?.points || 0) + totalPointsToAdd })
        .eq('id', user.id);

      if (updateErr) throw updateErr;

      // Log to history
      const { error: logErr } = await supabase
        .from('point_history')
        .insert({
          user_id: user.id,
          amount: totalPointsToAdd,
          reason: `포인트 충전 (${selectedPackage.name})`,
          metadata: {
            package_id: selectedPackage.id,
            price: selectedPackage.price_amount,
            method: paymentMethod
          }
        });

      if (logErr) throw logErr;

      setRechargeSuccess(true);
      await refreshProfile();
      
      // Refresh history locally
      const { data: newHist } = await supabase
        .from('point_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setHistory(newHist || []);

    } catch (err) {
      console.error("Recharge failed:", err);
      alert('충전 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setRechargeSuccess(false);
    setSelectedPackage(null);
    setPaymentMethod(null);
  };

  if (!user || !profile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
        <p className="text-slate-500 font-bold">로그인이 필요한 서비스입니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8 sm:py-12 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">
            포인트 충전 및 관리
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-1">
            댄스하이브에서 다양한 서비스를 이용해보세요.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
           <Coins className="w-4 h-4 text-amber-500" />
           <span className="text-xs font-black text-slate-400 uppercase tracking-widest">My Balance</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Summary & History */}
        <div className="lg:col-span-12 space-y-8">
          
          {/* My Wallet Summary */}
          <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-[32px] p-8 sm:p-10 text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-32 -translate-y-32 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl -translate-x-16 translate-y-16 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-8">
              <div>
                <p className="text-indigo-100/60 font-black text-xs uppercase tracking-[0.2em] mb-4">Current Balance</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl sm:text-7xl font-[950] tracking-tighter leading-none">
                    {(profile.points || 0).toLocaleString()}
                  </span>
                  <span className="text-2xl font-black opacity-40 uppercase">Point</span>
                </div>
                <div className="mt-6 flex items-center gap-6">
                   <div className="flex flex-col">
                     <span className="text-[10px] font-black text-indigo-200/50 uppercase mb-1">Expiring Soon</span>
                     <span className="font-bold text-sm">0 P</span>
                   </div>
                   <div className="w-px h-8 bg-white/10"></div>
                   <div className="flex flex-col">
                     <span className="text-[10px] font-black text-indigo-200/50 uppercase mb-1">Last Recharge</span>
                     <span className="font-bold text-sm">
                       {history.length > 0 ? format(new Date(history[0].created_at), 'yyyy.MM.dd') : '없음'}
                     </span>
                   </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-3 shrink-0">
                <button 
                  onClick={() => document.getElementById('packages-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  포인트 충전하기
                </button>
                <p className="text-[10px] text-center text-indigo-100/40 font-bold uppercase tracking-widest">Secure Payments by Dancehive</p>
              </div>
            </div>
          </div>

          <div id="packages-section" className="scroll-mt-24 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                충전 금액 선택
              </h2>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Choose Your Package</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg)}
                  className={clsx(
                    "relative group p-6 rounded-[28px] border-2 transition-all text-left flex flex-col h-full",
                    selectedPackage?.id === pkg.id
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-500/20"
                      : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/40"
                  )}
                >
                  <div className="flex-1">
                    <p className={clsx(
                      "text-[11px] font-black uppercase tracking-widest mb-3",
                      selectedPackage?.id === pkg.id ? "text-indigo-200" : "text-slate-400"
                    )}>
                      {pkg.name}
                    </p>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-3xl font-[1000] tracking-tighter">
                        {pkg.points.toLocaleString()}
                      </span>
                      <span className="text-sm font-black opacity-60">P</span>
                    </div>
                    {pkg.bonus_points > 0 && (
                      <div className={clsx(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border",
                        selectedPackage?.id === pkg.id
                          ? "bg-white/10 border-white/20 text-white"
                          : "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30 text-amber-600 dark:text-amber-400"
                      )}>
                        <ArrowUpRight className="w-3 h-3" />
                        +{pkg.bonus_points.toLocaleString()} P 추가적립
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-8 pt-4 border-t border-current/10 flex items-center justify-between">
                    <span className="text-lg font-black tracking-tight">
                      {pkg.price_amount.toLocaleString()}원
                    </span>
                    <div className={clsx(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                      selectedPackage?.id === pkg.id 
                        ? "bg-white text-indigo-600" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    )}>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>

                  {selectedPackage?.id === pkg.id && (
                    <motion.div 
                      layoutId="pkg-check"
                      className="absolute -top-3 -right-3 w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-900"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {selectedPackage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    결제 수단 선택
                  </h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { id: 'kakao', name: '카카오페이', icon: <Smartphone className="w-5 h-5" />, color: 'bg-[#FEE500] text-black' },
                    { id: 'toss', name: '토스페이', icon: <Smartphone className="w-5 h-5" />, color: 'bg-[#0050FF] text-white' },
                    { id: 'card', name: '신용/체크카드', icon: <CreditCard className="w-5 h-5" />, color: 'bg-slate-800 dark:bg-slate-200 text-white dark:text-black' },
                    { id: 'transfer', name: '무통장입금', icon: <Wallet className="w-5 h-5" />, color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' }
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id as any)}
                      className={clsx(
                        "relative flex flex-col items-center justify-center gap-3 p-6 rounded-[24px] border-2 transition-all group",
                        paymentMethod === method.id
                          ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                          : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                      )}
                    >
                      <div className={clsx(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110",
                        method.color
                      )}>
                        {method.icon}
                      </div>
                      <span className="text-xs font-black tracking-tight">{method.name}</span>
                      {paymentMethod === method.id && (
                        <div className="absolute top-3 right-3 w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-2.5 h-2.5 shadow-sm" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="p-8 glass-panel rounded-[32px] flex flex-col sm:flex-row items-center justify-between gap-6">
                   <div className="text-center sm:text-left">
                     <p className="text-slate-400 font-bold text-sm mb-1">최종 결제 금액</p>
                     <p className="text-3xl font-[1000] text-slate-800 dark:text-white tracking-tighter">
                       {selectedPackage.price_amount.toLocaleString()}원
                     </p>
                     <p className="text-[11px] text-indigo-600 dark:text-amber-400 font-black uppercase mt-1">
                       Total Points: {(selectedPackage.points + selectedPackage.bonus_points).toLocaleString()} P
                     </p>
                   </div>
                   <button
                     disabled={!paymentMethod || isProcessing}
                     onClick={handleRecharge}
                     className="w-full sm:w-auto px-12 py-5 bg-slate-900 dark:bg-indigo-600 text-white rounded-[24px] font-[950] text-lg shadow-xl shadow-indigo-500/10 hover:translate-y-[-2px] hover:shadow-indigo-500/20 disabled:opacity-50 disabled:translate-y-0 transition-all flex items-center justify-center gap-3"
                   >
                     {isProcessing ? (
                       <>
                         <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                         결제 처리 중...
                       </>
                     ) : (
                       '지금 충전하기'
                     )}
                   </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transaction History Section */}
          <div className="space-y-6 pt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                포인트 이용 내역
              </h2>
            </div>

            <div className="glass-panel rounded-[32px] overflow-hidden">
               {history.length > 0 ? (
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800/50">
                          <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">DATE</th>
                          <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">CATEGORY</th>
                          <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">DESCRIPTION</th>
                          <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">AMOUNT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {history.map((item) => (
                           <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                             <td className="px-8 py-5">
                               <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold text-xs">
                                 <Clock className="w-3 h-3" />
                                 {format(new Date(item.created_at), 'yyyy-MM-dd')}
                               </div>
                             </td>
                             <td className="px-8 py-5 px-8">
                               <span className={clsx(
                                 "text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider",
                                 item.amount > 0 
                                   ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                                   : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                               )}>
                                 {item.amount > 0 ? 'RECHARGE' : 'SPENT'}
                               </span>
                             </td>
                             <td className="px-8 py-5">
                               <p className="text-sm font-black text-slate-700 dark:text-slate-200 tracking-tight">{item.reason}</p>
                             </td>
                             <td className="px-8 py-5 text-right">
                               <p className={clsx(
                                 "text-[15px] font-[950] tracking-tighter",
                                 item.amount > 0 ? "text-emerald-600" : "text-rose-600"
                               )}>
                                 {item.amount > 0 ? `+${item.amount.toLocaleString()}` : item.amount.toLocaleString()} P
                               </p>
                             </td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
               ) : (
                 <div className="py-24 text-center">
                    <History className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold">이용 내역이 존재하지 않습니다.</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {rechargeSuccess && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetState}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl overflow-hidden p-8 text-center"
            >
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">충전 완료!</h3>
              <p className="text-slate-500 dark:text-slate-400 font-bold mb-8">
                성공적으로 포인트가 충전되었습니다.<br/>
                이제 더 많은 행사를 즐겨보세요!
              </p>
              <button
                onClick={resetState}
                className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-[950] shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
              >
                닫기
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
