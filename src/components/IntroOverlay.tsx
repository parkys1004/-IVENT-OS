import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, MapPin, Users, Layout, Hexagon, Zap, Heart, ArrowDown } from 'lucide-react';

export const features = [
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

export function HeroHeader() {
  const scrollToContent = () => {
    const target = document.getElementById('dashboard-content');
    if (target) {
      const topOffset = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({
        top: topOffset,
        behavior: 'smooth'
      });
    }
  };

  // SVG Data URI for a honeycomb pattern
  const honeycombPattern = "data:image/svg+xml,%3Csvg width='28' height='49' viewBox='0 0 28 49' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f59e0b' fill-opacity='0.15' fill-rule='evenodd'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5L28 15V0H0v15zm0 34l12.98-7.5L28 49v-15.01L13.98 26.5 0 33.99V49zm13.98-15.5l14.02 8.1V49h-28V41.6l13.98-8.1zM28 0l-14.02 8.1V15h28V7.41L28 0z'/%3E%3C/g%3E%3C/svg%3E";

  return (
    <div className="relative w-full overflow-hidden flex flex-col items-center justify-center min-h-[60vh] sm:min-h-[70vh] mb-12 border-b border-amber-200/50 dark:border-amber-900/30">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Animated Honeycomb Pattern */}
        <motion.div
          className="absolute inset-0 opacity-40 dark:opacity-20"
          animate={{ backgroundPosition: ['0px 0px', '28px 49px'] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          style={{ backgroundImage: `url("${honeycombPattern}")` }}
        />
        
        {/* Large Gradients for Full-Width feel */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
        
        {/* Floating Honey Orbs - More dispersed for full-width */}
        <motion.div 
          animate={{ x: [0, 100, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }} 
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] left-[5%] w-[40%] h-[40%] bg-amber-400/20 dark:bg-amber-400/10 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ x: [0, -80, 0], y: [0, -70, 0], scale: [1, 1.3, 1] }} 
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-[30%] right-[-5%] w-[35%] h-[35%] bg-yellow-400/20 dark:bg-yellow-400/10 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ x: [0, 60, 0], y: [0, -60, 0], scale: [1, 1.5, 1] }} 
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute bottom-[-10%] left-[30%] w-[35%] h-[35%] bg-orange-400/20 dark:bg-orange-400/10 rounded-full blur-[120px]" 
        />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 py-20 sm:py-32 flex flex-col items-center">
        {/* Header section */}
        <div className="text-center mb-8 sm:mb-12 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-2xl sm:rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-amber-500/30 mb-8 transform rotate-12"
          >
            <Hexagon className="w-8 h-8 sm:w-10 sm:h-10 fill-white/20" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100/50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 font-bold text-xs sm:text-sm mb-6 sm:mb-8 border border-amber-200/50 dark:border-amber-700/50 backdrop-blur-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-500" /> 커뮤니티와 댄스의 지능형 이벤트 플랫폼
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl sm:text-6xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter mb-6 sm:mb-8 leading-[1.1]"
          >
            Dancehive<br />
            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">Connect & Shine</span>
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-slate-600 dark:text-slate-300 text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed px-4 mb-10"
          >
            당신의 열정을 무대로, Dancehive는 댄서와 주최자를 잇는 <br className="hidden md:block" />
            가장 스마트한 연결을 제공합니다.
          </motion.p>
          
          <motion.button
            onClick={scrollToContent}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="group relative px-8 py-4 bg-orange-500 dark:bg-amber-500 text-white dark:text-slate-950 font-black rounded-full shadow-[0_10px_30px_rgba(245,158,11,0.2)] hover:shadow-[0_10px_30px_rgba(245,158,11,0.4)] transform hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden flex items-center gap-2 mx-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <span className="relative z-10 flex items-center gap-2 transition-colors">
              참여하기 <ArrowDown className="w-4 h-4 animate-bounce" />
            </span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export function HeroFeatures() {
  const scrollToContent = () => {
    const target = document.getElementById('dashboard-content');
    if (target) {
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - 80,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative w-full py-24 sm:py-32 flex flex-col items-center justify-center border-t border-slate-200 dark:border-slate-800/50 mt-16">
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 flex flex-col items-center">
        {/* Call to action (Scroll Down to more, or just the button from the screenshot) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16 sm:mb-24"
        >
          <button
            onClick={scrollToContent}
            className="group relative px-10 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-black rounded-full shadow-[0_15px_40px_rgba(79,70,229,0.2)] hover:shadow-[0_15px_40px_rgba(79,70,229,0.4)] transform hover:scale-105 active:scale-95 transition-all duration-300 text-lg overflow-hidden flex items-center gap-3 mx-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <span className="relative flex items-center gap-2 group-hover:text-white transition-colors">
              행사 살펴보기 <ArrowDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
            </span>
          </button>
          
          <div className="mt-8 sm:mt-10 flex flex-wrap justify-center gap-4 sm:gap-8 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-2"><Zap className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500" /> Powered by AI</span>
            <span className="hidden sm:block w-1.5 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <span className="flex items-center gap-2"><Heart className="w-3 h-3 sm:w-4 sm:h-4 text-rose-500" /> Multi-country</span>
            <span className="hidden sm:block w-1.5 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <span className="flex items-center gap-2"><Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500" /> Best UI/UX</span>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="group relative p-6 sm:p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm shadow-xl shadow-slate-200/30 dark:shadow-none hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all duration-500 flex flex-col items-center text-center overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className={`w-14 h-14 sm:w-16 sm:h-16 ${feature.color} dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-5 sm:mb-6 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6 shadow-inner`}>
                {feature.icon}
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-2 sm:mb-3 relative z-10">{feature.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed relative z-10 font-medium">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
