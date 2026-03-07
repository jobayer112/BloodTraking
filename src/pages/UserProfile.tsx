import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove, setDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { User, MapPin, Droplets, Calendar, CheckCircle, Shield, Heart, Scale, Ruler, MessageSquare, Phone, ArrowLeft, Loader2, UserPlus, UserMinus, FileText, Activity, Clock } from 'lucide-react';
import { BLOOD_GROUPS, cn, canDonate, getBadge } from '../utils/helpers';
import { toast } from 'react-hot-toast';
import PostItem from '../components/PostItem';
import { Post, BloodRequest } from '../types';

const UserProfile = () => {
  const { uid } = useParams();
  const { user, profile: currentUser, updateProfileState } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'requests'>('overview');
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userRequests, setUserRequests] = useState<BloodRequest[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);

  const isFollowing = currentUser?.following?.includes(uid || '') || false;

  const handleFollow = async () => {
    if (!currentUser) return toast.error('Please login to follow users');
    if (!uid || currentUser.uid === uid) return;

    try {
      const currentUserRef = doc(db, 'users', currentUser.uid);
      const targetUserRef = doc(db, 'users', uid);

      if (isFollowing) {
        await updateDoc(currentUserRef, {
          following: arrayRemove(uid)
        });
        await updateDoc(targetUserRef, {
          followers: arrayRemove(currentUser.uid)
        });
        updateProfileState({
          ...currentUser,
          following: currentUser.following?.filter(id => id !== uid) || []
        });
        setProfile((prev: any) => ({
          ...prev,
          followers: prev.followers?.filter((id: string) => id !== currentUser.uid) || []
        }));
        toast.success(`Unfollowed ${profile.name}`);
      } else {
        await updateDoc(currentUserRef, {
          following: arrayUnion(uid)
        });
        await updateDoc(targetUserRef, {
          followers: arrayUnion(currentUser.uid)
        });
        updateProfileState({
          ...currentUser,
          following: [...(currentUser.following || []), uid]
        });
        setProfile((prev: any) => ({
          ...prev,
          followers: [...(prev.followers || []), currentUser.uid]
        }));
        toast.success(`Following ${profile.name}`);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!uid) return;
      try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile({ uid: docSnap.id, ...docSnap.data() });
        } else {
          toast.error("User not found");
          navigate('/');
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [uid, navigate]);

  useEffect(() => {
    const fetchContent = async () => {
      if (!uid) return;
      setLoadingContent(true);
      try {
        // Fetch Posts
        const postsQ = query(
          collection(db, 'posts'),
          where('authorId', '==', uid)
        );
        const postsSnap = await getDocs(postsQ);
        const posts = postsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Post))
          .sort((a: any, b: any) => {
            const getTime = (date: any) => {
              if (!date) return 0;
              if (typeof date === 'string') return new Date(date).getTime();
              if (date.seconds) return date.seconds * 1000;
              return new Date(date).getTime();
            };
            return getTime(b.createdAt) - getTime(a.createdAt);
          });
        setUserPosts(posts);

        // Fetch Requests
        const requestsQ = query(
          collection(db, 'bloodRequests'),
          where('requesterId', '==', uid)
        );
        const requestsSnap = await getDocs(requestsQ);
        const requests = requestsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as BloodRequest))
          .sort((a: any, b: any) => {
            const getTime = (date: any) => {
              if (!date) return 0;
              if (typeof date === 'string') return new Date(date).getTime();
              if (date.seconds) return date.seconds * 1000;
              return new Date(date).getTime();
            };
            return getTime(b.createdAt) - getTime(a.createdAt);
          });
        setUserRequests(requests);
      } catch (error) {
        console.error("Error fetching user content:", error);
      } finally {
        setLoadingContent(false);
      }
    };

    if (profile) {
      fetchContent();
    }
  }, [uid, profile]);

  const handleStartChat = async () => {
    if (!user) {
      toast.error("Please login to message donors");
      navigate('/login');
      return;
    }

    if (user.uid === uid) {
      navigate('/profile');
      return;
    }

    try {
      // Check if room already exists
      const roomsRef = collection(db, 'chatRooms');
      const q = query(
        roomsRef,
        where('participants', 'array-contains', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      let existingRoomId = null;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.participants.includes(uid)) {
          existingRoomId = doc.id;
        }
      });

      if (existingRoomId) {
        navigate(`/messages?room=${existingRoomId}`);
      } else {
        // Create new room
        const roomId = [user.uid, uid].sort().join('_');
        await setDoc(doc(db, 'chatRooms', roomId), {
          participants: [user.uid, uid],
          createdAt: serverTimestamp(),
          lastMessage: '',
          lastMessageAt: serverTimestamp(),
          unreadCount: {
            [user.uid]: 0,
            [uid as string]: 0
          }
        });
        navigate(`/messages?room=${roomId}`);
      }
    } catch (error) {
      console.error("Error starting chat:", error);
      toast.error("Failed to start conversation");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const isAvailable = canDonate(profile.lastDonationDate);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors font-bold text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-zinc-100 dark:border-zinc-800"
      >
        <div className="h-32 bg-gradient-to-r from-red-600 to-red-500 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="h-32 w-32 rounded-3xl bg-white dark:bg-zinc-800 p-1.5 shadow-xl overflow-hidden ring-4 ring-white dark:ring-zinc-900">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt={profile.name} className="h-full w-full rounded-[1.25rem] object-cover" />
              ) : (
                <div className="h-full w-full rounded-[1.25rem] bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
                  <User className="h-16 w-16 text-zinc-400" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-16 pb-8 px-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                  {profile.name}
                </h1>
                {profile.isVerified && (
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full text-xs font-bold border border-blue-100 dark:border-blue-900/30">
                    <CheckCircle className="h-3 w-3 fill-blue-600/10" />
                    Verified
                  </div>
                )}
                <div className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border",
                  isAvailable 
                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-100 dark:border-emerald-900/30" 
                    : "bg-red-50 dark:bg-red-900/20 text-red-600 border-red-100 dark:border-red-900/30"
                )}>
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    isAvailable ? "bg-emerald-500" : "bg-red-500"
                  )} />
                  {isAvailable ? "Available to Donate" : "Unavailable"}
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {profile.district || profile.division || 'Location not set'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Joined {new Date(profile.createdAt).toLocaleDateString()}
                </span>
                {getBadge(profile.donationCount) && (
                  <span className={cn(
                    "flex items-center gap-1.5 font-medium",
                    getBadge(profile.donationCount)?.color
                  )}>
                    <span>{getBadge(profile.donationCount)?.icon}</span>
                    {getBadge(profile.donationCount)?.name}
                  </span>
                )}
              </div>
            </div>

            {user?.uid !== uid && (
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={handleFollow}
                  className={cn(
                    "flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg",
                    isFollowing 
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 shadow-zinc-200/20" 
                      : "bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 shadow-red-600/10"
                  )}
                >
                  {isFollowing ? (
                    <>
                      <UserMinus className="h-4 w-4" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Follow
                    </>
                  )}
                </button>
                <button
                  onClick={handleStartChat}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                >
                  <MessageSquare className="h-4 w-4" />
                  Message
                </button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-zinc-100 dark:border-zinc-800">
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'posts', label: 'Posts', icon: FileText },
              { id: 'requests', label: 'Requests', icon: Activity },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-red-600 text-red-600"
                    : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="min-h-[300px]">
            {activeTab === 'overview' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-1 border border-zinc-100 dark:border-zinc-800">
                    <Droplets className="h-5 w-5 text-red-600" />
                    <div className="text-[10px] font-bold text-zinc-500 uppercase">Blood Group</div>
                    <div className="text-xl font-bold text-zinc-900 dark:text-white">{profile.bloodGroup || 'N/A'}</div>
                  </div>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-1 border border-zinc-100 dark:border-zinc-800">
                    <Heart className="h-5 w-5 text-pink-600" />
                    <div className="text-[10px] font-bold text-zinc-500 uppercase">Donations</div>
                    <div className="text-xl font-bold text-zinc-900 dark:text-white">{profile.donationCount}</div>
                  </div>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-1 border border-zinc-100 dark:border-zinc-800">
                    <UserPlus className="h-5 w-5 text-blue-600" />
                    <div className="text-[10px] font-bold text-zinc-500 uppercase">Followers</div>
                    <div className="text-xl font-bold text-zinc-900 dark:text-white">{profile.followers?.length || 0}</div>
                  </div>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-1 border border-zinc-100 dark:border-zinc-800">
                    <UserMinus className="h-5 w-5 text-amber-600" />
                    <div className="text-[10px] font-bold text-zinc-500 uppercase">Following</div>
                    <div className="text-xl font-bold text-zinc-900 dark:text-white">{profile.following?.length || 0}</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Phone className="h-5 w-5 text-blue-600" />
                      Contact Information
                    </h3>
                    <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-500">Phone Number</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-900 dark:text-white">{profile.phone || 'Private'}</span>
                          {profile.phone && (
                            <a 
                              href={`tel:${profile.phone}`}
                              className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                            >
                              Call
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-500">Location</span>
                        <span className="font-medium text-zinc-900 dark:text-white">{profile.district || profile.division || 'Not Set'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5 text-emerald-600" />
                      Donation History
                    </h3>
                    <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-500">Last Donation</span>
                        <span className="font-medium text-zinc-900 dark:text-white">
                          {profile.donationCount > 0 ? (profile.lastDonationDate || 'Unknown') : 'Never'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-500">Total Donations</span>
                        <span className="font-medium text-zinc-900 dark:text-white">{profile.donationCount} Times</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-500">Next Eligible Date</span>
                        <span className={cn(
                          "font-medium",
                          isAvailable ? "text-emerald-600" : "text-red-600"
                        )}>
                          {isAvailable ? "Available Now" : "Calculating..."}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {(profile.medicalHistory || profile.donationPreferences) && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-zinc-600" />
                      Additional Info
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {profile.medicalHistory && (
                        <div className="p-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-2">
                          <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Medical History</div>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{profile.medicalHistory}</p>
                        </div>
                      )}
                      {profile.donationPreferences && (
                        <div className="p-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-2">
                          <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Donation Preferences</div>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{profile.donationPreferences}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'posts' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {loadingContent ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
                  </div>
                ) : userPosts.length > 0 ? (
                  userPosts.map(post => (
                    <PostItem 
                      key={post.id} 
                      post={post} 
                      profile={currentUser}
                    />
                  ))
                ) : (
                  <div className="text-center py-12 text-zinc-500">
                    No posts yet.
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'requests' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {loadingContent ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
                  </div>
                ) : userRequests.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {userRequests.map(request => (
                      <div 
                        key={request.id}
                        onClick={() => navigate(`/requests?id=${request.id}`)}
                        className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 font-bold text-xs">
                              {request.bloodGroup}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-red-600 transition-colors">
                                {request.hospitalName}
                              </div>
                              <div className="text-xs text-zinc-500">
                                {new Date(request.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <span className={cn(
                            "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                            request.status === 'open' ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"
                          )}>
                            {request.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {request.district}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(request.requiredDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-zinc-500">
                    No blood requests yet.
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UserProfile;
