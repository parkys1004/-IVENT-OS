import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { MapPin } from 'lucide-react';
import clsx from 'clsx';

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

  useEffect(() => {
    async function fetchPlaces() {
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
        }});
        setPlaces(mappedPlaces);
        const uniqueCountries = Array.from(new Set(mappedPlaces.map(p => p.country)));
        setCountries(uniqueCountries);
        if (uniqueCountries.length > 0) setSelectedCountry(uniqueCountries[0]);
      }
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
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      <div className="mb-6 md:mb-10 text-center relative pt-8 md:pt-10">
        <h1 className="text-3xl md:text-4xl font-[950] text-slate-900 dark:text-white mb-2 md:mb-4 tracking-tighter">
          Place Locator
        </h1>
        <p className="text-slate-500 font-medium text-sm md:text-lg italic">
          댄서들을 위한 전국 장소(Place) 가이드
        </p>
      </div>
      
      <div className="flex flex-col gap-4 mb-6 md:mb-10">
        <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-[20px] border border-slate-200 dark:border-slate-800 self-center overflow-x-auto no-scrollbar scroll-smooth">
          {countries.map(c => (
            <button key={c} onClick={() => setSelectedCountry(c)} className={clsx("px-4 md:px-6 py-2.5 rounded-2xl text-[13px] md:text-sm font-black transition-all shrink-0", selectedCountry === c ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-[20px] border border-slate-200 dark:border-slate-800 self-center overflow-x-auto no-scrollbar scroll-smooth">
          {regions.map(r => (
            <button key={r} onClick={() => setSelectedRegion(r)} className={clsx("px-4 md:px-6 py-2.5 rounded-2xl text-[13px] md:text-sm font-black transition-all shrink-0", selectedRegion === r ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/50 rounded-3xl md:rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px] divide-y divide-slate-50 dark:divide-slate-800">
        {filteredPlaces.map(place => (
          <div key={place.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors flex items-center justify-between">
            <div>
              <h3 className="text-base md:text-lg font-black text-slate-800 dark:text-white mb-1">{place.name} <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{place.type}</span></h3>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">{place.address}</p>
            </div>
            <div className="flex gap-2">
              <a href={`https://map.kakao.com/?q=${encodeURIComponent(place.address)}`} target="_blank" className="bg-[#FEE500] text-[#3c1e1e] text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity">카카오</a>
              <a href={`https://map.naver.com/v5/search/${encodeURIComponent(place.address)}`} target="_blank" className="bg-[#03C75A] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity">네이버</a>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`} target="_blank" className="bg-[#4285F4] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity">구글</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
