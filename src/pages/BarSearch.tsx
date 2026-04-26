import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { MapPin } from 'lucide-react';
import clsx from 'clsx';

interface Bar {
  id: string;
  name: string;
  country: string;
  region: string;
  address: string;
  kakaoMapUrl?: string;
  naverMapUrl?: string;
  googleMapUrl?: string;
}

export default function BarSearch() {
  const [bars, setBars] = useState<Bar[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');

  useEffect(() => {
    async function fetchBars() {
      const { data } = await supabase.from('bars').select('*');
      if (data) {
        const mappedBars: Bar[] = data.map((b: any) => ({
          id: b.id,
          name: b.name,
          country: b.country,
          region: b.region,
          address: b.address,
          kakaoMapUrl: b.kakao_map_url,
          naverMapUrl: b.naver_map_url,
          googleMapUrl: b.google_map_url,
        }));
        setBars(mappedBars);
        const uniqueCountries = Array.from(new Set(mappedBars.map(b => b.country)));
        setCountries(uniqueCountries);
        if (uniqueCountries.length > 0) setSelectedCountry(uniqueCountries[0]);
      }
    }
    fetchBars();
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      const regionsForCountry = Array.from(new Set(bars.filter(b => b.country === selectedCountry).map(b => b.region)));
      setRegions(regionsForCountry);
      setSelectedRegion(regionsForCountry.length > 0 ? regionsForCountry[0] : '');
    }
  }, [selectedCountry, bars]);

  const filteredBars = bars.filter(b => b.country === selectedCountry && b.region === selectedRegion);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      <div className="mb-6 md:mb-10 text-center relative pt-8 md:pt-10">
        <h1 className="text-3xl md:text-4xl font-[950] text-slate-900 dark:text-white mb-2 md:mb-4 tracking-tighter">
          Bar Locator
        </h1>
        <p className="text-slate-500 font-medium text-sm md:text-lg italic">
          댄서들을 위한 전국 바(Bar) 가이드
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
        {filteredBars.map(bar => (
          <div key={bar.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors flex items-center justify-between">
            <div>
              <h3 className="text-base md:text-lg font-black text-slate-800 dark:text-white mb-1">{bar.name}</h3>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">{bar.address}</p>
            </div>
            <div className="flex gap-2">
              {bar.kakaoMapUrl && <a href={bar.kakaoMapUrl} target="_blank" className="bg-[#FEE500] text-[#3c1e1e] text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity">카카오</a>}
              {bar.naverMapUrl && <a href={bar.naverMapUrl} target="_blank" className="bg-[#03C75A] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity">네이버</a>}
              {bar.googleMapUrl && <a href={bar.googleMapUrl} target="_blank" className="bg-[#4285F4] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity">구글</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
