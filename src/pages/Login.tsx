import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { User, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'user' | 'host' | null>(null);

  // If user is already logged in, redirect them to dashboard
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    if (!selectedRole) {
      alert("로그인 전 역할을 선택해주세요!");
      return;
    }
    setLoading(true);
    // Intent stored for AuthContext
    window.sessionStorage.setItem('intendedRole', selectedRole);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (error) {
      alert('로그인 처리 중 문제가 발생했습니다. 브라우저 팝업 차단을 확인해주세요.');
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
                  alert("로그인 전 역할을 선택해주세요!");
                  return;
                }
                alert("카카오 로그인을 위해서는 카카오 디벨로퍼스(Kakao Developers) 애플리케이션 등록 및 Firebase OIDC 연동 등 관리자 설정이 필요합니다. 연동 설정 안내가 필요하시면 말씀해주세요.");
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

        <p className="mt-8 text-[13px] text-slate-400">
          가입 시 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </p>
      </motion.div>
    </div>
  );
}
