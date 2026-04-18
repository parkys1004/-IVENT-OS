import React from 'react';
import { useAuth } from '../context/AuthContext';
import ParticipantDashboard from './ParticipantDashboard';
import HostDashboard from './HostDashboard';

export default function DashboardSwitcher() {
  const { profile, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  // Admin and regular users see the participant dashboard at the root URL (main page)
  // Admins can navigate to their specific dashboard via the top navbar button
  if (profile?.role === 'host') {
    return <HostDashboard />;
  }

  // Fallback to participant view
  return <ParticipantDashboard />;
}
