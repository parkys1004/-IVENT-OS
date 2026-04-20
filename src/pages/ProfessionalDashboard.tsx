import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Music, GraduationCap, Camera, CalendarDays, Star, Settings, PlayCircle, Users, Image as ImageIcon, Briefcase, ChevronRight, CheckCircle2, XCircle, Clock, Plus, BarChart3, CreditCard, PenTool } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';

type MenuKey = 'activities' | 'events' | 'finance' | 'profile';
type TabKey = string;

export default function ProfessionalDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [activeMenu, setActiveMenu] = useState<MenuKey>('activities');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  
  // Handlers
  const handleMenuClick = (menu: MenuKey) => {
    setActiveMenu(menu);
    setActiveTab('all');
  };

  // --- Sub-contents ---

  const renderActivitiesContent = () => (
    <div className="space-y-6 flex flex-col h-full overflow-y-auto no-scrollbar pb-20">
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <button onClick={() => setActiveTab('all')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'all' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          예정된 스케줄
        </button>
        <button onClick={() => setActiveTab('pending')} className={clsx("px-4 py-3 font-bold transition-colors flex items-center gap-2", activeTab === 'pending' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          수락 대기
          <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">3</span>
        </button>
        <button onClick={() => setActiveTab('completed')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'completed' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          완료/취소
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-2">이번 달 확정 스케줄</div>
          <div className="text-3xl font-black text-slate-800 dark:text-white">5<span className="text-sm font-normal text-slate-500 ml-1">건</span></div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-2">진행 완료</div>
          <div className="text-3xl font-black text-slate-800 dark:text-white">12<span className="text-sm font-normal text-slate-500 ml-1">건</span></div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 mx-auto w-full rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex-1 flex flex-col p-12 text-center text-slate-500 items-center justify-center min-h-[300px]">
          {activeTab === 'pending' ? (
            <>
              <Clock className="w-12 h-12 mb-4 text-orange-300" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">대기 중인 섭외 요청</h3>
              <p>현재 검토해야 할 섭외 요청이 3건 있습니다.</p>
              <button className="mt-4 px-6 py-2 bg-indigo-500 text-white font-bold rounded-lg hover:bg-indigo-600 transition-colors">요청 확인하기</button>
            </>
          ) : (
            <>
              <CalendarDays className="w-12 h-12 mb-4 text-slate-300" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">일정이 없습니다</h3>
              <p>다양한 행사에 지원하거나 포트폴리오를 업데이트 해보세요.</p>
            </>
          )}
      </div>
    </div>
  );

  const renderEventsContent = () => (
    <div className="space-y-6 flex flex-col h-full overflow-y-auto no-scrollbar pb-20">
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <button onClick={() => setActiveTab('all')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'all' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          행사 등록 폼
        </button>
        <button onClick={() => setActiveTab('past')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'past' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          이전 등록 내역
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {activeTab === 'all' ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center text-center py-20">
             <Plus className="w-16 h-16 text-indigo-200 dark:text-indigo-900 mb-6" />
             <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-3">새로운 행사를 주최하시나요?</h3>
             <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">기본 정보부터 포스터 등록까지 쉽고 편하게 새로운 댄스 행사를 개설하세요.</p>
             <button onClick={() => navigate('/create')} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 text-lg">
               <Plus className="w-5 h-5" /> 행사 등록 시작하기
             </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center text-center py-20">
            <CalendarDays className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500">이전에 등록했던 행사가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderFinanceContent = () => (
    <div className="space-y-6 flex flex-col h-full overflow-y-auto no-scrollbar pb-20">
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <button onClick={() => setActiveTab('all')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'all' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          정산 대기
        </button>
        <button onClick={() => setActiveTab('completed')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'completed' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          정산 완료
        </button>
        <button onClick={() => setActiveTab('tax')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'tax' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          세금계산서
        </button>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-indigo-900 dark:from-slate-900 dark:to-indigo-900/60 rounded-3xl p-8 shadow-lg text-white shrink-0">
        <div className="opacity-80 text-sm font-bold tracking-wider uppercase mb-2">이번 달 예상 정산액</div>
        <div className="text-5xl font-black mb-6">₩1,200,000</div>
        <div className="flex justify-between items-end">
          <div className="opacity-75 text-sm">정산 예정일: 매월 10일</div>
          <button className="px-5 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl font-bold transition-colors">
            출금 신청
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 mx-auto w-full rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex-1 p-12 text-center text-slate-500 flex flex-col items-center justify-center min-h-[300px]">
        <CreditCard className="w-12 h-12 mb-4 text-slate-300" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">최근 내역이 없습니다</h3>
      </div>
    </div>
  );

  const renderProfileContent = () => (
    <div className="space-y-6 flex flex-col h-full overflow-y-auto no-scrollbar pb-20">
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <button onClick={() => setActiveTab('all')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'all' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          프로필 수정
        </button>
        <button onClick={() => setActiveTab('portfolio')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'portfolio' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          포트폴리오 관리
        </button>
        <button onClick={() => setActiveTab('reviews')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'reviews' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          팬/리뷰
        </button>
      </div>

      <div className="flex-1">
        {activeTab === 'portfolio' ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 flex flex-col h-full min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">내 포트폴리오</h3>
              <button className="flex items-center gap-2 bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-200 transition-colors">
                <Plus className="w-4 h-4" /> 포트폴리오 추가
              </button>
            </div>
            <div className="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-400">
              등록된 포트폴리오 영상/사진이 없습니다.
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
            <div className="max-w-xl">
               <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6">기본 정보 설정</h3>
               
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">활동명</label>
                   <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3" defaultValue={profile?.displayName} />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">소개(한 줄)</label>
                   <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3" placeholder="예: 힙합 베이스의 올라운더 댄서입니다" />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">상세 이력 / 정보</label>
                   <textarea className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 min-h-[120px]" placeholder="경력이나 상세한 장르 소개를 적어주세요."></textarea>
                 </div>
               </div>
               
               <button className="mt-8 px-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 w-full sm:w-auto">변경사항 저장하기</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-slate-950 h-full w-full min-h-0">
      
      {/* LNB (Left Navigation Bar) */}
      <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-sm z-10 shrink-0 pb-4 hidden lg:flex">
        <div className="p-6">
          <div className="bg-indigo-600 rounded-2xl p-6 shadow-lg shadow-indigo-600/20 text-white mb-8">
            <p className="font-bold text-indigo-100 text-[10px] uppercase tracking-widest mb-2">
              {profile?.role === 'dj' ? 'Professional DJ' : 
               profile?.role === 'instructor' ? 'Professional Instructor' : 
               profile?.role === 'media' ? 'Media Expert' : 'Professional Host'}
            </p>
            <p className="text-indigo-200 text-xs font-medium mb-1 opacity-80">멋진 행사를 기대할게요!</p>
            <p className="font-black text-xl leading-tight truncate">{profile?.displayName || '전문가'}님</p>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => handleMenuClick('activities')}
              className={clsx("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm", activeMenu === 'activities' ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-black shadow-sm" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
            >
              <CalendarDays className="w-5 h-5" /> 활동 스케줄
            </button>
            <button 
              onClick={() => handleMenuClick('events')}
              className={clsx("w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all text-sm", activeMenu === 'events' ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-black shadow-sm" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
            >
              <div className="flex items-center gap-3"><Star className="w-5 h-5" /> 내 행사 관리</div>
              {activeMenu === 'events' && <ChevronRight className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => handleMenuClick('finance')}
              className={clsx("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm", activeMenu === 'finance' ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-black shadow-sm" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
            >
              <CreditCard className="w-5 h-5" /> 수익 및 정산
            </button>
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-slate-100 dark:border-slate-800">
           <button 
              onClick={() => handleMenuClick('profile')}
              className={clsx("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm", activeMenu === 'profile' ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-black shadow-sm" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white")}
            >
              <Settings className="w-5 h-5" /> 프로필 설정
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col p-4 lg:p-10 min-h-0">
        
        {/* Mobile Nav */}
        <div className="lg:hidden w-full mb-6 max-w-full overflow-x-auto flex gap-2 shrink-0 no-scrollbar">
           {['activities', 'events', 'finance', 'profile'].map((menu) => (
              <button 
                key={menu}
                onClick={() => handleMenuClick(menu as MenuKey)}
                className={clsx(
                  "whitespace-nowrap px-4 py-2 rounded-xl font-black text-sm border transition-all shadow-sm", 
                  activeMenu === menu 
                    ? "bg-slate-800 dark:bg-indigo-400 text-white dark:text-slate-900 border-slate-800 dark:border-indigo-400 scale-105" 
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                )}
              >
                {menu === 'activities' ? '활동' : menu === 'events' ? '행사관리' : menu === 'finance' ? '정산' : '프로필'}
              </button>
           ))}
        </div>

        {/* Breadcrumbs (Desktop) */}
        <div className="hidden lg:flex items-center gap-2 text-sm text-slate-500 font-bold mb-8 tracking-tight shrink-0">
          <span className="capitalize">{profile?.role || 'Professional'}</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-white capitalize">
            {activeMenu === 'activities' && '활동 스케줄'}
            {activeMenu === 'events' && '행사 관리'}
            {activeMenu === 'finance' && '수익 내역'}
            {activeMenu === 'profile' && '프로필 설정'}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeMenu}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-hidden flex flex-col h-full min-h-0"
          >
            {activeMenu === 'activities' && renderActivitiesContent()}
            {activeMenu === 'events' && renderEventsContent()}
            {activeMenu === 'finance' && renderFinanceContent()}
            {activeMenu === 'profile' && renderProfileContent()}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
