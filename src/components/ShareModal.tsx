import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Link as LinkIcon, 
  MessageCircle, 
  Facebook, 
  Twitter,
  CheckCircle2
} from 'lucide-react';
import clsx from 'clsx';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
   imageUrl?: string;   // ← 추가
  description?: string; // ← 추가
}
export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, title, url, imageUrl, description }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  const shareToTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareToKakao = () => {
    const Kakao = (window as any).Kakao;

    if (!Kakao) {
      console.error("Kakao SDK not loaded.");
      alert("카카오톡 공유 기능을 사용할 수 없습니다.");
      return;
    }

    // 1. 초기화
    if (!Kakao.isInitialized()) {
      const kakaoKey = import.meta.env.VITE_KAKAO_JS_KEY;
      if (!kakaoKey) {
        console.error("VITE_KAKAO_JS_KEY is not defined.");
        alert("카카오 앱 키 설정이 필요합니다.");
        return;
      }
      Kakao.init(kakaoKey);
    }

    // 2. 메시지 보내기
    try {
      Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: title, 
          description: description || '강습 공지', 
          imageUrl: imageUrl || 'https://raw.githubusercontent.com/parkys1004/img/main/dancehive/hivesns.png',
          link: {
            mobileWebUrl: url, 
            webUrl: url,
          },
        },
        buttons: [
          {
            title: '상세보기',
            link: {
              mobileWebUrl: url,
              webUrl: url,
            },
          },
        ],
      });
    } catch (error) {
      console.error("Kakao Share error:", error);
      // Kakao SDK error object inspection
      const errorMessage = (error as any)?.message || String(error);
      alert(`카카오톡 공유 중 오류가 발생했습니다: ${errorMessage}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-[950] text-slate-900 dark:text-white tracking-tight">공유하기</h3>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-8">
                <ShareButton 
                  label="카카오톡" 
                  icon={<MessageCircle className="w-6 h-6 fill-current" />} 
                  color="bg-[#FEE500] text-[#3A1D1D]"
                  onClick={shareToKakao}
                />
                <ShareButton 
                  label="페이스북" 
                  icon={<Facebook className="w-6 h-6 fill-current" />} 
                  color="bg-[#1877F2] text-white"
                  onClick={shareToFacebook}
                />
                <ShareButton 
                  label="트위터" 
                  icon={<Twitter className="w-6 h-6 fill-current" />} 
                  color="bg-black text-white"
                  onClick={shareToTwitter}
                />
                <ShareButton 
                  label="링크복사" 
                  icon={copied ? <CheckCircle2 className="w-6 h-6" /> : <LinkIcon className="w-6 h-6" />} 
                  color={copied ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}
                  onClick={handleCopyLink}
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">페이지 주소</p>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate tracking-tight">{url}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const ShareButton = ({ label, icon, color, onClick }: { label: string, icon: React.ReactNode, color: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-2 group"
  >
    <div className={clsx(
      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-active:scale-95 shadow-sm",
      color
    )}>
      {icon}
    </div>
    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{label}</span>
  </button>
);
