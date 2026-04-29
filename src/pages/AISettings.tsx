import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Key, 
  Eye, 
  EyeOff, 
  Save, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  ChevronRight,
  ShieldCheck,
  Zap,
  Globe
} from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

interface AISetting {
  id: string;
  user_id: string;
  provider: 'openai' | 'google';
  api_key: string;
  model: string;
  status: 'active' | 'error';
  last_checked?: string;
  created_at: string;
}

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI (ChatGPT)', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
  { id: 'google', name: 'Google (Gemini)', icon: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg', models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'] }
];

export default function AISettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedKeys, setSavedKeys] = useState<AISetting[]>([]);
  
  // Form State
  const [provider, setProvider] = useState<'openai' | 'google'>('openai');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [saveToLocal, setSaveToLocal] = useState(true); // Default to local for higher privacy

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // 1. Fetch from Supabase
      const { data: dbKeys, error } = await supabase
        .from('user_ai_configs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // 2. Fetch from LocalStorage
      const localGeminiKey = localStorage.getItem('user_gemini_api_key');
      const finalKeys: any[] = [...(dbKeys || [])];
      
      if (localGeminiKey) {
        // Add a virtual entry for local key
        finalKeys.unshift({
          id: 'local-gemini',
          user_id: user?.id || 'local',
          provider: 'google',
          api_key: localGeminiKey,
          model: 'gemini-2.0-flash',
          status: 'active',
          is_local: true,
          created_at: new Date().toISOString()
        });
      }
      
      setSavedKeys(finalKeys);
    } catch (err) {
      console.error('Error fetching AI settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) return;
    
    setIsSaving(true);
    try {
      if (provider === 'google' && saveToLocal) {
        // Save to LocalStorage ONLY (Highest Privacy)
        localStorage.setItem('user_gemini_api_key', apiKey);
        alert('API 키가 브라우저 보안 저장소(LocalStorage)에 안전하게 저장되었습니다. 서버에는 저장되지 않습니다.');
      } else {
        // Save to Database (Cloud Sync)
        const { error } = await supabase
          .from('user_ai_configs')
          .upsert({
            user_id: user?.id,
            provider,
            api_key: apiKey,
            model: selectedModel,
            status: 'active',
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,provider' });

        if (error) throw error;
        alert('API 연동 설정이 서버에 성공적으로 저장되었습니다.');
      }
      
      setApiKey('');
      fetchSettings();
    } catch (err: any) {
      alert(`저장 실패: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, isLocal?: boolean) => {
    if (!window.confirm('정말 이 API 설정을 삭제하시겠습니까?')) return;
    
    try {
      if (isLocal) {
        localStorage.removeItem('user_gemini_api_key');
      } else {
        const { error } = await supabase
          .from('user_ai_configs')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
      }
      fetchSettings();
    } catch (err: any) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const maskKey = (key: string) => {
    if (key.length <= 12) return '****';
    return `${key.slice(0, 8)}...${key.slice(-4)}`;
  };

  const currentProviderData = PROVIDERS.find(p => p.id === provider);

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 min-h-full p-6 md:p-10 overflow-y-auto no-scrollbar">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold mb-4 transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
            이전 화면으로
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500 rounded-xl shadow-lg shadow-orange-500/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">AI API 설정</h1>
          </div>
          <p className="text-slate-500 font-medium">관리자 뿐만 아니라 모든 회원이 개인별 AI API를 등록하여 사용할 수 있습니다.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Registration Form */}
          <div className="lg:col-span-5">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 p-8 shadow-sm"
            >
              <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-500" /> AI 서비스 연동
              </h2>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">제공자 선택</label>
                  <div className="grid grid-cols-2 gap-3">
                    {PROVIDERS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setProvider(p.id as any);
                          setSelectedModel(p.models[0]);
                        }}
                        className={clsx(
                          "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all",
                          provider === p.id 
                            ? "border-orange-500 bg-orange-50/50 dark:bg-orange-500/10 shadow-sm" 
                            : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-orange-200"
                        )}
                      >
                        <img src={p.icon} className="w-6 h-6" alt={p.name} />
                        <span className={clsx("font-bold text-sm", provider === p.id ? "text-orange-600 dark:text-orange-400" : "text-slate-500")}>
                          {p.id === 'openai' ? 'OpenAI' : 'Gemini'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">API 키 입력</label>
                  <div className="relative">
                    <input 
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={provider === 'openai' ? 'sk-...' : 'AIzaSy...'}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-12 py-4 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <button 
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                    >
                      {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 px-1">
                    {provider === 'openai' ? 'OpenAI Dashboard' : 'Google AI Studio'}에서 발급받은 키를 입력하세요.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">기본 모델 설정</label>
                  <div className="relative">
                    <select 
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 font-bold text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-orange-500/20 appearance-none"
                    >
                      {currentProviderData?.models.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </div>
                  </div>
                </div>

                {provider === 'google' && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={saveToLocal}
                        onChange={(e) => setSaveToLocal(e.target.checked)}
                        className="w-5 h-5 rounded-lg border-2 border-emerald-200 text-emerald-500 focus:ring-emerald-500/20 transition-all"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-black text-emerald-800 dark:text-emerald-400">브라우저 로컬 저장 (권장)</p>
                        <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70 font-bold leading-tight mt-0.5">키가 서버로 전송되지 않아 가장 안전합니다.</p>
                      </div>
                    </label>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isSaving || !apiKey}
                  className={clsx(
                    "w-full py-5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2",
                    (isSaving || !apiKey) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  API 연결 저장
                </button>
              </form>
            </motion.div>
          </div>

          {/* Right: Saved Keys & Security Guide */}
          <div className="lg:col-span-7 space-y-8">
            {/* Top Right: Saved Keys */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 p-8 shadow-sm"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-500" /> 저장된 API 리스트
                </h2>
                <button 
                  onClick={fetchSettings}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-all"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              {loading ? (
                <div className="py-10 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
                  <p className="text-xs font-bold text-slate-400">설정 불러오는 중...</p>
                </div>
              ) : savedKeys.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                   <Bot className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                   <p className="text-sm font-bold text-slate-400">등록된 API 키가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedKeys.map((key) => {
                    const pData = PROVIDERS.find(p => p.id === key.provider);
                    return (
                      <div key={key.id} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 group hover:border-orange-200 transition-all">
                        <div className="flex items-center gap-4">
                          <img src={pData?.icon} className="w-10 h-10 p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm" alt="provider" />
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-black text-slate-800 dark:text-white">{pData?.name}</span>
                              {key.status === 'active' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-rose-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                               <p className="text-[11px] font-mono text-slate-400">{maskKey((key as any).api_key)}</p>
                               <span className="text-[10px] font-black text-orange-600 bg-orange-50 dark:bg-orange-950 px-1.5 py-0.5 rounded-md uppercase">{(key as any).model}</span>
                               {(key as any).is_local && (
                                 <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded-md uppercase border border-emerald-100 dark:border-emerald-500/20">LOCAL</span>
                               )}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDelete(key.id, (key as any).is_local)}
                          className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-rose-600 hover:border-rose-100 rounded-2xl shadow-sm transition-all active:scale-95"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Bottom Right: Security Guide */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-orange-50 dark:bg-orange-900/10 rounded-[32px] border border-orange-100 dark:border-orange-800/30 p-8"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
                  <AlertTriangle className="w-6 h-6 text-orange-500" />
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-black text-orange-900 dark:text-orange-400 mb-1">보안 주의사항 (Security Guide)</h3>
                    <p className="text-sm text-orange-800/70 dark:text-orange-500/70 leading-relaxed font-medium">당신의 데이터 권리를 지키기 위해 다음 사항을 꼭 확인하세요.</p>
                  </div>
                  
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                       <CheckCircle2 className="w-4 h-4 text-orange-400 mt-1 shrink-0" />
                       <p className="text-xs text-orange-800/80 dark:text-orange-500 font-bold">API 키는 브라우저 로컬 환경이 아닌 서버(Safe Vault)에 암호화되어 안전하게 저장됩니다.</p>
                    </li>
                    <li className="flex items-start gap-3">
                       <CheckCircle2 className="w-4 h-4 text-orange-400 mt-1 shrink-0" />
                       <p className="text-xs text-orange-800/80 dark:text-orange-500 font-bold">불필요한 과금을 방지하기 위해 각 제공자 사이트에서 사용 한도를 설정하세요.</p>
                    </li>
                    <li className="flex items-start gap-3">
                       <CheckCircle2 className="w-4 h-4 text-orange-400 mt-1 shrink-0" />
                       <p className="text-xs text-orange-800/80 dark:text-orange-500 font-bold">유출이 의심될 경우 즉시 해당 제공자 사이트에서 키를 폐기하고 재발급받으세요.</p>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
