import React from 'react';
import { Sparkles, XCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';

interface EventFormLayoutProps {
  title: string;
  subtitle: string;
  aiLoading?: boolean;
  aiStatus?: {
    type: 'loading' | 'error' | 'success' | null;
    message: string;
  };
  onAiAnalyzeClick?: () => void;
  onSubmit?: (e: React.FormEvent) => void;
  leftColumn: React.ReactNode;
  rightColumn: React.ReactNode;
  footer: React.ReactNode;
  children?: React.ReactNode;
}

export const EventFormLayout: React.FC<EventFormLayoutProps> = ({
  title,
  subtitle,
  aiLoading,
  aiStatus,
  onAiAnalyzeClick,
  onSubmit,
  leftColumn,
  rightColumn,
  footer,
  children
}) => {
  return (
    <div className="min-h-screen bg-transparent pb-24 md:pb-12">
      <div className="max-w-[1280px] mx-auto px-4 py-8 md:py-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div className="animate-in fade-in slide-in-from-left-8 duration-1000">
            <h1 className="text-4xl md:text-5xl font-[1000] text-slate-900 dark:text-white tracking-tighter mb-3 leading-tight">
              {title.split(' ')[0]} <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 animate-gradient">{title.split(' ').slice(1).join(' ')}</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              {subtitle}
            </p>
          </div>
          
          {onAiAnalyzeClick && (
            <div className="shrink-0 animate-in fade-in slide-in-from-right-8 duration-1000 delay-300 relative">
              <AnimatePresence>
                {aiStatus && aiStatus.type && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    className="absolute bottom-full mb-4 right-0 z-50 pointer-events-none"
                  >
                    <div className={clsx(
                      "relative px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 whitespace-nowrap border",
                      aiStatus.type === 'loading' && "bg-indigo-600/90 border-indigo-400 text-white",
                      aiStatus.type === 'error' && "bg-rose-500/90 border-rose-400 text-white",
                      aiStatus.type === 'success' && "bg-emerald-500/90 border-emerald-400 text-white"
                    )}>
                      {aiStatus.type === 'loading' && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {aiStatus.type === 'error' && <XCircle className="w-4 h-4" />}
                      {aiStatus.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
                      <span className="text-sm font-black tracking-tight">{aiStatus.message}</span>
                      
                      {/* Arrow */}
                      <div className={clsx(
                        "absolute top-full right-8 w-4 h-4 -mt-2 rotate-45 border-r border-b",
                        aiStatus.type === 'loading' && "bg-indigo-600/90 border-indigo-400",
                        aiStatus.type === 'error' && "bg-rose-500/90 border-rose-400",
                        aiStatus.type === 'success' && "bg-emerald-500/90 border-emerald-400"
                      )} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-1 px-1 bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500 rounded-[32px] shadow-2xl shadow-indigo-500/20">
                <div className="bg-white dark:bg-slate-900 rounded-[31px] p-2">
                  <button 
                    type="button"
                    onClick={onAiAnalyzeClick}
                    disabled={aiLoading}
                    className="group relative flex items-center gap-4 px-8 py-5 rounded-[28px] overflow-hidden transition-all active:scale-95 disabled:opacity-70"
                  >
                    <div className="absolute inset-0 bg-indigo-600 group-hover:bg-indigo-700 transition-colors" />
                    <div className="relative z-10 flex items-center gap-4 text-white">
                      {aiLoading ? (
                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform">
                          <Sparkles className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div className="flex flex-col items-start translate-y-0.5">
                        <span className="text-[17px] font-black leading-tight">AI 포스터 분석</span>
                        <span className="text-[11px] font-bold opacity-80 uppercase tracking-widest">Poster Auto-Fill</span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="bg-white dark:bg-slate-900/50 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="p-6 md:p-10 lg:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
              {/* Left Column */}
              <div className="space-y-10">
                {leftColumn}
              </div>

              {/* Right Column */}
              <div className="space-y-10">
                {rightColumn}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-4">
              {footer}
            </div>
          </div>
        </form>
        {children}
      </div>
    </div>
  );
};
