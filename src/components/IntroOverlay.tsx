import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Sparkles, MapPin, Users, Layout, Hexagon, Zap, Heart, ArrowDown, Move } from 'lucide-react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for mouse tracking
  const springConfig = { damping: 25, stiffness: 150 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  // Parallax transforms
  const logoRotate = useTransform(smoothMouseX, [-500, 500], [-30, 60]);
  const logoX = useTransform(smoothMouseX, [-500, 500], [-20, 20]);
  const logoY = useTransform(smoothMouseY, [-300, 300], [-20, 20]);
  
  const textX = useTransform(smoothMouseX, [-500, 500], [-15, 15]);
  const textY = useTransform(smoothMouseY, [-300, 300], [-10, 10]);

  const glowX = useTransform(smoothMouseX, [-500, 500], [-120, 120]);
  const glowY = useTransform(smoothMouseY, [-300, 300], [-80, 80]);

  // Salsa beat animation (1-2-3-pause)
  const beatScale = {
    scale: [1, 1.02, 1, 1.05, 1, 1.02, 1, 1],
    transition: {
      duration: 2.4,
      repeat: Infinity,
      times: [0, 0.1, 0.2, 0.3, 0.5, 0.6, 0.7, 1],
      ease: "easeInOut"
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

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

  // Enhanced hexagonal pattern for the background
  const hexPattern = "data:image/svg+xml,%3Csvg width='24' height='42' viewBox='0 0 24 42' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f59e0b' fill-opacity='0.04' fill-rule='evenodd'%3E%3Cpath d='M12 3L2 8.75V20.25L12 26L22 20.25V8.75L12 3zM12 0L24 7V22L12 29L0 22V7L12 0z'/%3E%3C/g%3E%3C/svg%3E";

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full overflow-hidden flex flex-col items-center justify-center min-h-[80vh] sm:min-h-[90vh] bg-[#0A0806] mb-12 cursor-default"
    >
      {/* Latin Dance Background Image */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0806]/90 via-[#0A0806]/70 to-[#0A0806] z-10" />
        <motion.img 
          style={{ 
            x: useTransform(smoothMouseX, [-500, 500], [10, -10]),
            y: useTransform(smoothMouseY, [-300, 300], [10, -10]),
            scale: 1.05
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 2, ease: "easeOut" }}
          src="https://images.unsplash.com/photo-1547153760-18fc86024957?auto=format&fit=crop&q=80&w=2000" 
          className="w-full h-full object-cover grayscale-[0.3]" 
          referrerPolicy="no-referrer"
          alt="Latin Dance Context"
        />
      </div>

      {/* Hexagonal Grid Overlay */}
      <motion.div
        className="absolute inset-0 z-[5] opacity-50"
        animate={{ 
          backgroundPosition: ['0px 0px', '24px 42px'],
        }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        style={{ 
          backgroundImage: `url("${hexPattern}")`, 
          backgroundSize: '24px 42px',
          x: useTransform(smoothMouseX, [-500, 500], [-15, 15]),
          y: useTransform(smoothMouseY, [-300, 300], [-15, 15]),
        }}
      />

      {/* Interactive Orbs / Lights */}
      <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none">
        <motion.div 
          style={{ x: glowX, y: glowY }}
          animate={{ 
            scale: [1, 1.15, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-gradient-to-r from-orange-600/40 via-amber-600/20 to-orange-400/30 rounded-full blur-[140px]" 
        />
        <motion.div 
          style={{ 
            x: useTransform(smoothMouseX, [-500, 500], [80, -80]),
            y: useTransform(smoothMouseY, [-300, 300], [80, -80])
          }}
          animate={{ opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-[20%] left-[10%] w-[35%] h-[35%] bg-amber-500/10 rounded-full blur-[100px]" 
        />
      </div>

      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 flex flex-col items-center">
        {/* Top Logo Icon */}
        <motion.div
          style={{ 
            rotate: logoRotate,
            x: logoX,
            y: logoY
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            y: [0, -15, 0]
          }}
          transition={{ 
            opacity: { duration: 0.8 },
            scale: { duration: 0.8 },
            y: { duration: 3, repeat: Infinity, ease: "easeInOut" }
          }}
          className="mb-8"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-700 rounded-[1.5rem] flex items-center justify-center shadow-[0_0_40px_rgba(249,115,22,0.3)] ring-1 ring-white/30 relative group">
             <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-[1.5rem] blur-xl" />
             <Hexagon className="w-10 h-10 text-white fill-white/20 relative z-10" />
          </div>
        </motion.div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.05, borderColor: "rgba(249, 115, 22, 0.6)" }}
          className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-orange-500/30 bg-black/40 backdrop-blur-xl text-orange-400 font-black text-[10px] sm:text-xs mb-8 tracking-widest uppercase overflow-hidden relative group shadow-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-400" /> Salsa & Bachata Connected
        </motion.div>
        
        {/* Hero Titles */}
        <div className="text-center mb-8 max-w-5xl">
          <motion.h1 
            style={{ x: textX, y: textY }}
            animate={beatScale as any}
            initial={{ opacity: 0, filter: "blur(20px)" }}
            whileInView={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ delay: 0.5, duration: 1 }}
            className="text-6xl sm:text-7xl md:text-9xl font-black text-white tracking-tighter mb-2 leading-[0.85] drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] selection:bg-orange-500 selection:text-black"
          >
            Dancehive
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter relative"
          >
            <motion.span 
              animate={{ 
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              style={{ backgroundSize: "200% auto" }}
              className="bg-gradient-to-r from-orange-500 via-amber-400 to-orange-400 bg-clip-text text-transparent inline-block"
            >
              Passion in Every Step
            </motion.span>
          </motion.div>
        </div>
        
        {/* Description */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="text-slate-300 text-lg sm:text-xl md:text-2xl text-center max-w-3xl leading-relaxed mb-12 font-medium px-6 drop-shadow-lg"
        >
          당신의 열정을 무대로, <span className="text-white font-black underline decoration-orange-500/60 decoration-2 underline-offset-4">Dancehive</span>는 <br className="sm:hidden" />
          살사, 바차타 댄서와 오거나이저를 위한 <span className="text-orange-400">가장 뜨거운 연결</span>을 제공합니다.
        </motion.p>
        
        {/* Enhanced Call to Action Button */}
        <div className="relative group/btn">
          <motion.div 
            animate={{ 
              scale: [1, 1.15, 1], 
              opacity: [0.4, 0.7, 0.4],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -inset-6 bg-orange-500/30 rounded-[3rem] blur-3xl group-hover/btn:bg-orange-500/60 transition-all duration-700"
          />
          <motion.button
            onClick={scrollToContent}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="group relative px-10 py-5 bg-gradient-to-r from-orange-500 via-amber-600 to-orange-700 hover:from-orange-400 hover:via-amber-500 hover:to-orange-600 text-white font-black rounded-2xl shadow-[0_15px_40px_rgba(249,115,22,0.25)] flex items-center gap-4 text-xl transition-all overflow-hidden border border-white/10"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <span className="relative z-10 tracking-tight">춤의 무대로 참여하기</span> 
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <ArrowDown className="w-6 h-6 relative z-10" />
            </motion.div>
          </motion.button>
        </div>
      </div>

      {/* Advanced Floating Particles - Rhythmic Beat Particles */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {[...Array(24)].map((_, i) => (
            <motion.div
              key={i}
              className={`absolute rounded-full sm:blur-[1px] ${i % 3 === 0 ? 'bg-orange-500/30 w-2 h-2' : 'bg-amber-400/20 w-1 h-1'}`}
              initial={{ x: Math.random() * 100 + "%", y: "115%", opacity: 0 }}
              animate={{ 
                y: "-15%", 
                opacity: [0, 0.8, 0],
                x: (Math.random() * 100 - 5) + "%",
                scale: [0.5, 1.2, 0.8]
              }}
              transition={{ 
                duration: 8 + Math.random() * 15, 
                repeat: Infinity, 
                delay: Math.random() * 12,
                ease: "linear"
              }}
            />
          ))}
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
    <div className="relative w-full py-24 sm:py-32 flex flex-col items-center justify-center mt-16 bg-gradient-to-b from-transparent via-amber-50/5 dark:via-amber-950/5 to-transparent backdrop-blur-3xl">
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
