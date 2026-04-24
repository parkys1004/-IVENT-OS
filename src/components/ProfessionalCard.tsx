import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { User, Music, Camera, GraduationCap, Heart, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { UserProfile } from '../context/AuthContext';

export default function ProfessionalCard({ professional, index }: { professional: UserProfile, index: number, key?: string | number }) {
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'instructor': return <GraduationCap className="w-4 h-4" />;
      case 'dj': return <Music className="w-4 h-4" />;
      case 'media': return <Camera className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'instructor': return '강사';
      case 'dj': return 'DJ';
      case 'media': return '포토/영상';
      default: return '전문가';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'instructor': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
      case 'dj': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400';
      case 'media': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="group/pro bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      <div className="flex flex-col items-center text-center">
        {/* Avatar */}
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-50 dark:border-slate-800 shadow-inner bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            {professional.photoURL ? (
              <img 
                src={professional.photoURL} 
                alt={professional.displayName} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover/pro:scale-110"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User className="w-10 h-10 text-slate-300" />
            )}
          </div>
          <div className={clsx(
            "absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900",
            getRoleColor(professional.role)
          )}>
            {getRoleIcon(professional.role)}
          </div>
        </div>
 
        {/* Name & Role */}
        <div className="mb-2">
          <h4 className="font-black text-slate-800 dark:text-white text-lg group-hover/pro:text-orange-500 dark:group-hover/pro:text-orange-400 transition-colors">
            {professional.displayName || '이름 없음'}
          </h4>
          <span className={clsx(
            "inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter mt-1",
            getRoleColor(professional.role)
          )}>
            {getRoleLabel(professional.role)}
          </span>
        </div>

        {/* Specialized Snippet */}
        <div className="h-10 mb-4 overflow-hidden text-center">
          {professional.role === 'dj' && (professional as any).specialized?.music_style ? (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold line-clamp-2">
              {(professional as any).specialized.music_style.join(', ')}
            </p>
          ) : professional.role === 'media' && (professional as any).specialized?.category ? (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold line-clamp-2 uppercase">
              {(professional as any).specialized.category === 'photo' ? 'Photography' : 
               (professional as any).specialized.category === 'video' ? 'Videography' : 'Photo & Video'}
            </p>
          ) : professional.specialties ? (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold line-clamp-2">
              {professional.specialties}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 italic">전문가 프로필</p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Followers</span>
            <div className="flex items-center gap-1 mt-0.5">
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
              <span className="text-sm font-black text-slate-700 dark:text-slate-300">{professional.followersCount || 0}</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Link 
          to={`/profile/${professional.uid}`}
          className="w-full h-12 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-black text-slate-800 dark:text-slate-200 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm active:shadow-inner border border-slate-200/50 dark:border-slate-700/50"
        >
          프로필 보기 <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </motion.div>
  );
}
