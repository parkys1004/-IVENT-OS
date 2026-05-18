import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Share2, MapPin, Users, Calendar,
  GraduationCap, Trophy, Instagram, Globe,
  Mail, Phone, MessageCircle, CheckCircle2,
  Star, Music, Camera, Mic2, Sparkles,
  ExternalLink, Heart, ChevronRight, Facebook,
} from 'lucide-react';
import EventCard from '../components/EventCard';
import { UserProfile } from '../context/AuthContext';
import clsx from 'clsx';

/* ── 역할별 설정 ── */
const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  instructor: {
    label: '강사', color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-900/30', border: 'border-indigo-200 dark:border-indigo-800',
    icon: <GraduationCap className="w-3.5 h-3.5" />,
  },
  dj: {
    label: 'DJ', color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-900/30', border: 'border-rose-200 dark:border-rose-800',
    icon: <Music className="w-3.5 h-3.5" />,
  },
  media: {
    label: '미디어', color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-900/30', border: 'border-cyan-200 dark:border-cyan-800',
    icon: <Camera className="w-3.5 h-3.5" />,
  },
  host: {
    label: '호스트', color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800',
    icon: <Star className="w-3.5 h-3.5" />,
  },
};

const getRoleConfig = (role: string) => ROLE_CONFIG[role] || {
  label: role, color: 'text-slate-600 dark:text-slate-400',
  bg: 'bg-slate-100 dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700',
  icon: <Users className="w-3.5 h-3.5" />,
};

/* ── 카드 래퍼 ── */
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={clsx('bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm', className)}>
    {children}
  </div>
);

const CardHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center gap-2.5 px-5 pt-5 pb-1">
    <span className="text-slate-400">{icon}</span>
    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</h3>
  </div>
);

/* ── 전문분야 태그 ── */
const SpecialtyTags = ({ text }: { text: string }) => {
  const tags = text.split(/[,，\n]/).map(t => t.trim()).filter(Boolean);
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-2 px-5 py-4">
      {tags.map((tag, i) => (
        <span key={i} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full border border-indigo-100 dark:border-indigo-800">
          {tag}
        </span>
      ))}
    </div>
  );
};

/* ── 탭 컴포넌트 ── */
type TabId = 'about' | 'events';
const TABS: { id: TabId; label: string }[] = [
  { id: 'about', label: '소개' },
  { id: 'events', label: '행사/강습' },
];

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<(UserProfile & { instagram_url?: string; facebook_url?: string; kakao_id?: string }) | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('about');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('id, email, display_name, photo_url, role, is_approved, created_at, followers_count, short_bio, description, specialties, career, portfolio_url, studio_location, phone, portfolio_images, instagram_url, facebook_url, kakao_id')
          .eq('id', id)
          .single();
        if (pErr) throw pErr;

        const mapped: any = {
          uid: p.id, email: p.email || '', displayName: p.display_name || '이름 없음',
          photoURL: p.photo_url || '', role: p.role || 'participant',
          isApproved: p.is_approved ?? true, createdAt: p.created_at,
          followersCount: p.followers_count || 0, shortBio: p.short_bio || '',
          description: p.description || '', specialties: p.specialties || '',
          career: p.career || '', portfolioUrl: p.portfolio_url || '',
          studioLocation: p.studio_location || '', phone: p.phone || '',
          portfolioImages: p.portfolio_images || [],
          instagram_url: p.instagram_url || '', facebook_url: p.facebook_url || '',
          kakao_id: p.kakao_id || '',
        };
        setProfile(mapped);

        const [partyRes, lessonRes] = await Promise.all([
          supabase.from('parties')
            .select('id, title, date, location_name, image_url, category, host_id, status, max_attendees')
            .eq('host_id', id).eq('status', 'published').limit(12),
          supabase.from('lessons')
            .select('id, title, date, location_name, image_url, category, host_id, status, max_attendees')
            .eq('host_id', id).eq('status', 'published').limit(12),
        ]);
        const allEvents = [
          ...(partyRes.data || []).map(e => ({ ...e, isLesson: false, maxAttendees: e.max_attendees || 0 })),
          ...(lessonRes.data || []).map(e => ({ ...e, isLesson: true, maxAttendees: e.max_attendees || 0 })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEvents(allEvents);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  /* ── 로딩 ── */
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-sm text-slate-400 font-medium">프로필 불러오는 중...</p>
    </div>
  );

  /* ── 에러 ── */
  if (error || !profile) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
      <Users className="w-16 h-16 text-slate-200" />
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">사용자를 찾을 수 없습니다</h2>
      <button onClick={() => navigate(-1)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm">
        돌아가기
      </button>
    </div>
  );

  const roleConfig = getRoleConfig(profile.role);
  const hasEvents = events.length > 0;
  const hasPortfolioImages = profile.portfolioImages?.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">

      {/* ── 상단 네비게이션 ── */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> 뒤로가기
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <Share2 className="w-4 h-4" />
            {copied ? '복사됨!' : '공유'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-4">

        {/* ── 프로필 헤더 카드 ── */}
        <Card>
          {/* 커버 그라디언트 */}
          <div className={clsx(
            'h-28 sm:h-36 rounded-t-2xl',
            profile.role === 'instructor' ? 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600' :
            profile.role === 'dj' ? 'bg-gradient-to-br from-rose-500 via-red-600 to-orange-500' :
            profile.role === 'media' ? 'bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500' :
            profile.role === 'host' ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500' :
            'bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800'
          )} />

          <div className="px-5 pb-5">
            {/* 아바타 */}
            <div className="-mt-12 sm:-mt-16 mb-4 flex items-end justify-between">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl border-4 border-white dark:border-slate-900 overflow-hidden bg-slate-100 shadow-lg shrink-0">
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Users className="w-8 h-8 text-slate-300" />
                  </div>
                )}
              </div>
            </div>

            {/* 이름 + 역할 배지 */}
            <div className="flex flex-wrap items-start gap-2 mb-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{profile.displayName}</h1>
              {profile.isApproved && (
                <CheckCircle2 className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={clsx('flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border', roleConfig.color, roleConfig.bg, roleConfig.border)}>
                {roleConfig.icon} {roleConfig.label}
              </span>
              {profile.studioLocation && (
                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <MapPin className="w-3 h-3" /> {profile.studioLocation}
                </span>
              )}
            </div>

            {/* 한줄 소개 */}
            {profile.shortBio && (
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed mb-4">
                {profile.shortBio}
              </p>
            )}

            {/* 팔로워 / 가입일 */}
            <div className="flex items-center gap-5 text-xs text-slate-400 font-medium border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5" />
                <span><strong className="text-slate-700 dark:text-slate-200 font-bold">{profile.followersCount.toLocaleString()}</strong> 팔로워</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{format(new Date(profile.createdAt), 'yyyy년 M월', { locale: ko })} 가입</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{hasEvents ? `${events.length}개 행사` : '행사 없음'}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* ── SNS / 연락처 카드 ── */}
        {(profile.instagram_url || profile.facebook_url || profile.kakao_id || profile.phone || profile.portfolioUrl) && (
          <Card className="p-4">
            <div className="flex flex-wrap gap-2">
              {profile.instagram_url && (
                <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 border border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm font-semibold hover:scale-105 transition-transform">
                  <Instagram className="w-4 h-4" /> 인스타그램
                </a>
              )}
              {profile.facebook_url && (
                <a href={profile.facebook_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-sm font-semibold hover:scale-105 transition-transform">
                  <Facebook className="w-4 h-4" /> 페이스북
                </a>
              )}
              {profile.portfolioUrl && (
                <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:scale-105 transition-transform">
                  <Globe className="w-4 h-4" /> 포트폴리오
                </a>
              )}
              {profile.kakao_id && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 text-sm font-semibold">
                  <MessageCircle className="w-4 h-4" /> {profile.kakao_id}
                </div>
              )}
              {profile.phone && (
                <a href={`tel:${profile.phone}`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-sm font-semibold hover:scale-105 transition-transform">
                  <Phone className="w-4 h-4" /> {profile.phone}
                </a>
              )}
            </div>
          </Card>
        )}

        {/* ── 탭 ── */}
        <div className="flex bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex-1 py-3.5 text-sm font-bold transition-all relative',
                activeTab === tab.id
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="profile-tab-bar" className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── 탭 콘텐츠 ── */}
        <AnimatePresence mode="wait">
          {activeTab === 'about' && (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* 소개 */}
              {profile.description && (
                <Card>
                  <CardHeader icon={<Sparkles className="w-4 h-4" />} title="소개" />
                  <p className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                    {profile.description}
                  </p>
                </Card>
              )}

              {/* 전문분야 */}
              {profile.specialties && (
                <Card>
                  <CardHeader icon={<Star className="w-4 h-4" />} title="전문분야" />
                  <SpecialtyTags text={profile.specialties} />
                </Card>
              )}

              {/* 경력 */}
              {profile.career && (
                <Card>
                  <CardHeader icon={<Trophy className="w-4 h-4" />} title="주요 경력" />
                  <p className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                    {profile.career}
                  </p>
                </Card>
              )}

              {/* 포트폴리오 이미지 (미디어 전문가) */}
              {hasPortfolioImages && (
                <Card>
                  <CardHeader icon={<Camera className="w-4 h-4" />} title="포트폴리오" />
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {profile.portfolioImages.map((url: string, i: number) => (
                      <motion.div
                        key={i}
                        whileHover={{ scale: 1.02 }}
                        className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 group cursor-pointer"
                        onClick={() => window.open(url, '_blank')}
                      >
                        <img src={url} alt={`portfolio-${i}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ExternalLink className="w-5 h-5 text-white" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              )}

              {/* 소개가 아무것도 없을 때 */}
              {!profile.description && !profile.specialties && !profile.career && !hasPortfolioImages && (
                <Card className="p-10 text-center">
                  <Sparkles className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">아직 등록된 소개 정보가 없습니다.</p>
                </Card>
              )}
            </motion.div>
          )}

          {activeTab === 'events' && (
            <motion.div
              key="events"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {hasEvents ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {events.map((event, idx) => (
                    <EventCard key={event.id} index={idx} event={event} />
                  ))}
                </div>
              ) : (
                <Card className="p-10 text-center">
                  <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">등록된 행사/강습이 없습니다.</p>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
