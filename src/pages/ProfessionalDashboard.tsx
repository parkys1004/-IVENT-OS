import React from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Music, GraduationCap, Camera, CalendarDays, Star, Settings, PlayCircle, Users, Image as ImageIcon, Briefcase, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProfessionalDashboard() {
  const { profile } = useAuth();
  
  const getRoleIcon = () => {
    switch(profile?.role) {
      case 'dj': return <Music className="w-12 h-12 text-blue-500" />;
      case 'instructor': return <GraduationCap className="w-12 h-12 text-emerald-500" />;
      case 'media': return <Camera className="w-12 h-12 text-purple-500" />;
      default: return <Star className="w-12 h-12 text-amber-500" />;
    }
  };

  const getRoleTitle = () => {
    switch(profile?.role) {
      case 'dj': return 'DJ 대시보드';
      case 'instructor': return '강사 대시보드';
      case 'media': return '포토/영상 대시보드';
      default: return '전문가 대시보드';
    }
  };
  
  const getPersonalizedGreeting = () => {
    const name = profile?.displayName || '전문가';
    switch(profile?.role) {
      case 'dj': return `${name} DJ님, 이번 주 파티 섭외 요청이 들어왔어요! 🎧`;
      case 'instructor': return `${name} 강사님, 오늘 진행할 클래스가 1건 있습니다! 🏃‍♂️`;
      case 'media': return `${name} 작가님, 오늘 촬영 스케줄은 2건입니다! 📸`;
      default: return `${name}님, 멋진 하루 되세요! ✨`;
    }
  };

  const renderRoleSpecificContent = () => {
    switch(profile?.role) {
      case 'dj':
        return (
          <>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
                  <PlayCircle className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">믹스셋 & 플레이리스트</h3>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">내 대표 장르와 최근 믹스셋을 업데이트하여 섭외 확률을 높이세요.</p>
              <button className="w-full py-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                + 새 믹스셋 등록
              </button>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">섭외 문의 관리</h3>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">대기 중인 문의</p>
                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">1건</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">1</div>
              </div>
            </motion.div>
          </>
        );
      case 'instructor':
        return (
          <>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">수강생 현황</h3>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">현재 진행 중인 클래스의 수강생 등록 및 출석 현황입니다.</p>
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-slate-600 dark:text-slate-400">이번 달 수강생 수</span>
                <span className="font-bold text-emerald-600">총 24명</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5">
                <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '65%' }}></div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-teal-50 dark:bg-teal-900/20 text-teal-600 rounded-xl">
                  <PlayCircle className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">튜토리얼 영상 관리</h3>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">수강생들을 위한 안무 영상이나 튜토리얼을 업로드하세요.</p>
              <button className="w-full py-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                + 새 클래스/영상 등록
              </button>
            </motion.div>
          </>
        );
      case 'media':
        return (
          <>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">촬영 의뢰 현황</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                  <span className="block text-xs text-slate-500 dark:text-slate-400 mb-1">대기중</span>
                  <span className="font-bold text-lg text-slate-800 dark:text-slate-200">2건</span>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl text-center">
                  <span className="block text-xs text-purple-600 dark:text-purple-400 mb-1">진행중</span>
                  <span className="font-bold text-lg text-purple-700 dark:text-purple-300">1건</span>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-pink-50 dark:bg-pink-900/20 text-pink-600 rounded-xl">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">고화질 원본 전달하기</h3>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">완성된 작업물의 구글 드라이브나 링크를 의뢰인에게 전달하세요.</p>
              <button className="w-full py-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                새 링크 업로드
              </button>
            </motion.div>
          </>
        );
      default: return null;
    }
  };

  return (
    <div className="w-full space-y-8 pb-20">
      {/* Header section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl ring-1 ring-slate-100 dark:ring-slate-700">
          {getRoleIcon()}
        </div>
        <div className="text-center sm:text-left z-10 flex-1">
          <p className="text-orange-500 font-bold mb-1">{getPersonalizedGreeting()}</p>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-2">{getRoleTitle()}</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {profile?.displayName || '전문가'}님의 활동과 포트폴리오를 관리하세요.
          </p>
        </div>
        <div className="sm:ml-auto z-10 flex flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0">
           <Link to="/mypage" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors shrink-0">
             <Settings className="w-4 h-4" /> 프로필 설정
           </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 transition-colors"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">내 공연/작업 스케줄</h3>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">업무 및 행사 일정을 캘린더에서 한눈에 확인하세요.</p>
          <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 text-sm">
            등록된 일정이 없습니다.
          </div>
        </motion.div>

        {renderRoleSpecificContent()}
      </div>
    </div>
  );
}
