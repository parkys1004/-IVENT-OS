import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { handleSupabaseError } from '../lib/supabaseError';
import PlaceSearch from '../components/PlaceSearch';
import { 
  Calendar, MapPin, FileText, Sparkles, Upload, X, Star, 
  ImageIcon, Plus, MinusCircle, Music, CreditCard, 
  PlusCircle, GraduationCap, ExternalLink, Stars
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useAuth } from '../context/AuthContext';
import { useGoogleMaps } from '../context/GoogleMapsContext';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { uploadImageToStorage, compressImageToDataUrl } from '../lib/storage';
import { EventFormLayout } from '../components/events/EventFormLayout';

export default function CreateEvent() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState(''); // AI 분석용 추가 텍스트
  const [aiStatus, setAiStatus] = useState<{ type: 'loading' | 'error' | 'success' | null, message: string }>({ type: null, message: '' });
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const mainPosterInputRef = useRef<HTMLInputElement>(null);
  
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
    workshops: [] as { teacher: string, topic: string, time: string }[],
    paymentMethod: '',
    paymentLink: '',
    youtubeUrl: '',
    tickets: [{ name: '입장권', price: 0 }] as { name: string, price: number }[],
    isLesson: false,
  });

  const { isLoaded, loadError } = useGoogleMaps();

  const [mainPoster, setMainPoster] = useState<string | null>(null);
  const [mainPosterFile, setMainPosterFile] = useState<File | null>(null);
  const [images, setImages] = useState<string[]>([]);

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

  const handleMainPosterSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMainPosterFile(file);
      const dataUrl = await compressImageToDataUrl(file);
      setMainPoster(dataUrl);
    }
  };

  const handleAiAnalyze = async () => {
    if (!mainPosterFile && !aiText.trim()) {
      alert('분석할 포스터 이미지나 안내 텍스트를 입력해주세요.');
      return;
    }

    setAiLoading(true);
    setAiStatus({ type: 'loading', message: '데이터를 분석하여 마법을 부리는 중... ✨' });
    
    try {
      let base64Data = '';
      let mimeType = 'image/webp';
      if (mainPosterFile) {
        const dataUrl = await compressImageToDataUrl(mainPosterFile);
        base64Data = dataUrl.split(',')[1];
      }

      let apiKey = localStorage.getItem('user_gemini_api_key');
      let isPersonalKey = !!apiKey;
      
      if (!apiKey && user) {
        const { data: aiConfig } = await supabase.from('user_ai_configs').select('api_key').eq('user_id', user.id).maybeSingle();
        if (aiConfig?.api_key) { apiKey = aiConfig.api_key; isPersonalKey = true; }
      }

      // Daily limit logic
      if (!isPersonalKey) {
        const today = new Date().toISOString().split('T')[0];
        const usageData = JSON.parse(localStorage.getItem('ai_usage_stats') || '{"date":"", "count":0}');
        if (usageData.date !== today) { usageData.date = today; usageData.count = 0; }
        const FREE_LIMIT = 5;
        if (usageData.count >= FREE_LIMIT) {
          setAiStatus({ type: 'error', message: '무료 횟수 초과! 개인 API 키를 등록해주세요. 🔑' });
          setAiLoading(false);
          return;
        }
        usageData.count += 1;
        localStorage.setItem('ai_usage_stats', JSON.stringify(usageData));
      }

      let parsed;
      if (!isPersonalKey) {
        const proxyResponse = await fetch('/api/ai/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64Data, mimeType, additionalText: aiText })
        });
        const data = await proxyResponse.json();
        if (!proxyResponse.ok) throw new Error(data.error || '서버 응답 오류');
        parsed = data;
      } else {
        const genAI = new GoogleGenerativeAI(apiKey || '');
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });
        const contents: any[] = [];
        if (base64Data) contents.push({ inlineData: { data: base64Data, mimeType } });
        contents.push(`Analyze poster/text: "${aiText}". Extract event info. Category must be one of: salsa, bachata, kizomba, salsa_bachata, sal_ba_ki, party, lesson, festival, workshop, concert. Date: YYYY-MM-DD. Time: HH:mm.`);
        const result = await model.generateContent(contents);
        const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(responseText);
      }
      
      if (parsed) {
        setFormData(prev => ({
           ...prev,
           title: parsed.title || prev.title,
           description: parsed.description || prev.description,
           category: parsed.category || prev.category,
           date: parsed.date || prev.date,
           time: parsed.time || prev.time,
           locationName: parsed.locationName || prev.locationName,
           formattedAddress: parsed.formattedAddress || prev.formattedAddress,
           maxAttendees: parsed.maxAttendees || prev.maxAttendees,
           djs: parsed.djs || prev.djs,
           performances: parsed.performances || prev.performances,
           tickets: parsed.tickets || prev.tickets,
           workshops: parsed.workshops || prev.workshops
        }));
        setAiStatus({ type: 'success', message: '마법처럼 폼이 채워졌습니다! 🎉' });
        setTimeout(() => setAiStatus({ type: null, message: '' }), 4000);
      }
    } catch(err: any) {
      setAiStatus({ type: 'error', message: `분석 실패: ${err.message}` });
      setTimeout(() => setAiStatus({ type: null, message: '' }), 5000);
    } finally {
      setAiLoading(false);
    }
  };

  const handleImageUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const availableSlots = 9 - images.length;
    if (availableSlots <= 0) { alert("추가 사진은 최대 9장까지만 가능합니다."); return; }
    try {
      setLoading(true);
      const urls = await Promise.all(fileArray.slice(0, availableSlots).map(f => uploadImageToStorage(f, 'events')));
      setImages(prev => [...prev, ...urls]);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setLoading(true);
    try {
      let finalImg = formData.imageUrl;
      if (mainPosterFile) finalImg = await uploadImageToStorage(mainPosterFile, 'events');
      const startDate = new Date(`${formData.date}T${formData.time}`);
      const endDate = new Date(`${formData.endDate || formData.date}T${formData.endTime || '23:59'}`);

      const { data: newParty, error } = await supabase
        .from('parties')
        .insert({
          title: formData.title, description: formData.description, category: formData.category,
          date: startDate.toISOString(), end_date: endDate.toISOString(),
          location_name: formData.locationName, formatted_address: formData.formattedAddress,
          city: formData.city, country: formData.country, lat: formData.geoPoint?.lat, lng: formData.geoPoint?.lng,
          image_url: finalImg, host_id: user.id, status: 'pending', max_attendees: Number(formData.maxAttendees),
          price: formData.tickets[0]?.price || 0, djs: formData.djs, performances: formData.performances,
          workshops: formData.workshops, tickets: formData.tickets, payment_method: formData.paymentMethod,
          payment_link: formData.paymentLink, youtube_url: formData.youtubeUrl
        }).select().single();

      if (error) throw error;
      if (newParty && images.length > 0) {
        await supabase.from('event_photos').insert(images.map(url => ({ event_id: newParty.id, image_url: url, user_id: user.id })));
      }
      navigate('/');
    } catch (err) { handleSupabaseError(err, 'create', 'parties', user.id); } finally { setLoading(false); }
  };

  const handleChange = (e: any) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
  const updateTicket = (i: number, f: 'name' | 'price', v: any) => {
    const nt = [...formData.tickets];
    nt[i] = { ...nt[i], [f]: v };
    setFormData(p => ({ ...p, tickets: nt }));
  };
  const addLineupItem = (t: string) => t === 'workshops' ? setFormData(p => ({ ...p, workshops: [...p.workshops, { teacher: '', topic: '', time: '' }] })) : setFormData(p => ({ ...p, [t]: [...p[t as keyof typeof formData], ''] }));
  const removeLineupItem = (t: string, i: number) => setFormData(p => ({ ...p, [t]: (p[t as keyof typeof formData] as any[]).filter((_: any, idx: number) => idx !== i) }));

  if (loading && !aiLoading) return <div className="flex justify-center py-20 animate-pulse"><div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <EventFormLayout
      title="새로운 행사 만들기"
      subtitle="AI 분석과 전문적인 폼 구성으로 행사를 완벽하게 등록하세요."
      onSubmit={handleSubmit}
      leftColumn={
        <div className="space-y-12 animate-in fade-in slide-in-from-left-8 duration-700">
          <input type="file" accept="image/*" className="hidden" ref={mainPosterInputRef} onChange={handleMainPosterSelect} />
          <input type="file" multiple accept="image/*" className="hidden" ref={multiFileInputRef} onChange={(e) => e.target.files && handleImageUpload(e.target.files)} />
          
          <div className="p-1 min-h-[600px] bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-rose-500/10 rounded-[48px]">
            <div className="bg-white dark:bg-slate-900 rounded-[44px] p-10 space-y-10 border border-white dark:border-slate-800 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-[1000] text-slate-800 dark:text-white tracking-tight">AI 데이터 수집 구역</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Input Zone for Magic</p>
                </div>
              </div>

              <div className="space-y-5">
                <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-3 ml-2">
                  <span className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-[11px] text-indigo-600">01</span>
                  대표 포스터 (분석용 이미지)
                </label>
                <div 
                  onClick={() => mainPosterInputRef.current?.click()}
                  className="relative aspect-[3/4] rounded-[36px] overflow-hidden border-4 border-dashed border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 hover:border-indigo-600/50 cursor-pointer transition-all group"
                >
                  {mainPoster ? (
                    <img src={mainPoster} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center text-slate-300">
                      <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center shadow-sm border border-slate-50 dark:border-slate-700 mb-6 group-hover:scale-110 transition-transform duration-500">
                        <ImageIcon className="w-10 h-10 text-slate-200" />
                      </div>
                      <p className="text-lg font-black text-slate-800 dark:text-slate-100 italic">Upload Event Poster</p>
                      <p className="text-sm font-bold text-slate-400 mt-2">포스터를 클릭하여 등록하세요</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-3 ml-2">
                  <span className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-[11px] text-indigo-600">02</span>
                  안내글/텍스트 (공지 한꺼번에 넣기)
                </label>
                <textarea 
                  value={aiText} onChange={(e) => setAiText(e.target.value)}
                  placeholder="공지글이 있다면 여기에 복사해서 붙여넣어 주세요. 포스터 정보와 함께 병합하여 분석합니다."
                  className="w-full rounded-[2.5rem] border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 px-8 py-8 text-[15px] font-medium leading-relaxed min-h-[220px] outline-none focus:ring-8 focus:ring-indigo-600/5 transition-all shadow-inner resize-none"
                />
              </div>

              <div className="pt-2">
                <button 
                  type="button" onClick={handleAiAnalyze} disabled={aiLoading || (!mainPoster && !aiText.trim())}
                  className="w-full group relative flex items-center justify-center gap-4 px-10 py-6 rounded-[32px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-[1000] text-xl shadow-2xl active:scale-95 transition-all overflow-hidden disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {aiLoading ? <div className="w-7 h-7 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <><Sparkles className="w-7 h-7" /><span>AI 포스터 및 텍스트 분석하기 🪄</span></>}
                </button>
                
                {aiStatus.type && (
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={clsx("mt-10 p-6 rounded-3xl text-sm font-black border flex items-center gap-4 shadow-lg", aiStatus.type === 'loading' ? "bg-indigo-50 border-indigo-100 text-indigo-600" : aiStatus.type === 'error' ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-emerald-50 border-emerald-100 text-emerald-600")}>
                    <div className={clsx("w-3 h-3 rounded-full animate-pulse", aiStatus.type === 'loading' ? "bg-indigo-600" : aiStatus.type === 'error' ? "bg-rose-600" : "bg-emerald-600")} />
                    {aiStatus.message}
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          <div className="p-12 space-y-10 bg-slate-50 dark:bg-slate-900/40 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-xl">
             <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-2xl font-[1000] text-slate-800 dark:text-white flex items-center gap-3 italic"><Stars className="w-6 h-6 text-emerald-500" /> 추가 현장 사진</h4>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Secondary event media (Up to 9)</p>
                </div>
                <button type="button" onClick={() => multiFileInputRef.current?.click()} className="px-6 py-3 bg-white dark:bg-slate-800 text-xs font-black uppercase tracking-widest text-slate-700 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 hover:text-indigo-600 transition-all">+ Add Photos</button>
             </div>
             <div className="grid grid-cols-3 gap-6">
                {images.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-[30px] overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none group">
                    <img src={img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-125" />
                    <button type="button" onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md hover:bg-rose-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                {images.length < 9 && (
                   <button type="button" onClick={() => multiFileInputRef.current?.click()} className="aspect-square rounded-[30px] bg-slate-100/50 border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-4 text-slate-300 hover:text-indigo-600 transition-all group">
                     <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Plus className="w-8 h-8" />
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-widest">Add Media</span>
                   </button>
                )}
             </div>
          </div>
        </div>
      }
      rightColumn={
        <div className="space-y-14 animate-in fade-in slide-in-from-right-12 duration-1000 delay-100">
          <div className="flex items-center gap-5 ml-4">
            <div className="w-2.5 h-12 bg-indigo-600 rounded-full shadow-lg shadow-indigo-600/20" />
            <h2 className="text-4xl font-[1000] text-slate-900 dark:text-white tracking-tight">수정 및 데이터 검증</h2>
          </div>

          <div className="space-y-12">
            <div className="p-10 md:p-14 rounded-[4rem] bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-12 shadow-inner">
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-indigo-600" /> 정식 행사 타이틀
                </label>
                <input required name="title" value={formData.title} onChange={handleChange} className="w-full rounded-[2rem] border-none bg-white dark:bg-slate-800 px-10 py-6 text-3xl font-[1000] text-slate-900 dark:text-white placeholder:text-slate-100 shadow-xl focus:ring-8 focus:ring-indigo-600/5 outline-none transition-all" placeholder="행사명을 확인하세요" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">분류/카테고리</label>
                  <div className="relative">
                    <select name="category" value={formData.category} onChange={handleChange} className="w-full rounded-[1.75rem] border-none bg-white dark:bg-slate-800 px-10 py-6 text-base font-[1000] text-slate-800 dark:text-white shadow-xl outline-none appearance-none cursor-pointer">
                      <option value="party">소셜 파티 (Social Party)</option>
                      <option value="festival">페스티벌 (Festival)</option>
                      <option value="workshop">워크숍 (Workshop)</option>
                      <option value="concert">공연 (Concert)</option>
                      <option value="lesson">특강/정규강습 (Lesson)</option>
                      <option value="salsa">살사 전문 (Salsa)</option>
                      <option value="bachata">바차타 전문 (Bachata)</option>
                    </select>
                    <PlusCircle className="absolute right-10 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20 pointer-events-none rotate-45" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between mx-2">
                     <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">인원 제한</label>
                     <span className="text-xl font-[1000] text-indigo-600 tabular-nums">{formData.maxAttendees}<span className="text-xs ml-0.5">명</span></span>
                  </div>
                  <div className="flex items-center bg-white dark:bg-slate-800 rounded-[1.75rem] px-10 py-6 shadow-xl"><input type="range" min="1" max="500" step="10" name="maxAttendees" value={formData.maxAttendees} onChange={handleChange} className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-600" /></div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex items-center gap-3 ml-2 text-slate-400 leading-none">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  <span className="text-[11px] font-black uppercase tracking-widest">상세 위치 설정</span>
                </div>
                {isLoaded ? (
                  <PlaceSearch 
                    onPlaceSelect={handlePlaceSelect} 
                    defaultValue={formData.locationName} 
                    onInputChange={(v) => setFormData(p => ({ ...p, locationName: v }))} 
                    className="rounded-[1.75rem] border-none shadow-xl"
                  />
                ) : (
                  <div className="w-full h-20 bg-white dark:bg-slate-800 rounded-[1.75rem] animate-pulse shadow-xl" />
                )}
                {formData.formattedAddress && (
                  <div className="px-8 py-5 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-[1.75rem] text-xs font-black text-indigo-600/70 border border-indigo-500/10 shadow-sm flex items-center gap-3">
                    <Stars className="w-4 h-4" /> <span>{formData.formattedAddress}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-10 md:p-14 rounded-[4rem] bg-indigo-50/50 dark:bg-indigo-900/10 border border-slate-100 dark:border-slate-800 space-y-12 shadow-inner">
               <div className="flex items-center gap-4 mb-2">
                 <Calendar className="w-7 h-7 text-rose-500" />
                 <span className="text-xl font-[1000] text-slate-900 dark:text-white uppercase tracking-widest italic">이벤트 스케줄</span>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
                  <div className="space-y-5">
                    <div className="flex items-center gap-3 ml-2">
                       <div className="w-2 h-7 bg-indigo-600 rounded-full" />
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">시작 일시 (Start)</label>
                    </div>
                    <div className="flex flex-col gap-4">
                      <input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full rounded-2xl border-none bg-white dark:bg-slate-800 px-8 py-6 text-base font-[1000] shadow-xl italic" />
                      <input type="time" name="time" value={formData.time} onChange={handleChange} required className="w-full rounded-2xl border-none bg-white dark:bg-slate-800 px-8 py-6 text-base font-[1000] shadow-xl" />
                    </div>
                  </div>
                  <div className="space-y-5 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
                    <div className="flex items-center gap-3 ml-2">
                       <div className="w-2 h-7 bg-slate-300 rounded-full" />
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">종료 일시 (End)</label>
                    </div>
                    <div className="flex flex-col gap-4">
                      <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="w-full rounded-2xl border-none bg-white dark:bg-slate-800 px-8 py-6 text-base font-black shadow-xl" />
                      <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full rounded-2xl border-none bg-white dark:bg-slate-800 px-8 py-6 text-base font-black shadow-xl" />
                    </div>
                  </div>
               </div>
            </div>

            <div className="space-y-12">
               <div className="flex items-center gap-5 ml-4">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-2xl flex items-center justify-center text-emerald-600">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-[1000] text-slate-900 dark:text-white uppercase tracking-tighter">참여 아티스트 라인업</h3>
               </div>

               <div className="space-y-10">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mx-4">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2rem] flex items-center gap-2">
                         <GraduationCap className="w-4 h-4 text-cyan-500" /> 워크샵 정보 (Teaching)
                       </label>
                       <button type="button" onClick={() => addLineupItem('workshops')} className="px-6 py-2.5 bg-cyan-500 text-white rounded-full text-[10px] font-black shadow-lg shadow-cyan-500/20 active:scale-95 transition-all">+ Add Workshop</button>
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                      {formData.workshops.map((ws, i) => (
                        <div key={i} className="p-10 rounded-[2.5rem] bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 shadow-2xl relative group/row animate-in slide-in-from-bottom-4 transition-all">
                          <button type="button" onClick={() => removeLineupItem('workshops', i)} className="absolute top-8 right-8 p-3 text-slate-200 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-2xl opacity-0 group-hover/row:opacity-100 transition-all"><X className="w-6 h-6" /></button>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="space-y-3">
                               <label className="text-[10px] font-black text-slate-300 uppercase italic ml-2">Artist / Teacher</label>
                               <input value={ws.teacher} onChange={(e) => updateWorkshopItem(i, 'teacher', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 rounded-2xl border-none px-8 py-5 text-base font-[1000] italic" placeholder="강사 명" />
                            </div>
                            <div className="space-y-3">
                               <label className="text-[10px] font-black text-slate-300 uppercase italic ml-2">Session Time</label>
                               <input value={ws.time} onChange={(e) => updateWorkshopItem(i, 'time', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 rounded-2xl border-none px-8 py-5 text-base font-black" placeholder="시간 (ex: 19:00 - 20:00)" />
                            </div>
                            <div className="sm:col-span-2 space-y-3">
                               <label className="text-[10px] font-black text-slate-300 uppercase italic ml-2">Topic Details</label>
                               <input value={ws.topic} onChange={(e) => updateWorkshopItem(i, 'topic', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 rounded-2xl border-none px-8 py-5 text-base font-black" placeholder="워크샵 상세 주제 및 커리큘럼" />
                            </div>
                          </div>
                        </div>
                      ))}
                      {formData.workshops.length === 0 && (
                        <div className="py-20 text-center bg-slate-50 dark:bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                          <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">No registered workshop artists</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
                     <div className="space-y-5">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between mx-4">
                          DJ Lineup (Spinning) <PlusCircle className="w-5 h-5 text-indigo-500 cursor-pointer hover:scale-125 transition-all" onClick={() => addLineupItem('djs')} />
                        </label>
                        <div className="flex flex-wrap gap-4 px-2">
                           {formData.djs.map((dj, i) => (
                             <div key={i} className="flex items-center gap-4 bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 px-6 py-4 rounded-2xl shadow-xl group/chip">
                               <input value={dj} onChange={(e) => updateLineupItem('djs', i, e.target.value)} className="bg-transparent border-none p-0 text-sm font-black w-24 italic" placeholder="DJ NAME" />
                               <X className="w-4 h-4 text-slate-200 group-hover/chip:text-rose-500 cursor-pointer" onClick={() => removeLineupItem('djs', i)} />
                             </div>
                           ))}
                           <button type="button" onClick={() => addLineupItem('djs')} className="p-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-200 hover:text-indigo-500 transition-all"><Plus className="w-7 h-7" /></button>
                        </div>
                     </div>
                     <div className="space-y-5">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between mx-4">
                          Performers (Show) <PlusCircle className="w-5 h-5 text-rose-500 cursor-pointer hover:scale-125 transition-all" onClick={() => addLineupItem('performances')} />
                        </label>
                        <div className="flex flex-wrap gap-4 px-2">
                           {formData.performances.map((p, i) => (
                             <div key={i} className="flex items-center gap-4 bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 px-6 py-4 rounded-2xl shadow-xl group/chip">
                               <input value={p} onChange={(e) => updateLineupItem('performances', i, e.target.value)} className="bg-transparent border-none p-0 text-sm font-black w-24 italic" placeholder="TEAM NAME" />
                               <X className="w-4 h-4 text-slate-200 group-hover/chip:text-rose-500 cursor-pointer" onClick={() => removeLineupItem('performances', i)} />
                             </div>
                           ))}
                           <button type="button" onClick={() => addLineupItem('performances')} className="p-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-200 hover:text-rose-500 transition-all"><Plus className="w-7 h-7" /></button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="p-12 md:p-16 rounded-[4.5rem] bg-slate-900 text-white space-y-12 shadow-3xl shadow-indigo-600/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[120px] rounded-full" />
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg"><CreditCard className="w-6 h-6 text-white" /></div>
                  <h3 className="text-2xl font-[1000] italic uppercase tracking-tighter text-white">Pricing Detail</h3>
                </div>
                <button type="button" onClick={() => setFormData(p => ({ ...p, tickets: [...p.tickets, { name: '', price: 0 }] }))} className="px-8 py-4 bg-white text-slate-900 rounded-[1.5rem] text-xs font-black shadow-2xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest">+ New Ticket Slot</button>
              </div>
              <div className="space-y-6 relative z-10">
                 {formData.tickets.map((t, i) => (
                    <div key={i} className="flex flex-col sm:flex-row items-center gap-8 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-xl">
                       <div className="flex-[3] w-full space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Ticket Title</label>
                          <input value={t.name} onChange={(e) => updateTicket(i, 'name', e.target.value)} className="w-full bg-white/5 rounded-2xl border-none px-8 py-5 text-base font-black text-white" placeholder="티켓 명칭" />
                       </div>
                       <div className="flex-[2] w-full space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Price (KRW)</label>
                          <div className="relative">
                            <input type="number" value={t.price} onChange={(e) => updateTicket(i, 'price', Number(e.target.value))} className="w-full bg-white/5 rounded-2xl border-none px-14 py-5 text-right text-xl font-[1000] tabular-nums text-emerald-400" />
                            <span className="absolute left-8 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500 italic">KRW</span>
                          </div>
                       </div>
                       <button type="button" onClick={() => setFormData(p => ({ ...p, tickets: p.tickets.filter((_, idx) => idx !== i) }))} className="p-4 text-white/20 hover:text-rose-500 rounded-2xl transition-all"><MinusCircle className="w-7 h-7" /></button>
                    </div>
                 ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-white/10 relative z-10">
                 <div className="space-y-5">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-3 ml-2"><ExternalLink className="w-5 h-5 text-indigo-400" /> 온라인 예매 링크</label>
                    <input type="url" name="paymentLink" value={formData.paymentLink} onChange={handleChange} placeholder="Google Forms, 카톡 오픈채팅 등" className="w-full rounded-2xl border-none bg-white/5 px-8 py-6 text-sm font-black text-indigo-400 shadow-xl" />
                 </div>
                 <div className="space-y-5">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-3 ml-2"><CreditCard className="w-5 h-5" /> 직접 입금 계좌</label>
                    <input type="text" name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} placeholder="은행명 및 계좌번호 (예금주)" className="w-full rounded-2xl border-none bg-white/5 px-8 py-6 text-sm font-black text-white shadow-xl" />
                 </div>
              </div>
            </div>

            <div className="space-y-8 px-4">
               <div className="flex items-center gap-4">
                  <FileText className="w-8 h-8 text-slate-400" />
                  <h3 className="text-3xl font-[1000] text-slate-900 dark:text-white uppercase tracking-tighter shadow-sm">이벤트 정책 및 상세 가이드</h3>
               </div>
               <textarea required rows={12} name="description" value={formData.description} onChange={(e) => { handleChange(e); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} placeholder="행사의 상세 커리큘럼, 환불 규정 등을 검토 후 수정하세요." className="w-full rounded-[4rem] border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 px-12 py-12 text-lg font-medium leading-[1.8] text-slate-800 dark:text-white outline-none focus:ring-[12px] focus:ring-indigo-600/5 transition-all resize-y min-h-[400px] shadow-inner" />
            </div>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full mx-4">
           <button type="button" onClick={() => navigate(-1)} className="px-12 py-7 rounded-[2rem] text-xl font-black text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">취소 및 나가기</button>
           <button type="submit" disabled={loading} className="group relative px-24 py-7 bg-indigo-600 text-white font-[1000] text-2xl rounded-[2.5rem] shadow-3xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 overflow-hidden"><div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 opacity-0 group-hover:opacity-20 transition-opacity" />{loading ? 'Processing...' : '최종 확인 및 이벤트 등록 🚀'}</button>
        </div>
      }
    />
  );
}

const updateWorkshopItem = (index: number, field: string, value: string) => {
  // This is a helper for local scope updates if needed
};
