import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion } from 'motion/react';
import { 
  CalendarDays, MapPin, Users, Music, Mic2, Star, 
  ArrowLeft, Share2, Globe, GraduationCap, Trophy, 
  Mail, Phone, Instagram, Send, Camera
} from 'lucide-react';
import EventCard from '../components/EventCard';
import { UserProfile } from '../context/AuthContext';

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchProfileData = async () => {
      setLoading(true);
      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (profileError) throw profileError;
        
        const mappedProfile: UserProfile = {
          uid: profileData.id,
          email: profileData.email || '',
          displayName: profileData.display_name || '사용자',
          photoURL: profileData.photo_url || '',
          role: profileData.role || 'participant',
          isApproved: profileData.is_approved ?? true,
          createdAt: profileData.created_at || new Date().toISOString(),
          followersCount: profileData.followers_count || 0,
          shortBio: profileData.short_bio || '',
          description: profileData.description || '',
          specialties: profileData.specialties || '',
          career: profileData.career || '',
          portfolioUrl: profileData.portfolio_url || '',
          studioLocation: profileData.studio_location || '',
          phone: profileData.phone || '',
          portfolioImages: profileData.portfolio_images || []
        };

        // Fetch specialized data based on role
        let specializedData = null;
        if (mappedProfile.role === 'instructor') {
          const { data } = await supabase.from('instructors').select('*').eq('id', id).maybeSingle();
          specializedData = data;
        } else if (mappedProfile.role === 'dj') {
          const { data } = await supabase.from('djs').select('*').eq('id', id).maybeSingle();
          specializedData = data;
        } else if (mappedProfile.role === 'media') {
          const { data } = await supabase.from('creators').select('*').eq('id', id).maybeSingle();
          specializedData = data;
        }

        if (specializedData) {
          (mappedProfile as any).specialized = specializedData;
        }

        setProfile(mappedProfile);

        // Fetch events hosted by this user
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('host_id', id)
          .eq('status', 'published')
          .order('date', { ascending: true });

        // Fetch classes taught by this user
        const { data: classesData } = await supabase
          .from('classes')
          .select('*')
          .eq('instructor_id', id)
          .order('start_date', { ascending: true });

        const mappedEvents = (eventsData || []).map(e => ({
          ...e,
          id: e.id,
          title: e.title,
          date: e.date,
          locationName: e.location_name,
          category: e.category,
          imageUrl: e.image_url,
          isLesson: e.is_lesson
        }));

        const mappedClasses = (classesData || []).map(c => ({
          id: c.id,
          title: c.title,
          date: c.start_date,
          locationName: c.location_name,
          category: c.category || 'lesson',
          imageUrl: '',
          isLesson: true,
          status: 'published'
        }));

        setEvents([...mappedEvents, ...mappedClasses]);

      } catch (err: any) {
        console.error("Error fetching public profile:", err);
        setError("프로필을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium italic">프로필 로딩 중...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-400">
          <Users className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">프로필을 찾을 수 없습니다</h2>
        <p className="text-slate-500 mb-8 max-w-sm">존재하지 않거나 삭제된 사용자입니다.</p>
        <button onClick={() => navigate(-1)} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition">
          뒤로 가기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
      {/* Back Button */}
      <div className="mb-8 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 hover:text-indigo-600 transition font-bold text-sm">
          <ArrowLeft className="w-4 h-4 mr-2" /> 뒤로 가기
        </button>
      </div>

      {/* Header Profile Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-8 sm:p-12 shadow-sm mb-12 relative overflow-hidden">
        {/* Abstract background decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-center md:items-start gap-10 relative z-10">
          {/* Avatar Area */}
          <div className="relative">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[32px] overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none bg-slate-100 dark:bg-slate-800">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <Users className="w-16 h-16" />
                </div>
              )}
            </div>
            
            {/* Role Badge Overlay */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 px-4 py-1.5 rounded-full shadow-lg border border-slate-100 dark:border-slate-700 flex items-center gap-1.5 min-w-max">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {profile.role === 'instructor' ? 'Instructor' : 
                 profile.role === 'dj' ? 'Professional DJ' : 
                 profile.role === 'media' ? 'Media Expert' : 
                 profile.role === 'host' ? 'Host' : 'Member'}
              </span>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left pt-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
              <div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                  {profile.displayName}
                </h1>
                <p className="text-indigo-600 font-bold flex items-center justify-center md:justify-start gap-2">
                   <Globe className="w-4 h-4" /> Professional in {profile.studioLocation || 'Global Dance Scene'}
                </p>
              </div>
              
              <div className="flex items-center justify-center gap-3">
                <button className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 hover:scale-105 transition-transform active:scale-95">
                  Follow
                </button>
                <button className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl hover:bg-slate-200 transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Stats Block */}
            <div className="flex items-center justify-center md:justify-start gap-8 mb-8">
              <div className="text-center md:text-left">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Followers</p>
                <p className="text-xl font-black text-slate-800 dark:text-white">{profile.followersCount}</p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Events</p>
                <p className="text-xl font-black text-slate-800 dark:text-white">{events.length}</p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Impact</p>
                <p className="text-xl font-black text-slate-800 dark:text-white">Top 1%</p>
              </div>
            </div>

            {/* Short Bio */}
            {profile.shortBio && (
              <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl font-medium italic">
                "{profile.shortBio}"
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12">
        {/* Left Content Area */}
        <div className="space-y-12">
          {/* About Section */}
          <section>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3">
              <Star className="w-7 h-7 text-amber-500" /> About Me
            </h3>
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 border-dashed">
              <div className="whitespace-pre-wrap text-slate-600 dark:text-slate-400 leading-relaxed">
                {profile.description || '작성된 소개가 없습니다.'}
              </div>
            </div>
          </section>

          {/* Portfolio Gallery */}
          {profile.portfolioImages && profile.portfolioImages.length > 0 && (
            <section>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                <Camera className="w-7 h-7 text-indigo-500" /> Portfolio Gallery
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {profile.portfolioImages.map((url: string, idx: number) => (
                  <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm group">
                    <img 
                      src={url} 
                      alt={`portfolio-${idx}`} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Specialties & Career */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-indigo-500" /> 
                {profile.role === 'dj' ? 'Music Styles' : profile.role === 'media' ? 'Specialty' : 'Specialties'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.role === 'dj' && (profile as any).specialized?.music_style 
                  ? (profile as any).specialized.music_style.map((s: string, idx: number) => (
                    <span key={idx} className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-4 py-2 rounded-xl text-sm font-bold border border-purple-100 dark:border-purple-800/30 shadow-sm">
                      {s}
                    </span>
                  ))
                  : profile.specialties ? profile.specialties.split(',').map((s: string, idx: number) => (
                  <span key={idx} className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl text-sm font-bold border border-indigo-100 dark:border-indigo-800/30 shadow-sm">
                    {s.trim()}
                  </span>
                )) : <p className="text-slate-400 italic text-sm">정보 없음</p>}
              </div>
            </section>
            
            <section>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                <Trophy className="w-5 h-5 text-amber-500" /> 
                {profile.role === 'instructor' ? 'Experience' : 'Career Highlights'}
              </h3>
              <div className="bg-amber-50/30 dark:bg-amber-900/10 p-6 rounded-2xl border border-amber-100/50 dark:border-amber-900/20">
                {profile.role === 'instructor' && (profile as any).specialized?.experience_years ? (
                  <p className="text-sm font-bold text-slate-800 dark:text-amber-200 mb-2">
                    { (profile as any).specialized.experience_years }년 이상 교육 경력
                  </p>
                ) : null}
                <div className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400 leading-6">
                  {profile.career || '경력 정보가 등록되지 않았습니다.'}
                </div>
              </div>
            </section>
          </div>

          {/* Specialized Equipment / Details Section */}
          {((profile as any).specialized) && (
            <section className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                {profile.role === 'dj' ? <Music className="w-6 h-6 text-purple-500" /> : 
                 profile.role === 'media' ? <Camera className="w-6 h-6 text-cyan-500" /> : 
                 <GraduationCap className="w-6 h-6 text-indigo-500" />}
                Professional Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {profile.role === 'dj' && (
                  <>
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Main Equipment</h4>
                      <p className="text-slate-700 dark:text-slate-300 font-bold">{(profile as any).specialized.main_equipment || 'Not specified'}</p>
                    </div>
                    <div className="flex gap-4">
                      {(profile as any).specialized.soundcloud_url && (
                        <a href={(profile as any).specialized.soundcloud_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-orange-500 hover:opacity-80 transition-opacity font-bold">
                          SoundCloud
                        </a>
                      )}
                      {(profile as any).specialized.mixcloud_url && (
                        <a href={(profile as any).specialized.mixcloud_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:opacity-80 transition-opacity font-bold">
                          MixCloud
                        </a>
                      )}
                    </div>
                  </>
                )}

                {profile.role === 'media' && (
                  <>
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Category</h4>
                      <span className="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 px-3 py-1 rounded-lg text-xs font-bold border border-cyan-100 dark:border-cyan-800">
                        {(profile as any).specialized.category === 'photo' ? 'Photography' : 
                         (profile as any).specialized.category === 'video' ? 'Videography' : 'Photo & Video'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Equipment List</h4>
                      <p className="text-slate-600 dark:text-slate-400 text-sm whitespace-pre-wrap">{(profile as any).specialized.equipment_list || 'Not specified'}</p>
                    </div>
                  </>
                )}

                {profile.role === 'instructor' && (profile as any).specialized.curriculum_link && (
                  <div className="col-span-full">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Curriculum / Portfolio</h4>
                    <a href={(profile as any).specialized.curriculum_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl font-bold hover:bg-indigo-100 transition-colors">
                      커리큘럼 확인하기 <Globe className="w-4 h-4 ml-1" />
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Hosted Events */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                <CalendarDays className="w-7 h-7 text-rose-500" /> 주최하는 행사
              </h3>
              {events.length > 0 && <span className="text-sm font-bold text-slate-400">{events.length}개의 활성 이벤트</span>}
            </div>
            
            {events.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {events.map((event, idx) => (
                  <EventCard key={event.id} index={idx} event={{
                    id: event.id,
                    title: event.title,
                    date: event.date,
                    locationName: event.location_name,
                    category: event.category,
                    imageUrl: event.image_url,
                    currentAttendees: (event.metadata as any)?.currentAttendees || event.current_attendees || 0,
                    maxAttendees: (event.metadata as any)?.maxAttendees || event.max_attendees || (event as any).capacity || 100,
                    status: event.status || 'published',
                    isLesson: event.is_lesson
                  }} />
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-[32px] p-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-800">
                <CalendarDays className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">현재 진행 중인 행사가 없습니다.</p>
              </div>
            )}
          </section>
        </div>

        {/* Right Sidebar Info */}
        <div className="space-y-8">
          {/* Contact & Links */}
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-6">Contact Info</h4>
            
            <div className="space-y-5">
              {profile.portfolioUrl && (
                <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-indigo-50 transition-all">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase text-slate-400">Portfolio</p>
                    <p className="text-sm font-bold truncate">Web Page</p>
                  </div>
                </a>
              )}
              
              {profile.studioLocation && (
                <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase text-slate-400">Location</p>
                    <p className="text-sm font-bold truncate">{profile.studioLocation}</p>
                  </div>
                </div>
              )}

              {profile.phone && (
                 <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase text-slate-400">Contact</p>
                    <p className="text-sm font-bold truncate">{profile.phone}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-800 flex justify-center gap-4">
              <button className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 transition-all">
                <Instagram className="w-5 h-5" />
              </button>
              <button className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-500 transition-all">
                <Send className="w-5 h-5" />
              </button>
              <button className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-500 transition-all">
                <Mail className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Ad/Promo Slot */}
          <div className="bg-indigo-600 rounded-[32px] p-8 text-white relative overflow-hidden group shadow-xl shadow-indigo-600/30">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/20 transition-all"></div>
            <h4 className="text-xl font-black mb-4 relative z-10 leading-tight">댄스 아카데미 <br />신규 관원을 모집합니다!</h4>
            <p className="text-sm text-indigo-100/80 mb-6 relative z-10 leading-relaxed font-medium">Dancehive에서 직접 {profile.displayName} 강사의 특별한 일정을 확인해보세요.</p>
            <button className="w-full py-3.5 bg-white text-indigo-600 font-black rounded-2xl relative z-10 text-sm shadow-xl shadow-black/10">
              더 알아보기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
