import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Bell, Check, Trash2, Droplets, MessageSquare, ShieldCheck, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Notification } from '../types';
import { cn } from '../utils/helpers';

const Notifications = () => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', profile.uid),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      setNotifications(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [profile]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      toast.error('Failed to update notification');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'request': return <Droplets className="h-5 w-5 text-red-600" />;
      case 'match': return <ShieldCheck className="h-5 w-5 text-emerald-600" />;
      case 'social': return <MessageSquare className="h-5 w-5 text-blue-600" />;
      default: return <Bell className="h-5 w-5 text-zinc-400" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <button 
          onClick={fetchNotifications}
          className="text-sm font-bold text-red-600 hover:underline"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.length > 0 ? notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "p-6 rounded-3xl border transition-all flex gap-4 items-start",
                notification.isRead 
                  ? "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 opacity-70" 
                  : "bg-red-50/30 dark:bg-red-900/5 border-red-100 dark:border-red-900/20 shadow-sm"
              )}
            >
              <div className="h-12 w-12 rounded-2xl bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm flex-shrink-0">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-zinc-900 dark:text-white">{notification.title}</h3>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{notification.body}</p>
                {!notification.isRead && (
                  <button 
                    onClick={() => markAsRead(notification.id)}
                    className="text-xs font-bold text-red-600 flex items-center gap-1 pt-2 hover:underline"
                  >
                    <Check className="h-3 w-3" />
                    Mark as read
                  </button>
                )}
              </div>
            </motion.div>
          )) : (
            <div className="text-center py-20 space-y-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
              <Bell className="h-12 w-12 text-zinc-300 mx-auto" />
              <p className="text-zinc-500 font-medium">No notifications yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
