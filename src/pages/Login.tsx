import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'motion/react';
import { User, ShieldCheck, AlertCircle, Wind, Music, GraduationCap, Camera, CheckCircle2, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useAuth, UserRole } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    if (!isLoginMode && !selectedRole) {
      setErrorMsg("가입하실 역할을 먼저 선택해주세요!");
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    
    if (isLoginMode) {
      window.sessionStorage.removeItem('intendedRole'); 
    } else {
      window.sessionStorage.setItem('intendedRole', selectedRole!);
    }

    try {
      // AI Studio의 iframe 환경에서는 팝업 방식의 로그인이 필요합니다.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true,
        }
      });
      
      if (error) throw error;

      if (data?.url) {
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          data.url,
          'google-login',
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=no`
        );

        if (!popup) {
          setErrorMsg("팝업 차단이 감지되었습니다. 팝업 허용 후 다시 시도해주세요.");
          return;
        }

        // Listen for the message from the popup
        const handleAuthMessage = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
            window.removeEventListener('message', handleAuthMessage);
            setLoading(true);
            
            // Force a session refresh
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              navigate('/');
            } else {
              // Wait a bit more and try again
              setTimeout(async () => {
                const { data: { session: retrySession } } = await supabase.auth.getSession();
                if (retrySession) navigate('/');
              }, 1000);
            }
          }
        };

        window.addEventListener('message', handleAuthMessage);

        // Fallback: Still monitor popup closure
        const checkPopup = setInterval(async () => {
          if (popup.closed) {
            clearInterval(checkPopup);
            // Give it a moment to sync storage
            setTimeout(async () => {
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                navigate('/');
              }
            }, 500);
          }
        }, 1000);
      }
    } catch (error: any) {
      setErrorMsg(`로그인 처리 중 문제가 발생했습니다. (${error.message || '오류'})`);
      window.sessionStorage.removeItem('intendedRole');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[480px] w-full glass-panel rounded-[24px] p-8 md:p-12 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-orange-500" />
        
        <div className="flex justify-center mb-6">
          <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
            <div className="relative w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-center text-orange-500 shadow-sm">
              <Wind className="w-8 h-8" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-black bg-gradient-to-r from-amber-600 to-orange-500 dark:from-amber-400 dark:to-yellow-300 bg-clip-text text-transparent tracking-tighter mb-2">
          Dancehive
        </h1>
        
        {isLoginMode ? (
          <div className="mb-8">
            <p className="text-slate-500 text-sm mb-4 leading-relaxed max-w-[280px] mx-auto">
              다시 오신 것을 환영합니다!<br/>
              계속하려면 로그인해주세요.
            </p>
            <div className="flex items-center justify-center gap-2 text-[11px] text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/10 py-2 px-4 rounded-lg border border-amber-100 dark:border-amber-900/20 max-w-[300px] mx-auto font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>처음이신가요? 하단의 "회원가입 하러가기"를 먼저 눌러주세요!</span>
            </div>
          </div>
        ) : (
          <p className="text-slate-500 text-sm mb-6 leading-relaxed max-w-[280px] mx-auto">
            Dancehive에서 어떤 활동을 하고 싶으신가요?<br/>
            당신의 역할을 선택해주세요.
          </p>
        )}

        <AnimatePresence mode="wait">
          {!isLoginMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {!selectedRole ? (
                <p className="text-[13px] font-black text-amber-600 dark:text-amber-400 mb-4 animate-pulse">
                  ↑ 활동하실 역할을 먼저 선택한 후 버튼을 눌러주세요!
                </p>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-4 p-3 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 text-orange-800 dark:text-amber-300 text-xs font-black leading-relaxed"
                >
                  <span className="flex items-center justify-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-orange-500" />
                    멋진 선택입니다!
                  </span>
                  이제 아래 버튼을 눌러{" "}
                  <span className="text-orange-600 dark:text-amber-400 underline decoration-2 underline-offset-2">
                    {selectedRole === 'participant' ? '일반 참여자' : 
                     selectedRole === 'host' ? '행사 주최자' : 
                     selectedRole === 'dj' ? 'DJ' : 
                     selectedRole === 'instructor' ? '강사' : '포토/영상 전문가'}
                  </span>
                  로 가입을 완료해주세요.
                </motion.div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                <button
                  onClick={() => setSelectedRole('participant')}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-2 p-3 rounded-[16px] border-2 transition-all",
                    selectedRole === 'participant' 
                      ? "border-orange-500 bg-amber-50 dark:bg-amber-900/20 text-orange-700 dark:text-amber-400" 
                      : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:border-amber-200 hover:bg-amber-50/50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                  )}
                >
                  <User className={clsx("w-6 h-6", selectedRole === 'participant' ? "text-orange-600 dark:text-amber-400" : "text-slate-400")} />
                  <span className="font-bold text-xs">일반 참여자</span>
                </button>

                <button
                  onClick={() => setSelectedRole('host')}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-2 p-3 rounded-[16px] border-2 transition-all",
                    selectedRole === 'host' 
                      ? "border-orange-500 bg-amber-50 dark:bg-amber-900/20 text-orange-700 dark:text-amber-400" 
                      : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:border-amber-200 hover:bg-amber-50/50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                  )}
                >
                  <ShieldCheck className={clsx("w-6 h-6", selectedRole === 'host' ? "text-orange-600 dark:text-amber-400" : "text-slate-400")} />
                  <span className="font-bold text-xs">행사 주최자</span>
                </button>

                <button
                  onClick={() => setSelectedRole('dj')}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-2 p-3 rounded-[16px] border-2 transition-all",
                    selectedRole === 'dj' 
                      ? "border-orange-500 bg-amber-50 dark:bg-amber-900/20 text-orange-700 dark:text-amber-400" 
                      : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:border-amber-200 hover:bg-amber-50/50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                  )}
                >
                  <Music className={clsx("w-6 h-6", selectedRole === 'dj' ? "text-orange-600 dark:text-amber-400" : "text-slate-400")} />
                  <span className="font-bold text-xs">DJ</span>
                </button>

                <button
                  onClick={() => setSelectedRole('instructor')}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-2 p-3 rounded-[16px] border-2 transition-all",
                    selectedRole === 'instructor' 
                      ? "border-orange-500 bg-amber-50 dark:bg-amber-900/20 text-orange-700 dark:text-amber-400" 
                      : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:border-amber-200 hover:bg-amber-50/50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                  )}
                >
                  <GraduationCap className={clsx("w-6 h-6", selectedRole === 'instructor' ? "text-orange-600 dark:text-amber-400" : "text-slate-400")} />
                  <span className="font-bold text-xs">강사</span>
                </button>

                <button
                  onClick={() => setSelectedRole('media')}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-2 p-3 rounded-[16px] border-2 transition-all",
                    selectedRole === 'media' 
                      ? "border-orange-500 bg-amber-50 dark:bg-amber-900/20 text-orange-700 dark:text-amber-400" 
                      : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:border-amber-200 hover:bg-amber-50/50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                  )}
                >
                  <Camera className={clsx("w-6 h-6", selectedRole === 'media' ? "text-orange-600 dark:text-amber-400" : "text-slate-400")} />
                  <span className="font-bold text-xs">포토/영상</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-3">
          <motion.button
            onClick={handleLogin}
            disabled={(!isLoginMode && !selectedRole) || loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-bold py-4 px-6 rounded-[14px] hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-300 border-t-amber-500 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                <path fill="none" d="M1 1h22v22H1z" />
              </svg>
            )}
            <span>{loading ? '처리 중...' : t('auth.loginGoogle')}</span>
          </motion.button>
          
          <motion.button
            onClick={() => {
              if (!isLoginMode && !selectedRole) {
                setErrorMsg("가입하실 역할을 먼저 선택해주세요!");
                return;
              }
              setErrorMsg("카카오 로그인을 위해서는 외부 연동 절차(API 키 발급, Firebase 공급자 설정 등)가 필요하여 현재 미리보기 환경에선 지원되지 않습니다.");
            }}
            disabled={(!isLoginMode && !selectedRole) || loading}
            className="w-full flex items-center justify-center gap-3 bg-[#FEE500] text-black/85 font-bold py-4 px-6 rounded-[14px] hover:bg-[#FEE500]/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed border border-transparent"
          >
             <svg viewBox="0 0 32 32" className="w-5 h-5">
                <path fill="currentColor" d="M16 4.64C8.618 4.64 2.632 9.248 2.632 14.934c0 3.655 2.378 6.866 5.922 8.636l-1.503 5.485c-.173.633.543 1.077 1.08.718l6.398-4.22c.484.032.973.05 1.472.05 7.382 0 13.368-4.609 13.368-10.295S23.382 4.64 16 4.64z" />
             </svg>
            <span>카카오톡으로 계속하기</span>
          </motion.button>
        </div>

        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex items-start gap-2 text-left bg-rose-50 text-rose-700 font-bold text-[13px] px-5 py-4 rounded-xl border border-rose-100"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <p className="leading-snug">{errorMsg}</p>
          </motion.div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          {isLoginMode ? (
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-slate-500">아직 회원이 아니신가요?</span>
              <button 
                onClick={() => {
                  setIsLoginMode(false);
                  setErrorMsg(null);
                }}
                className="text-orange-600 dark:text-amber-400 font-bold hover:underline transition-all"
              >
                회원가입 하러가기
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-[12px] text-slate-400 max-w-[250px] leading-relaxed">
                가입 시 <a href="/terms" className="underline hover:text-slate-600">서비스 이용약관</a> 및 <a href="/privacy" className="underline hover:text-slate-600">개인정보 처리방침</a>에 동의하게 됩니다.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">이미 계정이 있으신가요?</span>
                <button 
                  onClick={() => setIsLoginMode(true)}
                  className="text-orange-600 dark:text-amber-400 font-bold hover:underline transition-all"
                >
                  로그인
                </button>
              </div>
            </div>
          )}
        </div>
        
      </motion.div>
    </div>
  );
}
