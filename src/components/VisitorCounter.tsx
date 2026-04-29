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
        // 1. Check if we've already counted this session to avoid spamming increments
        const sessionKey = 'dancehive_visit_counted_' + new Date().toISOString().split('T')[0];
        const hasCounted = sessionStorage.getItem(sessionKey);

        // 2. Fetch current stats
        // Table expected: visitor_stats { id: 'main', total_visits: number, today_visits: number, last_reset_date: string }
        let { data, error } = await supabase
          .from('visitor_stats')
          .select('*')
          .eq('id', 'main')
          .single();

        if (error && error.code === 'PGRST116') {
          // Row doesn't exist, create it if possible (though RLS might block this)
          const initialData = {
            id: 'main',
            total_visits: 1,
            today_visits: 1,
            last_reset_date: new Date().toISOString().split('T')[0]
          };
          const { data: newData, error: insertError } = await supabase
            .from('visitor_stats')
            .insert([initialData])
            .select()
            .single();
          
          if (!insertError) data = newData;
        }

        if (data) {
          const todayStr = new Date().toISOString().split('T')[0];
          let updatedData = { ...data };

          // 3. Reset today's count if date changed
          if (data.last_reset_date !== todayStr) {
            updatedData.today_visits = 1;
            updatedData.last_reset_date = todayStr;
            updatedData.total_visits = (data.total_visits || 0) + 1;
            
            await supabase
              .from('visitor_stats')
              .update({ 
                today_visits: 1, 
                last_reset_date: todayStr,
                total_visits: updatedData.total_visits
              })
              .eq('id', 'main');
          } else if (!hasCounted) {
            // 4. Increment if first time this session
            updatedData.today_visits = (data.today_visits || 0) + 1;
            updatedData.total_visits = (data.total_visits || 0) + 1;
            
            await supabase
              .from('visitor_stats')
              .update({ 
                today_visits: updatedData.today_visits,
                total_visits: updatedData.total_visits
              })
              .eq('id', 'main');
            
            sessionStorage.setItem(sessionKey, 'true');
          }

          setStats({
            total: updatedData.total_visits,
            today: updatedData.today_visits
          });
        }
      } catch (err) {
        console.error('Visitor counter error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndIncrementVisits();
  }, []);

  if (loading || !stats) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 animate-in fade-in slide-in-from-bottom-2 duration-700">
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
