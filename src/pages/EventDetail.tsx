import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useLanguage } from '../context/LanguageContext';
import TypeBadge from '../components/TypeBadge';
import { handleSupabaseError, OperationType } from '../lib/supabaseError';
import { EventData } from '../components/EventCard';

interface RegistrationData {
  id?: string;
  eventId: string;
  userId: string;
  hostId: string;
  registeredAt: any;
  status: 'confirmed' | 'cancelled';
}

import { format } from 'date-fns';
import { ko, enUS, ja, zhCN, th, vi } from 'date-fns/locale';
import { Calendar, Clock, MapPin, Users, Ticket, ArrowLeft, ExternalLink, Share2, X, ChevronLeft, ChevronRight, Image as ImageIcon, Heart, Sparkles, Languages, CreditCard, Music, Mic2, Navigation, Copy, Check } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useGoogleMaps } from '../context/GoogleMapsContext';
import { GoogleMap, Marker } from '@react-google-maps/api';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { language, t } = useLanguage();
  
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const getLocale = () => {
    switch (language) {
      case 'en': return enUS;
      case 'ja': return ja;
      case 'zh': return zhCN;
      case 'th': return th;
      case 'vi': return vi;
      default: return ko;
    }
  };

  const { isLoaded, loadError } = useGoogleMaps();

  useEffect(() => {
    if (!id) return;

    const fetchEventAndReg = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error || !data) {
          navigate('/');
          return;
        }

        const mappedEvent = {
          id: data.id,
          title: data.title,
          description: data.description,
          date: data.date,
          category: data.category,
          locationName: data.location_name,
          status: data.status,
          price: data.price,
          capacity: data.capacity,
          hostId: data.host_id,
          imageUrl: data.image_url,
          isBanner: data.is_banner,
          isLesson: data.is_lesson,
          priority: data.priority,
          likesCount: data.likes_count,
          createdAt: data.created_at,
          currentAttendees: data.likes_count // Fallback if no counts table
        };
        
        setEvent(mappedEvent);

        if (user) {
          // Check registration
          const { data: regData } = await supabase
            .from('registrations')
            .select('*')
            .eq('event_id', id)
            .eq('user_id', user.id)
            .single();
          
          if (regData) setRegistration(regData);

          // Check Like status (Placeholder if event_likes table exists)
          // In simpler setup, we can use a separate table or just skip if not critical
          // For now, let's assume no high-level like tracking for now to simplify
        }
      } catch (err) {
        handleSupabaseError(err, OperationType.GET, 'events');
      } finally {
        setLoading(false);
      }
    };

    fetchEventAndReg();
  }, [id, user, navigate]);

  const handleRegister = async () => {
    if (!user || !event || !id) {
      alert("로그인이 필요합니다.");
      return;
    }
    setProcessing(true);
    try {
      console.log("Attempting registration:", { event_id: id, user_id: user.id });
      // Direct insertion. RLS will handle auth checks.
      const { data, error } = await supabase
        .from('registrations')
        .insert({
          event_id: id,
          user_id: user.id,
          status: 'confirmed'
        })
        .select();

      console.log("Registration response:", { data, error });

      if (error) {
        if (error.code === '23505') alert("이미 신청된 행사입니다.");
        else {
          handleSupabaseError(error, OperationType.CREATE, 'registrations', user.id);
          throw error;
        }
      } else {
        setRegistration(data?.[0] || { status: 'confirmed' });
        alert("참여 신청이 완료되었습니다!");
      }
    } catch (err: any) {
      console.error("handleRegister catch:", err);
      const errInfo = handleSupabaseError(err, OperationType.CREATE, 'registrations', user.id);
      alert(`신청 중 오류가 발생했습니다: ${err.message || 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!user || !id) return;
    if (!window.confirm("정말 참여를 취소하시겠습니까?")) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('registrations')
        .delete()
        .eq('event_id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setRegistration(null);
      alert("참여가 취소되었습니다.");
    } catch (err: any) {
      console.error(err);
      alert("취소 중 오류가 발생했습니다.");
    } finally {
      setProcessing(false);
    }
  };

  const toggleLike = async () => {
    // Simplified like logic for Supabase (Just increment local count or use a like table)
    setIsLiked(!isLiked);
  };

  const handleCopyAddress = () => {
    const textToCopy = event.formattedAddress || event.locationName;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div></div>;
  }

  if (!event) return null;

  const dateObj = event.date ? new Date(event.date) : new Date();
  const endDateObj = event.endDate ? new Date(event.endDate) : new Date();
  const isFull = event.currentAttendees >= event.maxAttendees;

  // Handle images array fallback
  const images = event.imageUrls && event.imageUrls.length > 0 ? event.imageUrls : (event.imageUrl ? [event.imageUrl] : []);

  const openFullscreen = (index: number) => {
    setCurrentImageIndex(index);
    setFullscreenImage(images[index]);
    document.body.style.overflow = 'hidden';
  };

  const closeFullscreen = () => {
    setFullscreenImage(null);
    document.body.style.overflow = 'unset';
  };

  const showNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIdx = (currentImageIndex + 1) % images.length;
    setCurrentImageIndex(nextIdx);
    setFullscreenImage(images[nextIdx]);
  };

  const showPrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prevIdx = currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1;
    setCurrentImageIndex(prevIdx);
    setFullscreenImage(images[prevIdx]);
  };

  // For actionable actions (Google Calendar format)
  // Format dates for Google Calendar (YYYYMMDDTHHMMSSZ)
  const formatForGCat = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g,"");
  const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatForGCat(dateObj)}/${formatForGCat(endDateObj)}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.locationName)}`;
  
  // Directions URL logic
  const kakaoMapUrl = event.geoPoint 
    ? `https://map.kakao.com/link/to/${encodeURIComponent(event.locationName)},${event.geoPoint.lat},${event.geoPoint.lng}`
    : `https://map.kakao.com/link/search/${encodeURIComponent(event.formattedAddress || event.locationName)}`;

  const naverMapUrl = event.geoPoint
    ? `https://map.naver.com/v5/directions/-/-/${event.geoPoint.lng},${event.geoPoint.lat},${encodeURIComponent(event.locationName)}/-/walk`
    : `https://map.naver.com/v5/search/${encodeURIComponent(event.formattedAddress || event.locationName)}`;

  const googleMapDirUrl = event.geoPoint
    ? `https://www.google.com/maps/dir/?api=1&destination=${event.geoPoint.lat},${event.geoPoint.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.formattedAddress || event.locationName)}`;

  const isHost = user && event.hostId === user.id;
  const isAdmin = profile?.role === 'admin';
  const canEdit = isHost || isAdmin;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="max-w-[1200px] w-full mx-auto"
    >
      <div className="flex justify-between items-center mb-6 px-4 md:px-0">
        <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">
          <ArrowLeft className="w-4 h-4 mr-2" /> 목록으로 돌아가기
        </button>
        
        {canEdit && (
          <button 
            onClick={() => navigate(`/edit/${event.id}`)}
            className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all"
          >
            행사 수정하기
          </button>
        )}
      </div>

      {/* Event Header Image/Gallery - Above Title as requested */}
      <div className="mb-8 px-4 md:px-0">
        <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-sm">
          <div 
            className="relative aspect-video md:aspect-[21/9] cursor-zoom-in group bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center"
            onClick={() => {
              if (images.length > 0) setFullscreenImage(images[currentImageIndex]);
            }}
          >
            {images.length > 0 ? (
              <img 
                src={images[currentImageIndex]} 
                alt={event.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-indigo-300 dark:text-indigo-800/50">
                <Calendar className="w-20 h-20" />
                <span className="font-black text-2xl tracking-tight">Event Image</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            
            {/* Category Badge */}
            <div className="absolute top-6 left-6">
              <span className="bg-white/95 backdrop-blur-md shadow-sm text-indigo-600 px-4 py-1.5 rounded-full text-[13px] font-black border border-white/20">
                {event.category || 'Event'}
              </span>
            </div>

            {images.length > 1 && (
              <div className="absolute bottom-6 right-6 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-bold flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5" />
                {currentImageIndex + 1} / {images.length}
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="p-4 border-t border-slate-50 dark:border-slate-800/50 flex gap-3 overflow-x-auto no-scrollbar">
              {images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={clsx(
                    "relative shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all",
                    idx === currentImageIndex 
                      ? "border-indigo-600 ring-2 ring-indigo-600/20" 
                      : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  <img 
                    src={img} 
                    alt={`${event.title} thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Title - Bold and Large below image */}
      <div className="mb-12 px-4 md:px-0">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-[900] text-slate-900 dark:text-white leading-tight tracking-tight flex items-center">
          <TypeBadge isLesson={event.isLesson} className="!text-[20px] md:!text-[24px] px-3 py-1 mr-4 border-slate-200 dark:border-slate-800" />
          {event.title}
        </h1>
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] lg:gap-12 px-4 md:px-0 pb-24">
        {/* Left Column: Event Information Blocks */}
        <div className="space-y-6">

          {/* Date Block */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 flex items-center shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center mr-6 shrink-0">
              <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <p className="text-[18px] md:text-[20px] font-bold text-slate-900 dark:text-slate-100">
                {format(dateObj, 'yyyy년 M월 d일 (E) a h:mm', { locale: getLocale() })}
              </p>
            </div>
            <a href={gCalUrl} target="_blank" rel="noopener noreferrer" className="ml-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm whitespace-nowrap">
              {t('event.calendar.add')}
            </a>
          </div>

          {/* Location Block */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center mr-6 shrink-0">
                  <MapPin className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-[18px] md:text-[20px] font-bold text-slate-900 dark:text-slate-100 mb-1">{event.locationName}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{event.formattedAddress}</p>
                </div>
              </div>
              <button 
                onClick={handleCopyAddress}
                className={clsx(
                  "p-3 rounded-xl transition-all flex items-center gap-2",
                  copied 
                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 font-bold text-sm" 
                    : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                )}
                title="주소 복사"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied && "복사됨"}
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <a 
                href={kakaoMapUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-[#FAE100] text-[#3C1E1E] px-4 py-3.5 rounded-2xl font-bold text-sm hover:brightness-95 transition-all shadow-sm flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-9 h-9 bg-[#3C1E1E] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Navigation className="w-4 h-4 text-[#FAE100] fill-current" />
                </div>
                카카오맵 길찾기
              </a>
              <a 
                href={naverMapUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-[#03C75A] text-white px-4 py-3.5 rounded-2xl font-bold text-sm hover:brightness-95 transition-all shadow-sm flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Navigation className="w-4 h-4 text-[#03C75A] fill-current" />
                </div>
                네이버 지도 길찾기
              </a>
              <a 
                href={googleMapDirUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-3.5 rounded-2xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm flex flex-col items-center justify-center gap-2 group sm:col-span-1 col-span-2"
              >
                <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Navigation className="w-4 h-4 text-indigo-600 dark:text-indigo-400 fill-current" />
                </div>
                구글 지도 길찾기
              </a>
            </div>
          </div>

          {/* Map Block */}
          <div className="rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm min-h-[300px]">
            {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY || loadError ? (
              <div className="bg-amber-50 dark:bg-amber-900/10 h-full p-8 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-800/30 rounded-full flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-amber-600" />
                </div>
                <h4 className="text-amber-900 dark:text-amber-400 font-bold mb-2">Google Maps API 키가 설정되지 않았습니다.</h4>
                <p className="text-amber-700 dark:text-amber-500 text-sm max-w-sm">
                  지도를 표시하려면 우측 상단 <b>Settings &gt; Secrets</b> 메뉴에서 <code className="bg-amber-100 dark:bg-amber-800/30 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code>를 등록해주세요.
                </p>
                <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noopener noreferrer" className="mt-4 text-amber-800 dark:text-amber-400 text-xs font-bold underline">
                  구글 클라우드 콘솔에서 키 발급받기
                </a>
              </div>
            ) : isLoaded && event.geoPoint && event.geoPoint.lat ? (
              <div className="h-[400px]">
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={{ lat: event.geoPoint.lat, lng: event.geoPoint.lng }}
                  zoom={16}
                  options={{ disableDefaultUI: true, zoomControl: true }}
                >
                  <Marker position={{ lat: event.geoPoint.lat, lng: event.geoPoint.lng }} />
                </GoogleMap>
              </div>
            ) : (
              <div className="h-[400px] bg-slate-50 dark:bg-slate-800/50 animate-pulse flex items-center justify-center text-slate-400">
                지도를 불러오는 중...
              </div>
            )}
          </div>

          {/* Host Block */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 flex items-center shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center mr-6 shrink-0">
              <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-[18px] md:text-[20px] font-bold text-slate-900 dark:text-slate-100">
              주최자: {event.hostName}
            </p>
          </div>

          {/* Lineup Section (If exists) */}
          {(event.djs?.length > 0 || event.performances?.length > 0 || event.media?.length > 0) && (
            <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">라인업 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {event.djs?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                      <Music className="w-4 h-4 mr-2" /> DJs
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {event.djs.map((dj: string, idx: number) => (
                        <span key={idx} className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 font-bold text-[14px] border border-slate-100 dark:border-slate-700">
                          {dj}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {event.performances?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                      <Mic2 className="w-4 h-4 mr-2" /> Performances
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {event.performances.map((perf: string, idx: number) => (
                        <span key={idx} className="bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg text-indigo-700 dark:text-indigo-400 font-bold text-[14px] border border-indigo-100/50 dark:border-indigo-800/30">
                          {perf}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description Section */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 md:p-10 shadow-sm">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">행사 상세 설명</h3>
            <div className="whitespace-pre-wrap text-slate-600 dark:text-slate-400 leading-relaxed text-[16px]">
              {event.description}
            </div>
          </div>
        </div>

        {/* Right Column: Ticketing/Booking Action Card */}
        <div className="mt-12 lg:mt-0">
          <div className="sticky top-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">예매 정보</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={toggleLike}
                    className={clsx(
                      "p-2.5 rounded-full transition-all bg-rose-50 dark:bg-rose-900/20",
                      isLiked ? "text-rose-500 scale-110" : "text-rose-300 hover:text-rose-500"
                    )}
                  >
                    <Heart className={clsx("w-5 h-5", isLiked && "fill-current")} />
                  </button>
                  <button className="p-2.5 rounded-full text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="mb-6 px-1">
                <span className="text-[14px] font-bold text-slate-700 dark:text-slate-300">관심행사 {event.likesCount || 0}</span>
              </div>

              {/* Tickets Box */}
              {event.tickets && event.tickets.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-5 mb-8 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-4 text-slate-500 dark:text-slate-400">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-[13px] font-bold">파티비 (티켓)</span>
                  </div>
                  <div className="space-y-3">
                    {event.tickets.map((ticket: { name: string, price: number }, idx: number) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-[14px] text-slate-700 dark:text-slate-300 font-medium">{ticket.name}</span>
                        <span className="text-[15px] text-indigo-700 dark:text-indigo-400 font-[800]">
                          {ticket.price === 0 ? '무료' : `${ticket.price.toLocaleString()}원`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Guidance (입금안내) */}
              {event.paymentMethod && (
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-5 mb-8 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-4 text-slate-500 dark:text-slate-400">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-[13px] font-bold">입금 안내</span>
                  </div>
                  <div className="whitespace-pre-wrap text-[14px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {event.paymentMethod}
                  </div>
                </div>
              )}

              <div className="mb-10">
                <div className="flex justify-between items-end mb-2.5">
                  <span className="text-[13px] font-bold text-slate-500 uppercase tracking-tight">참여자 현황</span>
                  <span className="text-[14px] font-[800] text-slate-900 dark:text-white">{event.currentAttendees} / {event.maxAttendees}명</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={clsx("h-full transition-all duration-1000 bg-indigo-600 rounded-full")}
                    style={{ width: `${Math.min((event.currentAttendees / event.maxAttendees) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {registration?.status === 'confirmed' ? (
                <div className="space-y-4">
                  <div className="w-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 py-4 rounded-2xl text-emerald-700 dark:text-emerald-400 font-[800] flex items-center justify-center gap-2">
                    <Ticket className="w-5 h-5" />
                    참여 확정되었습니다
                  </div>
                  <button 
                    onClick={handleCancel}
                    disabled={processing}
                    className="w-full py-4 text-red-500 font-bold border border-red-100 dark:border-red-900/30 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
                  >
                    참여 취소하기
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleRegister}
                  disabled={isFull || processing}
                  className={clsx(
                    "w-full py-5 rounded-2xl font-[900] text-lg text-white shadow-xl transition-all",
                    isFull 
                      ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none" 
                      : "bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] shadow-indigo-600/30",
                    processing && "opacity-75 cursor-wait"
                  )}
                >
                  {isFull ? '모집 마감' : '참여 신청하기'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky RSVP Control for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-30 lg:hidden">
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleLike}
            className={clsx(
              "p-4 rounded-2xl border transition-all",
              isLiked ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30 text-red-500" : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-400"
            )}
          >
            <Heart className={clsx("w-6 h-6", isLiked && "fill-current")} />
          </button>
          
          {registration?.status === 'confirmed' ? (
            <button 
              onClick={handleCancel}
              disabled={processing}
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-4 rounded-2xl font-black tracking-tight hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {processing ? '처리 중...' : t('event.cancel')}
            </button>
          ) : isFull ? (
            <div className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-400 py-4 rounded-2xl font-black text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
              {t('event.full')}
            </div>
          ) : (
            <button 
              onClick={handleRegister}
              disabled={processing}
              className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black tracking-tight hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
            >
              {processing ? '처리 중...' : t('event.register')}
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen Lightbox */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
            onClick={closeFullscreen}
          >
            <button 
              className="absolute top-6 right-6 p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all"
              onClick={closeFullscreen}
            >
              <X className="w-8 h-8" />
            </button>
            
            {images.length > 1 && (
              <>
                <button 
                  className="absolute left-6 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all"
                  onClick={showPrevImage}
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button 
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all"
                  onClick={showNextImage}
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}

            <div className="max-w-[90vw] max-h-[90vh]">
              <img 
                src={fullscreenImage} 
                alt="Fullscreen event" 
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" 
                onClick={(e) => e.stopPropagation()} 
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 px-4 py-2 bg-black/50 rounded-full backdrop-blur">
              {images.map((_, idx) => (
                <button 
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(idx);
                    setFullscreenImage(images[idx]);
                  }}
                  className={clsx(
                    "w-2.5 h-2.5 rounded-full transition-all", 
                    idx === currentImageIndex ? "bg-white scale-125" : "bg-white/40 hover:bg-white/70"
                  )}
                  aria-label={`Show image ${idx + 1}`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
