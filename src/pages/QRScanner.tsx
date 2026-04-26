import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { 
  Camera, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, X, 
  MapPin, CalendarDays, User, QrCode, ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ParticipantInfo {
  registration_id: string;
  user_name: string;
  user_email: string;
  event_title: string;
  event_date: string;
  status: string;
  payment_status: string;
}

export default function QRScanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState<ParticipantInfo | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [lastScannedText, setLastScannedText] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scannerRef.current.render(onScanSuccess, (err) => {
          // Log errors for debugging purposes but don't show to UI
          console.debug("Scanner error:", err);
      });
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear scanner:", error);
        });
        scannerRef.current = null;
      }
    };
  }, [isScanning]);

  async function onScanSuccess(decodedText: string) {
    if (loading) return;
    
    setLoading(true);
    setIsScanning(false);
    
    if (scannerRef.current) {
      await scannerRef.current.clear();
      scannerRef.current = null;
    }

    try {
      setLastScannedText(decodedText);
      console.log("Scanning decoded text:", decodedText);
      // 1. Fetch registration details
      const { data: reg, error: regError } = await supabase
        .from('event_registrations')
        .select(`
          id,
          status,
          payment_status,
          profiles (full_name, email),
          events (title, date, location_name, host_id)
        `)
        .eq('id', decodedText)
        .single();

      if (regError) {
        console.error("Supabase query error:", regError);
        setErrorStatus(`유효하지 않은 티켓입니다. (DB 오류: ${regError.message})`);
        setLoading(false);
        return;
      }

      if (!reg) {
        console.log("No registration found for ID:", decodedText);
        setErrorStatus("유효하지 않은 티켓입니다. (ID를 찾을 수 없음)");
        setLoading(false);
        return;
      }

      // 2. Security Check: Is the scanner the host? (Simplified for now, add host check logic if needed)
      // if (reg.events.host_id !== user?.id) { ... }

      const info: ParticipantInfo = {
        registration_id: reg.id,
        user_name: (reg.profiles as any).full_name,
        user_email: (reg.profiles as any).email,
        event_title: (reg.events as any).title,
        event_date: (reg.events as any).date,
        status: (reg as any).status,
        payment_status: (reg as any).payment_status
      };

      setScanResult(info);

      // 3. Automatically mark as Checked In if it's confirmed
      if (reg.status === 'confirmed') {
        const { error: updateError } = await supabase
          .from('event_registrations')
          .update({ status: 'checked_in' })
          .eq('id', decodedText);
        
        if (updateError) console.error("Check-in update failed", updateError);
      } else if (reg.status === 'checked_in') {
        setErrorStatus("이미 입장 처리된 티켓입니다.");
      }

    } catch (err) {
      setErrorStatus("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function onScanFailure(error: any) {
    // Console suppression for scanning noise
  }

  const resetScanner = () => {
    setScanResult(null);
    setErrorStatus(null);
    setIsScanning(true);
  };

  return (
    <div className="fixed inset-0 bg-slate-950 z-[200] flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-slate-900 shadow-xl border-b border-slate-800">
        <button onClick={() => navigate(-1)} className="p-2 text-white/70 hover:text-white bg-slate-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-white font-[1000] text-lg uppercase tracking-tighter flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-400" />
            Entry Scanner
          </h2>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Host Mode</span>
        </div>
        <div className="w-9 h-9 bg-indigo-600/20 rounded-full flex items-center justify-center border border-indigo-500/20">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto no-scrollbar">
        
        <AnimatePresence mode="wait">
          {isScanning ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col gap-6"
            >
              <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-indigo-600/10 rounded-3xl flex items-center justify-center mx-auto mb-2 border border-indigo-500/10">
                  <QrCode className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-xl font-black text-white">QR 티켓 스캔</h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                  참가자의 모바일 화면에 표시된 <br/>
                  <span className="text-indigo-400 font-bold">Quick Pass QR</span>을 사각형 안으로 위치시켜주세요.
                </p>
              </div>

              {/* QR Reader Area */}
              <div className="relative aspect-square w-full max-w-[350px] mx-auto bg-slate-900 rounded-[2.5rem] border-4 border-slate-800 overflow-hidden shadow-2xl">
                <div id="qr-reader" className="w-full h-full [&_video]:object-cover overflow-hidden" />
                
                {/* Decorative scanning animation overlay */}
                <div className="absolute inset-x-8 top-1/2 h-1 bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,1)] animate-scan z-10" />
                
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-8 border-l-8 border-indigo-500 rounded-tl-[1rem] m-8" />
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-8 border-r-8 border-indigo-500 rounded-tr-[1rem] m-8" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-8 border-l-8 border-indigo-500 rounded-bl-[1rem] m-8" />
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-8 border-r-8 border-indigo-500 rounded-br-[1rem] m-8" />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col pt-4"
            >
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                  <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-white font-black uppercase tracking-widest text-xs">Processing Ticket...</p>
                </div>
              ) : scanResult ? (
                <div className="space-y-6">
                  {/* Status Card */}
                  <div className={clsx(
                    "rounded-[2.5rem] p-8 text-center shadow-2xl border-4",
                    scanResult.status === 'checked_in' || scanResult.status === 'confirmed' 
                      ? "bg-emerald-500/10 border-emerald-500/20" 
                      : "bg-red-500/10 border-red-500/20"
                  )}>
                    {scanResult.status === 'confirmed' || scanResult.status === 'checked_in' ? (
                      <>
                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30">
                          <CheckCircle2 className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-3xl font-[1000] text-emerald-400 mb-2 tracking-tighter">SUCCESS</h3>
                        <p className="text-emerald-500/80 font-black text-sm uppercase tracking-widest">
                          입장이 승인되었습니다
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-500/30">
                          <AlertCircle className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-3xl font-[1000] text-red-400 mb-2 tracking-tighter">INVALID</h3>
                        <p className="text-red-500/80 font-black text-sm uppercase tracking-widest">
                          {errorStatus || "확인이 필요한 티켓입니다"}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Participant Info */}
                  <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center">
                        <User className="w-7 h-7 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Participant</p>
                        <h4 className="text-2xl font-black text-white">{scanResult.user_name}</h4>
                        <p className="text-xs text-slate-400 font-medium">{scanResult.user_email}</p>
                      </div>
                    </div>

                    <div className="h-px bg-slate-800 w-full" />

                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-white">
                        <CalendarDays className="w-5 h-5 text-indigo-400" />
                        <span className="font-bold">{scanResult.event_title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-400">
                        <MapPin className="w-5 h-5" />
                        <span className="text-sm font-medium">행사 당일: {format(new Date(scanResult.event_date), 'yyyy년 MM월 dd일')}</span>
                      </div>
                    </div>
                  </div>

                  {errorStatus && (
                    <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-400">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p className="text-xs font-bold">{errorStatus}</p>
                    </div>
                  )}

                  <button 
                    onClick={resetScanner}
                    className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black text-lg uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl shadow-indigo-600/30 active:scale-95 transition-all mt-6"
                  >
                    <RefreshCw className="w-6 h-6" />
                    다음 스캔 계속하기
                  </button>
                </div>
              ) : (
                <div className="text-center py-20 text-white">
                   <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                   <h3 className="text-xl font-black mb-2 uppercase tracking-tight">{errorStatus || "오류 발생"}</h3>
                   <p className="text-slate-500 text-sm font-bold mb-8">티켓 정보를 확인할 수 없습니다. 스캔한 값: {lastScannedText || "알 수 없음"}</p>
                   <button 
                    onClick={resetScanner}
                    className="px-8 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest"
                  >
                    다시 시도
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-120px) scaleX(1); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(120px) scaleX(1); opacity: 0; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
        #qr-reader__status_span { display: none !important; }
        #qr-reader__dashboard { background: transparent !important; border: none !important; color: white !important; padding: 20px 0 !important; }
        #qr-reader__dashboard_section_csr button { 
          background: #4f46e5 !important; 
          border: none !important; 
          border-radius: 12px !important; 
          color: white !important; 
          padding: 10px 20px !important; 
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          font-size: 12px !important;
        }
        select { background: #1e293b !important; color: white !important; border: 1px solid #334155 !important; padding: 8px !important; border-radius: 8px !important; margin-bottom: 20px !important; }
      `}</style>
    </div>
  );
}
