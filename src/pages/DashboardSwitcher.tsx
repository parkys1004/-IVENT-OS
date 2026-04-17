import React from 'react';
import { useAuth } from '../context/AuthContext';
import ParticipantDashboard from './ParticipantDashboard';
import HostDashboard from './HostDashboard';
import AdminDashboard from './AdminDashboard';

export default function DashboardSwitcher() {
  const { profile, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  if (profile?.role === 'admin') {
    return <AdminDashboard />;
  }

  if (profile?.role === 'host') {
    return <HostDashboard />;
  }

  // Fallback to participant view
  return <ParticipantDashboard />;
}
