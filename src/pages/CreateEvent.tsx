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
    if (place.addressComponents) {
      place.addressComponents.forEach((component: any) => {
        if (component.types.includes('country')) country = component.shortText || component.short_name;
        if (component.types.includes('locality')) city = component.longText || component.long_name;
        else if (component.types.includes('administrative_area_level_1') && !city) city = component.longText || component.long_name;
      });
    }

    setFormData(prev => ({
      ...prev,
      locationName: place.displayName || place.name || place.formattedAddress || place.formatted_address || prev.locationName,
      formattedAddress: place.formattedAddress || place.formatted_address || '',
      country: country,
      city: city,
      geoPoint: place.location ? {
        lat: typeof place.location.lat === 'function' ? place.location.lat() : place.location.lat,
        lng: typeof place.location.lng === 'function' ? place.location.lng() : place.location.lng
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

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash", // Updated to latest stable flash model
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
    } catch(err) {
      console.error('AI Analysis failed:', err);
      alert('AI 분석 중 오류가 발생했습니다.');
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
      const startDate = new Date(`${formData.date}T${formData.time}`);
      const endDate = new Date(`${formData.endDate || formData.date}T${formData.endTime || '23:59'}`);

      // Basic Date Validations
      const now = new Date();
      if (startDate < now) {
        alert("시작 시간은 현재보다 과거일 수 없습니다.");
        setLoading(false);
        return;
      }
      // Note: We skip the endDate <= startDate check if someone is just filling it out
      
      // We maintain imageUrl for backwards compatibility, using the selected cover image.
      const mainImageUrl = images.length > 0 ? images[coverImageIndex] : formData.imageUrl;

      // Check approval setting
      const { data: configData } = await supabase.from('settings').select('value').eq('key', 'app_config').maybeSingle();
      const approvalMode = (configData?.value as any)?.approvalMode || 'manual';
      const initialStatus = approvalMode === 'auto' ? 'published' : 'pending';

      // 1. Point check and deduction
      const { data: pointConfig } = await supabase.from('settings').select('value').eq('key', 'point_policies').maybeSingle();
      const policies = { ...DEFAULT_POINT_POLICIES, ...(pointConfig?.value || {}) };
      const cost = formData.isLesson ? (policies.lesson_registration_cost || 0) : (policies.party_registration_cost || 0);

      if (cost > 0) {
        const pointResult = await spendPoints(user.id, cost, formData.isLesson ? '강습 등록 포인트 차감' : '파티 등록 포인트 차감');
        if (!pointResult.success) {
          alert('포인트가 부족하거나 처리 중 오류가 발생했습니다.');
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from('events')
        .insert({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          location_name: formData.locationName,
          image_url: mainImageUrl, 
          host_id: user.id,
          status: initialStatus,
          is_lesson: formData.isLesson,
          max_attendees: Number(formData.maxAttendees),
          metadata: {
            endDate: endDate.toISOString(),
            formattedAddress: formData.formattedAddress,
            city: formData.city,
            country: formData.country,
            geoPoint: formData.geoPoint,
            djs: formData.djs.filter(d => d.trim()),
            performances: formData.performances.filter(p => p.trim()),
            media: formData.media.filter(m => m.trim()),
            tickets: formData.tickets.filter(t => t.name.trim()),
            paymentMethod: formData.paymentMethod,
            maxAttendees: Number(formData.maxAttendees)
          }
        });

      if (error) throw error;
      
      navigate('/');
    } catch (err) {
      handleSupabaseError(err, 'create', 'events', user?.id || '');
      alert(`행사 생성 중 오류가 발생했습니다.`);
    } finally {
      setLoading(false);
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
    <div className="max-w-[1000px] mx-auto glass-panel rounded-[24px] p-8 md:p-12 lg:p-16 transition-colors duration-200">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            새로운 행사 만들기
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">입력폼을 작성하거나 행사 포스터를 업로드해보세요.</p>
        </div>
        
        <div className="shrink-0">
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
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold shadow-md shadow-indigo-200/50 dark:shadow-none transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {aiLoading ? (
              <div className="w-5 h-5 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            {aiLoading ? 'AI가 정보 추출 중...' : '포스터로 양식 자동 채우기'}
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Title */}
        <div>
          <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2">행사 이름</label>
          <input
            required
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full rounded-[10px] border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 px-4 py-3 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            placeholder="예: 2026 프론트엔드 개발자 컨퍼런스"
          />
        </div>

        {/* Category & Attendees */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
             <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2">카테고리</label>
             <select
               name="category"
               value={formData.category}
               onChange={handleChange}
               className="w-full rounded-[10px] border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 px-4 py-3 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
             >
               <option value="salsa">살사 (Salsa)</option>
               <option value="bachata">바차타 (Bachata)</option>
               <option value="kizomba">키좀바 (Kizomba)</option>
               <option value="salsa_bachata">살사/바차타 (Salsa/Bachata)</option>
               <option value="sal_ba_ki">살바키 (Sal-Ba-Ki)</option>
             </select>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center"><Users className="w-4 h-4 mr-1 text-slate-400 dark:text-slate-500"/> 최대 모집 인원</label>
            <input
              required
              type="number"
              name="maxAttendees"
              min="1"
              value={formData.maxAttendees}
              onChange={handleChange}
              className="w-full rounded-[10px] border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 px-4 py-3 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center"><Calendar className="w-4 h-4 mr-1 text-slate-400 dark:text-slate-500"/> 시작 날짜</label>
            <input
              required
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full rounded-[10px] border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 px-4 py-3 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center"><Clock className="w-4 h-4 mr-1 text-slate-400 dark:text-slate-500"/> 시작 시간</label>
            <input
              required
              type="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              className="w-full rounded-[10px] border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 px-4 py-3 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center"><Calendar className="w-4 h-4 mr-1 text-slate-400 dark:text-slate-500"/> 종료 날짜</label>
            <input
              required
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className="w-full rounded-[10px] border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 px-4 py-3 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center"><Clock className="w-4 h-4 mr-1 text-slate-400 dark:text-slate-500"/> 종료 시간</label>
            <input
              required
              type="time"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              className="w-full rounded-[10px] border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 px-4 py-3 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
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

          {/* Photo/Video (Media Team) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 flex items-center"><ImageIcon className="w-4 h-4 mr-2 text-indigo-500"/> 포토 / 영상 (미디어 팀)</label>
              <button 
                type="button" 
                onClick={addMedia}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
              >
                <PlusCircle className="w-3.5 h-3.5" /> 추가하기
              </button>
            </div>
            <div className="space-y-3">
              {formData.media.map((person, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={person}
                    onChange={(e) => updateMedia(idx, e.target.value)}
                    placeholder="미디어팀 전문가 이름을 입력하세요"
                    className="flex-1 rounded-[10px] border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button type="button" onClick={() => removeMedia(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                    <MinusCircle className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {formData.media.length === 0 && (
                <p className="text-xs text-slate-400 italic">등록된 미디어 정보가 없습니다.</p>
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

        {/* Payment Method / Deposit Account */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center">
            <CreditCard className="w-4 h-4 mr-2 text-indigo-500"/> 입금계좌 또는 입금방법
          </label>
          <textarea
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleChange}
            rows={2}
            className="w-full rounded-[10px] border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 px-4 py-3 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow resize-none"
            placeholder="예: 신한은행 110-123-456789 홍길동 / 입금 후 문자로 성함 보내주세요"
          />
          <p className="mt-2 text-[11px] text-slate-500">예매 시 사용자에게 노출되는 입금 안내 정보입니다.</p>
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
          {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY || loadError ? (
            <div className="space-y-3">
              <input
                required
                type="text"
                name="locationName"
                value={formData.locationName}
                onChange={handleChange}
                className="w-full rounded-[10px] border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 px-4 py-3 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
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
            />
          ) : (
            <div className="w-full h-11 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[10px]"></div>
          )}
          {formData.formattedAddress && (
            <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
              상세주소: {formData.formattedAddress} {formData.city && `(${formData.city}, ${formData.country})`}
            </p>
          )}
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
            <span className="flex items-center"><ImageIcon className="w-4 h-4 mr-1 text-slate-400 dark:text-slate-500"/> 행사 이미지 (선택)</span>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{images.length} / 3 장</span>
          </label>
          
          <div 
            className={clsx(
              "w-full rounded-2xl border-2 border-dashed transition-all p-6 text-center",
              dragActive 
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" 
                : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700">
                  <Upload className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                </div>
                <div>
                  <button type="button" onClick={() => multiFileInputRef.current?.click()} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">이미지 선택</button>
                  <span className="text-slate-500 dark:text-slate-400 text-sm"> 하거나 이 곳에 끌어다 놓으세요.</span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">최대 3장 업로드 가능 (메인 1장, 서브 2장)</p>
              </div>
            ) : (
               <div className="text-slate-500 dark:text-slate-400 text-sm py-4">
                 최대 개수(3장)의 이미지가 등록되었습니다.
               </div>
            )}
          </div>

          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {images.map((imgUrl, index) => (
                <div key={index} className={clsx(
                    "relative aspect-video sm:aspect-square md:aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all",
                    coverImageIndex === index ? "border-indigo-500 shadow-md" : "border-slate-200 dark:border-slate-700"
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

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="block text-[12px] font-bold text-slate-500 mb-2">또는 이미지 링크 직접 입력</span>
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              className="w-full rounded-[10px] border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 px-4 py-3 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center"><FileText className="w-4 h-4 mr-1 text-slate-400 dark:text-slate-500"/> 상세 설명</label>
          <textarea
            required
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={5}
            className="w-full rounded-[10px] border-slate-200 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 px-4 py-3 text-[14px] text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow resize-none"
            placeholder="행사에 대한 자세한 소개를 적어주세요."
          ></textarea>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-[10px] text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 rounded-[10px] bg-indigo-600 text-white font-bold shadow-sm hover:bg-indigo-700 hover:shadow-md transition-all disabled:opacity-50"
          >
            {loading ? '등록 중...' : '행사 등록하기'}
          </button>
        </div>
      </form>
    </div>
  );
}
