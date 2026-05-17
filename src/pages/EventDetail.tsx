import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useLanguage } from '../context/LanguageContext';
import TypeBadge from '../components/TypeBadge';
import { handleSupabaseError, OperationType } from '../lib/supabaseError';
import { uploadImageToStorage } from '../lib/storage';
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
import { Calendar, Clock, MapPin, Users, Ticket, ArrowLeft, ExternalLink, Share2, X, ChevronLeft, ChevronRight, Image as ImageIcon, Heart, Sparkles, Languages, CreditCard, Music, Mic2, Navigation, Copy, Check, MessageCircle, Star, Send, Trash2, Upload as UploadIcon, Coins } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useGoogleMaps } from '../context/GoogleMapsContext';
import AdvancedGoogleMap from '../components/AdvancedGoogleMap';

interface Review {
  id: string;
  author_id: string;
  rating: number;
  content: string;
  created_at: string;
  author_name: string;
  author_photo: string;
}

interface Comment {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_name: string;
  author_photo: string;
}

interface EventPhoto {
  id: string;
  user_id: string;
  image_url: string;
  caption?: string;
  created_at: string;
  author_name: string;
  author_photo: string;
}

import { awardPoints } from '../lib/points';
import { ShareModal } from '../components/ShareModal';

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
  const [showShareModal, setShowShareModal] = useState(false);

  // Community States
  const [activeTab, setActiveTab] = useState<'reviews' | 'comments' | 'gallery'>('reviews');
  const [comments, setComments] = useState<Comment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newReviewText, setNewReviewText] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

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

  // id 변경 시에만 이벤트/공개 데이터 fetch
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const fetchEvent = async () => {
      try {
        setLoading(true);
        const PARTY_COLUMNS = 'id, title, description, date, end_date, category, location_name, formatted_address, lat, lng, city, country, status, price, max_attendees, host_id, image_url, is_banner, priority, likes_count, created_at, djs, performances, media, media_experts, tickets, payment_method, payment_link, workshops, youtube_url';
        const LESSON_COLUMNS = 'id, title, description, date, end_date, category, location_name, formatted_address, lat, lng, city, country, status, price, max_attendees, host_id, image_url, is_banner, priority, likes_count, created_at, tickets, payment_method, youtube_url, level, class_time';

        let { data, error } = await supabase
          .from('parties')
          .select(PARTY_COLUMNS)
          .eq('id', id)
          .maybeSingle();

        let isActuallyLesson = false;
        if (!data) {
          const { data: lessonData, error: lessonError } = await supabase
            .from('lessons')
            .select(LESSON_COLUMNS)
            .eq('id', id)
            .maybeSingle();
          if (lessonData) { data = lessonData as any; isActuallyLesson = true; }
          else if (lessonError) console.error("Error fetching lesson:", lessonError);
        }

        if (error) {
          console.error("Error fetching party:", error);
          if (!cancelled) { handleSupabaseError(error, OperationType.GET, 'parties'); navigate('/'); }
          return;
        }
        if (!data) { if (!cancelled) navigate('/'); return; }

        // host 이름 + reg count + 커뮤니티 데이터 병렬 fetch
        const [hostRes, regCountRes, commentsRes, reviewsRes, photosRes] = await Promise.all([
          data.host_id
            ? supabase.from('profiles').select('display_name').eq('id', data.host_id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase.from('registrations').select('id', { count: 'exact', head: true }).eq('event_id', id),
          supabase.from('event_comments')
            .select('id, content, created_at, author_id, author:profiles(display_name, photo_url)')
            .eq('event_id', id).order('created_at', { ascending: false }).limit(50),
          supabase.from('event_reviews')
            .select('id, rating, content, created_at, author_id, author:profiles(display_name, photo_url)')
            .eq('event_id', id).order('created_at', { ascending: false }).limit(30),
          supabase.from('event_photos')
            .select('id, user_id, image_url, caption, created_at, author:profiles(display_name, photo_url)')
            .eq('event_id', id).order('created_at', { ascending: false }).limit(20),
        ]);

        if (cancelled) return;

        const mappedEvent = {
          id: data.id, title: data.title, description: data.description,
          date: data.date || (data as any).start_date, endDate: data.end_date,
          category: data.category,
          locationName: data.location_name || '정보 없음',
          formattedAddress: data.formatted_address || data.location_name || '주소 정보가 없습니다.',
          geoPoint: (data.lat != null && data.lng != null)
            ? { lat: Number(data.lat), lng: Number(data.lng) } : null,
          city: data.city || '', country: data.country || '',
          status: data.status, price: data.price, capacity: data.max_attendees || 0,
          hostId: data.host_id,
          hostName: (hostRes as any).data?.display_name || '알 수 없는 호스트',
          imageUrl: data.image_url, isBanner: data.is_banner,
          isLesson: isActuallyLesson, priority: data.priority,
          likesCount: data.likes_count, createdAt: data.created_at,
          maxAttendees: data.max_attendees || 50,
          currentAttendees: (regCountRes as any).count || 0,
          djs: (data as any).djs || [], performances: (data as any).performances || [],
          media: (data as any).media || [], mediaExperts: (data as any).media_experts || [],
          tickets: (data as any).tickets || [], paymentMethod: (data as any).payment_method || '',
          paymentLink: (data as any).payment_link || '', workshops: (data as any).workshops || [],
          level: (data as any).level || 'beginner', youtubeUrl: (data as any).youtube_url || ''
        };
        setEvent(mappedEvent);

        if (commentsRes.data) {
          setComments(commentsRes.data.map((c: any) => ({
            ...c, author_name: c.author?.display_name || '알 수 없는 사용자', author_photo: c.author?.photo_url || ''
          })));
        }
        if (reviewsRes.data) {
          setReviews(reviewsRes.data.map((r: any) => ({
            ...r, author_name: r.author?.display_name || '알 수 없는 사용자', author_photo: r.author?.photo_url || ''
          })));
        }
        if (photosRes.data) {
          setPhotos(photosRes.data.map((p: any) => ({
            id: p.id, user_id: p.user_id, image_url: p.image_url, caption: p.caption,
            created_at: p.created_at,
            author_name: p.author?.display_name || '알 수 없는 사용자', author_photo: p.author?.photo_url || ''
          })));
        }
      } catch (err) {
        if (!cancelled) handleSupabaseError(err, OperationType.GET, 'parties');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchEvent();
    return () => { cancelled = true; };
  }, [id, navigate]);

  // user 변경 시에만 개인화 데이터(등록 여부) fetch
  useEffect(() => {
    if (!id || !user) { setRegistration(null); return; }
    let cancelled = false;

    supabase.from('registrations').select('id, status, registered_at, ticket_type, ticket_name').eq('event_id', id).eq('user_id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (data) setRegistration(data);
        if (error && error.code !== 'PGRST116') console.error("Error fetching registration:", error);
      });

    return () => { cancelled = true; };
  }, [id, user?.id]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('event_comments')
        .insert({
          event_id: id,
          author_id: user.id,
          content: newComment
        });

      if (error) {
        alert(`댓글 저장 실패: ${error.message}`);
        throw error;
      }
      setNewComment('');
      // Refresh local state (simplified)
      const { data } = await supabase
        .from('event_comments')
        .select(`*, author:profiles(display_name, photo_url)`)
        .eq('event_id', id)
        .order('created_at', { ascending: false });
      if (data) {
        setComments(data.map((c: any) => ({
          ...c,
          author_name: c.author?.display_name || '알 수 없는 사용자',
          author_photo: c.author?.photo_url || ''
        })));
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !newReviewText.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('event_reviews')
        .insert({
          event_id: id,
          author_id: user.id,
          rating: newRating,
          content: newReviewText
        });

      if (error) {
        alert(`리뷰 저장 실패: ${error.message}`);
        throw error;
      }
      
      // Award points for review
      await awardPoints(user.id, 200, `[리뷰 작성] ${event.title}`, { event_id: id });
      alert("리뷰가 등록되었습니다! 200포인트가 지급되었습니다.");

      setNewReviewText('');
      setNewRating(5);
      // Refresh local state
      const { data } = await supabase
        .from('event_reviews')
        .select(`*, author:profiles(display_name, photo_url)`)
        .eq('event_id', id)
        .order('created_at', { ascending: false });
      if (data) {
        setReviews(data.map((r: any) => ({
          ...r,
          author_name: r.author?.display_name || '알 수 없는 사용자',
          author_photo: r.author?.photo_url || ''
        })));
      }
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = async (files: FileList | File[]) => {
    if (!user || !id || files.length === 0) return;
    
    // Check person limit (max 4 per person)
    const existingCount = photos.filter(p => p.user_id === user.id).length;
    if (existingCount + files.length > 4) {
      alert(`한 명당 최대 4장까지만 등록 가능합니다. (현재 ${existingCount}장 등록됨, 추가 시도: ${files.length}장)`);
      return;
    }

    setIsUploading(true);
    let successCount = 0;

    try {
      for (const file of Array.from(files)) {
        const imageUrl = await uploadImageToStorage(file, 'events');
        
        const { error } = await supabase
          .from('event_photos')
          .insert({
            event_id: id,
            user_id: user.id,
            image_url: imageUrl
          });

        if (error) throw error;
        successCount++;
        
        // Award points for each photo
        await awardPoints(user.id, 300, `[갤러리 업로드] ${event.title}`, { event_id: id });
      }

      // Refresh local state
      const { data } = await supabase
        .from('event_photos')
        .select(`*, author:profiles(display_name, photo_url)`)
        .eq('event_id', id)
        .order('created_at', { ascending: false });
      
      if (data) {
        setPhotos(data.map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          image_url: p.image_url,
          caption: p.caption,
          created_at: p.created_at,
          author_name: p.author?.display_name || '알 수 없는 사용자',
          author_photo: p.author?.photo_url || ''
        })));
      }
      
      if (successCount > 0) {
        alert(`${successCount}장의 사진이 성공적으로 등록되었습니다!`);
      }
    } catch (error: any) {
      console.error("Error uploading photos:", error);
      alert(`사진 업로드 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handlePhotoUpload(e.dataTransfer.files);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!window.confirm("이 사진을 삭제하시겠습니까?")) return;
    try {
      const { error } = await supabase.from('event_photos').delete().eq('id', photoId);
      if (error) throw error;
      setPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (error: any) {
      console.error("Delete failed:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleRegister = async () => {
    if (!user || !event || !id) {
      alert("로그인이 필요합니다.");
      return;
    }
    setProcessing(true);
    try {
      console.log("Attempting registration:", { event_id: id, user_id: user.id });
      // Direct insertion. RLS will handle auth checks.
      // We removed explicit 'status: confirmed' to let it default to 'pending' if the policy is strict.
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
        // Award points for registration
        const bookingPoints = Math.floor((event.price || 0) * 0.05) || 500;
        await awardPoints(user.id, bookingPoints, `[행사 예매] ${event.title}`, { event_id: id });

        setRegistration(data?.[0] || { status: 'confirmed' });
        
        // Update local attendee count
        setEvent((prev: any) => ({
          ...prev,
          currentAttendees: (prev?.currentAttendees || 0) + 1
        }));

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
  const currentAttendees = event.currentAttendees || 0;
  const maxAttendees = event.maxAttendees || event.capacity || 0;
  // If maxAttendees is 0, it means unlimited
  const isFull = maxAttendees > 0 && currentAttendees >= maxAttendees;

  // Combine main image and event_photos
  const hostPhotos = photos.filter(p => p.user_id === event.hostId).map(p => p.image_url);
  const images = Array.from(new Set([
    event.imageUrl,
    ...hostPhotos
  ])).filter(Boolean);

  // Detect YouTube video
  const getYouTubeId = (url: string) => {
    if (!url) return null;
    if (url.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = getYouTubeId(event.youtubeUrl || event.description || '');

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
  // Fix expiration logic: Consider event expired only if current time is past start time + 4 hours (buffer) OR past endDate if provided.
  const isExpired = event.endDate 
    ? new Date(event.endDate) < new Date() 
    : new Date(dateObj.getTime() + 4 * 60 * 60 * 1000) < new Date();

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="w-full max-w-[1400px] mx-auto px-0 md:px-4 lg:px-8 pb-32 md:pb-12"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 px-4 md:px-0 mt-4">
        <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium text-sm">
          <ArrowLeft className="w-4 h-4 mr-2" /> 목록으로 돌아가기
        </button>

        <div className="flex items-center gap-2 w-full sm:w-auto ml-auto">
          <button 
            onClick={() => setShowShareModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-500/30 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all"
          >
            <Share2 className="w-4 h-4 text-indigo-500" />
            공유
          </button>
          
          {canEdit && (
            <button 
              onClick={() => navigate(event.isLesson ? `/edit-lesson/${event.id}` : `/edit/${event.id}`)}
              className="flex-1 sm:flex-none flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-500/30 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all"
            >
              {event.isLesson ? '수정' : '수정'}
            </button>
          )}
        </div>
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


            </div>
          </div>
      <div className="mb-10 px-4 md:px-0 flex flex-col gap-3">
        <div className="flex">
          <TypeBadge isLesson={event.isLesson} className="!text-[12px] md:!text-[16px] px-3 py-1.5 border-slate-200 dark:border-slate-800" />
        </div>
        <h1 className="text-2xl md:text-5xl lg:text-6xl font-[950] text-slate-900 dark:text-white leading-[1.2] tracking-tight">
          {event.title}
        </h1>
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] lg:gap-12 px-4 md:px-0 pb-24">
        {/* Left Column: Event Information Blocks */}
        <div className="space-y-6">

          {/* Date Block */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-[24px] md:rounded-[32px] p-5 md:p-8 flex items-center shadow-sm">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center mr-4 md:mr-6 shrink-0">
              <Calendar className="w-5 h-5 md:w-6 md:h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <p className="text-[16px] md:text-[20px] font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {format(dateObj, 'yyyy년 M월 d일 (E) a h:mm', { locale: getLocale() })}
              </p>
            </div>
            <a href={gCalUrl} target="_blank" rel="noopener noreferrer" className="ml-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm whitespace-nowrap">
              {t('event.calendar.add')}
            </a>
          </div>

          {/* Location Block */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-[24px] md:rounded-[32px] p-5 md:p-8 shadow-sm space-y-5 md:space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start flex-1 min-w-0">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center mr-4 md:mr-6 shrink-0">
                  <MapPin className="w-5 h-5 md:w-6 md:h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[17px] md:text-[20px] font-bold text-slate-900 dark:text-slate-100 mb-0.5 leading-tight truncate">{event.locationName}</p>
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-tight line-clamp-1">{event.formattedAddress}</p>
                </div>
              </div>
              <button 
                onClick={handleCopyAddress}
                className={clsx(
                  "p-2.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0",
                  copied 
                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 font-bold text-[10px]" 
                    : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                )}
                title="주소 복사"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied && "복사됨"}
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <a 
                href={kakaoMapUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-[#FAE100] text-[#3C1E1E] px-2 py-3 rounded-2xl font-bold text-[10px] sm:text-xs hover:brightness-95 transition-all shadow-sm flex flex-col items-center justify-center gap-1.5 group text-center"
              >
                <div className="w-8 h-8 bg-[#3C1E1E] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                  <Navigation className="w-3.5 h-3.5 text-[#FAE100] fill-current" />
                </div>
                카카오맵
              </a>
              <a 
                href={naverMapUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-[#03C75A] text-white px-2 py-3 rounded-2xl font-bold text-[10px] sm:text-xs hover:brightness-95 transition-all shadow-sm flex flex-col items-center justify-center gap-1.5 group text-center"
              >
                <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                  <Navigation className="w-3.5 h-3.5 text-[#03C75A] fill-current" />
                </div>
                네이버 지도
              </a>
              <a 
                href={googleMapDirUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-2 py-3 rounded-2xl font-bold text-[10px] sm:text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm flex flex-col items-center justify-center gap-1.5 group text-center"
              >
                <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                  <Navigation className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 fill-current" />
                </div>
                구글 지도
              </a>
            </div>
          </div>

          {/* Workshops Block */}
          {event.workshops && event.workshops.length > 0 && (
            <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-[24px] md:rounded-[32px] p-5 md:p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">워크샵 타임테이블</h3>
              </div>
              
              <div className="space-y-4">
                {event.workshops.map((ws: any, idx: number) => (
                  <div key={idx} className="flex gap-4 p-4 md:p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-500/30 transition-all group">
                    <div className="flex flex-col items-center justify-center min-w-[70px] md:min-w-[90px] border-r border-slate-200 dark:border-slate-700 pr-4 shrink-0">
                      <span className="text-[13px] md:text-sm font-black text-amber-600 dark:text-amber-400">{ws.time || '시간 미지정'}</span>
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:scale-150 group-hover:bg-amber-500 transition-all shadow-sm"></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{ws.teacher ? `${ws.teacher} 님` : '강사 미확정'}</span>
                      </div>
                      <p className="text-[15px] md:text-[18px] font-bold text-slate-900 dark:text-white leading-tight">
                        {ws.topic || '워크샵 주제 정보가 없습니다.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Map Block */}
          <div className="rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm min-h-[300px]">
            {(!import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY === 'MY_GOOGLE_MAPS_API_KEY') || loadError ? (
              <div className="bg-amber-50 dark:bg-amber-900/10 h-full p-8 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-800/30 rounded-full flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-amber-600" />
                </div>
                {loadError ? (
                  <>
                    <h4 className="text-rose-900 dark:text-rose-400 font-bold mb-2">지도를 불러올 수 없습니다.</h4>
                    <p className="text-rose-700 dark:text-rose-500 text-sm max-w-sm mb-4">
                      {loadError.message?.includes('RefererNotAllowedMapError') ? (
                        <>
                          <b>RefererNotAllowedMapError</b>가 발생했습니다. 구글 콘솔의 HTTP 리퍼러 목록에 아래 주소를 추가해주세요:
                          <code className="block mt-2 bg-rose-100 dark:bg-rose-800/30 p-2 rounded break-all whitespace-normal text-[11px] font-mono">
                            {window.location.origin}/*
                          </code>
                        </>
                      ) : (
                        loadError.message || 'Google Maps API 로드 중 알 수 없는 오류가 발생했습니다.'
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <h4 className="text-amber-900 dark:text-amber-400 font-bold mb-2">Google Maps API 키가 설정되지 않았습니다.</h4>
                    <p className="text-amber-700 dark:text-amber-500 text-sm max-w-sm">
                      지도를 표시하려면 우측 상단 <b>Settings &gt; Secrets</b> 메뉴에서 <code className="bg-amber-100 dark:bg-amber-800/30 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code>를 등록해주세요.
                    </p>
                  </>
                )}
                <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noopener noreferrer" className="mt-4 text-amber-800 dark:text-amber-400 text-xs font-bold underline">
                  구글 클라우드 콘솔에서 키 발급받기
                </a>
              </div>
            ) : isLoaded && event.geoPoint && event.geoPoint.lat ? (
              <div className="h-[400px]">
                <AdvancedGoogleMap
                  center={{ lat: event.geoPoint.lat, lng: event.geoPoint.lng }}
                  zoom={16}
                  title={event.locationName}
                />
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
          {(event.djs?.length > 0 || event.performances?.length > 0 || event.mediaExperts?.length > 0) && (
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
                {event.mediaExperts?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                      <ImageIcon className="w-4 h-4 mr-2" /> Media Experts
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {event.mediaExperts.map((expert: string, idx: number) => (
                        <span key={idx} className="bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-lg text-orange-700 dark:text-orange-400 font-bold text-[14px] border border-orange-100/50 dark:border-orange-800/30">
                          {expert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description Section */}
          <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-[24px] md:rounded-[32px] p-6 md:p-10 shadow-sm">
            <h3 className="text-[18px] md:text-xl font-black text-slate-800 dark:text-white mb-5">행사 상세 설명</h3>
            <div className="whitespace-pre-wrap text-slate-600 dark:text-slate-400 leading-[1.7] text-[15px] md:text-[16px] font-medium font-sans">
              {event.description?.replace(/(https?:\/\/\S+|data:image\/[^>\s]+)/g, '')}
            </div>
            
            {videoId && (
              <div className="mt-8">
                <div className="aspect-video bg-black rounded-[24px] overflow-hidden">
                  <iframe 
                      width="100%" 
                      height="100%" 
                      src={`https://www.youtube.com/embed/${videoId}`} 
                      title="YouTube video player" 
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen>
                  </iframe>
                </div>
              </div>
            )}

            {/* 행사 사진 리스트 - Moved below YouTube */}
            {images.length > 1 && (
              <div className="mt-8">
                 <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 px-1">행사 사진</h3>
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                   {images.map((img: string, idx: number) => {
                      return (
                        <div key={idx} className="relative aspect-square rounded-[24px] overflow-hidden cursor-pointer group shadow-sm border border-slate-100 dark:border-slate-800"
                          onClick={() => {
                            setFullscreenImage(img);
                            setCurrentImageIndex(idx);
                          }}
                        >
                          <img 
                            src={img} 
                            alt={`event-${idx}`} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        </div>
                      );
                   })}
                 </div>
              </div>
            )}
          </div>

          {/* Community Section */}
          <div className="space-y-6">
            <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar scroll-smooth">
              <button
                onClick={() => setActiveTab('reviews')}
                className={clsx(
                  "px-4 md:px-6 py-2 rounded-xl text-[12px] md:text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap",
                  activeTab === 'reviews' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500"
                )}
              >
                리뷰 <span className="text-[10px] opacity-60 font-black">{reviews.length}</span>
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={clsx(
                  "px-4 md:px-6 py-2 rounded-xl text-[12px] md:text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap",
                  activeTab === 'comments' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500"
                )}
              >
                댓글 <span className="text-[10px] opacity-60 font-black">{comments.length}</span>
              </button>
              <button
                onClick={() => setActiveTab('gallery')}
                className={clsx(
                  "px-4 md:px-6 py-2 rounded-xl text-[12px] md:text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap relative group",
                  activeTab === 'gallery' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500"
                )}
              >
                갤러리 <span className="text-[10px] opacity-60 font-black">{photos.length}</span>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500 border-2 border-white dark:border-slate-800"></span>
                </span>
              </button>
            </div>

            {activeTab === 'comments' && (
              <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                  <MessageCircle className="w-6 h-6 text-indigo-500" /> 행사 댓글
                </h3>
                
                {user ? (
                  <form onSubmit={handleCommentSubmit} className="relative">
                    <textarea 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="함께 참여하는 분들에게 궁금한 점을 물어보세요!"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-5 pr-16 font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none min-h-[100px]"
                    />
                    <button 
                      type="submit"
                      disabled={isSubmitting || !newComment.trim()}
                      className="absolute right-4 bottom-4 p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6 text-center border-2 border-dashed border-slate-100 dark:border-slate-800">
                    <p className="text-slate-400 font-bold mb-4">로그인 후 댓글을 작성할 수 있습니다.</p>
                    <button onClick={() => navigate('/login')} className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black hover:bg-slate-50 transition-colors">로그인하기</button>
                  </div>
                )}

                <div className="space-y-6">
                  {comments.length > 0 ? comments.map((comment) => (
                    <div key={comment.id} className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden">
                        {comment.author_photo && <img src={comment.author_photo} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-black text-slate-800 dark:text-white">{comment.author_name}</span>
                          <span className="text-[10px] font-bold text-slate-400 capitalize">{format(new Date(comment.created_at), 'yyyy.MM.dd')}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-[15px] leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-12 text-slate-300 italic font-medium">첫 댓글을 남겨보세요!</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                    <Star className="w-6 h-6 text-amber-500" /> 행사 리뷰
                  </h3>
                  <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-xl border border-amber-100 dark:border-amber-900/30">
                    <Star className="w-4 h-4 text-amber-500 fill-current" />
                    <span className="text-sm font-black text-amber-700 dark:text-amber-400">
                      {reviews.length > 0 
                        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                        : '0.0'}
                    </span>
                  </div>
                </div>

                {user ? (
                  <form onSubmit={handleReviewSubmit} className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-2xl space-y-4">
                    <div className="flex items-center gap-4">
                      <p className="text-sm font-black text-slate-600 dark:text-slate-400">당신의 점수는?</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button 
                            key={star}
                            type="button"
                            onClick={() => setNewRating(star)}
                            className={clsx(
                              "p-1 transition-all",
                              newRating >= star ? "text-amber-500 scale-110" : "text-slate-300 hover:text-amber-300"
                            )}
                          >
                            <Star className={clsx("w-6 h-6", newRating >= star && "fill-current")} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="relative">
                      <textarea 
                        value={newReviewText}
                        onChange={(e) => setNewReviewText(e.target.value)}
                        placeholder="행사 참여 경험은 어떠셨나요? 솔직한 후기를 남겨주세요."
                        className="w-full bg-white dark:bg-slate-900 border-none rounded-xl p-5 pr-16 font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none min-h-[100px]"
                      />
                      <button 
                        type="submit"
                        disabled={isSubmitting || !newReviewText.trim()}
                        className="absolute right-4 bottom-4 p-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-6 text-slate-400 font-bold italic">로그인 후 리뷰를 작성할 수 있습니다.</div>
                )}

                <div className="space-y-6">
                  {reviews.length > 0 ? reviews.map((review) => (
                    <div key={review.id} className="p-6 bg-white dark:bg-slate-800/40 border border-slate-50 dark:border-slate-800 rounded-3xl">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden">
                            {review.author_photo && <img src={review.author_photo} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 dark:text-white">{review.author_name}</p>
                            <p className="text-[10px] font-bold text-slate-400">{format(new Date(review.created_at), 'yyyy.MM.dd')}</p>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={clsx("w-3.5 h-3.5", star <= review.rating ? "text-amber-400 fill-current" : "text-slate-200")} />
                          ))}
                        </div>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-[15px] leading-relaxed">{review.content}</p>
                    </div>
                  )) : (
                    <div className="text-center py-12 text-slate-300 italic font-medium">아직 리뷰가 없습니다. 첫 리뷰의 주인공이 되어보세요!</div>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'gallery' && (
              <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                      <ImageIcon className="w-6 h-6 text-orange-500" /> 행사 스튜디오/갤러리
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-bold">참여자들이 직접 담은 행사의 추억들을 확인해보세요.</p>
                  </div>
                </div>

                {user && (
                  <div 
                    className={clsx(
                      "relative border-2 border-dashed rounded-[32px] p-8 md:p-12 transition-all group flex flex-col items-center justify-center gap-4 text-center cursor-pointer",
                      dragActive 
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10" 
                        : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-400 dark:hover:border-indigo-500/50"
                    )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('gallery-photo-upload')?.click()}
                  >
                    <input 
                      type="file" 
                      accept="image/*"
                      multiple
                      onChange={(e) => e.target.files && handlePhotoUpload(e.target.files)}
                      disabled={isUploading}
                      className="hidden" 
                      id="gallery-photo-upload"
                    />
                    
                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center shadow-md border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform">
                      {isUploading ? (
                        <div className="w-8 h-8 border-3 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                      ) : (
                        <UploadIcon className="w-8 h-8 text-indigo-500" />
                      )}
                    </div>
                    
                    <div>
                      <p className="text-lg font-black text-slate-700 dark:text-slate-200">
                        {isUploading ? "사진 업로드 중..." : "클릭하거나 사진을 드래그하여 업로드하세요"}
                      </p>
                      <p className="text-xs text-slate-500 mt-2 font-bold">
                        1인당 최대 4장까지 가능 (WebP 자동 변환)
                      </p>
                    </div>

                    <button 
                      type="button" 
                      className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-slate-900/20 dark:shadow-none"
                    >
                      {isUploading ? "업로드 중..." : "파일 선택하기"}
                    </button>
                  </div>
                )}

                {photos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {photos.map((photo) => (
                      <motion.div 
                        key={photo.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group relative aspect-square rounded-2xl overflow-hidden cursor-zoom-in bg-slate-100 dark:bg-slate-800"
                        onClick={() => {
                          setFullscreenImage(photo.image_url);
                          // Since lightbox logic uses 'images' array, we might need to adjust it or handle separate lightbox for gallery
                        }}
                      >
                        <img 
                          src={photo.image_url} 
                          alt="Event review" 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-white/20 overflow-hidden shrink-0">
                               {photo.author_photo && <img src={photo.author_photo} className="w-full h-full object-cover" />}
                            </div>
                            <span className="text-[10px] text-white font-bold truncate">{photo.author_name}</span>
                          </div>
                        </div>
                        {(user?.id === photo.user_id || isAdmin) && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePhoto(photo.id);
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/20 rounded-[32px] border-2 border-dashed border-slate-100 dark:border-slate-800">
                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl mx-auto flex items-center justify-center text-slate-200 dark:text-slate-700 mb-4 shadow-sm">
                       <ImageIcon className="w-8 h-8" />
                    </div>
                    <p className="text-slate-400 font-bold mb-2">아직 등록된 사진이 없습니다.</p>
                    {isExpired && user && (
                      <p className="text-[12px] text-slate-500 mb-6 font-medium">행사 당일 찍은 즐거운 사진들을 공유해주세요!</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Ticketing/Booking Action Card */}
        <div className="mt-8 lg:mt-0">
          <div className="sticky top-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] md:rounded-[32px] shadow-xl md:shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-center mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-[950] text-slate-900 dark:text-white leading-none">예매 정보</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={toggleLike}
                    className={clsx(
                      "p-2 md:p-2.5 rounded-full transition-all bg-rose-50 dark:bg-rose-900/20",
                      isLiked ? "text-rose-500 scale-110" : "text-rose-300 hover:text-rose-500"
                    )}
                  >
                    <Heart className={clsx("w-5 h-5", isLiked && "fill-current")} />
                  </button>
                  <button 
                    onClick={() => setShowShareModal(true)}
                    className="p-2 md:p-2.5 rounded-full text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="mb-4 md:mb-6 px-1">
                <span className="text-[12px] md:text-[14px] font-bold text-slate-500 dark:text-slate-400">관심행사 {event.likesCount || 0}</span>
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
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-5 mb-4 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-4 text-slate-500 dark:text-slate-400">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-[13px] font-bold">입금 안내</span>
                  </div>
                  <div className="whitespace-pre-wrap text-[14px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {event.paymentMethod}
                  </div>
                </div>
              )}

              {/* Payment Link (예매 링크 버튼) */}
              {event.paymentLink && (
                <div className="mb-8">
                  <a 
                    href={event.paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 text-teal-600 dark:text-teal-400 font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-all shadow-sm group"
                  >
                    <ExternalLink className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    외부 예매/신청 링크 바로가기
                  </a>
                </div>
              )}

              <div className="mb-10">
                <div className="flex justify-between items-end mb-2.5">
                  <span className="text-[13px] font-bold text-slate-500 uppercase tracking-tight">참여자 현황</span>
                  <span className="text-[14px] font-[800] text-slate-900 dark:text-white">
                    {maxAttendees > 0 ? `${currentAttendees} / ${maxAttendees}명` : `${currentAttendees}명 참여 중`}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={clsx("h-full transition-all duration-1000 bg-indigo-600 rounded-full")}
                    style={{ width: `${maxAttendees > 0 ? Math.min((currentAttendees / maxAttendees) * 100, 100) : 100}%` }}
                  />
                </div>
              </div>

              <div className="mb-8 p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/30 flex justify-between items-center group hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Potential</p>
                    <p className="text-[13px] font-black text-indigo-600 dark:text-indigo-400 leading-none">예상 적립 포인트</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                    {(Math.floor((event.price || 0) * 0.05) || 500).toLocaleString()}
                  </span>
                  <span className="text-xs font-black text-indigo-400 ml-1">P</span>
                </div>
              </div>

              {registration?.status === 'confirmed' ? (
                <div className="space-y-4">
                  <div className="w-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 py-4 rounded-2xl text-emerald-700 dark:text-emerald-400 font-[800] flex items-center justify-center gap-2">
                    <Ticket className="w-5 h-5" />
                    참여 확정되었습니다
                  </div>
                  {!isExpired && (
                    <button 
                      onClick={handleCancel}
                      disabled={processing}
                      className="w-full py-4 text-red-500 font-bold border border-red-100 dark:border-red-900/30 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
                    >
                      참여 취소하기
                    </button>
                  )}
                </div>
              ) : isExpired ? (
                <div className="space-y-4">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-6 rounded-2xl text-center">
                    <p className="text-slate-500 font-bold mb-4">이미 종료된 행사입니다.</p>
                    <button 
                      onClick={() => setActiveTab('gallery')} 
                      className="w-full py-4 bg-orange-500 text-white rounded-xl font-black shadow-xl shadow-orange-500/20 hover:scale-105 transition-all"
                    >
                      현장 사진/스튜디오 보기
                    </button>
                  </div>
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
                  {isFull ? '모집 마감' : (event.isLesson ? '강습 신청하기' : '참여 신청하기')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky RSVP Control for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-40 lg:hidden shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleLike}
            className={clsx(
              "p-4 rounded-2xl border transition-all",
              isLiked ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-900/30 text-rose-500 shadow-sm" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
            )}
          >
            <Heart className={clsx("w-6 h-6", isLiked && "fill-current")} />
          </button>
          
          {registration?.status === 'confirmed' ? (
            <button 
              onClick={handleCancel}
              disabled={processing}
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-4.5 rounded-2xl font-[950] tracking-tight hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {processing ? '처리 중...' : t('event.cancel')}
            </button>
          ) : isFull ? (
            <div className="flex-1 bg-slate-50 dark:bg-slate-800 text-slate-400 py-4.5 rounded-2xl font-black text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
              {t('event.full')}
            </div>
          ) : (
            <button 
              onClick={handleRegister}
              disabled={processing}
              className="flex-1 bg-indigo-600 text-white py-4.5 rounded-2xl font-[950] tracking-tight hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 active:scale-[0.98] disabled:opacity-50"
            >
              {processing ? '처리 중...' : (event.isLesson ? '강습 신청하기' : '참여 신청하기')}
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
      <ShareModal 
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={event.title}
        url={window.location.href}
         imageUrl={images[0] || 'https://dancehive.app/logo.png'}
  description={event.description || ''}
      />
    </motion.div>
  );
}
