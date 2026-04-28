import React from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import DashboardSwitcher from './pages/DashboardSwitcher';
import EventDetail from './pages/EventDetail';
import CreateEvent from './pages/CreateEvent';
import CreateLesson from './pages/CreateLesson';
import EditEvent from './pages/EditEvent';
import EditLesson from './pages/EditLesson';
import CategoryExplore from './pages/CategoryExplore';
import Community from './pages/Community';
import PostDetail from './pages/PostDetail';
import Login from './pages/Login';
import MyPage from './pages/MyPage';
import PlaceSearch from './pages/PlaceSearch';
import PlaceDetail from './pages/PlaceDetail';
import QRScanner from './pages/QRScanner';
import PointRecharge from './pages/PointRecharge';
import AISettings from './pages/AISettings';
import PublicProfile from './pages/PublicProfile';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import PastEvents from './pages/PastEvents';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import AnimatedBackground from './components/AnimatedBackground';
import clsx from 'clsx';
import { useAuth } from './context/AuthContext';

import { AlertCircle, ExternalLink, MessageSquare } from 'lucide-react';
import { OnboardingModal } from './components/OnboardingModal';
import PWAInstallPrompt from './components/PWAInstallPrompt';

function SupabaseConfigWarning() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const isPlaceholder = !url || url === '' || url.includes('placeholder-url') || !anonKey;

  // In production, we only show this if it's DEFINITELY misconfigured
  if (!isPlaceholder) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 p-4 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex gap-3">
        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-rose-900 dark:text-rose-100">Supabase 설정 필요</h4>
          <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
            실제 데이터를 불러오려면 Supabase URL과 Anon Key를 설정해야 합니다. AI Studio의 <strong>Settings &gt; Secrets</strong> 메뉴에서 설정해 주세요.
          </p>
          <div className="flex gap-3">
             <div className="text-[10px] font-mono bg-rose-100 dark:bg-rose-950 px-1.5 py-0.5 rounded text-rose-600 dark:text-rose-400">
               VITE_SUPABASE_URL
             </div>
             <div className="text-[10px] font-mono bg-rose-100 dark:bg-rose-950 px-1.5 py-0.5 rounded text-rose-600 dark:text-rose-400">
               VITE_SUPABASE_ANON_KEY
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  // Handle auth server configuration errors in hash
  if (typeof window !== 'undefined' && window.location.hash.includes('error=server_error')) {
    window.location.hash = ''; // 에러 해시 제거
    console.error("인증 서버 설정 오류가 감지되었습니다.");
  }

  const { profile, viewMode, authError, loading } = useAuth(); // loading 추가
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (!loading && !profile && location.pathname !== '/login' && location.pathname !== '/') {
      // Note: Some paths like event details or explore might be public, 
      // but following user's strict request to lock down except '/' and '/login'
      navigate('/');
    }
  }, [profile, loading, location.pathname, navigate]);

  // Handle OAuth Redirect and Popup Closing
  React.useEffect(() => {
    // Check for access_token in hash (standard Supabase OAuth redirect)
    if (window.location.hash.includes('access_token=') || window.location.hash.includes('id_token=')) {
      // If this window was opened by our main app, close it after 1.5s
      // The 1.5s gives the Supabase SDK in this window enough time to store the session
      // which will then be picked up by the parent window.
      if (window.opener) {
        // Tell the parent window that authentication was successful
        window.opener.postMessage({ type: 'SUPABASE_AUTH_SUCCESS' }, window.location.origin);
        
        console.log("OAuth Redirect detected in popup. Closing in 1.5s...");
        const timer = setTimeout(() => {
          try {
            window.close();
          } catch (e) {
            console.error("Failed to close popup automatically:", e);
          }
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // loading 중 스피너 표시 (흰 화면 방지)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-bold">로딩 중...</p>
        </div>
      </div>
    );
  }

  const isDashboardPath = location.pathname === '/dashboard' || location.pathname === '/admin';
  const isHomePath = location.pathname === '/';
  const isCommunityPath = location.pathname.startsWith('/community');
  const isDashboardView = isDashboardPath && profile; // Apply to any logged-in user on dashboard path

  return (
    <div className={clsx(
      "text-slate-800 dark:text-slate-100 font-sans flex flex-col transition-colors duration-200",
      isDashboardView ? "h-screen overflow-hidden" : "min-h-screen"
    )}>
      {authError && (
        <div className="bg-red-500 text-white text-xs py-1 px-4 text-center font-bold relative z-[9999]">
          ⚠️ 보안 데이터 연결/생성 오류: {authError} (임시 프로필로 접속 중)
        </div>
      )}
      <Navbar />
      <AnimatedBackground />
      <main className={clsx(
        "w-full mx-auto flex-1 flex flex-col relative",
        isDashboardView ? "px-0 py-0 overflow-hidden min-h-0" : 
        isHomePath ? "px-0 py-0 overflow-x-hidden" :
        isCommunityPath ? "px-0 py-8 overflow-x-hidden" :
        "px-2 sm:px-4 lg:px-6 py-8 lg:py-12 overflow-x-hidden"
      )}>
        <Routes>
          <Route path="/" element={<DashboardSwitcher forceExplore />} />
          <Route path="/dashboard" element={<DashboardSwitcher />} />
          <Route path="/admin" element={<DashboardSwitcher />} />
          <Route path="/explore/:category" element={<CategoryExplore />} />
          <Route path="/community" element={<Community />} />
          <Route path="/community/:id" element={<PostDetail />} />
          <Route path="/event/:id" element={<EventDetail />} />
          <Route path="/profile/:id" element={<PublicProfile />} />
          <Route path="/create" element={<CreateEvent />} />
          <Route path="/create-lesson" element={<CreateLesson />} />
          <Route path="/edit/:id" element={<EditEvent />} />
          <Route path="/edit-lesson/:id" element={<EditLesson />} />
          <Route path="/past-events" element={<PastEvents />} />
          <Route path="/login" element={<Login />} />
          <Route path="/places" element={<PlaceSearch />} />
          <Route path="/places/:id" element={<PlaceDetail />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/scan-tickets" element={<QRScanner />} />
          <Route path="/points" element={<PointRecharge />} />
          <Route path="/ai-settings" element={<AISettings />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
        </Routes>
      </main>
      {!isDashboardView && <Footer />}
      <ScrollToTop />
      
      {/* KakaoTalk Floating Button */}
      <a 
        href="https://open.kakao.com/o/gte9aPri" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[9999] bg-[#FEE500] hover:bg-[#F7E600] text-[#3A1D1D] p-3 rounded-l-2xl shadow-xl transition-all hover:pr-6 flex items-center gap-2 group border-y border-l border-[#E6CF00] ring-4 ring-[#FEE500]/20"
      >
        <MessageSquare className="w-5 h-5 fill-[#3A1D1D]" />
        <span className="text-[10px] font-black hidden group-hover:block whitespace-nowrap uppercase tracking-tighter">Open Chat</span>
      </a>

      <OnboardingModal isOpen={profile?.role === 'unassigned'} />
      <SupabaseConfigWarning />
      <PWAInstallPrompt />
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
