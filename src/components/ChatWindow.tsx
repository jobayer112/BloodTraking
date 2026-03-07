import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { Send, User, Check, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatWindowProps {
  roomId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ roomId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !roomId) return;

    const q = query(
      collection(db, 'chatRooms', roomId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgList);
      setLoading(false);
      
      // Mark as read
      const unreadMsgs = snapshot.docs.filter(doc => doc.data().senderId !== user.uid && !doc.data().read);
      unreadMsgs.forEach(msg => {
        updateDoc(doc(db, 'chatRooms', roomId, 'messages', msg.id), { read: true });
      });

      // Reset unread count for current user
      updateDoc(doc(db, 'chatRooms', roomId), {
        [`unreadCount.${user.uid}`]: 0
      });
    });

    return () => unsubscribe();
  }, [user, roomId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    const msg = newMessage.trim();
    setNewMessage('');

    try {
      const roomRef = doc(db, 'chatRooms', roomId);
      
      // Add message to subcollection
      await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
        senderId: user.uid,
        text: msg,
        createdAt: serverTimestamp(),
        read: false
      });

      // Update room last message
      const roomSnap = await (await import('firebase/firestore')).getDoc(roomRef);
      const participants = roomSnap.data()?.participants || [];
      const otherId = participants.find((id: string) => id !== user.uid);

      await updateDoc(roomRef, {
        lastMessage: msg,
        lastMessageAt: serverTimestamp(),
        [`unreadCount.${otherId}`]: increment(1)
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50/30 dark:bg-zinc-900/50">
      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
      >
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg, index) => {
            const isMe = msg.senderId === user?.uid;
            const showTime = index === 0 || (msg.createdAt && messages[index-1].createdAt && 
              msg.createdAt.toDate().getTime() - messages[index-1].createdAt.toDate().getTime() > 300000);

            return (
              <div key={msg.id} className="space-y-1">
                {showTime && msg.createdAt && (
                  <div className="text-center py-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      {msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                    isMe 
                      ? 'bg-red-600 text-white rounded-tr-none' 
                      : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-tl-none border border-zinc-100 dark:border-zinc-700'
                  }`}>
                    <p className="leading-relaxed">{msg.text}</p>
                    <div className={`flex items-center gap-1 mt-1 justify-end ${isMe ? 'text-red-200' : 'text-zinc-400'}`}>
                      <span className="text-[9px]">
                        {msg.createdAt ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                      </span>
                      {isMe && (
                        msg.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
            <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-zinc-300" />
            </div>
            <p className="text-sm font-medium">Say hello to start the conversation!</p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl outline-none focus:ring-2 focus:ring-red-600 text-sm transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;

import { MessageSquare } from 'lucide-react';
