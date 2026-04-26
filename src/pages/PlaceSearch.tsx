import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { MapPin, Navigation, ExternalLink, Info } from 'lucide-react';
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

export default function PlaceSearch() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlaces() {
      setLoading(true);
      const { data } = await supabase.from('places').select('*');
      if (data) {
        const mappedPlaces: Place[] = data.map((p: any) => {
          let region = '기타';
          const cities = ['서울', '부산', '대구', '광주', '대전', '전주', '인천', '울산', '세종', '수원', '성남', '고양', '용인'];
          for (const city of cities) {
            if (p.address.includes(city)) {
              region = city;
              break;
            }
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
        setPlaces(mappedPlaces);
        const uniqueCountries = Array.from(new Set(mappedPlaces.map(p => p.country)));
        setCountries(uniqueCountries);
        if (uniqueCountries.length > 0) setSelectedCountry(uniqueCountries[0]);
      }
      setLoading(false);
    }
    fetchPlaces();
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      const regionsForCountry = Array.from(new Set(places.filter(p => p.country === selectedCountry).map(p => p.region)));
      setRegions(regionsForCountry);
      setSelectedRegion(regionsForCountry.length > 0 ? regionsForCountry[0] : '');
    }
  }, [selectedCountry, places]);

  const filteredPlaces = places.filter(p => p.country === selectedCountry && p.region === selectedRegion);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-32">
      {/* Header Section */}
      <div className="pt-12 pb-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold mb-4"
        >
          <MapPin className="w-3 h-3" />
          <span>전국 SBKZ 활동 장소 안내</span>
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-[1000] text-slate-900 dark:text-white mb-4 tracking-tighter">
          Place Locator
        </h1>
        <p className="text-slate-500 font-medium text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          국내외 살사, 바차타, 키좀바 댄서들을 위한 모든 활동 장소를 한눈에 확인하세요.
        </p>
      </div>

      {/* Navigation Tabs - Mobile Optimized */}
      <div className="sticky top-0 z-20 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md py-4 -mx-4 px-4 md:static md:bg-transparent md:p-0 md:mb-12">
        <div className="flex flex-col gap-3">
          {/* Country Selection */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-1">
            {countries.map(c => (
              <button
                key={c}
                onClick={() => setSelectedCountry(c)}
                className={clsx(
                  "px-5 py-2.5 rounded-full text-sm font-bold transition-all shrink-0 whitespace-nowrap",
                  selectedCountry === c 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none" 
                    : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Region/City Selection */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-1">
            {regions.map(r => (
              <button
                key={r}
                onClick={() => setSelectedRegion(r)}
                className={clsx(
                  "px-4 py-2 rounded-full text-xs font-black transition-all shrink-0 whitespace-nowrap uppercase tracking-wider",
                  selectedRegion === r 
                    ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-2 border-amber-500/30" 
                    : "bg-slate-100 dark:bg-slate-800/50 text-slate-500 border border-transparent hover:bg-slate-200"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-8 md:mt-0">
        <AnimatePresence mode="popLayout">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 animate-pulse">
                <div className="h-6 w-32 bg-slate-100 dark:bg-slate-800 rounded mb-4" />
                <div className="h-4 w-48 bg-slate-50 dark:bg-slate-800/50 rounded mb-6" />
                <div className="flex gap-2">
                  <div className="h-10 flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl" />
                  <div className="h-10 flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl" />
                </div>
              </div>
            ))
          ) : filteredPlaces.length > 0 ? (
            filteredPlaces.map((place, idx) => (
              <motion.div
                key={place.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300"
              >
                <div className="flex flex-col h-full p-6">
                  <Link to={`/places/${place.id}`} className="mb-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight hover:text-indigo-600 transition-colors">
                        {place.name}
                      </h3>
                      <span className="shrink-0 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400 rounded-lg uppercase tracking-tighter">
                        {place.type}
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5 text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-500" />
                      <p className="text-sm font-medium leading-relaxed">
                        {place.address}
                      </p>
                    </div>
                  </Link>

                  <div className="mt-auto pt-6 flex flex-wrap gap-2 relative z-10">
                    <a 
                      href={`https://map.kakao.com/?q=${encodeURIComponent(place.address)}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex-1 min-w-[80px] bg-[#FEE500] text-[#3c1e1e] text-[11px] font-black px-3 py-3 rounded-2xl flex items-center justify-center gap-1.5 hover:brightness-95 transition-all active:scale-95"
                    >
                      <span>카카오</span>
                    </a>
                    <a 
                      href={`https://map.naver.com/v5/search/${encodeURIComponent(place.address)}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex-1 min-w-[80px] bg-[#03C75A] text-white text-[11px] font-black px-3 py-3 rounded-2xl flex items-center justify-center gap-1.5 hover:brightness-95 transition-all active:scale-95"
                    >
                      <span>네이버</span>
                    </a>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex-1 min-w-[80px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white text-[11px] font-black px-3 py-3 rounded-2xl flex items-center justify-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>구글</span>
                    </a>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Info className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">검색 결과가 없습니다</h3>
              <p className="text-slate-500">다른 지역이나 국가를 선택해보세요.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
