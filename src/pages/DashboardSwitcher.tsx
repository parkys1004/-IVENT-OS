import React, { useEffect } from 'react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import ParticipantDashboard from './ParticipantDashboard';
import ProfessionalDashboard from './ProfessionalDashboard';
import AdminDashboard from './AdminDashboard';
import { HeroHeader, HeroFeatures } from '../components/IntroOverlay';

export default function DashboardSwitcher({ forceExplore = false }: { forceExplore?: boolean }) {
  const { profile, loading, viewMode, setViewMode } = useAuth();

  useEffect(() => {
    // Basic protection to reset viewMode if it goes out of sync
    if (profile && !forceExplore) {
       if (viewMode === 'admin' && profile.role !== 'admin') {
          setViewMode(['host', 'dj', 'instructor', 'media'].includes(profile.role) ? 'professional' : 'participant');
       }
       if (viewMode === 'professional' && !['host', 'dj', 'instructor', 'media', 'admin'].includes(profile.role)) {
          setViewMode('participant');
       }
    }
  }, [profile, viewMode, setViewMode, forceExplore]);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>;
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
