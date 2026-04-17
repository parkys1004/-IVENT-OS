import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle, auth } from '../firebase';
import { getRedirectResult } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { User, ShieldCheck, AlertCircle, Info } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'user' | 'host' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Check if there was an error returning from the Google redirect
    getRedirectResult(auth).catch((error) => {
      console.error("Redirect Auth Error:", error);
      if (error?.message?.includes('unauthorized-domain')) {
         setErrorMsg('도메인 승인 오류(403): Firebase Console의 [Authentication > Settings > Authorized domains]에 현재 주소(아래)를 추가해야 페이지 방식 로그인이 작동합니다.');
      } else if (error?.message?.includes('missing initial state') || error?.message?.includes('storage-partitioned')) {
         setErrorMsg('브라우저 보안 알림: 현재 화면(미리보기 창)은 "아이프레임(Iframe)" 내부이므로 브라우저가 보안상 페이지 이동을 차단했습니다. 반드시 우측 상단의 "🔗 새 탭에서 열기"를 누른 후 거기서 로그인해주세요.');
      } else {
         setErrorMsg(`로그인 오류 발생: ${error.message}`);
      }
    });

    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    if (!selectedRole) {
      setErrorMsg("로그인 전 역할을 먼저 선택해주세요!");
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    // Intent stored for AuthContext
    window.sessionStorage.setItem('intendedRole', selectedRole);
    try {
      await loginWithGoogle();
      // App unloads here due to redirect
    } catch (error: any) {
      setErrorMsg(`로그인 페이지 이동 실패: ${error.message}`);
      window.sessionStorage.removeItem('intendedRole');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[480px] w-full bg-white rounded-[24px] shadow-sm border border-slate-200 p-10 md:p-14 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-violet-500" />
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-indigo-50 rounded-[16px] flex items-center justify-center text-indigo-600">
            <span className="text-3xl font-black">◈</span>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-3">
          IVENT OS 시작하기
        </h1>
        <p className="text-slate-500 text-[15px] mb-8 leading-relaxed">
          원하시는 회원 유형을 먼저 선택해주세요.<br/>
          (관리자는 지정된 메일로 자동 부여됩니다)
        </p>

        <div className="grid grid-cols-2 gap-4 mb-10">
          <button
            onClick={() => setSelectedRole('user')}
            className={clsx(
              "flex flex-col items-center justify-center gap-3 p-6 rounded-[16px] border-2 transition-all",
              selectedRole === 'user' 
                ? "border-indigo-600 bg-indigo-50 text-indigo-700" 
                : "border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50"
            )}
          >
            <User className={clsx("w-8 h-8", selectedRole === 'user' ? "text-indigo-600" : "text-slate-400")} />
            <span className="font-bold">일반 참여자</span>
          </button>

          <button
            onClick={() => setSelectedRole('host')}
            className={clsx(
              "flex flex-col items-center justify-center gap-3 p-6 rounded-[16px] border-2 transition-all",
              selectedRole === 'host' 
                ? "border-indigo-600 bg-indigo-50 text-indigo-700" 
                : "border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50"
            )}
          >
            <ShieldCheck className={clsx("w-8 h-8", selectedRole === 'host' ? "text-indigo-600" : "text-slate-400")} />
            <span className="font-bold">행사 주최자</span>
          </button>
        </div>

        <AnimatePresence>
          <div className="flex flex-col gap-3">
            <motion.button
              initial={{ opacity: selectedRole ? 1 : 0.5 }}
              animate={{ opacity: selectedRole ? 1 : 0.5 }}
              onClick={handleLogin}
              disabled={!selectedRole || loading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-bold py-4 px-6 rounded-[14px] hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  <path fill="none" d="M1 1h22v22H1z" />
                </svg>
              )}
              <span>{loading ? '로그인 처리 중...' : 'Google 계정으로 로그인'}</span>
            </motion.button>
            <motion.button
              initial={{ opacity: selectedRole ? 1 : 0.5 }}
              animate={{ opacity: selectedRole ? 1 : 0.5 }}
              onClick={() => {
                if (!selectedRole) {
                  setErrorMsg("로그인 전 역할을 먼저 선택해주세요!");
                  return;
                }
                setErrorMsg("카카오 로그인을 위해서는 외부 연동 절차(API 키 발급, Firebase 공급자 설정 등)가 필요하여 현재 미리보기 환경에선 지원되지 않습니다.");
              }}
              disabled={!selectedRole || loading}
              className="w-full flex items-center justify-center gap-3 bg-[#FEE500] text-black/85 font-bold py-4 px-6 rounded-[14px] hover:bg-[#FEE500]/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
               <svg viewBox="0 0 32 32" className="w-5 h-5">
                  <path fill="currentColor" d="M16 4.64C8.618 4.64 2.632 9.248 2.632 14.934c0 3.655 2.378 6.866 5.922 8.636l-1.503 5.485c-.173.633.543 1.077 1.08.718l6.398-4.22c.484.032.973.05 1.472.05 7.382 0 13.368-4.609 13.368-10.295S23.382 4.64 16 4.64z" />
               </svg>
              <span>카카오톡으로 로그인</span>
            </motion.button>
          </div>
        </AnimatePresence>

        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex flex-col items-start gap-2 text-left bg-rose-50 text-rose-700 font-bold text-[13px] px-5 py-4 rounded-xl border border-rose-100"
          >
            <div className="flex items-start gap-2 w-full mb-1">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <p className="leading-snug">{errorMsg}</p>
            </div>
            {(errorMsg.includes('403') || errorMsg.includes('보안상 페이지 이동을 차단')) && (
              <div className="flex items-start gap-2 w-full mt-2 pt-2 border-t border-rose-200/50 text-rose-600/90 font-medium">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed text-[12px]">
                   {errorMsg.includes('403') ? (
                     <>
                        현재 미리보기 환경에서 "페이지 이동 방식" 로그인을 쓰려면 구글 보안 정책상 다음 도메인을 허용해야 합니다: <br/>
                        <strong className="select-all block mt-1 p-1 bg-white/50 rounded break-all">{window.location.origin}</strong>
                     </>
                   ) : (
                     <>
                        구글의 "화면 전체 페이지 이동 방식(Redirect)" 로그인은 정보 유출 방지를 위해 아이프레임 안에서 실행될 때 저장소 접근(Session Storage)을 차단합니다. <strong>반드시 새 창으로 열어서 테스트해주세요!</strong>
                     </>
                   )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        <p className="mt-8 text-[13px] text-slate-400">
          가입 시 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </p>
      </motion.div>
    </div>
  );
}
