import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  Settings2, 
  Activity, 
  Key, 
  Terminal, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  X, 
  RefreshCcw,
  Plus,
  PlayCircle,
  Database,
  Search,
  ChevronDown,
  Trash2,
  Copy,
  LayoutDashboard,
  ShieldAlert,
  Cpu
} from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';
import { format } from 'date-fns';

interface AISetting {
  provider: string;
  api_key: string;
  default_model: string;
  is_active: boolean;
  settings: {
    usage_limit?: number;
    safety_level?: string;
  };
}

interface AILog {
  id: string;
  provider: string;
  model: string;
  prompt_summary: string;
  tokens_used: number;
  cost: number;
  created_at: string;
}

export default function AISettings() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<AISetting[]>([]);
  const [logs, setLogs] = useState<AILog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<Record<string, 'success' | 'error' | 'pending' | null>>({});

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { data: sData, error: sErr } = await supabase.from('ai_settings').select('*');
        if (sErr) throw sErr;
        
        // Default entries if empty
        if (!sData || sData.length === 0) {
          const defaults = [
            { provider: 'openai', api_key: '', default_model: 'gpt-4o', is_active: true, settings: { usage_limit: 50, safety_level: 'standard' } },
            { provider: 'gemini', api_key: '', default_model: 'gemini-1.5-pro', is_active: true, settings: { safety_level: 'high' } }
          ];
          setSettings(defaults);
        } else {
          setSettings(sData);
        }

        const { data: lData, error: lErr } = await supabase
          .from('ai_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
        if (lErr) throw lErr;
        setLogs(lData || []);

      } catch (err) {
        console.error("Error fetching AI data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleUpdateSetting = async (provider: string, updates: Partial<AISetting>) => {
    try {
      const { error } = await supabase.from('ai_settings').upsert({
        provider,
        ...settings.find(s => s.provider === provider),
        ...updates,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      setSettings(prev => prev.map(s => s.provider === provider ? { ...s, ...updates } : s));
    } catch (err) {
      console.error("Failed to update AI setting:", err);
      alert('설정 업데이트에 실패했습니다.');
    }
  };

  const toggleKeyVisibility = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const runPingTest = async (provider: string) => {
    setTestResult(prev => ({ ...prev, [provider]: 'pending' }));
    
    // Simulate API ping
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const setting = settings.find(s => s.provider === provider);
    const isOk = setting?.api_key && setting.api_key.length > 10;
    
    setTestResult(prev => ({ ...prev, [provider]: isOk ? 'success' : 'error' }));
    
    setTimeout(() => {
      setTestResult(prev => ({ ...prev, [provider]: null }));
    }, 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-950">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-6" />
        <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2 tracking-tighter">Access Denied</h1>
        <p className="text-slate-500 dark:text-slate-400 font-bold max-w-xs">
          관리자 전용 설정 화면입니다. 권한이 있는 계정으로 로그인해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-8 sm:py-12 space-y-10">
      {/* Header Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 shadow-xl rounded-[20px] flex items-center justify-center border border-slate-700">
            <Cpu className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-[950] text-slate-800 dark:text-white tracking-tighter uppercase">AI Settings</h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">지능형 서비스의 API 연동 상태와 리소스를 관리합니다.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-5 py-3 glass-panel rounded-2xl flex items-center gap-4 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Monthly Usage</span>
              <span className="text-lg font-black text-slate-800 dark:text-white">$12.50 / $50.00</span>
            </div>
            <div className="w-px h-8 bg-slate-100 dark:bg-slate-800"></div>
            <div className="text-right">
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">25.0%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Service Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {settings.map((service) => (
          <div key={service.provider} className={clsx(
            "glass-panel rounded-[32px] overflow-hidden border-2 transition-all duration-300",
            service.is_active ? "border-slate-100 dark:border-slate-800" : "border-slate-200 dark:border-slate-900 opacity-60 grayscale-[0.5]"
          )}>
            {/* Header */}
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={clsx(
                  "p-3 rounded-2xl flex items-center justify-center shadow-lg",
                  service.provider === 'openai' ? "bg-[#10a37f] text-white" : "bg-white dark:bg-slate-800"
                )}>
                  {service.provider === 'openai' ? <Bot className="w-6 h-6" /> : <Database className="w-6 h-6 text-blue-500" />}
                </div>
                <div>
                   <h3 className="font-[950] text-xl text-slate-800 dark:text-white capitalize tracking-tight">{service.provider}</h3>
                   <div className="flex items-center gap-2 mt-0.5">
                     <span className={clsx(
                       "w-1.5 h-1.5 rounded-full",
                       service.is_active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-400"
                     )}></span>
                     <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                       {service.is_active ? 'Active' : 'Disabled'}
                     </span>
                   </div>
                </div>
              </div>
              <button
                onClick={() => handleUpdateSetting(service.provider, { is_active: !service.is_active })}
                className={clsx(
                  "relative w-12 h-6 rounded-full transition-colors duration-300 flex items-center",
                  service.is_active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                )}
              >
                <div className={clsx(
                  "w-4.5 h-4.5 bg-white rounded-full shadow-md transition-transform duration-300",
                  service.is_active ? "translate-x-6.5" : "translate-x-1"
                )} />
              </button>
            </div>

            {/* Config Fields */}
            <div className="p-8 space-y-6">
              {/* API Key */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Key className="w-3.5 h-3.5" /> API Key
                  </label>
                  <button 
                    onClick={() => toggleKeyVisibility(service.provider)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center gap-1.5"
                  >
                    {showKeys[service.provider] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showKeys[service.provider] ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="relative group">
                  <input
                    type={showKeys[service.provider] ? "text" : "password"}
                    value={service.api_key}
                    onChange={(e) => handleUpdateSetting(service.provider, { api_key: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm font-mono focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                    placeholder="Enter API Key here..."
                  />
                  <button 
                    onClick={() => copyToClipboard(service.api_key)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Default Model */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5" /> Default Model
                  </label>
                  <div className="relative">
                    <select
                      value={service.default_model}
                      onChange={(e) => handleUpdateSetting(service.provider, { default_model: e.target.value })}
                      className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-3.5 text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
                    >
                      {service.provider === 'openai' ? (
                        <>
                          <option value="gpt-4o">gpt-4o (Newest)</option>
                          <option value="gpt-4-turbo">gpt-4-turbo</option>
                          <option value="o1-preview">o1-preview</option>
                          <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                        </>
                      ) : (
                        <>
                          <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                          <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                          <option value="gemini-1.0-pro">gemini-1.0-pro</option>
                        </>
                      )}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Safety / Limit Settings */}
                <div className="space-y-2">
                   <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Settings2 className="w-3.5 h-3.5" /> Safety Rank
                   </label>
                   <div className="flex items-center gap-1.5">
                     {['Low', 'Standard', 'High'].map((lv) => (
                       <button
                         key={lv}
                         onClick={() => handleUpdateSetting(service.provider, { settings: { ...service.settings, safety_level: lv.toLowerCase() } })}
                         className={clsx(
                           "flex-1 py-3 text-[11px] font-black uppercase tracking-tighter rounded-xl border transition-all",
                           service.settings.safety_level === lv.toLowerCase()
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/10"
                            : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                         )}
                       >
                         {lv}
                       </button>
                     ))}
                   </div>
                </div>
              </div>

              {/* Advanced Actions */}
              <div className="pt-4 flex items-center justify-between gap-4">
                 <button
                   onClick={() => runPingTest(service.provider)}
                   disabled={testResult[service.provider] === 'pending'}
                   className={clsx(
                     "flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-black text-sm transition-all",
                     testResult[service.provider] === 'success' ? "bg-emerald-500 text-white" :
                     testResult[service.provider] === 'error' ? "bg-rose-500 text-white" :
                     "bg-slate-900 border border-slate-800 text-white hover:bg-slate-800"
                   )}
                 >
                   {testResult[service.provider] === 'pending' ? (
                     <RefreshCcw className="w-4 h-4 animate-spin" />
                   ) : testResult[service.provider] === 'success' ? (
                     <CheckCircle2 className="w-4 h-4" />
                   ) : testResult[service.provider] === 'error' ? (
                     <ShieldAlert className="w-4 h-4" />
                   ) : (
                     <PlayCircle className="w-4 h-4" />
                   )}
                   {testResult[service.provider] === 'pending' ? 'Testing...' : 
                    testResult[service.provider] === 'success' ? 'Success' :
                    testResult[service.provider] === 'error' ? 'Connection Failed' :
                    'Ping Test Connection'}
                 </button>
              </div>
            </div>
          </div>
        ))}

        {/* Global Stats Chart (Placeholder/Simple Bar) */}
        <div className="xl:col-span-2 glass-panel rounded-[32px] overflow-hidden">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-900/5 dark:bg-slate-900/30">
            <h3 className="font-[950] text-xl text-slate-800 dark:text-white tracking-tight flex items-center gap-3 underline decoration-indigo-500 underline-offset-8">
              <Activity className="w-6 h-6 text-indigo-500" />
              Prompt Logs & Real-time Monitoring
            </h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-black text-slate-400 hover:text-slate-800 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
              Clear Records
            </button>
          </div>
          
          <div className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800/50">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Timestamp</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Service</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Model</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Purpose</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tokens</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {[
                    { id: '1', date: new Date(), provider: 'openai', model: 'gpt-4o', prompt: '행사 설명 문구 최적화 (살사 바차타 페스티벌)', tokens: 1240, cost: 0.12 },
                    { id: '2', date: new Date(Date.now() - 3600000), provider: 'gemini', model: 'gemini-1.5-pro', prompt: '사용자 장르 태깅 자동 분류 (Zouk Workshop)', tokens: 850, cost: 0.005 },
                    { id: '3', date: new Date(Date.now() - 7200000), provider: 'openai', model: 'gpt-4o', prompt: '시스템 로그 요약 및 관리 알림', tokens: 4200, cost: 0.45 },
                    { id: '4', date: new Date(Date.now() - 86400000), provider: 'gemini', model: 'gemini-1.5-flash', prompt: '커뮤니티 유해 게시물 필터링 배치작업', tokens: 15200, cost: 0.012 },
                  ].map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all group">
                      <td className="px-8 py-5">
                         <span className="text-xs font-bold text-slate-500 whitespace-nowrap">{format(log.date, 'MM.dd HH:mm:ss')}</span>
                      </td>
                      <td className="px-8 py-5">
                         <span className={clsx(
                           "text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider",
                           log.provider === 'openai' ? "bg-[#10a37f]/10 text-[#10a37f]" : "bg-blue-500/10 text-blue-500"
                         )}>
                           {log.provider}
                         </span>
                      </td>
                      <td className="px-8 py-5">
                         <span className="text-[11px] font-black text-slate-400 uppercase">{log.model}</span>
                      </td>
                      <td className="px-8 py-5">
                         <p className="text-[13px] font-black text-slate-700 dark:text-slate-200 truncate max-w-xs group-hover:max-w-none transition-all">{log.prompt}</p>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <span className="text-[13px] font-bold text-slate-600 dark:text-slate-400">{log.tokens.toLocaleString()}</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <span className="text-[13px] font-black text-indigo-600 dark:text-indigo-400">${log.cost.toFixed(3)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-center">
               <button className="flex items-center gap-2 text-[11px] font-black text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors uppercase tracking-[0.2em]">
                 View Full Monitoring Logs <ChevronDown className="w-3.5 h-3.5" />
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
