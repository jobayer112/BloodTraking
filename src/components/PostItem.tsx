import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/config';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, arrayUnion, arrayRemove, increment, where, deleteDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Heart, Share2, Send, User, MoreVertical, Play, X, Trash2, Phone, Reply, Edit2, AlertTriangle, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Post, Comment, UserProfile, BloodGroup } from '../types';
import { cn } from '../utils/helpers';
import { createNotification } from '../utils/notifications';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import { UserPlus, UserMinus } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface PostItemProps {
  post: Post;
  profile: UserProfile | null;
  onHashtagClick?: (tag: string) => void;
  id?: string;
}

const PostItem: React.FC<PostItemProps> = ({ post, profile, onHashtagClick, id }) => {
  const { t } = useTranslation();
  const { updateProfileState } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const authorId = post.authorId || post.userId;
  const authorName = post.authorName || post.userName;
  const authorPhoto = post.authorPhoto || post.userPhoto;
  const mediaURL = post.mediaURL || post.media;
  const commentCount = post.commentCount ?? post.commentsCount ?? 0;
  const likes = post.likes || [];
  
  const isLiked = profile ? likes.includes(profile.uid) : false;
  const isFollowing = profile?.following?.includes(authorId || '') || false;

  const formatDate = (date: any) => {
    if (!date) return '';
    if (typeof date === 'string') return new Date(date).toLocaleString();
    if (date.seconds) return new Date(date.seconds * 1000).toLocaleString();
    return new Date(date).toLocaleString();
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!profile) return toast.error('Please login to follow users');
    if (!authorId || profile.uid === authorId) return;

    try {
      const currentUserRef = doc(db, 'users', profile.uid);
      const targetUserRef = doc(db, 'users', authorId);

      if (isFollowing) {
        await updateDoc(currentUserRef, {
          following: arrayRemove(authorId)
        });
        await updateDoc(targetUserRef, {
          followers: arrayRemove(profile.uid)
        });
        updateProfileState({
          ...profile,
          following: profile.following?.filter(id => id !== authorId) || []
        });
        toast.success(`Unfollowed ${authorName}`);
      } else {
        await updateDoc(currentUserRef, {
          following: arrayUnion(authorId)
        });
        await updateDoc(targetUserRef, {
          followers: arrayUnion(profile.uid)
        });
        updateProfileState({
          ...profile,
          following: [...(profile.following || []), authorId]
        });
        
        await createNotification(
          authorId,
          'New Follower',
          `${profile.name} started following you.`,
          'social',
          `/user/${profile.uid}`
        );
        
        toast.success(`Following ${authorName}`);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editPhone, setEditPhone] = useState(post.phone || '');
  const [editMediaURL, setEditMediaURL] = useState(mediaURL || '');
  const [editMediaType, setEditMediaType] = useState(post.mediaType || null);
  const [editPostType, setEditPostType] = useState(post.type);
  const [editBloodGroup, setEditBloodGroup] = useState(post.bloodGroup || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'post' | 'comment' | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const shouldTruncate = post.content.length > 150 || post.content.split('\n').length > 3;

  const bloodGroups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleDeleteComment = (commentId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!profile) return;
    setDeleteType('comment');
    setItemToDelete(commentId);
    setDeleteModalOpen(true);
  };

  const handleDelete = () => {
    if (!profile || (profile.uid !== authorId && profile.role !== 'admin')) return;
    setDeleteType('post');
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      if (deleteType === 'post') {
        await deleteDoc(doc(db, 'posts', post.id));
        toast.success('Post deleted successfully');
      } else if (deleteType === 'comment' && itemToDelete) {
        await deleteDoc(doc(db, 'comments', itemToDelete));
        await updateDoc(doc(db, 'posts', post.id), {
          commentCount: increment(-1)
        });
        toast.success('Comment deleted');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleteModalOpen(false);
      setDeleteType(null);
      setItemToDelete(null);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!profile || !editCommentContent.trim()) return;

    try {
      await updateDoc(doc(db, 'comments', commentId), {
        content: editCommentContent
      });
      setEditingCommentId(null);
      setEditCommentContent('');
      toast.success('Comment updated');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

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

      if (willLike && authorId !== profile.uid) {
        await createNotification(
          authorId,
          'New Like',
          `${profile.name} liked your post.`,
          'social',
          `/feed?id=${post.id}`
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

      if (authorId !== profile.uid) {
        await createNotification(
          authorId,
          'New Comment',
          `${profile.name} ${replyingTo ? 'replied to a comment' : 'commented'} on your post: "${newComment.substring(0, 30)}..."`,
          'social',
          `/feed?id=${post.id}`
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



  const handleShare = async () => {
    const shareText = `Check out this post on BloodTraking!\n\n${post.content}\n\nBy: ${authorName}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BloodTraking Post',
          text: shareText,
          url: window.location.href
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success('Post details copied to clipboard');
      } catch (error) {
        toast.error('Failed to copy');
      }
    }
  };

  const handleReport = async () => {
    if (!profile) return toast.error('Please login to report posts');
    if (!window.confirm('Are you sure you want to report this post?')) return;

    try {
      await updateDoc(doc(db, 'posts', post.id), {
        isReported: true
      });
      toast.success('Post reported successfully');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEditFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `posts/${profile.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      setEditMediaURL(url);
      setEditMediaType(file.type.startsWith('video/') ? 'video' : 'image');
      toast.success('File uploaded successfully!');
    } catch (error: any) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const extractHashtags = (text: string) => {
    const matches = text.match(/#[^\s#]+/g);
    return matches ? Array.from(new Set(matches.map(tag => tag.toLowerCase()))) : [];
  };

  const handleSaveEdit = async () => {
    if (!profile || (!editContent.trim() && !editMediaURL)) return;

    setIsSaving(true);
    try {
      const hashtags = extractHashtags(editContent);
      await updateDoc(doc(db, 'posts', post.id), {
        content: editContent,
        phone: editPhone || null,
        mediaURL: editMediaURL || null,
        mediaType: editMediaType || null,
        type: editPostType,
        bloodGroup: editBloodGroup || null,
        hashtags
      });
      setIsEditing(false);
      toast.success('Post updated successfully!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderContentWithHashtags = (content: string) => {
    const parts = content.split(/(#[^\s#]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return (
          <span 
            key={i} 
            onClick={() => onHashtagClick?.(part.toLowerCase())}
            className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden"
    >
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <Link to={`/user/${authorId}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-9 w-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              {authorPhoto ? (
                <img src={authorPhoto} alt={authorName} className="h-full w-full rounded-xl object-cover" />
              ) : (
                <User className="h-5 w-5 text-zinc-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{authorName}</h4>
                {profile && profile.uid !== authorId && (
                  <button
                    onClick={handleFollow}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1",
                      isFollowing 
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700" 
                        : "bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                    )}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="h-3 w-3" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3 w-3" />
                        Follow
                      </>
                    )}
                  </button>
                )}
                {post.type === 'emergency' && (
                  <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 text-[10px] font-bold rounded-md flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {post.bloodGroup} Emergency
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-500">{formatDate(post.createdAt)}</p>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            {profile?.uid === authorId && !isEditing && (
              <button
                onClick={() => {
                  setEditContent(post.content);
                  setEditPhone(post.phone || '');
                  setEditMediaURL(mediaURL || '');
                  setEditMediaType(post.mediaType || null);
                  setEditPostType(post.type);
                  setEditBloodGroup(post.bloodGroup || '');
                  setIsEditing(true);
                }}
                className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                title="Edit Post"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
              >
                <MoreVertical className="h-4 w-4 text-zinc-400" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-800 shadow-xl border border-zinc-100 dark:border-zinc-700 rounded-xl py-1 z-10 min-w-[120px]">
                  {(profile?.uid === authorId || profile?.role === 'admin') && (
                    <button
                      onClick={() => {
                        handleDelete();
                        setShowMenu(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Post
                    </button>
                  )}
                  {profile?.uid !== authorId && (
                    <button
                      onClick={() => {
                        handleReport();
                        setShowMenu(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 w-full text-left"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Report Post
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 focus:ring-2 focus:ring-red-600 outline-none resize-none min-h-[100px] text-sm"
            />
            <div className="flex flex-wrap gap-3">
              <select
                value={editPostType}
                onChange={(e) => setEditPostType(e.target.value as 'general' | 'emergency')}
                className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-600"
              >
                <option value="general">General Post</option>
                <option value="emergency">Emergency Request</option>
              </select>

              {editPostType === 'emergency' && (
                <select
                  value={editBloodGroup}
                  onChange={(e) => setEditBloodGroup(e.target.value as BloodGroup)}
                  className="bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-100 dark:border-red-800/50 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-600 font-bold"
                >
                  <option value="">Select Blood Group</option>
                  {bloodGroups.map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-4 py-2 border border-zinc-200 dark:border-zinc-700">
              <Phone className="h-4 w-4 text-zinc-400" />
              <input
                type="tel"
                placeholder="Phone number (optional)"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full"
              />
            </div>
            
            {editMediaURL && (
              <div className="relative rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800">
                <button 
                  onClick={() => { setEditMediaURL(''); setEditMediaType(null); }}
                  className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 z-10"
                >
                  <X className="h-4 w-4" />
                </button>
                {editMediaType === 'image' ? (
                  <img src={editMediaURL} alt="Preview" className="w-full h-auto max-h-80 object-cover" />
                ) : (
                  <video src={editMediaURL} controls className="w-full max-h-80 bg-black" />
                )}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 font-medium text-zinc-500 hover:text-red-600 transition-colors cursor-pointer text-sm">
                  <ImageIcon className="h-4 w-4" />
                  Photo
                  <input type="file" accept="image/*" className="hidden" onChange={handleEditFileUpload} disabled={isUploading} />
                </label>
                <label className="flex items-center gap-2 font-medium text-zinc-500 hover:text-red-600 transition-colors cursor-pointer text-sm">
                  <Video className="h-4 w-4" />
                  Video
                  <input type="file" accept="video/*" className="hidden" onChange={handleEditFileUpload} disabled={isUploading} />
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving || isUploading || (!editContent.trim() && !editMediaURL)}
                  className="px-4 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <p className={cn(
                "text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap",
                !isExpanded && shouldTruncate && "line-clamp-3"
              )}>
                {renderContentWithHashtags(post.content)}
              </p>
              {shouldTruncate && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className="text-sm font-bold text-blue-600 hover:text-blue-700 mt-1"
                >
                  {isExpanded ? 'See less' : 'See more'}
                </button>
              )}
            </div>

            {post.phone && (
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 w-fit">
                <Phone className="h-3.5 w-3.5 text-red-600" />
                <a href={`tel:${post.phone}`} className="text-xs font-bold text-zinc-900 dark:text-white hover:text-red-600 transition-colors">
                  {post.phone}
                </a>
              </div>
            )}

            {mediaURL && (
              <div className="rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-800">
                {post.mediaType === 'video' ? (
                  <div className="aspect-video bg-black relative group cursor-pointer">
                    <video src={mediaURL} className="w-full h-full object-cover" controls />
                  </div>
                ) : (
                  <img src={mediaURL} alt="Post content" className="w-full h-auto" />
                )}
              </div>
            )}
          </>
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
            {likes.length}
          </button>
          <button 
            onClick={() => setShowComments(!showComments)}
            className={cn(
              "flex items-center gap-1.5 text-sm font-bold transition-colors",
              showComments ? "text-blue-600" : "text-zinc-500 hover:text-blue-600"
            )}
          >
            <MessageSquare className="h-4 w-4" />
            {commentCount}
          </button>
          <button 
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-emerald-600 font-bold transition-colors"
          >
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
                          <Link to={`/user/${comment.authorId || comment.userId}`} className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity">
                            {comment.authorPhoto || comment.userPhoto ? (
                              <img src={comment.authorPhoto || comment.userPhoto} alt={comment.authorName || comment.userName} className="h-full w-full rounded-lg object-cover" />
                            ) : (
                              <User className="h-4 w-4 text-zinc-400" />
                            )}
                          </Link>
                          <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl rounded-tl-none relative group">
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-2">
                                <Link to={`/user/${comment.authorId || comment.userId}`} className="font-bold text-xs hover:text-red-600 transition-colors">{comment.authorName || comment.userName}</Link>
                                {profile && profile.uid !== (comment.authorId || comment.userId) && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      const cAuthorId = comment.authorId || comment.userId;
                                      const cAuthorName = comment.authorName || comment.userName;
                                      const isFollowingCommentAuthor = profile.following?.includes(cAuthorId) || false;
                                      
                                      const toggleFollow = async () => {
                                        try {
                                          const currentUserRef = doc(db, 'users', profile.uid);
                                          const targetUserRef = doc(db, 'users', cAuthorId);
                                          if (isFollowingCommentAuthor) {
                                            await updateDoc(currentUserRef, { following: arrayRemove(cAuthorId) });
                                            await updateDoc(targetUserRef, { followers: arrayRemove(profile.uid) });
                                            updateProfileState({ ...profile, following: profile.following?.filter(id => id !== cAuthorId) || [] });
                                            toast.success(`Unfollowed ${cAuthorName}`);
                                          } else {
                                            await updateDoc(currentUserRef, { following: arrayUnion(cAuthorId) });
                                            await updateDoc(targetUserRef, { followers: arrayUnion(profile.uid) });
                                            updateProfileState({ ...profile, following: [...(profile.following || []), cAuthorId] });
                                            toast.success(`Following ${cAuthorName}`);
                                          }
                                        } catch (err: any) { toast.error(err.message); }
                                      };
                                      toggleFollow();
                                    }}
                                    className={cn(
                                      "text-[8px] font-bold px-1.5 py-0.5 rounded transition-colors",
                                      profile.following?.includes(comment.authorId || comment.userId)
                                        ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-500"
                                        : "bg-red-50 dark:bg-red-900/20 text-red-600"
                                    )}
                                  >
                                    {profile.following?.includes(comment.authorId || comment.userId) ? 'Following' : 'Follow'}
                                  </button>
                                )}
                              </div>
                              <span className="text-[10px] text-zinc-500">{formatDate(comment.createdAt)}</span>
                            </div>

                            {editingCommentId === comment.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editCommentContent}
                                  onChange={(e) => setEditCommentContent(e.target.value)}
                                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 text-xs focus:ring-1 focus:ring-red-600 outline-none resize-none"
                                  rows={2}
                                />
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => {
                                      setEditingCommentId(null);
                                      setEditCommentContent('');
                                    }}
                                    className="text-[10px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleEditComment(comment.id)}
                                    className="text-[10px] font-bold text-red-600 hover:text-red-700"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm text-zinc-700 dark:text-zinc-300">{comment.content || comment.text}</p>
                                <div className="flex items-center gap-3 mt-2">
                                  <button 
                                    onClick={() => setReplyingTo(comment.id)}
                                    className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 hover:text-red-600 transition-colors"
                                  >
                                    <Reply className="h-3 w-3" />
                                    Reply
                                  </button>
                                  {profile && (profile.uid === (comment.authorId || comment.userId) || profile.role === 'admin') && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingCommentId(comment.id);
                                          setEditCommentContent(comment.content || comment.text);
                                        }}
                                        className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-blue-600 transition-colors px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                        Edit
                                      </button>
                                      <button
                                        onClick={(e) => handleDeleteComment(comment.id, e)}
                                        className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-red-600 transition-colors px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Replies */}
                        <div className="ml-11 space-y-3 border-l-2 border-zinc-100 dark:border-zinc-800 pl-4">
                          {comments.filter(c => c.parentId === comment.id).map((reply) => (
                            <div key={reply.id} className="flex gap-3">
                              <Link to={`/user/${reply.authorId || reply.userId}`} className="h-7 w-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity">
                                {reply.authorPhoto || reply.userPhoto ? (
                                  <img src={reply.authorPhoto || reply.userPhoto} alt={reply.authorName || reply.userName} className="h-full w-full rounded-lg object-cover" />
                                ) : (
                                  <User className="h-3.5 w-3.5 text-zinc-400" />
                                )}
                              </Link>
                              <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-2xl rounded-tl-none group">
                                <div className="flex justify-between items-center mb-1">
                                  <div className="flex items-center gap-2">
                                    <Link to={`/user/${reply.authorId || reply.userId}`} className="font-bold text-[11px] hover:text-red-600 transition-colors">{reply.authorName || reply.userName}</Link>
                                    {profile && profile.uid !== (reply.authorId || reply.userId) && (
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          const rAuthorId = reply.authorId || reply.userId;
                                          const rAuthorName = reply.authorName || reply.userName;
                                          const isFollowingReplyAuthor = profile.following?.includes(rAuthorId) || false;
                                          const toggleFollow = async () => {
                                            try {
                                              const currentUserRef = doc(db, 'users', profile.uid);
                                              const targetUserRef = doc(db, 'users', rAuthorId);
                                              if (isFollowingReplyAuthor) {
                                                await updateDoc(currentUserRef, { following: arrayRemove(rAuthorId) });
                                                await updateDoc(targetUserRef, { followers: arrayRemove(profile.uid) });
                                                updateProfileState({ ...profile, following: profile.following?.filter(id => id !== rAuthorId) || [] });
                                                toast.success(`Unfollowed ${rAuthorName}`);
                                              } else {
                                                await updateDoc(currentUserRef, { following: arrayUnion(rAuthorId) });
                                                await updateDoc(targetUserRef, { followers: arrayUnion(profile.uid) });
                                                updateProfileState({ ...profile, following: [...(profile.following || []), rAuthorId] });
                                                toast.success(`Following ${rAuthorName}`);
                                              }
                                            } catch (err: any) { toast.error(err.message); }
                                          };
                                          toggleFollow();
                                        }}
                                        className={cn(
                                          "text-[7px] font-bold px-1 py-0.5 rounded transition-colors",
                                          profile.following?.includes(reply.authorId || reply.userId)
                                            ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-500"
                                            : "bg-red-50 dark:bg-red-900/20 text-red-600"
                                        )}
                                      >
                                        {profile.following?.includes(reply.authorId || reply.userId) ? 'Following' : 'Follow'}
                                      </button>
                                    )}
                                  </div>
                                  <span className="text-[9px] text-zinc-500">{formatDate(reply.createdAt)}</span>
                                </div>

                                {editingCommentId === reply.id ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={editCommentContent}
                                      onChange={(e) => setEditCommentContent(e.target.value)}
                                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 text-xs focus:ring-1 focus:ring-red-600 outline-none resize-none"
                                      rows={2}
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        onClick={() => {
                                          setEditingCommentId(null);
                                          setEditCommentContent('');
                                        }}
                                        className="text-[10px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleEditComment(reply.id)}
                                        className="text-[10px] font-bold text-red-600 hover:text-red-700"
                                      >
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-xs text-zinc-700 dark:text-zinc-300">{reply.content || reply.text}</p>
                                    {profile && (profile.uid === (reply.authorId || reply.userId) || profile.role === 'admin') && (
                                      <div className="flex items-center gap-3 mt-1">
                                        <button
                                          onClick={() => {
                                            setEditingCommentId(reply.id);
                                            setEditCommentContent(reply.content || reply.text);
                                          }}
                                          className="flex items-center gap-1 text-[9px] font-bold text-zinc-500 hover:text-blue-600 transition-colors"
                                        >
                                          <Edit2 className="h-2.5 w-2.5" />
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteComment(reply.id)}
                                          className="flex items-center gap-1 text-[9px] font-bold text-zinc-500 hover:text-red-600 transition-colors"
                                        >
                                          <Trash2 className="h-2.5 w-2.5" />
                                          Delete
                                        </button>
                                      </div>
                                    )}
                                  </>
                                )}
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
                        Replying to <span className="font-bold">{comments.find(c => c.id === replyingTo)?.authorName || comments.find(c => c.id === replyingTo)?.userName}</span>
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

        <ConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          title={deleteType === 'post' ? "Delete Post" : "Delete Comment"}
          message={deleteType === 'post' 
            ? "Are you sure you want to delete this post? This action cannot be undone." 
            : "Are you sure you want to delete this comment?"}
          confirmText="Delete"
          isDangerous={true}
        />
      </div>
    </motion.div>
  );
};

export default PostItem;
