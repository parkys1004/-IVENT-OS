import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { handleSupabaseError } from '../lib/supabaseError';
import PlaceSearch from '../components/PlaceSearch';
import {
  Calendar, MapPin, FileText, Sparkles, X,
  ImageIcon, Plus, Music, CreditCard,
  GraduationCap, ExternalLink, Users, ChevronLeft,
  Clock, Tag, Mic2, Camera, CheckCircle2, AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getPersonalGeminiKey, analyzeEventPoster } from '../lib/gemini';
import { useGoogleMaps } from '../context/GoogleMapsContext';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { uploadImageToStorage, compressImageToDataUrl } from '../lib/storage';

const CATEGORIES = [
  { value: 'party', label: '소셜 파티' },
  { value: 'festival', label: '페스티벌' },
  { value: 'workshop', label: '워크숍' },
  { value: 'concert', label: '공연/콘서트' },
  { value: 'lesson', label: '특강/강습' },
  { value: 'salsa', label: '살사 전문' },
  { value: 'bachata', label: '바차타 전문' },
  { value: 'kizomba', label: '키좀바 전문' },
  { value: 'salsa_bachata', label: '살사+바차타' },
];

const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all';
const labelCls = 'block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5';
const sectionCls = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5';

function SectionHeader({ num, icon, title }: { num: string; icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 pb-1">
      <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-[11px] font-black text-indigo-600 dark:text-indigo-400 shrink-0">{num}</span>
      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
        {icon}
        {title}
      </div>
    </div>
  );
}

export default function CreateEvent() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiStatus, setAiStatus] = useState<{ type: 'loading' | 'error' | 'success' | null; message: string }>({ type: null, message: '' });
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
    geoPoint: null as { lat: number; lng: number } | null,
    imageUrl: '',
    maxAttendees: 50,
    djs: [] as string[],
    performances: [] as string[],
    media: [] as string[],
    workshops: [] as { teacher: string; topic: string; time: string }[],
    paymentMethod: '',
    paymentLink: '',
    youtubeUrl: '',
    tickets: [{ name: '입장권', price: 0 }] as { name: string; price: number }[],
  });

  const { isLoaded } = useGoogleMaps();
  const [mainPoster, setMainPoster] = useState<string | null>(null);
  const [mainPosterFile, setMainPosterFile] = useState<File | null>(null);
  const [images, setImages] = useState<string[]>([]);

  const handlePlaceSelect = (place: any) => {
    if (!place) return;
    let city = '', country = '';
    place.address_components?.forEach((c: any) => {
      if (c.types.includes('country')) country = c.short_name;
      if (c.types.includes('locality')) city = c.long_name;
      else if (c.types.includes('administrative_area_level_1') && !city) city = c.long_name;
    });
    setFormData(prev => ({
      ...prev,
      locationName: place.name || place.formatted_address || prev.locationName,
      formattedAddress: place.formatted_address || '',
      country, city,
      geoPoint: place.geometry?.location ? {
        lat: typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat,
        lng: typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng,
      } : prev.geoPoint,
    }));
  };

  const handleMainPosterSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMainPosterFile(file);
      setMainPoster(await compressImageToDataUrl(file));
    }
  };

  const handleAiAnalyze = async () => {
    if (!mainPosterFile && !aiText.trim()) {
      alert('포스터 이미지나 안내 텍스트를 먼저 입력해주세요.');
      return;
    }
    setAiLoading(true);
    setAiStatus({ type: 'loading', message: 'AI가 분석 중입니다...' });
    try {
      let base64Data = '', mimeType = 'image/jpeg';
      if (mainPosterFile) {
        mimeType = mainPosterFile.type || 'image/jpeg';
        base64Data = (await compressImageToDataUrl(mainPosterFile)).split(',')[1];
      }
      let apiKey = user ? await getPersonalGeminiKey(user.id) : null;
      let isPersonalKey = !!apiKey;
      if (!isPersonalKey) {
        const today = new Date().toISOString().split('T')[0];
        const usageData = JSON.parse(localStorage.getItem('ai_usage_stats') || '{"date":"","count":0}');
        if (usageData.date !== today) { usageData.date = today; usageData.count = 0; }
        if (usageData.count >= 5) {
          setAiStatus({ type: 'error', message: '일일 무료 한도 초과. 개인 API 키를 등록해주세요.' });
          setAiLoading(false); return;
        }
        usageData.count += 1;
        localStorage.setItem('ai_usage_stats', JSON.stringify(usageData));
      }
      const data = await analyzeEventPoster({ imageBase64: base64Data, mimeType, additionalText: aiText, apiKey });
      if (data) {
        setFormData(prev => ({
          ...prev,
          title: data.title || prev.title,
          description: data.description || prev.description,
          category: data.category || prev.category,
          date: data.date || prev.date,
          time: data.time || prev.time,
          endDate: data.endDate || data.date || prev.endDate,
          endTime: data.endTime || (data.time ? '23:59' : prev.endTime),
          locationName: data.locationName || prev.locationName,
          formattedAddress: data.formattedAddress || prev.formattedAddress,
          city: data.city || prev.city,
          country: data.country || prev.country,
          maxAttendees: data.maxAttendees || prev.maxAttendees,
          djs: data.djs?.length > 0 ? data.djs : prev.djs,
          performances: data.performances?.length > 0 ? data.performances : prev.performances,
          media: data.media?.length > 0 ? data.media : prev.media,
          tickets: data.tickets?.length > 0 ? data.tickets : prev.tickets,
          workshops: data.workshops?.length > 0 ? data.workshops : prev.workshops,
        }));
        setAiStatus({ type: 'success', message: '폼이 자동으로 채워졌습니다!' });
        setTimeout(() => setAiStatus({ type: null, message: '' }), 4000);
      }
    } catch (err: any) {
      setAiStatus({ type: 'error', message: err.message || 'AI 분석 중 오류가 발생했습니다.' });
      setTimeout(() => setAiStatus({ type: null, message: '' }), 5000);
    } finally {
      setAiLoading(false);
    }
  };

  const handleImageUpload = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const slots = 9 - images.length;
    if (slots <= 0) { alert('최대 9장까지 가능합니다.'); return; }
    try {
      setLoading(true);
      const urls = await Promise.all(arr.slice(0, slots).map(f => uploadImageToStorage(f, 'events')));
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
      const { data: newParty, error } = await supabase.from('parties').insert({
        title: formData.title, description: formData.description, category: formData.category,
        date: startDate.toISOString(), end_date: endDate.toISOString(),
        location_name: formData.locationName, formatted_address: formData.formattedAddress,
        city: formData.city, country: formData.country, lat: formData.geoPoint?.lat, lng: formData.geoPoint?.lng,
        image_url: finalImg, host_id: user.id, status: 'pending', max_attendees: Number(formData.maxAttendees),
        price: formData.tickets[0]?.price || 0, djs: formData.djs, performances: formData.performances,
        media: formData.media, workshops: formData.workshops, tickets: formData.tickets, payment_method: formData.paymentMethod,
        payment_link: formData.paymentLink, youtube_url: formData.youtubeUrl,
      }).select().single();
      if (error) throw error;
      if (newParty && images.length > 0) {
        await supabase.from('event_photos').insert(images.map(url => ({ event_id: newParty.id, image_url: url, user_id: user.id })));
      }
      // 행사 주소를 장소 관리 승인 대기 목록에 자동 접수
      if (newParty && formData.locationName && formData.formattedAddress) {
        const { data: existing } = await supabase
          .from('places')
          .select('id')
          .ilike('name', formData.locationName.trim())
          .maybeSingle();
        if (!existing) {
          await supabase.from('places').insert({
            name: formData.locationName,
            address: formData.formattedAddress,
            country: formData.country || '대한민국',
            submitted_by: user.id,
            source_type: 'party',
            source_event_id: newParty.id,
            is_approved: false,
          });
        }
      }
      navigate('/');
    } catch (err) { handleSupabaseError(err, 'create', 'parties', user.id); } finally { setLoading(false); }
  };

  const handleChange = (e: any) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <div className="min-h-screen pb-32 sm:pb-16">
      <input type="file" accept="image/*" className="hidden" ref={mainPosterInputRef} onChange={handleMainPosterSelect} />
      <input type="file" multiple accept="image/*" className="hidden" ref={multiFileInputRef} onChange={e => e.target.files && handleImageUpload(e.target.files)} />

      {/* 헤더 */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
            뒤로가기
          </button>
          <span className="text-sm font-bold text-slate-900 dark:text-white">새로운 행사 만들기</span>
          <div className="w-16" />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="max-w-5xl mx-auto px-4 pt-6 pb-4">
          {/* 페이지 타이틀 */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              새로운 행사 <span className="text-indigo-600">만들기</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-medium">AI 분석으로 포스터 정보를 자동 입력하거나, 직접 작성하세요.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">

            {/* ── 왼쪽: AI 분석 + 추가 사진 ── */}
            <div className="space-y-5">

              {/* AI 분석 카드 */}
              <div className={clsx(sectionCls)}>
                <SectionHeader num="AI" icon={<Sparkles className="w-4 h-4 text-indigo-500" />} title="AI 자동 분석" />

                {/* 포스터 업로드 */}
                <div>
                  <label className={labelCls}>대표 포스터 이미지</label>
                  <button
                    type="button"
                    onClick={() => mainPosterInputRef.current?.click()}
                    className={clsx(
                      'w-full rounded-xl overflow-hidden border-2 border-dashed transition-all',
                      mainPoster
                        ? 'border-indigo-300 dark:border-indigo-700'
                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50 dark:bg-slate-800/50'
                    )}
                  >
                    {mainPoster ? (
                      <div className="relative group">
                        <img src={mainPoster} alt="poster" className="w-full aspect-[3/4] object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-sm font-bold">이미지 변경</span>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-[3/4] flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-slate-500 p-6">
                        <ImageIcon className="w-10 h-10" />
                        <div className="text-center">
                          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">포스터 업로드</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">클릭하여 이미지 선택</p>
                        </div>
                      </div>
                    )}
                  </button>
                </div>

                {/* 텍스트 입력 */}
                <div>
                  <label className={labelCls}>공지 텍스트 (선택)</label>
                  <textarea
                    value={aiText}
                    onChange={e => setAiText(e.target.value)}
                    placeholder="공지글을 복사해서 붙여넣으면 AI가 포스터와 함께 분석합니다."
                    rows={4}
                    className={clsx(inputCls, 'resize-none')}
                  />
                </div>

                {/* AI 분석 버튼 */}
                <button
                  type="button"
                  onClick={handleAiAnalyze}
                  disabled={aiLoading || (!mainPoster && !aiText.trim())}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold text-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed"
                >
                  {aiLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> 분석 중...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> AI로 자동 채우기</>
                  )}
                </button>

                {/* AI 상태 메시지 */}
                <AnimatePresence>
                  {aiStatus.type && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className={clsx(
                        'flex items-center gap-2 p-3 rounded-xl text-sm font-semibold',
                        aiStatus.type === 'loading' && 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300',
                        aiStatus.type === 'success' && 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
                        aiStatus.type === 'error' && 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300',
                      )}
                    >
                      {aiStatus.type === 'loading' && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                      {aiStatus.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                      {aiStatus.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
                      {aiStatus.message}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 추가 사진 카드 */}
              <div className={sectionCls}>
                <div className="flex items-center justify-between">
                  <SectionHeader num="📷" icon={<Camera className="w-4 h-4 text-slate-500" />} title="추가 현장 사진" />
                  <span className="text-xs text-slate-400 font-medium">{images.length}/9</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {images.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                      <img src={img} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {images.length < 9 && (
                    <button
                      type="button"
                      onClick={() => multiFileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="text-[10px] font-bold">추가</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── 오른쪽: 폼 전체 ── */}
            <div className="space-y-5">

              {/* 01 기본 정보 */}
              <div className={sectionCls}>
                <SectionHeader num="01" icon={<FileText className="w-4 h-4 text-slate-500" />} title="기본 정보" />

                <div>
                  <label className={labelCls}>행사명 <span className="text-rose-500">*</span></label>
                  <input
                    required
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="행사 이름을 입력하세요"
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>카테고리</label>
                    <select name="category" value={formData.category} onChange={handleChange} className={inputCls}>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>최대 인원</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1" max="500" step="10"
                        name="maxAttendees"
                        value={formData.maxAttendees}
                        onChange={handleChange}
                        className="flex-1 accent-indigo-600"
                      />
                      <span className="text-sm font-bold text-indigo-600 w-14 text-right tabular-nums">{formData.maxAttendees}명</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>행사 설명 <span className="text-rose-500">*</span></label>
                  <textarea
                    required
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="행사 소개, 커리큘럼, 환불 규정 등을 작성해주세요."
                    rows={6}
                    className={clsx(inputCls, 'resize-y')}
                  />
                </div>
              </div>

              {/* 02 날짜 & 시간 */}
              <div className={sectionCls}>
                <SectionHeader num="02" icon={<Calendar className="w-4 h-4 text-slate-500" />} title="날짜 및 시간" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>시작 날짜 <span className="text-rose-500">*</span></label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>시작 시간 <span className="text-rose-500">*</span></label>
                    <input type="time" name="time" value={formData.time} onChange={handleChange} required className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>
                      종료 날짜
                      <span className="ml-1.5 text-xs font-medium text-slate-400">(선택)</span>
                    </label>
                    <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>
                      종료 시간
                      <span className="ml-1.5 text-xs font-medium text-slate-400">(선택)</span>
                    </label>
                    <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className={inputCls} />
                  </div>
                </div>
              </div>

              {/* 03 장소 */}
              <div className={sectionCls}>
                <SectionHeader num="03" icon={<MapPin className="w-4 h-4 text-slate-500" />} title="장소" />
                {isLoaded ? (
                  <PlaceSearch
                    onPlaceSelect={handlePlaceSelect}
                    defaultValue={formData.locationName}
                    onInputChange={v => setFormData(p => ({ ...p, locationName: v }))}
                  />
                ) : (
                  <div className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                )}
                {formData.formattedAddress && (
                  <div className="flex items-start gap-2 px-3 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {formData.formattedAddress}
                  </div>
                )}
              </div>

              {/* 04 티켓 & 결제 */}
              <div className={sectionCls}>
                <div className="flex items-center justify-between">
                  <SectionHeader num="04" icon={<CreditCard className="w-4 h-4 text-slate-500" />} title="티켓 및 결제" />
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, tickets: [...p.tickets, { name: '', price: 0 }] }))}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                  >
                    <Plus className="w-3.5 h-3.5" /> 티켓 추가
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.tickets.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <input
                        value={t.name}
                        onChange={e => { const ts = [...formData.tickets]; ts[i] = { ...ts[i], name: e.target.value }; setFormData(p => ({ ...p, tickets: ts })); }}
                        placeholder="티켓 이름"
                        className="flex-1 min-w-0 bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-slate-400 font-medium">₩</span>
                        <input
                          type="number"
                          value={t.price}
                          onChange={e => { const ts = [...formData.tickets]; ts[i] = { ...ts[i], price: Number(e.target.value) }; setFormData(p => ({ ...p, tickets: ts })); }}
                          className="w-24 text-right text-sm font-bold text-slate-900 dark:text-white bg-transparent outline-none tabular-nums"
                          placeholder="0"
                        />
                      </div>
                      {formData.tickets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, tickets: p.tickets.filter((_, idx) => idx !== i) }))}
                          className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className={labelCls}>
                      <ExternalLink className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                      온라인 예매 링크
                    </label>
                    <input type="url" name="paymentLink" value={formData.paymentLink} onChange={handleChange} placeholder="https://..." className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>
                      <CreditCard className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                      입금 계좌
                    </label>
                    <input type="text" name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} placeholder="은행명 계좌번호 (예금주)" className={inputCls} />
                  </div>
                </div>
              </div>

              {/* 05 아티스트 라인업 */}
              <div className={sectionCls}>
                <SectionHeader num="05" icon={<Music className="w-4 h-4 text-slate-500" />} title="아티스트 라인업" />

                {/* 워크샵 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-cyan-500" /> 워크샵
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, workshops: [...p.workshops, { teacher: '', topic: '', time: '' }] }))}
                      className="text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> 추가
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.workshops.map((ws, i) => (
                      <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400">Workshop {i + 1}</span>
                          <button type="button" onClick={() => setFormData(p => ({ ...p, workshops: p.workshops.filter((_, idx) => idx !== i) }))} className="text-slate-300 hover:text-rose-500 transition-colors"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input value={ws.teacher} onChange={e => { const w = [...formData.workshops]; w[i] = { ...w[i], teacher: e.target.value }; setFormData(p => ({ ...p, workshops: w })); }} placeholder="강사 이름" className={clsx(inputCls, 'text-sm')} />
                          <input value={ws.time} onChange={e => { const w = [...formData.workshops]; w[i] = { ...w[i], time: e.target.value }; setFormData(p => ({ ...p, workshops: w })); }} placeholder="시간 (예: 19:00~20:00)" className={clsx(inputCls, 'text-sm')} />
                          <input value={ws.topic} onChange={e => { const w = [...formData.workshops]; w[i] = { ...w[i], topic: e.target.value }; setFormData(p => ({ ...p, workshops: w })); }} placeholder="주제/커리큘럼" className={clsx(inputCls, 'text-sm sm:col-span-2')} />
                        </div>
                      </div>
                    ))}
                    {formData.workshops.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-3">등록된 워크샵이 없습니다.</p>
                    )}
                  </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                {/* DJ + 퍼포머 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Music className="w-4 h-4 text-indigo-500" /> DJ 라인업
                      </label>
                      <button type="button" onClick={() => setFormData(p => ({ ...p, djs: [...p.djs, ''] }))} className="text-xs font-bold text-indigo-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"><Plus className="w-3 h-3" /> 추가</button>
                    </div>
                    <div className="space-y-2">
                      {formData.djs.map((dj, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input value={dj} onChange={e => { const arr = [...formData.djs]; arr[i] = e.target.value; setFormData(p => ({ ...p, djs: arr })); }} placeholder="DJ 이름" className={clsx(inputCls, 'text-sm')} />
                          <button type="button" onClick={() => setFormData(p => ({ ...p, djs: p.djs.filter((_, idx) => idx !== i) }))} className="text-slate-300 hover:text-rose-500 shrink-0 transition-colors"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                      {formData.djs.length === 0 && <p className="text-xs text-slate-400 py-1">없음</p>}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Mic2 className="w-4 h-4 text-rose-500" /> 퍼포머
                      </label>
                      <button type="button" onClick={() => setFormData(p => ({ ...p, performances: [...p.performances, ''] }))} className="text-xs font-bold text-rose-500 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"><Plus className="w-3 h-3" /> 추가</button>
                    </div>
                    <div className="space-y-2">
                      {formData.performances.map((p, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input value={p} onChange={e => { const arr = [...formData.performances]; arr[i] = e.target.value; setFormData(p2 => ({ ...p2, performances: arr })); }} placeholder="팀/아티스트 이름" className={clsx(inputCls, 'text-sm')} />
                          <button type="button" onClick={() => setFormData(p2 => ({ ...p2, performances: p2.performances.filter((_, idx) => idx !== i) }))} className="text-slate-300 hover:text-rose-500 shrink-0 transition-colors"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                      {formData.performances.length === 0 && <p className="text-xs text-slate-400 py-1">없음</p>}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-violet-500" /> 미디어팀
                      </label>
                      <button type="button" onClick={() => setFormData(p => ({ ...p, media: [...p.media, ''] }))} className="text-xs font-bold text-violet-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"><Plus className="w-3 h-3" /> 추가</button>
                    </div>
                    <div className="space-y-2">
                      {formData.media.map((m, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input value={m} onChange={e => { const arr = [...formData.media]; arr[i] = e.target.value; setFormData(p => ({ ...p, media: arr })); }} placeholder="미디어팀/사진작가 이름" className={clsx(inputCls, 'text-sm')} />
                          <button type="button" onClick={() => setFormData(p => ({ ...p, media: p.media.filter((_, idx) => idx !== i) }))} className="text-slate-300 hover:text-rose-500 shrink-0 transition-colors"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                      {formData.media.length === 0 && <p className="text-xs text-slate-400 py-1">없음</p>}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* 하단 고정 푸터 */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-none sm:min-w-[200px] flex items-center justify-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 등록 중...</> : '행사 등록하기 →'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
