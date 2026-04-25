import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { 
  User, 
  Clock, 
  ChevronLeft, 
  Send, 
  Trash2, 
  AlertCircle,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import clsx from 'clsx';

interface Comment {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  author: {
    display_name: string;
    photo_url: string;
  };
}

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
  is_private?: boolean;
}

import { awardPoints } from '../lib/points';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPostAndComments();
    }
  }, [id]);

  const fetchPostAndComments = async () => {
    setLoading(true);
    try {
      // Fetch Post
      const { data: postData, error: postError } = await supabase
        .from('community_posts')
        .select('*, author:profiles(display_name, photo_url)')
        .eq('id', id)
        .single();

      if (postError) throw postError;
      setPost(postData);

      // Fetch Comments
      const { data: commentData, error: commentError } = await supabase
        .from('community_comments')
        .select('*, author:profiles(display_name, photo_url)')
        .eq('post_id', id)
        .order('created_at', { ascending: true });

      if (commentError) {
        console.error("Error fetching comments:", commentError);
        // Table might not exist yet, we'll handle this gracefully
      } else {
        setComments(commentData || []);
      }
    } catch (error) {
      console.error("Error loading post:", error);
      navigate('/community');
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('community_comments')
        .insert({
          post_id: id,
          author_id: user.id,
          content: newComment
        });

      if (error) throw error;
      
      // Award points for comment
      await awardPoints(user.id, 20, '커뮤니티 댓글 작성 보너스', { post_id: id });

      setNewComment('');
      fetchPostAndComments();
    } catch (error) {
      console.error("Error posting comment:", error);
      alert('댓글 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', id);
      if (error) throw error;
      navigate('/community');
    } catch (error) {
      alert('삭제 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!post) return null;
  
  // Is this post private and the current user is not the author/admin?
  const isAccessRestricted = post.is_private && user?.id !== post.author_id && profile?.role !== 'admin';
  const displayTitle = isAccessRestricted ? '비밀글입니다.' : post.title;
  const displayContent = isAccessRestricted ? '작성자와 관리자만 볼 수 있는 비밀글입니다.' : post.content;

  return (
    <div className="w-full max-w-[1400px] mx-auto px-2 sm:px-4 lg:px-8 pb-20">
      <button 
        onClick={() => navigate('/community')}
        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-bold mb-8"
      >
        <ChevronLeft className="w-5 h-5" /> 목록으로 돌아가기
      </button>

      {/* Post Header */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] p-4 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-sm mb-8">
        <div className="flex items-center gap-3 mb-6">
          <span className={clsx(
            "text-[10px] font-[950] uppercase tracking-widest px-3 py-1 rounded-full",
            post.category === 'inquiry' ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
          )}>
            {post.category === 'free' ? '자유게시판' : '문의게시판'}
          </span>
          <span className="text-slate-400 font-bold text-sm">•</span>
          <span className="text-slate-500 font-bold text-sm">
            {format(new Date(post.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
          </span>
        </div>

        <h1 className="text-3xl font-[950] text-slate-900 dark:text-white mb-8 tracking-tighter leading-tight flex items-center gap-3">
          {post.is_private && <Hash className="w-6 h-6 text-indigo-600 shrink-0" />}
          {displayTitle}
        </h1>

        <div className="flex items-center justify-between border-y border-slate-50 dark:border-slate-800 py-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
              {post.author?.photo_url ? (
                <img src={post.author.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div>
              <p className="font-[950] text-slate-900 dark:text-white">{post.author?.display_name || '사용자'}</p>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Author</p>
            </div>
          </div>
          {user?.id === post.author_id && (
            <button 
              onClick={handleDeletePost}
              className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl transition-all"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap min-h-[200px]">
          {displayContent}
        </div>
      </div>

      {/* Comments Section */}
      <div className="space-y-6">
        <h3 className="text-xl font-[950] text-slate-900 dark:text-white px-2">
          댓글 <span className="text-indigo-600">{comments.length}</span>
        </h3>

        {/* Comment Form */}
        {!post.is_private || user?.id === post.author_id || profile?.role === 'admin' ? (
          <form onSubmit={handleCommentSubmit} className="relative group">
            <textarea 
              rows={3}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="따뜻한 댓글을 남겨주세요..."
              className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[24px] p-6 pr-16 outline-none focus:border-indigo-600 transition-all font-medium resize-none shadow-sm"
            />
            <button 
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="absolute bottom-4 right-4 p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        ) : null}

        {/* Access Denied for Private Posts */}
        {isAccessRestricted ? (
        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-[32px] p-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-800">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">비밀글입니다</h3>
          <p className="text-slate-400">작성자와 관리자만 확인할 수 있습니다.</p>
        </div>
      ) : (
        /* Comments List */
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-white/50 dark:bg-slate-900/50 rounded-[24px] p-6 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  {comment.author?.photo_url && (
                    <img src={comment.author.photo_url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800 dark:text-white">{comment.author?.display_name || '사용자'}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{format(new Date(comment.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}</p>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed">
                {comment.content}
              </p>
            </div>
          ))}
          {comments.length === 0 && (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-[32px] border-2 border-dashed border-slate-100 dark:border-slate-800">
              <p className="text-slate-400 font-bold italic">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
  );
}
