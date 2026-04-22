import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import DashboardSwitcher from './pages/DashboardSwitcher';
import EventDetail from './pages/EventDetail';
import CreateEvent from './pages/CreateEvent';
import CreateLesson from './pages/CreateLesson';
import EditEvent from './pages/EditEvent';
import CategoryExplore from './pages/CategoryExplore';
import Login from './pages/Login';
import MyPage from './pages/MyPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import AnimatedBackground from './components/AnimatedBackground';
import clsx from 'clsx';
import { useAuth } from './context/AuthContext';

import { AlertCircle, ExternalLink } from 'lucide-react';

function SupabaseConfigWarning() {
  // Don't show warning in production environments or if keys are actually set
  const isProd = import.meta.env.PROD;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const isPlaceholder = !url || url === '' || url.includes('placeholder-url');

  if (isProd || !isPlaceholder) return null;

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
  const { profile, viewMode } = useAuth();
  const location = useLocation();
  const isDashboardPath = location.pathname === '/dashboard' || location.pathname === '/admin';
  const isHomePath = location.pathname === '/';
  const isDashboardView = isDashboardPath && profile; // Apply to any logged-in user on dashboard path

  return (
    <div className={clsx(
      "text-slate-800 dark:text-slate-100 font-sans flex flex-col transition-colors duration-200",
      isDashboardView ? "h-screen overflow-hidden" : "min-h-screen"
    )}>
      <Navbar />
      <AnimatedBackground />
      <main className={clsx(
        "w-full mx-auto flex-1 flex flex-col relative",
        isDashboardView ? "px-0 py-0 overflow-hidden min-h-0" : 
        isHomePath ? "px-0 py-0 overflow-x-hidden" :
        "px-4 sm:px-6 lg:px-12 xl:px-20 py-8 lg:py-12 overflow-x-hidden"
      )}>
        <Routes>
          <Route path="/" element={<DashboardSwitcher forceExplore />} />
          <Route path="/dashboard" element={<DashboardSwitcher />} />
          <Route path="/admin" element={<DashboardSwitcher />} />
          <Route path="/explore/:category" element={<CategoryExplore />} />
          <Route path="/event/:id" element={<EventDetail />} />
          <Route path="/create" element={<CreateEvent />} />
          <Route path="/create-lesson" element={<CreateLesson />} />
          <Route path="/edit/:id" element={<EditEvent />} />
          <Route path="/login" element={<Login />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
        </Routes>
      </main>
      {!isDashboardView && <Footer />}
      <ScrollToTop />
      <SupabaseConfigWarning />
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
