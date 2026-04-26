import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabase';
import { Plus, Trash2, Search, CheckSquare, Square } from 'lucide-react';

export function PlacesTab() {
  const [places, setPlaces] = useState<any[]>([]);
  const [newPlace, setNewPlace] = useState({ name: '', country: '', type: '', address: '', kakaoMapUrl: '', naverMapUrl: '', googleMapUrl: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    fetchPlaces();
  }, []);

  async function fetchPlaces() {
    const { data } = await supabase.from('places').select('*');
    if (data) setPlaces(data);
  }

  async function addPlace() {
    if (!newPlace.name) return;
    await supabase.from('places').insert(newPlace);
    setNewPlace({ name: '', country: '', type: '', address: '', kakaoMapUrl: '', naverMapUrl: '', googleMapUrl: '' });
    fetchPlaces();
  }

  async function deletePlaces(ids: string[]) {
    if (confirm(`정말 ${ids.length}개의 항목을 삭제하시겠습니까?`)) {
      await supabase.from('places').delete().in('id', ids);
      setSelectedIds([]);
      fetchPlaces();
    }
  }

  const filteredPlaces = useMemo(() => {
    return places.filter(place => 
      place.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      place.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      place.type?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [places, searchTerm]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPlaces.length) setSelectedIds([]);
    else setSelectedIds(filteredPlaces.map(p => p.id));
  };

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl">
      <h2 className="text-2xl font-black mb-6 text-slate-900 dark:text-white">장소 관리 센터</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
        <input placeholder="장소 이름" value={newPlace.name} onChange={e => setNewPlace({...newPlace, name: e.target.value})} className="p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700"/>
        <input placeholder="국가" value={newPlace.country} onChange={e => setNewPlace({...newPlace, country: e.target.value})} className="p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700"/>
        <input placeholder="유형" value={newPlace.type} onChange={e => setNewPlace({...newPlace, type: e.target.value})} className="p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700"/>
        <input placeholder="주소" value={newPlace.address} onChange={e => setNewPlace({...newPlace, address: e.target.value})} className="col-span-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700"/>
        <button onClick={addPlace} className="col-span-full bg-indigo-600 text-white p-3 rounded-xl font-bold flex items-center justify-center hover:bg-indigo-700"><Plus className="w-5 h-5 mr-2"/> 장소 추가하기</button>
      </div>
...

      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
          <input placeholder="검색 (이름, 주소, 지역...)" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 border rounded-2xl dark:bg-slate-800 dark:border-slate-700"/>
        </div>
        {selectedIds.length > 0 && (
          <button onClick={() => deletePlaces(selectedIds)} className="flex items-center gap-2 bg-red-50 text-red-600 px-5 py-3 rounded-2xl font-bold hover:bg-red-100">
            <Trash2 className="w-5 h-5"/> 일괄 삭제 ({selectedIds.length})
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="p-4 w-10"><button onClick={toggleSelectAll}>{selectedIds.length === filteredPlaces.length && filteredPlaces.length > 0 ? <CheckSquare className="w-5 h-5 text-indigo-600"/> : <Square className="w-5 h-5 text-slate-400"/>}</button></th>
              <th className="p-4 text-left font-bold text-slate-600 dark:text-slate-300">이름</th>
              <th className="p-4 text-left font-bold text-slate-600 dark:text-slate-300">지역/주소</th>
              <th className="p-4 text-center font-bold text-slate-600 dark:text-slate-300">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredPlaces.map(place => (
              <tr key={place.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="p-4"><button onClick={() => setSelectedIds(prev => prev.includes(place.id) ? prev.filter(id => id !== place.id) : [...prev, place.id])}>{selectedIds.includes(place.id) ? <CheckSquare className="w-5 h-5 text-indigo-600"/> : <Square className="w-5 h-5 text-slate-400"/>}</button></td>
                <td className="p-4 font-bold">{place.name}</td>
                <td className="p-4 text-sm text-slate-500">{place.country} {place.type} / {place.address}</td>
                <td className="p-4 text-center"><button onClick={() => deletePlaces([place.id])} className="text-red-500 hover:text-red-700"><Trash2 className="w-5 h-5"/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
