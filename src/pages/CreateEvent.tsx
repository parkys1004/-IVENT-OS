import React, { useState, useRef } from 'react';
import DatePicker from 'react-datepicker';
import { useNavigate } from 'react-router-dom';
import 'react-datepicker/dist/react-datepicker.css';
import { supabase } from '../supabase';
import { handleSupabaseError } from '../lib/supabaseError';
import PlaceSearch from '../components/PlaceSearch';
import { Calendar, Clock, MapPin, Users, FileText, Sparkles, Upload, X, Star, ImageIcon as ImageIcon, PlusCircle, MinusCircle, Music, Mic2, CreditCard, Plus } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { useAuth } from '../context/AuthContext';
import { useGoogleMaps } from '../context/GoogleMapsContext';
import { spendPoints, DEFAULT_POINT_POLICIES } from '../lib/points';
import clsx from 'clsx';
import { uploadImageToStorage, compressImageToDataUrl } from '../lib/storage';

import { EventFormLayout } from '../components/events/EventFormLayout';

export default function CreateEvent() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);
  
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

  const handleAiAnalyze = async (file: File) => {
    setAiLoading(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
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
    const availableSlots = 5 - images.length;
    if (availableSlots <= 0) {
      alert("최대 5장의 이미지만 등록할 수 있습니다.");
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
      setLoading(true);
      const newImageUrls = await Promise.all(filesToProcess.map(f => uploadImageToStorage(f, 'events')));
      setImages(prev => [...prev, ...newImageUrls]);
    } catch (error) {
      console.error("Image upload failed: ", error);
      alert("이미지를 업로드하는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      if (multiFileInputRef.current) multiFileInputRef.current.value = '';
    }
  };

  const [videoUrl, setVideoUrl] = useState('');

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
          is_approved: false
        });
      }

      const startDate = new Date(`${formData.date}T${formData.time}`);
      const endDate = new Date(`${formData.endDate || formData.date}T${formData.endTime || '23:59'}`);

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

      const finalDescription = videoUrl.trim() ? `${formData.description}\n\n${videoUrl}` : formData.description;

      const { error } = await supabase
        .from('parties')
        .insert({
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
          host_id: user.id,
          status: initialStatus,
          max_attendees: Number(formData.maxAttendees),
          price: formData.tickets[0]?.price || 0,
          djs: formData.djs.filter(d => d.trim()),
          performances: formData.performances.filter(p => p.trim()),
          media: images,
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
    <EventFormLayout
      title="새로운 행사 만들기"
      subtitle="성공적인 행사의 시작, 정보를 입력해주세요."
      aiLoading={aiLoading}
      onAiAnalyzeClick={() => fileInputRef.current?.click()}
      leftColumn={
        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleAiInputClick} 
          />
          {/* 포스터 이미지 업로드 */}
          <section className="bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">포스터 이미지</h2>
            </div>

            <div className="space-y-6">
              <div 
                className={clsx(
                  "relative group cursor-pointer transition-all duration-300",
                  "aspect-[3/4] rounded-[24px] overflow-hidden border-2 border-dashed",
                  dragActive 
                    ? "border-indigo-500 bg-indigo-50/50" 
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-inner"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => multiFileInputRef.current?.click()}
              >
                {images.length > 0 ? (
                  <>
                    <img 
                      src={images[coverImageIndex]} 
                      alt="Cover" 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                    <div className="absolute bottom-4 left-4 right-4 text-center">
                       <span className="text-white text-xs font-black uppercase tracking-widest bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">메인 커버 이미지</span>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <Upload className="w-12 h-12 text-slate-300 mb-4 group-hover:scale-110 transition-transform" />
                    <p className="text-slate-500 font-bold text-sm">클릭하거나 이미지를 드래그<br/>(최대 5장)</p>
                  </div>
                )}
              </div>
              
              {images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 px-1">
                  {images.map((img, idx) => (
                    <div 
                      key={idx}
                      className={clsx(
                        "relative flex-shrink-0 w-16 h-20 rounded-xl overflow-hidden border-2 cursor-pointer transition-all",
                        coverImageIndex === idx ? "border-indigo-500 scale-105" : "border-transparent opacity-60"
                      )}
                      onClick={() => setCoverImageIndex(idx)}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 text-white rounded-full"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              className="hidden" 
              ref={multiFileInputRef} 
              onChange={(e) => e.target.files && handleImageUpload(e.target.files)} 
            />
          </section>

          {/* 행사 이름 & 장소 */}
          <section className="bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">기본 정보</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">행사 이름</label>
                <input
                  required
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 px-6 py-4 text-lg font-black text-slate-800 dark:text-slate-100 placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                  placeholder="예: 강남 살사 파티"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">장소 검색</label>
                {isLoaded ? (
                  <PlaceSearch 
                    onPlaceSelect={handlePlaceSelect} 
                    defaultValue={formData.locationName}
                  />
                ) : (
                  <div className="w-full h-14 bg-white dark:bg-slate-800 rounded-2xl animate-pulse" />
                )}
                {formData.formattedAddress && (
                  <p className="mt-2 px-4 py-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl text-xs font-bold text-slate-500 flex items-center gap-2">
                    <MapPin className="w-3 h-3" /> {formData.formattedAddress}
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      }
      rightColumn={
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
          {/* 카테고리 & 인원 & 일정 */}
          <section className="bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">카테고리</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full appearance-none rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 px-5 py-3 text-[14px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
                  >
                    <option value="party">파티 (Party)</option>
                    <option value="salsa">살사 (Salsa)</option>
                    <option value="bachata">바차타 (Bachata)</option>
                    <option value="kizomba">키좀바 (Kizomba)</option>
                    <option value="salsa_bachata">살사/바차타 (Salsa/Bachata)</option>
                    <option value="sal_ba_ki">살바키 (Sal-Ba-Ki)</option>
                    <option value="lesson">강습 (Lesson)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">최대 인원</label>
                  <input
                    required
                    type="number"
                    name="maxAttendees"
                    min="1"
                    value={formData.maxAttendees}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 px-5 py-3 text-[14px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
             </div>

             <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-rose-500" />
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">행사 일정</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <DatePicker
                    selected={formData.date ? new Date(formData.date) : null}
                    onChange={(date: Date | null) => 
                      handleChange({ target: { name: 'date', value: date ? date.toISOString().split('T')[0] : '' } } as any)
                    }
                    dateFormat="yyyy-MM-dd"
                    className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3 text-[13px] font-bold"
                    placeholderText="시작 일자"
                  />
                  <DatePicker
                    selected={formData.time ? new Date(`1970-01-01T${formData.time}`) : null}
                    onChange={(time: Date | null) => 
                      handleChange({ target: { name: 'time', value: time ? time.toTimeString().substring(0, 5) : '' } } as any)
                    }
                    showTimeSelect
                    showTimeSelectOnly
                    timeIntervals={15}
                    timeCaption="Time"
                    dateFormat="HH:mm"
                    className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3 text-[13px] font-bold"
                    placeholderText="시작 시간"
                  />
                </div>
             </div>
          </section>

          {/* 상세 설명 */}
          <section className="bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">행사 상세 설명</h2>
            </div>
            <textarea
              required
              rows={8}
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full rounded-[24px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 px-6 py-4 text-[14px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-inner"
              placeholder="행사 상세 내용을 입력해주세요."
            />
          </section>

          {/* 티켓 구성 */}
          <section className="bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">티켓 정보</h2>
              </div>
              <button 
                type="button" 
                onClick={addTicket}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-black uppercase"
              >
                + 추가
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.tickets.map((ticket, idx) => (
                <div key={idx} className="flex gap-3 items-end group animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex-[2] space-y-1">
                    <input
                      type="text"
                      value={ticket.name}
                      onChange={(e) => updateTicket(idx, 'name', e.target.value)}
                      placeholder="티켓 이름"
                      className="w-full rounded-xl border border-slate-100 bg-white px-4 py-2.5 text-[13px] font-bold outline-none"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="number"
                      value={ticket.price}
                      onChange={(e) => updateTicket(idx, 'price', Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-100 bg-white px-4 py-2.5 text-[13px] font-black text-right outline-none"
                    />
                  </div>
                  {formData.tickets.length > 1 && (
                    <button type="button" onClick={() => removeTicket(idx)} className="p-2.5 text-slate-300 hover:text-rose-500 transition-colors">
                      <MinusCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      }
      footer={
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-8 py-4 rounded-[20px] text-[15px] font-black text-slate-500 hover:bg-slate-50 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            form="create-event-form"
            disabled={loading}
            className="px-12 py-4 bg-indigo-600 text-white font-black rounded-[24px] shadow-xl shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? '등록 중...' : '행사 등록 완료'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} id="create-event-form" className="hidden" />
    </EventFormLayout>
  );
}
