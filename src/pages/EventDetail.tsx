import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, setDoc, deleteDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar, Clock, MapPin, Users, Ticket, ArrowLeft, ExternalLink, Share2 } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'motion/react';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

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
        }
      } catch (err) {
        console.error("Error fetching detail:", err);
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

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  if (!event) return null;

  const dateObj = event.date?.toDate ? event.date.toDate() : new Date();
  const endDateObj = event.endDate?.toDate ? event.endDate.toDate() : new Date();
  const isFull = event.currentAttendees >= event.maxAttendees;

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
        <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors font-medium">
          <ArrowLeft className="w-4 h-4 mr-2" /> 목록으로 돌아가기
        </button>
        
        {canEdit && (
          <button 
            onClick={() => navigate(`/edit/${event.id}`)}
            className="flex items-center bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all"
          >
            행사 수정하기
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Banner Image */}
        <div className="w-full h-72 md:h-[400px] lg:h-[500px] bg-slate-100 relative">
          {event.imageUrl ? (
            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-300">
              <Calendar className="h-20 w-20 mb-4" />
              <span className="text-xl font-medium tracking-wide">Event Image</span>
            </div>
          )}
          <div className="absolute top-6 left-6 flex gap-2">
            <span className="bg-white/90 backdrop-blur text-indigo-700 font-bold px-4 py-1.5 rounded-full text-sm shadow-lg">
              {event.category}
            </span>
          </div>
        </div>

        <div className="p-8 md:p-12 lg:p-16 xl:flex xl:gap-20 relative">
          {/* Main Info */}
          <div className="flex-1">
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-800 mb-8 leading-tight tracking-tight">{event.title}</h1>
            
            <div className="flex flex-col gap-4 text-slate-600 mb-12">
              <div className="flex items-center text-lg bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <Calendar className="w-6 h-6 mr-5 text-indigo-500" />
                <span className="font-bold text-slate-800 text-[18px]">
                  {format(dateObj, 'yyyy년 M월 d일 (E) a h:mm', { locale: ko })}
                </span>
                <a href={gCalUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-[14px] bg-white border border-slate-200 px-5 py-2.5 rounded-[12px] hover:bg-slate-50 text-indigo-600 font-bold transition-colors shadow-sm">
                  캘린더 추가
                </a>
              </div>
              <div className="flex items-center text-lg bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <MapPin className="w-6 h-6 mr-5 text-indigo-500" />
                <span className="font-bold text-slate-800 text-[18px]">{event.locationName}</span>
                <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-[14px] bg-white border border-slate-200 px-5 py-2.5 rounded-[12px] hover:bg-slate-50 text-indigo-600 font-bold transition-colors flex items-center shadow-sm">
                  길찾기 <ExternalLink className="w-4 h-4 ml-1.5" />
                </a>
              </div>
              <div className="flex items-center text-lg bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <Users className="w-6 h-6 mr-5 text-indigo-500" />
                <span className="font-bold text-slate-800 text-[18px]">주최자: {event.hostName}</span>
              </div>
            </div>

            <hr className="border-slate-100 my-12" />

            {/* Description */}
            <div className="prose prose-indigo max-w-none">
              <h3 className="text-2xl lg:text-3xl font-extrabold mb-6 text-slate-800 tracking-tight">상세 내용</h3>
              <div className="whitespace-pre-wrap text-slate-600 leading-relaxed text-[16px] xl:text-[18px]">
                {event.description}
              </div>
            </div>
          </div>

          {/* Sticky Sidebar / Call to action */}
          <div className="w-full xl:w-[420px] shrink-0 mt-12 xl:mt-0 relative">
            <div className="sticky top-28 bg-white border border-slate-200 rounded-[24px] shadow-lg shadow-slate-200/50 p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">예매 정보</h3>
                <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>

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
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-center text-emerald-700 font-bold">
                    <Ticket className="w-5 h-5 mr-2" />
                    참여 확정되었습니다
                  </div>
                  <button 
                    onClick={handleCancel}
                    disabled={processing}
                    className="w-full py-4 text-red-600 font-bold hover:bg-red-50 rounded-[12px] transition-colors disabled:opacity-50 border border-red-100"
                  >
                    참여 취소하기
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleRegister}
                  disabled={isFull || processing}
                  className={clsx(
                    "w-full py-4 rounded-[12px] font-bold text-[15px] text-white shadow-sm transition-all",
                    isFull 
                      ? "bg-slate-300 cursor-not-allowed shadow-none" 
                      : "bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5",
                    processing && "opacity-75 cursor-wait"
                  )}
                >
                  {isFull ? '모집 마감' : processing ? '처리 중...' : '참여 신청하기'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
