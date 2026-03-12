import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase/config';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { MessageSquare, Heart, Share2, Send, Image as ImageIcon, User, MoreVertical, Video, Play, X, Loader2, Upload, Phone, Filter, AlertCircle, Hash, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Post, BloodGroup } from '../types';
import { cn } from '../utils/helpers';

import PostItem from '../components/PostItem';
import { notifyAllUsers } from '../utils/notifications';

const SocialFeed = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const highlightPostId = searchParams.get('id');
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
  const [searchQuery, setSearchQuery] = useState('');

  const bloodGroups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const extractHashtags = (text: string) => {
    const matches = text.match(/#[^\s#]+/g);
    return matches ? Array.from(new Set(matches.map(tag => tag.toLowerCase()))) : [];
  };

  const popularHashtags = React.useMemo(() => {
    const tagCounts: Record<string, number> = {};
    posts.forEach(post => {
      post.hashtags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(entry => entry[0]);
  }, [posts]);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const postList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      console.log("Fetched posts:", postList.length);
      setPosts(postList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching posts:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (highlightPostId && !loading && posts.length > 0) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.getElementById(highlightPostId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-red-600', 'ring-offset-2');
          setTimeout(() => element.classList.remove('ring-2', 'ring-red-600', 'ring-offset-2'), 3000);
        }
      }, 500);
    }
  }, [highlightPostId, loading, posts]);

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
      const docRef = await addDoc(collection(db, 'posts'), {
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
        `/feed?id=${docRef.id}`,
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
          className="card space-y-6"
        >
          <div className="flex gap-4">
            <div className="h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 ring-4 ring-zinc-50 dark:ring-zinc-900 shadow-sm">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt={profile.name} className="h-full w-full rounded-2xl object-cover" />
              ) : (
                <User className="h-7 w-7 text-zinc-400" />
              )}
            </div>
            <div className="flex-1 space-y-4">
              <textarea
                placeholder={t('share_update')}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="input-field min-h-[120px] text-base"
              />

              <div className="relative">
                <Phone className="absolute left-4 top-3.5 h-4 w-4 text-zinc-400" />
                <input
                  type="tel"
                  placeholder="Phone number (optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field pl-11"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <select
                  value={postType}
                  onChange={(e) => setPostType(e.target.value as 'general' | 'emergency')}
                  className="input-field w-auto"
                >
                  <option value="general">General Post</option>
                  <option value="emergency">Emergency Request</option>
                </select>

                {postType === 'emergency' && (
                  <select
                    value={postBloodGroup}
                    onChange={(e) => setPostBloodGroup(e.target.value as BloodGroup)}
                    className="input-field w-auto font-bold text-red-600"
                  >
                    <option value="">Select Blood Group</option>
                    {bloodGroups.map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                )}
              </div>
              
              {mediaURL && (
                <div className="relative rounded-[2rem] overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-inner">
                  <button 
                    onClick={() => { setMediaURL(''); setMediaType(null); }}
                    className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 z-10 backdrop-blur-md"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {mediaType === 'image' ? (
                    <img src={mediaURL} alt="Preview" className="w-full h-auto max-h-[400px] object-cover" />
                  ) : (
                    <video src={mediaURL} controls className="w-full max-h-[400px] bg-black" />
                  )}
                </div>
              )}

              {uploading && (
                <div className="flex items-center justify-center p-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-700">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 text-red-600 animate-spin" />
                    <p className="text-sm font-bold text-zinc-500">Uploading your media...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center pt-6 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex gap-6">
              <label className="flex items-center gap-2 font-bold text-zinc-500 hover:text-red-600 transition-all cursor-pointer text-xs group">
                <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl group-hover:bg-red-50 dark:group-hover:bg-red-900/20 transition-colors">
                  <ImageIcon className="h-4 w-4" />
                </div>
                {t('photo')}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
              <label className="flex items-center gap-2 font-bold text-zinc-500 hover:text-red-600 transition-all cursor-pointer text-xs group">
                <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl group-hover:bg-red-50 dark:group-hover:bg-red-900/20 transition-colors">
                  <Video className="h-4 w-4" />
                </div>
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
              className="btn-primary px-8"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t('post')}
            </button>
          </div>
        </motion.div>
      )}

      {/* Feed Filters */}
      <div className="card !p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
          <div className="flex items-center gap-3 text-zinc-900 dark:text-white font-bold">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <Filter className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-lg">Community Feed</h2>
          </div>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search posts, authors, or #hashtags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'general' | 'emergency')}
            className="input-field w-auto py-2 px-4"
          >
            <option value="all">All Posts</option>
            <option value="general">General</option>
            <option value="emergency">Emergency</option>
          </select>

          <select
            value={filterBloodGroup}
            onChange={(e) => setFilterBloodGroup(e.target.value as BloodGroup | 'all')}
            className="input-field w-auto py-2 px-4"
          >
            <option value="all">All Groups</option>
            {bloodGroups.map(bg => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>

          {filterHashtag && (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-800/50 text-xs font-bold">
              <Hash className="h-3 w-3" />
              {filterHashtag}
              <button onClick={() => setFilterHashtag('')} className="ml-1 hover:text-blue-800">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Popular Hashtags */}
      {popularHashtags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-2">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Trending:</span>
          {popularHashtags.map(tag => (
            <button
              key={tag}
              onClick={() => setFilterHashtag(tag)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border",
                filterHashtag === tag 
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-200 dark:border-blue-800/50" 
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

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
              if (searchQuery) {
                const searchLower = searchQuery.toLowerCase();
                const matchesContent = post.content.toLowerCase().includes(searchLower);
                const matchesAuthor = post.authorName.toLowerCase().includes(searchLower);
                const matchesHashtag = post.hashtags?.some(tag => tag.toLowerCase().includes(searchLower));
                if (!matchesContent && !matchesAuthor && !matchesHashtag) return false;
              }
              return true;
            })
            .map((post) => (
            <PostItem 
              key={post.id} 
              id={post.id}
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
