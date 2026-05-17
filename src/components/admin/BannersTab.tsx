import React, { useState, useRef } from 'react';
import { Home, Upload, FileImage, Link as LinkIcon, Image as ImageIcon, Save, X, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import TypeBadge from '../TypeBadge';
import { supabase } from '../../supabase';
import { uploadImageToStorage } from '../../lib/storage';

interface BannersTabProps {
  events: any[];
  handleBannerToggle: (id: string, current: boolean) => Promise<void>;
  promoBanners: any[];
  setPromoBanners: React.Dispatch<React.SetStateAction<any[]>>;
}

export const BannersTab: React.FC<BannersTabProps> = ({
  events,
  handleBannerToggle,
  promoBanners,
  setPromoBanners
}) => {
  const [editBannerId, setEditBannerId] = useState<string | null>(null);
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startEditBanner = (banner: any) => {
    setEditBannerId(banner.id);
    setEditImageUrl(banner.imageUrl);
    setEditLinkUrl(banner.linkUrl);
  };

  const handlePromoBannerSave = async (id: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('promo_banners').upsert({
        id,
        image_url: editImageUrl,
        link_url: editLinkUrl,
        is_active: true,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      
      setPromoBanners(prev => {
        const existing = prev.find(b => b.id === id);
        const bannerData = { id, imageUrl: editImageUrl, linkUrl: editLinkUrl, isActive: true };
        if (existing) {
          return prev.map(b => b.id === id ? { ...b, ...bannerData } : b);
        }
        return [bannerData, ...prev];
      });

      setEditBannerId(null);
      alert('홍보 배너가 저장되었습니다.');
    } catch (error) {
      alert('배너 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageFile = async (file: File) => {
    setIsResizing(true);
    try {
      const url = await uploadImageToStorage(file, 'brand');
      setEditImageUrl(url);
    } catch (error) {
      alert("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsResizing(false);
    }
  };

  const handleDrag = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActiveId(id);
    } else if (e.type === "dragleave") {
      setDragActiveId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveId(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-8 flex flex-col h-full min-h-0 overflow-y-auto no-scrollbar pb-10">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">메인 배너 설정 (최대 5개)</h3>
          <p className="text-sm text-slate-500">현재 {events.filter(e => e.isBanner).length}/5 등록됨</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          {events.filter(e => e.isBanner).length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-slate-400">
              <Home className="w-12 h-12 mb-4 opacity-20" />
              <p>등록된 배너가 없습니다. '행사 관리' 탭에서 등록해주세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.filter(e => e.isBanner).map(e => (
                <div key={e.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="font-bold text-slate-800 dark:text-white truncate flex items-center">
                      <TypeBadge isLesson={e.isLesson} />
                      <span className="truncate">{e.title}</span>
                    </p>
                    <p className="text-xs text-slate-500">{e.hostName}</p>
                  </div>
                  <button 
                    onClick={() => handleBannerToggle(e.id, true)}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    해제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">홍보용 사이드 배너 (2개)</h3>
          <p className="text-sm text-slate-500">사이드바 방문자수 하단에 노출되는 배너입니다.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
          {[1, 2].map((num) => {
            const bannerId = `sidebar${num}`;
            const banner = promoBanners.find(b => b.id === bannerId) || { id: bannerId, imageUrl: '', linkUrl: '', isActive: false };
            const isEditing = editBannerId === bannerId;

            return (
              <div key={bannerId} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">Banner #{num}</span>
                  {!isEditing && (
                    <button 
                      onClick={() => startEditBanner(banner)}
                      className="text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      수정하기
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                     <div 
                       className={clsx(
                         "relative aspect-[16/9] w-full rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 overflow-hidden group cursor-pointer",
                         dragActiveId === bannerId 
                          ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10" 
                          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                       )}
                       onDragEnter={(e) => handleDrag(e, bannerId)}
                       onDragLeave={(e) => handleDrag(e, bannerId)}
                       onDragOver={(e) => handleDrag(e, bannerId)}
                       onDrop={(e) => handleDrop(e, bannerId)}
                       onClick={() => fileInputRef.current?.click()}
                     >
                        {isResizing ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                            <span className="text-[10px] font-bold text-slate-500">이미지 업로드 중...</span>
                          </div>
                        ) : editImageUrl ? (
                          <>
                            <img src={editImageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" alt="banner" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="bg-white/90 dark:bg-slate-900/90 p-2 rounded-full shadow-lg">
                                <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className={clsx(
                              "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                              dragActiveId === bannerId ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600" : "bg-white dark:bg-slate-800 text-slate-400"
                            )}>
                              <FileImage className="w-5 h-5" />
                            </div>
                            <div className="text-center px-4">
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">파일을 드래그하거나 클릭하여 로드</p>
                              <p className="text-[10px] text-slate-400 mt-1">포스터 또는 홍보 이미지 (WEBP/JPG/PNG)</p>
                            </div>
                          </>
                        )}
                        <input 
                          key={bannerId}
                          ref={fileInputRef}
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])}
                        />
                     </div>

                     <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">이미지 URL (직접 입력도 가능)</label>
                       <div className="relative">
                         <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                         <input 
                           type="text" 
                           value={editImageUrl}
                           onChange={(e) => setEditImageUrl(e.target.value)}
                           placeholder="https://..."
                           className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                         />
                       </div>
                     </div>
                     <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">연결 링크 (기본 #)</label>
                       <div className="relative">
                         <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                         <input 
                           type="text" 
                           value={editLinkUrl}
                           onChange={(e) => setEditLinkUrl(e.target.value)}
                           placeholder="https://..."
                           className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                         />
                       </div>
                     </div>
                     
                     <div className="flex gap-2 pt-2">
                        <button 
                          onClick={() => setEditBannerId(null)}
                          className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition-colors"
                        >
                          취소
                        </button>
                        <button 
                          onClick={() => handlePromoBannerSave(bannerId)}
                          disabled={isSaving}
                          className="flex-[2] py-2 text-xs font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                          {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          배너 저장
                        </button>
                     </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                     <div className="aspect-[16/9] w-full rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-100 dark:border-slate-800 relative group">
                        {banner.imageUrl ? (
                          <img src={banner.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="banner preview" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                             <ImageIcon className="w-8 h-8 mb-2 opacity-20" />
                             <span className="text-[10px] font-bold">이미지가 없습니다</span>
                          </div>
                        )}
                        {!banner.isActive && banner.imageUrl && (
                          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                             <span className="text-[10px] font-black text-white uppercase tracking-widest border border-white/30 px-2 py-1 rounded">Inactive</span>
                          </div>
                        )}
                     </div>
                     <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Link URL</p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate font-mono bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                          {banner.linkUrl || '# none'}
                        </p>
                     </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
