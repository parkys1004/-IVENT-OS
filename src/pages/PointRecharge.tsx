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
  AlertCircle,
  Footprints,
  Music,
  Flame,
  Zap,
  Star,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import clsx from 'clsx';

interface PointPackage {
  id: string;
  name: string;
  title: string;
  points: number;
  bonus_points: number;
  price_amount: number;
  currency: string;
  features: string[];
  icon: React.ReactNode;
  color: string;
  isPopular?: boolean;
}

export default function PointRecharge() {
  const { user, profile, refreshProfile } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<PointPackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'kakao' | 'toss' | 'card' | 'transfer' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rechargeSuccess, setRechargeSuccess] = useState(false);

  const packages: PointPackage[] = [
    { 
      id: 'tier-1', 
      name: 'Light Dancer', 
      title: 'Light Dancer',
      points: 10000, 
      bonus_points: 0, 
      price_amount: 11000, 
      currency: 'KRW',
      features: ['Basic event entry', 'Community access'],
      icon: <Footprints className="w-6 h-6" />,
      color: 'slate'
    },
    { 
      id: 'tier-2', 
      name: 'Pro Dancer', 
      title: 'Pro Dancer',
      points: 30000, 
      bonus_points: 1500, 
      price_amount: 33000, 
      currency: 'KRW',
      isPopular: true,
      features: ['5% Bonus points', 'Priority class booking', 'AI dance analysis (5 sessions)'],
      icon: <Music className="w-6 h-6" />,
      color: 'orange'
    },
    { 
      id: 'tier-3', 
      name: 'Master Dancer', 
      title: 'Master Dancer',
      points: 50000, 
      bonus_points: 5000, 
      price_amount: 55000, 
      currency: 'KRW',
      features: ['10% Bonus points', 'Free workshop pass (1 time)', 'Unlimited AI analysis', 'Exclusive badge'],
      icon: <Flame className="w-6 h-6" />,
      color: 'lime'
    },
  ];

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        // Fetch history
        const { data: histData, error: histErr } = await supabase
          .from('point_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (histErr) throw histErr;
        setHistory(histData || []);

      } catch (err) {
        console.error("Error fetching point history:", err);
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center bg-slate-950">
        <AlertCircle className="w-12 h-12 text-slate-700 mb-4" />
        <p className="text-slate-500 font-bold">로그인이 필요한 서비스입니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto w-full px-4 py-12 sm:py-20 space-y-16">
        
        {/* Header Section */}
        <div className="flex flex-col items-center text-center space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-6 py-3 bg-orange-500/10 border border-orange-500/20 rounded-full"
          >
            <Zap className="w-5 h-5 text-[#F39C12]" />
            <span className="text-[#F39C12] font-black text-sm tracking-tight">DANCEHIVE RHYTHM POINTS</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-black tracking-tighter"
          >
            My Current Rhythm Points:<br/>
            <span className="text-orange-500">{(profile.points || 0).toLocaleString()} P</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 font-bold max-w-xl mx-auto"
          >
            댄스하이브 전용 포인트를 충전하여 행사 예매, 강습 예약,<br className="hidden sm:block" />
            그리고 AI 댄스 분석까지 댄서들을 위한 모든 서비스를 이용하세요.
          </motion.p>
        </div>

        {/* Tier Cards Grid */}
        <div id="packages-section" className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
          {packages.map((pkg, idx) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx }}
              className={clsx(
                "relative group p-8 rounded-[40px] border-2 transition-all flex flex-col h-full overflow-hidden",
                pkg.isPopular 
                  ? "bg-gradient-to-b from-orange-500/20 to-orange-500/5 border-[#F39C12] shadow-2xl shadow-orange-500/10" 
                  : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
              )}
            >
              {pkg.isPopular && (
                <div className="absolute top-6 right-6">
                  <span className="bg-[#F39C12] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Most Popular</span>
                </div>
              )}

              {/* Icon & Title */}
              <div className={clsx(
                "w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-inner",
                pkg.id === 'tier-1' ? "bg-slate-800 text-slate-300" :
                pkg.id === 'tier-2' ? "bg-orange-500/20 text-[#F39C12]" :
                "bg-lime-500/20 text-[#A3E635]"
              )}>
                {pkg.icon}
              </div>

              <div className="flex-1 space-y-6">
                <div>
                  <h3 className="text-2xl font-black mb-1">{pkg.title}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-[1000] tracking-tighter">
                      {pkg.points.toLocaleString()}
                    </span>
                    <span className="text-base font-black opacity-40">P</span>
                  </div>
                  {pkg.bonus_points > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-lime-400 font-black text-xs">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      + {pkg.bonus_points.toLocaleString()} Bonus Points
                    </div>
                  )}
                </div>

                <ul className="space-y-4">
                  {pkg.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-3">
                      <div className="mt-1 p-0.5 rounded-full bg-white/5 border border-white/10">
                        <CheckCircle2 className={clsx(
                          "w-3.5 h-3.5",
                          pkg.isPopular ? "text-[#F39C12]" : "text-slate-500"
                        )} />
                      </div>
                      <span className="text-sm font-bold text-slate-300 tracking-tight">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-12 pt-8 border-t border-white/5 flex flex-col gap-4">
                 <div className="flex flex-col">
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">One-time Recharge</span>
                   <span className="text-3xl font-[1000] tracking-tighter">
                     {pkg.price_amount.toLocaleString()} <span className="text-sm opacity-40 font-black tracking-normal">KRW</span>
                   </span>
                 </div>
                 <button 
                  onClick={() => setSelectedPackage(pkg)}
                  className={clsx(
                   "w-full py-5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02] active:scale-95 shadow-xl",
                   selectedPackage?.id === pkg.id 
                    ? "bg-slate-100 text-slate-900"
                    : pkg.isPopular 
                      ? "bg-[#F39C12] text-white shadow-orange-500/20" 
                      : "bg-slate-800 text-slate-100 hover:bg-slate-700"
                  )}
                 >
                   {selectedPackage?.id === pkg.id ? 'Selected' : 'Select Package'}
                   <ChevronRight className="w-4 h-4" />
                 </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Payment & Additional Sections */}
        <AnimatePresence>
          {selectedPackage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-12"
            >
              {/* Payment Methods */}
              <div className="space-y-6">
                <div className="flex items-center justify-center text-center">
                   <div>
                     <h2 className="text-2xl font-black mb-2">Select Payment Method</h2>
                     <p className="text-slate-500 text-sm font-bold">간편결제로 빠르고 안전하게 충전하세요.</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
                  {[
                    { id: 'kakao', name: '카카오페이', icon: <Smartphone className="w-6 h-6" />, color: 'bg-[#FEE500] text-black' },
                    { id: 'toss', name: '토스페이', icon: <Smartphone className="w-6 h-6" />, color: 'bg-[#0050FF] text-white' },
                    { id: 'card', name: '신용/체크카드', icon: <CreditCard className="w-6 h-6" />, color: 'bg-white text-black' },
                    { id: 'transfer', name: '무통장입금', icon: <Wallet className="w-6 h-6" />, color: 'bg-slate-800 text-slate-300' }
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id as any)}
                      className={clsx(
                        "relative flex flex-col items-center justify-center gap-4 p-8 rounded-[32px] border-2 transition-all group overflow-hidden",
                        paymentMethod === method.id
                          ? "border-[#F39C12] bg-[#F39C12]/5"
                          : "border-slate-800 hover:border-slate-700 bg-slate-900/40"
                      )}
                    >
                      <div className={clsx(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                        method.color
                      )}>
                        {method.icon}
                      </div>
                      <span className="text-xs font-black tracking-tight">{method.name}</span>
                      {paymentMethod === method.id && (
                        <div className="absolute top-4 right-4 w-5 h-5 bg-[#F39C12] text-white rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 shadow-sm" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Final Checkout */}
                <div className="max-w-4xl mx-auto mt-10 p-10 bg-slate-900/50 border border-slate-800 rounded-[48px] flex flex-col sm:flex-row items-center justify-between gap-8">
                   <div className="text-center sm:text-left">
                     <p className="text-slate-500 font-bold text-sm mb-1 uppercase tracking-widest">Final Amount</p>
                     <div className="flex items-baseline gap-2">
                       <span className="text-4xl font-[1000] tracking-tighter">
                         {selectedPackage.price_amount.toLocaleString()}
                       </span>
                       <span className="text-xl font-black opacity-40">KRW</span>
                     </div>
                     <p className="text-xs font-black text-lime-400 mt-2 uppercase tracking-tight">
                       Receive {(selectedPackage.points + selectedPackage.bonus_points).toLocaleString()} Rhythm Points
                     </p>
                   </div>
                   <button
                     disabled={!paymentMethod || isProcessing}
                     onClick={handleRecharge}
                     className={clsx(
                       "w-full sm:w-auto px-16 py-6 bg-[#F39C12] hover:bg-[#E67E22] text-white rounded-[24px] font-[950] text-xl shadow-2xl shadow-orange-500/20 hover:translate-y-[-4px] active:translate-y-0 disabled:opacity-50 disabled:translate-y-0 transition-all flex items-center justify-center gap-4",
                       isProcessing && "cursor-not-allowed"
                     )}
                   >
                     {isProcessing ? (
                       <>
                         <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                         Processing Payment...
                       </>
                     ) : (
                       <>
                         <Zap className="w-6 h-6" />
                         Recharge Now
                       </>
                     )}
                   </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Link & Usage History */}
        <div className="pt-20 space-y-12">
          <div className="flex flex-col items-center justify-center text-center gap-8 border-t border-slate-800 pt-16">
             <div className="flex items-center gap-10">
               <div className="flex flex-col items-center gap-2 opacity-40 grayscale group hover:grayscale-0 hover:opacity-100 transition-all">
                 <Smartphone className="w-8 h-8" />
                 <span className="text-[10px] font-black uppercase text-center">KakaoPay</span>
               </div>
               <div className="flex flex-col items-center gap-2 opacity-40 grayscale group hover:grayscale-0 hover:opacity-100 transition-all">
                 <Smartphone className="w-8 h-8" />
                 <span className="text-[10px] font-black uppercase text-center">Toss</span>
               </div>
               <div className="flex flex-col items-center gap-2 opacity-40 grayscale group hover:grayscale-0 hover:opacity-100 transition-all">
                 <CreditCard className="w-8 h-8" />
                 <span className="text-[10px] font-black uppercase text-center">Cards</span>
               </div>
             </div>

             <div className="flex flex-col items-center gap-4">
               <button 
                onClick={() => document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="group flex items-center gap-3 text-slate-500 hover:text-[#F39C12] font-black text-sm tracking-tight transition-colors"
               >
                 <History className="w-4 h-4 transition-transform group-hover:rotate-[-180deg]" />
                 Check Point Usage History
                 <ArrowUpRight className="w-4 h-4" />
               </button>
               <p className="text-[10px] text-slate-700 font-bold max-w-sm">
                 All transactions are secured with 256-bit SSL encryption. Rhythm Points are non-refundable after use.
               </p>
             </div>
          </div>

          {/* Usage History Details */}
          <div id="history-section" className="scroll-mt-24 space-y-8 pb-20">
            <h2 className="text-2xl font-black flex items-center gap-3">
              <Award className="w-6 h-6 text-lime-400" />
              Point Usage Details
            </h2>

            <div className="glass-panel overflow-hidden border border-slate-800">
               {history.length > 0 ? (
                 <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-900/50 border-b border-slate-800">
                          <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Points</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/30">
                        {history.map((item) => (
                           <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                             <td className="px-8 py-6">
                               <div className="flex items-center gap-3 text-slate-500 font-bold text-xs">
                                 <Clock className="w-3.5 h-3.5" />
                                 {format(new Date(item.created_at), 'yyyy-MM-dd')}
                               </div>
                             </td>
                             <td className="px-8 py-6">
                               <span className={clsx(
                                 "text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider",
                                 item.amount > 0 
                                   ? "bg-lime-500/10 text-lime-400" 
                                   : "bg-orange-500/10 text-orange-400"
                               )}>
                                 {item.amount > 0 ? 'RECHARGE' : 'SPENT'}
                               </span>
                             </td>
                             <td className="px-8 py-6">
                               <p className="text-sm font-black text-slate-300 tracking-tight">{item.reason}</p>
                             </td>
                             <td className="px-8 py-6 text-right">
                               <p className={clsx(
                                 "text-lg font-[1000] tracking-tighter",
                                 item.amount > 0 ? "text-lime-400" : "text-white"
                               )}>
                                 {item.amount > 0 ? `+${item.amount.toLocaleString()}` : item.amount.toLocaleString()}
                               </p>
                             </td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
               ) : (
                 <div className="py-24 text-center">
                    <History className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                    <p className="text-slate-600 font-bold">이용 내역이 존재하지 않습니다.</p>
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
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[48px] shadow-2xl overflow-hidden p-10 text-center"
            >
              <div className="w-20 h-20 bg-lime-500/20 text-lime-400 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-3xl font-black text-white mb-2 tracking-tighter">Level Up!</h3>
              <p className="text-slate-400 font-bold mb-10 leading-relaxed">
                포인트가 성공적으로 충전되었습니다.<br/>
                이제 댄스하이브의 프리미엄 기능을 즐겨보세요!
              </p>
              <button
                onClick={resetState}
                className="w-full py-5 bg-[#F39C12] text-white rounded-2xl font-[950] text-lg shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
              >
                Let's Dance
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
