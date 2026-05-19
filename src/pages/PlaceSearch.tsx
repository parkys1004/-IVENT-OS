import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { MapPin, Navigation, Info, Search, X, Sparkles, Map as MapIcon, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

interface Place {
  id: string;
  name: string;
  country: string;
  type: string;
  region: string;
  address: string;
  kakaoMapUrl?: string;
  naverMapUrl?: string;
  googleMapUrl?: string;
}

const KOREA_PLACES: Place[] = [
  { id: 'local-1', name: '소셜댄스클럽 라틴', country: '대한민국', type: '동호회', region: '서울 강남', address: '강남역 1번 출구' },
  { id: 'local-2', name: 'JDC Studio', country: '대한민국', type: '아카데미', region: '서울 강남', address: '강남대로 94길 55-4' },
  { id: 'local-3', name: 'Real Latin Academy', country: '대한민국', type: '아카데미', region: '서울 강남', address: '강남역 근처' },
  { id: 'local-4', name: '블랙칸 댄스 학원', country: '대한민국', type: '아카데미', region: '서울 강남', address: '테헤란로14길 25' },
  { id: 'local-5', name: 'SK 댄스 아카데미', country: '대한민국', type: '아카데미', region: '서울 홍대/신촌', address: '홍대' },
  { id: 'local-6', name: '살사엠 아카데미', country: '대한민국', type: '아카데미', region: '서울 홍대/신촌', address: '홍대' },
  { id: 'local-7', name: '미래예술교육원', country: '대한민국', type: '아카데미', region: '서울 홍대/신촌', address: '신촌로 155 2층' },
  { id: 'local-8', name: 'SA 라틴살사댄스클럽', country: '대한민국', type: '동호회', region: '서울 홍대/신촌', address: '홍대' },
  { id: 'local-9', name: '라틴속으로', country: '대한민국', type: '동호회', region: '서울 홍대/신촌', address: '홍대' },
  { id: 'local-10', name: 'SOL 바', country: '대한민국', type: '댄스바', region: '서울 홍대/신촌', address: '동교동 166-5' },
  { id: 'local-11', name: '부에나', country: '대한민국', type: '댄스바', region: '서울 홍대/신촌', address: '동교로 217 LJ빌딩' },
  { id: 'local-12', name: '안단테', country: '대한민국', type: '댄스바', region: '서울 홍대/신촌', address: '서교동 395-5 지하1층' },
  { id: 'local-13', name: '라스트댄스', country: '대한민국', type: '동호회', region: '서울 기타', address: '서울' },
  { id: 'local-14', name: '일산 보니따', country: '대한민국', type: '동호회', region: '일산', address: '일산' },
  { id: 'local-15', name: '깔리(Cali)', country: '대한민국', type: '아카데미', region: '일산', address: '일산 백석점/대화점' },
  { id: 'local-16', name: '케이댄스스튜디오', country: '대한민국', type: '아카데미', region: '성남', address: '위례' },
  { id: 'local-17', name: '루에다(Rueda)', country: '대한민국', type: '아카데미', region: '부산', address: '부산진구 신천대로 62번길 42' },
  { id: 'local-18', name: '바야클럽(Baya Club)', country: '대한민국', type: '댄스바', region: '대구', address: '중구 동성로4길 39, 4층' },
  { id: 'local-19', name: '살사드라마', country: '대한민국', type: '동호회', region: '대구', address: '중구 동성로4길 39, 4층 (바바루bar)' },
  { id: 'local-20', name: '필댄스 창원점', country: '대한민국', type: '아카데미', region: '창원', address: '성산구 중앙동' },
  { id: 'local-21', name: '노체(No Chaser)', country: '대한민국', type: '동호회', region: '대전', address: '둔산동' },
  { id: 'local-22', name: '포항댄스사랑', country: '대한민국', type: '동호회', region: '포항', address: '남구 중앙로 112, 4층' },
];

export default function PlaceSearch() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('서울 강남');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlaces() {
      setLoading(true);
      try {
        const { data } = await supabase.from('places').select('id, name, country, type, address, kakao_map_url, naver_map_url, google_map_url').eq('is_approved', true);
        let dbPlaces: Place[] = [];
        
        if (data) {
          dbPlaces = data.map((p: any) => {
            let region = '기타';
            const cities = ['서울', '부산', '대구', '광주', '대전', '전주', '인천', '울산', '세종', '수원', '성남', '고양', '용인', '일산', '창원', '포항'];
            for (const city of cities) {
              if (p.address.includes(city)) {
                region = city;
                break;
              }
            }
            if (p.address.includes('강남') || p.address.includes('서초')) {
               if (region === '서울') region = '서울 강남';
            } else if (p.address.includes('마포') || p.address.includes('홍대') || p.address.includes('신촌')) {
               if (region === '서울') region = '서울 홍대/신촌';
            }
            return {
              id: p.id,
              name: p.name,
              country: p.country,
              type: p.type || '기타',
              region: region,
              address: p.address,
              kakaoMapUrl: p.kakao_map_url,
              naverMapUrl: p.naver_map_url,
              googleMapUrl: p.google_map_url,
            };
          });
        }

        // DB 데이터가 있으면 DB 우선, 없으면 하드코딩 목록 폴백
        const rawPlaces = dbPlaces.length > 0 ? dbPlaces : KOREA_PLACES;
        // 이름 기준 중복 제거
        const seen = new Set<string>();
        const mergedPlaces = rawPlaces.filter(p => {
          const key = p.name.trim().toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        const domesticPlaces = mergedPlaces.filter(p => p.country === '대한민국');
        setPlaces(domesticPlaces);
        
        const preferredOrder = ['서울 강남', '서울 홍대/신촌', '서울 기타', '부산', '대구'];
        const uniqueRegions = Array.from(new Set(domesticPlaces.map(p => p.region))).sort((a, b) => {
          const indexA = preferredOrder.indexOf(a);
          const indexB = preferredOrder.indexOf(b);
          
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return a.localeCompare(b);
        });
        
        setRegions(uniqueRegions);
        
        if (!selectedRegion || !uniqueRegions.includes(selectedRegion)) {
          setSelectedRegion(uniqueRegions[0] || '');
        }
      } catch (err) {
        setPlaces(KOREA_PLACES);
        const preferredOrder = ['서울 강남', '서울 홍대/신촌', '서울 기타', '부산', '대구'];
        const uniqueRegions = Array.from(new Set(KOREA_PLACES.map(p => p.region))).sort((a, b) => {
          const indexA = preferredOrder.indexOf(a);
          const indexB = preferredOrder.indexOf(b);
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return a.localeCompare(b);
        });
        setRegions(uniqueRegions);
        setSelectedRegion(uniqueRegions[0] || '');
      } finally {
        setLoading(false);
      }
    }
    fetchPlaces();
  }, []);

  const filteredPlaces = useMemo(() => {
    return places.filter(p => {
      const matchesRegion = selectedRegion ? p.region === selectedRegion : true;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.address.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRegion && matchesSearch;
    });
  }, [places, selectedRegion, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0908] pb-32">
      {/* Hero Section */}
      <div className="relative pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-full text-[10px] font-black tracking-[0.2em] uppercase mb-6 sm:mb-8 border border-orange-200 dark:border-orange-500/20 shadow-sm"
          >
            <Sparkles className="w-3 h-3" />
            <span>Connect & Ignite</span>
          </motion.div>
          
          <h1 className="text-5xl sm:text-7xl font-[1000] text-slate-900 dark:text-white mb-6 tracking-tighter leading-[0.9]">
            Dance <span className="text-orange-500">Locator</span>
          </h1>
          
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed px-4">
            당신의 열정이 닿을 최고의 무대를 찾으세요. <br className="hidden sm:block" />
            전국의 모든 살사, 바차타, 키좀바 핫스팟을 완벽하게 안내합니다.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search & Filtering Bar - Multi-level Sticky for Mobile */}
        <div className="sticky top-16 z-10 mb-12 sm:mb-16">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-200/50 dark:border-white/5 shadow-2xl p-3 sm:p-4 transition-all duration-300">
            <div className="flex flex-col gap-4">
              {/* Search input with icons */}
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                <input 
                  type="text"
                  placeholder="장소 이름, 도시, 주소 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-13 pr-12 py-4 bg-slate-50 dark:bg-black/20 border-2 border-transparent focus:border-orange-500/30 rounded-2xl outline-none transition-all text-slate-900 dark:text-white font-bold placeholder:text-slate-400"
                />
                <AnimatePresence>
                  {searchQuery && (
                    <motion.button 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 rounded-xl transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Filters row - Region Picker only */}
              <div className="flex gap-2 py-1 overflow-x-auto no-scrollbar scroll-smooth">
                {regions.map(r => (
                  <button
                    key={r}
                    onClick={() => setSelectedRegion(r)}
                    className={clsx(
                      "px-6 py-3 rounded-2xl text-[11px] font-black transition-all shrink-0 whitespace-nowrap uppercase tracking-widest",
                      selectedRegion === r 
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 scale-105" 
                        : "bg-white dark:bg-slate-800/20 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5 hover:border-orange-500/30"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results Info Bar */}
        <div className="flex items-center justify-between mb-8 px-4 sm:px-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-sm font-black text-slate-900 dark:text-white tracking-widest uppercase">
              {filteredPlaces.length} Spots Found
            </span>
          </div>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-orange-500 hover:underline flex items-center gap-1"
            >
              Reset Search <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          <AnimatePresence mode="popLayout" initial={false}>
            {loading ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 animate-pulse shadow-sm">
                  <div className="h-8 w-48 bg-slate-100 dark:bg-white/5 rounded-xl mb-4" />
                  <div className="h-4 w-64 bg-slate-50 dark:bg-white/5 rounded mb-8" />
                  <div className="flex gap-2">
                    <div className="h-12 flex-1 bg-slate-50 dark:bg-white/5 rounded-2xl" />
                    <div className="h-12 flex-1 bg-slate-50 dark:bg-white/5 rounded-2xl" />
                    <div className="h-12 flex-1 bg-slate-50 dark:bg-white/5 rounded-2xl" />
                  </div>
                </div>
              ))
            ) : filteredPlaces.length > 0 ? (
              filteredPlaces.map((place, idx) => (
                <motion.div
                  key={place.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: idx * 0.04 }}
                  className="group grid grid-rows-[1fr_auto] bg-white dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-200/50 dark:border-white/5 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-2"
                >
                  {/* Card Main Info */}
                  <div className="p-7 sm:p-8 flex flex-col items-start gap-4 h-full">
                    <div className="w-full flex justify-between items-start gap-3">
                      <div className="shrink-0 px-3 py-1 bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-black rounded-lg uppercase tracking-widest border border-orange-200/50 dark:border-orange-500/10">
                        {place.type}
                      </div>
                      <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                        {place.region}
                      </div>
                    </div>
                    
                    <div className="w-full flex-1 mt-1">
                      <Link to={`/places/${place.id}`}>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2 group-hover:text-orange-500 transition-colors tracking-tight">
                          {place.name}
                        </h3>
                      </Link>
                      <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400 font-medium">
                        <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-orange-500/60" />
                        <p className="text-[14px] leading-relaxed line-clamp-2">
                          {place.address}
                        </p>
                      </div>
                    </div>

                    <Link 
                      to={`/places/${place.id}`}
                      className="mt-4 flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white group-hover:text-orange-500 transition-all uppercase tracking-widest"
                    >
                      View Details <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Quick Map Actions */}
                  <div className="px-7 pb-7 sm:px-8 sm:pb-8 pt-0 grid grid-cols-3 gap-2.5">
                    <motion.a 
                      whileTap={{ scale: 0.95 }}
                      href={`https://map.kakao.com/?q=${encodeURIComponent(place.address)}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="bg-[#FEE500] text-[#3c1e1e] text-[10px] font-black h-12 rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-[#FEE500]/10 hover:brightness-105 active:brightness-95 transition-all"
                    >
                      카카오
                    </motion.a>
                    <motion.a 
                      whileTap={{ scale: 0.95 }}
                      href={`https://map.naver.com/v5/search/${encodeURIComponent(place.address)}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="bg-[#03C75A] text-white text-[10px] font-black h-12 rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-[#03C75A]/10 hover:brightness-105 active:brightness-95 transition-all"
                    >
                      네이버
                    </motion.a>
                    <motion.a 
                      whileTap={{ scale: 0.95 }}
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="bg-slate-100 dark:bg-white text-slate-900 dark:text-black text-[10px] font-black h-12 rounded-2xl flex items-center justify-center gap-1.5 shadow-lg dark:shadow-white/5 hover:bg-slate-200 dark:hover:bg-slate-100 active:brightness-95 transition-all"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                    </motion.a>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="col-span-full py-32 text-center"
              >
                <div className="w-24 h-24 bg-orange-100 dark:bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce transition-all duration-1000">
                  <MapIcon className="w-12 h-12 text-orange-500" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">발견된 장소가 없어요!</h3>
                <p className="text-slate-500 dark:text-slate-400 text-lg max-w-sm mx-auto font-medium">
                  다른 검색어나 지역을 선택해보세요.
                </p>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                  }}
                  className="mt-10 px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-black font-black rounded-2xl hover:scale-105 transition-transform"
                >
                  검색 초기화
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Decorative Gradient Glows for Desktop */}
      <div className="fixed bottom-0 left-0 w-full h-96 bg-gradient-to-t from-orange-500/5 to-transparent pointer-events-none -z-10" />
    </div>
  );
}
