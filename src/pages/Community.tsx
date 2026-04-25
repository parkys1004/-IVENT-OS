import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Search, 
  Plus, 
  ChevronRight, 
  User, 
  Clock, 
  MessageCircle, 
  AlertCircle,
  Hash,
  HelpCircle,
  FileText,
  Filter,
  Star
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

type PostCategory = 'free' | 'inquiry' | 'review';

interface Post {
  id: string;
  title: string;
  content: string;
  category: PostCategory;
  author_id: string;
  created_at: string;
  author_name?: string;
  author_photo?: string;
  comment_count?: number;
  rating?: number; // For reviews
  event_title?: string; // For reviews
  event_id?: string; // For reviews
  is_private?: boolean;
}

import { awardPoints } from '../lib/points';

export default function Community() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<PostCategory>('review');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  
  // New Post State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(true); // Default to true for inquiries
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [activeCategory]);

  const fetchPosts = async (searchOverride?: string) => {
    setLoading(true);
    const currentSearch = searchOverride !== undefined ? searchOverride : searchQuery;
    
    try {
      if (activeCategory === 'review') {
        let query = supabase
          .from('event_reviews')
          .select('*, author:profiles(display_name, photo_url)')
          .order('created_at', { ascending: false });

        if (currentSearch) {
          query = query.or(`content.ilike.%${currentSearch}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Fetch event titles manually since multiple tables are involved and FKs might be missing
        const reviewData = data || [];
        const eventIds = [...new Set(reviewData.map(r => r.event_id))];
        
        let eventTitles: Record<string, string> = {};
        
        if (eventIds.length > 0) {
          const [partiesRes, lessonsRes] = await Promise.all([
            supabase.from('parties').select('id, title').in('id', eventIds),
            supabase.from('lessons').select('id, title').in('id', eventIds)
          ]);

          if (partiesRes.data) {
            partiesRes.data.forEach(p => { eventTitles[p.id] = p.title; });
          }
          if (lessonsRes.data) {
            lessonsRes.data.forEach(l => { eventTitles[l.id] = l.title; });
          }
        }

        setPosts(reviewData.map(r => ({
          id: r.id,
          title: `[${eventTitles[r.event_id] || '행사'}] 참여 후기`,
          content: r.content,
          category: 'review',
          author_id: r.author_id,
          created_at: r.created_at,
          author_name: r.author?.display_name || '알 수 없는 사용자',
          author_photo: r.author?.photo_url || '',
          rating: r.rating,
          event_title: eventTitles[r.event_id],
          event_id: r.event_id,
          comment_count: 0
        })));
      } else {
        let query = supabase
          .from('community_posts')
          .select('*, author:profiles(display_name, photo_url)')
          .eq('category', activeCategory)
          .order('created_at', { ascending: false });

        if (currentSearch) {
          query = query.or(`title.ilike.%${currentSearch}%,content.ilike.%${currentSearch}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Fetch comment counts for these posts
        const postIds = (data || []).map(p => p.id);
        let counts: Record<string, number> = {};
        
        if (postIds.length > 0) {
          const { data: countData } = await supabase
            .from('community_comments')
            .select('post_id')
            .in('post_id', postIds);
          
          if (countData) {
            countData.forEach(c => {
              counts[c.post_id] = (counts[c.post_id] || 0) + 1;
            });
          }
        }

        setPosts((data || []).map(post => ({
          ...post,
          author_name: post.author?.display_name || '알 수 없는 사용자',
          author_photo: post.author?.photo_url || '',
          comment_count: counts[post.id] || 0
        })));
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return navigate('/login');

    if (activeCategory === 'review') {
      alert('행사 리뷰는 각 행사 상세 페이지에서 작성하실 수 있습니다.');
      setIsWriteModalOpen(false);
      return;
    }

    if (!newTitle.trim() || !newContent.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('community_posts').insert({
        title: newTitle,
        content: newContent,
        category: activeCategory,
        author_id: user.id,
        is_private: activeCategory === 'inquiry' ? isPrivate : false
      });

      if (error) throw error;

      // Award points for post
      await awardPoints(user.id, 100, '커뮤니티 게시글 작성 보너스', { category: activeCategory });

      alert('성공적으로 등록되었습니다!');
      setNewTitle('');
      setNewContent('');
      setSearchQuery(''); 
      setIsWriteModalOpen(false);
      
      fetchPosts('');
    } catch (error: any) {
      alert(`오류: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      {/* Header Section */}
      <div className="mb-6 md:mb-10 text-center relative pt-8 md:pt-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <h1 className="text-3xl md:text-4xl font-[950] text-slate-900 dark:text-white mb-2 md:mb-4 tracking-tighter">
          Dancehive Community
        </h1>
        <p className="text-slate-500 font-medium text-sm md:text-lg italic px-4">
          댄서들의 자유로운 대화와 소통의 공간
        </p>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-[20px] border border-slate-200 dark:border-slate-800 self-stretch md:self-start overflow-x-auto no-scrollbar scroll-smooth">
          <button
            onClick={() => setActiveCategory('review')}
            className={clsx(
              "px-4 md:px-6 py-2.5 rounded-2xl text-[13px] md:text-sm font-black transition-all flex items-center gap-2 shrink-0 whitespace-nowrap",
              activeCategory === 'review' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Star className="w-3.5 h-3.5 md:w-4 md:h-4" /> 행사리뷰
          </button>
          <button
            onClick={() => setActiveCategory('free')}
            className={clsx(
              "px-4 md:px-6 py-2.5 rounded-2xl text-[13px] md:text-sm font-black transition-all flex items-center gap-2 shrink-0 whitespace-nowrap",
              activeCategory === 'free' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4" /> 자유게시판
          </button>
          <button
            onClick={() => setActiveCategory('inquiry')}
            className={clsx(
              "px-4 md:px-6 py-2.5 rounded-2xl text-[13px] md:text-sm font-black transition-all flex items-center gap-2 shrink-0 whitespace-nowrap",
              activeCategory === 'inquiry' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <HelpCircle className="w-3.5 h-3.5 md:w-4 md:h-4" /> 문의게시판
          </button>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={activeCategory === 'review' ? "리뷰 검색..." : "게시글 검색..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchPosts()}
              className="w-full md:w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 md:py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all text-sm"
            />
          </div>
          {activeCategory !== 'review' && (
            <button 
              onClick={() => setIsWriteModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 md:px-6 py-2.5 md:py-3 rounded-2xl font-black text-[13px] md:text-sm shadow-xl shadow-indigo-600/20 flex items-center gap-2 shrink-0 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> <span className="hidden xs:inline">글쓰기</span>
            </button>
          )}
        </div>
      </div>

      {/* Posts List */}
      <div className="bg-white dark:bg-slate-900/50 rounded-3xl md:rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-bold italic">Loading posts...</p>
          </div>
        ) : posts.length > 0 ? (
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {posts.map((post) => (
              <motion.div 
                key={post.id} 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => {
                  if (post.category === 'review' && post.event_id) {
                    navigate(`/event/${post.event_id}`);
                  } else {
                    navigate(`/community/${post.id}`);
                  }
                }}
                className="group p-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 mt-0.5 shadow-sm">
                    {post.author_photo ? (
                      <img src={post.author_photo} alt={post.author_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-1.5 md:mb-1">
                      <span className={clsx(
                        "text-[9px] md:text-[10px] font-black uppercase tracking-wider px-1.5 md:px-2 py-0.5 rounded-full shadow-sm",
                        post.category === 'review' ? "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                      )}>
                        {post.category === 'free' ? '자유' : post.category === 'inquiry' ? '문의' : '리뷰'}
                      </span>
                      {post.rating && (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={clsx("w-2.5 h-2.5 md:w-3 md:h-3", s <= post.rating ? "text-amber-400 fill-current" : "text-slate-200")} />
                          ))}
                        </div>
                      )}
                      <span className="text-[10px] md:text-xs font-bold text-slate-400">
                        {post.author_name} • {format(new Date(post.created_at), 'yy.MM.dd', { locale: ko })}
                      </span>
                    </div>
                    <h3 className="text-base md:text-lg font-black text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors mb-1.5 md:mb-2 truncate flex items-center gap-1.5">
                       {post.is_private && (post.author_id !== user?.id && profile?.role !== 'admin') ? (
                         <>
                           <Hash className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" />
                           비밀글입니다.
                         </>
                       ) : (
                         <>
                           {post.is_private && <Hash className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-600" />}
                           {post.title}
                         </>
                       )}
                     </h3>
                     <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm line-clamp-2 leading-relaxed">
                       {post.is_private && (post.author_id !== user?.id && profile?.role !== 'admin') ? '작성자와 관리자만 볼 수 있는 비밀글입니다.' : post.content}
                     </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0 self-center">
                    {post.category !== 'review' && (
                      <div className="bg-slate-100 dark:bg-slate-800 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl flex items-center gap-1.5 md:gap-2 text-slate-500">
                        <MessageCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        <span className="text-[10px] md:text-xs font-black">{post.comment_count}</span>
                      </div>
                    )}
                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-slate-200 group-hover:text-slate-400 transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-20 text-center">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">게시글이 없습니다</h3>
            <p className="text-slate-400 max-w-sm">첫 번째 주인공이 되어 재미있는 이야기를 나눠보세요!</p>
          </div>
        )}
      </div>

      {/* Write Modal */}
      <AnimatePresence>
        {isWriteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsWriteModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[24px] md:rounded-[32px] p-5 md:p-8 shadow-2xl relative z-10 border border-slate-100 dark:border-slate-800 m-4 overflow-y-auto max-h-[90vh]"
            >
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-4 md:mb-6 flex items-center gap-3">
                <Plus className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" /> 
                {activeCategory === 'free' ? '게시글 작성' : 
                 activeCategory === 'inquiry' ? '문의글 작성' : '자유게시판 글쓰기'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Title</label>
                  <input 
                    type="text" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="제목을 입력하세요"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm md:text-base"
                    required
                  />
                </div>
                
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Content</label>
                  <textarea 
                    rows={6}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="내용을 입력하세요..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none text-sm md:text-base"
                    required
                  />
                </div>

                {activeCategory === 'inquiry' && (
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-3 md:p-4 rounded-xl md:rounded-2xl">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className={clsx(
                        "w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center transition-colors shadow-sm",
                        isPrivate ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                      )}>
                        {isPrivate ? <Hash className="w-4 h-4 md:w-5 md:h-5" /> : <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 dark:text-white text-[13px] md:text-sm">비밀글 설정</p>
                        <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {isPrivate ? 'ADMIN & AUTHOR ONLY' : 'PUBLIC VIEW'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPrivate(!isPrivate)}
                      className={clsx(
                        "w-12 h-7 md:w-14 md:h-8 rounded-full relative transition-colors duration-300 outline-none shadow-inner",
                        isPrivate ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                      )}
                    >
                      <div className={clsx(
                        "absolute top-1 w-5 h-5 md:w-6 md:h-6 bg-white rounded-full transition-all duration-300 shadow-sm",
                        isPrivate ? "left-6 md:left-7" : "left-1"
                      )} />
                    </button>
                  </div>
                )}

                <div className="flex gap-3 md:gap-4 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsWriteModalOpen(false)}
                    className="flex-1 py-3 md:py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-xl md:rounded-2xl hover:bg-slate-200 transition-all text-sm"
                  >
                    취소
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] py-3 md:py-4 bg-indigo-600 text-white font-black rounded-xl md:rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50 text-sm"
                  >
                    {isSubmitting ? '작성 중...' : '게시글 올리기'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
