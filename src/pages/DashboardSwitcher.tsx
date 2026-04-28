import React, { useEffect } from 'react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import ParticipantDashboard from './ParticipantDashboard';
import ProfessionalDashboard from './ProfessionalDashboard';
import AdminDashboard from './AdminDashboard';
import { HeroHeader, HeroFeatures } from '../components/IntroOverlay';

export default function DashboardSwitcher({ forceExplore = false }: { forceExplore?: boolean }) {
  const { profile, loading, viewMode } = useAuth();

  if (loading && !profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-40">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
        <p className="text-slate-400 font-bold animate-pulse text-sm">보안 세션을 확인하고 있습니다...</p>
      </div>
    );
  }

  // Determine dashboard based on viewMode
  const renderDashboard = () => {
    if (!profile || forceExplore) return <ParticipantDashboard forceMarketplace={forceExplore} />;
    if (viewMode === 'admin') return <AdminDashboard />;
    if (viewMode === 'professional') return <ProfessionalDashboard />;
    return <ParticipantDashboard />;
  };
  
  // Everyone sees the beautiful Hero intro first (if not logged in)
  return (
    <div className={clsx(
      "w-full flex-1 flex flex-col relative",
      (profile && !forceExplore) ? "h-full min-h-0" : ""
    )}>
      {(!profile || forceExplore) && <HeroHeader />}
      
      {(profile && !forceExplore) ? (
        renderDashboard()
      ) : (
        <div id="dashboard-content" className="flex-1 flex flex-col relative group">
          <div className="flex-1 flex flex-col transition-all duration-300">
            {renderDashboard()}
          </div>
        </div>
      )}

      {(!profile || forceExplore) && <HeroFeatures />}
    </div>
  );
}
