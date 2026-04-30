import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Upload, Image as ImageIcon, Globe, Smartphone, Share2, Save, RefreshCw, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useBrand } from '../../context/BrandContext';
import clsx from 'clsx';

interface BrandAssets {
  logo: string;
  favicon: string;
  ogImage: string;
  appIcon: string;
  siteTitle: string;
  siteDescription: string;
  keywords: string;
}

const DEFAULT_BRAND: BrandAssets = {
  logo: '',
  favicon: '',
  ogImage: '',
  appIcon: '',
  siteTitle: 'Dancehive',
  siteDescription: '지능형 라틴 댄스 이벤트 대시보드',
  keywords: '댄스하이브, dancehive, 살사, 바차타, 라틴댄스, 소셜댄스, 이벤트, 파티'
};

export function BrandTab() {
  const { refresh } = useBrand();
  const [assets, setAssets] = useState<BrandAssets>(DEFAULT_BRAND);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchBrandAssets();
  }, []);

  const fetchBrandAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'brand_assets')
        .maybeSingle();

      if (error) throw error;
      if (data?.value) {
        setAssets({ ...DEFAULT_BRAND, ...data.value });
      }
    } catch (err) {
      console.error('Error fetching brand assets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ 
          key: 'brand_assets', 
          value: assets,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      await refresh();
      setMessage({ type: 'success', text: '브랜드 자산이 성공적으로 저장되었습니다.' });
    } catch (err: any) {
      console.error('Error saving brand assets:', err);
      setMessage({ type: 'error', text: `저장 실패: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, key: keyof BrandAssets) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In a real app, you would upload to Supabase Storage:
    // const { data, error } = await supabase.storage.from('brand').upload(path, file);
    // For now, we'll convert to base64 for demo/simplicity if storage is not configured,
    // or just handle the UI flow.
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setAssets(prev => ({ ...prev, [key]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <p className="text-sm font-bold">브랜드 설정을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">브랜드 자산 관리</h2>
          <p className="text-sm text-slate-500 font-medium">로고, 파비콘, 소셜 공유 이미지 등 사이트의 정체성을 설정합니다.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          설정 저장하기
        </button>
      </div>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={clsx(
            "p-4 rounded-2xl flex items-center gap-3 border shadow-sm",
            message.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-700"
          )}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm font-bold">{message.text}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Basic Brand Info */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-black text-slate-900 dark:text-white">기본 정보</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">사이트 제목</label>
              <input
                type="text"
                value={assets.siteTitle}
                onChange={(e) => setAssets(prev => ({ ...prev, siteTitle: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="예: Dancehive"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">사이트 설명 (Meta Description)</label>
              <textarea
                value={assets.siteDescription}
                onChange={(e) => setAssets(prev => ({ ...prev, siteDescription: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all min-h-[80px]"
                placeholder="검색 결과 및 SNS 공유 시 표시될 설명입니다."
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">SEO 키워드 (쉼표로 구분)</label>
              <input
                type="text"
                value={assets.keywords}
                onChange={(e) => setAssets(prev => ({ ...prev, keywords: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="예: 댄스하이브, dancehive, 살사, 바차타, 라틴댄스"
              />
              <p className="text-[10px] text-slate-400 mt-1.5 ml-1">구글, 네이버 등 검색 엔진이 사이트를 인덱싱할 때 참조하는 핵심 단어입니다.</p>
            </div>
          </div>
        </section>

        {/* OG Image Management */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Share2 className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-black text-slate-900 dark:text-white">SNS 공유 이미지 (OG Image)</h3>
          </div>

          <AssetUploader 
            label="Open Graph Image"
            desc="카카오톡, 페이스북 공유 시 표시 (권장: 1200x630)"
            value={assets.ogImage}
            onUpload={(e) => handleFileChange(e, 'ogImage')}
            onRemove={() => setAssets(prev => ({ ...prev, ogImage: '' }))}
            aspectRatio="video"
          />
          
          {/* Social Preview Mockup */}
          {assets.ogImage && (
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
               <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Share Preview Mockup</p>
               <div className="max-w-[300px] bg-white dark:bg-slate-900 rounded-lg overflow-hidden shadow-md border border-slate-100 dark:border-slate-800 mx-auto">
                 <img src={assets.ogImage} alt="OG Preview" className="w-full h-32 object-cover" />
                 <div className="p-3">
                   <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{assets.siteTitle}</p>
                   <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{assets.siteDescription}</p>
                   <p className="text-[10px] text-slate-400 mt-2">dancehive.app</p>
                 </div>
               </div>
            </div>
          )}
        </section>

        {/* Logo & Favicon */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <ImageIcon className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-black text-slate-900 dark:text-white">로고 및 파비콘</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AssetUploader 
              label="Main Logo"
              desc="상단 바 및 주요 영역 표시"
              value={assets.logo}
              onUpload={(e) => handleFileChange(e, 'logo')}
              onRemove={() => setAssets(prev => ({ ...prev, logo: '' }))}
            />
            <AssetUploader 
              label="Favicon"
              desc="브라우저 탭 아이콘 (1:1 권장)"
              value={assets.favicon}
              onUpload={(e) => handleFileChange(e, 'favicon')}
              onRemove={() => setAssets(prev => ({ ...prev, favicon: '' }))}
              small
            />
          </div>
        </section>

        {/* Mobile App Icon */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Smartphone className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-black text-slate-900 dark:text-white">모바일 앱 아이콘 (PWA)</h3>
          </div>

          <AssetUploader 
            label="App Icon"
            desc="홈 화면 추가 시 표시 (512x512 권장)"
            value={assets.appIcon}
            onUpload={(e) => handleFileChange(e, 'appIcon')}
            onRemove={() => setAssets(prev => ({ ...prev, appIcon: '' }))}
            small
          />

          <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold leading-relaxed">
              * 업로드된 자산은 사이트 운영에 즉시 반영되지 않을 수 있습니다.<br/>
              메타태그(OG)와 파비콘은 배포 환경의 index.html 및 manifest.json 파일 업데이트가 병행되어야 합니다.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function AssetUploader({ label, desc, value, onUpload, onRemove, small = false, aspectRatio = "square" }: any) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</h4>
        <p className="text-[10px] text-slate-500 font-medium ml-1 mt-0.5">{desc}</p>
      </div>
      
      <div className={clsx(
        "relative rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-4",
        value ? "border-indigo-100 bg-white dark:bg-slate-800" : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900",
        aspectRatio === 'video' ? "aspect-video" : "aspect-square max-w-[180px]"
      )}>
        {value ? (
          <>
            <img src={value} alt={label} className={clsx("w-full h-full object-contain rounded-lg p-2", small && "max-w-[64px]")} />
            <div className="absolute top-2 right-2 flex gap-1">
              <button 
                onClick={onRemove}
                className="p-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 shadow-md transform hover:scale-110 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        ) : (
          <label className="cursor-pointer flex flex-col items-center group">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
              <Upload className="w-5 h-5 text-slate-400" />
            </div>
            <span className="text-[11px] font-black text-slate-400 tracking-tight uppercase">Upload File</span>
            <input type="file" className="hidden" accept="image/*" onChange={onUpload} />
          </label>
        )}
      </div>
    </div>
  );
}
