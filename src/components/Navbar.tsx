import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LogIn, 
  LogOut, 
  Plus, 
  Sun, 
  Moon, 
  Wind, 
  Settings, 
  UserCircle, 
  Briefcase, 
  Eye, 
  LayoutDashboard, 
  Languages,
  Music,
  GraduationCap,
  Users,
  Disc,
  Camera,
  X,
  User,
  MapPin,
  ExternalLink,
  MessageSquare,
  ChevronDown,
  Coins,
  Bot
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage, Language } from '../context/LanguageContext';
import { languageNames } from '../lib/gemini';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';

export default function Navbar() {
  const { user, profile, viewMode, setViewMode, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);

  const handleModeSwitch = (mode: 'admin' | 'professional' | 'participant') => {
    setViewMode(mode);
    setDropdownOpen(false);
    setIsMobileMenuOpen(false);
    if (mode === 'admin') navigate('/admin');
    else navigate('/dashboard');
  };

  const navLinks = [
    { 
      to: '/explore/party', 
      icon: <Music className="w-4 h-4" />, 
      label: t('search.category.party'),
      subLinks: [
        { to: '/past-events', label: '지난파티' }
      ]
    },
    { to: '/explore/lesson', icon: <GraduationCap className="w-4 h-4" />, label: t('search.category.lesson') },
    { to: '/explore/instructor', icon: <Users className="w-4 h-4" />, label: t('search.category.instructor') },
    { to: '/explore/dj', icon: <Disc className="w-4 h-4" />, label: t('search.category.dj') },
    { to: '/explore/media', icon: <Camera className="w-4 h-4" />, label: t('search.category.media') },
    { to: '/bar-search', icon: <MapPin className="w-4 h-4" />, label: '바검색' },
    { to: '/community', icon: <MessageSquare className="w-4 h-4" />, label: '커뮤니티' },
  ];

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
          <div className="flex justify-between h-16 sm:h-20">
            <div className="flex items-center">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 -ml-2 mr-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors outline-none"
                aria-label="Toggle menu"
              >
                <div className="w-6 h-5 flex flex-col justify-between items-center relative">
                  <span className={clsx("w-6 h-0.5 bg-current rounded-full transition-all duration-300 transform", isMobileMenuOpen ? "rotate-45 translate-y-2.5" : "")}></span>
                  <span className={clsx("w-6 h-0.5 bg-current rounded-full transition-all duration-300", isMobileMenuOpen ? "opacity-0" : "")}></span>
                  <span className={clsx("w-6 h-0.5 bg-current rounded-full transition-all duration-300 transform", isMobileMenuOpen ? "-rotate-45 -translate-y-2" : "")}></span>
                </div>
              </button>

              <Link to="/" className="flex-shrink-0 flex items-center gap-2 group sm:mr-8" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-lg blur opacity-10 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative p-1.5 bg-white dark:bg-[#1A1612] rounded-lg ring-1 ring-amber-100 dark:ring-amber-900/50 flex items-center justify-center shadow-sm">
                    <Wind className="h-5 w-5 text-orange-500" />
                  </div>
                </div>
                <span className="font-black text-xl sm:text-2xl tracking-tighter bg-gradient-to-r from-amber-600 to-orange-500 dark:from-amber-400 dark:to-yellow-300 bg-clip-text text-transparent hidden sm:block">
                  Dancehive
                </span>
              </Link>

              {/* Desktop Navigation Links */}
              <div className="hidden lg:flex items-center gap-1">
                {navLinks.map((link) => (
                  <div 
                    key={link.to} 
                    className="relative group"
                    onMouseEnter={() => link.subLinks && setPartyDropdownOpen(true)}
                    onMouseLeave={() => link.subLinks && setPartyDropdownOpen(false)}
                  >
                    <Link 
                      to={link.to} 
                      className={clsx(
                        "px-3 py-2 text-sm font-bold rounded-lg transition-all duration-200 flex items-center gap-2 hover:translate-y-[-1px]",
                        (location.pathname === link.to || (link.subLinks && link.subLinks.some(s => s.to === location.pathname))) ? "text-orange-600 dark:text-amber-400 bg-orange-50 dark:bg-amber-400/10" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      <div className={clsx(location.pathname === link.to ? "text-orange-600 dark:text-amber-400" : "text-slate-400")}>{link.icon}</div>
                      {link.label}
                      {link.subLinks && <ChevronDown className="w-3.5 h-3.5 opacity-50 group-hover:rotate-180 transition-transform" />}
                    </Link>

                    {link.subLinks && (
                      <AnimatePresence>
                        {partyDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.1 }}
                            className="absolute left-0 mt-0 w-40 bg-white dark:bg-[#1A1612] rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 overflow-hidden"
                          >
                            {link.subLinks.map((sub) => (
                              <Link
                                key={sub.to}
                                to={sub.to}
                                className={clsx(
                                  "block px-4 py-2 text-sm font-bold transition-colors",
                                  location.pathname === sub.to
                                    ? "text-orange-600 dark:text-amber-400 bg-orange-50 dark:bg-amber-400/10"
                                    : "text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                )}
                              >
                                {sub.label}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                ))}

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>

                {user && (
                  <Link 
                    to={viewMode === 'admin' ? "/admin" : "/dashboard"} 
                    className={clsx(
                      "px-4 py-2 text-sm font-bold rounded-lg transition-all duration-200 hover:translate-y-[-1px]",
                      (location.pathname === '/dashboard' || location.pathname === '/admin') ? "text-orange-600 dark:text-amber-400 bg-orange-50 dark:bg-amber-400/10" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    {viewMode === 'admin' ? '시스템 관리' : viewMode === 'professional' ? '전문가 대시보드' : t('nav.tickets')}
                  </Link>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 relative">
              {/* Language Switcher */}
              <div className="relative">
                <button
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  className="inline-flex items-center p-2 sm:p-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm"
                  title="언어 설정 / Language"
                >
                  <Languages className="h-5 w-5" />
                  <span className="hidden md:inline ml-2 text-xs font-black uppercase tracking-wider">{language}</span>
                </button>

                <AnimatePresence>
                  {langDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setLangDropdownOpen(false)}></div>
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-40 overflow-hidden"
                      >
                        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Language</p>
                        </div>
                        {(Object.keys(languageNames) as Language[]).map((lang) => (
                          <button
                            key={lang}
                            onClick={() => {
                              setLanguage(lang);
                              setLangDropdownOpen(false);
                            }}
                            className={clsx(
                              "w-full flex items-center justify-between px-4 py-2 text-sm transition-colors",
                              language === lang 
                                ? "text-orange-600 dark:text-amber-400 bg-orange-50 dark:bg-amber-400/10 font-bold" 
                                : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                            )}
                          >
                            <span>{languageNames[lang]}</span>
                            {language === lang && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={toggleTheme}
                className="hidden sm:inline-flex items-center p-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm"
                title="테마 변경"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {user ? (
                <>
                  {/* Create Buttons - Hide labels on mobile */}
                  {profile?.role === 'host' && viewMode !== 'admin' && (
                    <Link
                      to="/create"
                      className="inline-flex items-center p-2.5 sm:px-4 sm:py-2 border border-transparent text-[13px] font-black rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-all hover:translate-y-[-1px] active:scale-95"
                    >
                      <Plus className="h-5 w-5 sm:mr-1.5" />
                      <span className="hidden sm:inline">행사 만들기</span>
                    </Link>
                  )}

                  {profile?.role === 'instructor' && viewMode !== 'admin' && (
                    <div className="flex items-center gap-2">
                      <Link
                        to="/dashboard"
                        className="inline-flex items-center p-2.5 sm:px-4 sm:py-2 border border-slate-200 dark:border-slate-800 text-[13px] font-black rounded-xl shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:translate-y-[-1px] active:scale-95"
                      >
                        <User className="h-5 w-5 sm:mr-1.5 text-indigo-500" />
                        <span className="hidden sm:inline">강사프로필 만들기</span>
                      </Link>
                      <Link
                        to="/create-lesson"
                        className="inline-flex items-center p-2.5 sm:px-4 sm:py-2 border border-transparent text-[13px] font-black rounded-xl shadow-sm text-white bg-teal-600 hover:bg-teal-700 transition-all hover:translate-y-[-1px] active:scale-95"
                      >
                        <Plus className="h-5 w-5 sm:mr-1.5" />
                        <span className="hidden sm:inline">강습 만들기</span>
                      </Link>
                    </div>
                  )}

                  {profile?.role === 'dj' && viewMode !== 'admin' && (
                    <Link
                      to="/dashboard"
                      className="inline-flex items-center p-2.5 sm:px-4 sm:py-2 border border-slate-200 dark:border-slate-800 text-[13px] font-black rounded-xl shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:translate-y-[-1px] active:scale-95"
                    >
                      <Music className="h-5 w-5 sm:mr-1.5 text-orange-500" />
                      <span className="hidden sm:inline">DJ프로필 만들기</span>
                    </Link>
                  )}

                  {profile?.role === 'media' && viewMode !== 'admin' && (
                    <Link
                      to="/dashboard"
                      className="inline-flex items-center p-2.5 sm:px-4 sm:py-2 border border-slate-200 dark:border-slate-800 text-[13px] font-black rounded-xl shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:translate-y-[-1px] active:scale-95"
                    >
                      <Camera className="h-5 w-5 sm:mr-1.5 text-indigo-500" />
                      <span className="hidden sm:inline">포토/영상프로필 만들기</span>
                    </Link>
                  )}
                  
                  {/* Profile Dropdown Toggle */}
                  <div className="relative">
                    <button 
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-3 hover:bg-white dark:hover:bg-slate-800/50 py-1 sm:py-1.5 px-1 sm:px-3 rounded-2xl transition-all outline-none"
                    >
                      <div className="hidden md:flex flex-col text-right items-end">
                        <span className="font-bold text-slate-800 dark:text-white leading-tight mb-0.5 whitespace-nowrap">{profile?.displayName || user.email?.split('@')[0]}</span>
                        <div className={clsx(
                          "text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shadow-sm border",
                          viewMode === 'participant' 
                            ? "bg-amber-100/50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20" 
                            : "bg-indigo-100/50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20"
                        )}>
                          {viewMode === 'admin' ? 'SYSTEM' : 
                           viewMode === 'professional' ? (profile?.role === 'host' ? 'Host' : profile?.role.toUpperCase()) : 
                           'USER'}
                        </div>
                      </div>
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-200 dark:bg-slate-700 rounded-full border border-slate-200 dark:border-slate-800 shrink-0 shadow-sm transition-transform group-hover:scale-105 bg-center bg-cover" style={(profile?.photoURL || user.photoURL) ? {backgroundImage: `url(${profile?.photoURL || user.photoURL})`} : {}}></div>
                    </button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                      {dropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)}></div>
                          <motion.div 
                            initial={{ opacity: 0, y: 12, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 12, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute right-0 mt-3 w-72 bg-white dark:bg-[#1A1612] rounded-[24px] shadow-2xl border border-slate-200 dark:border-slate-800 py-3 z-40 overflow-hidden"
                          >
                            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/50 flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full border border-slate-100 dark:border-slate-800 shadow-inner bg-center bg-cover" style={user.photoURL ? {backgroundImage: `url(${user.photoURL})`} : {}}></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-base font-black text-slate-800 dark:text-white truncate">{profile?.displayName || user.email?.split('@')[0]}</p>
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl text-[11px] font-black border border-amber-100 dark:border-amber-900/30 shrink-0">
                                    <Coins className="w-3.5 h-3.5" />
                                    {profile?.points?.toLocaleString() || '0'} P
                                  </div>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">{user.email}</p>
                              </div>
                            </div>

                            {/* Segmented Control for Mode Switching */}
                            {hasMultipleModes && (
                              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Interface Mode</p>
                                <div className="bg-white dark:bg-slate-800 p-1.5 rounded-2xl flex text-xs font-black relative border border-slate-200 dark:border-slate-700/50">
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
                                        유저
                                      </button>
                                      <motion.div 
                                        layoutId="mode-pill"
                                        className={clsx("absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white dark:bg-slate-700 rounded-xl shadow-md transition-transform duration-300", viewMode === 'admin' ? "translate-x-0" : "translate-x-[calc(100%+6px)]")}
                                      />
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
                                      <motion.div 
                                        layoutId="mode-pill"
                                        className={clsx("absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white dark:bg-slate-700 rounded-xl shadow-md transition-transform duration-300", viewMode === 'professional' ? "translate-x-0" : "translate-x-[calc(100%+6px)]")}
                                      />
                                    </>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="py-2">
                              <Link 
                                to={viewMode === 'admin' ? "/admin" : "/dashboard"} 
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center gap-4 px-6 py-3 text-sm font-black text-indigo-600 dark:text-amber-400 hover:bg-indigo-50 dark:hover:bg-amber-400/10 transition-colors"
                              >
                                <LayoutDashboard className="w-4.5 h-4.5" />
                                {viewMode === 'admin' ? '시스템 관리' : t('nav.tickets')}
                              </Link>

                              <Link 
                                to="/mypage" 
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center gap-4 px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                              >
                                <Settings className="w-4.5 h-4.5 text-slate-400" />
                                {t('nav.profile')}
                              </Link>

                              <Link 
                                to="/points" 
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center gap-4 px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                              >
                                <Coins className="w-4.5 h-4.5 text-amber-500" />
                                포인트 충전
                              </Link>

                              {user && (
                                <Link 
                                  to="/ai-settings" 
                                  onClick={() => setDropdownOpen(false)}
                                  className="flex items-center gap-4 px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                  <Bot className="w-4.5 h-4.5 text-indigo-500" />
                                  API 설정 (AI)
                                </Link>
                              )}
                              
                              <div className="my-2 h-px bg-slate-100 dark:bg-slate-800/50 mx-4"></div>

                              <button 
                                onClick={() => { setDropdownOpen(false); logout(); }}
                                className="w-full flex items-center gap-4 px-6 py-3 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left"
                              >
                                <LogOut className="w-4.5 h-4.5 text-red-500" />
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
                  className="inline-flex items-center px-4 py-2.5 sm:px-6 sm:py-3 border border-transparent text-[13px] sm:text-sm font-black rounded-2xl shadow-lg text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-orange-500/20"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {t('auth.loginEmail')}
                </Link>
              )}
            </div>
          </div>
        </div>

      </nav>

      {/* Mobile menu drawer - Moved outside nav for robust positioning */}
      <AnimatePresence mode="wait">
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[85%] max-w-[320px] h-full sm:h-screen bg-white dark:bg-[#14100B] shadow-2xl z-[70] lg:hidden flex flex-col p-6 overflow-y-auto outline-none"
            >
              <div className="flex items-center justify-between mb-8 shrink-0">
                <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 group">
                  <div className="p-1.5 bg-orange-50 dark:bg-orange-500/10 rounded-lg">
                    <Wind className="h-6 w-6 text-orange-500" />
                  </div>
                  <span className="font-black text-2xl tracking-tighter bg-gradient-to-r from-amber-600 to-orange-500 dark:from-amber-400 dark:to-yellow-300 bg-clip-text text-transparent">
                    Dancehive
                  </span>
                </Link>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg bg-slate-50 dark:bg-slate-800">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6 flex-1 flex flex-col">
                {/* Explore Section */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-3">Explore Activity</p>
                  <div className="space-y-1">
                    {navLinks.map((link) => (
                      <React.Fragment key={link.to}>
                        <Link
                          to={link.to}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={clsx(
                            "flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[15px] font-black transition-all",
                            location.pathname === link.to 
                              ? "bg-orange-50 dark:bg-amber-400/10 text-orange-600 dark:text-amber-400 border border-orange-100 dark:border-amber-400/20" 
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                          )}
                        >
                          <div className={clsx("p-2 rounded-xl transition-colors", location.pathname === link.to ? "bg-white dark:bg-slate-800 text-orange-500 dark:text-amber-400 shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-400")}>
                            {link.icon}
                          </div>
                          {link.label}
                        </Link>
                        {link.subLinks && link.subLinks.map((sub) => (
                          <Link
                            key={sub.to}
                            to={sub.to}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={clsx(
                              "flex items-center gap-4 ml-8 px-4 py-3 rounded-2xl text-[13px] font-bold transition-all mt-1",
                              location.pathname === sub.to 
                                ? "bg-orange-50/50 dark:bg-amber-400/5 text-orange-600 dark:text-amber-400" 
                                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                            )}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                            {sub.label}
                          </Link>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Account/Personal Section */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-3">Your Account</p>
                  <div className="space-y-1">
                    {user ? (
                      <>
                        <Link
                          to="/dashboard"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={clsx(
                            "flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[15px] font-black transition-all",
                            location.pathname === '/dashboard' 
                              ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20" 
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                          )}
                        >
                          <div className={clsx("p-2 rounded-xl transition-colors", location.pathname === '/dashboard' ? "bg-white dark:bg-slate-800 text-indigo-500 shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-400")}>
                            <LayoutDashboard className="w-5 h-5" />
                          </div>
                          {viewMode === 'professional' ? '전문가 대시보드' : t('nav.tickets')}
                        </Link>

                        <Link
                          to="/mypage"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={clsx(
                            "flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[15px] font-black transition-all",
                            location.pathname === '/mypage' 
                              ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20" 
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                          )}
                        >
                          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                            <User className="w-5 h-5" />
                          </div>
                          프로필 설정
                        </Link>

                        <Link
                          to="/points"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={clsx(
                            "flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[15px] font-black transition-all",
                            location.pathname === '/points' 
                              ? "bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/20" 
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                          )}
                        >
                          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-amber-500">
                            <Coins className="w-5 h-5" />
                          </div>
                          포인트 충전
                        </Link>

                        {user && (
                          <Link
                            to="/ai-settings"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={clsx(
                              "flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[15px] font-black transition-all",
                              location.pathname === '/ai-settings' 
                                ? "bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/20" 
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                            )}
                          >
                            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-500">
                              <Bot className="w-5 h-5" />
                            </div>
                            API 설정 (AI)
                          </Link>
                        )}

                        {(profile?.role === 'instructor' || profile?.role === 'dj' || profile?.role === 'media') && (
                          <Link
                            to="/dashboard"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[15px] font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-500/20"
                          >
                            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                              {profile.role === 'instructor' ? <User className="w-5 h-5" /> : profile.role === 'dj' ? <Music className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                            </div>
                            {profile.role === 'instructor' ? '강사프로필 만들기' : profile.role === 'dj' ? 'DJ프로필 만들기' : '포토/영상프로필 만들기'}
                          </Link>
                        )}

                        {profile?.role === 'host' && (
                          <Link
                            to="/create"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[15px] font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-500/20"
                          >
                            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                              <Plus className="w-5 h-5" />
                            </div>
                            새 행사 만들기
                          </Link>
                        )}

                        {profile?.role === 'instructor' && (
                          <Link
                            to="/create-lesson"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[15px] font-black text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-all border border-transparent hover:border-teal-100 dark:hover:border-teal-500/20"
                          >
                            <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400">
                              <Plus className="w-5 h-5" />
                            </div>
                            새 강습 만들기
                          </Link>
                        )}

                        <button
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[15px] font-black text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all cursor-pointer"
                        >
                          <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/20 text-red-600">
                            <LogOut className="w-5 h-5" />
                          </div>
                          로그아웃
                        </button>
                      </>
                    ) : (
                      <Link
                        to="/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-4 px-4 py-4 rounded-2xl text-[15px] font-black bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20"
                      >
                        <div className="p-2 rounded-xl bg-white/20 text-white">
                          <LogIn className="w-5 h-5" />
                        </div>
                        {t('auth.loginEmail')}
                      </Link>
                    )}
                  </div>
                </div>

                {/* Appearance & Language */}
                <div className="mt-auto space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-3">Preferences</p>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-black text-sm transition-all active:scale-95"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                          </div>
                          Appearance
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 uppercase tracking-tighter">
                          {theme === 'dark' ? 'Light' : 'Dark'}
                        </span>
                      </button>

                      <div className="relative group/lang">
                        <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-2 border border-slate-100 dark:border-slate-800">
                           <div className="flex items-center gap-3 px-3 py-2 text-slate-400">
                             <Languages className="w-4 h-4" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Select Language</span>
                           </div>
                           <div className="grid grid-cols-2 gap-1.5 p-1">
                             {(Object.keys(languageNames) as Language[]).map((lang) => (
                               <button
                                 key={lang}
                                 onClick={() => {
                                   setLanguage(lang);
                                 }}
                                 className={clsx(
                                   "px-3 py-2.5 rounded-xl text-[12px] font-black transition-all border",
                                   language === lang 
                                     ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-amber-400 border-orange-100 dark:border-amber-400/20 shadow-sm" 
                                     : "text-slate-500 dark:text-slate-400 border-transparent hover:bg-white/50 dark:hover:bg-slate-800/50"
                                 )}
                               >
                                 {languageNames[lang].split(' ')[0]}
                               </button>
                             ))}
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-4 py-4 text-[11px] font-bold text-slate-400">
                    <Link to="/terms" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-slate-600">이용약관</Link>
                    <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                    <Link to="/privacy" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-slate-600">개인정보처리방침</Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
