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
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

type PostCategory = 'free' | 'inquiry';

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
}

export default function Community() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<PostCategory>('free');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  
  // New Post State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [activeCategory]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('community_posts')
        .select(`
          *,
          author:profiles(display_name, photo_url)
        `)
        .eq('category', activeCategory)
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedPosts = (data || []).map(post => ({
        ...post,
        author_name: post.author?.display_name || '알 수 없는 사용자',
        author_photo: post.author?.photo_url || '',
        comment_count: 0 // In a real app, you'd fetch this count
      }));

      setPosts(mappedPosts);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (!newTitle.trim() || !newContent.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('community_posts')
        .insert({
          title: newTitle,
          content: newContent,
          category: activeCategory,
          author_id: user.id
        });

      if (error) {
        console.error("Supabase error:", error);
        alert(`저장 실패: ${error.message}`);
        throw error;
      }

      setNewTitle('');
      setNewContent('');
      setIsWriteModalOpen(false);
      fetchPosts();
    } catch (error) {
      console.error("Error creating post:", error);
      alert('게시글 작성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pb-20">
      {/* Header Section */}
      <div className="mb-10 text-center relative pt-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <h1 className="text-4xl font-[950] text-slate-900 dark:text-white mb-4 tracking-tighter">
          Dancehive Community
        </h1>
        <p className="text-slate-500 font-medium text-lg italic">
          댄서들의 자유로운 대화와 소통의 공간
        </p>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-[20px] border border-slate-200 dark:border-slate-800 self-start">
          <button
            onClick={() => setActiveCategory('free')}
            className={clsx(
              "px-6 py-2.5 rounded-2xl text-sm font-black transition-all flex items-center gap-2",
              activeCategory === 'free' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-md" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <MessageSquare className="w-4 h-4" /> 자유게시판
          </button>
          <button
            onClick={() => setActiveCategory('inquiry')}
            className={clsx(
              "px-6 py-2.5 rounded-2xl text-sm font-black transition-all flex items-center gap-2",
              activeCategory === 'inquiry' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-md" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <HelpCircle className="w-4 h-4" /> 문의게시판
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="게시글 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchPosts()}
              className="w-full md:w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all"
            />
          </div>
          <button 
            onClick={() => setIsWriteModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 flex items-center gap-2 shrink-0 transition-all hover:scale-105"
          >
            <Plus className="w-4.5 h-4.5" /> 글쓰기
          </button>
        </div>
      </div>

      {/* Posts List */}
      <div className="bg-white dark:bg-slate-900/50 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
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
                className="group p-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                    {post.author_photo ? (
                      <img src={post.author_photo} alt={post.author_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-full">
                        {post.category}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        {post.author_name} • {format(new Date(post.created_at), 'yyyy.MM.dd', { locale: ko })}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors mb-2 truncate">
                      {post.title}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 leading-relaxed">
                      {post.content}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 text-slate-500">
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-xs font-black">{post.comment_count}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-slate-400 transition-colors" />
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
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[32px] p-8 shadow-2xl relative z-10 border border-slate-100 dark:border-slate-800"
            >
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                <Plus className="w-6 h-6 text-indigo-600" /> 
                {activeCategory === 'free' ? '게시글 작성' : '문의글 작성'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Title</label>
                  <input 
                    type="text" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="제목을 입력하세요"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Content</label>
                  <textarea 
                    rows={8}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="내용을 입력하세요..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                    required
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsWriteModalOpen(false)}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    취소
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {isSubmitting ? '작성 중...' : '게시글 올리기'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Temporary Supabase Helper */}
      <div className="mt-20 p-8 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-[32px] flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
        <div className="space-y-2">
          <h4 className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase tracking-widest">게시판이 동작하려면 DB 설정이 필요합니다.</h4>
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed font-medium">
            Supabase SQL Editor에서 하단의 테이블을 생성해 주세요.<br/>
            <strong>`community_posts`</strong> (id, title, content, category, author_id, created_at)
          </p>
        </div>
      </div>
    </div>
  );
}
