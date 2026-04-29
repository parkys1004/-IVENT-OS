import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, MapPin, Users, GraduationCap, Calendar, Zap } from 'lucide-react';
import clsx from 'clsx';

const FEATURES = [
  {
    icon: Sparkles,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
    darkBg: 'dark:bg-indigo-900/20',
    title: 'AI 포스터 분석',
    desc: '포스터 이미지 한 장으로 행사 정보를 자동 입력하세요.'
  },
  {
    icon: Calendar,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    darkBg: 'dark:bg-orange-900/20',
    title: '지능형 대시보드',
    desc: '날짜, 장소, 장르별 맞춤형 이벤트를 한눈에 필터링하세요.'
  },
  {
    icon: GraduationCap,
    color: 'text-teal-500',
    bgColor: 'bg-teal-50',
    darkBg: 'dark:bg-teal-900/20',
    title: '전문가용 도구',
    desc: '강습생 관리와 QR 출석 체크로 효율적으로 운영하세요.'
  },
  {
    icon: Users,
    color: 'text-rose-500',
    bgColor: 'bg-rose-50',
    darkBg: 'dark:bg-rose-900/20',
    title: '댄서 커뮤니티',
    desc: '전국의 소셜 댄서들과 소통하고 정보를 공유하세요.'
  }
];

export default function WelcomePopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem('dancehive_welcome_seen');
    if (!hasSeen) {
      const timer = setTimeout(() => setIsOpen(true), 1500); // 1.5초 후 등장
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('dancehive_welcome_seen', 'true');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="welcome-popup-overlay" className="fixed inset-0 z-[200] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl overflow-hidden border border-white/20"
          >
            {/* Header Content */}
            <div className="relative h-32 bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                 <div className="absolute top-0 left-0 w-32 h-32 bg-white blur-3xl -translate-x-1/2 -translate-y-1/2" />
                 <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-400 blur-3xl translate-x-1/2 translate-y-1/2" />
              </div>
              <div className="relative z-10 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-100">Welcome to</span>
                </div>
                <h2 className="text-3xl font-black tracking-tighter">Dancehive</h2>
              </div>
              <button 
                onClick={handleClose}
                className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/30 text-white rounded-full transition-colors"
                id="close-welcome-popup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 pb-10">
              <p className="text-slate-500 dark:text-slate-400 font-medium text-center mb-8">
                소셜 댄서와 오거나이저를 위한<br />
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">지능형 댄스 이벤트 대시보드</span>를 만나보세요.
              </p>

              <div className="grid grid-cols-1 gap-4">
                {FEATURES.map((feature, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                  >
                    <div className={clsx("w-12 h-12 shrink-0 rounded-xl flex items-center justify-center", feature.bgColor, feature.darkBg)}>
                      <feature.icon className={clsx("w-6 h-6", feature.color)} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{feature.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-10">
                <button
                  onClick={handleClose}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all text-[15px]"
                  id="start-dancehive-button"
                >
                  지금 바로 시작하기
                </button>
                <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-4 font-medium">
                  댄스하이브는 댄서들의 더 즐거운 소셜 라이프를 응원합니다.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
