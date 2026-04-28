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
import { uploadImageToStorage, compressImageToDataUrl } from '../lib/storage';

import { EventFormLayout } from '../components/events/EventFormLayout';

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
            required: ["title", "description", "category", "date", "time", "locationName", "maxAttendees"]
          }
        }
      });
      
      if (response && response.text) {
        const text = response.text;
        const parsed = JSON.parse(text);
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

    try {
      setLoading(true);
      const newImageUrls = await Promise.all(fileArray.slice(0, availableSlots).map(f => uploadImageToStorage(f, 'events')));
      setImages(prev => [...prev, ...newImageUrls]);
    } catch (error) {
      console.error("Image upload failed: ", error);
    } finally {
      setLoading(false);
      if (multiFileInputRef.current) multiFileInputRef.current.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleImageUpload(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    if (coverImageIndex === index) setCoverImageIndex(0);
    else if (coverImageIndex > index) setCoverImageIndex(prev => prev - 1);
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

      const cost = 0; // Point system could be used here
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
          media_experts: formData.media.filter(m => m.trim()),
          tickets: formData.tickets.filter(t => t.name.trim()),
          payment_method: formData.paymentMethod
        });

      if (error) throw error;
      navigate('/');
    } catch (err) {
      handleSupabaseError(err, 'create', 'parties', user?.id || '');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const updateTicket = (index: number, field: 'name' | 'price', value: string | number) => {
    const newTickets = [...formData.tickets];
    newTickets[index] = { ...newTickets[index], [field]: value };
    setFormData(prev => ({ ...prev, tickets: newTickets }));
  };

  const addLineupItem = (type: 'djs' | 'performances' | 'media') => {
    setFormData(prev => ({ ...prev, [type]: [...prev[type], ''] }));
  };

  const updateLineupItem = (type: 'djs' | 'performances' | 'media', index: number, value: string) => {
    const list = [...formData[type]];
    list[index] = value;
    setFormData(prev => ({ ...prev, [type]: list }));
  };

  const removeLineupItem = (type: 'djs' | 'performances' | 'media', index: number) => {
    setFormData(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== index) }));
  };

  if (loading && !aiLoading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  if (loadError) return <div className="p-10 text-center">지도를 불러올 수 없습니다.</div>;

  return (
    <EventFormLayout
      title="새로운 행사 만들기"
      subtitle="당신의 열정을 공유할 새로운 이벤트를 시작하세요."
      aiLoading={aiLoading}
      onAiAnalyzeClick={() => fileInputRef.current?.click()}
      onSubmit={handleSubmit}
      leftColumn={
        <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAiInputClick} />
          <input type="file" multiple accept="image/*" className="hidden" ref={multiFileInputRef} onChange={(e) => e.target.files && handleImageUpload(e.target.files)} />
          
          {/* Poster Section */}
          <div className="space-y-4">
            <label className="block text-[13px] font-bold text-slate-400 uppercase tracking-widest ml-1">이벤트 포스터 (최대 5장)</label>
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
                    onInputChange={(val) => setFormData(prev => ({ ...prev, locationName: val }))}
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
                  <Music className="w-4 h-4 text-indigo-500" />
                  <span className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">DJ 라인업</span>
                </div>
                <button type="button" onClick={() => addLineupItem('djs')} className="text-[11px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-full">+ 추가</button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {formData.djs.map((dj, idx) => (
                  <div key={idx} className="flex gap-2 items-center animate-in fade-in slide-in-from-left-2">
                    <input type="text" value={dj} onChange={(e) => updateLineupItem('djs', idx, e.target.value)} placeholder="DJ 이름을 입력하세요" className="flex-1 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-5 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    <button type="button" onClick={() => removeLineupItem('djs', idx)} className="p-2 text-slate-300 hover:text-rose-500"><X className="w-4 h-4" /></button>
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
                <button type="button" onClick={() => addLineupItem('performances')} className="text-[11px] font-black text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full">+ 추가</button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {formData.performances.map((perf, idx) => (
                  <div key={idx} className="flex gap-2 items-center animate-in fade-in slide-in-from-left-2">
                    <input type="text" value={perf} onChange={(e) => updateLineupItem('performances', idx, e.target.value)} placeholder="공연팀/댄서 이름을 입력하세요" className="flex-1 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-5 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/20" />
                    <button type="button" onClick={() => removeLineupItem('performances', idx)} className="p-2 text-slate-300 hover:text-rose-500"><X className="w-4 h-4" /></button>
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
                <button type="button" onClick={() => addLineupItem('media')} className="text-[11px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full">+ 추가</button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {formData.media.map((m, idx) => (
                  <div key={idx} className="flex gap-2 items-center animate-in fade-in slide-in-from-left-2">
                    <input type="text" value={m} onChange={(e) => updateLineupItem('media', idx, e.target.value)} placeholder="작가/팀 이름을 입력하세요" className="flex-1 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-5 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    <button type="button" onClick={() => removeLineupItem('media', idx)} className="p-2 text-slate-300 hover:text-rose-500"><X className="w-4 h-4" /></button>
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
           <button type="button" onClick={() => navigate(-1)} className="px-8 py-4 rounded-2xl text-[15px] font-black text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">취소하기</button>
           <button 
              type="submit" 
              disabled={loading} 
              className="group relative px-12 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 opacity-0 group-hover:opacity-10 transition-opacity" />
              {loading ? '행사 등록 중...' : '행사 등록 완료'}
            </button>
        </div>
      }
    />
  );
}

