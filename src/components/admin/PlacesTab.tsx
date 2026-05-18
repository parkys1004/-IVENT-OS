import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabase';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Trash2, Search, CheckSquare, Square,
  CheckCircle2, XCircle, MapPin, Clock, Building2,
  ExternalLink, ChevronDown, ChevronUp, Filter,
  AlertTriangle
} from 'lucide-react';
import PlaceSearch from '../PlaceSearch';
import clsx from 'clsx';

interface Place {
  id: string;
  name: string;
  country: string;
  type: string;
  address: string;
  kakao_map_url?: string;
  naver_map_url?: string;
  google_map_url?: string;
  is_approved: boolean;
  created_at: string;
  submitted_by?: string;
  source_type?: string;
  source_event_id?: string;
}

const PLACE_TYPES = ['클럽', '바', '클럽/바', '학원', '학원/바', '펍', '루프탑 바', '호텔', '동호회', '기타'];

const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all';

export function PlacesTab() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [toast, setToast] = useState('');

  const [newPlace, setNewPlace] = useState({
    name: '',
    country: '',
    type: '',
    address: '',
    kakao_map_url: '',
    naver_map_url: '',
    google_map_url: '',
  });

  useEffect(() => { fetchPlaces(); }, []);

  async function fetchPlaces() {
    setLoading(true);
    const { data, error } = await supabase
      .from('places')
      .select('id, name, country, type, address, kakao_map_url, naver_map_url, google_map_url, is_approved, created_at, submitted_by, source_type, source_event_id')
      .order('is_approved', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      // submitted_by 컬럼이 없으면 기본 쿼리로 재시도
      const { data: fallback } = await supabase
        .from('places')
        .select('id, name, country, type, address, kakao_map_url, naver_map_url, google_map_url, is_approved, created_at')
        .order('is_approved', { ascending: true })
        .order('created_at', { ascending: false });
      setPlaces((fallback || []) as Place[]);
    } else {
      setPlaces((data || []) as Place[]);
    }
    setLoading(false);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  async function approvePlace(id: string) {
    const { error } = await supabase.from('places').update({ is_approved: true }).eq('id', id);
    if (error) { showToast('승인 중 오류가 발생했습니다.'); return; }
    showToast('장소가 승인되었습니다.');
    fetchPlaces();
  }

  async function rejectPlace(id: string) {
    if (!confirm('이 장소 접수를 거절(삭제)하시겠습니까?')) return;
    await supabase.from('places').delete().eq('id', id);
    showToast('장소 접수가 거절되었습니다.');
    fetchPlaces();
  }

  async function deletePlaces(ids: string[]) {
    if (!confirm(`정말 ${ids.length}개 항목을 삭제하시겠습니까?`)) return;
    await supabase.from('places').delete().in('id', ids);
    setSelectedIds([]);
    fetchPlaces();
  }

  async function addPlace() {
    if (!newPlace.name.trim() || !newPlace.address.trim()) {
      showToast('장소 이름과 주소는 필수입니다.');
      return;
    }
    const { error } = await supabase.from('places').insert({
      ...newPlace,
      is_approved: true,
      source_type: 'manual',
    });
    if (error) { showToast('장소 추가 중 오류가 발생했습니다.'); return; }
    setNewPlace({ name: '', country: '', type: '', address: '', kakao_map_url: '', naver_map_url: '', google_map_url: '' });
    setShowAddForm(false);
    showToast('장소가 등록되었습니다.');
    fetchPlaces();
  }

  // Google Places 자동완성으로 장소 선택 시
  function handlePlaceSelect(googlePlace: any) {
    const name = googlePlace.name || '';
    const address = googlePlace.formatted_address || '';
    let country = '대한민국';
    if (googlePlace.address_components) {
      const countryComp = googlePlace.address_components.find((c: any) =>
        c.types?.includes('country')
      );
      if (countryComp) country = countryComp.long_name;
    }
    setNewPlace(prev => ({ ...prev, name, address, country }));
  }

  const pendingPlaces = useMemo(() => places.filter(p => !p.is_approved), [places]);
  const approvedPlaces = useMemo(() => {
    return places
      .filter(p => p.is_approved)
      .filter(p =>
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.country || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [places, searchTerm]);

  const displayList = activeTab === 'pending' ? pendingPlaces : approvedPlaces;

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleSelectAll = () =>
    setSelectedIds(prev => prev.length === displayList.length ? [] : displayList.map(p => p.id));

  const sourceLabel = (type?: string) => {
    switch (type) {
      case 'party': return '행사 등록';
      case 'lesson': return '강습 등록';
      default: return '직접 등록';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">장소 관리</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">행사·강습 등록 시 자동으로 접수된 장소를 승인하세요.</p>
        </div>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          새 장소 직접 등록
        </button>
      </div>

      {/* 새 장소 등록 폼 (Google Maps 자동완성) */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-500" />
                새 장소 등록 (즉시 승인)
              </h3>

              {/* Google Maps 검색 */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Google 장소 검색 (자동 완성)</label>
                <PlaceSearch
                  placeholder="장소명 또는 주소 검색..."
                  onPlaceSelect={handlePlaceSelect}
                />
                <p className="text-[11px] text-slate-400 mt-1">검색하면 이름·주소·국가가 자동으로 채워집니다.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">장소 이름 *</label>
                  <input
                    placeholder="예) 클럽 보니따"
                    value={newPlace.name}
                    onChange={e => setNewPlace(p => ({ ...p, name: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">국가</label>
                  <input
                    placeholder="예) 대한민국"
                    value={newPlace.country}
                    onChange={e => setNewPlace(p => ({ ...p, country: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">주소 *</label>
                <input
                  placeholder="전체 주소"
                  value={newPlace.address}
                  onChange={e => setNewPlace(p => ({ ...p, address: e.target.value }))}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">장소 유형</label>
                <div className="flex flex-wrap gap-2">
                  {PLACE_TYPES.map(t => (
                    <button
                      key={t} type="button"
                      onClick={() => setNewPlace(p => ({ ...p, type: t }))}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                        newPlace.type === t
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                  <input
                    placeholder="직접 입력"
                    value={PLACE_TYPES.includes(newPlace.type) ? '' : newPlace.type}
                    onChange={e => setNewPlace(p => ({ ...p, type: e.target.value }))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-dashed border-slate-300 dark:border-slate-600 bg-transparent text-slate-500 dark:text-slate-400 w-24 focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">카카오맵 URL</label>
                  <input
                    placeholder="https://map.kakao.com/..."
                    value={newPlace.kakao_map_url}
                    onChange={e => setNewPlace(p => ({ ...p, kakao_map_url: e.target.value }))}
                    className={inputCls + ' text-xs'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">네이버맵 URL</label>
                  <input
                    placeholder="https://map.naver.com/..."
                    value={newPlace.naver_map_url}
                    onChange={e => setNewPlace(p => ({ ...p, naver_map_url: e.target.value }))}
                    className={inputCls + ' text-xs'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">구글맵 URL</label>
                  <input
                    placeholder="https://maps.google.com/..."
                    value={newPlace.google_map_url}
                    onChange={e => setNewPlace(p => ({ ...p, google_map_url: e.target.value }))}
                    className={inputCls + ' text-xs'}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={addPlace}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-black text-sm transition-all active:scale-95"
                >
                  즉시 승인 등록
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-3 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  취소
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 탭 */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
        <button
          onClick={() => { setActiveTab('pending'); setSelectedIds([]); }}
          className={clsx(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all',
            activeTab === 'pending'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          )}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          승인 대기
          {pendingPlaces.length > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {pendingPlaces.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('approved'); setSelectedIds([]); }}
          className={clsx(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all',
            activeTab === 'approved'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          )}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          등록된 장소
          <span className="text-xs text-slate-400 dark:text-slate-500">({approvedPlaces.length})</span>
        </button>
      </div>

      {/* 검색 & 일괄 삭제 (승인된 장소 탭) */}
      {activeTab === 'approved' && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="이름, 주소, 국가 검색..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          {selectedIds.length > 0 && (
            <button
              onClick={() => deletePlaces(selectedIds)}
              className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              일괄 삭제 ({selectedIds.length})
            </button>
          )}
        </div>
      )}

      {/* 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayList.length === 0 ? (
        <div className="text-center py-20 text-slate-400 dark:text-slate-500">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-bold">
            {activeTab === 'pending' ? '승인 대기 중인 장소가 없습니다.' : '등록된 장소가 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {/* 전체 선택 헤더 */}
          {activeTab === 'approved' && (
            <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
              <button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600 transition-colors">
                {selectedIds.length === displayList.length && displayList.length > 0
                  ? <CheckSquare className="w-5 h-5 text-indigo-600" />
                  : <Square className="w-5 h-5" />}
              </button>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                총 {displayList.length}개
              </span>
            </div>
          )}

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <AnimatePresence>
              {displayList.map((place, idx) => (
                <motion.div
                  key={place.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  {/* 선택 체크박스 (승인된 탭만) */}
                  {activeTab === 'approved' && (
                    <button onClick={() => toggleSelect(place.id)} className="mt-0.5 shrink-0">
                      {selectedIds.includes(place.id)
                        ? <CheckSquare className="w-5 h-5 text-indigo-600" />
                        : <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />}
                    </button>
                  )}

                  {/* 장소 아이콘 */}
                  <div className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    place.is_approved
                      ? 'bg-emerald-50 dark:bg-emerald-900/20'
                      : 'bg-amber-50 dark:bg-amber-900/20'
                  )}>
                    <MapPin className={clsx('w-5 h-5', place.is_approved ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')} />
                  </div>

                  {/* 상세 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-800 dark:text-white text-sm">{place.name}</span>
                      {place.type && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {place.type}
                        </span>
                      )}
                      {place.source_type && (
                        <span className={clsx(
                          'px-2 py-0.5 rounded-lg text-[10px] font-bold',
                          place.source_type === 'party'
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                            : place.source_type === 'lesson'
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        )}>
                          {sourceLabel(place.source_type)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {place.country && <span className="font-bold">{place.country} · </span>}
                      {place.address}
                    </p>
                    {/* 지도 링크 */}
                    {(place.kakao_map_url || place.naver_map_url || place.google_map_url) && (
                      <div className="flex items-center gap-2 mt-1.5">
                        {place.kakao_map_url && (
                          <a href={place.kakao_map_url} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 hover:underline flex items-center gap-0.5">
                            <ExternalLink className="w-2.5 h-2.5" /> 카카오
                          </a>
                        )}
                        {place.naver_map_url && (
                          <a href={place.naver_map_url} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] font-bold text-green-600 dark:text-green-400 hover:underline flex items-center gap-0.5">
                            <ExternalLink className="w-2.5 h-2.5" /> 네이버
                          </a>
                        )}
                        {place.google_map_url && (
                          <a href={place.google_map_url} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">
                            <ExternalLink className="w-2.5 h-2.5" /> 구글
                          </a>
                        )}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      {new Date(place.created_at).toLocaleDateString('ko-KR')} 접수
                    </p>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex items-center gap-2 shrink-0">
                    {activeTab === 'pending' ? (
                      <>
                        <button
                          onClick={() => approvePlace(place.id)}
                          className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-3 py-2 rounded-xl text-xs font-black hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all active:scale-95"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          승인
                        </button>
                        <button
                          onClick={() => rejectPlace(place.id)}
                          className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-2 rounded-xl text-xs font-black hover:bg-red-100 dark:hover:bg-red-900/30 transition-all active:scale-95"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          거절
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => deletePlaces([place.id])}
                        className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
