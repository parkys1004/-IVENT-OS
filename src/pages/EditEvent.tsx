import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { handleSupabaseError, OperationType } from '../lib/supabaseError';
import PlaceSearch from '../components/PlaceSearch';
import { Calendar, Clock, MapPin, Users, FileText, ImageIcon as ImageIcon, Upload, X, Star, PlusCircle, MinusCircle, Music, Mic2, CreditCard, Plus, Sparkles, GraduationCap, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useGoogleMaps } from '../context/GoogleMapsContext';
import clsx from 'clsx';
import { uploadImageToStorage, compressImageToDataUrl } from '../lib/storage';
import { EventFormLayout } from '../components/events/EventFormLayout';

export default function EditEvent() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ type: 'loading' | 'error' | 'success' | null, message: string }>({ type: null, message: '' });
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
    mediaExperts: [] as string[],
    workshops: [] as { teacher: string, topic: string, time: string }[],
    paymentMethod: '',
    paymentLink: '',
    youtubeUrl: '',
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
        let { data, error } = await supabase
          .from('parties')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (data) {
          setSourceTable('parties');
        } else {
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
          // Auth check: only host or admin can edit
          if (data.host_id !== user?.id && profile?.role !== 'admin') {
            alert('수정 권한이 없습니다.');
            navigate(`/event/${id}`);
            return;
          }

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
            mediaExperts: data.media_experts || [],
            workshops: data.workshops || [],
            paymentMethod: data.payment_method || '',
            paymentLink: data.payment_link || '',
            youtubeUrl: data.youtube_url || '',
            tickets: data.tickets || [],
          });

          const { data: photos } = await supabase
            .from('event_photos')
            .select('image_url')
            .eq('event_id', id);
            
          const photoUrls = photos ? photos.map(p => p.image_url) : [];

          const loadedImages = [
            ...(data.image_url && !photoUrls.includes(data.image_url) ? [data.image_url] : []),
            ...photoUrls
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

  const handleAiAnalyze = async (file: File) => {
    setAiLoading(true);
    setAiStatus({ type: 'loading', message: '포스터를 분석하고 있어요... 🎨' });
    try {
      const mimeType = file.type || 'image/jpeg';
      const dataUrl = await compressImageToDataUrl(file);
      const base64Data = dataUrl.split(',')[1];

      // 1. Check Personal API Key from LocalStorage first (Security & Privacy)
      let apiKey = localStorage.getItem('user_gemini_api_key');
      let isPersonalKey = !!apiKey;
      
      if (!apiKey && user) {
        // Fallback to Supabase for compatibility with existing users
        const { data: aiConfig } = await supabase
          .from('user_ai_configs')
          .select('api_key')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (aiConfig?.api_key) {
          apiKey = aiConfig.api_key;
          isPersonalKey = true;
        }
      }

      if (!isPersonalKey) {
        // 2. Check Daily Free Usage if no personal key
        const today = new Date().toISOString().split('T')[0];
        const usageData = JSON.parse(localStorage.getItem('ai_usage_stats') || '{"date":"", "count":0}');
        
        if (usageData.date !== today) {
          usageData.date = today;
          usageData.count = 0;
        }

        const FREE_LIMIT = 5; // 하루 5회 무료 제공
        if (usageData.count < FREE_LIMIT) {
          usageData.count += 1;
          localStorage.setItem('ai_usage_stats', JSON.stringify(usageData));
          
          setAiStatus({ 
            type: 'loading', 
            message: `무료 체험 중 (${FREE_LIMIT - usageData.count + 1}회 남음) ✨` 
          });
        } else {
          setAiStatus({ 
            type: 'error', 
            message: '일일 무료 분석 횟수 초과! 개인 API 키를 등록해주세요. 🔑' 
          });
          setTimeout(() => setAiStatus({ type: null, message: '' }), 6000);
          setAiLoading(false);
          return;
        }
      } else {
        setAiStatus({ type: 'loading', message: '등록된 개인 API 키를 불러옵니다. 🔐' });
      }

      setAiStatus({ type: 'loading', message: 'AI가 정보를 추출하고 있습니다... ✨' });
      
      const proxyResponse = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType,
          ...(isPersonalKey && apiKey ? { personalApiKey: apiKey } : {})
        })
      });

      if (proxyResponse.status === 405) throw new Error('서버에서 허용되지 않는 요청 방식입니다(405).');
      const contentType = proxyResponse.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await proxyResponse.text();
        throw new Error(`서버 응답 오류 (${proxyResponse.status}): ${text.substring(0, 100)}`);
      }
      const data = await proxyResponse.json();
      if (!proxyResponse.ok) throw new Error(data.error || `서버 오류 (${proxyResponse.status})`);
      const parsed = data;
      
      if (parsed) {
        const validCategories = ['salsa', 'bachata', 'kizomba', 'salsa_bachata', 'sal_ba_ki', 'party', 'lesson', 'festival', 'workshop', 'concert'];
        
        setFormData(prev => ({
           ...prev,
           title: parsed.title || prev.title,
           description: parsed.description || prev.description,
           category: validCategories.includes(parsed.category) ? parsed.category : prev.category,
           date: parsed.date || prev.date,
           time: parsed.time || prev.time,
           endDate: parsed.endDate || parsed.date || prev.endDate,
           endTime: parsed.endTime || (parsed.time ? "23:59" : prev.endTime),
           locationName: parsed.locationName || prev.locationName,
           formattedAddress: parsed.formattedAddress || prev.formattedAddress,
           city: parsed.city || prev.city,
           country: parsed.country || prev.country,
           maxAttendees: parsed.maxAttendees || prev.maxAttendees,
           paymentLink: parsed.paymentLink || prev.paymentLink,
           djs: parsed.djs && parsed.djs.length > 0 ? parsed.djs : prev.djs,
           performances: parsed.performances && parsed.performances.length > 0 ? parsed.performances : prev.performances,
           mediaExperts: parsed.media && parsed.media.length > 0 ? parsed.media : prev.mediaExperts,
           tickets: parsed.tickets && parsed.tickets.length > 0 ? parsed.tickets : prev.tickets
        }));
        setAiStatus({ type: 'success', message: '분석 완료! 폼이 채워졌습니다. 🎉' });
        setTimeout(() => setAiStatus({ type: null, message: '' }), 3000);
      }
    } catch(err: any) {
      console.error('AI Analysis failed:', err);
      let errorMessage = 'AI 분석 중 오류가 발생했습니다. 😢';
      const msg = err.message || '';
      if (msg.includes('GEMINI_API_KEY') || msg.includes('KEY_MISSING')) {
        errorMessage = 'API 키가 등록되어 있지 않거나 잘못되었습니다. ⚠️';
      } else if (msg.includes('Quota') || msg.includes('limit')) {
        errorMessage = 'API 호출 한도가 초과되었습니다. 잠시 후 시도해주세요. ⏳';
      } else if (msg.includes('404') || msg.includes('not found')) {
        errorMessage = 'AI 모델을 찾을 수 없습니다. (404) API 키의 권한이나 모델 지원 여부를 확인해주세요. 🔍';
      } else {
        errorMessage = `오류: ${msg.substring(0, 70) || '알 수 없는 오류'}`;
      }
      setAiStatus({ type: 'error', message: errorMessage });
      setTimeout(() => setAiStatus({ type: null, message: '' }), 6000);
    } finally {
      setAiLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAiInputClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleAiAnalyze(file);
  };

  const handleImageUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const availableSlots = 10 - images.length;
    if (availableSlots <= 0) {
      alert("최대 10장의 이미지만 등록할 수 있습니다.");
      return;
    }

    const filesToProcess = fileArray.slice(0, availableSlots).filter(file => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowed.includes(file.type)) {
        alert(`${file.name}은(는) 지원하지 않는 파일 형식입니다. 이미지 파일만 업로드해주세요.`);
        return false;
      }
      return true;
    });
    
    try {
      setSubmitting(true);
      const newImageUrls = await Promise.all(filesToProcess.map(f => uploadImageToStorage(f, 'events')));
      setImages(prev => [...prev, ...newImageUrls]);
    } catch (error) {
      console.error("Image upload failed: ", error);
      alert("이미지를 업로드하는 중 오류가 발생했습니다.");
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
    
    const { data: latestProfile } = await supabase.from('profiles').select('role').eq('id', user?.id || '').maybeSingle();
    const isAdmin = profile?.role === 'admin' || latestProfile?.role === 'admin';

    setSubmitting(true);
    try {
      const finalDescription = videoUrl ? `${videoUrl}\n\n${formData.description}` : formData.description;
      const startDate = new Date(`${formData.date}T${formData.time}`);
      const endDate = new Date(`${formData.endDate || formData.date}T${formData.endTime || '23:59'}`);

      const mainImageUrl = images.length > 0 ? images[coverImageIndex] : formData.imageUrl;
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
            tickets: formData.tickets.filter(t => t.name.trim()),
            payment_method: formData.paymentMethod,
            payment_link: formData.paymentLink,
            youtube_url: formData.youtubeUrl
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
            media_experts: formData.mediaExperts.filter(m => m.trim()),
            workshops: formData.workshops.filter(w => w.teacher.trim() || w.topic.trim()),
            tickets: formData.tickets.filter(t => t.name.trim()),
            payment_method: formData.paymentMethod,
            payment_link: formData.paymentLink,
            youtube_url: formData.youtubeUrl
          })
          .eq('id', id);
        updateError = error;
      }

      if (updateError) throw updateError;
      
      await supabase.from('event_photos').delete().eq('event_id', id);
      
      if (images.length > 0) {
        await supabase
          .from('event_photos')
          .insert(images.map(url => ({
            event_id: id,
            image_url: url,
            user_id: user?.id || ''
          })));
      }
      
      navigate(`/event/${id}`);
    } catch (err: any) {
      handleSupabaseError(err, OperationType.UPDATE, sourceTable, user?.id || '');
      alert(`수정 중 오류가 발생했습니다.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('정말 이 행사를 삭제하시겠습니까?')) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from(sourceTable).delete().eq('id', id);
      if (error) throw error;
      navigate('/');
    } catch (err: any) {
       handleSupabaseError(err, OperationType.DELETE, sourceTable, user?.id || '');
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

  const addWorkshop = () => setFormData(prev => ({ ...prev, workshops: [...prev.workshops, { teacher: '', topic: '', time: '' }] }));
  const removeWorkshop = (index: number) => setFormData(prev => ({ ...prev, workshops: prev.workshops.filter((_, i) => i !== index) }));
  const updateWorkshop = (index: number, field: keyof typeof formData.workshops[0], value: string) => {
    const list = [...formData.workshops];
    list[index] = { ...list[index], [field]: value };
    setFormData(prev => ({ ...prev, workshops: list }));
  };

  const addPerformance = () => setFormData(prev => ({ ...prev, performances: [...prev.performances, ''] }));
  const removePerformance = (index: number) => setFormData(prev => ({ ...prev, performances: prev.performances.filter((_, i) => i !== index) }));
  const updatePerformance = (index: number, value: string) => {
    const newPerformances = [...formData.performances];
    newPerformances[index] = value;
    setFormData(prev => ({ ...prev, performances: newPerformances }));
  };

  const addMedia = () => setFormData(prev => ({ ...prev, mediaExperts: [...prev.mediaExperts, ''] }));
  const removeMedia = (index: number) => setFormData(prev => ({ ...prev, mediaExperts: prev.mediaExperts.filter((_, i) => i !== index) }));
  const updateMedia = (index: number, value: string) => {
    const newMediaExperts = [...formData.mediaExperts];
    newMediaExperts[index] = value;
    setFormData(prev => ({ ...prev, mediaExperts: newMediaExperts }));
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

  return (
    <EventFormLayout
      title="행사 수정하기"
      subtitle="수정사항을 입력하고 업데이트를 완료하세요."
      aiLoading={aiLoading}
      aiStatus={aiStatus}
      onAiAnalyzeClick={() => fileInputRef.current?.click()}
      onSubmit={handleSubmit}
      leftColumn={
        <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAiInputClick} />
          <input type="file" multiple accept="image/*" className="hidden" ref={multiFileInputRef} onChange={(e) => e.target.files && handleImageUpload(e.target.files)} />
          
          {/* Poster Section */}
          <div className="space-y-4">
            <label className="block text-[13px] font-bold text-slate-400 uppercase tracking-widest ml-1">이벤트 포스터 (최대 10장)</label>
            <div 
              className={clsx(
                "relative group cursor-pointer transition-all aspect-[3/4] rounded-[32px] overflow-hidden border-4 border-dashed",
                dragActive ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shadow-inner hover:border-indigo-500/50"
              )}
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
              onClick={() => multiFileInputRef.current?.click()}
            >
              {images.length > 0 ? (
                <>
                  <img src={images[coverImageIndex]} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm">
                    <div className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-2xl mb-2">
                      <Plus className="w-5 h-5" /> 이미지 추가
                    </div>
                    <p className="text-white text-[10px] font-bold uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full">이미지 클릭시 변경 가능</p>
                  </div>
                  <div className="absolute top-4 left-4">
                    <span className="text-white text-[10px] font-black uppercase tracking-widest bg-indigo-600 px-3 py-1.5 rounded-full shadow-lg">Main Cover</span>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-800/30">
                  <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform mb-6 shadow-sm">
                    <Upload className="w-10 h-10 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                  <p className="text-lg font-black text-slate-800 dark:text-slate-100">이벤트의 얼굴을 등록하세요</p>
                  <p className="text-sm text-slate-400 mt-1">포스터를 여기에 드래그하거나 클릭하세요</p>
                </div>
              )}
            </div>
            
            {images.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {images.map((img, idx) => (
                  <div 
                    key={idx} 
                    className={clsx(
                      "relative min-w-[70px] aspect-[3/4] rounded-xl overflow-hidden border-2 cursor-pointer transition-all", 
                      coverImageIndex === idx ? "border-indigo-500 scale-105 shadow-md shadow-indigo-500/20" : "border-transparent opacity-60 hover:opacity-100"
                    )} 
                    onClick={() => setCoverImageIndex(idx)}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(idx); }} className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-lg hover:bg-rose-500 transition-colors"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Event Name */}
          <div className="space-y-4">
            <label className="block text-[13px] font-bold text-slate-400 uppercase tracking-widest ml-1">기본 정보</label>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <input 
                  required 
                  type="text" 
                  name="title" 
                  value={formData.title} 
                  onChange={handleChange} 
                  className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6 py-4 text-xl font-black text-slate-800 dark:text-white placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" 
                  placeholder="행사 이름을 입력하세요" 
                />
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <select 
                    name="category" 
                    value={formData.category} 
                    onChange={handleChange} 
                    className="w-full appearance-none rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6 py-4 text-[15px] font-bold text-slate-800 dark:text-white focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all cursor-pointer"
                  >
                    <option value="party">소셜 파티 (Social Party)</option>
                    <option value="festival">페스티벌 (Festival)</option>
                    <option value="workshop">워크숍 (Workshop)</option>
                    <option value="concert">공연 (Concert)</option>
                    <option value="salsa">살사 전문 (Salsa)</option>
                    <option value="bachata">바차타 전문 (Bachata)</option>
                    <option value="kizomba">키좀바 전문 (Kizomba)</option>
                    <option value="salsa_bachata">살사/바차타 (SB)</option>
                    <option value="sal_ba_ki">살바키 (SBK)</option>
                    <option value="lesson">특강/정규강습 (Lesson)</option>
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <Plus className="w-4 h-4 rotate-45" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 ml-1">
                  <MapPin className="w-4 h-4 text-indigo-500" />
                  <span className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">장소 정보</span>
                </div>
                {isLoaded ? (
                  <PlaceSearch 
                    onPlaceSelect={handlePlaceSelect} 
                    defaultValue={formData.locationName} 
                  />
                ) : (
                  <div className="w-full h-14 bg-slate-50 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
                )}
                {formData.formattedAddress && (
                  <p className="px-4 py-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl text-xs font-bold text-slate-500 flex items-center gap-2">
                    <MapPin className="w-3 h-3" /> {formData.formattedAddress}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Lineup Section */}
          <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-4">
              <div className="flex items-center justify-between ml-1">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-teal-500" />
                  <span className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">워크샵 라인업</span>
                </div>
                <button type="button" onClick={addWorkshop} className="text-[11px] font-black text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-3 py-1.5 rounded-full">+ 추가</button>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {formData.workshops.map((ws, idx) => (
                  <div key={idx} className="p-5 rounded-[24px] bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-left-2 transition-all">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest bg-teal-50 dark:bg-teal-900/30 px-3 py-1 rounded-full">Workshop #{idx + 1}</span>
                      <button type="button" onClick={() => removeWorkshop(idx)} className="p-2 text-slate-300 hover:text-rose-500"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">강사명</label>
                        <input type="text" value={ws.teacher} onChange={(e) => updateWorkshop(idx, 'teacher', e.target.value)} placeholder="예: 강사님 이름" className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500/20" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">시간</label>
                        <input type="text" value={ws.time} onChange={(e) => updateWorkshop(idx, 'time', e.target.value)} placeholder="예: 19:00 - 20:00" className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500/20" />
                      </div>
                      <div className="sm:col-span-2 space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">워크샵 주제</label>
                        <input type="text" value={ws.topic} onChange={(e) => updateWorkshop(idx, 'topic', e.target.value)} placeholder="예: 바차타 센슈얼 베이직" className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500/20" />
                      </div>
                    </div>
                  </div>
                ))}
                {formData.workshops.length === 0 && (
                  <div className="py-8 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[28px] opacity-40">
                     <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">등록된 워크샵이 없습니다.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between ml-1">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-indigo-500" />
                  <span className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">DJ 라인업</span>
                </div>
                <button type="button" onClick={addDj} className="text-[11px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-full">+ 추가</button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {formData.djs.map((dj, idx) => (
                  <div key={idx} className="flex gap-2 items-center animate-in fade-in slide-in-from-left-2">
                    <input type="text" value={dj} onChange={(e) => updateDj(idx, e.target.value)} placeholder="DJ 이름을 입력하세요" className="flex-1 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-5 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    <button type="button" onClick={() => removeDj(idx)} className="p-2 text-slate-300 hover:text-rose-500"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between ml-1">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">공연/쇼케이스</span>
                </div>
                <button type="button" onClick={addPerformance} className="text-[11px] font-black text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full">+ 추가</button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {formData.performances.map((perf, idx) => (
                  <div key={idx} className="flex gap-2 items-center animate-in fade-in slide-in-from-left-2">
                    <input type="text" value={perf} onChange={(e) => updatePerformance(idx, e.target.value)} placeholder="공연팀/댄서 이름을 입력하세요" className="flex-1 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-5 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/20" />
                    <button type="button" onClick={() => removePerformance(idx)} className="p-2 text-slate-300 hover:text-rose-500"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between ml-1">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-500" />
                  <span className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">미디어 (포토/영상)</span>
                </div>
                <button type="button" onClick={addMedia} className="text-[11px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full">+ 추가</button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {formData.mediaExperts.map((m, idx) => (
                  <div key={idx} className="flex gap-2 items-center animate-in fade-in slide-in-from-left-2">
                    <input type="text" value={m} onChange={(e) => updateMedia(idx, e.target.value)} placeholder="작가/팀 이름을 입력하세요" className="flex-1 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-5 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    <button type="button" onClick={() => removeMedia(idx)} className="p-2 text-slate-300 hover:text-rose-500"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      }
      rightColumn={
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700 delay-100">
          {/* Date & Time Section */}
          <div className="p-8 rounded-[40px] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-8">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-rose-500" />
              <span className="text-[14px] font-black text-slate-800 dark:text-white uppercase tracking-wider">이벤트 일정</span>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 ml-1">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">시작 시간</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 text-[14px] font-bold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10" />
                  <input type="time" name="time" value={formData.time} onChange={handleChange} required className="w-full rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 text-[14px] font-bold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 ml-1">
                  <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">종료 시간</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required className="w-full rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 text-[14px] font-bold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10" />
                  <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} required className="w-full rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 text-[14px] font-bold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10" />
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Tickets */}
          <div className="space-y-4">
            <div className="flex items-center justify-between ml-1">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-500" />
                <span className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">티켓 및 참가비</span>
              </div>
              <button type="button" onClick={() => setFormData(p => ({ ...p, tickets: [...p.tickets, { name: '', price: 0 }] }))} className="text-[11px] font-black text-indigo-500 hover:text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-full transition-all">
                + 티켓 추가
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.tickets.map((ticket, idx) => (
                <div key={idx} className="flex gap-3 items-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex-[2]">
                    <input type="text" value={ticket.name} onChange={(e) => updateTicket(idx, 'name', e.target.value)} placeholder="티켓 명칭 (예: 입장권)" className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-5 py-3.5 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10" />
                  </div>
                  <div className="relative flex-1">
                    <input type="number" value={ticket.price} onChange={(e) => updateTicket(idx, 'price', Number(e.target.value))} className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-5 py-3.5 text-sm font-black text-slate-800 dark:text-white text-right outline-none focus:ring-4 focus:ring-indigo-500/10" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">KRW</span>
                  </div>
                  {formData.tickets.length > 1 && (
                    <button type="button" onClick={() => setFormData(p => ({ ...p, tickets: p.tickets.filter((_, i) => i !== idx) }))} className="p-3.5 text-slate-300 hover:text-rose-500 transition-colors">
                      <MinusCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  <Plus className="w-3 h-3 text-indigo-500" /> 입금/예매 링크 (URL)
                </label>
                <input
                  type="url"
                  name="paymentLink"
                  value={formData.paymentLink}
                  onChange={handleChange}
                  placeholder="https://forms.gle/... 또는 카카오톡 오픈채팅"
                  className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-5 py-3.5 text-sm font-bold text-indigo-600 dark:text-indigo-400 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
              
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  <Music className="w-3 h-3 text-red-500" /> 유튜브 홍보 영상 (URL)
                </label>
                <input
                  type="url"
                  name="youtubeUrl"
                  value={formData.youtubeUrl}
                  onChange={handleChange}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-5 py-3.5 text-sm font-bold text-red-600 dark:text-red-400 outline-none focus:ring-4 focus:ring-red-500/10 transition-all"
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  <CreditCard className="w-3 h-3" /> 입금 정보 (계좌번호 등)
                </label>
                <input
                  type="text"
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  placeholder="예: 우리은행 1002-xxx (홍길동)"
                  className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-5 py-3.5 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Attendees */}
          <div className="space-y-4">
            <label className="block text-[13px] font-bold text-slate-400 uppercase tracking-widest ml-1">인원 제한</label>
            <div className="flex items-center gap-6 p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <div className="flex-1">
                <input 
                  type="range" 
                  min="1" 
                  max="500" 
                  step="10" 
                  name="maxAttendees" 
                  value={formData.maxAttendees} 
                  onChange={handleChange} 
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                />
              </div>
              <div className="w-24 text-center">
                <span className="text-2xl font-black text-slate-800 dark:text-white">{formData.maxAttendees}</span>
                <span className="text-[10px] font-black text-slate-400 ml-1">명</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 ml-1">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">상세 내용</span>
            </div>
            <textarea 
              required 
              rows={6} 
              name="description" 
              value={formData.description} 
              onChange={(e) => {
                handleChange(e);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }} 
              className="w-full rounded-[32px] border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 px-8 py-6 text-[15px] font-medium leading-relaxed text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-y min-h-[150px] shadow-inner" 
              placeholder="행사의 상세 커리큘럼, 일정, 환불 규정 등 상세 내용을 자유롭게 작성해주세요." 
            />
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
           <button 
             type="button" 
             onClick={handleDelete} 
             className="px-8 py-4 rounded-2xl text-[15px] font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
           >
             삭제하기
           </button>
           <div className="flex gap-4">
             <button type="button" onClick={() => navigate(-1)} className="px-8 py-4 rounded-2xl text-[15px] font-black text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">취소하기</button>
             <button 
                type="submit" 
                disabled={submitting} 
                className="group relative px-12 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 opacity-0 group-hover:opacity-10 transition-opacity" />
                {submitting ? '저장 중...' : '수정 완료'}
              </button>
           </div>
        </div>
      }
    />
  );
}
