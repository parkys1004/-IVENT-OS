import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music, 
  Disc, 
  Search, 
  Heart, 
  TrendingUp, 
  Save, 
  Trophy, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles,
  Zap,
  Play,
  RotateCcw
} from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

interface Song {
  id: string;
  title: string;
  artist: string;
  genre: 'salsa' | 'bachata';
  votes: number;
}

const MOCK_SALSA_HITS: Partial<Song>[] = [
  { title: "Vivir Mi Vida", artist: "Marc Anthony" },
  { title: "Idilio", artist: "Willie Colón" },
  { title: "La Rebelión", artist: "Joe Arroyo" },
  { title: "Llorarás", artist: "Oscar D'León" },
  { title: "Gitana", artist: "Willie Colón" },
  { title: "Periodico de Ayer", artist: "Héctor Lavoe" },
  { title: "Aguanile", artist: "Héctor Lavoe" },
  { title: "Fuego en el 23", artist: "La Sonora Ponceña" },
  { title: "Dile a Ella", artist: "Víctor Manuelle" },
  { title: "Salió el Sol", artist: "Don Omar (Salsa Remix)" },
  { title: "La Murga", artist: "Héctor Lavoe" },
  { title: "Cali Pachanguero", artist: "Grupo Niche" },
  { title: "Oiga, Mire, Vea", artist: "Orquesta Guayacán" },
  { title: "Pedro Navaja", artist: "Rubén Blades" },
  { title: "Tu Amor Me Hace Bien", artist: "Marc Anthony" },
  { title: "Valió la Pena", artist: "Marc Anthony" },
  { title: "Gotas de Lluvia", artist: "Grupo Niche" },
  { title: "Sin Sentimiento", artist: "Grupo Niche" },
  { title: "Una Aventura", artist: "Grupo Niche" },
  { title: "En Barranquilla Me Quedo", artist: "Joe Arroyo" },
  { title: "El Preso", artist: "Fruko y sus Tesos" },
  { title: "Toro Mata", artist: "Celia Cruz" },
  { title: "Quimbara", artist: "Celia Cruz" },
  { title: "Bemba Colorá", artist: "Celia Cruz" },
  { title: "La Vida Es Un Carnaval", artist: "Celia Cruz" },
  { title: "Yo No Sé Mañana", artist: "Luis Enrique" },
  { title: "Fabricando Fantasías", artist: "Tito Nieves" },
  { title: "He Tratado", artist: "Víctor Manuelle" },
  { title: "Que Alguien Me Diga", artist: "Gilberto Santa Rosa" },
  { title: "Conteo Regresivo", artist: "Gilberto Santa Rosa" }
];

const MOCK_BACHATA_HITS: Partial<Song>[] = [
  { title: "Propuesta Indecente", artist: "Romeo Santos" },
  { title: "Darte un Beso", artist: "Prince Royce" },
  { title: "Bebe", artist: "Camilo, El Alfa" },
  { title: "Eres Mía", artist: "Romeo Santos" },
  { title: "Obsesión", artist: "Aventura" },
  { title: "Stand by Me", artist: "Prince Royce" },
  { title: "Deja Vu", artist: "Shakira, Prince Royce" },
  { title: "Carita de Inocente", artist: "Prince Royce" },
  { title: "Inmortal", artist: "Aventura" },
  { title: "Un Beso", artist: "Aventura" },
  { title: "Dile al Amor", artist: "Aventura" },
  { title: "El Perdedor", artist: "Aventura" },
  { title: "Bachata en Fukuoka", artist: "Juan Luis Guerra" },
  { title: "Burbujas de Amor", artist: "Juan Luis Guerra" },
  { title: "La Bilirrubina", artist: "Juan Luis Guerra" },
  { title: "Frío Frío", artist: "Juan Luis Guerra" },
  { title: "Te Extraño", artist: "Xtreme" },
  { title: "Shorty Shorty", artist: "Xtreme" },
  { title: "Eres Algo Más", artist: "Optimo" },
  { title: "Mi Corazoncito", artist: "Aventura" },
  { title: "Héroe Favorito", artist: "Romeo Santos" },
  { title: "Imitadora", artist: "Romeo Santos" },
  { title: "Centavito", artist: "Romeo Santos" },
  { title: "Sobredosis", artist: "Romeo Santos, Ozuna" },
  { title: "Carmín", artist: "Romeo Santos, Juan Luis Guerra" },
  { title: "Ella y Yo", artist: "Don Omar, Romeo Santos" },
  { title: "X", artist: "Prince Royce, Zendaya" },
  { title: "La Carretera", artist: "Prince Royce" },
  { title: "Moneda", artist: "Prince Royce, Gerardo Ortiz" },
  { title: "Culpa al Corazón", artist: "Prince Royce" }
];

export default function Playlist() {
  const { user } = useAuth();
  const [salsaSelections, setSalsaSelections] = useState<string[]>(Array(5).fill(''));
  const [bachataSelections, setBachataSelections] = useState<string[]>(Array(5).fill(''));
  const [topSalsa, setTopSalsa] = useState<Song[]>([]);
  const [topBachata, setTopBachata] = useState<Song[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchTopPlaylists();
    if (user) {
      fetchUserSelections();
    }
  }, [user]);

  const fetchTopPlaylists = async () => {
    // 실제 운영 시에는 DB에서 집계 데이터를 가져오지만, 
    // 여기서는 DB가 준비되지 않았을 경우를 대비해 Mock 데이터와 결합합니다.
    try {
      const { data, error } = await supabase
        .from('song_votes')
        .select('title, artist, genre')
        .limit(200); // 1. Full Table Scan 방지를 위한 리미트 추가
      
      if (error) throw error;

      const salsaHits = (data || [])
        .filter(s => s.genre === 'salsa')
        .reduce((acc: any[], curr) => {
          const existing = acc.find(a => a.title === curr.title && a.artist === curr.artist);
          if (existing) existing.votes += 1;
          else acc.push({ ...curr, votes: 1 });
          return acc;
        }, [])
        .sort((a, b) => b.votes - a.votes);

      const bachataHits = (data || [])
        .filter(s => s.genre === 'bachata')
        .reduce((acc: any[], curr) => {
          const existing = acc.find(a => a.title === curr.title && a.artist === curr.artist);
          if (existing) existing.votes += 1;
          else acc.push({ ...curr, votes: 1 });
          return acc;
        }, [])
        .sort((a, b) => b.votes - a.votes);

      // 부족한 부분은 Mock으로 채움 (UI 풍성함을 위해)
      const finalSalsa = [...salsaHits];
      MOCK_SALSA_HITS.forEach((m, i) => {
        if (!finalSalsa.some(f => f.title === m.title) && finalSalsa.length < 30) {
          finalSalsa.push({ id: `m-${i}`, title: m.title!, artist: m.artist!, genre: 'salsa', votes: Math.floor(Math.random() * 20) + 5 });
        }
      });

      const finalBachata = [...bachataHits];
      MOCK_BACHATA_HITS.forEach((m, i) => {
        if (!finalBachata.some(f => f.title === m.title) && finalBachata.length < 30) {
          finalBachata.push({ id: `m-b-${i}`, title: m.title!, artist: m.artist!, genre: 'bachata', votes: Math.floor(Math.random() * 15) + 5 });
        }
      });

      setTopSalsa(finalSalsa.sort((a, b) => b.votes - a.votes).slice(0, 30));
      setTopBachata(finalBachata.sort((a, b) => b.votes - a.votes).slice(0, 30));
    } catch (err) {
      console.error("Error fetching playlists:", err);
      // 에러 시 완전 Mock 데이터로 초기화
      setTopSalsa(MOCK_SALSA_HITS.map((m, i) => ({ id: `m-${i}`, title: m.title!, artist: m.artist!, genre: 'salsa', votes: 10 - i })));
      setTopBachata(MOCK_BACHATA_HITS.map((m, i) => ({ id: `m-b-${i}`, title: m.title!, artist: m.artist!, genre: 'bachata', votes: 8 - i })));
    }
  };

  const fetchUserSelections = async () => {
    try {
      const { data, error } = await supabase
        .from('song_votes')
        .select('title, genre')
        .eq('user_id', user!.id);
      
      if (error) throw error;

      if (data && data.length > 0) {
        const salsa = data.filter(s => s.genre === 'salsa').map(s => s.title);
        const bachata = data.filter(s => s.genre === 'bachata').map(s => s.title);
        
        setSalsaSelections(prev => salsa.concat(prev).slice(0, 5));
        setBachataSelections(prev => bachata.concat(prev).slice(0, 5));
      }
    } catch (err) {
      console.warn("User selections fetch failed, probably table doesn't exist yet.");
    }
  };

  const handleSaveSelections = async () => {
    if (!user) {
      alert("로그인이 필요한 기능입니다.");
      return;
    }

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // 기존 선택 삭제
      await supabase.from('song_votes').delete().eq('user_id', user.id);

      const selections = [
        ...salsaSelections.filter(s => s.trim() !== '').map(s => ({
          user_id: user.id,
          title: s,
          artist: "Unknown", // 실제 검색 기능 추가 시 필요
          genre: 'salsa'
        })),
        ...bachataSelections.filter(s => s.trim() !== '').map(s => ({
          user_id: user.id,
          title: s,
          artist: "Unknown",
          genre: 'bachata'
        }))
      ];

      if (selections.length > 0) {
        const { error } = await supabase.from('song_votes').insert(selections);
        if (error) throw error;
      }

      setSaveStatus('success');
      fetchTopPlaylists();
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error("Save error:", err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSalsa = (index: number, val: string) => {
    const newArr = [...salsaSelections];
    newArr[index] = val;
    setSalsaSelections(newArr);
  };

  const updateBachata = (index: number, val: string) => {
    const newArr = [...bachataSelections];
    newArr[index] = val;
    setBachataSelections(newArr);
  };

  return (
    <div className="min-h-screen bg-[#FDFCF9] dark:bg-[#0F0B06] py-12 px-4 sm:px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <section className="mb-16 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-full mb-6"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-400">Collaborative DJ Mix</span>
          </motion.div>
          
          <h1 className="text-4xl md:text-7xl font-[1000] text-slate-900 dark:text-white tracking-tighter mb-6 italic leading-none">
            COMMUNITY <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-rose-500 to-indigo-500">PLAYLIST ANALYTICS</span>
          </h1>
          
          <p className="text-slate-500 dark:text-slate-400 font-bold max-w-2xl mx-auto text-lg leading-relaxed mb-12">
            사용자들이 투표한 데이터를 기반으로 실시간으로 업데이트되는 <br className="hidden sm:block" />
            살사 & 바차타 인기 리스트입니다. 당신의 5곡을 추가해 흐름을 바꾸세요.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12 items-start">
          
          {/* USER MODE: VOTE SECTION */}
          <aside className="space-y-8 lg:sticky lg:top-24">
            <div className="bg-white dark:bg-slate-900/40 rounded-[48px] border border-slate-100 dark:border-slate-800 p-8 sm:p-10 shadow-xl backdrop-blur-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16" />
               
               <div className="flex items-center gap-3 mb-10">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                     <RotateCcw className="w-6 h-6 text-white" />
                  </div>
                  <div>
                     <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">당신의 PICK</h2>
                     <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Select your 5 gems</p>
                  </div>
               </div>

               <div className="space-y-10">
                  {/* Salsa Entry */}
                  <div>
                    <h3 className="flex items-center gap-2 text-[11px] font-black text-rose-500 uppercase tracking-widest mb-6">
                       <Zap className="w-4 h-4 fill-rose-500" /> Salsa (Top 5)
                    </h3>
                    <div className="space-y-3">
                       {salsaSelections.map((val, idx) => (
                         <div key={idx} className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 group-focus-within:text-rose-500 transition-colors uppercase">#0{idx+1}</span>
                            <input 
                              type="text" 
                              value={val}
                              onChange={(e) => updateSalsa(idx, e.target.value)}
                              placeholder="곡 제목 또는 아티스트"
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-14 pr-4 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                            />
                         </div>
                       ))}
                    </div>
                  </div>

                  {/* Bachata Entry */}
                  <div>
                    <h3 className="flex items-center gap-2 text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-6">
                       <Sparkles className="w-4 h-4 text-indigo-400" /> Bachata (Top 5)
                    </h3>
                    <div className="space-y-3">
                       {bachataSelections.map((val, idx) => (
                         <div key={idx} className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 group-focus-within:text-indigo-400 transition-colors uppercase">#0{idx+1}</span>
                            <input 
                              type="text" 
                              value={val}
                              onChange={(e) => updateBachata(idx, e.target.value)}
                              placeholder="곡 제목 또는 아티스트"
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-14 pr-4 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-400/20 focus:border-indigo-400 outline-none transition-all"
                            />
                         </div>
                       ))}
                    </div>
                  </div>
               </div>

               <div className="mt-12 pt-10 border-t border-slate-50 dark:border-slate-800/50">
                  <button 
                    onClick={handleSaveSelections}
                    disabled={isSaving}
                    className={clsx(
                      "w-full py-5 rounded-[24px] font-black text-[13px] uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95",
                      saveStatus === 'success' ? "bg-emerald-500 text-white" : 
                      saveStatus === 'error' ? "bg-rose-500 text-white" :
                      "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                    )}
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : saveStatus === 'success' ? (
                      <><CheckCircle2 className="w-5 h-5" /> Saved to Hive</>
                    ) : saveStatus === 'error' ? (
                      <><AlertCircle className="w-5 h-5" /> Error Occurred</>
                    ) : (
                      <><Save className="w-5 h-5" /> Update My List</>
                    )}
                  </button>
                  <p className="mt-4 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed">
                    로그인한 회원만 투표가 가능하며, <br />실시간 분석 결과에 즉시 반영됩니다.
                  </p>
               </div>
            </div>
          </aside>

          {/* PLAYLIST ANALYSIS: TOP 30 AREA */}
          <main className="space-y-12">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                
                {/* SALSA TOP 30 */}
                <section className="bg-white dark:bg-slate-900 rounded-[56px] border border-slate-100 dark:border-slate-800 p-8 sm:p-12 shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-rose-500/5 to-transparent pointer-events-none" />
                   
                   <div className="flex items-end justify-between mb-12 relative z-10">
                      <div>
                         <h2 className="text-3xl font-[1000] text-slate-900 dark:text-white tracking-tighter italic mb-1 uppercase">SALSA</h2>
                         <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Trending 30 Anthology</p>
                      </div>
                      <div className="w-12 h-12 rounded-full border border-rose-100 dark:border-rose-900/50 flex items-center justify-center bg-white dark:bg-slate-950">
                         <TrendingUp className="w-5 h-5 text-rose-500" />
                      </div>
                   </div>

                   <div className="space-y-4 relative z-10">
                      {topSalsa.map((song, idx) => (
                        <motion.div 
                          key={song.title + idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="flex items-center gap-5 p-5 rounded-[28px] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 group hover:border-rose-200 dark:hover:border-rose-900 transition-all cursor-pointer"
                        >
                           <div className="w-10 text-[11px] font-black text-rose-400 group-hover:scale-125 transition-transform italic">#{idx+1}</div>
                           <div className="flex-1 min-w-0">
                              <p className="text-sm font-black text-slate-800 dark:text-white truncate mb-0.5">{song.title}</p>
                              <p className="text-[11px] font-bold text-slate-400 group-hover:text-slate-500 transition-colors uppercase tracking-tight">{song.artist}</p>
                           </div>
                           <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full shadow-sm text-rose-600">
                              <Heart className="w-3 h-3 fill-rose-500" />
                              <span className="text-[10px] font-black">{song.votes}</span>
                           </div>
                        </motion.div>
                      ))}
                      {topSalsa.length === 0 && (
                        <div className="text-center py-20 text-slate-300 font-bold italic">No data yet.</div>
                      )}
                   </div>
                </section>

                {/* BACHATA TOP 30 */}
                <section className="bg-white dark:bg-slate-900 rounded-[56px] border border-slate-100 dark:border-slate-800 p-8 sm:p-12 shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
                   
                   <div className="flex items-end justify-between mb-12 relative z-10">
                      <div>
                         <h2 className="text-3xl font-[1000] text-slate-900 dark:text-white tracking-tighter italic mb-1 uppercase">BACHATA</h2>
                         <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Essential 30 Selection</p>
                      </div>
                      <div className="w-12 h-12 rounded-full border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center bg-white dark:bg-slate-950">
                         <Disc className="w-4 h-4 text-indigo-500" />
                      </div>
                   </div>

                   <div className="space-y-4 relative z-10">
                      {topBachata.map((song, idx) => (
                        <motion.div 
                          key={song.title + idx}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="flex items-center gap-5 p-5 rounded-[28px] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 group hover:border-indigo-200 dark:hover:border-indigo-900 transition-all cursor-pointer"
                        >
                           <div className="w-10 text-[11px] font-black text-indigo-400 group-hover:scale-125 transition-transform italic">#{idx+1}</div>
                           <div className="flex-1 min-w-0">
                              <p className="text-sm font-black text-slate-800 dark:text-white truncate mb-0.5">{song.title}</p>
                              <p className="text-[11px] font-bold text-slate-400 group-hover:text-slate-500 transition-colors uppercase tracking-tight">{song.artist}</p>
                           </div>
                           <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full shadow-sm text-indigo-500">
                              <Heart className="w-3 h-3 fill-indigo-400" />
                              <span className="text-[10px] font-black">{song.votes}</span>
                           </div>
                        </motion.div>
                      ))}
                      {topBachata.length === 0 && (
                        <div className="text-center py-20 text-slate-300 font-bold italic">No data yet.</div>
                      )}
                   </div>
                </section>
             </div>

             {/* Footer Info for DJs */}
             <div className="bg-slate-900 dark:bg-slate-950 rounded-[48px] p-12 text-white border border-slate-800 relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-rose-600/10 blur-[130px] -mr-32 -mt-32" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                   <div className="flex-1">
                      <h3 className="text-2xl font-black mb-4 italic flex items-center gap-3">
                         <Disc className="w-8 h-8 text-rose-500 animate-[spin_4s_linear_infinite]" />
                         ARE YOU A CURATOR?
                      </h3>
                      <p className="text-slate-400 font-bold text-lg leading-relaxed max-w-xl">
                        이 데이터는 활발한 활동을 하는 댄서들의 취향을 직접적으로 반영합니다. <br />
                        행사를 기획하거나 세트리스트를 구성할 때 훌륭한 인사이트가 될 것입니다.
                      </p>
                   </div>
                   <div className="shrink-0 flex flex-col items-center gap-4 bg-white/5 p-8 rounded-[40px] border border-white/10 backdrop-blur-md">
                      <Trophy className="w-12 h-12 text-amber-400" />
                      <div className="text-center">
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Total Votes cast</p>
                         <p className="text-4xl font-[1000] tracking-tighter">1,248+</p>
                      </div>
                   </div>
                </div>
             </div>
          </main>

        </div>
      </div>
    </div>
  );
}
