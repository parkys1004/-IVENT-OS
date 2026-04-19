import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import IntroOverlay from './components/IntroOverlay';
import DashboardSwitcher from './pages/DashboardSwitcher';
import EventDetail from './pages/EventDetail';
import CreateEvent from './pages/CreateEvent';
import EditEvent from './pages/EditEvent';
import Login from './pages/Login';
import MyPage from './pages/MyPage';
import AdminDashboard from './pages/AdminDashboard'; // Import AdminDashboard directly

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans flex flex-col transition-colors duration-200">
      <IntroOverlay />
      <Navbar />
      <main className="w-full mx-auto px-4 sm:px-6 lg:px-12 xl:px-20 py-8 lg:py-12 flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<DashboardSwitcher />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/event/:id" element={<EventDetail />} />
          <Route path="/create" element={<CreateEvent />} />
          <Route path="/edit/:id" element={<EditEvent />} />
          <Route path="/login" element={<Login />} />
          <Route path="/mypage" element={<MyPage />} />
        </Routes>
      </main>
    </div>
  );
}
