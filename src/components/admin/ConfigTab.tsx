import React, { useState } from 'react';
import { LayoutGrid, Save, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../../supabase';

interface DashboardConfig {
  partiesLimit: number;
  lessonsLimit: number;
  instructorsLimit: number;
  djMediaLimit: number;
  sectionOrder: string[];
}

interface ConfigTabProps {
  dashboardConfig: DashboardConfig;
  setDashboardConfig: React.Dispatch<React.SetStateAction<DashboardConfig>>;
}

export const ConfigTab: React.FC<ConfigTabProps> = ({
  dashboardConfig,
  setDashboardConfig
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleConfigSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('settings').upsert({
        key: 'dashboard',
        value: dashboardConfig,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      alert('홈 화면 구성이 저장되었습니다.');
    } catch (error) {
      alert('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto no-scrollbar pb-12">
      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/30">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">홈 화면 레이아웃 설정</h3>
            <p className="text-sm text-slate-500 font-medium">사용자 메인 페이지의 노출 개수와 순서를 조정합니다.</p>
          </div>
          <button 
            onClick={handleConfigSave}
            disabled={isSaving}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-sm shadow-xl shadow-indigo-600/20 hover:scale-105 transition-all flex items-center gap-2"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            설정 저장
          </button>
        </div>

        <div className="p-8 space-y-12">
          {/* 노출 개수 설정 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">파티 노출 (개)</label>
              <input 
                type="number" 
                value={dashboardConfig.partiesLimit}
                onChange={(e) => setDashboardConfig(prev => ({ ...prev, partiesLimit: Number(e.target.value) }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-xl font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">강습 노출 (개)</label>
              <input 
                type="number" 
                value={dashboardConfig.lessonsLimit}
                onChange={(e) => setDashboardConfig(prev => ({ ...prev, lessonsLimit: Number(e.target.value) }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-xl font-black text-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">인기 강사 (개)</label>
              <input 
                type="number" 
                value={dashboardConfig.instructorsLimit}
                onChange={(e) => setDashboardConfig(prev => ({ ...prev, instructorsLimit: Number(e.target.value) }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-xl font-black text-rose-600 focus:ring-2 focus:ring-rose-500/20 outline-none"
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">DJ & Media (개)</label>
              <input 
                type="number" 
                value={dashboardConfig.djMediaLimit}
                onChange={(e) => setDashboardConfig(prev => ({ ...prev, djMediaLimit: Number(e.target.value) }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-xl font-black text-amber-600 focus:ring-2 focus:ring-amber-500/20 outline-none"
              />
            </div>
          </div>

          {/* 섹션 순서 설정 */}
          <div className="space-y-6">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" /> 영역 노출 순서 (드래그 앤 드롭 대신 버튼으로 간편 조정)
            </h4>
            <div className="space-y-3 max-w-2xl">
              {dashboardConfig.sectionOrder.map((section, idx) => (
                <div key={section} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-xs text-indigo-600 shadow-sm">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-sm">
                      {section === 'parties' && 'Social Parties'}
                      {section === 'lessons' && 'Dance Lessons'}
                      {section === 'instructors' && 'Top Instructors'}
                      {section === 'djMedia' && 'DJ & Media Content'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => {
                        if (idx === 0) return;
                        const newOrder = [...dashboardConfig.sectionOrder];
                        [newOrder[idx-1], newOrder[idx]] = [newOrder[idx], newOrder[idx-1]];
                        setDashboardConfig(prev => ({ ...prev, sectionOrder: newOrder }));
                      }}
                      className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        if (idx === dashboardConfig.sectionOrder.length - 1) return;
                        const newOrder = [...dashboardConfig.sectionOrder];
                        [newOrder[idx+1], newOrder[idx]] = [newOrder[idx], newOrder[idx+1]];
                        setDashboardConfig(prev => ({ ...prev, sectionOrder: newOrder }));
                      }}
                      className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
