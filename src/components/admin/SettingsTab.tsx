import React from 'react';
import { AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface SettingsTabProps {
  maintenanceMode: boolean;
  setMaintenanceMode: React.Dispatch<React.SetStateAction<boolean>>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  maintenanceMode,
  setMaintenanceMode
}) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-8 border-b border-slate-50 dark:border-slate-800 pb-4">Global Infrastructure Configuration</h3>
        
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-600 dark:text-slate-400">Platform Name</label>
              <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" defaultValue="Dancehive" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-600 dark:text-slate-400">Default Currency</label>
              <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold outline-none">
                <option>KRW (₩)</option>
                <option>JPY (¥)</option>
                <option>USD ($)</option>
                <option>SGD ($)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-600 dark:text-slate-400">Platform Service Fee (%)</label>
              <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold outline-none" defaultValue="10" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-600 dark:text-slate-400">System Notification Email</label>
              <input type="email" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold outline-none" defaultValue="admin@dancehive.app" />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 hover:scale-105 transition-transform">
              Save Settings
            </button>
          </div>
        </div>
      </div>

      <div className="bg-rose-50 dark:bg-rose-900/10 rounded-[32px] border border-rose-100 dark:border-rose-900/30 p-8">
         <h4 className="text-rose-800 dark:text-rose-400 font-black mb-2 flex items-center gap-2">
           <AlertCircle className="w-5 h-5" /> Danger Zone
         </h4>
         <p className="text-rose-600 dark:text-rose-500 text-sm font-bold mb-4">플랫폼 데이터를 초기화하거나 시스템을 즉시 셧다운 할 수 있습니다.</p>
         <button 
           onClick={() => setMaintenanceMode(!maintenanceMode)}
           className={clsx(
             "px-6 py-3 rounded-xl font-black text-sm transition-all shadow-md active:scale-95",
             maintenanceMode 
               ? "bg-rose-600 text-white hover:bg-rose-700" 
               : "bg-white dark:bg-rose-900/40 text-rose-600 border border-rose-200 dark:border-rose-800"
           )}
         >
           {maintenanceMode ? 'Maintenance Mode DISABLE' : 'Maintenance Mode ENABLE'}
         </button>
      </div>
    </div>
  );
};
