import React, { useState, useEffect } from 'react';
import { 
  User, 
  Settings, 
  Save, 
  AtSign, 
  Instagram, 
  Facebook, 
  MessageCircle,
  History,
  TrendingUp,
  ChevronRight,
  Clock,
  ShieldCheck,
  Zap,
  RefreshCw,
  Coins,
  ArrowLeft,
  Bot,
  Key,
  Eye,
  EyeOff,
  Activity,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { GoogleGenerativeAI } from '@google/generative-ai';

type TabType = 'profile' | 'activity' | 'ai' | 'account';

const DIAGNOSTIC_MODELS = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', desc: 'AI 포스터 분석 (멀티모달)' },
  { id: 'gemini-1.5-flash-002', name: 'Gemini 1.5 Flash 002', desc: 'AI 추천 모드 (안정성)' }
];

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI (ChatGPT)', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg', models: ['gpt-4o', 'gpt-4o-mini'] },
  { id: 'google', name: 'Google (Gemini)', icon: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg', models: ['gemini-2.0-flash', 'gemini-1.5-flash-002'] }
];

export default function UserSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Profile Form State
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [kakaoId, setKakaoId] = useState('');

  // Activity State
  const [pointHistory, setPointHistory] = useState<any[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);

  // AI Settings State
  const [aiConfigs, setAiConfigs] = useState<any[]>([]);
  const [aiProvider, setAiProvider] = useState<'openai' | 'google'>('openai');
  const [aiApiKey, setAiApiKey] = useState('');
  const [showAiKey, setShowAiKey] = useState(false);
  const [aiSelectedModel, setAiSelectedModel] = useState('gpt-4o');
  const [saveToLocal, setSaveToLocal] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (profile) {
      setDisplayName(profile.displayName || '');
      setGender(profile.gender as any || null);
      setInstagramUrl(profile.instagram_url || '');
      setFacebookUrl(profile.facebook_url || '');
      setKakaoId(profile.kakao_id || '');
    }
  }, [user, profile]);

  useEffect(() => {
    if (activeTab === 'activity' && user) fetchPoints();
    if (activeTab === 'ai' && user) fetchAIConfigs();
  }, [activeTab, user]);

  const fetchPoints = async () => {
    setLoadingPoints(true);
    try {
      const { data, error } = await supabase
        .from('point_history')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPointHistory(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPoints(false);
    }
  };

  const fetchAIConfigs = async () => {
    setLoading(true);
    try {
      const { data: dbKeys } = await supabase
        .from('user_ai_configs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      const localKey = localStorage.getItem('user_gemini_api_key');
      const finalConfigs = [...(dbKeys || [])];
      if (localKey) {
        finalConfigs.unshift({
          id: 'local',
          provider: 'google',
          api_key: localKey,
          model: 'gemini-2.0-flash',
          status: 'active',
          is_local: true
        });
      }
      setAiConfigs(finalConfigs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          display_name: displayName,
          gender: gender,
          instagram_url: instagramUrl,
          facebook_url: facebookUrl,
          kakao_id: kakaoId,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);
      
      if (error) throw error;
      await refreshProfile();
      setSaveMessage('성공적으로 저장되었습니다.');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error(err);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAIConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiApiKey) return;
    setIsSaving(true);
    try {
      if (aiProvider === 'google' && saveToLocal) {
        localStorage.setItem('user_gemini_api_key', aiApiKey);
      } else {
        const { error } = await supabase
          .from('user_ai_configs')
          .upsert({
            user_id: user?.id,
            provider: aiProvider,
            api_key: aiApiKey,
            model: aiSelectedModel,
            status: 'active',
            updated_at: new Date().toISOString()
          });
        if (error) throw error;
      }
      setAiApiKey('');
      fetchAIConfigs();
      setSaveMessage('AI 설정이 저장되었습니다.');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!window.confirm('정말 탈퇴하시겠습니까? 포인트와 활동 내역이 영구 삭제됩니다.')) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', user?.id);
      if (error) throw error;
      await supabase.auth.signOut();
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  const tabs = [
    { id: 'profile', label: '개인정보 설정', icon: User },
    { id: 'activity', label: '활동 로그', icon: History },
    { id: 'ai', label: 'AI 서비스 관리', icon: Bot },
    { id: 'account', label: '계정 관리', icon: ShieldCheck },
  ];

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-full p-4 md:p-10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> 이전으로
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-[950] text-slate-900 dark:text-white tracking-tight">Account Settings</h1>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Nav */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-2 border border-slate-200 dark:border-slate-800 shadow-sm sticky top-24">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={clsx(
                    "w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-black text-sm transition-all",
                    activeTab === tab.id 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                      : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  <tab.icon className={clsx("w-5 h-5", activeTab === tab.id ? "text-white" : "text-slate-400")} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-9">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 p-8 md:p-10 shadow-sm min-h-[600px]"
              >
                {activeTab === 'profile' && (
                  <form onSubmit={handleUpdateProfile} className="space-y-8">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-6 mb-8">
                      <h2 className="text-2xl font-black text-slate-800 dark:text-white">개인정보 및 SNS 설정</h2>
                      <p className="text-slate-500 mt-1 font-medium">댄스 커뮤니티에서 활동할 때 사용되는 정보입니다.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">공개 닉네임</label>
                        <input 
                          type="text" 
                          value={displayName} 
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">성별</label>
                        <div className="grid grid-cols-2 gap-3 h-[54px]">
                          <button
                            type="button" onClick={() => setGender('male')}
                            className={clsx("rounded-2xl text-xs font-black transition-all border-2", gender === 'male' ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20" : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400")}
                          >MALE</button>
                          <button
                            type="button" onClick={() => setGender('female')}
                            className={clsx("rounded-2xl text-xs font-black transition-all border-2", gender === 'female' ? "bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/20" : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400")}
                          >FEMALE</button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">SNS 연동 (선택)</label>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="relative group">
                          <Instagram className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-500/60" />
                          <input type="text" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} className="w-full pl-14 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold" placeholder="Instagram ID" />
                        </div>
                        <div className="relative group">
                          <Facebook className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600/60" />
                          <input type="text" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} className="w-full pl-14 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold" placeholder="Facebook URL" />
                        </div>
                        <div className="relative group">
                          <MessageCircle className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500/60" />
                          <input type="text" value={kakaoId} onChange={(e) => setKakaoId(e.target.value)} className="w-full pl-14 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold" placeholder="KakaoTalk ID" />
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 flex items-center justify-between">
                      {saveMessage && <p className="text-sm font-black text-emerald-600">{saveMessage}</p>}
                      <button 
                        type="submit" disabled={isSaving}
                        className="ml-auto px-10 py-4 bg-slate-900 dark:bg-indigo-600 text-white font-black rounded-2xl hover:bg-black transition-all shadow-xl shadow-indigo-600/10 flex items-center gap-2"
                      >
                        {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        저장하기
                      </button>
                    </div>
                  </form>
                )}

                {activeTab === 'activity' && (
                  <div className="space-y-8">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-6 mb-8">
                      <h2 className="text-2xl font-black text-slate-800 dark:text-white">활동 내역 및 포인트 로그</h2>
                      <p className="text-slate-500 mt-1 font-medium">서비스 내에서의 모든 활동 기록입니다.</p>
                    </div>

                    {loadingPoints ? (
                      <div className="py-20 flex flex-col items-center gap-3">
                        <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
                        <p className="text-sm font-bold text-slate-400 tracking-widest">LOADING LOGS...</p>
                      </div>
                    ) : pointHistory.length > 0 ? (
                      <div className="space-y-4">
                        {pointHistory.map((h) => (
                          <div key={h.id} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[28px] border border-slate-100 dark:border-slate-800 group hover:border-indigo-200 transition-all">
                            <div className="flex items-center gap-5">
                              <div className={clsx(
                                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                                h.amount > 0 ? "bg-emerald-100 text-emerald-600 shadow-sm" : "bg-rose-100 text-rose-600 shadow-sm"
                              )}>
                                {h.amount > 0 ? <TrendingUp className="w-6 h-6" /> : <ChevronRight className="w-5 h-5 rotate-90" />}
                              </div>
                              <div>
                                <p className="text-[15px] font-black text-slate-800 dark:text-white leading-tight mb-1">{h.reason}</p>
                                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                  <Clock className="w-3.5 h-3.5" />
                                  {format(new Date(h.created_at), 'yyyy-MM-dd HH:mm')}
                                </div>
                              </div>
                            </div>
                            <span className={clsx("text-xl font-[950] tracking-tighter", h.amount > 0 ? "text-emerald-600" : "text-rose-600")}>
                               {h.amount > 0 ? `+${h.amount.toLocaleString()}` : h.amount.toLocaleString()} P
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-32 text-center">
                        <Activity className="w-16 h-16 text-slate-100 dark:text-slate-800 mx-auto mb-4" />
                        <p className="text-slate-300 dark:text-slate-700 font-black text-lg italic">아직 활동 기록이 없습니다.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'ai' && (
                  <div className="space-y-8">
                     <div className="border-b border-slate-100 dark:border-slate-800 pb-6 mb-8 flex justify-between items-end">
                      <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white">AI 서비스 설정</h2>
                        <p className="text-slate-500 mt-1 font-medium">개인 API 키를 등록하여 스마트한 기능을 활용하세요.</p>
                      </div>
                      <ShieldCheck className="w-8 h-8 text-emerald-500 hidden md:block opacity-50" />
                    </div>

                    <form onSubmit={handleSaveAIConfig} className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                       <div className="space-y-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Provider</label>
                             <div className="grid grid-cols-2 gap-3">
                                {PROVIDERS.map(p => (
                                   <button 
                                      key={p.id} type="button" onClick={() => setAiProvider(p.id as any)}
                                      className={clsx("flex items-center gap-2 p-3 rounded-xl border-2 transition-all", aiProvider === p.id ? "border-orange-500 bg-orange-50/30 dark:bg-orange-500/10" : "border-slate-100 dark:border-slate-800 hover:border-orange-200")}
                                   >
                                      <img src={p.icon} className="w-5 h-5" />
                                      <span className="text-xs font-black">{p.name.split(' ')[0]}</span>
                                   </button>
                                ))}
                             </div>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">API Key</label>
                             <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                   type={showAiKey ? 'text' : 'password'} value={aiApiKey} onChange={e => setAiApiKey(e.target.value)}
                                   className="w-full pl-11 pr-11 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold"
                                />
                                <button type="button" onClick={() => setShowAiKey(!showAiKey)} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 transition-colors">
                                   {showAiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                             </div>
                          </div>
                          <button type="submit" disabled={isSaving || !aiApiKey} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-orange-500/20">SAVE CONFIG</button>
                       </div>
                       
                       <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[32px] border border-slate-100 dark:border-slate-800 space-y-4">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                             <Zap className="w-3.5 h-3.5 text-orange-500" /> ACTIVE CONFIGS
                          </h3>
                          {aiConfigs.length === 0 ? (
                             <p className="text-xs text-slate-400 font-bold italic py-4 text-center">No configs saved</p>
                          ) : (
                             <div className="space-y-2">
                                {aiConfigs.map(c => (
                                   <div key={c.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                      <div className="flex items-center gap-3">
                                         <img src={PROVIDERS.find(p => p.id === c.provider)?.icon} className="w-5 h-5" />
                                         <div>
                                            <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase leading-none mb-1">{c.provider}</p>
                                            <p className="text-[9px] font-mono text-slate-400">{(c.api_key || '').slice(0, 8)}...</p>
                                         </div>
                                      </div>
                                      <button className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                   </div>
                                ))}
                             </div>
                          )}
                       </div>
                    </form>
                  </div>
                )}

                {activeTab === 'account' && (
                  <div className="space-y-8">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-6 mb-8">
                      <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Account Management</h2>
                      <p className="text-slate-500 mt-1 font-medium">보안 설정 및 계정 상태를 관리합니다.</p>
                    </div>

                    <div className="p-8 bg-rose-50 dark:bg-rose-950/20 rounded-[32px] border border-rose-100 dark:border-rose-900/20 space-y-4">
                       <div className="flex items-start gap-4">
                          <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
                             <XCircle className="w-6 h-6 text-rose-500" />
                          </div>
                          <div>
                             <h3 className="text-lg font-black text-rose-800 dark:text-rose-300">회원 탈퇴</h3>
                             <p className="text-sm text-rose-600/70 dark:text-rose-400/60 font-medium leading-relaxed mt-1">탈퇴 시 모든 적립 포인트, 활동 내역, 북마크 데이터가 즉시 삭제되며 복구가 불가능합니다.</p>
                          </div>
                       </div>
                       <button onClick={handleWithdrawal} className="w-full py-4 bg-white dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-black rounded-2xl border-2 border-rose-100 dark:border-rose-900/30 hover:bg-rose-600 hover:text-white transition-all">계정 영구 삭제 (Withdrawal)</button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
