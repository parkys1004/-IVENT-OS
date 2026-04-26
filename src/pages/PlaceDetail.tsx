import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { MapPin, Navigation, ArrowLeft, ExternalLink, Info, Globe } from 'lucide-react';
import { motion } from 'motion/react';

interface Place {
  id: string;
  name: string;
  country: string;
  type: string;
  address: string;
  kakao_map_url?: string;
  naver_map_url?: string;
  google_map_url?: string;
}

export default function PlaceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlace() {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('id', id)
        .single();
      
      if (data) {
        setPlace(data);
      } else if (error) {
        console.error('Error fetching place:', error);
      }
      setLoading(false);
    }
    fetchPlace();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!place) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold mb-4">장소를 찾을 수 없습니다.</h2>
        <button 
          onClick={() => navigate('/places')}
          className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 pb-32">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors py-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-bold">뒤로가기</span>
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden"
      >
        {/* Header / Banner Area */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-8 md:p-12 text-white relative">
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                {place.type || '장소'}
              </span>
              <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                {place.country || '국가'}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-[1000] tracking-tighter mb-6 leading-tight">
              {place.name}
            </h1>
            <div className="flex items-start gap-3 text-indigo-100/90 bg-black/10 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
              <MapPin className="w-6 h-6 shrink-0 mt-0.5 text-indigo-300" />
              <p className="text-base md:text-xl font-bold leading-relaxed">
                {place.address}
              </p>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>

        {/* Content Area */}
        <div className="p-6 md:p-12 space-y-12">
          {/* Navigation Links */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center">
                <Navigation className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                길찾기 및 지도
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <a 
                href={place.kakao_map_url || `https://map.kakao.com/link/search/${encodeURIComponent(place.address)}`} 
                target="_blank" 
                rel="noreferrer"
                className="group p-6 bg-[#FEE500] text-[#3c1e1e] rounded-[2rem] flex flex-col items-center justify-center gap-4 hover:brightness-95 transition-all shadow-xl shadow-yellow-500/10 active:scale-95 border-b-4 border-yellow-600/20"
              >
                <div className="w-14 h-14 bg-[#3c1e1e] rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <span className="text-2xl font-black text-[#FEE500]">K</span>
                </div>
                <div className="text-center">
                  <p className="font-black text-sm uppercase tracking-wide">카카오 맵</p>
                  <p className="text-[10px] opacity-60 font-bold">Kakao Maps</p>
                </div>
              </a>

              <a 
                href={place.naver_map_url || `https://map.naver.com/v5/search/${encodeURIComponent(place.address)}`} 
                target="_blank" 
                rel="noreferrer"
                className="group p-6 bg-[#03C75A] text-white rounded-[2rem] flex flex-col items-center justify-center gap-4 hover:brightness-95 transition-all shadow-xl shadow-emerald-500/10 active:scale-95 border-b-4 border-emerald-700/20"
              >
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <span className="text-2xl font-black text-[#03C75A]">N</span>
                </div>
                <div className="text-center">
                  <p className="font-black text-sm uppercase tracking-wide">네이버 지도</p>
                  <p className="text-[10px] opacity-70 font-bold">Naver Map</p>
                </div>
              </a>

              <a 
                href={place.google_map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`} 
                target="_blank" 
                rel="noreferrer"
                className="group p-6 bg-slate-900 text-white rounded-[2rem] flex flex-col items-center justify-center gap-4 hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-95 border-b-4 border-black/20"
              >
                <div className="w-14 h-14 bg-white p-3 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <img src="https://www.gstatic.com/images/branding/product/2x/maps_96in128dp.png" alt="Google Maps" className="w-full h-full object-contain" />
                </div>
                <div className="text-center">
                  <p className="font-black text-sm uppercase tracking-wide">구글 맵</p>
                  <p className="text-[10px] opacity-50 font-bold">Google Maps</p>
                </div>
              </a>
            </div>
          </section>

          <section className="p-8 bg-slate-50 dark:bg-slate-800/30 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 relative overflow-hidden">
            <div className="flex items-start gap-5 relative z-10">
              <div className="w-12 h-12 shrink-0 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-sm">
                <Info className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">방문 안내</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base leading-relaxed font-medium">
                  위 버튼을 클릭하면 해당 지도 앱 또는 웹사이트로 바로 연결됩니다. 
                  행사 시간이나 상세 위치는 상황에 따라 다를 수 있으니 방문 전 공식 채널을 확인해 주세요.
                  주소 복사가 필요하시면 지도를 열어 확인하실 수 있습니다.
                </p>
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />
          </section>
        </div>
      </motion.div>
    </div>
  );
}
