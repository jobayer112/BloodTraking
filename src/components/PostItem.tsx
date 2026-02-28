import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, arrayUnion, arrayRemove, increment, where, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Heart, Share2, Send, User, MoreVertical, Play, X, Trash2, Phone, Reply } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Post, Comment, UserProfile } from '../types';
import { cn } from '../utils/helpers';
import { createNotification } from '../utils/notifications';

interface PostItemProps {
  post: Post;
  profile: UserProfile | null;
}

const PostItem: React.FC<PostItemProps> = ({ post, profile }) => {
  const { t } = useTranslation();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isLiked = profile ? post.likes.includes(profile.uid) : false;

  useEffect(() => {
    if (!showComments) return;

    const q = query(
      collection(db, 'comments'),
      where('postId', '==', post.id)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const commentList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      // Sort in memory to avoid composite index requirement
      commentList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setComments(commentList);
    });

    return () => unsubscribe();
  }, [showComments, post.id]);

  const handleLike = async () => {
    if (!profile) {
      toast.error('Please login to like posts');
      return;
    }

    try {
      const postRef = doc(db, 'posts', post.id);
      const willLike = !isLiked;
      
      await updateDoc(postRef, {
        likes: willLike ? arrayUnion(profile.uid) : arrayRemove(profile.uid)
      });

      if (willLike && post.authorId !== profile.uid) {
        await createNotification(
          post.authorId,
          'New Like',
          `${profile.name} liked your post.`,
          'social',
          '/feed'
        );
      }
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newComment.trim()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'comments'), {
        postId: post.id,
        authorId: profile.uid,
        authorName: profile.name,
        authorPhoto: profile.photoURL || '',
        content: newComment,
        createdAt: new Date().toISOString(),
        parentId: replyingTo || null
      });

      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        commentCount: increment(1)
      });

      if (post.authorId !== profile.uid) {
        await createNotification(
          post.authorId,
          'New Comment',
          `${profile.name} ${replyingTo ? 'replied to a comment' : 'commented'} on your post: "${newComment.substring(0, 30)}..."`,
          'social',
          '/feed'
        );
      }

      setNewComment('');
      setReplyingTo(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!profile || (profile.uid !== post.authorId && profile.role !== 'admin')) return;

    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await deleteDoc(doc(db, 'posts', post.id));
      toast.success('Post deleted successfully');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden"
    >
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              {post.authorPhoto ? (
                <img src={post.authorPhoto} alt={post.authorName} className="h-full w-full rounded-xl object-cover" />
              ) : (
                <User className="h-5 w-5 text-zinc-400" />
              )}
            </div>
            <div>
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{post.authorName}</h4>
              <p className="text-[10px] text-zinc-500">{new Date(post.createdAt).toLocaleString()}</p>
            </div>
          </div>
          <div className="relative group">
            <button className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
              <MoreVertical className="h-4 w-4 text-zinc-400" />
            </button>
            {(profile?.uid === post.authorId || profile?.role === 'admin') && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-800 shadow-xl border border-zinc-100 dark:border-zinc-700 rounded-xl py-1 hidden group-hover:block z-10">
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Post
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>

        {post.phone && (
          <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 w-fit">
            <Phone className="h-3.5 w-3.5 text-red-600" />
            <a href={`tel:${post.phone}`} className="text-xs font-bold text-zinc-900 dark:text-white hover:text-red-600 transition-colors">
              {post.phone}
            </a>
          </div>
        )}

        {post.mediaURL && (
          <div className="rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-800">
            {post.mediaType === 'video' ? (
              <div className="aspect-video bg-black relative group cursor-pointer">
                <video src={post.mediaURL} className="w-full h-full object-cover" controls />
              </div>
            ) : (
              <img src={post.mediaURL} alt="Post content" className="w-full h-auto" />
            )}
          </div>
        )}

        <div className="flex items-center gap-4 pt-3 border-t border-zinc-50 dark:border-zinc-800/50">
          <button 
            onClick={handleLike}
            className={cn(
              "flex items-center gap-1.5 text-sm font-bold transition-colors",
              isLiked ? "text-red-600" : "text-zinc-500 hover:text-red-600"
            )}
          >
            <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
            {post.likes.length}
          </button>
          <button 
            onClick={() => setShowComments(!showComments)}
            className={cn(
              "flex items-center gap-1.5 text-sm font-bold transition-colors",
              showComments ? "text-blue-600" : "text-zinc-500 hover:text-blue-600"
            )}
          >
            <MessageSquare className="h-4 w-4" />
            {post.commentCount}
          </button>
          <button className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-emerald-600 font-bold transition-colors">
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="pt-4 space-y-4 overflow-hidden"
            >
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {comments.length > 0 ? (
                  <div className="space-y-4">
                    {comments.filter(c => !c.parentId).map((comment) => (
                      <div key={comment.id} className="space-y-3">
                        <div className="flex gap-3">
                          <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                            {comment.authorPhoto ? (
                              <img src={comment.authorPhoto} alt={comment.authorName} className="h-full w-full rounded-lg object-cover" />
                            ) : (
                              <User className="h-4 w-4 text-zinc-400" />
                            )}
                          </div>
                          <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl rounded-tl-none relative">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-xs">{comment.authorName}</span>
                              <span className="text-[10px] text-zinc-500">{new Date(comment.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">{comment.content}</p>
                            <button 
                              onClick={() => setReplyingTo(comment.id)}
                              className="mt-2 flex items-center gap-1 text-[10px] font-bold text-zinc-500 hover:text-red-600 transition-colors"
                            >
                              <Reply className="h-3 w-3" />
                              Reply
                            </button>
                          </div>
                        </div>
                        
                        {/* Replies */}
                        <div className="ml-11 space-y-3 border-l-2 border-zinc-100 dark:border-zinc-800 pl-4">
                          {comments.filter(c => c.parentId === comment.id).map((reply) => (
                            <div key={reply.id} className="flex gap-3">
                              <div className="h-7 w-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                {reply.authorPhoto ? (
                                  <img src={reply.authorPhoto} alt={reply.authorName} className="h-full w-full rounded-lg object-cover" />
                                ) : (
                                  <User className="h-3.5 w-3.5 text-zinc-400" />
                                )}
                              </div>
                              <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-2xl rounded-tl-none">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-bold text-[11px]">{reply.authorName}</span>
                                  <span className="text-[9px] text-zinc-500">{new Date(reply.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs text-zinc-700 dark:text-zinc-300">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-xs text-zinc-500 py-4">{t('no_comments')}</p>
                )}
              </div>

              {profile && (
                <div className="space-y-2 pt-2 border-t border-zinc-50 dark:border-zinc-800/50">
                  {replyingTo && (
                    <div className="flex items-center justify-between px-3 py-1 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                      <p className="text-[10px] text-zinc-500">
                        Replying to <span className="font-bold">{comments.find(c => c.id === replyingTo)?.authorName}</span>
                      </p>
                      <button onClick={() => setReplyingTo(null)} className="text-zinc-400 hover:text-red-600">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={replyingTo ? "Write a reply..." : t('write_comment')}
                      className="flex-1 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-red-600"
                    />
                    <button
                      type="submit"
                      disabled={submitting || !newComment.trim()}
                      className="p-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default PostItem;
