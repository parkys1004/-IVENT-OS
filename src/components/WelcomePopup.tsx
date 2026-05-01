import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, MapPin, Users, GraduationCap, Calendar, Zap } from 'lucide-react';
import clsx from 'clsx';

const REFLECTIONS = [
  {
    icon: Zap,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
    darkBg: 'dark:bg-indigo-900/20',
    title: '데이터 아키텍처의 소중한 깨달음',
    desc: '쿼리 한 줄이 실제 운영 비용과 직결된다는 사실을 체감하며, 효율적인 데이터 설계의 중요성을 깊이 배웠습니다.'
  },
  {
    icon: Sparkles,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    darkBg: 'dark:bg-amber-900/20',
    title: '전략적 인프라 선택의 기준',
    desc: 'Supabase와 Firebase를 실무 수준에서 비교하며 상황에 맞는 최적의 기술 스택을 선택하는 통찰을 얻었습니다.'
  },
  {
    icon: Calendar,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    darkBg: 'dark:bg-emerald-900/20',
    title: '5월 중순, 더 강력하게 돌아옵니다',
    desc: '정밀한 원인 분석을 바탕으로 최적화된 로직과 견고한 설계로 다시 한번 도약할 Dancehive를 기대해 주세요.'
  }
];

export default function WelcomePopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsOpen(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="welcome-popup-overlay" className="fixed inset-0 z-[10001] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-950 rounded-[48px] shadow-2xl overflow-hidden border border-white/10"
          >
            {/* Header Content */}
            <div className="relative h-32 bg-slate-900 flex items-center justify-center text-white overflow-hidden">
              <div className="absolute inset-0">
                 <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-600/30 blur-[100px] -translate-x-1/2 -translate-y-1/2" />
                 <div className="absolute bottom-0 right-0 w-64 h-64 bg-rose-600/20 blur-[100px] translate-x-1/2 translate-y-1/2" />
              </div>
              <div className="relative z-10 text-center px-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Project Milestone</span>
                </div>
                <h2 className="text-xl md:text-2xl font-[1000] tracking-tighter leading-tight italic">
                  "멈춤은 실패가 아니라,<br />도약을 위한 로딩 시간"
                </h2>
              </div>
              <button 
                onClick={handleClose}
                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-full transition-all"
                id="close-welcome-popup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 md:p-8 pb-8">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-[24px] p-4 mb-6 border border-slate-100 dark:border-slate-800 shadow-inner">
                <p className="text-slate-600 dark:text-slate-300 text-[13px] leading-relaxed font-bold">
                  단순한 코딩을 넘어 '진짜 서비스'의 운영 메커니즘을 온몸으로 배운 시간이었습니다. 
                  <span className="text-indigo-600 dark:text-indigo-400"> Supabase 전송량 초과</span>라는 암초를 기회로 삼아 더욱 정교해진 설계로 5월 중순 다시 돌아오겠습니다.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {REFLECTIONS.map((item, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.1 }}
                    className="flex items-start gap-3 p-4 rounded-[20px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all group"
                  >
                    <div className={clsx("w-9 h-9 shrink-0 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform", item.bgColor, item.darkBg)}>
                      <item.icon className={clsx("w-4 h-4", item.color)} />
                    </div>
                    <div>
                      <h4 className="font-[1000] text-slate-900 dark:text-white text-[13px] tracking-tight">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed font-bold">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8">
                <button
                  onClick={handleClose}
                  className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl shadow-xl active:scale-[0.98] transition-all text-sm tracking-widest uppercase"
                  id="start-dancehive-button"
                >
                  Stay in the Loop
                </button>
                <div className="flex flex-col items-center mt-6 space-y-1">
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em]">
                    Returning May 2026
                  </p>
                  <p className="text-[9px] font-bold text-slate-300 dark:text-slate-700 italic">
                    Efficiency • Scalability • Optimization
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
