import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, User, Search, ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ChatWindow from '../components/ChatWindow';
import { cn } from '../utils/helpers';

const Messages = () => {
  const { user, profile } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(searchParams.get('room'));
  const [roomParticipants, setRoomParticipants] = useState<{ [key: string]: any }>({});
  const navigate = useNavigate();

  useEffect(() => {
    const roomId = searchParams.get('room');
    if (roomId) {
      setSelectedRoomId(roomId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chatRooms'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const roomList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => {
          const timeA = a.lastMessageAt?.toMillis() || 0;
          const timeB = b.lastMessageAt?.toMillis() || 0;
          return timeB - timeA;
        });
      setRooms(roomList);
      
      // Fetch participant details
      const newParticipants = { ...roomParticipants };
      for (const room of roomList as any[]) {
        const otherId = room.participants.find((id: string) => id !== user.uid);
        if (otherId && !newParticipants[otherId]) {
          const userDoc = await getDoc(doc(db, 'users', otherId));
          if (userDoc.exists()) {
            newParticipants[otherId] = userDoc.data();
          }
        }
      }
      setRoomParticipants(newParticipants);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching chat rooms:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-120px)] flex bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800">
      {/* Sidebar */}
      <div className={`w-full md:w-96 border-r border-zinc-100 dark:border-zinc-800 flex flex-col ${selectedRoomId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-3">
              <div className="h-10 w-10 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/20">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              Messages
            </h1>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input 
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-red-600/20 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="h-8 w-8 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin" />
              <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Loading chats...</p>
            </div>
          ) : rooms.length > 0 ? (
            <div className="p-4 space-y-2">
              {rooms.map((room) => {
                const otherId = room.participants.find((id: string) => id !== user.uid);
                const participant = roomParticipants[otherId];
                const unread = room.unreadCount?.[user.uid] || 0;
                const isActive = selectedRoomId === room.id;

                return (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={cn(
                      "w-full p-4 flex items-center gap-4 rounded-[1.5rem] transition-all text-left group relative",
                      isActive 
                        ? "bg-red-50 dark:bg-red-900/10 shadow-sm" 
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    )}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="active-room"
                        className="absolute left-0 top-4 bottom-4 w-1 bg-red-600 rounded-full"
                      />
                    )}
                    <div className="relative flex-shrink-0">
                      <div className="h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shadow-sm ring-2 ring-white dark:ring-zinc-900">
                        {participant?.photoURL ? (
                          <img src={participant.photoURL} alt={participant.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <User className="h-7 w-7 text-zinc-300" />
                          </div>
                        )}
                      </div>
                      {participant?.isOnline && (
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className={cn(
                          "font-black text-sm truncate",
                          isActive ? "text-red-600" : "text-zinc-900 dark:text-white"
                        )}>
                          {participant?.name || 'Loading...'}
                        </h3>
                        {room.lastMessageAt && (
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                            {new Date(room.lastMessageAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "text-xs truncate font-medium",
                          unread > 0 ? 'text-zinc-900 dark:text-white font-bold' : 'text-zinc-500'
                        )}>
                          {room.lastMessage || 'No messages yet'}
                        </p>
                        {unread > 0 && (
                          <div className="h-5 w-5 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-red-600/20">
                            {unread}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 px-8 space-y-6">
              <div className="h-24 w-24 bg-zinc-50 dark:bg-zinc-800/50 rounded-[2rem] flex items-center justify-center mx-auto rotate-12">
                <MessageSquare className="h-10 w-10 text-zinc-200 -rotate-12" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-zinc-900 dark:text-white">No Chats Yet</h3>
                <p className="text-sm text-zinc-500 font-medium">Connect with donors and start saving lives through conversation.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`flex-1 flex flex-col bg-zinc-50/30 dark:bg-zinc-900/30 ${!selectedRoomId ? 'hidden md:flex' : 'flex'}`}>
        {selectedRoomId ? (
          (() => {
            const selectedRoom = rooms.find(r => r.id === selectedRoomId);
            const otherParticipantId = selectedRoom?.participants?.find((id: string) => id !== user.uid);
            const otherParticipant = otherParticipantId ? roomParticipants[otherParticipantId] : null;

            return (
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 shadow-sm z-10">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedRoomId(null)} className="md:hidden p-2 -ml-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                      <ArrowLeft className="h-6 w-6 text-zinc-400" />
                    </button>
                    <div 
                      onClick={() => otherParticipantId && navigate(`/user/${otherParticipantId}`)}
                      className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden cursor-pointer hover:ring-2 hover:ring-red-600/20 transition-all shadow-sm"
                    >
                      {otherParticipant?.photoURL ? (
                        <img src={otherParticipant.photoURL} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <User className="h-6 w-6 text-zinc-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 
                        onClick={() => otherParticipantId && navigate(`/user/${otherParticipantId}`)}
                        className="font-black text-zinc-900 dark:text-white cursor-pointer hover:text-red-600 transition-colors"
                      >
                        {otherParticipant?.name || 'Loading...'}
                      </h3>
                      <div className="flex items-center gap-2">
                        {otherParticipant?.bloodGroup && (
                          <span className="text-[10px] font-black bg-red-50 dark:bg-red-900/20 text-red-600 px-2 py-0.5 rounded-lg uppercase tracking-widest">
                            Group {otherParticipant.bloodGroup}
                          </span>
                        )}
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                          <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                          Online
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => otherParticipantId && navigate(`/user/${otherParticipantId}`)}
                      className="hidden sm:flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                      <User size={14} />
                      View Profile
                    </button>
                  </div>
                </div>

                <ChatWindow roomId={selectedRoomId} />
              </div>
            );
          })()
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center p-12 text-center space-y-8">
            <div className="relative">
              <div className="h-32 w-32 bg-white dark:bg-zinc-900 rounded-[3rem] shadow-2xl flex items-center justify-center rotate-12 border border-zinc-100 dark:border-zinc-800">
                <MessageSquare className="h-14 w-14 text-red-600 -rotate-12" />
              </div>
              <div className="absolute -bottom-4 -right-4 h-16 w-16 bg-red-600 rounded-[1.5rem] shadow-xl flex items-center justify-center text-white rotate-12">
                <User className="h-8 w-8" />
              </div>
            </div>
            <div className="max-w-xs space-y-3">
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white">Your Inbox</h2>
              <p className="text-zinc-500 font-medium leading-relaxed">
                Select a conversation from the sidebar to start messaging. Your chats are secure and private.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col items-center gap-1">
                <div className="h-1 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">End-to-end</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="h-1 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Encrypted</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
