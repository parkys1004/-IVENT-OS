import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../context/AuthContext';

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
    tenantId: string | undefined;
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
      tenantId: currentUser?.tenantId ?? undefined,
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

import { Calendar, Clock, MapPin, Users, FileText, Image as ImageIcon, Upload, X, Star, PlusCircle, MinusCircle, Music, Mic2, CreditCard, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import clsx from 'clsx';

const LIBRARIES: ("places")[] = ["places"];

export default function EditEvent() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'IT',
    date: '',
    time: '',
    endDate: '',
    endTime: '',
    locationName: '',
    formattedAddress: '',
    country: '',
    city: '',
    geoPoint: null as { lat: number, lng: number } | null,
    imageUrl: '',
    maxAttendees: 50,
    djs: [] as string[],
    performances: [] as string[],
    tickets: [{ name: '일반 예매', price: 0 }] as { name: string, price: number }[],
  });

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
    language: 'ko',
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      
      let city = '';
      let country = '';
      
      place.address_components?.forEach(component => {
        if (component.types.includes('country')) country = component.short_name;
        if (component.types.includes('locality')) city = component.long_name;
        else if (component.types.includes('administrative_area_level_1') && !city) city = component.long_name;
      });

      setFormData(prev => ({
        ...prev,
        locationName: place.name || place.formatted_address || prev.locationName,
        formattedAddress: place.formatted_address || '',
        country: country,
        city: city,
        geoPoint: place.geometry?.location ? {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        } : prev.geoPoint
      }));
    }
  };

  const [images, setImages] = useState<string[]>([]);
  const [coverImageIndex, setCoverImageIndex] = useState<number>(0);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'events', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setEventData({ id: docSnap.id, ...data });
          
          const startDateObj = data.date?.toDate() || new Date();
          const endDateObj = data.endDate?.toDate() || new Date();

          setFormData({
            title: data.title || '',
            description: data.description || '',
            category: data.category || 'IT',
            date: format(startDateObj, 'yyyy-MM-dd'),
            time: format(startDateObj, 'HH:mm'),
            endDate: format(endDateObj, 'yyyy-MM-dd'),
            endTime: format(endDateObj, 'HH:mm'),
            locationName: data.locationName || '',
            formattedAddress: data.formattedAddress || '',
            country: data.country || '',
            city: data.city || '',
            geoPoint: data.geoPoint || null,
            imageUrl: data.imageUrl || '',
            maxAttendees: data.maxAttendees || 50,
            djs: data.djs || [],
            performances: data.performances || [],
            tickets: data.tickets || (data.price ? [{ name: '참가비', price: data.price }] : [{ name: '일반 예매', price: 0 }]),
          });

          const loadedImages = data.imageUrls && data.imageUrls.length > 0 ? data.imageUrls : (data.imageUrl ? [data.imageUrl] : []);
          setImages(loadedImages);
          setCoverImageIndex(data.coverImageIndex || 0);
        } else {
          alert('행사를 찾을 수 없습니다.');
          navigate('/');
        }
      } catch (error) {
        console.error("Error fetching event:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id, navigate]);

  const resizeAndCompressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1000;
          const MAX_HEIGHT = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress to WebP
          const dataUrl = canvas.toDataURL('image/webp', 0.8);
          resolve(dataUrl);
        };
        img.onerror = error => reject(error);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleImageUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const availableSlots = 3 - images.length;
    if (availableSlots <= 0) {
      alert("최대 3장의 이미지만 등록할 수 있습니다.");
      return;
    }

    const filesToProcess = fileArray.slice(0, availableSlots);
    
    try {
      setSubmitting(true);
      const newImages = await Promise.all(filesToProcess.map(resizeAndCompressImage));
      setImages(prev => [...prev, ...newImages]);
    } catch (error) {
      console.error("Image loading failed: ", error);
      alert("이미지를 처리하는 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
      if (multiFileInputRef.current) multiFileInputRef.current.value = '';
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    if (coverImageIndex === index) {
      setCoverImageIndex(0);
    } else if (coverImageIndex > index) {
      setCoverImageIndex(prev => prev - 1);
    }
  };

   const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !id) return;
    
    setSubmitting(true);
    try {
      const startDate = new Date(`${formData.date}T${formData.time}`);
      const endDate = new Date(`${formData.endDate || formData.date}T${formData.endTime || '23:59'}`);

      // We maintain imageUrl for backwards compatibility, using the selected cover image.
      const mainImageUrl = images.length > 0 ? images[coverImageIndex] : '';

      const updatedEvent = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        date: startDate,
        endDate: endDate,
        locationName: formData.locationName,
        formattedAddress: formData.formattedAddress,
        country: formData.country,
        city: formData.city,
        geoPoint: formData.geoPoint,
        imageUrl: mainImageUrl, 
        imageUrls: images,
        coverImageIndex: coverImageIndex,
        maxAttendees: Number(formData.maxAttendees),
        likesCount: eventData?.likesCount || 0,
        djs: formData.djs.filter(dj => dj.trim() !== ''),
        performances: formData.performances.filter(p => p.trim() !== ''),
        tickets: formData.tickets.filter(t => t.name.trim() !== ''),
      };

      console.log("Attempting to update event with ID:", id);
      await updateDoc(doc(db, 'events', id), updatedEvent);
      alert('행사가 성공적으로 수정되었습니다.');
      navigate(`/event/${id}`);
    } catch (err) {
      const errInfo = handleFirestoreError(err, OperationType.UPDATE, `events/${id}`);
      alert(`행사 수정 중 오류가 발생했습니다: ${errInfo.error}\n권한이 없거나 데이터 형식이 맞지 않을 수 있습니다.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const addDj = () => setFormData(prev => ({ ...prev, djs: [...prev.djs, ''] }));
  const removeDj = (index: number) => setFormData(prev => ({ ...prev, djs: prev.djs.filter((_, i) => i !== index) }));
  const updateDj = (index: number, value: string) => {
    const newDjs = [...formData.djs];
    newDjs[index] = value;
    setFormData(prev => ({ ...prev, djs: newDjs }));
  };

  const addPerformance = () => setFormData(prev => ({ ...prev, performances: [...prev.performances, ''] }));
  const removePerformance = (index: number) => setFormData(prev => ({ ...prev, performances: prev.performances.filter((_, i) => i !== index) }));
  const updatePerformance = (index: number, value: string) => {
    const newPerformances = [...formData.performances];
    newPerformances[index] = value;
    setFormData(prev => ({ ...prev, performances: newPerformances }));
  };

  const addTicket = () => setFormData(prev => ({ ...prev, tickets: [...prev.tickets, { name: '', price: 0 }] }));
  const removeTicket = (index: number) => setFormData(prev => ({ ...prev, tickets: prev.tickets.filter((_, i) => i !== index) }));
  const updateTicket = (index: number, field: 'name' | 'price', value: string | number) => {
    const newTickets = [...formData.tickets];
    newTickets[index] = { ...newTickets[index], [field]: value };
    setFormData(prev => ({ ...prev, tickets: newTickets }));
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  // Check permissions: only host or admin can edit
  const isHost = user && eventData?.hostId === user.uid;
  const isAdmin = profile?.role === 'admin';
  
  if (!isHost && !isAdmin) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-800">접근 권한이 없습니다</h2>
        <p className="text-slate-500 mt-2">이 행사의 주최자 또는 관리자만 수정할 수 있습니다.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 font-bold hover:text-indigo-700 transition-colors">돌아가기</button>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto bg-white rounded-[24px] shadow-sm border border-slate-200 p-8 md:p-12 lg:p-16">
      <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-10">행사 수정하기</h1>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Title */}
        <div>
          <label className="block text-[13px] font-bold text-slate-700 mb-2">행사 이름</label>
          <input
            required
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full rounded-[10px] border-slate-200 border bg-slate-50 px-4 py-3 text-[14px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            placeholder="예: 2026 프론트엔드 개발자 컨퍼런스"
          />
        </div>

        {/* Category & Attendees */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
             <label className="block text-[13px] font-bold text-slate-700 mb-2">카테고리</label>
             <select
               name="category"
               value={formData.category}
               onChange={handleChange}
               className="w-full rounded-[10px] border-slate-200 border bg-slate-50 px-4 py-3 text-[14px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
             >
               <option value="IT">IT/Tech</option>
               <option value="Music">음악/공연</option>
               <option value="Networking">네트워킹/모임</option>
               <option value="Education">교육/강연</option>
             </select>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-2 flex items-center"><Users className="w-4 h-4 mr-1 text-slate-400"/> 최대 모집 인원</label>
            <input
              required
              type="number"
              name="maxAttendees"
              min={eventData?.currentAttendees || 1} // Can't be less than current attendees
              value={formData.maxAttendees}
              onChange={handleChange}
              className="w-full rounded-[10px] border-slate-200 border bg-slate-50 px-4 py-3 text-[14px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              * 현재 참여자 수({eventData?.currentAttendees || 0}명)보다 작게 설정할 수 없습니다.
            </p>
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-2 flex items-center"><Calendar className="w-4 h-4 mr-1 text-slate-400"/> 날짜</label>
            <input
              required
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full rounded-[10px] border-slate-200 border bg-slate-50 px-4 py-3 text-[14px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-2 flex items-center"><Clock className="w-4 h-4 mr-1 text-slate-400"/> 시작 시간</label>
            <input
              required
              type="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              className="w-full rounded-[10px] border-slate-200 border bg-slate-50 px-4 py-3 text-[14px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
          </div>
        </div>

        {/* DJ, Performance, Tickets Section */}
        <div className="grid grid-cols-1 gap-10 pt-6 border-t border-slate-100 dark:border-slate-800">
          {/* DJs */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 flex items-center"><Music className="w-4 h-4 mr-2 text-indigo-500"/> DJs</label>
              <button 
                type="button" 
                onClick={addDj}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
              >
                <PlusCircle className="w-3.5 h-3.5" /> 추가하기
              </button>
            </div>
            <div className="space-y-3">
              {formData.djs.map((dj, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={dj}
                    onChange={(e) => updateDj(idx, e.target.value)}
                    placeholder="DJ 이름을 입력하세요"
                    className="flex-1 rounded-[10px] border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button type="button" onClick={() => removeDj(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                    <MinusCircle className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {formData.djs.length === 0 && (
                <p className="text-xs text-slate-400 italic">등록된 DJ가 없습니다.</p>
              )}
            </div>
          </div>

          {/* Performances */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 flex items-center"><Mic2 className="w-4 h-4 mr-2 text-rose-500"/> 공연 / 퍼포먼스</label>
              <button 
                type="button" 
                onClick={addPerformance}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 hover:underline"
              >
                <PlusCircle className="w-3.5 h-3.5" /> 추가하기
              </button>
            </div>
            <div className="space-y-3">
              {formData.performances.map((perf, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={perf}
                    onChange={(e) => updatePerformance(idx, e.target.value)}
                    placeholder="공연 팀 또는 이름"
                    className="flex-1 rounded-[10px] border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                  <button type="button" onClick={() => removePerformance(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                    <MinusCircle className="w-5 h-5" />
                   </button>
                </div>
              ))}
              {formData.performances.length === 0 && (
                <p className="text-xs text-slate-400 italic">등록된 공연 정보가 없습니다.</p>
              )}
            </div>
          </div>

          {/* Tickets / Party Fees */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 flex items-center"><CreditCard className="w-4 h-4 mr-2 text-emerald-500"/> 파티비 (티켓 정보)</label>
              <button 
                type="button" 
                onClick={addTicket}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
              >
                <PlusCircle className="w-3.5 h-3.5" /> 티켓 추가
              </button>
            </div>
            <div className="space-y-3">
              {formData.tickets.map((ticket, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 relative">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">티켓 종류 (예: 얼리버드, 현장구매)</label>
                    <input
                      type="text"
                      value={ticket.name}
                      onChange={(e) => updateTicket(idx, 'name', e.target.value)}
                      placeholder="티켓 명칭"
                      className="w-full rounded-[8px] border-slate-200 dark:border-slate-700 border bg-white dark:bg-slate-800 px-3 py-2 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div className="sm:w-48">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">가격 (원)</label>
                    <input
                      type="number"
                      value={ticket.price}
                      onChange={(e) => updateTicket(idx, 'price', Number(e.target.value))}
                      placeholder="0"
                      className="w-full rounded-[8px] border-slate-200 dark:border-slate-700 border bg-white dark:bg-slate-800 px-3 py-2 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => removeTicket(idx)} 
                    className="absolute -top-2 -right-2 w-6 h-6 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 shadow-sm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {formData.tickets.length === 0 && (
                <p className="text-xs text-slate-400 italic">등록된 티켓 정보가 없습니다.</p>
              )}
            </div>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
            <span className="flex items-center"><MapPin className="w-4 h-4 mr-1 text-slate-400 dark:text-slate-500"/> 장소</span>
            {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
              <span className="text-[11px] text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-100 italic">
                자동 완성 비활성 (API 키 없음)
              </span>
            )}
          </label>
          {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
            <div className="space-y-3">
              <input
                required
                type="text"
                name="locationName"
                value={formData.locationName}
                onChange={handleChange}
                className="w-full rounded-[10px] border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 px-4 py-3 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                placeholder="장소 명칭을 직접 입력해주세요"
              />
              <div className="text-[11px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                💡 <b>Settings &gt; Secrets</b>에서 <code className="text-indigo-500 font-bold">VITE_GOOGLE_MAPS_API_KEY</code>를 등록하시면 자동 완성 기능을 사용할 수 있습니다.
              </div>
            </div>
          ) : isLoaded ? (
            <Autocomplete
              onLoad={setAutocomplete}
              onPlaceChanged={onPlaceChanged}
              options={{ componentRestrictions: { country: ["kr", "jp", "sg"] } }}
            >
              <input
                required
                type="text"
                name="locationName"
                value={formData.locationName}
                onChange={handleChange}
                className="w-full rounded-[10px] border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 px-4 py-3 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                placeholder="예: 강남역 쌍용플래티넘"
              />
            </Autocomplete>
          ) : (
            <div className="w-full h-11 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[10px]"></div>
          )}
          {formData.formattedAddress && (
            <p className="mt-2 text-[12px] text-slate-500">
              상세주소: {formData.formattedAddress} {formData.city && `(${formData.city}, ${formData.country})`}
            </p>
          )}
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-[13px] font-bold text-slate-700 mb-2 flex items-center justify-between">
            <span className="flex items-center"><ImageIcon className="w-4 h-4 mr-1 text-slate-400"/> 행사 이미지 (선택)</span>
            <span className="text-xs font-normal text-slate-500">{images.length} / 3 장</span>
          </label>
          
          <div 
            className={clsx(
              "w-full rounded-2xl border-2 border-dashed transition-all p-6 text-center",
              dragActive 
                ? "border-indigo-500 bg-indigo-50" 
                : "border-slate-300 bg-slate-50 hover:bg-slate-100"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              className="hidden" 
              ref={multiFileInputRef} 
              onChange={(e) => {
                if (e.target.files) handleImageUpload(e.target.files);
              }}
            />
            {images.length < 3 ? (
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200">
                  <Upload className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <button type="button" onClick={() => multiFileInputRef.current?.click()} className="text-indigo-600 font-bold hover:underline">이미지 선택</button>
                  <span className="text-slate-500 text-sm"> 하거나 이 곳에 끌어다 놓으세요.</span>
                </div>
                <p className="text-xs text-slate-400">최대 3장 업로드 가능 (메인 1장, 서브 2장)</p>
              </div>
            ) : (
               <div className="text-slate-500 text-sm py-4">
                 최대 개수(3장)의 이미지가 등록되었습니다.
               </div>
            )}
          </div>

          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {images.map((imgUrl, index) => (
                <div key={index} className={clsx(
                    "relative aspect-video sm:aspect-square md:aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all",
                    coverImageIndex === index ? "border-indigo-500 shadow-md" : "border-slate-200"
                  )}>
                  <img src={imgUrl} alt={`Uploaded ${index}`} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    {coverImageIndex !== index && (
                      <button 
                        type="button" 
                        onClick={() => setCoverImageIndex(index)}
                        className="w-8 h-8 rounded-full bg-white/90 backdrop-blur text-slate-600 hover:text-indigo-600 shadow-sm flex items-center justify-center"
                        title="대표 이미지로 설정"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      type="button" 
                      onClick={() => removeImage(index)}
                      className="w-8 h-8 rounded-full bg-white/90 backdrop-blur text-slate-600 hover:text-rose-600 shadow-sm flex items-center justify-center"
                      title="이미지 삭제"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {coverImageIndex === index && (
                    <div className="absolute bottom-0 left-0 right-0 bg-indigo-500 text-white text-[11px] font-bold py-1.5 text-center">
                      대표 이미지
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="block text-[12px] font-bold text-slate-500 mb-2">또는 이미지 링크 직접 입력</span>
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              className="w-full rounded-[10px] border-slate-200 border bg-slate-50 px-4 py-3 text-[14px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-[13px] font-bold text-slate-700 mb-2 flex items-center"><FileText className="w-4 h-4 mr-1 text-slate-400"/> 상세 설명</label>
          <textarea
            required
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={5}
            className="w-full rounded-[10px] border-slate-200 border bg-slate-50 px-4 py-3 text-[14px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow resize-none"
            placeholder="행사에 대한 자세한 소개를 적어주세요."
          ></textarea>
        </div>

        <div className="pt-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-[10px] text-slate-600 font-bold hover:bg-slate-100 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 rounded-[10px] bg-indigo-600 text-white font-bold shadow-sm hover:bg-indigo-700 hover:shadow-md transition-all disabled:opacity-50 flex items-center"
          >
            {submitting ? '저장 중...' : '수정 내역 저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
