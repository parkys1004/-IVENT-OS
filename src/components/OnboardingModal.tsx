import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  CalendarDays, 
  Music, 
  GraduationCap, 
  Camera, 
  Check, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useAuth, UserRole } from '../context/AuthContext';
import { supabase } from '../supabase';
import clsx from 'clsx';

interface OnboardingModalProps {
  isOpen: boolean;
}

const ROLES = [
  {
    id: 'participant',
    title: '참여자',
    description: '행사와 강습을 찾고 즐기고 싶어요',
    icon: User,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50 text-blue-600',
    darkColor: 'dark:bg-blue-500/10 dark:text-blue-400'
  },
  {
    id: 'host',
    title: '행사주최자',
    description: '댄스 파티, 워크숍, 대회를 주최해요',
    icon: CalendarDays,
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50 text-purple-600',
    darkColor: 'dark:bg-purple-500/10 dark:text-purple-400'
  },
  {
    id: 'dj',
    title: 'DJ',
    description: '멋진 음악으로 무대를 채우고 싶어요',
    icon: Music,
    color: 'bg-rose-500',
    lightColor: 'bg-rose-50 text-rose-600',
    darkColor: 'dark:bg-rose-500/10 dark:text-rose-400'
  },
  {
    id: 'instructor',
    title: '강사',
    description: '댄스 기술과 철학을 가르치고 싶어요',
    icon: GraduationCap,
    color: 'bg-amber-500',
    lightColor: 'bg-amber-50 text-amber-600',
    darkColor: 'dark:bg-amber-500/10 dark:text-amber-400'
  },
  {
    id: 'media',
    title: '포토 / 영상',
    description: '찰나의 순간을 영원히 기록해요',
    icon: Camera,
    color: 'bg-emerald-500',
    lightColor: 'bg-emerald-50 text-emerald-600',
    darkColor: 'dark:bg-emerald-500/10 dark:text-emerald-400'
  }
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen }) => {
  const { user, refreshProfile } = useAuth();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectRole = async () => {
    if (!selectedRole || !user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: selectedRole, is_approved: true })
        .eq('id', user.id);

      if (error) throw error;
      
      await refreshProfile();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden"
        >
          {/* Backdrop with animated background */}
          <div className="absolute inset-0 bg-white dark:bg-slate-950 overflow-hidden">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500 blur-[120px] animate-pulse"></div>
              <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-orange-500 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 mix-blend-overlay"></div>
          </div>

          <motion.div 
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            className="relative w-full max-w-4xl max-h-full overflow-y-auto no-scrollbar bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[40px] border border-white/20 dark:border-slate-800/50 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] p-8 sm:p-12"
          >
            <div className="text-center mb-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10, staggerChildren: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-full text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest mb-6"
              >
                <Sparkles className="w-3 h-3" />
                Welcome to Dancehive
              </motion.div>
              <h2 className="text-3xl sm:text-4xl font-[950] text-slate-900 dark:text-white tracking-tight mb-4 leading-tight">
                Dancehive에서 어떤 활동을 하실 건가요?
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-bold">
                선택하신 역할에 따라 맞춤형 대시보드와 기능이 제공됩니다.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {ROLES.map((role, idx) => (
                <motion.button
                  key={role.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                  onClick={() => setSelectedRole(role.id)}
                  className={clsx(
                    "relative group p-6 rounded-[32px] border-2 transition-all text-left flex flex-col h-full",
                    selectedRole === role.id 
                      ? "bg-white dark:bg-slate-800 border-indigo-600 dark:border-indigo-500 shadow-xl ring-4 ring-indigo-600/10" 
                      : "bg-slate-50/50 dark:bg-slate-900/50 border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800 shadow-sm"
                  )}
                >
                  <div className={clsx(
                    "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                    selectedRole === role.id ? role.color : role.lightColor + " " + role.darkColor
                  )}>
                    <role.icon className={clsx("w-6 h-6", selectedRole === role.id ? "text-white" : "")} />
                  </div>
                  
                  <h3 className="font-[950] text-lg text-slate-900 dark:text-white mb-2 leading-tight">
                    {role.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    {role.description}
                  </p>

                  <div className={clsx(
                    "absolute top-6 right-6 w-6 h-6 rounded-full flex items-center justify-center transition-all",
                    selectedRole === role.id ? "bg-indigo-600 text-white scale-100" : "bg-slate-200 dark:bg-slate-700 text-transparent scale-0"
                  )}>
                    <Check className="w-4 h-4" />
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button
                onClick={handleSelectRole}
                disabled={!selectedRole || isSubmitting}
                className={clsx(
                  "w-full sm:w-64 h-16 rounded-2xl font-[950] text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all",
                  selectedRole && !isSubmitting
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover:translate-y-[-2px] active:translate-y-[0px]"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    활동 시작하기
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-8">
              나중에 마이페이지에서 상세 프로필을 수정할 수 있습니다.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
