import React from 'react';
import { Link } from 'react-router-dom';
import { Wind } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full py-10 mt-auto border-t border-amber-200/50 dark:border-amber-900/30 bg-[#FFFAEE]/50 dark:bg-[#14100B]/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative p-1.5 bg-white dark:bg-[#1A1612] rounded-lg ring-1 ring-amber-100 dark:ring-amber-900/50 flex items-center justify-center">
                <Wind className="h-4 w-4 text-orange-500" />
              </div>
            </div>
            <span className="font-black text-lg tracking-tight bg-gradient-to-r from-amber-600 to-orange-500 dark:from-amber-400 dark:to-yellow-300 bg-clip-text text-transparent">
              Dancehive
            </span>
          </Link>
          <div className="text-slate-500 dark:text-slate-400 text-sm">
            © {currentYear} Dancehive. All rights reserved.
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
