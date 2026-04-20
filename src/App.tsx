import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import DashboardSwitcher from './pages/DashboardSwitcher';
import EventDetail from './pages/EventDetail';
import CreateEvent from './pages/CreateEvent';
import EditEvent from './pages/EditEvent';
import Login from './pages/Login';
import MyPage from './pages/MyPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Footer from './components/Footer';
import clsx from 'clsx';
import { useAuth } from './context/AuthContext';

function AppContent() {
  const { profile, viewMode } = useAuth();
  const location = useLocation();
  const isDashboardPath = location.pathname === '/dashboard' || location.pathname === '/admin';
  const isHomePath = location.pathname === '/';
  const isDashboardView = isDashboardPath && profile; // Apply to any logged-in user on dashboard path

  return (
    <div className={clsx(
      "bg-[#FFFAEE] dark:bg-[#14100B] text-slate-800 dark:text-slate-100 font-sans flex flex-col transition-colors duration-200",
      isDashboardView ? "h-screen overflow-hidden" : "min-h-screen"
    )}>
      <Navbar />
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
          <Route path="/event/:id" element={<EventDetail />} />
          <Route path="/create" element={<CreateEvent />} />
          <Route path="/edit/:id" element={<EditEvent />} />
          <Route path="/login" element={<Login />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
        </Routes>
      </main>
      {!isDashboardView && <Footer />}
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
