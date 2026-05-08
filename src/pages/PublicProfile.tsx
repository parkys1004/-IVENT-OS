import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CalendarDays, MapPin, Users, Music, Mic2, Star, 
  ArrowLeft, Share2, Globe, GraduationCap, Trophy, 
  Mail, Phone, Instagram, Send, Camera, CheckCircle2,
  Play, ExternalLink, MessageCircle, Clock, Youtube,
  Heart, Filter, ChevronRight, Sparkles, Zap
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import EventCard from '../components/EventCard';
import { UserProfile } from '../context/AuthContext';
import clsx from 'clsx';

// --- Shared Components ---

const ExpertBadge = () => (
  <div className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-indigo-200 dark:border-indigo-800 shadow-sm">
    <CheckCircle2 className="w-3 h-3" />
    Verified Expert
  </div>
);

const AvailabilityBadge = ({ active }: { active: boolean }) => (
  <div className={clsx(
    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white dark:bg-slate-900 shadow-lg border border-slate-100 dark:border-slate-800",
    active ? "text-emerald-600" : "text-slate-400"
  )}>
    <div className={clsx("w-1.5 h-1.5 rounded-full", active ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
    {active ? "Accepting Inquiries" : "Currently Busy"}
  </div>
);

// --- 1. Instructor Layout ---
const InstructorLayout = ({ profile, events }: { profile: any, events: any[] }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'lessons' | 'reviews'>('info');

  return (
    <div className="space-y-12">
      {/* Reels / Video Slider */}
      <section>
        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2 tracking-tight">
          <Youtube className="w-6 h-6 text-rose-500" /> Style & Performance
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {[1, 2, 3, 4].map((i) => (
            <motion.div 
              key={i} 
              whileHover={{ y: -5 }}
              className="shrink-0 w-40 sm:w-48 aspect-[9/16] bg-slate-100 dark:bg-slate-800 rounded-[32px] overflow-hidden relative group cursor-pointer border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/30">
                  <Play className="w-5 h-5 text-white fill-white translate-x-0.5" />
                </div>
              </div>
              <div className="absolute top-4 right-4">
                 <Instagram className="w-4 h-4 text-white/50" />
              </div>
              <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700">
                <Music className="w-8 h-8 opacity-20" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Tabbable Details Content */}
      <section className="bg-white dark:bg-slate-900 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-50 dark:border-slate-800">
          {(['info', 'lessons', 'reviews'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                "flex-1 py-7 text-[11px] font-[1000] uppercase tracking-[0.2em] transition-all relative",
                activeTab === tab ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {tab === 'info' ? 'About & Bio' : tab === 'lessons' ? 'Current Lessons' : 'Feedback'}
              {activeTab === tab && (
                <motion.div layoutId="tab-bar" className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="p-8 sm:p-12">
          <AnimatePresence mode="wait">
            {activeTab === 'info' && (
              <motion.div 
                key="info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="space-y-10"
              >
                <div>
                   <h4 className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">
                     <GraduationCap className="w-4 h-4" /> Professional Background
                   </h4>
                   <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-bold text-lg">
                     {profile.description || "강사님의 전문적인 소개를 기다리고 있습니다."}
                   </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800">
                   <h4 className="flex items-center gap-2 text-[10px] font-black text-amber-500 uppercase tracking-widest mb-6">
                     <Trophy className="w-4 h-4" /> Career Milestones
                   </h4>
                   <div className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400 leading-8 font-bold">
                     {profile.career || "주요 경력 사항이 아직 등록되지 않았습니다."}
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'lessons' && (
              <motion.div 
                key="lessons" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {events.filter(e => e.isLesson).map((event, idx) => (
                  <EventCard key={event.id} index={idx} event={event} />
                ))}
                {events.filter(e => e.isLesson).length === 0 && (
                  <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-slate-950 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-slate-400 font-bold italic">진행 중인 강습이 없거나 비공개 상태입니다.</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'reviews' && (
              <motion.div 
                key="reviews" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {[1, 2].map(i => (
                  <div key={i} className="p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                       <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                       </div>
                       <span className="text-[10px] font-black text-slate-400">2024.04.{20-i}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                      "기초부터 탄탄하게 잡아주시는 스타일이라 초보자임에도 불구하고 금방 따라갈 수 있었어요. 강추합니다!"
                    </p>
                    <div className="flex items-center gap-3 mt-6">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center"><Users className="w-4 h-4 text-indigo-400" /></div>
                      <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase">Verified Student</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Inquiries Floating Section (for Desktop) */}
      <div className="fixed bottom-12 right-12 z-[1001] hidden lg:block">
        <motion.button 
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-3 bg-indigo-600 text-white px-10 py-5 rounded-[28px] shadow-2xl shadow-indigo-600/40 font-black uppercase tracking-widest text-sm"
        >
          <MessageCircle className="w-5 h-5 fill-white" /> Inquire for Lessons
        </motion.button>
      </div>
    </div>
  );
};

// --- 2. DJ Layout ---
const DJLayout = ({ profile, events }: { profile: any, events: any[] }) => {
  const genreData = [
    { name: 'Salsa', value: 50, color: '#6366f1' },
    { name: 'Bachata', value: 30, color: '#ec4899' },
    { name: 'Kizomba', value: 20, color: '#10b981' }
  ];

  return (
    <div className="space-y-12">
      {/* Visual DJ Card - Dark Mode Aesthetic Inspired */}
      <section className="bg-slate-950 border border-slate-800 rounded-[56px] p-10 sm:p-14 text-white relative overflow-hidden group shadow-2xl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[140px] -mr-64 -mt-64 group-hover:bg-indigo-600/20 transition-all duration-1000" />
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-12 items-center">
          <div>
            <div className="flex items-center gap-2 text-rose-500 mb-6 font-black uppercase tracking-[0.5em] text-[11px]">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Now Mixing
            </div>
            <h3 className="text-4xl sm:text-5xl font-[1000] tracking-tighter mb-6 italic leading-none">
               "Noche de Mambo <br />Spring Set 2024"
            </h3>
            <p className="text-slate-400 font-bold text-lg leading-relaxed mb-10 max-w-lg">
              고전적인 살사 비트부터 현대적인 일렉트로 맘보까지, <br />춤 추기 가장 편안한 플로우를 만들어냅니다.
            </p>
            <div className="flex flex-wrap gap-4">
               <button className="px-8 py-4 bg-white text-slate-950 rounded-2xl font-black text-sm flex items-center gap-3 hover:bg-slate-100 transition-all active:scale-95 shadow-xl">
                 <Play className="w-4 h-4 fill-slate-900" /> SoundCloud Set
               </button>
               <button className="px-8 py-4 bg-slate-900 border border-slate-800 text-white rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-slate-800 transition-all">
                 <Mic2 className="w-4 h-4" /> Request Gig
               </button>
            </div>
          </div>

          <div className="hidden lg:flex flex-col items-center">
             <div className="relative group/disc">
                <div className="w-44 h-44 rounded-full border border-white/5 p-1 animate-[spin_12s_linear_infinite]">
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden border-4 border-slate-800 shadow-inner">
                    <img src={profile.photoURL} alt="disc" className="w-full h-full object-cover opacity-60 grayscale group-hover/disc:grayscale-0 transition-all" />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="w-10 h-10 rounded-full bg-slate-950 border border-white/10 shadow-inner" />
                    </div>
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 bg-indigo-600 w-8 h-8 rounded-full flex items-center justify-center shadow-lg">
                   <Zap className="w-4 h-4 text-white fill-white" />
                </div>
             </div>
             <p className="mt-8 text-[11px] font-black text-slate-600 uppercase tracking-widest text-center">33/45 RPM High Fidelity</p>
          </div>
        </div>
      </section>

      {/* Genre Balance & Upcoming Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <section className="bg-white dark:bg-slate-900 rounded-[48px] border border-slate-100 dark:border-slate-800 p-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <h4 className="text-[11px] font-[1000] text-slate-800 dark:text-white uppercase tracking-[0.3em] mb-10 flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-500" /> Genre DNA Profile
          </h4>
          <div className="h-56 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={genreData} cx="50%" cy="50%" 
                  innerRadius={55} outerRadius={85} 
                  paddingAngle={8} dataKey="value" stroke="none"
                >
                  {genreData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: 'none', 
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    fontWeight: 1000,
                    padding: '12px 20px'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-10">
             {genreData.map((d, i) => (
                <div key={i} className="flex items-center gap-2.5">
                   <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                   <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      {d.name} <span className="text-slate-800 dark:text-white ml-1">{d.value}%</span>
                   </span>
                </div>
             ))}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-[48px] border border-slate-100 dark:border-slate-800 p-10 shadow-sm">
           <h4 className="text-[11px] font-[1000] text-slate-800 dark:text-white uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
             <CalendarDays className="w-4 h-4 text-rose-500" /> Residency Schedule
           </h4>
           <div className="space-y-4">
              {[
                { name: 'S-Dance Monday Night', location: 'Gangnam, Seoul', day: 'MON' },
                { name: 'Salsa on Weekend', location: 'Hongdae, Seoul', day: 'SAT' }
              ].map((gig, i) => (
                <div key={i} className="flex items-center gap-5 p-5 rounded-[28px] bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 group hover:border-indigo-200 transition-all">
                   <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm group-hover:scale-105 transition-transform">
                      <span className="text-[12px] font-black text-rose-600">{gig.day}</span>
                   </div>
                   <div className="flex-1">
                      <p className="text-sm font-black text-slate-800 dark:text-white mb-0.5">{gig.name}</p>
                      <p className="text-[11px] font-bold text-slate-500">{gig.location}</p>
                   </div>
                   <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              ))}
              <div className="mt-6 p-6 rounded-[32px] bg-slate-900 dark:bg-slate-950 text-white">
                 <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Next Event</p>
                 <Link to="/place/search" className="flex items-center justify-between group">
                    <span className="text-sm font-black italic">Check Fully Gigs List</span>
                    <ArrowLeft className="w-4 h-4 group-hover:translate-x-1 transition-transform rotate-180" />
                 </Link>
              </div>
           </div>
        </section>
      </div>
    </div>
  );
};

// --- 3. Media Expert Layout ---
const MediaExpertLayout = ({ profile }: { profile: any }) => {
  return (
    <div className="space-y-12">
       {/* High Resolution Hero Pieces */}
       <section className="relative h-[560px] rounded-[64px] overflow-hidden group shadow-2xl">
          <img 
            src={profile.photoURL} 
            alt="hero portfolio" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[3000ms]" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          <div className="absolute bottom-16 left-16 right-16">
             <div className="flex items-center gap-3 text-cyan-400 mb-6 font-black uppercase tracking-[0.5em] text-[11px]">
                <Camera className="w-5 h-5" /> Master Shot Selection
             </div>
             <h3 className="text-4xl sm:text-6xl font-[1000] text-white tracking-tighter leading-[1.1] max-w-2xl mb-8 italic">
                순간의 전율을 기록하는 <br />시각적 연금술사
             </h3>
             <div className="flex gap-4">
                 <button className="px-8 py-4 bg-cyan-500 text-slate-950 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-cyan-400 transition-all shadow-xl">
                    View Full Portfolio
                 </button>
             </div>
          </div>
       </section>

       {/* Masonry-Style Gallery (Simplified) */}
       <section>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
             <div>
                <h3 className="text-[28px] font-black text-slate-900 dark:text-white tracking-tight mb-2">Snapshot Repository</h3>
                <p className="text-slate-500 font-bold text-sm tracking-tight">전국 50개 이상의 페스티벌 및 파티 촬영 기록</p>
             </div>
             <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
                {['All', 'Event', 'Portrait'].map((f, i) => (
                  <button key={f} className={clsx("px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all", i === 0 ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-400")}>{f}</button>
                ))}
             </div>
          </div>

          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
             {profile.portfolioImages?.map((url: string, idx: number) => (
               <motion.div 
                 key={idx} whileHover={{ y: -8 }}
                 className="relative rounded-[36px] overflow-hidden border border-slate-100 dark:border-slate-800 group shadow-lg"
               >
                 <img src={url} alt={`portfolio-${idx}`} className="w-full h-auto object-cover" />
                 <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-all p-8 flex flex-col justify-end backdrop-blur-md">
                    <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] mb-2">Performance Snap</p>
                    <p className="text-lg font-black text-white italic truncate tracking-tight mb-6">"Stage Passion v.44"</p>
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold border-t border-white/10 pt-6 uppercase tracking-widest">
                       <span>Sony A7R IV</span>
                       <span className="w-1 h-1 rounded-full bg-slate-700" />
                       <span>35mm f/1.4</span>
                    </div>
                 </div>
               </motion.div>
             ))}
          </div>
       </section>

       {/* Service & Process Section */}
       <section className="bg-slate-950 rounded-[64px] p-12 sm:p-16 text-white border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan-600/10 blur-[130px] -mr-32 -mt-32" />
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1fr_320px] gap-20">
             <div>
                <h4 className="text-3xl font-black tracking-tight mb-12 italic italic">Service Blueprint</h4>
                <div className="space-y-12">
                   {[
                     { step: '01', title: '컨설팅 & 예약', desc: '행사의 분위기와 지향하는 결과물의 톤앤매너를 사전에 조율합니다.', color: 'text-cyan-400' },
                     { step: '02', title: '현장 촬영 & 몰입', desc: '댄서들의 흐름을 방해하지 않으면서도 가장 역동적인 순간을 포착합니다.', color: 'text-indigo-400' },
                     { step: '03', title: '선별 및 고화질 보정', desc: '48시간 이내에 선별된 컷에 대한 정밀 보정 후 클라우드로 전달합니다.', color: 'text-rose-400' }
                   ].map((s, i) => (
                     <div key={i} className="flex gap-8 group/step">
                        <div className={clsx("shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border border-white/10 bg-white/5", s.color)}>{s.step}</div>
                        <div>
                           <h5 className="font-black text-lg mb-2">{s.title}</h5>
                           <p className="text-slate-400 text-[13px] font-medium leading-relaxed max-w-sm">{s.desc}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
             
             <div className="bg-white/5 backdrop-blur-xl rounded-[40px] p-10 border border-white/10 shadow-2xl flex flex-col justify-between">
                <div>
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-6">Service Packages</p>
                   <div className="space-y-6">
                      <div className="flex justify-between items-end pb-4 border-b border-white/5">
                        <span className="text-xs font-bold text-slate-300 uppercase">Party Snap</span>
                        <span className="text-2xl font-black tracking-tighter">₩200k~</span>
                      </div>
                      <div className="flex justify-between items-end pb-4 border-b border-white/5">
                        <span className="text-xs font-bold text-slate-300 uppercase">Festival Coverage</span>
                        <span className="text-2xl font-black tracking-tighter">₩600k~</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-xs font-bold text-slate-300 uppercase">Studio Portrait</span>
                        <span className="text-2xl font-black tracking-tighter">₩350k~</span>
                      </div>
                   </div>
                </div>
                <button className="w-full py-5 bg-cyan-600 text-slate-950 font-black rounded-2xl mt-12 hover:bg-cyan-500 transition-all uppercase tracking-widest text-xs">
                   Confirm Availability
                </button>
             </div>
          </div>
       </section>
    </div>
  );
};

// --- Main Application Component ---

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchAllData = async () => {
      setLoading(true);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, display_name, photo_url, role, is_approved, created_at, followers_count, short_bio, description, specialties, career, portfolio_url, studio_location, phone, portfolio_images')
          .eq('id', id)
          .single();

        if (profileError) throw profileError;

        const mapped: UserProfile = {
          uid: profileData.id,
          email: profileData.email || '',
          displayName: profileData.display_name || 'Anonymous Dancer',
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

        // Get role-specific table data
        let specialized = null;
        if (mapped.role === 'instructor') {
          const { data } = await supabase.from('instructors').select('*').eq('id', id).maybeSingle();
          specialized = data;
        } else if (mapped.role === 'dj') {
          const { data } = await supabase.from('djs').select('*').eq('id', id).maybeSingle();
          specialized = data;
        } else if (mapped.role === 'media') {
          const { data } = await supabase.from('creators').select('*').eq('id', id).maybeSingle();
          specialized = data;
        }
        if (specialized) (mapped as any).specialized = specialized;
        setProfile(mapped);

        // Events extraction
        const [partiesResp, lessonsResp] = await Promise.all([
          supabase
            .from('parties')
            .select('id, title, date, location, image_url, category, host_id, status, max_attendees')
            .eq('host_id', id)
            .eq('status', 'published'),
          supabase
            .from('lessons')
            .select('id, title, date, location, image_url, category, host_id, status, max_attendees')
            .eq('host_id', id)
            .eq('status', 'published')
        ]);

        const mappedP = (partiesResp.data || []).map(p => ({
          ...p, date: p.date, isLesson: false, maxAttendees: p.max_attendees || 0
        }));
        const mappedL = (lessonsResp.data || []).map(l => ({
          ...l, date: l.date, isLesson: true, maxAttendees: l.max_attendees || 0
        }));
        setEvents([...mappedP, ...mappedL].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));

      } catch (err) {
        console.error(err);
        setError("Error fetching profile.");
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [id]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
       <div className="w-14 h-14 border-[6px] border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin" />
       <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px]">Synchronizing Profile</p>
    </div>
  );

  if (error || !profile) return (
     <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
        <Users className="w-20 h-20 text-slate-200 mb-8" />
        <h2 className="text-3xl font-[1000] text-slate-900 dark:text-white tracking-tighter mb-4">User Not Found</h2>
        <button onClick={() => navigate(-1)} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/30">Go Back</button>
     </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 pb-32">
      {/* Top Navigation */}
      <div className="py-8 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="group flex items-center gap-3 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-300">
           <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all">
             <ArrowLeft className="w-5 h-5" />
           </div>
           <span className="text-[11px] font-[1000] uppercase tracking-widest">Back to Hive</span>
        </button>
        <button className="w-12 h-12 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-indigo-600 shadow-sm transition-all">
           <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* Profile Signature Header */}
      <div className="bg-white dark:bg-slate-900 rounded-[56px] border border-slate-100 dark:border-slate-800 p-8 sm:p-14 shadow-sm mb-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-full -mr-48 -mt-48 blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start gap-14">
           {/* Visual Identity Area */}
           <div className="relative shrink-0">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="w-44 h-44 sm:w-64 sm:h-64 rounded-[48px] overflow-hidden border-[6px] border-white dark:border-slate-800 shadow-2xl bg-slate-50 relative group"
              >
                 {profile.photoURL ? (
                    <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                 ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300"><Users className="w-24 h-24" /></div>
                 )}
                 <div className="absolute inset-0 ring-inset ring-1 ring-black/5 rounded-[48px]" />
              </motion.div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 scale-110">
                 <AvailabilityBadge active={true} />
              </div>
           </div>

           {/* Core Profile Info */}
           <div className="flex-1 text-center lg:text-left pt-2">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
                 <div>
                    <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
                       <ExpertBadge />
                       <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full border border-amber-100 dark:border-amber-800">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span className="text-[10px] font-black uppercase tracking-wider">Top Rated</span>
                       </div>
                    </div>
                    <h1 className="text-5xl sm:text-7xl font-[1000] text-slate-900 dark:text-white tracking-tighter mb-4 italic italic">
                       {profile.displayName}
                    </h1>
                    <p className={clsx(
                      "font-[1000] uppercase tracking-[0.5em] text-[12px] px-2 border-l-4",
                      profile.role === 'instructor' ? "text-indigo-600 border-indigo-600" : 
                      profile.role === 'dj' ? "text-rose-600 border-rose-600" : 
                      "text-cyan-600 border-cyan-600"
                    )}>
                       Professional {profile.role === 'media' ? 'Media Artist' : profile.role}
                    </p>
                 </div>
                 
                 <div className="flex items-center justify-center gap-4">
                    <button className="px-12 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl font-[1000] text-sm tracking-widest uppercase shadow-2xl hover:translate-y-[-4px] active:translate-y-0 transition-all">
                       Follow Hive
                    </button>
                 </div>
              </div>

              <p className="text-2xl sm:text-3xl text-slate-700 dark:text-slate-300 font-[1000] tracking-tight leading-[1.2] mb-10 max-w-3xl">
                "{profile.shortBio || '무대 위에서의 모든 순간이 기록될 수 있도록 최선을 다합니다.'}"
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-10 gap-y-6">
                {[
                  { icon: MapPin, value: profile.studioLocation || 'Global Resident' },
                  { icon: Users, value: `${profile.followersCount} Observers` },
                  { icon: Clock, value: `Joined in ${format(new Date(profile.createdAt), 'yyyy')}` }
                ].map((stat, i) => (
                  <div key={stat.value} className="flex items-center gap-3">
                     <stat.icon className="w-5 h-5 text-slate-300" />
                     <span className="text-sm font-black text-slate-500 dark:text-slate-400 lowercase tracking-tight">{stat.value}</span>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>

      {/* Content Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-16 items-start">
         {/* Main Dynamic Workspace */}
         <div className="order-2 lg:order-1 min-w-0">
            {profile.role === 'instructor' ? (
              <InstructorLayout profile={profile} events={events} />
            ) : profile.role === 'dj' ? (
              <DJLayout profile={profile} events={events} />
            ) : profile.role === 'media' ? (
              <MediaExpertLayout profile={profile} />
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-[56px] p-12 border border-slate-100 dark:border-slate-800 shadow-sm">
                 <h3 className="text-3xl font-black mb-8 italic tracking-tight">Biography Narrative</h3>
                 <p className="text-slate-600 dark:text-slate-300 font-bold text-lg leading-relaxed">{profile.description || "등록된 자기소개가 없습니다."}</p>
              </div>
            )}
         </div>

         {/* Permanent Sidebar Section */}
         <aside className="order-1 lg:order-2 space-y-10 lg:sticky lg:top-28">
            <div className="bg-white dark:bg-slate-900 rounded-[56px] border border-slate-100 dark:border-slate-800 p-10 sm:p-12 shadow-sm">
               <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-10 underline decoration-slate-100 underline-offset-8">Information Hub</h4>
               
               <div className="space-y-8">
                  {[
                    { icon: Instagram, label: 'SNS Channel', val: `@${profile.displayName.toLowerCase().replace(/\s/g, '_')}`, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/10' },
                    { icon: Globe, label: 'External Portfolio', val: 'Direct Webpage', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/10' },
                    { icon: Mail, label: 'Official Support', val: 'Email Inquiry', color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/10' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-5 group cursor-pointer">
                       <div className={clsx("w-14 h-14 rounded-[20px] flex items-center justify-center transition-all group-hover:scale-110", item.bg)}>
                          <item.icon className={clsx("w-6 h-6", item.color)} />
                       </div>
                       <div className="flex-1 overflow-hidden">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                          <p className="text-sm font-black text-slate-900 dark:text-white truncate">{item.val}</p>
                       </div>
                    </div>
                  ))}
               </div>

               <div className="mt-12 pt-12 border-t border-slate-50 dark:border-slate-800">
                  <button className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl font-[1000] text-[13px] tracking-[0.2em] uppercase shadow-2xl hover:scale-[0.98] transition-all">
                     Open Dialogue
                  </button>
               </div>
            </div>

            {/* Context-Aware Promotional Segment */}
            <div className="bg-slate-900 rounded-[56px] p-12 text-white relative overflow-hidden group border border-slate-800 shadow-2xl">
               <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-transparent to-transparent opacity-50" />
               <Sparkles className="absolute top-10 right-10 w-12 h-12 text-white/5 group-hover:scale-150 group-hover:rotate-12 transition-all duration-1000" />
               <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-4 text-slate-500 relative z-10">Pro Insights</p>
               <h4 className="text-2xl font-black leading-tight mb-8 relative z-10 italic">
                  {profile.role === 'instructor' ? '완벽한 댄스 기초를 잡는 솔루션' : 
                   profile.role === 'dj' ? '에너지 넘치는 파티를 위한 조언' : '기록의 가치를 높이는 법'}
               </h4>
               <button className="w-full py-4.5 bg-white/5 hover:bg-white/10 backdrop-blur-3xl text-white font-black rounded-2xl border border-white/10 text-[11px] uppercase tracking-widest relative z-10 transition-all">
                 Read Practical Tips
               </button>
            </div>
         </aside>
      </div>
    </div>
  );
}
