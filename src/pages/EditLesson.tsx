import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { handleSupabaseError } from '../lib/supabaseError';
import PlaceSearch from '../components/PlaceSearch';
import { Calendar, FileText, MapPin, Upload, X, GraduationCap, PlusCircle, MinusCircle, CreditCard, Plus, ImageIcon as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGoogleMaps } from '../context/GoogleMapsContext';
import clsx from 'clsx';

export default function EditLesson() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        setSaving(true);
        const compressed = await resizeAndCompressImage(file);
        setFormData(prev => ({ ...prev, imageUrl: compressed }));
      } catch (error) {
        console.error("Image compression failed:", error);
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="px-8 py-10 bg-gradient-to-br from-teal-600 to-emerald-700 text-white relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">강습 수정하기</h1>
              <p className="text-teal-50/80 font-medium mt-1">강습 정보를 최신 상태로 유지하세요.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-12">
          {/* Reuse the same form sections from CreateLesson.tsx */}
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
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-teal-500 outline-none transition-all font-medium"
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
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-teal-500 outline-none transition-all font-medium resize-none"
                />
              </div>
            </div>
          </section>

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
                    value={formData.locationName}
                  />
                ) : (
                  <input
                    type="text"
                    value={formData.locationName}
                    onChange={e => setFormData({ ...formData, locationName : e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-blue-500 outline-none transition-all font-medium"
                  />
                )}
                {formData.formattedAddress && (
                  <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
                    상세주소: {formData.formattedAddress}
                  </p>
                )}
              </div>
            </div>
          </section>

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
                  <button type="button" onClick={addTicket} className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 hover:underline">
                    <PlusCircle className="w-3 h-3" /> 추가하기
                  </button>
                </div>
                {formData.tickets.map((ticket, index) => (
                  <div key={index} className="flex gap-4 items-center">
                    <input
                      type="text"
                      required
                      value={ticket.name}
                      onChange={e => updateTicket(index, 'name', e.target.value)}
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
                      <button type="button" onClick={() => removeTicket(index)} className="p-2 text-slate-400 hover:text-rose-500">
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
                  rows={3}
                  className="w-full px-5 py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:border-rose-500 outline-none transition-all font-medium resize-none"
                />
              </div>
            </div>
          </section>

          <section className="space-y-8">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-wider text-sm">대표 이미지</h2>
            </div>
            <div onClick={() => fileInputRef.current?.click()} className={clsx("relative group cursor-pointer aspect-video rounded-3xl border-3 border-dashed overflow-hidden transition-all", formData.imageUrl ? "border-teal-500/50" : "border-slate-200 dark:border-slate-800 hover:border-teal-500/50")}>
              {formData.imageUrl ? (
                <>
                  <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-white font-bold flex items-center gap-2"><Upload className="w-5 h-5" /> 이미지 변경하기</p>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center group-hover:bg-teal-100 group-hover:text-teal-600 transition-all"><Plus className="w-8 h-8" /></div>
                  <p className="font-bold text-slate-600 dark:text-slate-300">대표 이미지를 추가해주세요</p>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            </div>
          </section>

          <div className="pt-10 flex gap-4">
            <button type="button" onClick={() => navigate(-1)} className="px-8 py-5 flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-200">취소</button>
            <button type="submit" disabled={saving} className="px-12 py-5 flex-[2] bg-teal-600 text-white font-black rounded-2xl shadow-lg shadow-teal-600/30 hover:bg-teal-700 hover:-translate-y-1 transition-all disabled:opacity-50">
              {saving ? '저장 중...' : '수정 완료하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
