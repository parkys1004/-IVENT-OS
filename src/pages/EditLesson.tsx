import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { handleSupabaseError } from '../lib/supabaseError';
import PlaceSearch from '../components/PlaceSearch';
import {
  Calendar, MapPin, FileText, Sparkles, X,
  ImageIcon, Plus, CreditCard, ExternalLink,
  ChevronLeft, CheckCircle2, AlertCircle,
  Loader2, GraduationCap, Upload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGoogleMaps } from '../context/GoogleMapsContext';
import { uploadImageToStorage, compressImageToDataUrl } from '../lib/storage';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const LESSON_CATEGORIES = [
  { value: 'lesson', label: '강습 (일반)' },
  { value: 'salsa', label: '살사 강습' },
  { value: 'bachata', label: '바차타 강습' },
  { value: 'kizomba', label: '키좀바 강습' },
  { value: 'salsa_bachata', label: '살사/바차타 강습' },
  { value: 'sal_ba_ki', label: '살바키 강습' },
];

const LEVELS = [
  { value: 'beginner', label: '초급 (입문)' },
  { value: 'intermediate', label: '중급' },
  { value: 'advanced', label: '고급' },
  { value: 'all', label: '모든 레벨' },
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

export default function EditLesson() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const aiPosterInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiPoster, setAiPoster] = useState<string | null>(null);
  const [aiPosterFile, setAiPosterFile] = useState<File | null>(null);
  const [aiStatus, setAiStatus] = useState<{ type: 'loading' | 'error' | 'success' | null; message: string }>({ type: null, message: '' });

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
    geoPoint: null as { lat: number; lng: number } | null,
    imageUrl: '',
    maxAttendees: 20,
    paymentMethod: '',
    paymentLink: '',
    youtubeUrl: '',
    tickets: [{ name: '강습비', price: 0 }] as { name: string; price: number }[],
    level: 'beginner',
  });

  const { isLoaded } = useGoogleMaps();

  useEffect(() => {
    if (!id || !user) return;
    const fetchLesson = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('lessons')
          .select('id, host_id, title, description, category, date, end_date, class_time, location_name, formatted_address, country, city, lat, lng, image_url, max_attendees, payment_method, youtube_url, tickets, level')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        if (!data) { alert('강습 정보를 찾을 수 없습니다.'); navigate('/'); return; }
        if (data.host_id !== user.id && profile?.role !== 'admin') {
          alert('수정 권한이 없습니다.'); navigate(`/event/${id}`); return;
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
          paymentLink: '',
          youtubeUrl: data.youtube_url || '',
          tickets: data.tickets?.length > 0 ? data.tickets : [{ name: '강습비', price: 0 }],
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

  const handleAiPosterSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAiPosterFile(file);
      setAiPoster(await compressImageToDataUrl(file));
    }
  };

  const handleAiAnalyze = async () => {
    if (!aiPosterFile && !aiText.trim()) {
      alert('포스터 이미지나 안내 텍스트를 먼저 입력해주세요.');
      return;
    }
    setAiLoading(true);
    setAiStatus({ type: 'loading', message: 'AI가 분석 중입니다...' });
    try {
      let base64Data = '', mimeType = 'image/jpeg';
      if (aiPosterFile) {
        mimeType = aiPosterFile.type || 'image/jpeg';
        base64Data = (await compressImageToDataUrl(aiPosterFile)).split(',')[1];
      }
      let apiKey = localStorage.getItem('user_gemini_api_key');
      let isPersonalKey = !!apiKey;
      if (!apiKey && user) {
        const { data: aiConfig } = await supabase.from('user_ai_configs').select('api_key').eq('user_id', user.id).maybeSingle();
        if (aiConfig?.api_key) { apiKey = aiConfig.api_key; isPersonalKey = true; }
      }
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
      const proxyResponse = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Data, mimeType, additionalText: aiText, ...(isPersonalKey && apiKey ? { personalApiKey: apiKey } : {}) }),
      });
      const rawText = await proxyResponse.text();
      let parsed: any = {};
      try { if (rawText) parsed = JSON.parse(rawText); } catch { throw new Error('서버 응답을 처리할 수 없습니다.'); }
      if (!proxyResponse.ok) throw new Error(parsed.error || `서버 오류 (${proxyResponse.status})`);
      if (parsed) {
        const validCategories = ['lesson', 'salsa', 'bachata', 'kizomba', 'salsa_bachata', 'sal_ba_ki'];
        const validLevels = ['beginner', 'intermediate', 'advanced', 'all'];
        setFormData(prev => ({
          ...prev,
          title: parsed.title || prev.title,
          description: parsed.description || prev.description,
          category: validCategories.includes(parsed.category) ? parsed.category : prev.category,
          level: validLevels.includes(parsed.level) ? parsed.level : prev.level,
          date: parsed.date || prev.date,
          time: parsed.time || prev.time,
          endDate: parsed.endDate || parsed.date || prev.endDate,
          endTime: parsed.endTime || (parsed.time ? '23:59' : prev.endTime),
          locationName: parsed.locationName || prev.locationName,
          formattedAddress: parsed.formattedAddress || prev.formattedAddress,
          city: parsed.city || prev.city,
          country: parsed.country || prev.country,
          maxAttendees: parsed.maxAttendees || prev.maxAttendees,
          tickets: parsed.tickets?.length > 0 ? parsed.tickets : prev.tickets,
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSaving(true);
      const imageUrl = await uploadImageToStorage(file, 'events');
      setFormData(prev => ({ ...prev, imageUrl }));
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    setSaving(true);
    try {
      const startDateTime = new Date(`${formData.date}T${formData.time}`);
      const fallbackEnd = new Date(startDateTime.getTime() + 4 * 60 * 60 * 1000);
      const endDateTime = formData.endDate
        ? new Date(`${formData.endDate}T${formData.endTime || formData.time}`)
        : fallbackEnd;

      const { error } = await supabase.from('lessons').update({
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
        tickets: formData.tickets.filter(t => t.name.trim()),
        payment_method: formData.paymentMethod,
        youtube_url: formData.youtubeUrl,
        updated_at: new Date().toISOString(),
      }).eq('id', id);

      if (error) throw error;
      navigate(`/event/${id}`);
    } catch (err) {
      handleSupabaseError(err, 'update', 'lessons', user.id);
      alert('수정 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: any) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 sm:pb-16">
      <input type="file" accept="image/*" className="hidden" ref={aiPosterInputRef} onChange={handleAiPosterSelect} />
      <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={handleImageUpload} />

      {/* 헤더 */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
            뒤로가기
          </button>
          <span className="text-sm font-bold text-slate-900 dark:text-white">강습 수정하기</span>
          <div className="w-16" />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="max-w-5xl mx-auto px-4 pt-6 pb-4">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              강습 <span className="text-indigo-600">수정하기</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-medium">수정할 내용을 변경하고 업데이트를 완료하세요.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">

            {/* ── 왼쪽 ── */}
            <div className="space-y-5">

              {/* AI 분석 카드 */}
              <div className={sectionCls}>
                <SectionHeader num="AI" icon={<Sparkles className="w-4 h-4 text-indigo-500" />} title="AI 자동 분석" />

                <div>
                  <label className={labelCls}>포스터 이미지 (AI 분석용)</label>
                  <button
                    type="button"
                    onClick={() => aiPosterInputRef.current?.click()}
                    className={clsx(
                      'w-full rounded-xl overflow-hidden border-2 border-dashed transition-all',
                      aiPoster
                        ? 'border-indigo-300 dark:border-indigo-700'
                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50 dark:bg-slate-800/50'
                    )}
                  >
                    {aiPoster ? (
                      <div className="relative group">
                        <img src={aiPoster} alt="poster" className="w-full aspect-[3/4] object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-sm font-bold">이미지 변경</span>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-[3/4] flex flex-col items-center justify-center gap-3 text-slate-400 p-6">
                        <ImageIcon className="w-10 h-10" />
                        <div className="text-center">
                          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">포스터 업로드</p>
                          <p className="text-xs text-slate-400 mt-0.5">클릭하여 이미지 선택</p>
                        </div>
                      </div>
                    )}
                  </button>
                </div>

                <div>
                  <label className={labelCls}>공지 텍스트 (선택)</label>
                  <textarea
                    value={aiText}
                    onChange={e => setAiText(e.target.value)}
                    placeholder="공지글을 붙여넣으면 AI가 분석합니다."
                    rows={4}
                    className={clsx(inputCls, 'resize-none')}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAiAnalyze}
                  disabled={aiLoading || (!aiPoster && !aiText.trim())}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold text-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed"
                >
                  {aiLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> 분석 중...</>
                    : <><Sparkles className="w-4 h-4" /> AI로 자동 채우기</>
                  }
                </button>

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

              {/* 대표 이미지 카드 */}
              <div className={sectionCls}>
                <SectionHeader num="📸" icon={<ImageIcon className="w-4 h-4 text-slate-500" />} title="대표 이미지" />

                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className={clsx(
                    'w-full rounded-xl overflow-hidden border-2 border-dashed transition-all',
                    formData.imageUrl
                      ? 'border-slate-200 dark:border-slate-700'
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-slate-50 dark:bg-slate-800/50'
                  )}
                >
                  {formData.imageUrl ? (
                    <div className="relative group">
                      <img src={formData.imageUrl} alt="cover" className="w-full aspect-[16/9] object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Upload className="w-5 h-5 text-white" />
                        <span className="text-white text-sm font-bold">이미지 교체</span>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-[16/9] flex flex-col items-center justify-center gap-3 text-slate-400 p-6">
                      <Upload className="w-8 h-8" />
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">이미지 업로드</p>
                        <p className="text-xs text-slate-400 mt-0.5">클릭하여 이미지 선택</p>
                      </div>
                    </div>
                  )}
                </button>
                {saving && (
                  <p className="text-xs text-indigo-600 font-semibold flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> 업로드 중...
                  </p>
                )}
              </div>
            </div>

            {/* ── 오른쪽: 폼 섹션들 ── */}
            <div className="space-y-5">

              {/* 01 기본 정보 */}
              <div className={sectionCls}>
                <SectionHeader num="01" icon={<FileText className="w-4 h-4 text-slate-500" />} title="기본 정보" />

                <div>
                  <label className={labelCls}>강습명 <span className="text-rose-500">*</span></label>
                  <input required name="title" value={formData.title} onChange={handleChange} placeholder="예: 초보자를 위한 살사 기초 클래스" className={inputCls} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>카테고리</label>
                    <select name="category" value={formData.category} onChange={handleChange} className={inputCls}>
                      {LESSON_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>
                      <GraduationCap className="w-3.5 h-3.5 inline mr-1 text-cyan-500" />
                      강습 레벨
                    </label>
                    <select name="level" value={formData.level} onChange={handleChange} className={inputCls}>
                      {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>최대 수강 인원</label>
                    <div className="flex items-center gap-3 pt-1">
                      <input type="range" min="1" max="200" step="1" name="maxAttendees" value={formData.maxAttendees} onChange={handleChange} className="flex-1 accent-indigo-600" />
                      <span className="text-sm font-bold text-indigo-600 w-14 text-right tabular-nums">{formData.maxAttendees}명</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>강습 설명 <span className="text-rose-500">*</span></label>
                  <textarea required name="description" value={formData.description} onChange={handleChange} placeholder="강습 커리큘럼, 준비물, 환불 규정 등을 상세히 작성해주세요." rows={6} className={clsx(inputCls, 'resize-y')} />
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
                    <label className={labelCls}>종료 날짜 <span className="ml-1.5 text-xs font-medium text-slate-400">(선택)</span></label>
                    <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>종료 시간 <span className="ml-1.5 text-xs font-medium text-slate-400">(선택)</span></label>
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
                    onInputChange={val => setFormData(prev => ({ ...prev, locationName: val }))}
                    defaultValue={formData.locationName}
                    value={formData.locationName}
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

              {/* 04 강습비 & 결제 */}
              <div className={sectionCls}>
                <div className="flex items-center justify-between">
                  <SectionHeader num="04" icon={<CreditCard className="w-4 h-4 text-slate-500" />} title="강습비 및 결제" />
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, tickets: [...p.tickets, { name: '', price: 0 }] }))}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                  >
                    <Plus className="w-3.5 h-3.5" /> 항목 추가
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.tickets.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <input
                        value={t.name}
                        onChange={e => { const ts = [...formData.tickets]; ts[i] = { ...ts[i], name: e.target.value }; setFormData(p => ({ ...p, tickets: ts })); }}
                        placeholder="강습비 명칭 (예: 기수전체)"
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
                      <ExternalLink className="w-3.5 h-3.5 inline mr-1 text-slate-400" />온라인 예매/신청 링크
                    </label>
                    <input type="url" name="paymentLink" value={formData.paymentLink} onChange={handleChange} placeholder="https://..." className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>유튜브 홍보 영상 URL</label>
                    <input type="url" name="youtubeUrl" value={formData.youtubeUrl} onChange={handleChange} placeholder="https://www.youtube.com/watch?v=..." className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>결제/입금 안내</label>
                  <textarea
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    rows={3}
                    placeholder="예: 우리은행 1002-1234-5678 홍길동 (입금 후 성함 문자로 전송)"
                    className={clsx(inputCls, 'resize-none')}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 고정 푸터 */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all"
              >
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> 저장 중...</>
                  : '수정 완료 →'
                }
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
