import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ParticipantDashboard from './ParticipantDashboard';
import HostDashboard from './HostDashboard';
import ProfessionalDashboard from './ProfessionalDashboard';
import { HeroHeader, HeroFeatures } from '../components/IntroOverlay';
import { motion } from 'motion/react';
import { User, Briefcase, Settings2 } from 'lucide-react';
import clsx from 'clsx';

export default function DashboardSwitcher() {
  const { profile, loading } = useAuth();
  const [viewMode, setViewMode] = useState<'default' | 'participant'>('default');

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>;
  }

  // Determine dashboard based on role
  const renderDashboard = () => {
    if (viewMode === 'participant') {
      return <ParticipantDashboard />;
    }
    
    switch (profile?.role) {
      case 'host':
        return <HostDashboard />;
      case 'dj':
      case 'instructor':
      case 'media':
        return <ProfessionalDashboard />;
      default:
        return <ParticipantDashboard />;
    }
  };
  
  const hasMultipleModes = profile && ['host', 'dj', 'instructor', 'media', 'admin'].includes(profile.role);

  // Everyone sees the beautiful Hero intro first
  return (
    <div className="w-full flex flex-col">
      <HeroHeader />
      <div id="dashboard-content" className="relative group">
        
        {hasMultipleModes && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex justify-center sm:justify-end">
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl inline-flex text-sm font-medium shadow-sm border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('default')}
                className={clsx(
                  "px-4 py-2 flex items-center gap-2 rounded-lg transition-all",
                  viewMode === 'default' 
                    ? "bg-white dark:bg-slate-700 text-orange-600 dark:text-amber-400 shadow-sm" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <Briefcase className="w-4 h-4" />
                <span>전문가 모드</span>
              </button>
              <button
                onClick={() => setViewMode('participant')}
                className={clsx(
                  "px-4 py-2 flex items-center gap-2 rounded-lg transition-all",
                  viewMode === 'participant' 
                    ? "bg-white dark:bg-slate-700 text-orange-600 dark:text-amber-400 shadow-sm" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <User className="w-4 h-4" />
                <span>참여자 모드</span>
              </button>
            </div>
          </div>
        )}

        <div className={clsx("transition-all duration-300", hasMultipleModes ? "pt-4" : "")}>
          {renderDashboard()}
        </div>
      </div>
      <HeroFeatures />
    </div>
  );
}
