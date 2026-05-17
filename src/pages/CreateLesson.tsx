import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { handleSupabaseError } from '../lib/supabaseError';
import PlaceSearch from '../components/PlaceSearch';
import { Calendar, Clock, MapPin, Users, FileText, Sparkles, Upload, X, Star, ImageIcon as ImageIcon, PlusCircle, MinusCircle, Music, Mic2, CreditCard, Plus, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGoogleMaps } from '../context/GoogleMapsContext';
import { spendPoints, DEFAULT_POINT_POLICIES } from '../lib/points';
import { uploadImageToStorage, compressImageToDataUrl } from '../lib/storage';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

export default function CreateLesson() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ type: 'loading' | 'error' | 'success' | null, message: string }>({ type: null, message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'lesson',
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
    maxAttendees: 20,
    paymentMethod: '',
    youtubeUrl: '',
    tickets: [{ name: '강습비', price: 0 }] as { name: string, price: number }[],
    level: 'beginner', // New field for lesson
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
      locationName: place.name || prev.locationName,
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
    setAiStatus({ type: 'loading', message: '포스터를 분석하고 있어요... 🎨' });
    try {
      const mimeType = file.type || 'image/jpeg';
      const dataUrl = await compressImageToDataUrl(file);
      const base64Data = dataUrl.split(',')[1];

      // 1. API Key check
      let apiKey = localStorage.getItem('user_gemini_api_key');
      let isPersonalKey = !!apiKey;
      
      if (!apiKey && user) {
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
        const today = new Date().toISOString().split('T')[0];
        const usageData = JSON.parse(localStorage.getItem('ai_usage_stats') || '{"date":"", "count":0}');
        if (usageData.date !== today) {
          usageData.date = today;
          usageData.count = 0;
        }

        const FREE_LIMIT = 5;
        if (usageData.count < FREE_LIMIT) {
          usageData.count += 1;
          localStorage.setItem('ai_usage_stats', JSON.stringify(usageData));
          setAiStatus({ type: 'loading', message: `무료 체험 중 (${FREE_LIMIT - usageData.count + 1}회 남음) ✨` });
        } else {
          setAiStatus({ type: 'error', message: '일일 무료 분석 횟수 초과! 개인 API 키를 등록해주세요. 🔑' });
          setTimeout(() => setAiStatus({ type: null, message: '' }), 6000);
          setAiLoading(false);
          return;
        }
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
      const rawText = await proxyResponse.text();
      let data: any = {};
      try { if (rawText) data = JSON.parse(rawText); }
      catch { throw new Error('서버 응답을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.'); }
      if (!proxyResponse.ok) throw new Error(data.error || `서버 오류 (${proxyResponse.status})`);
      const parsed = data;
      
      if (parsed) {
        const validCategories = ['lesson', 'salsa', 'bachata', 'kizomba', 'salsa_bachata', 'sal_ba_ki'];
        const validLevels = ['beginner', 'intermediate', 'advanced', 'all'];

        setFormData(prev => ({
           ...prev,
           title: parsed.title || prev.title,
           description: parsed.description || prev.description,
           category: validCategories.includes(parsed.category) ? parsed.category : 'lesson',
           level: validLevels.includes(parsed.level) ? parsed.level : 'beginner',
           date: parsed.date || prev.date,
           time: parsed.time || prev.time,
           endDate: parsed.endDate || parsed.date || prev.endDate,
           endTime: parsed.endTime || (parsed.time ? "23:59" : prev.endTime),
           locationName: parsed.locationName || prev.locationName,
           formattedAddress: parsed.formattedAddress || prev.formattedAddress,
           city: parsed.city || prev.city,
           country: parsed.country || prev.country,
           maxAttendees: parsed.maxAttendees || prev.maxAttendees,
           tickets: parsed.tickets && parsed.tickets.length > 0 ? parsed.tickets : prev.tickets
        }));
        setAiStatus({ type: 'success', message: '분석 완료! 강습 정보가 채워졌습니다. 🎉' });
        setTimeout(() => setAiStatus({ type: null, message: '' }), 3000);
      }
    } catch(err: any) {
      console.error('AI Analysis failed:', err);
      setAiStatus({ type: 'error', message: err.message || 'AI 분석 중 오류가 발생했습니다.' });
      setTimeout(() => setAiStatus({ type: null, message: '' }), 6000);
    } finally {
      setAiLoading(false);
      if (aiFileInputRef.current) aiFileInputRef.current.value = '';
    }
  };

  const handleAiInputClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleAiAnalyze(file);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setLoading(true);
        const imageUrl = await uploadImageToStorage(file, 'events');
        setFormData(prev => ({ ...prev, imageUrl }));
      } catch (error) {
        console.error("Image upload failed:", error);
        alert("이미지 처리 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }
  };

  const addTicket = () => {
    setFormData(prev => ({
      ...prev,
      tickets: [...prev.tickets, { name: '', price: 0 }]
    }));
  };

  const removeTicket = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tickets: prev.tickets.filter((_, i) => i !== index)
    }));
  };

  const updateTicket = (index: number, field: 'name' | 'price', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      tickets: prev.tickets.map((t, i) => i === index ? { ...t, [field]: value } : t)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    
    setLoading(true);
    try {
      if (!profile?.isApproved && profile?.role !== 'admin') {
        alert('전문가 승인이 완료된 후 강습을 등록하실 수 있습니다.');
        setLoading(false);
        return;
      }
      const startDateTime = new Date(`${formData.date}T${formData.time}`);
      const fallbackEnd = new Date(startDateTime.getTime() + 4 * 60 * 60 * 1000);
      const endDateTime = formData.endDate ? new Date(`${formData.endDate}T${formData.endTime || formData.time}`) : fallbackEnd;

      // Check approval setting
      const { data: configData } = await supabase.from('settings').select('value').eq('key', 'app_config').maybeSingle();
      const approvalMode = (configData?.value as any)?.approvalMode || 'manual';
      const initialStatus = approvalMode === 'auto' ? 'published' : 'pending';

      // 1. Point check and deduction (for lessons)
      const { data: pointConfig } = await supabase.from('settings').select('value').eq('key', 'point_policies').maybeSingle();
      const policies = { ...DEFAULT_POINT_POLICIES, ...(pointConfig?.value || {}) };
      const cost = policies.lesson_registration_cost || 0;

      if (cost > 0) {
        const pointResult = await spendPoints(user.id, cost, '강습 등록 포인트 차감');
        if (!pointResult.success) {
          alert('포인트가 부족하거나 처리 중 오류가 발생했습니다.');
          setLoading(false);
          return;
        }
      }

      // 2. Insert into lessons
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .insert({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
          class_time: formData.time,
          location_name: formData.locationName,
          formatted_address: formData.formattedAddress,
          city: formData.city,
          country: formData.country,
          lat: formData.geoPoint?.lat,
          lng: formData.geoPoint?.lng,
          image_url: formData.imageUrl,
          host_id: user.id,
          status: initialStatus,
          max_attendees: Number(formData.maxAttendees),
          price: formData.tickets[0]?.price || 0,
          level: formData.level,
          tickets: formData.tickets,
          payment_method: formData.paymentMethod,
          youtube_url: formData.youtubeUrl
        })
        .select()
        .single();

      if (lessonError) throw lessonError;

      if (lessonData) {
        navigate(`/event/${lessonData.id}`);
      }
    } catch (error) {
      handleSupabaseError(error, 'create', 'lessons', user?.id || '');
      alert('강습 등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!user || !['admin', 'host', 'dj', 'instructor', 'media'].includes(profile?.role || '')) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-800">접근 권한이 없습니다</h2>
        <p className="text-slate-500 mt-2">강습 주최자 또는 전문가 계정만 접근할 수 있습니다.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-teal-600 font-bold hover:text-teal-700 transition-colors">메인으로 돌아가기</button>
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
                새로운 <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-600">강습 만들기</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">배움의 즐거움을 나누는 새로운 강습을 등록하세요.</p>
            </div>
            
            <div className="flex items-center gap-4">
               <button
                  type="button"
                  onClick={() => aiFileInputRef.current?.click()}
                  disabled={aiLoading}
                  className="group relative flex items-center gap-2.5 px-6 py-4 bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/30 hover:shadow-2xl hover:shadow-indigo-600/40 hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  {aiLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-indigo-300 group-hover:text-white transition-colors" />
                  )}
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[13px]">AI 포스터 자동 입력</span>
                    <span className="text-[9px] text-indigo-200 font-bold uppercase tracking-widest">Powered by Gemini</span>
                  </div>
                </button>
                <input 
                  type="file" 
                  ref={aiFileInputRef} 
                  onChange={handleAiInputClick} 
                  accept="image/*" 
                  className="hidden" 
                />
            </div>
          </div>

          <AnimatePresence>
            {aiStatus.type && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={clsx(
                  "p-5 rounded-2xl border-2 flex items-center gap-4 shadow-xl backdrop-blur-xl",
                  aiStatus.type === 'loading' ? "bg-amber-50/90 dark:bg-amber-900/20 border-amber-200/50 text-amber-800 dark:text-amber-200" :
                  aiStatus.type === 'success' ? "bg-emerald-50/90 dark:bg-emerald-900/20 border-emerald-200/50 text-emerald-800 dark:text-emerald-200" :
                  "bg-rose-50/90 dark:bg-rose-900/20 border-rose-200/50 text-rose-800 dark:text-rose-200"
                )}
              >
                {aiStatus.type === 'loading' ? (
                  <div className="w-6 h-6 border-3 border-amber-400/30 border-t-amber-500 rounded-full animate-spin" />
                ) : aiStatus.type === 'success' ? (
                  <Sparkles className="w-6 h-6 text-emerald-500" />
                ) : (
                  <X className="w-6 h-6 text-rose-500" />
                )}
                <span className="font-black text-[15px]">{aiStatus.message}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="bg-white dark:bg-slate-900/50 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <form onSubmit={handleSubmit} id="create-lesson-form" className="p-8 md:p-12 space-y-16">
            
            {/* Basic Info Section */}
            <section className="space-y-10">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <FileText className="w-5 h-5 text-teal-500" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">강습 기본 정보</h2>
              </div>

              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-slate-400 uppercase tracking-widest ml-1">강습 제목</label>
                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-[24px] border-none bg-slate-50 dark:bg-slate-800/50 px-8 py-6 text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all shadow-inner"
                    placeholder="매력적인 강습 제목을 입력하세요"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-[13px] font-bold text-slate-400 uppercase tracking-widest ml-1">카테고리</label>
                    <div className="relative">
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="w-full appearance-none rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6 py-4 text-[15px] font-bold text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all cursor-pointer"
                      >
                        <option value="lesson">강습 (일반)</option>
                        <option value="salsa">살사 강습</option>
                        <option value="bachata">바차타 강습</option>
                        <option value="kizomba">키좀바 강습</option>
                        <option value="salsa_bachata">살사/바차타 강습</option>
                        <option value="sal_ba_ki">살바키 강습</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Plus className="w-4 h-4 rotate-45" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[13px] font-bold text-slate-400 uppercase tracking-widest ml-1">난이도</label>
                    <div className="relative">
                      <select
                        value={formData.level}
                        onChange={e => setFormData({ ...formData, level: e.target.value })}
                        className="w-full appearance-none rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6 py-4 text-[15px] font-bold text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all cursor-pointer"
                      >
                        <option value="beginner">초급 (입문)</option>
                        <option value="intermediate">중급</option>
                        <option value="advanced">고급</option>
                        <option value="all">모든 레벨</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Plus className="w-4 h-4 rotate-45" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Schedule Section */}
            <section className="space-y-10">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Calendar className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">강습 일정</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                {/* Start Date/Time */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">강습 시작</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 ml-1">날짜</label>
                      <input
                        required
                        type="date"
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                        className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-4 text-[14px] font-bold text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 ml-1">시간</label>
                      <input
                        required
                        type="time"
                        value={formData.time}
                        onChange={e => setFormData({ ...formData, time: e.target.value })}
                        className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-4 text-[14px] font-bold text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* End Date/Time */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">강습 종료</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 ml-1">날짜</label>
                      <input
                        required
                        type="date"
                        value={formData.endDate}
                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-4 text-[14px] font-bold text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 ml-1">시간</label>
                      <input
                        required
                        type="time"
                        value={formData.endTime}
                        onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                        className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-4 text-[14px] font-bold text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Location Section */}
            <section className="space-y-10">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <MapPin className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">강습 장소</h2>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                    <span className="flex items-center"><MapPin className="w-4 h-4 mr-1 text-slate-400 dark:text-slate-500"/> 장소 검색</span>
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
                        onChange={e => setFormData({ ...formData, locationName: e.target.value })}
                        className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6 py-4 text-[15px] font-bold text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                        placeholder="장소 명칭 또는 주소를 직접 입력해주세요"
                      />
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        {loadError ? (
                          <div className="text-rose-500 space-y-2">
                             <p className="font-bold flex items-center gap-1.5"><X className="w-3.5 h-3.5"/> 구글 맵 로드 오류</p>
                             <p className="font-mono text-[10px] bg-rose-50 dark:bg-rose-900/20 p-2 rounded">{loadError.message}</p>
                             <p className="text-slate-500 dark:text-slate-400 font-normal">
                               자동 완성 기능이 일시적으로 비활성화되었습니다. 위 입력창에 장소를 직접 입력해주세요.
                             </p>
                          </div>
                        ) : (
                          <>
                            💡 <b>Settings &gt; Secrets</b>에서 <code className="text-blue-500 font-bold">VITE_GOOGLE_MAPS_API_KEY</code>를 등록해주세요.<br/>
                            * <b>필수 활성화 API:</b> Maps JavaScript API, Places API
                          </>
                        )}
                      </div>
                    </div>
                  ) : isLoaded ? (
                    <PlaceSearch 
                      onPlaceSelect={handlePlaceSelect}
                      onInputChange={(val) => setFormData(prev => ({ ...prev, locationName: val }))}
                      placeholder="주소를 검색하거나 직접 입력하세요"
                      value={formData.locationName}
                    />
                  ) : (
                    <div className="w-full h-14 bg-slate-50 dark:bg-slate-800/50 animate-pulse rounded-2xl border border-slate-100 dark:border-slate-800"></div>
                  )}
                  {formData.formattedAddress && (
                    <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 px-1 font-medium">
                      <MapPin className="w-3.5 h-3.5" /> 상세주소: {formData.formattedAddress} {formData.city && `(${formData.city}, ${formData.country})`}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Pricing Section */}
            <section className="space-y-10">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <CreditCard className="w-5 h-5 text-rose-500" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">참가비 및 결제</h2>
              </div>

              <div className="space-y-10">
                <div className="space-y-6">
                  <div className="flex items-center justify-between ml-1">
                    <label className="block text-[13px] font-bold text-slate-400 uppercase tracking-widest">강습비 (티켓)</label>
                    <button
                      type="button"
                      onClick={addTicket}
                      className="text-xs font-black text-rose-600 dark:text-rose-400 flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 rounded-full hover:bg-rose-100 transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> 티켓 추가
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {formData.tickets.map((ticket, index) => (
                      <div key={index} className="group flex gap-4 items-center animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            required
                            value={ticket.name}
                            onChange={e => updateTicket(index, 'name', e.target.value)}
                            placeholder="티켓 명칭 (예: 1회권, 4회 패키지)"
                            className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-6 py-4 text-[15px] font-bold text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all"
                          />
                        </div>
                        <div className="relative w-40 md:w-48">
                          <input
                            type="number"
                            required
                            value={ticket.price}
                            onChange={e => updateTicket(index, 'price', parseInt(e.target.value) || 0)}
                            className="w-full pl-6 pr-12 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-rose-500/10 outline-none transition-all font-black text-right"
                          />
                          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₩</span>
                        </div>
                        {formData.tickets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTicket(index)}
                            className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="block text-[13px] font-bold text-slate-400 uppercase tracking-widest ml-1">수강 정원</label>
                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 inline-flex">
                      <input
                        type="number"
                        required
                        value={formData.maxAttendees}
                        onChange={e => setFormData({ ...formData, maxAttendees: parseInt(e.target.value) || 0 })}
                        className="w-24 bg-transparent text-center text-xl font-black text-slate-800 dark:text-slate-100 outline-none"
                      />
                      <span className="text-slate-400 font-bold pr-4 border-l border-slate-200 dark:border-slate-700 pl-4 py-2">명</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/30 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/50 space-y-4">
                  <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 flex items-center">
                    <Music className="w-4 h-4 mr-2 text-red-500"/> 유튜브 홍보 영상 (URL)
                  </label>
                  <input
                    type="url"
                    value={formData.youtubeUrl}
                    onChange={e => setFormData({ ...formData, youtubeUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-4 text-[14px] font-bold text-red-600 dark:text-red-400 focus:ring-4 focus:ring-red-500/10 outline-none transition-all shadow-sm"
                  />
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/30 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/50 space-y-4">
                  <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 flex items-center">
                    <CreditCard className="w-4 h-4 mr-2 text-indigo-500"/> 입금 안내 정보
                  </label>
                  <textarea
                    value={formData.paymentMethod}
                    onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                    placeholder="예: 우리은행 1002-XXX-XXXXXX (홍길동), 입금 후 문자로 성함을 남겨주세요."
                    rows={2}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-4 text-[14px] font-medium text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all resize-none shadow-sm"
                  />
                  <p className="text-[11px] text-slate-400 italic">※ 참여 신청자에게 표시될 결제 방법 또는 계좌 정보를 입력해주세요.</p>
                </div>
              </div>
            </section>

            {/* Media Section */}
            <section className="space-y-10">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <ImageIcon className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">강습 포스터</h2>
              </div>

              <div className="space-y-6">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={clsx(
                    "relative group cursor-pointer aspect-video rounded-[40px] border-4 border-dashed overflow-hidden transition-all duration-500",
                    formData.imageUrl 
                      ? "border-teal-500/30 shadow-2xl" 
                      : "border-slate-200 dark:border-slate-800 hover:border-teal-500/50 hover:bg-teal-50/5 dark:hover:bg-teal-500/5"
                  )}
                >
                  {formData.imageUrl ? (
                    <>
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <div className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
                          <Upload className="w-6 h-6" /> 포스터 변경하기
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6">
                      <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[32px] flex items-center justify-center border border-slate-100 dark:border-slate-700 group-hover:scale-110 group-hover:bg-teal-50 dark:group-hover:bg-teal-900/20 group-hover:border-teal-200 transition-all duration-500 shadow-sm">
                        <Plus className="w-10 h-10 text-slate-400 group-hover:text-teal-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">이미지를 등록하세요</p>
                        <p className="text-slate-400 font-medium mt-1">강습을 대표하는 멋진 포스터 (권장 16:9)</p>
                      </div>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              </div>
            </section>

            {/* Description Section */}
            <section className="space-y-8">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <FileText className="w-5 h-5 text-slate-400" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">강습 상세 내용</h2>
              </div>
              <textarea
                required
                name="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={12}
                className="w-full rounded-[32px] border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-8 py-8 text-[15px] leading-relaxed text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-teal-500/5 focus:border-teal-500/50 outline-none transition-all resize-none shadow-inner font-medium placeholder:text-slate-300"
                placeholder="커리큘럼, 강의 대상, 준비물 등 상세 내용을 작성해주세요."
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
                className="px-16 py-5 bg-teal-600 text-white font-black rounded-2xl shadow-2xl shadow-teal-600/40 hover:bg-teal-700 hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? '등록 중...' : '강습 등록하기'}
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
          form="create-lesson-form"
          disabled={loading}
          className="flex-1 bg-teal-600 text-white font-black rounded-2xl shadow-xl shadow-teal-600/30 flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <span className="text-lg">강습 등록 완료</span>
          )}
        </button>
      </div>
    </div>
  );
}
