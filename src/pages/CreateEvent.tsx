import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, MapPin, Users, FileText, Image as ImageIcon } from 'lucide-react';

export default function CreateEvent() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'IT',
    date: '',
    time: '',
    endDate: '', // will just duplicate date for MVP
    endTime: '',
    locationName: '',
    imageUrl: '',
    maxAttendees: 50,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    
    setLoading(true);
    try {
      // Create JS Date objects
      const startDate = new Date(`${formData.date}T${formData.time}`);
      const endDate = new Date(`${formData.endDate || formData.date}T${formData.endTime || '23:59'}`);

      const newEvent = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        date: startDate,
        endDate: endDate,
        locationName: formData.locationName,
        imageUrl: formData.imageUrl || '',
        maxAttendees: Number(formData.maxAttendees),
        currentAttendees: 0,
        hostId: user.uid,
        hostName: profile.displayName || user.email?.split('@')[0] || 'Unknown',
        status: 'published',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'events'), newEvent);
      navigate('/');
    } catch (err) {
      console.error("Error creating event:", err);
      alert("행사 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (!user || (profile?.role !== 'host' && profile?.role !== 'admin')) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-800">접근 권한이 없습니다</h2>
        <p className="text-slate-500 mt-2">행사 주최자 또는 관리자만 접근할 수 있습니다.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-indigo-600 font-bold hover:text-indigo-700 transition-colors">메인으로 돌아가기</button>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto bg-white rounded-[24px] shadow-sm border border-slate-200 p-8 md:p-12 lg:p-16">
      <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-10">새로운 행사 만들기</h1>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Title */}
        <div>
          <label className="block text-[13px] font-bold text-slate-700 mb-2">행사 이름</label>
          <input
            required
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full rounded-[10px] border-slate-200 border bg-slate-50 px-4 py-3 text-[14px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            placeholder="예: 2026 프론트엔드 개발자 컨퍼런스"
          />
        </div>

        {/* Category & Attendees */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
             <label className="block text-[13px] font-bold text-slate-700 mb-2">카테고리</label>
             <select
               name="category"
               value={formData.category}
               onChange={handleChange}
               className="w-full rounded-[10px] border-slate-200 border bg-slate-50 px-4 py-3 text-[14px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
             >
               <option value="IT">IT/Tech</option>
               <option value="Music">음악/공연</option>
               <option value="Networking">네트워킹/모임</option>
               <option value="Education">교육/강연</option>
             </select>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-2 flex items-center"><Users className="w-4 h-4 mr-1 text-slate-400"/> 최대 모집 인원</label>
            <input
              required
              type="number"
              name="maxAttendees"
              min="1"
              value={formData.maxAttendees}
              onChange={handleChange}
              className="w-full rounded-[10px] border-slate-200 border bg-slate-50 px-4 py-3 text-[14px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-2 flex items-center"><Calendar className="w-4 h-4 mr-1 text-slate-400"/> 날짜</label>
            <input
              required
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full rounded-[10px] border-slate-200 border bg-slate-50 px-4 py-3 text-[14px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-2 flex items-center"><Clock className="w-4 h-4 mr-1 text-slate-400"/> 시작 시간</label>
            <input
              required
              type="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              className="w-full rounded-[10px] border-slate-200 border bg-slate-50 px-4 py-3 text-[14px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-[13px] font-bold text-slate-700 mb-2 flex items-center"><MapPin className="w-4 h-4 mr-1 text-slate-400"/> 장소</label>
          <input
            required
            type="text"
            name="locationName"
            value={formData.locationName}
            onChange={handleChange}
            className="w-full rounded-[10px] border-slate-200 border bg-slate-50 px-4 py-3 text-[14px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            placeholder="예: 코엑스 오디토리움"
          />
        </div>

        {/* Image */}
        <div>
          <label className="block text-[13px] font-bold text-slate-700 mb-2 flex items-center"><ImageIcon className="w-4 h-4 mr-1 text-slate-400"/> 대표 이미지 (URL)</label>
          <input
            type="url"
            name="imageUrl"
            value={formData.imageUrl}
            onChange={handleChange}
            className="w-full rounded-[10px] border-slate-200 border bg-slate-50 px-4 py-3 text-[14px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            placeholder="https://..."
          />
          <p className="mt-1 text-xs text-slate-500">포스터 이미지 웹 링크를 입력해주세요.</p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-[13px] font-bold text-slate-700 mb-2 flex items-center"><FileText className="w-4 h-4 mr-1 text-slate-400"/> 상세 설명</label>
          <textarea
            required
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={5}
            className="w-full rounded-[10px] border-slate-200 border bg-slate-50 px-4 py-3 text-[14px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow resize-none"
            placeholder="행사에 대한 자세한 소개를 적어주세요."
          ></textarea>
        </div>

        <div className="pt-6 border-t border-slate-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-[10px] text-slate-600 font-bold hover:bg-slate-100 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 rounded-[10px] bg-indigo-600 text-white font-bold shadow-sm hover:bg-indigo-700 hover:shadow-md transition-all disabled:opacity-50"
          >
            {loading ? '등록 중...' : '행사 등록하기'}
          </button>
        </div>
      </form>
    </div>
  );
}
