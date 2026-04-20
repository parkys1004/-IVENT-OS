import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, setDoc, deleteDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useLanguage } from '../context/LanguageContext';

// Error specs
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email ?? undefined,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      providerInfo: currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error Detailed: ', JSON.stringify(errInfo, null, 2));
  return errInfo;
}

import { format } from 'date-fns';
import { ko, enUS, ja, zhCN, th, vi } from 'date-fns/locale';
import { Calendar, Clock, MapPin, Users, Ticket, ArrowLeft, ExternalLink, Share2, X, ChevronLeft, ChevronRight, Image as ImageIcon, Heart, Sparkles, Languages, CreditCard, Music, Mic2 } from 'lucide-react';
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

  const { isLoaded } = useGoogleMaps();

  useEffect(() => {
    if (!id) return;

    const fetchEventAndReg = async () => {
      try {
        const docRef = doc(db, 'events', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setEvent({ id: docSnap.id, ...docSnap.data() });
        } else {
          navigate('/');
          return;
        }

        if (user) {
          const regId = `${id}_${user.uid}`;
          const regRef = doc(db, 'registrations', regId);
          const regSnap = await getDoc(regRef);
          if (regSnap.exists()) {
            setRegistration({ id: regSnap.id, ...regSnap.data() });
          }

          // Fetch Like status
          const likeId = `${id}_${user.uid}`;
          const likeSnap = await getDoc(doc(db, 'eventLikes', likeId));
          setIsLiked(likeSnap.exists());
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `events/${id} or registrations`);
      } finally {
        setLoading(false);
      }
    };

    fetchEventAndReg();
  }, [id, user, navigate]);

  const handleRegister = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    setProcessing(true);
    try {
      const regId = `${id}_${user.uid}`;
      const regRef = doc(db, 'registrations', regId);
      
      await setDoc(regRef, {
        eventId: id,
        userId: user.uid,
        hostId: event.hostId,
        registeredAt: serverTimestamp(),
        status: 'confirmed'
      });

      // Increment attendees
      await updateDoc(doc(db, 'events', id!), {
        currentAttendees: increment(1)
      });

      setRegistration({ status: 'confirmed' });
      setEvent((prev: any) => ({ ...prev, currentAttendees: prev.currentAttendees + 1 }));
      alert("참여 신청이 완료되었습니다!");
    } catch (err) {
      console.error(err);
      alert("신청 중 오류가 발생했습니다.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("정말 참여를 취소하시겠습니까?")) return;
    setProcessing(true);
    try {
      const regId = `${id}_${user?.uid}`;
      await deleteDoc(doc(db, 'registrations', regId));
      
      // Decrement attendees
      await updateDoc(doc(db, 'events', id!), {
        currentAttendees: increment(-1)
      });

      setRegistration(null);
      setEvent((prev: any) => ({ ...prev, currentAttendees: prev.currentAttendees - 1 }));
      alert("참여가 취소되었습니다.");
    } catch (err) {
      console.error(err);
      alert("취소 중 오류가 발생했습니다.");
    } finally {
      setProcessing(false);
    }
  };

  const toggleLike = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    const likeId = `${id}_${user.uid}`;
    const likeRef = doc(db, 'eventLikes', likeId);
    
    try {
      if (isLiked) {
        await deleteDoc(likeRef);
        await updateDoc(doc(db, 'events', id!), {
          likesCount: increment(-1)
        });
        setEvent((prev: any) => ({ ...prev, likesCount: Math.max(0, (prev.likesCount || 1) - 1) }));
      } else {
        await setDoc(likeRef, {
          eventId: id,
          userId: user.uid,
          createdAt: serverTimestamp()
        });
        await updateDoc(doc(db, 'events', id!), {
          likesCount: increment(1)
        });
        setEvent((prev: any) => ({ ...prev, likesCount: (prev.likesCount || 0) + 1 }));
      }
      setIsLiked(!isLiked);
    } catch (err) {
      console.error(err);
      alert("찜하기 처리 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div></div>;
  }

  if (!event) return null;

  const dateObj = event.date?.toDate ? event.date.toDate() : new Date();
  const endDateObj = event.endDate?.toDate ? event.endDate.toDate() : new Date();
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
  const mapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(event.locationName)}`;

  const isHost = user && event.hostId === user.uid;
  const isAdmin = profile?.role === 'admin';
  const canEdit = isHost || isAdmin;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="max-w-[1400px] w-full mx-auto"
    >
      <div className="flex justify-between items-center mb-6">
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

      <div className="glass-panel rounded-3xl overflow-hidden transition-colors">
        {/* Banner Images Gallery */}
        {images.length > 0 ? (
          <div className="relative w-full h-72 md:h-[400px] lg:h-[500px] bg-slate-900 flex group overflow-hidden">
             {/* Main cover image */}
             <div 
               className={clsx("h-full cursor-pointer transition-all duration-300", images.length > 1 ? "w-2/3" : "w-full")}
               onClick={() => openFullscreen(0)}
             >
               <img src={images[0]} alt={event.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
               <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors pointer-events-none"></div>
             </div>
             
             {/* Side images */}
             {images.length > 1 && (
               <div className="w-1/3 h-full flex flex-col border-l-2 border-slate-900">
                 {images.slice(1, 3).map((imgUrl: string, idx: number) => (
                   <div 
                     key={idx} 
                     className={clsx("w-full cursor-pointer bg-slate-800 overflow-hidden", images.length === 2 ? "h-full" : "h-1/2", idx === 0 && images.length === 3 ? "border-b-2 border-slate-900" : "")}
                     onClick={() => openFullscreen(idx + 1)}
                   >
                     <img src={imgUrl} alt={`Event ${idx+1}`} className="w-full h-full object-cover opacity-70 hover:opacity-100 transition-opacity hover:scale-105 duration-500" referrerPolicy="no-referrer" />
                   </div>
                 ))}
               </div>
             )}
             
             <div className="absolute top-6 left-6 flex flex-col gap-2 items-start">
               <span className="bg-white/90 dark:bg-slate-900/90 backdrop-blur text-indigo-700 dark:text-indigo-400 font-bold px-4 py-1.5 rounded-full text-sm shadow-lg">
                 {event.category}
               </span>
             </div>
          </div>
        ) : (
          <div className="w-full h-72 md:h-[400px] lg:h-[500px] bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 flex flex-col items-center justify-center text-indigo-300 dark:text-indigo-700">
            <Calendar className="h-20 w-20 mb-4" />
            <span className="text-xl font-medium tracking-wide">Event Image</span>
            <div className="absolute top-6 left-6 flex flex-col gap-2 items-start">
              <span className="bg-white/90 backdrop-blur text-indigo-700 font-bold px-4 py-1.5 rounded-full text-sm shadow-lg">
                {event.category}
              </span>
            </div>
          </div>
        )}

        <div className="p-8 md:p-12 lg:p-16 xl:flex xl:gap-20 relative">
          {/* Main Info */}
          <div className="flex-1">
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-800 dark:text-white mb-8 leading-tight tracking-tight">
              {event.title}
            </h1>
            
            <div className="flex flex-col gap-4 text-slate-600 dark:text-slate-400 mb-12">
              <div className="flex items-center text-lg bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                <Calendar className="w-6 h-6 mr-5 text-indigo-500" />
                <span className="font-bold text-slate-800 dark:text-slate-200 text-[18px]">
                  {format(dateObj, 'yyyy년 M월 d일 (E) a h:mm', { locale: getLocale() })}
                </span>
                <a href={gCalUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-[14px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-2.5 rounded-[12px] hover:bg-slate-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold transition-colors shadow-sm">
                  {t('event.calendar.add')}
                </a>
              </div>
              <div className="flex items-center text-lg bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                <MapPin className="w-6 h-6 mr-5 text-indigo-500" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-[18px] block">{event.locationName}</span>
                  {event.formattedAddress && <span className="text-sm text-slate-500 dark:text-slate-400 block mt-1">{event.formattedAddress}</span>}
                </div>
                <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-[14px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-2.5 rounded-[12px] hover:bg-slate-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold transition-colors flex items-center shadow-sm">
                  {t('event.directions')} <ExternalLink className="w-4 h-4 ml-1.5" />
                </a>
              </div>
              
              {/* Google Maps Render */}
              {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
                <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 p-6 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-800/30 rounded-full flex items-center justify-center mb-4">
                    <MapPin className="w-6 h-6 text-amber-600" />
                  </div>
                  <h4 className="text-amber-900 dark:text-amber-400 font-bold mb-2">Google Maps API 키가 설정되지 않았습니다.</h4>
                  <p className="text-amber-700 dark:text-amber-500 text-sm max-w-sm mb-4">
                    지도를 표시하려면 우측 상단 <b>Settings &gt; Secrets</b> 메뉴에서 <code className="bg-amber-100 dark:bg-amber-800/30 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code>를 등록해주세요.<br/>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 opacity-80 mt-1 block">
                      * 구글 클라우드 콘솔에서 <b>Maps JavaScript API</b>가 활성화되어 있어야 합니다.
                    </span>
                  </p>
                  <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noopener noreferrer" className="text-amber-800 dark:text-amber-400 text-xs font-bold underline hover:text-amber-950">
                    구글 클라우드 콘솔에서 키 발급받기
                  </a>
                </div>
              ) : isLoaded && event.geoPoint && event.geoPoint.lat ? (
                <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm w-full h-[300px]">
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
                <div className="rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse w-full h-[300px] flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold">
                  {t('event.map.loading')}
                </div>
              )}
              <div className="flex items-center text-lg bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                <Users className="w-6 h-6 mr-5 text-indigo-500" />
                <span className="font-bold text-slate-800 dark:text-slate-200 text-[18px]">{t('event.host')}: {event.hostName}</span>
              </div>

              {/* Lineup Section (DJs, Performances, Media) */}
              {(event.djs?.length > 0 || event.performances?.length > 0 || event.media?.length > 0) && (
                <div className="mt-8 bg-slate-50 dark:bg-slate-800/30 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800/50">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center">
                    <Sparkles className="w-5 h-5 mr-3 text-indigo-500" /> 라인업 정보
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* DJs */}
                    {event.djs?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center">
                          <Music className="w-4 h-4 mr-2" /> DJs
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {event.djs.map((dj: string, idx: number) => (
                            <span key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-[15px] shadow-sm">
                              {dj}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Performances */}
                    {event.performances?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center">
                          <Mic2 className="w-4 h-4 mr-2" /> Performances
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {event.performances.map((perf: string, idx: number) => (
                            <span key={idx} className="bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800/50 px-4 py-2 rounded-xl text-indigo-700 dark:text-indigo-300 font-bold text-[15px]">
                              {perf}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Media / Photo & Video */}
                    {event.media?.length > 0 && (
                      <div className="md:col-span-2 border-t border-slate-200 dark:border-slate-700/50 pt-6">
                        <h4 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center">
                          <ImageIcon className="w-4 h-4 mr-2" /> Photo / Video
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {event.media.map((media: string, idx: number) => (
                            <span key={idx} className="bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-900/30 px-4 py-2 rounded-xl text-rose-600 dark:text-rose-400 font-bold text-[15px]">
                              {media}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <hr className="border-slate-100 my-12" />

            {/* Description */}
            <div className="prose prose-indigo dark:prose-invert max-w-none">
              <h3 className="text-2xl lg:text-3xl font-extrabold mb-6 text-slate-800 dark:text-white tracking-tight">
                {t('event.details')}
              </h3>
              <div className="whitespace-pre-wrap text-slate-600 dark:text-slate-400 leading-relaxed text-[16px] xl:text-[18px]">
                {event.description}
              </div>
            </div>
          </div>

          {/* Sticky Sidebar / Call to action */}
          <div className="w-full xl:w-[420px] shrink-0 mt-12 xl:mt-0 relative">
            <div className="sticky top-28 bg-white border border-slate-200 rounded-[24px] shadow-lg shadow-slate-200/50 p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">예매 정보</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={toggleLike}
                    className={clsx(
                      "p-2 rounded-full transition-all",
                      isLiked ? "bg-rose-50 text-rose-500" : "text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                    )}
                  >
                    <Heart className={clsx("w-5 h-5", isLiked && "fill-current")} />
                  </button>
                  <button className="text-slate-400 hover:text-indigo-600 transition-colors p-2 rounded-full hover:bg-slate-50">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="mb-2 flex items-center gap-1.5 px-1">
                <span className="text-sm font-bold text-slate-700">관심행사 {event.likesCount || 0}</span>
              </div>

              {/* Tickets section */}
              {event.tickets && event.tickets.length > 0 && (
                <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                  <h4 className="text-[13px] font-bold text-slate-500 mb-3 flex items-center">
                    <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                    파티비 (티켓)
                  </h4>
                  <div className="space-y-2.5">
                    {event.tickets.map((ticket: { name: string, price: number }, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">{ticket.name}</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                          {ticket.price === 0 ? '무료' : `${ticket.price.toLocaleString()}원`}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Payment Method / Deposit Account Display */}
                  {event.paymentMethod && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-[12px] font-bold text-slate-500 mb-1.5 flex items-center">
                        <Sparkles className="w-3 h-3 mr-1 text-indigo-500" /> 입금 안내
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 font-medium">
                        {event.paymentMethod}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="mb-6">
                <div className="flex justify-between text-[13px] mb-2 text-slate-500">
                  <span className="font-medium">참여자 현황</span>
                  <span className="font-bold text-slate-800">{event.currentAttendees} / {event.maxAttendees}명</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className={clsx("h-2 rounded-full transition-all duration-1000", isFull ? "bg-red-500" : "bg-indigo-600")}
                    style={{ width: `${Math.min((event.currentAttendees / event.maxAttendees) * 100, 100)}%` }}
                  ></div>
                </div>
                {!isFull && event.maxAttendees - event.currentAttendees <= 10 && (
                  <p className="text-red-500 text-sm mt-3 font-bold text-center bg-red-50 p-2 rounded-lg border border-red-100">
                    🔥 마감 임박! 잔여 {event.maxAttendees - event.currentAttendees}석
                  </p>
                )}
              </div>

              {registration?.status === 'confirmed' ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl p-4 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold">
                    <Ticket className="w-5 h-5 mr-2" />
                    참여 확정되었습니다
                  </div>
                  <button 
                    onClick={handleCancel}
                    disabled={processing}
                    className="w-full py-4 text-red-600 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 rounded-[12px] transition-colors disabled:opacity-50 border border-red-100 dark:border-red-900/20"
                  >
                    {t('event.cancel')}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleRegister}
                  disabled={isFull || processing}
                  className={clsx(
                    "w-full py-4 rounded-[12px] font-bold text-[15px] text-white shadow-sm transition-all",
                    isFull 
                      ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none" 
                      : "bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5 shadow-indigo-600/20",
                    processing && "opacity-75 cursor-wait"
                  )}
                >
                  {isFull ? t('event.full') : processing ? '처리 중...' : t('event.register')}
                </button>
              )}
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
