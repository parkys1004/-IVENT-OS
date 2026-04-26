import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { MapPin, Search } from 'lucide-react';

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
      const { data, error } = await supabase.from('bars').select('*');
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black mb-8">바 검색</h1>
      
      <div className="flex flex-wrap gap-2 mb-6">
        {countries.map(c => (
          <button key={c} onClick={() => setSelectedCountry(c)} className={`px-4 py-2 rounded-xl ${selectedCountry === c ? 'bg-indigo-600 text-white' : 'bg-slate-200'}`}>
            {c}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {regions.map(r => (
          <button key={r} onClick={() => setSelectedRegion(r)} className={`px-4 py-2 rounded-xl ${selectedRegion === r ? 'bg-amber-500 text-white' : 'bg-slate-200'}`}>
            {r}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBars.map(bar => (
          <div key={bar.id} className="p-6 border rounded-2xl shadow-sm bg-white dark:bg-slate-900">
            <h3 className="text-xl font-bold mb-2">{bar.name}</h3>
            <p className="text-slate-500 mb-4">{bar.address}</p>
            <div className="flex gap-2 text-sm font-bold">
              {bar.kakaoMapUrl && <a href={bar.kakaoMapUrl} target="_blank" className="bg-[#FEE500] px-3 py-1.5 rounded-lg">카카오</a>}
              {bar.naverMapUrl && <a href={bar.naverMapUrl} target="_blank" className="bg-green-500 text-white px-3 py-1.5 rounded-lg">네이버</a>}
              {bar.googleMapUrl && <a href={bar.googleMapUrl} target="_blank" className="bg-blue-500 text-white px-3 py-1.5 rounded-lg">구글</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
