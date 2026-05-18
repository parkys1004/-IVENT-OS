import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { handleSupabaseError, OperationType } from '../lib/supabaseError';
import PlaceSearch from '../components/PlaceSearch';
import {
  Calendar, MapPin, FileText, Sparkles, X,
  ImageIcon, Plus, Music, CreditCard,
  GraduationCap, ExternalLink, Upload, Camera,
  ChevronLeft, Mic2, CheckCircle2, AlertCircle,
  Loader2, Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
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
  { value: 'sal_ba_ki', label: '살바키' },
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

export default function EditEvent() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const aiPosterInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiPoster, setAiPoster] = useState<string | null>(null);
  const [aiPosterFile, setAiPosterFile] = useState<File | null>(null);
  const [aiStatus, setAiStatus] = useState<{ type: 'loading' | 'error' | 'success' | null; message: string }>({ type: null, message: '' });
  const [eventData, setEventData] = useState<any>(null);
  const [images, setImages] = useState<string[]>([]);
  const [coverImageIndex, setCoverImageIndex] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [sourceTable, setSourceTable] = useState<'parties' | 'lessons'>('parties');

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
    mediaExperts: [] as string[],
    workshops: [] as { teacher: string; topic: string; time: string }[],
    paymentMethod: '',
    paymentLink: '',
    youtubeUrl: '',
    tickets: [{ name: '일반 예매', price: 0 }] as { name: string; price: number }[],
  });

  const { isLoaded } = useGoogleMaps();

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

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      try {
        const EDIT_EVENT_COLS = 'id, host_id, title, description, category, date, end_date, location_name, formatted_address, country, city, lat, lng, image_url, max_attendees, capacity, djs, performances, media, media_experts, workshops, payment_method, payment_link, youtube_url, tickets';
        let { data, error } = await supabase
          .from('parties')
          .select(EDIT_EVENT_COLS)
          .eq('id', id)
          .maybeSingle();

        if (data) {
          setSourceTable('parties');
        } else {
          const { data: lessonData } = await supabase
            .from('lessons')
            .select('id, host_id, title, description, category, date, end_date, class_time, location_name, formatted_address, country, city, lat, lng, image_url, max_attendees, payment_method, youtube_url, tickets, level')
            .eq('id', id)
            .maybeSingle();
          if (lessonData) {
            setSourceTable('lessons');
            data = lessonData as any;
          }
        }

        if (error) throw error;
        if (data) {
          if ((data as any).host_id !== user?.id && profile?.role !== 'admin') {
            alert('수정 권한이 없습니다.');
            navigate(`/event/${id}`);
            return;
          }

          setEventData(data as any);

          const startDateObj = (data as any).date ? new Date((data as any).date) : new Date();
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
            tickets: data.tickets?.length > 0 ? data.tickets : [{ name: '일반 예매', price: 0 }],
          });

          const { data: photos } = await supabase
            .from('event_photos')
            .select('image_url')
            .eq('event_id', id);
          const photoUrls = photos ? photos.map((p: any) => p.image_url) : [];
          const loadedImages = [
            ...(data.image_url && !photoUrls.includes(data.image_url) ? [data.image_url] : []),
            ...photoUrls,
          ];
          setImages(loadedImages);
          setCoverImageIndex(0);
        } else {
          alert('내역을 찾을 수 없습니다.');
          navigate('/');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id, navigate]);

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
      const { data: { session: aiSession } } = await supabase.auth.getSession();
      const proxyResponse = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(aiSession?.access_token ? { 'Authorization': `Bearer ${aiSession.access_token}` } : {}),
        },
        body: JSON.stringify({ imageBase64: base64Data, mimeType, additionalText: aiText, ...(isPersonalKey && apiKey ? { personalApiKey: apiKey } : {}) }),
      });
      const rawText = await proxyResponse.text();
      let parsed: any = {};
      try { if (rawText) parsed = JSON.parse(rawText); } catch { throw new Error('서버 응답을 처리할 수 없습니다.'); }
      if (!proxyResponse.ok) throw new Error(parsed.error || `서버 오류 (${proxyResponse.status})`);
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
          endTime: parsed.endTime || (parsed.time ? '23:59' : prev.endTime),
          locationName: parsed.locationName || prev.locationName,
          formattedAddress: parsed.formattedAddress || prev.formattedAddress,
          city: parsed.city || prev.city,
          country: parsed.country || prev.country,
          maxAttendees: parsed.maxAttendees || prev.maxAttendees,
          paymentLink: parsed.paymentLink || prev.paymentLink,
          djs: parsed.djs?.length > 0 ? parsed.djs : prev.djs,
          performances: parsed.performances?.length > 0 ? parsed.performances : prev.performances,
          mediaExperts: parsed.media?.length > 0 ? parsed.media : prev.mediaExperts,
          tickets: parsed.tickets?.length > 0 ? parsed.tickets : prev.tickets,
          workshops: parsed.workshops?.length > 0 ? parsed.workshops : prev.workshops,
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
    const fileArray = Array.from(files);
    const slots = 10 - images.length;
    if (slots <= 0) { alert('최대 10장까지 가능합니다.'); return; }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const valid = fileArray.slice(0, slots).filter(f => {
      if (!allowed.includes(f.type)) { alert(`${f.name}은(는) 지원하지 않는 형식입니다.`); return false; }
      return true;
    });
    try {
      setSubmitting(true);
      const urls = await Promise.all(valid.map(f => uploadImageToStorage(f, 'events')));
      setImages(prev => [...prev, ...urls]);
    } catch (e) {
      console.error(e);
      alert('이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
      if (multiFileInputRef.current) multiFileInputRef.current.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleImageUpload(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    if (coverImageIndex === index) setCoverImageIndex(0);
    else if (coverImageIndex > index) setCoverImageIndex(p => p - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !id) return;
    const { data: latestProfile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const isAdmin = profile?.role === 'admin' || latestProfile?.role === 'admin';
    setSubmitting(true);
    try {
      const startDate = new Date(`${formData.date}T${formData.time}`);
      const endDate = new Date(`${formData.endDate || formData.date}T${formData.endTime || '23:59'}`);
      const mainImageUrl = images.length > 0 ? images[coverImageIndex] : formData.imageUrl;
      const newStatus = isAdmin ? eventData.status : 'pending';

      let updateError;
      if (sourceTable === 'lessons') {
        const { error } = await supabase.from('lessons').update({
          title: formData.title, description: formData.description, category: formData.category,
          date: startDate.toISOString(), end_date: endDate.toISOString(), class_time: formData.time,
          location_name: formData.locationName, formatted_address: formData.formattedAddress,
          city: formData.city, country: formData.country, lat: formData.geoPoint?.lat, lng: formData.geoPoint?.lng,
          image_url: mainImageUrl, status: newStatus, max_attendees: Number(formData.maxAttendees),
          price: formData.tickets[0]?.price || 0, tickets: formData.tickets.filter(t => t.name.trim()),
          payment_method: formData.paymentMethod, payment_link: formData.paymentLink, youtube_url: formData.youtubeUrl,
        }).eq('id', id);
        updateError = error;
      } else {
        const { error } = await supabase.from('parties').update({
          title: formData.title, description: formData.description, category: formData.category,
          date: startDate.toISOString(), end_date: endDate.toISOString(),
          location_name: formData.locationName, formatted_address: formData.formattedAddress,
          city: formData.city, country: formData.country, lat: formData.geoPoint?.lat, lng: formData.geoPoint?.lng,
          image_url: mainImageUrl, status: newStatus, max_attendees: Number(formData.maxAttendees),
          price: formData.tickets[0]?.price || 0,
          djs: formData.djs.filter(d => d.trim()),
          performances: formData.performances.filter(p => p.trim()),
          media_experts: formData.mediaExperts.filter(m => m.trim()),
          workshops: formData.workshops.filter(w => w.teacher.trim() || w.topic.trim()),
          tickets: formData.tickets.filter(t => t.name.trim()),
          payment_method: formData.paymentMethod, payment_link: formData.paymentLink, youtube_url: formData.youtubeUrl,
        }).eq('id', id);
        updateError = error;
      }
      if (updateError) throw updateError;

      await supabase.from('event_photos').delete().eq('event_id', id);
      if (images.length > 0) {
        await supabase.from('event_photos').insert(
          images.map(url => ({ event_id: id, image_url: url, user_id: user.id }))
        );
      }
      navigate(`/event/${id}`);
    } catch (err: any) {
      handleSupabaseError(err, OperationType.UPDATE, sourceTable, user?.id || '');
      alert('수정 중 오류가 발생했습니다.');
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
      <input type="file" multiple accept="image/*" className="hidden" ref={multiFileInputRef} onChange={e => e.target.files && handleImageUpload(e.target.files)} />

      {/* 헤더 */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
            뒤로가기
          </button>
          <span className="text-sm font-bold text-slate-900 dark:text-white">행사 수정하기</span>
          <div className="w-16" />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="max-w-5xl mx-auto px-4 pt-6 pb-4">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              행사 <span className="text-indigo-600">수정하기</span>
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

              {/* 이벤트 이미지 카드 */}
              <div className={sectionCls}>
                <div className="flex items-center justify-between">
                  <SectionHeader num="📸" icon={<Camera className="w-4 h-4 text-slate-500" />} title="이벤트 이미지" />
                  <span className="text-xs text-slate-400 font-medium">{images.length}/10</span>
                </div>

                {/* 메인 커버 */}
                <div
                  className={clsx(
                    'relative rounded-xl overflow-hidden border-2 border-dashed cursor-pointer transition-all aspect-[3/4]',
                    dragActive ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  )}
                  onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                  onClick={() => multiFileInputRef.current?.click()}
                >
                  {images.length > 0 ? (
                    <>
                      <img src={images[coverImageIndex]} alt="cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <span className="text-white text-sm font-bold">이미지 추가</span>
                        <span className="text-white/70 text-xs">드래그 또는 클릭</span>
                      </div>
                      <div className="absolute top-2 left-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-full">COVER</div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 p-6">
                      <Upload className="w-8 h-8" />
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">이미지 업로드</p>
                        <p className="text-xs text-slate-400 mt-0.5">드래그하거나 클릭하세요</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 썸네일 스트립 */}
                {images.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        className={clsx(
                          'relative shrink-0 w-16 aspect-[3/4] rounded-lg overflow-hidden border-2 cursor-pointer transition-all',
                          coverImageIndex === idx ? 'border-indigo-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                        )}
                        onClick={() => setCoverImageIndex(idx)}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); removeImage(idx); }}
                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 text-white rounded flex items-center justify-center hover:bg-rose-500 transition-colors"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                    {images.length < 10 && (
                      <button
                        type="button"
                        onClick={() => multiFileInputRef.current?.click()}
                        className="shrink-0 w-16 aspect-[3/4] rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── 오른쪽: 폼 섹션들 ── */}
            <div className="space-y-5">

              {/* 01 기본 정보 */}
              <div className={sectionCls}>
                <SectionHeader num="01" icon={<FileText className="w-4 h-4 text-slate-500" />} title="기본 정보" />

                <div>
                  <label className={labelCls}>행사명 <span className="text-rose-500">*</span></label>
                  <input required name="title" value={formData.title} onChange={handleChange} placeholder="행사 이름을 입력하세요" className={inputCls} />
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
                    <div className="flex items-center gap-3 pt-1">
                      <input type="range" min="1" max="500" step="10" name="maxAttendees" value={formData.maxAttendees} onChange={handleChange} className="flex-1 accent-indigo-600" />
                      <span className="text-sm font-bold text-indigo-600 w-14 text-right tabular-nums">{formData.maxAttendees}명</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>행사 설명 <span className="text-rose-500">*</span></label>
                  <textarea required name="description" value={formData.description} onChange={handleChange} placeholder="행사 소개, 커리큘럼, 환불 규정 등을 작성해주세요." rows={6} className={clsx(inputCls, 'resize-y')} />
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
                  <PlaceSearch onPlaceSelect={handlePlaceSelect} defaultValue={formData.locationName} />
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
                      <ExternalLink className="w-3.5 h-3.5 inline mr-1 text-slate-400" />온라인 예매 링크
                    </label>
                    <input type="url" name="paymentLink" value={formData.paymentLink} onChange={handleChange} placeholder="https://..." className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>
                      <CreditCard className="w-3.5 h-3.5 inline mr-1 text-slate-400" />입금 계좌
                    </label>
                    <input type="text" name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} placeholder="은행명 계좌번호 (예금주)" className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>유튜브 홍보 영상 URL</label>
                  <input type="url" name="youtubeUrl" value={formData.youtubeUrl} onChange={handleChange} placeholder="https://www.youtube.com/watch?v=..." className={inputCls} />
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
                          <button type="button" onClick={() => setFormData(p => ({ ...p, workshops: p.workshops.filter((_, idx) => idx !== i) }))} className="text-slate-300 hover:text-rose-500 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
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
                      <button type="button" onClick={() => setFormData(p => ({ ...p, djs: [...p.djs, ''] }))} className="text-xs font-bold text-indigo-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                        <Plus className="w-3 h-3" /> 추가
                      </button>
                    </div>
                    <div className="space-y-2">
                      {formData.djs.map((dj, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input value={dj} onChange={e => { const arr = [...formData.djs]; arr[i] = e.target.value; setFormData(p => ({ ...p, djs: arr })); }} placeholder="DJ 이름" className={clsx(inputCls, 'text-sm')} />
                          <button type="button" onClick={() => setFormData(p => ({ ...p, djs: p.djs.filter((_, idx) => idx !== i) }))} className="text-slate-300 hover:text-rose-500 shrink-0 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
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
                      <button type="button" onClick={() => setFormData(p => ({ ...p, performances: [...p.performances, ''] }))} className="text-xs font-bold text-rose-500 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                        <Plus className="w-3 h-3" /> 추가
                      </button>
                    </div>
                    <div className="space-y-2">
                      {formData.performances.map((perf, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input value={perf} onChange={e => { const arr = [...formData.performances]; arr[i] = e.target.value; setFormData(p2 => ({ ...p2, performances: arr })); }} placeholder="팀/아티스트 이름" className={clsx(inputCls, 'text-sm')} />
                          <button type="button" onClick={() => setFormData(p2 => ({ ...p2, performances: p2.performances.filter((_, idx) => idx !== i) }))} className="text-slate-300 hover:text-rose-500 shrink-0 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {formData.performances.length === 0 && <p className="text-xs text-slate-400 py-1">없음</p>}
                    </div>
                  </div>
                </div>

                {/* 미디어 팀 (parties only) */}
                {sourceTable === 'parties' && (
                  <>
                    <div className="h-px bg-slate-100 dark:bg-slate-800" />
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Camera className="w-4 h-4 text-emerald-500" /> 미디어 팀
                        </label>
                        <button type="button" onClick={() => setFormData(p => ({ ...p, mediaExperts: [...p.mediaExperts, ''] }))} className="text-xs font-bold text-emerald-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                          <Plus className="w-3 h-3" /> 추가
                        </button>
                      </div>
                      <div className="space-y-2">
                        {formData.mediaExperts.map((m, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input value={m} onChange={e => { const arr = [...formData.mediaExperts]; arr[i] = e.target.value; setFormData(p => ({ ...p, mediaExperts: arr })); }} placeholder="포토/영상 작가 이름" className={clsx(inputCls, 'text-sm')} />
                            <button type="button" onClick={() => setFormData(p => ({ ...p, mediaExperts: p.mediaExperts.filter((_, idx) => idx !== i) }))} className="text-slate-300 hover:text-rose-500 shrink-0 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {formData.mediaExperts.length === 0 && <p className="text-xs text-slate-400 py-1">없음</p>}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 하단 고정 푸터 */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> 삭제
            </button>
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
                disabled={submitting}
                className="flex items-center justify-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all"
              >
                {submitting
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
