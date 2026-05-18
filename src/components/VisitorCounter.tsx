import React, { useEffect, useState } from 'react';
import { Users, TrendingUp } from 'lucide-react';
import { supabase } from '../supabase';
import clsx from 'clsx';

export default function VisitorCounter() {
  const [stats, setStats] = useState<{ total: number; today: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndIncrementVisits = async () => {
      try {
        // 1. Check local storage to avoid spamming calls if DB isn't ready
        const errorKey = 'dancehive_stats_error_cooldown';
        const errorTime = localStorage.getItem(errorKey);
        if (errorTime && (Date.now() - parseInt(errorTime)) < 60000) {
          // If we had an error in the last minute, don't try again to avoid console spam
          setLoading(false);
          return;
        }

        const sessionKey = 'dancehive_visit_counted_' + new Date().toISOString().split('T')[0];
        const hasCounted = sessionStorage.getItem(sessionKey);

        // 2. Fetch current stats
        const { data, error } = await supabase
          .from('visitor_stats')
          .select('id, total_visits, today_visits, last_reset_date')
          .eq('id', 'main')
          .maybeSingle();

        if (error) {
          console.warn('Visitor stats table might not be ready yet. Please check Supabase setup.');
          localStorage.setItem(errorKey, Date.now().toString());
          setLoading(false);
          return;
        }

        let statsData = data;
        const todayStr = new Date().toISOString().split('T')[0];

        if (!statsData) {
          // Attempt to initialize if missing (Only works if RLS allows anon insert)
          const initialData = {
            id: 'main',
            total_visits: 1,
            today_visits: 1,
            last_reset_date: todayStr
          };
          const { data: newData, error: insertError } = await supabase
            .from('visitor_stats')
            .insert([initialData])
            .select()
            .maybeSingle();
          
          if (insertError) {
             // If insert fails (likely RLS), we just stop here
             localStorage.setItem(errorKey, Date.now().toString());
             setLoading(false);
             return;
          }
          statsData = newData;
        }

        if (statsData) {
          let updatedData = { ...statsData };

          if (statsData.last_reset_date !== todayStr) {
            // Reset daily count
            const nextTotal = (statsData.total_visits || 0) + 1;
            const { error: updateError } = await supabase
              .from('visitor_stats')
              .update({ 
                today_visits: 1, 
                last_reset_date: todayStr,
                total_visits: nextTotal
              })
              .eq('id', 'main');
            
            if (!updateError) {
              updatedData.today_visits = 1;
              updatedData.total_visits = nextTotal;
            }
          } else if (!hasCounted) {
            // Standard increment
            const nextToday = (statsData.today_visits || 0) + 1;
            const nextTotal = (statsData.total_visits || 0) + 1;
            
            const { error: updateError } = await supabase
              .from('visitor_stats')
              .update({ 
                today_visits: nextToday,
                total_visits: nextTotal
              })
              .eq('id', 'main');
            
            if (!updateError) {
              updatedData.today_visits = nextToday;
              updatedData.total_visits = nextTotal;
              sessionStorage.setItem(sessionKey, 'true');
            }
          }

          setStats({
            total: updatedData.total_visits,
            today: updatedData.today_visits
          });
        }
      } catch (err) {
        // Silently fail to avoid UI crash
      } finally {
        setLoading(false);
      }
    };

    fetchAndIncrementVisits();
  }, []);

  if (loading || !stats) return null;

  return (
    <div className="hidden sm:block fixed bottom-4 right-4 z-40 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className={clsx(
        "flex items-center gap-3 px-3 py-1.5 rounded-full",
        "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md",
        "border border-slate-200 dark:border-slate-800 shadow-lg",
        "text-[10px] font-bold tracking-tight"
      )}>
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <Users className="w-3 h-3" />
          <span className="uppercase opacity-70">Total</span>
          <span className="text-slate-900 dark:text-white tabular-nums">
            {stats.total.toLocaleString()}
          </span>
        </div>
        
        <div className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
        
        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
          <TrendingUp className="w-3 h-3" />
          <span className="uppercase opacity-70">Today</span>
          <span className="text-slate-900 dark:text-white tabular-nums">
            {stats.today.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
