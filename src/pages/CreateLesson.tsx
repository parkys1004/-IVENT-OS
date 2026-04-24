import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { handleSupabaseError } from '../lib/supabaseError';
import PlaceSearch from '../components/PlaceSearch';
import { Calendar, Clock, MapPin, Users, FileText, Sparkles, Upload, X, Star, ImageIcon as ImageIcon, PlusCircle, MinusCircle, Music, Mic2, CreditCard, Plus, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGoogleMaps } from '../context/GoogleMapsContext';
import { spendPoints, DEFAULT_POINT_POLICIES } from '../lib/points';
import clsx from 'clsx';

export default function CreateLesson() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
    level: 'beginner', // New field for lesson
  });

  const { isLoaded, loadError } = useGoogleMaps();

  const handlePlaceSelect = (place: any) => {
    if (!place) return;
    
    let city = '';
    let country = '';
    
    if (place.addressComponents) {
      place.addressComponents.forEach((component: any) => {
        if (component.types.includes('country')) country = component.shortText || component.short_name;
        if (component.types.includes('locality')) city = component.longText || component.long_name;
        else if (component.types.includes('administrative_area_level_1') && !city) city = component.longText || component.long_name;
      });
    }

    setFormData(prev => ({
      ...prev,
      locationName: place.displayName || place.name || prev.locationName,
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setLoading(true);
        const compressed = await resizeAndCompressImage(file);
        setFormData(prev => ({ ...prev, imageUrl: compressed }));
      } catch (error) {
        console.error("Image compression failed:", error);
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

      // 2. Insert into events first (Master table for all bookable items)
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
          location_name: formData.locationName,
          image_url: formData.imageUrl,
          host_id: user.id,
          max_attendees: Number(formData.maxAttendees),
          is_lesson: true,
          status: initialStatus,
          price: formData.tickets[0]?.price || 0,
          metadata: {
            endDate: endDateTime.toISOString(),
            formattedAddress: formData.formattedAddress,
            city: formData.city,
            country: formData.country,
            geoPoint: formData.geoPoint,
            tickets: formData.tickets,
            paymentMethod: formData.paymentMethod,
            level: formData.level,
            maxAttendees: Number(formData.maxAttendees)
          }
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // 3. Insert into classes using the same ID (Specialized metadata)
      const { error: classError } = await supabase
        .from('classes')
        .insert({
          id: eventData.id, 
          title: formData.title,
          instructor_id: user.id,
          level: formData.level,
          category: formData.category,
          start_date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
          class_time: formData.time,
          price: formData.tickets[0]?.price || 0,
          location_name: formData.locationName,
          address: formData.formattedAddress,
          lat: formData.geoPoint?.lat,
          lng: formData.geoPoint?.lng
        });

      if (classError) {
        console.error("Partial failure: Events record created but Classes record failed.", classError);
        // We continue because even with just events, the lesson will show up
      }

      if (eventData) {
        navigate(`/event/${eventData.id}`);
      }
    } catch (error) {
      handleSupabaseError(error, 'create', 'events', user?.id || '');
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-8 py-10 bg-gradient-to-br from-teal-600 to-emerald-700 text-white relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">강습 만들기</h1>
              <p className="text-teal-50/80 font-medium mt-1">새로운 강습 정보를 입력하여 수강생을 모집하세요.</p>
            </div>
          </div>
          
          {/* Decorative shapes */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 -left-10 w-24 h-24 bg-teal-400/20 rounded-full blur-2xl"></div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-12">
          {/* Basic Info Section */}
          <section className="space-y-8">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 bg-teal-100 dark:bg-teal-500/20 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-wider text-sm">기본 정보</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">강습 제목</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="예: 초보자를 위한 살사 기초 4주 완성"
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-teal-500 dark:focus:border-teal-500 outline-none transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">카테고리</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-teal-500 outline-none transition-all font-medium"
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
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">강습 레벨</label>
                <select
                  value={formData.level}
                  onChange={e => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-teal-500 outline-none transition-all font-medium"
                >
                  <option value="beginner">초급 (입문)</option>
                  <option value="intermediate">중급</option>
                  <option value="advanced">고급</option>
                  <option value="all">모든 레벨</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">강습 설명</label>
                <textarea
                  required
                  rows={6}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="강습 내용, 커리큘럼, 준비물 등을 자세히 적어주세요."
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-teal-500 outline-none transition-all font-medium resize-none"
                />
              </div>
            </div>
          </section>

          {/* Schedule Section */}
          <section className="space-y-8">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 bg-amber-100 dark:bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-wider text-sm">일정 정보</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">시작 날짜</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-amber-500 outline-none transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">시작 시간</label>
                <input
                  type="time"
                  required
                  value={formData.time}
                  onChange={e => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-amber-500 outline-none transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">종료 날짜</label>
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-amber-500 outline-none transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">종료 시간</label>
                <input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-amber-500 outline-none transition-all font-medium"
                />
              </div>
            </div>
          </section>

          {/* Location Section */}
          <section className="space-y-8">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
                <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-wider text-sm">장소 정보</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">상세 주소 검색</label>
                {isLoaded ? (
                  <PlaceSearch 
                    onPlaceSelect={handlePlaceSelect}
                    onInputChange={(val) => setFormData(prev => ({ ...prev, locationName: val }))}
                    placeholder="주소를 검색하거나 직접 입력하세요"
                  />
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="지도를 불러오는 중..."
                    disabled
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-medium"
                  />
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">장소 이름</label>
                <input
                  type="text"
                  required
                  value={formData.locationName}
                  onChange={e => setFormData({ ...formData, locationName: e.target.value })}
                  placeholder="예: 댄스 스튜디오 A"
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-blue-500 outline-none transition-all font-medium"
                />
              </div>
            </div>
          </section>

          {/* Pricing Section */}
          <section className="space-y-8">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 bg-rose-100 dark:bg-rose-500/20 rounded-lg flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-wider text-sm">참가비 및 결제</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">강습비 설정</label>
                  <button
                    type="button"
                    onClick={addTicket}
                    className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 hover:underline"
                  >
                    <PlusCircle className="w-3 h-3" />
                    추가하기
                  </button>
                </div>
                
                {formData.tickets.map((ticket, index) => (
                  <div key={index} className="flex gap-4 items-center animate-in fade-in slide-in-from-top-2 duration-300">
                    <input
                      type="text"
                      required
                      value={ticket.name}
                      onChange={e => updateTicket(index, 'name', e.target.value)}
                      placeholder="티켓 명칭 (예: 1회권, 4회 패키지)"
                      className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-rose-500 outline-none transition-all font-medium"
                    />
                    <div className="relative w-40">
                      <input
                        type="number"
                        required
                        value={ticket.price}
                        onChange={e => updateTicket(index, 'price', parseInt(e.target.value) || 0)}
                        className="w-full pl-5 pr-10 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-rose-500 outline-none transition-all font-medium"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₩</span>
                    </div>
                    {formData.tickets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTicket(index)}
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <MinusCircle className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">수강 정원</label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    required
                    value={formData.maxAttendees}
                    onChange={e => setFormData({ ...formData, maxAttendees: parseInt(e.target.value) || 0 })}
                    className="w-32 px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-rose-500 outline-none transition-all font-medium"
                  />
                  <span className="text-slate-500 font-medium">명</span>
                </div>
              </div>

              <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">결제/입금 안내</label>
                <textarea
                  value={formData.paymentMethod}
                  onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                  placeholder="예: 우리은행 1002-XXX-XXXXXX (홍길동), 입금 후 문자로 성함을 남겨주세요."
                  rows={3}
                  className="w-full px-5 py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:border-rose-500 outline-none transition-all font-medium resize-none"
                />
                <p className="text-xs text-slate-400">참여 신청자에게 표시될 입금 계좌 또는 결제 방법을 입력해주세요.</p>
              </div>
            </div>
          </section>

          {/* Media Section */}
          <section className="space-y-8">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-wider text-sm">대표 이미지</h2>
            </div>

            <div className="space-y-4">
              <input
                type="hidden"
                value={formData.imageUrl}
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={clsx(
                  "relative group cursor-pointer aspect-video rounded-3xl border-3 border-dashed overflow-hidden transition-all",
                  formData.imageUrl 
                    ? "border-teal-500/50" 
                    : "border-slate-200 dark:border-slate-800 hover:border-teal-500/50 hover:bg-teal-50/5 dark:hover:bg-teal-500/5"
                )}
              >
                {formData.imageUrl ? (
                  <>
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white font-bold flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        이미지 변경하기
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-4">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-teal-100 dark:group-hover:bg-teal-500/20 group-hover:text-teal-600 transition-all">
                      <Plus className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-slate-600 dark:text-slate-300">대표 이미지를 추가해주세요</p>
                      <p className="text-sm">강습을 대표하는 멋진 포스터나 사진 (추천 16:9)</p>
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

          {/* Form Actions */}
          <div className="pt-10 flex gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-8 py-5 flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-12 py-5 flex-[2] bg-teal-600 text-white font-black rounded-2xl shadow-lg shadow-teal-600/30 hover:bg-teal-700 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:transform-none"
            >
              {loading ? '등록 중...' : '강습 등록하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
