import React from 'react';
import { Link } from 'react-router-dom';
import { Wind } from 'lucide-react';
import { useBrand } from '../context/BrandContext';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { assets } = useBrand();
  
  return (
    <footer className="w-full py-10 mt-auto border-t border-slate-100 dark:border-slate-800 bg-white/5 dark:bg-[#14100B]/5 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative p-1.5 bg-white dark:bg-[#1A1612] rounded-lg ring-1 ring-amber-100 dark:ring-amber-900/50 flex items-center justify-center">
                {assets.logo ? (
                  <img src={assets.logo} alt="Logo" className="h-4 w-4 object-contain" />
                ) : (
                  <Wind className="h-4 w-4 text-orange-500" />
                )}
              </div>
            </div>
            <span className="font-black text-lg tracking-tight bg-gradient-to-r from-amber-600 to-orange-500 dark:from-amber-400 dark:to-yellow-300 bg-clip-text text-transparent">
              {assets.siteTitle}
            </span>
          </Link>
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="text-slate-600 dark:text-slate-300 text-sm font-bold leading-relaxed max-w-sm text-center md:text-left">
              댄스 커뮤니티의 새로운 기준을 만듭니다. 본 서비스는 개인 프로젝트로 운영되며, 모든 데이터의 권리는 <span className="text-indigo-600 dark:text-indigo-400">{assets.siteTitle}</span>에 있습니다.
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">
              <span className="flex items-center gap-1.5">
                Email: <a href="mailto:aimaster1004@gmail.com" className="hover:text-indigo-500 transition-colors">aimaster1004@gmail.com</a>
              </span>
              <span className="hidden md:block text-slate-200 dark:text-slate-800">|</span>
              <span>Built with: React, Vite, Supabase</span>
            </div>
            <div className="text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-tighter">
              © {currentYear} {assets.siteTitle}. Created by <span className="text-slate-500">DJ Doberman</span>.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Link 
            to="/terms" 
            className="text-sm font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
          >
            이용약관
          </Link>
          <Link 
            to="/privacy" 
            className="text-sm font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
          >
            개인정보처리방침
          </Link>
        </div>
      </div>
    </footer>
  );
}
