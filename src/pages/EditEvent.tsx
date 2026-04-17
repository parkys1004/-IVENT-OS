import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, MapPin, Users, FileText, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function EditEvent() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'IT',
    date: '',
    time: '',
    endDate: '',
    endTime: '',
    locationName: '',
    imageUrl: '',
    maxAttendees: 50,
  });

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'events', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setEventData({ id: docSnap.id, ...data });
          
          const startDateObj = data.date?.toDate() || new Date();
          const endDateObj = data.endDate?.toDate() || new Date();

          setFormData({
            title: data.title || '',
            description: data.description || '',
            category: data.category || 'IT',
            date: format(startDateObj, 'yyyy-MM-dd'),
            time: format(startDateObj, 'HH:mm'),
            endDate: format(endDateObj, 'yyyy-MM-dd'),
            endTime: format(endDateObj, 'HH:mm'),
            locationName: data.locationName || '',
            imageUrl: data.imageUrl || '',
            maxAttendees: data.maxAttendees || 50,
          });
        } else {
          alert('행사를 찾을 수 없습니다.');
          navigate('/');
        }
      } catch (error) {
        console.error("Error fetching event:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !id) return;
    
    setSubmitting(true);
    try {
      const startDate = new Date(`${formData.date}T${formData.time}`);
      const endDate = new Date(`${formData.endDate || formData.date}T${formData.endTime || '23:59'}`);

      const updatedEvent = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        date: startDate,
        endDate: endDate,
        locationName: formData.locationName,
        imageUrl: formData.imageUrl || '',
        maxAttendees: Number(formData.maxAttendees),
      };

      await updateDoc(doc(db, 'events', id), updatedEvent);
      alert('행사가 성공적으로 수정되었습니다.');
      navigate(`/event/${id}`);
    } catch (err) {
      console.error("Error updating event:", err);
      alert("행사 수정 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  // Check permissions: only host or admin can edit
  const isHost = user && eventData?.hostId === user.uid;
  const isAdmin = profile?.role === 'admin';
  
  if (!isHost && !isAdmin) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-800">접근 권한이 없습니다</h2>
        <p className="text-slate-500 mt-2">이 행사의 주최자 또는 관리자만 수정할 수 있습니다.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 font-bold hover:text-indigo-700 transition-colors">돌아가기</button>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto bg-white rounded-[24px] shadow-sm border border-slate-200 p-8 md:p-12 lg:p-16">
      <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-10">행사 수정하기</h1>
      
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
              min={eventData?.currentAttendees || 1} // Can't be less than current attendees
              value={formData.maxAttendees}
              onChange={handleChange}
              className="w-full rounded-[10px] border-slate-200 border bg-slate-50 px-4 py-3 text-[14px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              * 현재 참여자 수({eventData?.currentAttendees || 0}명)보다 작게 설정할 수 없습니다.
            </p>
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
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-[10px] text-slate-600 font-bold hover:bg-slate-100 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 rounded-[10px] bg-indigo-600 text-white font-bold shadow-sm hover:bg-indigo-700 hover:shadow-md transition-all disabled:opacity-50 flex items-center"
          >
            {submitting ? '저장 중...' : '수정 내역 저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
