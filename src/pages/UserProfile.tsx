import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { doc, getDoc, collection, query, where, addDoc, serverTimestamp, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { User, MapPin, Droplets, Calendar, CheckCircle, Shield, Heart, Scale, Ruler, MessageSquare, Phone, ArrowLeft, Loader2, UserPlus, UserMinus } from 'lucide-react';
import { BLOOD_GROUPS, cn, canDonate, getBadge } from '../utils/helpers';
import { toast } from 'react-hot-toast';

const UserProfile = () => {
  const { uid } = useParams();
  const { user, profile: currentUser, updateProfileState } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
        navigate('/messages');
      } else {
        // Create new room
        const newRoom = await addDoc(collection(db, 'chatRooms'), {
          participants: [user.uid, uid],
          createdAt: serverTimestamp(),
          lastMessage: '',
          lastMessageAt: serverTimestamp(),
          unreadCount: {
            [user.uid]: 0,
            [uid as string]: 0
          }
        });
        navigate('/messages');
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
        <div className="h-24 bg-red-600 relative">
          <div className="absolute -bottom-10 left-6">
            <div className="h-24 w-24 rounded-3xl bg-white dark:bg-zinc-800 p-1 shadow-xl overflow-hidden ring-4 ring-white dark:ring-zinc-900">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt={profile.name} className="h-full w-full rounded-[1.25rem] object-cover" />
              ) : (
                <div className="h-full w-full rounded-[1.25rem] bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
                  <User className="h-12 w-12 text-zinc-400" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-12 pb-6 px-6 space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  {profile.name}
                  <div className={cn(
                    "h-3 w-3 rounded-full shadow-sm",
                    canDonate(profile.lastDonationDate) ? "bg-emerald-500" : "bg-red-500"
                  )} />
                </h1>
                {profile.isVerified && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full text-[10px] font-bold border border-blue-100 dark:border-blue-900/30">
                    <CheckCircle className="h-2.5 w-2.5 fill-blue-600/10" />
                    Verified
                  </div>
                )}
                {getBadge(profile.donationCount) && (
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-0.5 bg-zinc-50 dark:bg-zinc-900/20 rounded-full text-[10px] font-bold border border-zinc-100 dark:border-zinc-800",
                    getBadge(profile.donationCount)?.color
                  )}>
                    <span>{getBadge(profile.donationCount)?.icon}</span>
                    {getBadge(profile.donationCount)?.name}
                  </div>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Member since {new Date(profile.createdAt).toLocaleDateString()}</p>
            </div>
            {user?.uid !== uid && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFollow}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all shadow-lg",
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
                  className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                >
                  <MessageSquare className="h-4 w-4" />
                  Message
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-1">
              <Droplets className="h-5 w-5 text-red-600" />
              <div className="text-[10px] font-bold text-zinc-500 uppercase">Blood Group</div>
              <div className="text-lg font-bold text-zinc-900 dark:text-white">{profile.bloodGroup || 'Not Set'}</div>
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-1">
              <MapPin className="h-5 w-5 text-blue-600" />
              <div className="text-[10px] font-bold text-zinc-500 uppercase">Location</div>
              <div className="text-base font-bold text-zinc-900 dark:text-white truncate">{profile.district || profile.division || 'Not Set'}</div>
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-1">
              <Calendar className="h-5 w-5 text-emerald-600" />
              <div className="text-[10px] font-bold text-zinc-500 uppercase">Last Donation</div>
              <div className="text-base font-bold text-zinc-900 dark:text-white">
                {profile.donationCount > 0 ? (profile.lastDonationDate || 'Not Set') : 'Never'}
              </div>
            </div>
          </div>

          {(profile.medicalHistory || profile.donationPreferences) && (
            <div className="mt-6 space-y-4">
              {profile.medicalHistory && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-2">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Medical History</div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{profile.medicalHistory}</p>
                </div>
              )}
              {profile.donationPreferences && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-2">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Donation Preferences</div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{profile.donationPreferences}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-600" />
            Impact Stats
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl text-center">
              <div className="text-2xl font-bold text-red-600">{profile.donationCount}</div>
              <div className="text-[10px] font-medium text-zinc-500 uppercase">Donations</div>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl text-center">
              <div className="text-2xl font-bold text-blue-600">{profile.inviteCount}</div>
              <div className="text-[10px] font-medium text-zinc-500 uppercase">Invites</div>
            </div>
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl text-center">
              <div className="text-2xl font-bold text-emerald-600">{profile.followers?.length || 0}</div>
              <div className="text-[10px] font-medium text-zinc-500 uppercase">Followers</div>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl text-center">
              <div className="text-2xl font-bold text-amber-600">{profile.following?.length || 0}</div>
              <div className="text-[10px] font-medium text-zinc-500 uppercase">Following</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Phone className="h-4 w-4 text-blue-600" />
            Contact Info
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium">{profile.phone || 'Private'}</span>
              </div>
              {profile.phone && (
                <a 
                  href={`tel:${profile.phone}`}
                  className="text-[10px] font-bold text-blue-600 uppercase hover:underline"
                >
                  Call Now
                </a>
              )}
            </div>
            <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
              <MapPin className="h-4 w-4 text-zinc-400" />
              <span className="text-sm font-medium">{profile.upazila ? `${profile.upazila}, ` : ''}{profile.district}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
