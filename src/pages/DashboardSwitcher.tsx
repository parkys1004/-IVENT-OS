import React from 'react';
import { useAuth } from '../context/AuthContext';
import ParticipantDashboard from './ParticipantDashboard';
import HostDashboard from './HostDashboard';
import { HeroHeader, HeroFeatures } from '../components/IntroOverlay';

export default function DashboardSwitcher() {
  const { profile, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  // Everyone sees the beautiful Hero intro first
  return (
    <div className="w-full flex flex-col">
      <HeroHeader />
      <div id="dashboard-content">
        {profile?.role === 'host' ? <HostDashboard /> : <ParticipantDashboard />}
      </div>
      <HeroFeatures />
    </div>
  );
}
