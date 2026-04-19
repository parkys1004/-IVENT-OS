import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, MapPin, Users, Layout, X, Rocket, Zap, Heart } from 'lucide-react';

const features = [
  {
    icon: <Sparkles className="w-6 h-6 text-purple-500" />,
    title: "AI 포스터 자동 분석",
    description: "행사 포스터 사진만 올리세요. AI가 날짜, 장소, 제목을 순식간에 추출해줍니다.",
    color: "bg-purple-50"
  },
  {
    icon: <MapPin className="w-6 h-6 text-indigo-500" />,
    title: "구글 맵스 스마트 연동",
    description: "전 세계 주소 자동 완성은 물론, 상세 페이지에서 바로 지도로 길찾기가 가능합니다.",
    color: "bg-indigo-50"
  },
  {
    icon: <Users className="w-6 h-6 text-emerald-500" />,
    title: "실시간 참여자 관리",
    description: "주최자는 실시간으로 참여율을 확인하고, 참여자는 클릭 한 번으로 간편하게 신청하세요.",
    color: "bg-emerald-50"
  },
  {
    icon: <Layout className="w-6 h-6 text-blue-500" />,
    title: "아시아 댄스 네트워크",
    description: "한국, 일본, 싱가포르 등 아시아 전역의 댄스 이벤트를 한눈에 살펴보고 연결되세요.",
    color: "bg-blue-50"
  }
];

export default function IntroOverlay() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(true);
  }, []);

  const closeIntro = () => {
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -100, filter: 'blur(20px)' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 flex flex-col overflow-y-auto"
        >
          {/* Decorative Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[120px]" />
            <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-[10%] left-[20%] w-[30%] h-[30%] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-[120px]" />
          </div>

          <div className="relative w-full max-w-[1200px] mx-auto px-6 py-16 sm:py-24 flex flex-col items-center justify-center min-h-screen">
            {/* Header section */}
            <div className="text-center mb-16 sm:mb-24 flex flex-col items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-indigo-500/20 mb-10 transform rotate-12"
              >
                <Rocket className="w-10 h-10" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-sm mb-8"
              >
                <Sparkles className="w-4 h-4 text-amber-500" /> 커뮤니티와 댄스의 지능형 이벤트 플랫폼
              </motion.div>
              
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-5xl sm:text-7xl font-black text-slate-900 dark:text-white tracking-tighter mb-8 leading-[1.1]"
              >
                Dancehive<br />
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Connect & Shine</span>
              </motion.h2>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-slate-500 dark:text-slate-400 text-xl sm:text-2xl max-w-3xl mx-auto leading-relaxed"
              >
                당신의 열정을 무대로, Dancehive는 댄서와 주최자를 잇는 <br className="hidden md:block" />
                가장 스마트한 연결을 제공합니다.
              </motion.p>
            </div>

            {/* Features Grid - Centered & Spacious */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full mb-24">
              {features.map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + idx * 0.1, duration: 0.5 }}
                  className="group relative p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-500 flex flex-col items-center text-center overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className={`w-16 h-16 ${feature.color} dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6 shadow-inner`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3 relative z-10">{feature.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed relative z-10 font-medium">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Call to action */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="text-center"
            >
              <button
                onClick={closeIntro}
                className="group relative px-14 py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-black rounded-full shadow-[0_20px_50px_rgba(79,70,229,0.3)] hover:shadow-[0_20px_50px_rgba(79,70,229,0.5)] transform hover:scale-105 active:scale-95 transition-all duration-300 text-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="relative flex items-center gap-3 group-hover:text-white">
                  시작하기 <Zap className="w-5 h-5 fill-current" />
                </span>
              </button>
              
              <div className="mt-12 flex items-center justify-center gap-8 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-2 hover:text-indigo-500 transition-colors"><Zap className="w-4 h-4 text-amber-500" /> Powered by AI</span>
                <span className="w-1.5 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <span className="flex items-center gap-2 hover:text-rose-500 transition-colors"><Heart className="w-4 h-4 text-rose-500" /> Multi-country</span>
                <span className="w-1.5 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <span className="flex items-center gap-2 hover:text-purple-500 transition-colors"><Sparkles className="w-4 h-4 text-purple-500" /> Best UI/UX</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
