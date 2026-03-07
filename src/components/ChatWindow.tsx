import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { Send, User, Check, CheckCheck, Image as ImageIcon, Video, Smile, Paperclip, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import { toast } from 'react-hot-toast';

interface ChatWindowProps {
  roomId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ roomId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ file: File, type: 'image' | 'video' } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    if (!user || (!newMessage.trim() && !attachedFile)) return;

    const msgText = newMessage.trim();
    const fileToUpload = attachedFile;
    
    setNewMessage('');
    setAttachedFile(null);
    setShowEmojiPicker(false);

    try {
      const roomRef = doc(db, 'chatRooms', roomId);
      let mediaUrl = '';
      let mediaType = '';

      if (fileToUpload) {
        setUploading(true);
        const storageRef = ref(storage, `chats/${roomId}/${Date.now()}_${fileToUpload.file.name}`);
        await uploadBytes(storageRef, fileToUpload.file);
        mediaUrl = await getDownloadURL(storageRef);
        mediaType = fileToUpload.type;
        setUploading(false);
      }
      
      // Add message to subcollection
      await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
        senderId: user.uid,
        text: msgText,
        mediaUrl,
        mediaType,
        createdAt: serverTimestamp(),
        read: false
      });

      // Update room last message
      const roomSnap = await (await import('firebase/firestore')).getDoc(roomRef);
      const participants = roomSnap.data()?.participants || [];
      const otherId = participants.find((id: string) => id !== user.uid);

      await updateDoc(roomRef, {
        lastMessage: mediaUrl ? (mediaType === 'image' ? '📷 Photo' : '🎥 Video') : msgText,
        lastMessageAt: serverTimestamp(),
        [`unreadCount.${otherId}`]: increment(1)
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      setAttachedFile({ file, type: 'image' });
    } else if (file.type.startsWith('video/')) {
      setAttachedFile({ file, type: 'video' });
    } else {
      toast.error("Please select an image or video file");
    }
  };

  const onEmojiClick = (emojiObject: any) => {
    setNewMessage(prev => prev + emojiObject.emoji);
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
                    {msg.mediaUrl && (
                      <div className="mb-2 rounded-xl overflow-hidden bg-black/5">
                        {msg.mediaType === 'image' ? (
                          <img 
                            src={msg.mediaUrl} 
                            alt="Shared photo" 
                            className="max-h-60 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(msg.mediaUrl, '_blank')}
                          />
                        ) : (
                          <video 
                            src={msg.mediaUrl} 
                            controls 
                            className="max-h-60 w-full"
                          />
                        )}
                      </div>
                    )}
                    {msg.text && <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
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
      <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 relative">
        <AnimatePresence>
          {attachedFile && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-4 mb-4 p-2 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-700 flex items-center gap-3"
            >
              <div className="h-12 w-12 bg-zinc-100 dark:bg-zinc-700 rounded-xl overflow-hidden flex items-center justify-center">
                {attachedFile.type === 'image' ? (
                  <img src={URL.createObjectURL(attachedFile.file)} className="h-full w-full object-cover" />
                ) : (
                  <Video className="h-6 w-6 text-zinc-400" />
                )}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-xs font-bold truncate">{attachedFile.file.name}</p>
                <p className="text-[10px] text-zinc-500 uppercase">{attachedFile.type}</p>
              </div>
              <button 
                onClick={() => setAttachedFile(null)}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full"
              >
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showEmojiPicker && (
            <div 
              ref={emojiPickerRef}
              className="absolute bottom-full left-4 mb-4 z-50"
            >
              <EmojiPicker 
                onEmojiClick={onEmojiClick}
                theme={document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT}
              />
            </div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <div className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl flex flex-col transition-all focus-within:ring-2 focus-within:ring-red-600">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e as any);
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-3 bg-transparent outline-none text-sm resize-none max-h-32"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
            <div className="flex items-center gap-1 px-2 pb-2">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <Smile className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,video/*"
                className="hidden"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={(!newMessage.trim() && !attachedFile) || uploading}
            className="p-3.5 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20 flex-shrink-0"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;

import { MessageSquare } from 'lucide-react';
