import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, User, Search, ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ChatWindow from '../components/ChatWindow';

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
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-120px)] flex bg-white dark:bg-zinc-900 rounded-3xl shadow-xl overflow-hidden border border-zinc-100 dark:border-zinc-800">
      {/* Sidebar */}
      <div className={`w-full md:w-80 border-r border-zinc-100 dark:border-zinc-800 flex flex-col ${selectedRoomId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-red-600" />
            Messages
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
            </div>
          ) : rooms.length > 0 ? (
            <div className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
              {rooms.map((room) => {
                const otherId = room.participants.find((id: string) => id !== user.uid);
                const participant = roomParticipants[otherId];
                const unread = room.unreadCount?.[user.uid] || 0;

                return (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all text-left ${selectedRoomId === room.id ? 'bg-zinc-50 dark:bg-zinc-800/50' : ''}`}
                  >
                    <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex-shrink-0 overflow-hidden">
                      {participant?.photoURL ? (
                        <img src={participant.photoURL} alt={participant.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <User className="h-6 w-6 text-zinc-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <h3 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                          {participant?.name || 'Loading...'}
                        </h3>
                        {room.lastMessageAt && (
                          <span className="text-[10px] text-zinc-400">
                            {new Date(room.lastMessageAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs truncate ${unread > 0 ? 'font-bold text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>
                        {room.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                    {unread > 0 && (
                      <div className="h-5 w-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unread}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 px-6 space-y-4">
              <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                <MessageSquare className="h-8 w-8 text-zinc-300" />
              </div>
              <p className="text-sm text-zinc-500 font-medium">No conversations yet. Start chatting with donors!</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`flex-1 flex flex-col ${!selectedRoomId ? 'hidden md:flex' : 'flex'}`}>
        {selectedRoomId ? (
          (() => {
            const selectedRoom = rooms.find(r => r.id === selectedRoomId);
            const otherParticipantId = selectedRoom?.participants?.find((id: string) => id !== user.uid);
            const otherParticipant = otherParticipantId ? roomParticipants[otherParticipantId] : null;

            return (
              <div className="h-full flex flex-col">
                <div className="md:hidden p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                  <button onClick={() => setSelectedRoomId(null)} className="p-2 -ml-2">
                    <ArrowLeft className="h-5 w-5 text-zinc-400" />
                  </button>
                  <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    {otherParticipant?.photoURL ? (
                      <img src={otherParticipant.photoURL} className="h-full w-full object-cover" />
                    ) : <User className="h-4 w-4 m-2 text-zinc-400" />}
                  </div>
                  <span className="font-bold text-sm">{otherParticipant?.name || 'Loading...'}</span>
                </div>
                <ChatWindow roomId={selectedRoomId} />
              </div>
            );
          })()
        ) : (
          <div className="flex-1 flex flex-center justify-center items-center bg-zinc-50/50 dark:bg-zinc-800/10">
            <div className="text-center space-y-4">
              <div className="h-20 w-20 bg-white dark:bg-zinc-900 rounded-3xl shadow-sm flex items-center justify-center mx-auto">
                <MessageSquare className="h-10 w-10 text-zinc-200" />
              </div>
              <p className="text-zinc-400 font-medium">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
