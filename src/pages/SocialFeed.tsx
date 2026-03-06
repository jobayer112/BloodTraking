import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase/config';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { MessageSquare, Heart, Share2, Send, Image as ImageIcon, User, MoreVertical, Video, Play, X, Loader2, Upload, Phone, Filter, AlertCircle, Hash } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Post, BloodGroup } from '../types';
import { cn } from '../utils/helpers';

import PostItem from '../components/PostItem';
import { notifyAllUsers } from '../utils/notifications';

const SocialFeed = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [phone, setPhone] = useState('');
  const [mediaURL, setMediaURL] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [postType, setPostType] = useState<'general' | 'emergency'>('general');
  const [postBloodGroup, setPostBloodGroup] = useState<BloodGroup | ''>('');
  
  const [filterType, setFilterType] = useState<'all' | 'general' | 'emergency'>('all');
  const [filterBloodGroup, setFilterBloodGroup] = useState<BloodGroup | 'all'>('all');
  const [filterHashtag, setFilterHashtag] = useState<string>('');

  const bloodGroups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const extractHashtags = (text: string) => {
    const matches = text.match(/#[^\s#]+/g);
    return matches ? Array.from(new Set(matches.map(tag => tag.toLowerCase()))) : [];
  };

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `posts/${profile.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      setMediaURL(url);
      setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
      toast.success('File uploaded successfully!');
    } catch (error: any) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || (!newPostContent.trim() && !mediaURL)) return;

    setSubmitting(true);
    try {
      const hashtags = extractHashtags(newPostContent);
      await addDoc(collection(db, 'posts'), {
        authorId: profile.uid,
        authorName: profile.name,
        authorPhoto: profile.photoURL || '',
        content: newPostContent,
        phone: phone || null,
        type: postType,
        bloodGroup: postBloodGroup || null,
        hashtags,
        isReported: false,
        likes: [],
        commentCount: 0,
        mediaURL: mediaURL || null,
        mediaType: mediaType || null,
        createdAt: new Date().toISOString()
      });

      // Notify all users about the new post
      notifyAllUsers(
        'New Community Post',
        `${profile.name} shared a new post: "${newPostContent.substring(0, 30)}..."`,
        'social',
        '/feed',
        profile.uid
      );

      setNewPostContent('');
      setPhone('');
      setMediaURL('');
      setMediaType(null);
      setPostType('general');
      setPostBloodGroup('');
      toast.success(t('post') + ' shared!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
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
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-red-600 outline-none resize-none min-h-[100px] text-sm"
              />

              <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-4 py-2 border border-zinc-100 dark:border-zinc-800">
                <Phone className="h-4 w-4 text-zinc-400" />
                <input
                  type="tel"
                  placeholder="Phone number (optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-full"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <select
                  value={postType}
                  onChange={(e) => setPostType(e.target.value as 'general' | 'emergency')}
                  className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="general">General Post</option>
                  <option value="emergency">Emergency Request</option>
                </select>

                {postType === 'emergency' && (
                  <select
                    value={postBloodGroup}
                    onChange={(e) => setPostBloodGroup(e.target.value as BloodGroup)}
                    className="bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-100 dark:border-red-800/50 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-600 font-bold"
                  >
                    <option value="">Select Blood Group</option>
                    {bloodGroups.map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                )}
              </div>
              
              {mediaURL && (
                <div className="relative rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800">
                  <button 
                    onClick={() => { setMediaURL(''); setMediaType(null); }}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 z-10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {mediaType === 'image' ? (
                    <img src={mediaURL} alt="Preview" className="w-full h-auto max-h-80 object-cover" />
                  ) : (
                    <video src={mediaURL} controls className="w-full max-h-80 bg-black" />
                  )}
                </div>
              )}

              {uploading && (
                <div className="flex items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
                    <p className="text-sm font-medium text-zinc-500">Uploading media...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 font-medium text-zinc-500 hover:text-red-600 transition-colors cursor-pointer">
                <ImageIcon className="h-5 w-5" />
                {t('photo')}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
              <label className="flex items-center gap-2 font-medium text-zinc-500 hover:text-red-600 transition-colors cursor-pointer">
                <Video className="h-5 w-5" />
                {t('video')}
                <input 
                  type="file" 
                  accept="video/*" 
                  className="hidden" 
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>
            <button
              onClick={handleCreatePost}
              disabled={submitting || uploading || (!newPostContent.trim() && !mediaURL)}
              className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t('post')}
            </button>
          </div>
        </motion.div>
      )}

      {/* Feed Filters */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 space-y-4">
        <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold">
          <Filter className="h-5 w-5" />
          <h2>Filter Feed</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'general' | 'emergency')}
            className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-red-600"
          >
            <option value="all">All Posts</option>
            <option value="general">General</option>
            <option value="emergency">Emergency</option>
          </select>

          <select
            value={filterBloodGroup}
            onChange={(e) => setFilterBloodGroup(e.target.value as BloodGroup | 'all')}
            className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-red-600"
          >
            <option value="all">All Blood Groups</option>
            {bloodGroups.map(bg => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>

          {filterHashtag && (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-800/50 text-sm font-medium">
              <Hash className="h-4 w-4" />
              {filterHashtag}
              <button onClick={() => setFilterHashtag('')} className="ml-1 hover:text-blue-800">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {posts
            .filter(post => {
              if (filterType !== 'all' && post.type !== filterType) return false;
              if (filterBloodGroup !== 'all' && post.bloodGroup !== filterBloodGroup) return false;
              if (filterHashtag && !post.hashtags?.includes(filterHashtag.toLowerCase())) return false;
              return true;
            })
            .map((post) => (
            <PostItem 
              key={post.id} 
              post={post} 
              profile={profile} 
              onHashtagClick={(tag) => setFilterHashtag(tag)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SocialFeed;
