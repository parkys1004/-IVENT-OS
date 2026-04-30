import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { handleSupabaseError } from '../lib/supabaseError';
import PlaceSearch from '../components/PlaceSearch';
import { Calendar, FileText, MapPin, Upload, X, GraduationCap, PlusCircle, MinusCircle, CreditCard, Plus, ImageIcon as ImageIcon, Sparkles } from 'lucide-react';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { useAuth } from '../context/AuthContext';
import { useGoogleMaps } from '../context/GoogleMapsContext';
import { uploadImageToStorage, compressImageToDataUrl } from '../lib/storage';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

export default function EditLesson() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    tickets: [{ name: '강습비', price: 0 }] as { name: string, price: number }[],
    level: 'beginner',
  });

  const { isLoaded, loadError } = useGoogleMaps();

  useEffect(() => {
    if (!id || !user) return;

    const fetchLesson = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('lessons')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          alert('강습 정보를 찾을 수 없습니다.');
          navigate('/');
          return;
        }

        // Auth check: only host or admin can edit
        if (data.host_id !== user.id && profile?.role !== 'admin') {
          alert('수정 권한이 없습니다.');
          navigate(`/event/${id}`);
          return;
        }

        const startDate = new Date(data.date);
        const endDate = data.end_date ? new Date(data.end_date) : null;

        setFormData({
          title: data.title || '',
          description: data.description || '',
          category: data.category || 'lesson',
          date: startDate.toISOString().split('T')[0],
          time: data.class_time || startDate.toTimeString().split(' ')[0].substring(0, 5),
          endDate: endDate ? endDate.toISOString().split('T')[0] : '',
          endTime: endDate ? endDate.toTimeString().split(' ')[0].substring(0, 5) : '',
          locationName: data.location_name || '',
          formattedAddress: data.formatted_address || '',
          country: data.country || '',
          city: data.city || '',
          geoPoint: (data.lat && data.lng) ? { lat: data.lat, lng: data.lng } : null,
          imageUrl: data.image_url || '',
          maxAttendees: data.max_attendees || 20,
          paymentMethod: data.payment_method || '',
          tickets: data.tickets || [{ name: '강습비', price: 0 }],
          level: data.level || 'beginner',
        });
      } catch (err) {
        console.error('Error fetching lesson:', err);
        handleSupabaseError(err, 'get', 'lessons');
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [id, user, profile, navigate]);

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
      const dataUrl = await compressImageToDataUrl(file);
      const base64Data = dataUrl.split(',')[1];
      const mimeType = 'image/webp';

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
      
      let parsed;
      const useProxy = !isPersonalKey;

      if (useProxy) {
        const proxyResponse = await fetch('/api/ai/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ imageBase64: base64Data, mimeType })
        });
        const data = await proxyResponse.json();
        if (!proxyResponse.ok) throw new Error(data.error || '분석 실패');
        parsed = data;
      } else {
        const genAI = new GoogleGenerativeAI(apiKey || '');
        const model = genAI.getGenerativeModel({ 
          model: "gemini-1.5-flash-latest",
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                category: { type: SchemaType.STRING },
                level: { type: SchemaType.STRING },
                date: { type: SchemaType.STRING },
                time: { type: SchemaType.STRING },
                endDate: { type: SchemaType.STRING },
                endTime: { type: SchemaType.STRING },
                locationName: { type: SchemaType.STRING },
                formattedAddress: { type: SchemaType.STRING },
                city: { type: SchemaType.STRING },
                country: { type: SchemaType.STRING },
                maxAttendees: { type: SchemaType.INTEGER },
                tickets: { 
                  type: SchemaType.ARRAY, 
                  items: { 
                    type: SchemaType.OBJECT,
                    properties: { name: { type: SchemaType.STRING }, price: { type: SchemaType.INTEGER } }
                  }
                }
              },
              required: ["title", "date", "time", "locationName"]
            }
          }
        }, { apiVersion: 'v1' });

        const result = await model.generateContent([
          { inlineData: { data: base64Data, mimeType } }, 
          "Extract dance lesson info from this poster. Use YYYY-MM-DD for dates and 24h format HH:mm for times. Level should be beginner, intermediate, advanced, or all."
        ]);
        
        const response = await result.response;
        if (response && response.text) {
          let text = response.text();
          text = text.replace(/```json\n?/, "").replace(/```/, "").trim();
          parsed = JSON.parse(text);
        }
      }
      
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
        setSaving(true);
        const imageUrl = await uploadImageToStorage(file, 'events');
        setFormData(prev => ({ ...prev, imageUrl }));
      } catch (error) {
        console.error("Image upload failed:", error);
        alert("이미지 처리 중 오류가 발생했습니다.");
      } finally {
        setSaving(false);
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
    if (!user || !id) return;
    
    setSaving(true);
    try {
      const startDateTime = new Date(`${formData.date}T${formData.time}`);
      const fallbackEnd = new Date(startDateTime.getTime() + 4 * 60 * 60 * 1000);
      const endDateTime = formData.endDate ? new Date(`${formData.endDate}T${formData.endTime || formData.time}`) : fallbackEnd;

      const { error } = await supabase
        .from('lessons')
        .update({
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
          max_attendees: Number(formData.maxAttendees),
          price: formData.tickets[0]?.price || 0,
          level: formData.level,
          tickets: formData.tickets,
          payment_method: formData.paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      alert('강습 정보가 수정되었습니다.');
      navigate(`/event/${id}`);
    } catch (error) {
      handleSupabaseError(error, 'update', 'lessons', user.id);
      alert('수정 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-4 pb-24 md:pb-12">
      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="px-8 py-10 md:py-14 bg-gradient-to-br from-teal-600 to-emerald-700 text-white relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
                <GraduationCap className="w-9 h-9 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none mb-2">강습 수정하기</h1>
                <p className="text-teal-50/80 font-medium text-sm md:text-base">강습 정보를 최신 상태로 유지하세요.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
               <button
                  type="button"
                  onClick={() => aiFileInputRef.current?.click()}
                  disabled={aiLoading}
                  className="group relative flex items-center gap-2.5 px-6 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-black rounded-2xl border border-white/20 transition-all disabled:opacity-50 overflow-hidden"
                >
                  {aiLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-teal-200 group-hover:text-white transition-colors" />
                  )}
                  <div className="flex flex-col items-start leading-tight text-left">
                    <span className="text-[13px]">AI 포스터 분석</span>
                    <span className="text-[9px] text-teal-200 font-bold uppercase tracking-widest leading-none mt-0.5">Auto Fill</span>
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
                  "absolute top-4 right-8 left-8 md:left-auto md:w-80 p-4 rounded-2xl border flex items-center gap-3 shadow-2xl backdrop-blur-2xl z-50",
                  aiStatus.type === 'loading' ? "bg-amber-500/90 border-amber-400 text-white" :
                  aiStatus.type === 'success' ? "bg-emerald-500/90 border-emerald-400 text-white" :
                  "bg-rose-500/90 border-rose-400 text-white"
                )}
              >
                {aiStatus.type === 'loading' ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : aiStatus.type === 'success' ? (
                  <Sparkles className="w-5 h-5" />
                ) : (
                  <X className="w-5 h-5" />
                )}
                <span className="font-bold text-sm tracking-tight">{aiStatus.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-400/20 rounded-full blur-3xl" />
        </div>

        <form id="edit-lesson-form" onSubmit={handleSubmit} className="p-6 md:p-12 space-y-12 md:space-y-16">
          {/* Basic Info */}
          <section className="space-y-8">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 bg-teal-100 dark:bg-teal-500/20 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-wider">기본 정보</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="md:col-span-2 space-y-2">
                <label className="block text-[13px] font-bold text-slate-600 dark:text-slate-400 ml-1">강습 제목</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-semibold text-[15px]"
                  placeholder="예: 초보자를 위한 살사 기초 클래스"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[13px] font-bold text-slate-600 dark:text-slate-400 ml-1">카테고리</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-semibold text-[15px] appearance-none"
                >
                  <option value="lesson">강습 (일반)</option>
                  <option value="salsa">살사 강습</option>
                  <option value="bachata">바차타 강습</option>
                  <option value="kizomba">키좀바 강습</option>
                  <option value="salsa_bachata">살사/바차타 강습</option>
                  <option value="sal_ba_ki">살바키 강습</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[13px] font-bold text-slate-600 dark:text-slate-400 ml-1">강습 레벨</label>
                <select
                  value={formData.level}
                  onChange={e => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-semibold text-[15px] appearance-none"
                >
                  <option value="beginner">초급 (입문)</option>
                  <option value="intermediate">중급</option>
                  <option value="advanced">고급</option>
                  <option value="all">모든 레벨</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="block text-[13px] font-bold text-slate-600 dark:text-slate-400 ml-1">강습 설명</label>
                <textarea
                  required
                  rows={6}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-medium resize-none text-[15px] leading-relaxed"
                  placeholder="강습 커리큘럼, 준비물 등을 상세히 적어주세요."
                />
              </div>
            </div>
          </section>

          <section className="space-y-8">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 bg-amber-100 dark:bg-amber-500/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-wider">일정 정보</h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="col-span-1 space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">시작 날짜</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:border-amber-500 outline-none transition-all font-semibold text-[14px]"
                />
              </div>
              <div className="col-span-1 space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">시작 시간</label>
                <input
                  type="time"
                  required
                  value={formData.time}
                  onChange={e => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:border-amber-500 outline-none transition-all font-semibold text-[14px]"
                />
              </div>
              <div className="col-span-1 space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">종료 날짜</label>
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:border-amber-500 outline-none transition-all font-semibold text-[14px]"
                />
              </div>
              <div className="col-span-1 space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">종료 시간</label>
                <input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:border-amber-500 outline-none transition-all font-semibold text-[14px]"
                />
              </div>
            </div>
          </section>

          <section className="space-y-8">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-wider">장소 정보</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-[13px] font-bold text-slate-600 dark:text-slate-400 ml-1">장소 명칭 / 주소 검색</label>
                {isLoaded ? (
                  <PlaceSearch 
                    onPlaceSelect={handlePlaceSelect}
                    onInputChange={(val) => setFormData(prev => ({ ...prev, locationName: val }))}
                    placeholder="주소를 검색하거나 직접 입력하세요"
                    value={formData.locationName}
                  />
                ) : (
                  <input
                    type="text"
                    value={formData.locationName}
                    onChange={e => setFormData({ ...formData, locationName : e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-blue-500 outline-none transition-all font-semibold"
                  />
                )}
                {formData.formattedAddress && (
                  <div className="mt-3 flex items-start gap-2 text-[13px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>상세주소: {formData.formattedAddress}</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-8">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 bg-rose-100 dark:bg-rose-500/20 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-wider">참가비 및 결제</h2>
            </div>

            <div className="space-y-8">
              <div className="space-y-5">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[14px] font-bold text-slate-700 dark:text-slate-300">강습비 종류</label>
                  <button 
                    type="button" 
                    onClick={addTicket} 
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-black shadow-sm hover:bg-rose-100 transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> 추가
                  </button>
                </div>
                <div className="space-y-4">
                  {formData.tickets.map((ticket, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                      <div className="flex-1 w-full space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider ml-1">명칭 (예: 기수전체)</label>
                        <input
                          type="text"
                          required
                          value={ticket.name}
                          onChange={e => updateTicket(index, 'name', e.target.value)}
                          className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-rose-500 outline-none transition-all font-semibold"
                        />
                      </div>
                      <div className="w-full sm:w-48 space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider ml-1">가격 (원)</label>
                        <div className="relative">
                          <input
                            type="number"
                            required
                            value={ticket.price}
                            onChange={e => updateTicket(index, 'price', parseInt(e.target.value) || 0)}
                            className="w-full pl-4 pr-10 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-rose-500 outline-none transition-all font-semibold"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₩</span>
                        </div>
                      </div>
                      {formData.tickets.length > 1 && (
                        <button type="button" onClick={() => removeTicket(index)} className="p-2.5 text-slate-300 hover:text-rose-500 transition-colors self-end sm:self-center">
                          <MinusCircle className="w-6 h-6" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-[13px] font-bold text-slate-600 dark:text-slate-400 ml-1">수강 정원 (선택)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      required
                      value={formData.maxAttendees}
                      onChange={e => setFormData({ ...formData, maxAttendees: parseInt(e.target.value) || 0 })}
                      className="w-32 px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-rose-500 outline-none transition-all font-black text-center"
                    />
                    <span className="text-slate-500 font-bold">명</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 ml-1">결제/입금 안내</label>
                <textarea
                  value={formData.paymentMethod}
                  onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                  rows={3}
                  className="w-full px-5 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-rose-500 outline-none transition-all font-medium resize-none shadow-sm"
                  placeholder="예: 우리은행 1002-1234-5678 홍길동 (입금 후 성함 문자로 전송)"
                />
              </div>
            </div>
          </section>

          <section className="space-y-8">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-wider">강습 이미지</h2>
            </div>
            
            <div onClick={() => fileInputRef.current?.click()} className={clsx("relative group cursor-pointer aspect-[16/9] md:aspect-[21/9] rounded-3xl border-3 border-dashed overflow-hidden transition-all duration-300", formData.imageUrl ? "border-teal-500" : "border-slate-200 dark:border-slate-800 hover:border-teal-400")}>
              {formData.imageUrl ? (
                <>
                  <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white scale-95 group-hover:scale-100 duration-300">
                    <Upload className="w-10 h-10 mb-2" />
                    <p className="font-black text-xl">이미지 교체하기</p>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] flex items-center justify-center group-hover:bg-teal-50 group-hover:text-teal-600 group-hover:rotate-12 transition-all duration-500 shadow-sm"><Plus className="w-10 h-10" /></div>
                  <div className="text-center">
                    <p className="font-black text-slate-700 dark:text-slate-200 text-lg">대표 이미지를 추가해주세요</p>
                    <p className="text-sm font-medium opacity-60">권장 비율: 16:9 / 800 x 450px</p>
                  </div>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            </div>
          </section>

          {/* Desktop Actions */}
          <div className="hidden md:flex gap-6 pt-10 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => navigate(-1)} className="px-10 py-5 flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-200 transition-colors">취소</button>
            <button type="submit" disabled={saving} className="px-16 py-5 flex-[2] bg-teal-600 text-white font-black rounded-2xl shadow-xl shadow-teal-600/30 hover:bg-teal-700 hover:-translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
              {saving ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>수정 완료하기</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Sticky Mobile Actions */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 z-50 flex gap-3">
        <button type="button" onClick={() => navigate(-1)} className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl flex items-center justify-center shrink-0">
          <X className="w-7 h-7" />
        </button>
        <button 
          type="submit" 
          form="edit-lesson-form"
          disabled={saving}
          onClick={() => {
            const form = document.getElementById('edit-lesson-form') as HTMLFormElement;
            if (form) form.requestSubmit();
          }}
          className="flex-1 bg-teal-600 text-white font-black rounded-2xl shadow-lg shadow-teal-600/30 flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {saving ? (
            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>수정 완료</>
          )}
        </button>
      </div>
    </div>
  );
}
