import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { handleSupabaseError } from '../lib/supabaseError';
import PlaceSearch from '../components/PlaceSearch';
import { Calendar, Clock, MapPin, Users, FileText, Sparkles, Upload, X, Star, ImageIcon as ImageIcon, PlusCircle, MinusCircle, Music, Mic2, CreditCard, Plus } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { useAuth } from '../context/AuthContext';
import { useGoogleMaps } from '../context/GoogleMapsContext';
import { spendPoints, DEFAULT_POINT_POLICIES } from '../lib/points';
import clsx from 'clsx';

export default function CreateEvent() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'party',
    date: '',
    time: '',
    endDate: '', // will just duplicate date for MVP
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
    isLesson: false,
  });

  const { isLoaded, loadError } = useGoogleMaps();

  const [images, setImages] = useState<string[]>([]);
  const [coverImageIndex, setCoverImageIndex] = useState<number>(0);
  const [dragActive, setDragActive] = useState(false);

  const handlePlaceSelect = (place: any) => {
    if (!place) return;
    
    let city = '';
    let country = '';
    
    // Address components mapping for new Places library might be different or similar
    // The web component might return a Place instance or a plain object
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

  const handleAiAnalyze = async (file: File) => {
    setAiLoading(true);
    try {
      const dataUrl = await resizeAndCompressImage(file);
      const base64Data = dataUrl.split(',')[1];
      const mimeType = 'image/webp';

      let apiKey = process.env.GEMINI_API_KEY;

      if (user) {
        const { data: aiConfig } = await supabase
          .from('user_ai_configs')
          .select('api_key')
          .eq('user_id', user.id)
          .eq('provider', 'google')
          .maybeSingle();

        if (aiConfig?.api_key) {
          apiKey = aiConfig.api_key;
        }
      }

      if (!apiKey) {
        throw new Error('GEMINI_API_KEY_MISSING');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          "Extract event information from this dance poster. Strictly follow the JSON schema. Use one of these categories: 'salsa', 'bachata', 'kizomba', 'salsa_bachata', 'sal_ba_ki', 'party', 'lesson'. If info is missing, leave empty string. For dates use YYYY-MM-DD. For times use 24h format HH:mm. For locationName, extract the venue name. For formattedAddress, extract the official address. For city, extract the city name (e.g., Seoul)., For country, use 2-letter code (e.g., KR)."
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Event title" },
              description: { type: Type.STRING, description: "Event detailed description" },
              category: { type: Type.STRING, description: "Category of the event (salsa, bachata, kizomba, salsa_bachata, sal_ba_ki, party, lesson)" },
              date: { type: Type.STRING, description: "Event start date in YYYY-MM-DD format" },
              time: { type: Type.STRING, description: "Event start time in 24h HH:mm format" },
              endDate: { type: Type.STRING, description: "Event end date in YYYY-MM-DD format" },
              endTime: { type: Type.STRING, description: "Event end time in 24h HH:mm format" },
              locationName: { type: Type.STRING, description: "Location name or building name" },
              formattedAddress: { type: Type.STRING, description: "Full official address (Road name address preferred)" },
              city: { type: Type.STRING, description: "City name in English, e.g. Seoul, Tokyo" },
              country: { type: Type.STRING, description: "2-letter Country code, e.g. KR, JP, SG" },
              maxAttendees: { type: Type.INTEGER, description: "Maximum number of attendees, fallback to 50" }
            },
            required: ["title", "description", "category", "date", "time", "endDate", "endTime", "locationName", "maxAttendees"]
          }
        }
      });
      
      if (response.text) {
        const parsed = JSON.parse(response.text);
        const validCategories = ['salsa', 'bachata', 'kizomba', 'salsa_bachata', 'sal_ba_ki', 'party', 'lesson'];
        setFormData(prev => ({
           ...prev,
           title: parsed.title || prev.title,
           description: parsed.description || prev.description,
           category: validCategories.includes(parsed.category) ? parsed.category : 'party',
           date: parsed.date || prev.date,
           time: parsed.time || prev.time,
           endDate: parsed.endDate || prev.endDate,
           endTime: parsed.endTime || prev.endTime,
           locationName: parsed.locationName || prev.locationName,
           formattedAddress: parsed.formattedAddress || prev.formattedAddress,
           city: parsed.city || prev.city,
           country: parsed.country || prev.country,
           maxAttendees: parsed.maxAttendees || prev.maxAttendees
        }));
      }
    } catch(err: any) {
      console.error('AI Analysis failed:', err);
      if (err.message?.includes('GEMINI_API_KEY') || err.message?.includes('GEMINI_API_KEY_MISSING')) {
        alert('AI 분석을 위해 API 키가 필요합니다. 환경설정(AI API 설정)에서 Google API 키를 등록해주세요.');
      } else if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED') || err.message?.includes('spending cap')) {
        alert('사용 중인 AI API 키의 한도가 초과되었습니다. (설정 탭)에서 본인의 API 키를 직접 등록하여 사용해주세요.');
      } else {
        alert('AI 분석 중 오류가 발생했습니다: ' + (err.message || '알 수 없는 오류'));
      }
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
    const availableSlots = 3 - images.length;
    if (availableSlots <= 0) {
      alert("최대 3장의 이미지만 등록할 수 있습니다.");
      return;
    }

    const filesToProcess = fileArray.slice(0, availableSlots);
    
    try {
      setLoading(true);
      const newImages = await Promise.all(filesToProcess.map(resizeAndCompressImage));
      setImages(prev => [...prev, ...newImages]);
    } catch (error) {
      console.error("Image loading failed: ", error);
      alert("이미지를 처리하는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
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
    if (!user || !profile) return;
    
    setLoading(true);
    try {
      if (!profile?.isApproved && profile?.role !== 'admin' && profile?.role !== 'host') {
        alert('전문가 승인이 완료된 후 행사를 등록하실 수 있습니다.');
        setLoading(false);
        return;
      }

      // Check if place exists, if not add as pending
      const { data: existingPlaces } = await supabase
        .from('places')
        .select('*')
        .eq('name', formData.locationName)
        .eq('address', formData.formattedAddress)
        .maybeSingle();

      if (!existingPlaces) {
        await supabase.from('places').insert({
          name: formData.locationName,
          address: formData.formattedAddress,
          country: formData.country,
          is_approved: false // New place is not approved until admin approval
        });
      }

      const startDate = new Date(`${formData.date}T${formData.time}`);
      const endDate = new Date(`${formData.endDate || formData.date}T${formData.endTime || '23:59'}`);

      // Basic Date Validations
      const now = new Date();
      if (startDate < now) {
        alert("시작 시간은 현재보다 과거일 수 없습니다.");
        setLoading(false);
        return;
      }
      
      const mainImageUrl = images.length > 0 ? images[coverImageIndex] : formData.imageUrl;

      const { data: configData } = await supabase.from('settings').select('value').eq('key', 'app_config').maybeSingle();
      const approvalMode = (configData?.value as any)?.approvalMode || 'manual';
      const initialStatus = approvalMode === 'auto' ? 'published' : 'pending';

      const { data: pointConfig } = await supabase.from('settings').select('value').eq('key', 'point_policies').maybeSingle();
      const policies = { ...DEFAULT_POINT_POLICIES, ...(pointConfig?.value || {}) };
      
      const cost = policies.party_registration_cost || 0;

      if (cost > 0) {
        const pointResult = await spendPoints(user.id, cost, '파티 등록 포인트 차감');
        if (!pointResult.success) {
          alert('포인트가 부족하거나 처리 중 오류가 발생했습니다.');
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('parties')
        .insert({
          title: formData.title,
          description: formData.description,
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
          host_id: user.id,
          status: initialStatus,
          max_attendees: Number(formData.maxAttendees),
          price: formData.tickets[0]?.price || 0,
          djs: formData.djs.filter(d => d.trim()),
          performances: formData.performances.filter(p => p.trim()),
          media: formData.media.filter(m => m.trim()),
          tickets: formData.tickets.filter(t => t.name.trim()),
          payment_method: formData.paymentMethod
        });

      if (error) throw error;
      
      navigate('/');
    } catch (err) {
      handleSupabaseError(err, 'create', 'parties', user?.id || '');
      alert(`등록 중 오류가 발생했습니다.`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'category') {
        const isLessonCategory = value === 'lesson' || value.includes('lesson');
        newData.isLesson = isLessonCategory;
      }
      return newData;
    });
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

  if (loading && !aiLoading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  if (loadError) {
    return (
      <div className="max-w-[1000px] mx-auto p-10 text-center">
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-8 rounded-3xl">
          <MapPin className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">지도를 불러올 수 없습니다</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Google Maps API 설정에 문제가 있거나 네트워크 오류가 발생했습니다.<br />
            설정에서 API 키를 확인해주세요.
          </p>
          <button onClick={() => navigate(-1)} className="px-6 py-2 bg-slate-800 text-white font-bold rounded-xl">뒤로 가기</button>
        </div>
      </div>
    );
  }

  if (!user || !['admin', 'host', 'dj', 'instructor', 'media'].includes(profile?.role || '')) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-800">접근 권한이 없습니다</h2>
        <p className="text-slate-500 mt-2">행사 주최자 또는 전문가 계정만 접근할 수 있습니다.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-indigo-600 font-bold hover:text-indigo-700 transition-colors">메인으로 돌아가기</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 pb-24 md:pb-12">
      <div className="max-w-[800px] mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="flex flex-col gap-6 mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="animate-in fade-in slide-in-from-top-4 duration-700">
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
                새로운 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">행사 만들기</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">행사 정보를 입력하거나 AI로 포스터를 분석해보세요.</p>
            </div>
            
            <div className="shrink-0 animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleAiInputClick} 
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={aiLoading}
                className="w-full md:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black shadow-2xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-70 group"
              >
                {aiLoading ? (
                  <div className="w-5 h-5 border-3 border-white/30 dark:border-slate-900/30 border-t-white dark:border-t-slate-900 rounded-full animate-spin"></div>
                ) : (
                  <Sparkles className="w-5 h-5 text-indigo-400 dark:text-indigo-500 group-hover:animate-pulse" />
                )}
                {aiLoading ? 'AI가 분석 중...' : '포스터로 자동 완성'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/50 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <form onSubmit={handleSubmit} id="create-event-form" className="p-8 md:p-12 space-y-16">
            
            {/* Basic Info Section */}
            <section className="space-y-10">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <FileText className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">기본 정보</h2>
              </div>

              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-slate-400 uppercase tracking-widest ml-1">행사 이름</label>
                  <input
                    required
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full rounded-[24px] border-none bg-slate-50 dark:bg-slate-800/50 px-8 py-6 text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-inner"
                    placeholder="매력적인 행사 제목을 입력하세요"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-[13px] font-bold text-slate-400 uppercase tracking-widest ml-1">카테고리</label>
                    <div className="relative">
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full appearance-none rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6 py-4 text-[15px] font-bold text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all cursor-pointer"
                      >
                        <option value="salsa">살사 (Salsa)</option>
                        <option value="bachata">바차타 (Bachata)</option>
                        <option value="kizomba">키좀바 (Kizomba)</option>
                        <option value="salsa_bachata">살사/바차타 (Salsa/Bachata)</option>
                        <option value="sal_ba_ki">살바키 (Sal-Ba-Ki)</option>
                        <option value="party">파티 (Party)</option>
                        <option value="lesson">강습 (Lesson)</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Plus className="w-4 h-4 rotate-45" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[13px] font-bold text-slate-400 uppercase tracking-widest ml-1">최대 인원</label>
                    <div className="relative">
                      <input
                        required
                        type="number"
                        name="maxAttendees"
                        min="1"
                        value={formData.maxAttendees}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6 py-4 text-[15px] font-bold text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                      />
                      <Users className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Date & Time Section */}
            <section className="space-y-10">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Calendar className="w-5 h-5 text-rose-500" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">일정 정보</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                {/* Start Date/Time */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">행사 시작</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 ml-1">날짜</label>
                      <input
                        required
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-4 text-[14px] font-bold text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 ml-1">시간</label>
                      <input
                        required
                        type="time"
                        name="time"
                        value={formData.time}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-4 text-[14px] font-bold text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* End Date/Time */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">행사 종료</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 ml-1">날짜</label>
                      <input
                        required
                        type="date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-4 text-[14px] font-bold text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 ml-1">시간</label>
                      <input
                        required
                        type="time"
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-4 text-[14px] font-bold text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Detail Info Section */}
            <section className="space-y-12">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">세부 출연진 및 티켓</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
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
                        <p className="text-xs font-bold italic tracking-tighter">등록된 DJ 정보가 없습니다.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Performances */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[14px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Mic2 className="w-4 h-4 text-rose-500" /> 공연팀
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
                          placeholder="공연팀 또는 아티스트"
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
                        <p className="text-xs font-bold italic tracking-tighter">등록된 공연 정보가 없습니다.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Media */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[14px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-blue-500" /> 미디어
                    </label>
                    <button 
                      type="button" 
                      onClick={addMedia}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-[11px] font-black uppercase tracking-wider hover:bg-blue-100 transition-colors"
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
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-4 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none shadow-sm"
                    placeholder="예: 우리은행 1002-123-456789 홍길동 / 입금 후 성함 문자로 보내주세요."
                  />
                  <p className="mt-2 text-[11px] text-slate-500 italic">※ 예매 시 사용자에게 노출되는 입금 안내 정보입니다.</p>
                </div>

                <div className="space-y-4">
                  <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                    <span className="flex items-center"><MapPin className="w-4 h-4 mr-1 text-slate-400 dark:text-slate-500"/> 장소</span>
                    {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
                      <span className="text-[11px] text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-100 italic">
                        자동 완성 비활성 (API 키 없음)
                      </span>
                    )}
                  </label>
                  {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY || loadError ? (
                    <div className="space-y-3">
                      <input
                        required
                        type="text"
                        name="locationName"
                        value={formData.locationName}
                        onChange={handleChange}
                        className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6 py-4 text-[15px] font-bold text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                        placeholder="장소 명칭 또는 주소를 직접 입력해주세요"
                      />
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        {loadError ? (
                          <div className="text-rose-500 space-y-2">
                             <p className="font-bold flex items-center gap-1.5"><X className="w-3.5 h-3.5"/> 구글 맵 로드 오류</p>
                             <p className="font-mono text-[10px] bg-rose-50 dark:bg-rose-900/20 p-2 rounded">{loadError.message}</p>
                             <p className="text-slate-500 dark:text-slate-400 font-normal">
                               <b>RefererNotAllowedMapError</b>가 발생했다면 아래 주소를 구글 콘솔의 <b>HTTP 리퍼러</b> 목록에 추가하세요:
                               <code className="block mt-1 bg-slate-100 dark:bg-slate-700 p-1 rounded break-all">{window.location.origin}/*</code>
                             </p>
                          </div>
                        ) : (
                          <>
                            💡 <b>Settings &gt; Secrets</b>에서 <code className="text-indigo-500 font-bold">VITE_GOOGLE_MAPS_API_KEY</code>를 등록해주세요.<br/>
                            * <b>필수 활성화 API:</b> Maps JavaScript API, Places API
                          </>
                        )}
                      </div>
                    </div>
                  ) : isLoaded ? (
                    <PlaceSearch 
                      onPlaceSelect={handlePlaceSelect}
                      onInputChange={(val) => setFormData(prev => ({ ...prev, locationName: val }))}
                      placeholder="예: 강남역 쌍용플래티넘"
                      value={formData.locationName}
                    />
                  ) : (
                    <div className="w-full h-14 bg-slate-50 dark:bg-slate-800/50 animate-pulse rounded-2xl border border-slate-100 dark:border-slate-800"></div>
                  )}
                  {formData.formattedAddress && (
                    <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 px-1 font-medium">
                      <MapPin className="w-3.5 h-3.5" /> 주소: {formData.formattedAddress} {formData.city && `(${formData.city}, ${formData.country})`}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Image Gallery Section */}
            <section className="space-y-8">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <ImageIcon className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">포스터 및 사진</h2>
              </div>
              
              <div className="space-y-6">
                {images.length < 3 && (
                  <div 
                    className={clsx(
                      "w-full rounded-[32px] border-3 border-dashed transition-all p-10 text-center cursor-pointer group",
                      dragActive 
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10" 
                        : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-400"
                    )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => multiFileInputRef.current?.click()}
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
                        <p className="text-slate-400 text-sm font-medium">최대 3장까지 등록 가능합니다.</p>
                      </div>
                    </div>
                  </div>
                )}

                {images.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
                    {images.map((imgUrl, index) => (
                      <div key={index} className={clsx(
                          "group relative aspect-square rounded-[32px] overflow-hidden border-4 transition-all duration-300",
                          coverImageIndex === index ? "border-indigo-500 shadow-2xl scale-100 ring-8 ring-indigo-500/10" : "border-white dark:border-slate-800 scale-95 hover:scale-100 shadow-sm"
                        )}>
                        <img src={imgUrl} alt={`Uploaded ${index}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-2">
                          {coverImageIndex !== index && (
                            <button 
                              type="button" 
                              onClick={(e) => { e.stopPropagation(); setCoverImageIndex(index); }}
                              className="px-4 py-2 bg-white text-indigo-600 rounded-xl text-xs font-black shadow-xl hover:bg-indigo-50 transition-all flex items-center gap-1.5"
                            >
                              <Star className="w-3.5 h-3.5 fill-indigo-600" /> 대표로 설정
                            </button>
                          )}
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                            className="p-2 bg-rose-500 text-white rounded-xl shadow-xl hover:bg-rose-600 transition-all"
                            title="삭제"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        
                        {coverImageIndex === index && (
                          <div className="absolute top-4 left-4 px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg border border-white/20">
                            MAIN POSTER
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
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">행사 상세 내용</h2>
              </div>
              <textarea
                required
                name="description"
                value={formData.description}
                onChange={(e) => {
                  handleChange(e);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                rows={12}
                className="w-full rounded-[32px] border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-8 py-8 text-[15px] leading-relaxed text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/50 outline-none transition-all resize-none shadow-inner font-medium placeholder:text-slate-300"
                placeholder="일정, 프로그램, 특별 혜택 등 행사에 대해 자세히 알려주세요."
              />
            </section>

            {/* Desktop Actions */}
            <div className="hidden md:flex gap-6 pt-12 border-t border-slate-100 dark:border-slate-800 justify-end">
              <button 
                type="button" 
                onClick={() => navigate(-1)} 
                className="px-10 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="px-16 py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-2xl shadow-indigo-600/40 hover:bg-indigo-700 hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? '등록 중...' : '행사 등록하기'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sticky Mobile Actions */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border-t border-slate-100 dark:border-slate-800 z-50 flex gap-3">
        <button 
          type="button" 
          onClick={() => navigate(-1)} 
          className="w-16 h-16 bg-slate-100 dark:bg-slate-800/50 text-slate-500 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700"
        >
          <X className="w-7 h-7" />
        </button>
        <button 
          type="submit" 
          form="create-event-form"
          disabled={loading}
          className="flex-1 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <span className="text-lg">행사 등록 완료</span>
          )}
        </button>
      </div>
    </div>
  );
}
