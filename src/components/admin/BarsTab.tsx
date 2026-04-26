import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Plus, Trash2, Edit } from 'lucide-react';

export function BarsTab() {
  const [bars, setBars] = useState<any[]>([]);
  const [newBar, setNewBar] = useState({ name: '', country: '', region: '', address: '', kakaoMapUrl: '', naverMapUrl: '', googleMapUrl: '' });

  useEffect(() => {
    fetchBars();
  }, []);

  async function fetchBars() {
    const { data } = await supabase.from('bars').select('*');
    if (data) setBars(data);
  }

  async function addBar() {
    await supabase.from('bars').insert(newBar);
    setNewBar({ name: '', country: '', region: '', address: '', kakaoMapUrl: '', naverMapUrl: '', googleMapUrl: '' });
    fetchBars();
  }

  async function deleteBar(id: string) {
    await supabase.from('bars').delete().eq('id', id);
    fetchBars();
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">바 관리</h2>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <input placeholder="이름" value={newBar.name} onChange={e => setNewBar({...newBar, name: e.target.value})} className="p-2 border rounded"/>
        <input placeholder="국가" value={newBar.country} onChange={e => setNewBar({...newBar, country: e.target.value})} className="p-2 border rounded"/>
        <input placeholder="지역" value={newBar.region} onChange={e => setNewBar({...newBar, region: e.target.value})} className="p-2 border rounded"/>
        <input placeholder="주소" value={newBar.address} onChange={e => setNewBar({...newBar, address: e.target.value})} className="p-2 border rounded"/>
        <button onClick={addBar} className="bg-indigo-600 text-white p-2 rounded flex items-center justify-center"><Plus className="w-4 h-4 mr-2"/> 추가</button>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-left">이름</th>
            <th className="p-2 text-left">지역</th>
            <th className="p-2">작업</th>
          </tr>
        </thead>
        <tbody>
          {bars.map(bar => (
            <tr key={bar.id} className="border-b">
              <td className="p-2">{bar.name}</td>
              <td className="p-2">{bar.country} / {bar.region}</td>
              <td className="p-2 text-center"><button onClick={() => deleteBar(bar.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
