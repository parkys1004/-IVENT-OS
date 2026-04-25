import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { 
  MessageSquare, 
  Trash2, 
  Search, 
  Filter, 
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Clock,
  User,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  author_id: string;
  created_at: string;
  author: {
    display_name: string;
    photo_url: string;
  };
  is_private: boolean;
  comments_count?: { count: number }[];
}

export const CommunityTab: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'free' | 'inquiry'>('all');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*, author:profiles(display_name, photo_url)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDeletePost = async (id: string) => {
    if (!window.confirm('정말 이 게시글을 삭제하시겠습니까? 관련 댓글도 모두 삭제될 수 있습니다.')) return;
    
    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setPosts(posts.filter(p => p.id !== id));
      if (selectedPost?.id === id) setSelectedPost(null);
      alert('게시글이 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.author?.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || post.category === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-6">
      {/* Header Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-bl-[20px]">
            <MessageSquare className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-sm font-bold text-slate-400 mb-1">전체 게시글</p>
          <h3 className="text-3xl font-[950] text-slate-900 dark:text-white">{posts.length}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <p className="text-sm font-bold text-slate-400 mb-1">문의게시판</p>
          <h3 className="text-3xl font-[950] text-slate-900 dark:text-white">
            {posts.filter(p => p.category === 'inquiry').length}
          </h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <p className="text-sm font-bold text-slate-400 mb-1">비밀글</p>
          <h3 className="text-3xl font-[950] text-slate-900 dark:text-white">
            {posts.filter(p => p.is_private).length}
          </h3>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full lg:w-auto">
          {(['all', 'free', 'inquiry'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                "px-6 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest flex-1 lg:flex-none",
                activeTab === tab 
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              )}
            >
              {tab === 'all' ? '전체' : tab === 'free' ? '자유' : '문의'}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="제목, 내용, 작성자 검색..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pl-11 pr-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 align-start">
        {/* Post List */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="p-20 text-center">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400 font-bold">로딩 중...</p>
            </div>
          ) : filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <div 
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className={clsx(
                  "group p-6 rounded-[32px] border transition-all cursor-pointer relative overflow-hidden",
                  selectedPost?.id === post.id 
                    ? "bg-indigo-50/50 dark:bg-indigo-500/5 border-indigo-200 dark:border-indigo-500/30 ring-2 ring-indigo-600/10" 
                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={clsx(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                        post.category === 'inquiry' ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                      )}>
                        {post.category === 'free' ? '자유' : '문의'}
                      </span>
                      {post.is_private && <Hash className="w-3 h-3 text-indigo-500" />}
                      <span className="text-[10px] text-slate-400 font-bold">
                        {format(new Date(post.created_at), 'yyyy.MM.dd', { locale: ko })}
                      </span>
                    </div>
                    <h4 className="font-[950] text-slate-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors mb-1">
                      {post.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 font-medium italic">
                      {post.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-900 dark:text-white">{post.author?.display_name || '사용자'}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">작성자</p>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                      {post.author?.photo_url ? (
                        <img src={post.author.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900/10 p-20 rounded-[32px] border-2 border-dashed border-slate-100 dark:border-slate-800 text-center">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 font-bold">검색 결과가 없습니다.</p>
            </div>
          )}
        </div>

        {/* Selected Post Detail Panel */}
        <div className="sticky top-0">
          <AnimatePresence mode="wait">
            {selectedPost ? (
              <motion.div
                key={selectedPost.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 p-8 shadow-xl"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-[950] text-slate-900 dark:text-white tracking-tight">Post Detail</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => window.open(`/community/post/${selectedPost.id}`, '_blank')}
                      className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeletePost(selectedPost.id)}
                      className="p-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-400 hover:text-rose-600 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={clsx(
                        "text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full",
                        selectedPost.category === 'inquiry' ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600"
                      )}>
                        {selectedPost.category.toUpperCase()}
                      </span>
                      {selectedPost.is_private && <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">PRIVATE</span>}
                    </div>
                    <h4 className="text-lg font-[950] text-slate-900 dark:text-white leading-tight">
                      {selectedPost.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden">
                       {selectedPost.author?.photo_url && <img src={selectedPost.author.photo_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{selectedPost.author?.display_name || 'Anonymous'}</p>
                      <p className="text-[9px] text-slate-400 font-bold">{selectedPost.author_id}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl min-h-[150px] max-h-[300px] overflow-y-auto no-scrollbar font-medium text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                    {selectedPost.content}
                  </div>

                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {format(new Date(selectedPost.created_at), 'yyyy-MM-dd HH:mm:ss')}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-[32px] border-2 border-dashed border-slate-100 dark:border-slate-800 h-[400px] flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-[24px] flex items-center justify-center shadow-sm mb-4">
                  <ChevronRight className="w-8 h-8 text-slate-200" />
                </div>
                <h4 className="text-slate-400 font-black mb-1 italic">선택된 게시글이 없습니다</h4>
                <p className="text-xs text-slate-300 font-bold">목록에서 게시글을 클릭하여 상세 정보를 확인하세요.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
