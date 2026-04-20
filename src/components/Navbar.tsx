import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, Plus, Sun, Moon, Wind, Settings, UserCircle, Briefcase, Eye, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { logout } from '../firebase';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';

export default function Navbar() {
  const { user, profile, viewMode, setViewMode } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleModeSwitch = (mode: 'admin' | 'professional' | 'participant') => {
    setViewMode(mode);
    setDropdownOpen(false);
    if (mode === 'admin') navigate('/admin');
    else navigate('/dashboard');
  };

  const hasMultipleModes = profile && ['host', 'dj', 'instructor', 'media', 'admin'].includes(profile.role);

  return (
    <>
      {/* Admin Simulation Info Bar */}
      {profile?.role === 'admin' && viewMode !== 'admin' && (
        <div className="bg-indigo-600 text-white text-xs font-bold py-1.5 px-4 text-center flex justify-center items-center gap-2 z-50 relative">
          <Eye className="w-3.5 h-3.5" />
          관리자 계정으로 유저 모드 시뮬레이션 중입니다. 
          <button onClick={() => setViewMode('admin')} className="underline hover:text-indigo-200 ml-2">
            (관리자로 복귀)
          </button>
        </div>
      )}

      <nav className="bg-[#FFFAEE]/80 dark:bg-[#14100B]/80 backdrop-blur-md border-b border-amber-200/30 dark:border-amber-900/30 sticky top-0 z-40 transition-colors duration-200">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-12 xl:px-20">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex-shrink-0 flex items-center gap-2 group">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative p-1.5 bg-white dark:bg-[#1A1612] rounded-lg ring-1 ring-amber-100 dark:ring-amber-900/50 flex items-center justify-center">
                    <Wind className="h-5 w-5 text-orange-500" />
                  </div>
                </div>
                <span className="font-black text-xl tracking-tight bg-gradient-to-r from-amber-600 to-orange-500 dark:from-amber-400 dark:to-yellow-300 bg-clip-text text-transparent hidden sm:block">
                  Dancehive
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 relative">
              <button
                onClick={toggleTheme}
                className="inline-flex items-center p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                title="테마 변경"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {user ? (
                <>
                  {/* Create Event Button - Hide if currently in admin mode */}
                  {profile?.role === 'host' && viewMode !== 'admin' && (
                    <Link
                      to="/create"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-[13px] font-bold rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">행사 만들기</span>
                    </Link>
                  )}
                  
                  {/* Profile Dropdown Toggle */}
                  <div className="relative">
                    <button 
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 py-1.5 px-3 rounded-xl transition-colors outline-none"
                    >
                      <div className="hidden md:flex flex-col text-right items-end">
                        <span className="font-bold text-slate-800 dark:text-white leading-tight mb-0.5">{profile?.displayName || user.email?.split('@')[0]}</span>
                        <div className={clsx(
                          "text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shadow-sm",
                          viewMode === 'participant' 
                            ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30" 
                            : "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30"
                        )}>
                          {viewMode === 'admin' ? 'System Admin' : 
                           viewMode === 'professional' ? (profile?.role === 'host' ? 'Host' : profile?.role.toUpperCase()) : 
                           'Participant'}
                        </div>
                      </div>
                      <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full border border-slate-200 dark:border-slate-600 shrink-0 shadow-sm bg-center bg-cover" style={user.photoURL ? {backgroundImage: `url(${user.photoURL})`} : {}}></div>
                    </button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                      {dropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)}></div>
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-40 overflow-hidden"
                          >
                            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                              <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{profile?.displayName || user.email?.split('@')[0]}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                            </div>

                            {/* Segmented Control for Mode Switching */}
                            {hasMultipleModes && (
                              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                                <p className="text-xs font-bold text-slate-400 mb-2">모드 변경</p>
                                <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex text-xs font-bold relative">
                                  {profile?.role === 'admin' ? (
                                    <>
                                      <button 
                                        onClick={() => handleModeSwitch('admin')}
                                        className={clsx("flex-1 py-1.5 text-center transition-all z-10", viewMode === 'admin' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700")}
                                      >
                                        관리자
                                      </button>
                                      <button 
                                        onClick={() => handleModeSwitch('participant')}
                                        className={clsx("flex-1 py-1.5 text-center transition-all z-10", viewMode === 'participant' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700")}
                                      >
                                        유저 화면
                                      </button>
                                      <div className={clsx("absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-700 rounded-lg shadow-sm transition-transform duration-300", viewMode === 'admin' ? "translate-x-0" : "translate-x-[calc(100%+4px)]")}></div>
                                    </>
                                  ) : (
                                    <>
                                      <button 
                                        onClick={() => handleModeSwitch('professional')}
                                        className={clsx("flex-1 py-1.5 text-center transition-all z-10", viewMode === 'professional' ? "text-orange-600 dark:text-amber-400" : "text-slate-500 hover:text-slate-700")}
                                      >
                                        전문가
                                      </button>
                                      <button 
                                        onClick={() => handleModeSwitch('participant')}
                                        className={clsx("flex-1 py-1.5 text-center transition-all z-10", viewMode === 'participant' ? "text-orange-600 dark:text-amber-400" : "text-slate-500 hover:text-slate-700")}
                                      >
                                        참여자
                                      </button>
                                       <div className={clsx("absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-700 rounded-lg shadow-sm transition-transform duration-300", viewMode === 'professional' ? "translate-x-0" : "translate-x-[calc(100%+4px)]")}></div>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="py-1">
                              <Link 
                                to={viewMode === 'admin' ? "/admin" : "/dashboard"} 
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center gap-3 px-4 py-2 text-sm font-bold text-indigo-600 dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                              >
                                <LayoutDashboard className="w-4 h-4" />
                                {viewMode === 'admin' ? '시스템 관리' : '나의 대시보드'}
                              </Link>

                              <Link 
                                to="/mypage" 
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                              >
                                <Settings className="w-4 h-4 text-slate-400" />
                                계정 설정
                              </Link>
                              
                              <button 
                                onClick={() => { setDropdownOpen(false); logout(); }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                              >
                                <LogOut className="w-4 h-4 text-red-500" />
                                로그아웃
                              </button>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-[13px] font-bold rounded-lg shadow-sm text-white bg-orange-500 hover:bg-orange-600 shadow-orange-500/20 transition-colors"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  로그인 / 회원가입
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
