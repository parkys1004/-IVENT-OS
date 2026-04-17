import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn, LogOut, Plus, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { loginWithGoogle, logout, db } from '../firebase';
import { setDoc, doc } from 'firebase/firestore';

export default function Navbar() {
  const { user, profile } = useAuth();

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-12 xl:px-20">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <span className="font-bold text-xl text-indigo-400 tracking-tight">◈</span>
              <span className="font-extrabold text-xl tracking-tight text-slate-800 hidden sm:block">IVENT OS</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {(profile?.role === 'host' || profile?.role === 'admin') && (
                  <Link
                    to="/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-[13px] font-bold rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    행사 만들기
                  </Link>
                )}
                
                <span className="text-sm font-medium text-slate-800 flex items-center gap-3">
                  <div className="hidden md:flex flex-col text-right">
                    <span>{profile?.displayName || user.email?.split('@')[0]}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                      {profile?.role === 'admin' ? '관리자' : profile?.role === 'host' ? '주최자' : '참여자'}
                    </span>
                  </div>
                  <div className="w-8 h-8 bg-slate-200 rounded-full border border-slate-200 shrink-0 shadow-sm" style={user.photoURL ? {backgroundImage: `url(${user.photoURL})`, backgroundSize: 'cover'} : {}}></div>
                </span>
                
                <button
                  onClick={logout}
                  className="inline-flex items-center p-2 text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 rounded-lg"
                  title="로그아웃"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-[13px] font-bold rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <LogIn className="h-4 w-4 mr-2" />
                로그인 / 회원가입
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
