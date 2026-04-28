import React, { useState, useEffect } from 'react';
import { LayoutGrid, Save, RefreshCw, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../../supabase';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  events: any[]; 
  users: any[];
}

// Sortable Item Component
interface SortableItemProps {
  item: any;
}

const SortableItem = ({ item }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 cursor-grab">
      <div className="flex items-center gap-3">
        <GripVertical className="text-slate-400 w-5 h-5" />
        <span className="font-bold text-sm tracking-tight">{item.title}</span>
      </div>
      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Priority: {item.priority || 0}</span>
    </div>
  );
};

export const ConfigTab: React.FC<ConfigTabProps> = ({
  dashboardConfig,
  setDashboardConfig,
  events,
  users
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [sectionItems, setSectionItems] = useState<any[]>([]);

  useEffect(() => {
    if (selectedSection) {
      let items: any[] = [];
      if (selectedSection === 'parties') {
        items = events.filter(e => !e.isLesson).map(e => ({ ...e, title: e.title }));
      } else if (selectedSection === 'lessons') {
        items = events.filter(e => e.isLesson).map(e => ({ ...e, title: e.title }));
      } else if (selectedSection === 'instructors') {
        items = users.filter(u => u.role === 'instructor').map(u => ({ ...u, title: u.displayName }));
      } else if (selectedSection === 'djMedia') {
        // 'djMedia' 섹션에 표시할 데이터가 무엇인지 정의가 필요합니다.
        // 여기서는 임시로 빈 배열을 반환합니다. 데이터 소스를 확인해주세요.
        items = [];
      }
      setSectionItems(items.sort((a,b) => (b.priority || 0) - (a.priority || 0)));
    }
  }, [selectedSection, events, users]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setSectionItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update priorities based on new order
        updatePriorities(newItems);
        
        return newItems;
      });
    }
  };

  const updatePriorities = async (items: any[]) => {
    setIsSaving(true);
    try {
      const updates = items.map((item, idx) => ({
        id: item.id,
        priority: items.length - idx 
      }));
      
      const tableName = (selectedSection === 'parties' || selectedSection === 'lessons') ? 'events' : 'profiles';
      
      // Update in database
      const { error } = await supabase
        .from(tableName) 
        .upsert(updates);
        
      if (error) throw error;
      
    } catch (error) {
      console.error('Error updating priorities:', error);
      alert('순서 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

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
                      onClick={() => setSelectedSection(section)}
                      className="p-2 mr-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 rounded-lg text-indigo-600 dark:text-indigo-400 font-black text-xs"
                    >
                      항목 관리
                    </button>
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

      {/* Selected Section Details */}
      {selectedSection && (
        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-slate-900 dark:text-white capitalize">{selectedSection} 항목 순서 조정</h3>
            <button
               onClick={() => setSelectedSection(null)}
               className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-bold"
            >
              닫기
            </button>
          </div>
          <div className="space-y-3">
             {/* Filtered List and Reordering */}
             <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
             >
                <SortableContext
                  items={sectionItems}
                  strategy={verticalListSortingStrategy}
                >
                  {sectionItems.map((item) => (
                    <SortableItem key={item.id} item={item} />
                  ))}
                </SortableContext>
             </DndContext>
          </div>
        </div>
      )}
    </div>
  );
};
