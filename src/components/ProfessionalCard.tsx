import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { User, Music, Camera, GraduationCap, Heart, ChevronRight, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { UserProfile } from '../context/AuthContext';
import { supabase } from '../supabase';

interface ProfessionalCardProps {
  professional: UserProfile & {
    instagram_url?: string;
    facebook_url?: string;
    kakao_id?: string;
  };
  index: number;
  key?: string | number;
  currentUserId?: string;
  initialFollowed?: boolean;
}

export default function ProfessionalCard({ professional, index, currentUserId, initialFollowed = false }: ProfessionalCardProps) {
  const [isFollowed, setIsFollowed] = useState(initialFollowed);
  const [followerCount, setFollowerCount] = useState(professional.followersCount || 0);
  const [following, setFollowing] = useState(false);

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

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUserId || following) return;
    setFollowing(true);
    try {
      if (isFollowed) {
        await supabase.from('artist_follows')
          .delete()
          .eq('user_id', currentUserId)
          .eq('artist_id', professional.uid);
        setIsFollowed(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase.from('artist_follows')
          .upsert({ user_id: currentUserId, artist_id: professional.uid });
        setIsFollowed(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Follow error:', err);
    } finally {
      setFollowing(false);
    }
  };

  const hasSns = professional.instagram_url || professional.facebook_url || professional.kakao_id || professional.portfolioUrl;

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
        <div className="h-10 mb-3 overflow-hidden text-center">
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

        {/* SNS Links */}
        {hasSns && (
          <div className="flex items-center gap-2 mb-4">
            {professional.instagram_url && (
              <a
                href={professional.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                title="Instagram"
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-black hover:scale-110 transition-transform"
                style={{ background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}
              >
                IG
              </a>
            )}
            {professional.facebook_url && (
              <a
                href={professional.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                title="Facebook"
                className="w-7 h-7 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-[12px] font-black hover:scale-110 transition-transform"
              >
                f
              </a>
            )}
            {professional.kakao_id && (
              <a
                href={`https://open.kakao.com/o/${professional.kakao_id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                title="KakaoTalk"
                className="w-7 h-7 rounded-full bg-[#FEE500] flex items-center justify-center text-[#3A1D1D] text-[11px] font-black hover:scale-110 transition-transform"
              >
                K
              </a>
            )}
            {professional.portfolioUrl && (
              <a
                href={professional.portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                title="포트폴리오"
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:scale-110 transition-transform"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {/* Followers & Follow Toggle */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleFollow}
            disabled={!currentUserId || following}
            className={clsx(
              "flex flex-col items-center gap-0.5 transition-all",
              currentUserId
                ? "cursor-pointer hover:scale-110 active:scale-95"
                : "cursor-default"
            )}
            title={currentUserId ? (isFollowed ? '팔로우 취소' : '팔로우') : '로그인 후 팔로우'}
          >
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Followers</span>
            <div className="flex items-center gap-1 mt-0.5">
              <Heart className={clsx(
                "w-3.5 h-3.5 transition-all duration-200",
                isFollowed
                  ? "text-rose-500 fill-rose-500 scale-110"
                  : "text-rose-300 dark:text-rose-700"
              )} />
              <span className="text-sm font-black text-slate-700 dark:text-slate-300">{followerCount}</span>
            </div>
          </button>
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
