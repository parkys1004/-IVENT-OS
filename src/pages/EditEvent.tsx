import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { handleSupabaseError, OperationType } from '../lib/supabaseError';
import PlaceSearch from '../components/PlaceSearch';
import { Calendar, Clock, MapPin, Users, FileText, ImageIcon as ImageIcon, Upload, X, Star, PlusCircle, MinusCircle, Music, Mic2, CreditCard, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useGoogleMaps } from '../context/GoogleMapsContext';
import clsx from 'clsx';

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
    category: 'party',
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
    media: [] as string[],
    paymentMethod: '',
    tickets: [{ name: '일반 예매', price: 0 }] as { name: string, price: number }[],
  });

  const { isLoaded, loadError } = useGoogleMaps();

  const handlePlaceSelect = (place: any) => {
    if (!place) return;
    
    let city = '';
    let country = '';
    
    if (place.address_components) {
      place.address_components.forEach((component: any) => {
        if (component.types.includes('country')) country = component.short_name;
        if (component.types.includes('locality')) city = component.long_name;
        else if (component.types.includes('administrative_area_level_1') && !city) city = component.long_name;
      });
    }

    setFormData(prev => ({
      ...prev,
      locationName: place.name || place.formatted_address || prev.locationName,
      formattedAddress: place.formatted_address || '',
      country: country,
      city: city,
      geoPoint: place.geometry?.location ? {
        lat: typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat,
        lng: typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng
      } : prev.geoPoint
    }));
  };

  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [coverImageIndex, setCoverImageIndex] = useState<number>(0);
  const [dragActive, setDragActive] = useState(false);

  const [sourceTable, setSourceTable] = useState<'parties' | 'lessons'>('parties');
  
  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      try {
        // Try parties table first
        let { data, error } = await supabase
          .from('parties')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (data) {
          setSourceTable('parties');
        } else {
          // Try lessons table
          const { data: lessonData } = await supabase
            .from('lessons')
            .select('*')
            .eq('id', id)
            .maybeSingle();
          
          if (lessonData) {
            setSourceTable('lessons');
            data = lessonData;
          }
        }

        if (error) throw error;
        if (data) {
          setEventData(data);
          
          const startDateObj = (data.date || data.start_date) ? new Date(data.date || data.start_date) : new Date();
          const endDateObj = data.end_date ? new Date(data.end_date) : startDateObj;

          setFormData({
            title: data.title || '',
            description: data.description || '',
            category: data.category || 'party',
            date: format(startDateObj, 'yyyy-MM-dd'),
            time: format(startDateObj, 'HH:mm'),
            endDate: format(endDateObj, 'yyyy-MM-dd'),
            endTime: format(endDateObj, 'HH:mm'),
            locationName: data.location_name || '',
            formattedAddress: data.formatted_address || data.location_name || '',
            country: data.country || '',
            city: data.city || '',
            geoPoint: (data.lat && data.lng) ? { lat: data.lat, lng: data.lng } : null,
            imageUrl: data.image_url || '',
            maxAttendees: data.max_attendees || data.capacity || 50,
            djs: data.djs || [],
            performances: data.performances || [],
            media: data.media || [],
            paymentMethod: data.payment_method || '',
            tickets: data.tickets || [],
          });

          const media = data.media && Array.isArray(data.media) ? data.media : [];
          const loadedImages = [
            ...(data.image_url && !media.includes(data.image_url) ? [data.image_url] : []),
            ...media
          ];
          setImages(loadedImages);
          setCoverImageIndex(0);
        } else {
          alert('내역을 찾을 수 없습니다.');
          navigate('/');
        }
      } catch (error) {
        console.error("Error fetching data:", error);
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
    const availableSlots = 5 - images.length;
    if (availableSlots <= 0) {
      alert("최대 5장의 이미지만 등록할 수 있습니다.");
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
    
    // Re-fetch profile to ensure latest role
    const { data: latestProfile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const isAdmin = profile?.role === 'admin' || latestProfile?.role === 'admin';

    setSubmitting(true);
    try {
      // Build description with video URL
      const finalDescription = videoUrl ? `${videoUrl}\n\n${formData.description}` : formData.description;
      const startDate = new Date(`${formData.date}T${formData.time}`);
      const endDate = new Date(`${formData.endDate || formData.date}T${formData.endTime || '23:59'}`);

      const mainImageUrl = images.length > 0 ? images[0] : formData.imageUrl;
      const newStatus = isAdmin ? eventData.status : 'pending';

      let updateError;

      if (sourceTable === 'lessons') {
        const { error } = await supabase
          .from('lessons')
          .update({
            title: formData.title,
            description: finalDescription,
            category: formData.category,
            date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            class_time: formData.time,
            location_name: formData.locationName,
            formatted_address: formData.formattedAddress,
            city: formData.city,
            country: formData.country,
            lat: formData.geoPoint?.lat,
            lng: formData.geoPoint?.lng,
            image_url: mainImageUrl, 
            status: newStatus,
            max_attendees: Number(formData.maxAttendees),
            price: formData.tickets[0]?.price || 0,
            level: eventData.level || 'beginner',
            tickets: formData.tickets.filter(t => t.name.trim()),
            payment_method: formData.paymentMethod
          })
          .eq('id', id);
        updateError = error;
      } else {
        const { error } = await supabase
          .from('parties')
          .update({
            title: formData.title,
            description: finalDescription,
            category: formData.category,
            date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            location_name: formData.locationName,
            formatted_address: formData.formattedAddress,
            city: formData.city,
            country: formData.country,
            lat: formData.geoPoint?.lat,
            lng: formData.geoPoint?.lng,
            image_url: mainImageUrl, 
            status: newStatus,
            max_attendees: Number(formData.maxAttendees),
            price: formData.tickets[0]?.price || 0,
            djs: formData.djs.filter(d => d.trim()),
            performances: formData.performances.filter(p => p.trim()),
            media: images,
            tickets: formData.tickets.filter(t => t.name.trim()),
            payment_method: formData.paymentMethod
          })
          .eq('id', id);
        updateError = error;
      }

      if (updateError) throw updateError;
      
      alert(`${sourceTable === 'parties' ? '행사' : '강습'}가 성공적으로 수정되었습니다.`);
      navigate(`/event/${id}`);
    } catch (err: any) {
      handleSupabaseError(err, OperationType.UPDATE, sourceTable, user?.id || '');
      alert(`수정 중 오류가 발생했습니다: ${err.message || 'Unknown error'}`);
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

  const addMedia = () => setFormData(prev => ({ ...prev, media: [...prev.media, ''] }));
  const removeMedia = (index: number) => setFormData(prev => ({ ...prev, media: prev.media.filter((_, i) => i !== index) }));
  const updateMedia = (index: number, value: string) => {
    const newMedia = [...formData.media];
    newMedia[index] = value;
    setFormData(prev => ({ ...prev, media: newMedia }));
  };

  const addTicket = () => setFormData(prev => ({ ...prev, tickets: [...prev.tickets, { name: '', price: 0 }] }));
  const removeTicket = (index: number) => setFormData(prev => ({ ...prev, tickets: prev.tickets.filter((_, i) => i !== index) }));
  const updateTicket = (index: number, field: 'name' | 'price', value: string | number) => {
    const newTickets = [...formData.tickets];
    newTickets[index] = { ...newTickets[index], [field]: value };
    setFormData(prev => ({ ...prev, tickets: newTickets }));
  };

  const handleDelete = async () => {
    if (!window.confirm('정말 이 행사를 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.')) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from(sourceTable)
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      alert('성공적으로 삭제되었습니다.');
      navigate('/');
    } catch (err: any) {
      handleSupabaseError(err, OperationType.DELETE, sourceTable, user?.id || '');
      alert(`삭제 중 오류가 발생했습니다: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto min-h-screen pt-4 pb-24 md:pb-12 px-4">
      <div className="glass-panel overflow-hidden rounded-[32px] shadow-2xl border border-slate-200/50 dark:border-slate-800/50">
        <div className="p-6 md:p-12 lg:p-16">
          <h1 className="text-2xl md:text-4xl font-black text-slate-800 dark:text-white mb-8 md:mb-12 flex items-center gap-3">
            <span className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
              <Plus className="w-6 h-6 md:w-8 md:h-8 text-indigo-600 dark:text-indigo-400" />
            </span>
            행사 수정하기
          </h1>
          
          <form id="edit-event-form" onSubmit={handleSubmit} className="space-y-12 md:space-y-16">
            {/* Basic Info */}
            <section className="space-y-8">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <FileText className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">기본 정보</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[13px] font-bold text-slate-600 dark:text-slate-400 mb-2 ml-1">행사 이름</label>
                  <input
                    required
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full rounded-2xl border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800/50 px-5 py-4 text-[15px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-semibold"
                    placeholder="예: 2026 프론트엔드 개발자 컨퍼런스"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[13px] font-bold text-slate-600 dark:text-slate-400 mb-2 ml-1">카테고리</label>
                    <div className="relative">
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full rounded-2xl border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800/50 px-5 py-4 text-[15px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all appearance-none font-semibold"
                      >
                        <option value="salsa">살사 (Salsa)</option>
                        <option value="bachata">바차타 (Bachata)</option>
                        <option value="kizomba">키좀바 (Kizomba)</option>
                        <option value="salsa_bachata">살사/바차타 (Salsa/Bachata)</option>
                        <option value="sal_ba_ki">살바키 (Sal-Ba-Ki)</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <PlusCircle className="w-4 h-4 rotate-45" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-slate-600 dark:text-slate-400 mb-2 ml-1 flex items-center">
                      <Users className="w-4 h-4 mr-1.5 text-slate-400"/> 최대 모집 인원
                    </label>
                    <div className="relative">
                      <input
                        required
                        type="number"
                        name="maxAttendees"
                        min={eventData?.currentAttendees || 1}
                        value={formData.maxAttendees}
                        onChange={handleChange}
                        className="w-full rounded-2xl border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800/50 px-5 py-4 text-[15px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-black"
                      />
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">명</span>
                    </div>
                    {(eventData?.currentAttendees || 0) > 0 && (
                      <p className="mt-2 text-[11px] text-slate-500 ml-1 font-medium italic">
                        * 현재 참여자 수: {eventData?.currentAttendees}명
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Date and Time Section */}
            <section className="space-y-8">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Calendar className="w-5 h-5 text-rose-500" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">일정</h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <div className="col-span-1 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">시작 날짜</label>
                  <input
                    required
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition-all font-semibold"
                  />
                </div>
                <div className="col-span-1 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">시작 시간</label>
                  <input
                    required
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition-all font-semibold"
                  />
                </div>
                <div className="col-span-1 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">종료 날짜</label>
                  <input
                    required
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition-all font-semibold"
                  />
                </div>
                <div className="col-span-1 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">종료 시간</label>
                  <input
                    required
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition-all font-semibold"
                  />
                </div>
              </div>
            </section>

            {/* Detail Info Section */}
            <section className="space-y-12">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Star className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">세부 정보</h2>
              </div>
              
              {/* YouTube Video URL */}
              <div className="space-y-4">
                <label className="block text-[13px] font-bold text-slate-600 dark:text-slate-400 mb-2 ml-1 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-rose-500" /> 유튜브 영상 링크 (선택)
                </label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold shadow-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* DJs */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[14px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Music className="w-4 h-4 text-indigo-500" /> DJs
                    </label>
                    <button 
                      type="button" 
                      onClick={addDj}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-[11px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> 추가
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.djs.map((dj, idx) => (
                      <div key={idx} className="group flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                        <input
                          type="text"
                          value={dj}
                          onChange={(e) => updateDj(idx, e.target.value)}
                          placeholder="DJ 이름을 입력하세요"
                          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold shadow-sm"
                        />
                        <button type="button" onClick={() => removeDj(idx)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                          <MinusCircle className="w-6 h-6" />
                        </button>
                      </div>
                    ))}
                    {formData.djs.length === 0 && (
                      <div className="py-8 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400">
                        <Music className="w-8 h-8 mb-2 opacity-20" />
                        <p className="text-xs font-bold italic tracking-tighter">등록된 DJ가 없습니다.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Performances */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[14px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Mic2 className="w-4 h-4 text-rose-500" /> 공연
                    </label>
                    <button 
                      type="button" 
                      onClick={addPerformance}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg text-[11px] font-black uppercase tracking-wider hover:bg-rose-100 transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> 추가
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.performances.map((perf, idx) => (
                      <div key={idx} className="group flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                        <input
                          type="text"
                          value={perf}
                          onChange={(e) => updatePerformance(idx, e.target.value)}
                          placeholder="공연 팀 또는 이름"
                          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-semibold shadow-sm"
                        />
                        <button type="button" onClick={() => removePerformance(idx)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                          <MinusCircle className="w-6 h-6" />
                        </button>
                      </div>
                    ))}
                    {formData.performances.length === 0 && (
                      <div className="py-8 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400">
                        <Mic2 className="w-8 h-8 mb-2 opacity-20" />
                        <p className="text-xs font-bold italic tracking-tighter">등록된 공연이 없습니다.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Media Team */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[14px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-indigo-500" /> 미디어
                    </label>
                    <button 
                      type="button" 
                      onClick={addMedia}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-[11px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> 추가
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.media.map((person, idx) => (
                      <div key={idx} className="group flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                        <input
                          type="text"
                          value={person}
                          onChange={(e) => updateMedia(idx, e.target.value)}
                          placeholder="포토 / 영상 전문가"
                          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold shadow-sm"
                        />
                        <button type="button" onClick={() => removeMedia(idx)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                          <MinusCircle className="w-6 h-6" />
                        </button>
                      </div>
                    ))}
                    {formData.media.length === 0 && (
                      <div className="py-8 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400">
                        <Upload className="w-8 h-8 mb-2 opacity-20" />
                        <p className="text-xs font-bold italic tracking-tighter">등록된 미디어 정보가 없습니다.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tickets */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[14px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-500" /> 티켓
                    </label>
                    <button 
                      type="button" 
                      onClick={addTicket}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[11px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> 추가
                    </button>
                  </div>
                  <div className="space-y-4">
                    {formData.tickets.map((ticket, idx) => (
                      <div key={idx} className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-4 relative animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">티켓 명칭</label>
                          <input
                            type="text"
                            value={ticket.name}
                            onChange={(e) => updateTicket(idx, 'name', e.target.value)}
                            placeholder="명칭 (예: 얼리버드)"
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-semibold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">가격 (원)</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={ticket.price}
                              onChange={(e) => updateTicket(idx, 'price', Number(e.target.value))}
                              placeholder="0"
                              className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-black"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₩</span>
                          </div>
                        </div>
                        {formData.tickets.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => removeTicket(idx)} 
                            className="absolute -top-2 -right-2 w-7 h-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 shadow-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Payment & Location Section */}
            <section className="space-y-12">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <MapPin className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">장소 및 결제</h2>
              </div>

              <div className="space-y-8">
                <div className="bg-slate-50 dark:bg-slate-800/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                  <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center">
                    <CreditCard className="w-4 h-4 mr-2 text-indigo-500"/> 입금 안내 정보
                  </label>
                  <textarea
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-4 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none shadow-sm"
                    placeholder="예: 우리은행 1002-123-456789 홍길동 / 입금 후 성함 문자로 보내주세요."
                  />
                </div>

                <div className="space-y-4">
                  <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 ml-1">행사 장소</label>
                  {isLoaded ? (
                    <PlaceSearch 
                      onPlaceSelect={handlePlaceSelect}
                      onInputChange={(val) => setFormData(prev => ({ ...prev, locationName: val }))}
                      placeholder="주소를 검색하거나 장소 이름을 입력하세요"
                      value={formData.locationName}
                    />
                  ) : (
                    <input
                      type="text"
                      name="locationName"
                      value={formData.locationName}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-5 py-4 text-[15px] outline-none"
                    />
                  )}
                  {formData.formattedAddress && (
                    <div className="flex items-start gap-2 text-[13px] text-slate-500 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                      <p>상세주소: {formData.formattedAddress}</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Image Gallery Section */}
            <section className="space-y-8">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <ImageIcon className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">행사 사진</h2>
              </div>
              
              <div className="space-y-6">
                {images.length < 5 && (
                  <div 
                    onClick={() => multiFileInputRef.current?.click()}
                    className={clsx(
                      "w-full rounded-[32px] border-3 border-dashed transition-all p-10 text-center cursor-pointer group",
                      dragActive 
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10" 
                        : "border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/30"
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
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center shadow-md border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-indigo-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-700 dark:text-slate-200 font-bold text-lg">이미지 추가하기</p>
                        <p className="text-slate-400 text-sm">최대 5장까지 (각 이미지당 최대 1MB)</p>
                      </div>
                    </div>
                  </div>
                )}

                {images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {images.map((imgUrl, index) => (
                      <div key={index} className={clsx(
                          "group relative aspect-square rounded-2xl overflow-hidden border-4 transition-all duration-300",
                          coverImageIndex === index ? "border-indigo-500 shadow-xl scale-100" : "border-slate-50/50 dark:border-slate-800 scale-95 hover:scale-100"
                        )}>
                        <img src={imgUrl} alt={`Uploaded ${index}`} className="w-full h-full object-cover" />
                        
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {coverImageIndex !== index && (
                            <button 
                              type="button" 
                              onClick={(e) => { e.stopPropagation(); setCoverImageIndex(index); }}
                              className="w-10 h-10 rounded-full bg-white text-indigo-600 hover:bg-indigo-600 hover:text-white shadow-xl flex items-center justify-center transition-all"
                              title="대표 이미지로 설정"
                            >
                              <Star className="w-5 h-5" />
                            </button>
                          )}
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                            className="w-10 h-10 rounded-full bg-white text-rose-600 hover:bg-rose-600 hover:text-white shadow-xl flex items-center justify-center transition-all"
                            title="삭제"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        
                        {coverImageIndex === index && (
                          <div className="absolute top-2 left-2 px-3 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                            MAIN
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Description Section */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <FileText className="w-5 h-5 text-slate-400" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">상세 설명</h2>
              </div>
              <textarea
                required
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={8}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-6 py-5 text-[15px] leading-relaxed text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none shadow-inner"
                placeholder="행사에 대한 자세한 소개를 적어주세요."
              />
            </section>

            {/* Desktop Actions */}
            <div className="hidden md:flex gap-6 pt-12 border-t border-slate-100 dark:border-slate-800">
              <button 
                type="button" 
                onClick={handleDelete}
                className="px-8 py-5 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 font-bold rounded-2xl hover:bg-rose-100 transition-colors"
                disabled={submitting}
              >
                삭제하기
              </button>
              <div className="flex-1" />
              <button 
                type="button" 
                onClick={() => navigate(-1)} 
                className="px-10 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                className="px-16 py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 hover:-translate-y-1 transition-all disabled:opacity-50"
              >
                {submitting ? '저장 중...' : '수정 완료하기'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sticky Mobile Actions */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 z-50 flex gap-3">
        <button 
          type="button" 
          onClick={handleDelete}
          className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-2xl flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/30"
          disabled={submitting}
        >
          <X className="w-7 h-7" />
        </button>
        <button 
          type="submit" 
          form="edit-event-form"
          disabled={submitting}
          className="flex-1 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {submitting ? (
            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>수정 완료</>
          )}
        </button>
      </div>
    </div>
  );
}
