import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { MessageSquare, Heart, Share2, Send, Image as ImageIcon, User, MoreVertical, Video, Play, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Post } from '../types';
import { cn } from '../utils/helpers';

const SocialFeed = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [mediaURL, setMediaURL] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const postList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(postList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching posts:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || (!newPostContent.trim() && !mediaURL)) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: profile.uid,
        authorName: profile.name,
        authorPhoto: profile.photoURL || '',
        content: newPostContent,
        type: 'general',
        likes: [],
        commentCount: 0,
        mediaURL: mediaURL || null,
        mediaType: mediaType || null,
        createdAt: new Date().toISOString()
      });
      setNewPostContent('');
      setMediaURL('');
      setMediaType(null);
      toast.success(t('post') + ' shared!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!profile) {
      toast.error('Please login to like posts');
      return;
    }

    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likes: isLiked ? arrayRemove(profile.uid) : arrayUnion(profile.uid)
      });
      
      setPosts(posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            likes: isLiked 
              ? p.likes.filter(id => id !== profile.uid)
              : [...p.likes, profile.uid]
          };
        }
        return p;
      }));
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      {/* Create Post */}
      {profile && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-xl border border-zinc-100 dark:border-zinc-800 space-y-4"
        >
          <div className="flex gap-4">
            <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt={profile.name} className="h-full w-full rounded-2xl object-cover" />
              ) : (
                <User className="h-6 w-6 text-zinc-400" />
              )}
            </div>
            <div className="flex-1 space-y-4">
              <textarea
                placeholder={t('share_update')}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-red-600 outline-none resize-none min-h-[100px]"
              />
              
              {mediaURL && (
                <div className="relative rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800">
                  <button 
                    onClick={() => { setMediaURL(''); setMediaType(null); }}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 z-10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {mediaType === 'image' ? (
                    <img src={mediaURL} alt="Preview" className="w-full h-auto max-h-60 object-cover" />
                  ) : (
                    <div className="aspect-video bg-zinc-900 flex items-center justify-center">
                      <Play className="h-12 w-12 text-white opacity-50" />
                    </div>
                  )}
                </div>
              )}

              {(mediaType === 'image' || mediaType === 'video') && !mediaURL && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">{mediaType === 'image' ? t('photo') : t('video')} URL</label>
                  <input
                    type="text"
                    placeholder={`Paste ${mediaType} URL here...`}
                    value={mediaURL}
                    onChange={(e) => setMediaURL(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex gap-4">
              <button 
                onClick={() => { setMediaType('image'); setMediaURL(''); }}
                className={cn(
                  "flex items-center gap-2 font-medium transition-colors",
                  mediaType === 'image' ? "text-red-600" : "text-zinc-500 hover:text-red-600"
                )}
              >
                <ImageIcon className="h-5 w-5" />
                {t('photo')}
              </button>
              <button 
                onClick={() => { setMediaType('video'); setMediaURL(''); }}
                className={cn(
                  "flex items-center gap-2 font-medium transition-colors",
                  mediaType === 'video' ? "text-red-600" : "text-zinc-500 hover:text-red-600"
                )}
              >
                <Video className="h-5 w-5" />
                {t('video')}
              </button>
            </div>
            <button
              onClick={handleCreatePost}
              disabled={submitting || (!newPostContent.trim() && !mediaURL)}
              className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {t('post')}
            </button>
          </div>
        </motion.div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post, index) => {
            const isLiked = profile ? post.likes.includes(profile.uid) : false;
            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden"
              >
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        {post.authorPhoto ? (
                          <img src={post.authorPhoto} alt={post.authorName} className="h-full w-full rounded-xl object-cover" />
                        ) : (
                          <User className="h-5 w-5 text-zinc-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-900 dark:text-white">{post.authorName}</h4>
                        <p className="text-xs text-zinc-500">{new Date(post.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                      <MoreVertical className="h-5 w-5 text-zinc-400" />
                    </button>
                  </div>

                  <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {post.content}
                  </p>

                  {post.mediaURL && (
                    <div className="rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800">
                      {post.mediaType === 'video' ? (
                        <div className="aspect-video bg-black relative group cursor-pointer">
                          <video src={post.mediaURL} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all">
                            <Play className="h-12 w-12 text-white" />
                          </div>
                        </div>
                      ) : (
                        <img src={post.mediaURL} alt="Post content" className="w-full h-auto" />
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-6 pt-4 border-t border-zinc-50 dark:border-zinc-800/50">
                    <button 
                      onClick={() => handleLike(post.id, isLiked)}
                      className={cn(
                        "flex items-center gap-2 font-bold transition-colors",
                        isLiked ? "text-red-600" : "text-zinc-500 hover:text-red-600"
                      )}
                    >
                      <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                      {post.likes.length}
                    </button>
                    <button className="flex items-center gap-2 text-zinc-500 hover:text-blue-600 font-bold transition-colors">
                      <MessageSquare className="h-5 w-5" />
                      {post.commentCount}
                    </button>
                    <button className="flex items-center gap-2 text-zinc-500 hover:text-emerald-600 font-bold transition-colors">
                      <Share2 className="h-5 w-5" />
                      Share
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SocialFeed;
