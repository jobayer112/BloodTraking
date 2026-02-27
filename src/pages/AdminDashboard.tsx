import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { collection, query, onSnapshot, limit, orderBy, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { 
  Users, 
  Droplets, 
  AlertTriangle, 
  ShieldCheck, 
  Trash2, 
  Ban, 
  CheckCircle,
  BarChart3,
  Search
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { UserProfile, BloodRequest, Post } from '../types';

const AdminDashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeDonors: 0,
    emergencyRequests: 0,
    totalPosts: 0
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    // Real-time Stats
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const allUsers = snap.docs.map(d => d.data() as UserProfile);
      setStats(prev => ({
        ...prev,
        totalUsers: allUsers.length,
        activeDonors: allUsers.filter(u => u.role === 'donor' && u.isAvailable).length
      }));
    });

    const unsubRequests = onSnapshot(query(collection(db, 'bloodRequests'), where('status', '==', 'open')), (snap) => {
      setStats(prev => ({ ...prev, emergencyRequests: snap.size }));
    });

    const unsubPosts = onSnapshot(collection(db, 'posts'), (snap) => {
      setStats(prev => ({ ...prev, totalPosts: snap.size }));
    });

    // Real-time Users List
    const unsubUsersList = onSnapshot(query(collection(db, 'users'), limit(50)), (snap) => {
      setUsers(snap.docs.map(doc => doc.data() as UserProfile));
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubRequests();
      unsubPosts();
      unsubUsersList();
    };
  }, [profile]);

  const handleVerify = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isVerified: !currentStatus
      });
      toast.success('User status updated');
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      toast.success('Post deleted');
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-6 max-w-md px-4">
          <div className="h-20 w-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="h-10 w-10 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Admin Access Required</h2>
            <p className="text-zinc-500">This area is restricted to administrators only. Please log in with an authorized administrator account.</p>
          </div>
          <button 
            onClick={() => {
              auth.signOut();
              window.location.href = '/login';
            }}
            className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Lock className="h-4 w-4" />
            Login as Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold tracking-tight">Admin Control Panel</h1>
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
          <BarChart3 className="h-4 w-4" />
          Real-time Analytics
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/10' },
          { label: 'Active Donors', value: stats.activeDonors, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/10' },
          { label: 'Open Requests', value: stats.emergencyRequests, icon: Droplets, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/10' },
          { label: 'Community Posts', value: stats.totalPosts, icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-4"
          >
            <div className={stat.bg + " h-12 w-12 rounded-2xl flex items-center justify-center"}>
              <stat.icon className={stat.color + " h-6 w-6"} />
            </div>
            <div>
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="text-sm text-zinc-500 font-medium">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* User Management Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="text-xl font-bold">User Management</h3>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search users..." 
              className="pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs font-bold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Blood Group</th>
                <th className="px-6 py-4">District</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {users.map((user) => (
                <tr key={user.uid} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        <Users className="h-5 w-5 text-zinc-400" />
                      </div>
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-white">{user.name}</div>
                        <div className="text-xs text-zinc-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg font-bold">
                      {user.bloodGroup || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                    {user.district || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {user.isVerified ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                          <CheckCircle className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-zinc-400">Unverified</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {!user.isVerified && (
                        <button 
                          onClick={() => handleVerify(user.uid, user.isVerified)}
                          className="flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                        >
                          <ShieldCheck className="h-3 w-3" /> Verify
                        </button>
                      )}
                      {user.isVerified && (
                        <button 
                          onClick={() => handleVerify(user.uid, user.isVerified)}
                          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 rounded-lg transition-colors"
                          title="Unverify User"
                        >
                          <ShieldCheck className="h-5 w-5" />
                        </button>
                      )}
                      <button 
                        className="p-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 rounded-lg transition-colors"
                        title="Ban User"
                      >
                        <Ban className="h-5 w-5" />
                      </button>
                      <button 
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-lg transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
