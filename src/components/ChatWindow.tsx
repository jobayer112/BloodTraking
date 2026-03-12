import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { Send, User, Check, CheckCheck, Image as ImageIcon, Video, Smile, Paperclip, X, Loader2, Palette, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import { toast } from 'react-hot-toast';
import { cn } from '../utils/helpers';

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
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('Red');
  const [attachedFile, setAttachedFile] = useState<{ file: File, type: 'image' | 'video' } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const themePickerRef = useRef<HTMLDivElement>(null);

  const THEMES = [
    { name: 'Red', color: 'bg-red-600', text: 'text-red-200', hover: 'hover:bg-red-700', ring: 'focus-within:ring-red-600', shadow: 'shadow-red-600/20' },
    { name: 'Blue', color: 'bg-blue-600', text: 'text-blue-200', hover: 'hover:bg-blue-700', ring: 'focus-within:ring-blue-600', shadow: 'shadow-blue-600/20' },
    { name: 'Green', color: 'bg-emerald-600', text: 'text-emerald-200', hover: 'hover:bg-emerald-700', ring: 'focus-within:ring-emerald-600', shadow: 'shadow-emerald-600/20' },
    { name: 'Purple', color: 'bg-purple-600', text: 'text-purple-200', hover: 'hover:bg-purple-700', ring: 'focus-within:ring-purple-600', shadow: 'shadow-purple-600/20' },
    { name: 'Orange', color: 'bg-orange-600', text: 'text-orange-200', hover: 'hover:bg-orange-700', ring: 'focus-within:ring-orange-600', shadow: 'shadow-orange-600/20' },
    { name: 'Pink', color: 'bg-pink-600', text: 'text-pink-200', hover: 'hover:bg-pink-700', ring: 'focus-within:ring-pink-600', shadow: 'shadow-pink-600/20' },
  ];

  const activeTheme = THEMES.find(t => t.name === currentTheme) || THEMES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (themePickerRef.current && !themePickerRef.current.contains(event.target as Node)) {
        setShowThemePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = onSnapshot(doc(db, 'chatRooms', roomId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.theme) {
          setCurrentTheme(data.theme);
        }
      }
    }, (error) => {
      console.error("Error fetching room theme:", error);
    });
    return () => unsubscribe();
  }, [roomId]);

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
    }, (error) => {
      console.error("Error fetching messages:", error);
      setLoading(false);
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

  const handleDeleteMessage = async (messageId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      await deleteDoc(doc(db, 'chatRooms', roomId, 'messages', messageId));
      toast.success("Message deleted");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete message");
    }
  };

  const handleUpdateMessage = async (messageId: string) => {
    if (!editText.trim()) return;
    try {
      await updateDoc(doc(db, 'chatRooms', roomId, 'messages', messageId), {
        text: editText.trim(),
        isEdited: true
      });
      setEditingMessageId(null);
      setEditText('');
      toast.success("Message updated");
    } catch (error) {
      console.error("Error updating message:", error);
      toast.error("Failed to update message");
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

  const handleThemeChange = async (themeName: string) => {
    setCurrentTheme(themeName);
    setShowThemePicker(false);
    try {
      await updateDoc(doc(db, 'chatRooms', roomId), {
        theme: themeName
      });
    } catch (error) {
      console.error("Error updating theme:", error);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50/30 dark:bg-zinc-900/50">
      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="h-10 w-10 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin" />
            <p className="text-zinc-500 font-bold animate-pulse">Loading messages...</p>
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg, index) => {
            const isMe = msg.senderId === user?.uid;
            const showTime = index === 0 || (msg.createdAt && messages[index-1].createdAt && 
              msg.createdAt.toDate().getTime() - messages[index-1].createdAt.toDate().getTime() > 300000);
            const isEditing = editingMessageId === msg.id;

            return (
              <div key={msg.id} className="space-y-2 group">
                {showTime && msg.createdAt && (
                  <div className="flex items-center gap-4 py-4">
                    <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      {msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                )}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-3`}>
                  {/* Edit/Delete Actions (Left side for Me) */}
                  {isMe && !isEditing && (
                    <div className="opacity-0 group-hover:opacity-100 transition-all flex flex-col gap-1 mb-1 scale-90 group-hover:scale-100">
                      <button 
                        onClick={() => { setEditingMessageId(msg.id); setEditText(msg.text || ''); }}
                        className="p-2 bg-white dark:bg-zinc-800 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shadow-sm border border-zinc-100 dark:border-zinc-700"
                        title="Edit"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteMessage(msg.id, e)}
                        className="p-2 bg-white dark:bg-zinc-800 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shadow-sm border border-zinc-100 dark:border-zinc-700"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}

                  <div className={cn(
                    "max-w-[80%] p-4 rounded-[1.5rem] text-sm shadow-sm transition-all",
                    isMe 
                      ? `${activeTheme.color} text-white rounded-br-none shadow-xl ${activeTheme.shadow}` 
                      : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-bl-none border border-zinc-100 dark:border-zinc-700'
                  )}>
                    {msg.mediaUrl && !isEditing && (
                      <div className="mb-3 rounded-2xl overflow-hidden bg-black/5 ring-1 ring-black/10">
                        {msg.mediaType === 'image' ? (
                          <img 
                            src={msg.mediaUrl} 
                            alt="Shared photo" 
                            className="max-h-80 w-full object-cover cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => window.open(msg.mediaUrl, '_blank')}
                          />
                        ) : (
                          <video 
                            src={msg.mediaUrl} 
                            controls 
                            className="max-h-80 w-full"
                          />
                        )}
                      </div>
                    )}
                    
                    {isEditing ? (
                      <div className="min-w-[240px] space-y-3">
                        <textarea 
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full p-3 bg-black/10 dark:bg-white/10 rounded-xl outline-none text-inherit resize-none placeholder-white/50 border border-white/10"
                          rows={3}
                          autoFocus
                          placeholder="Edit message..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleUpdateMessage(msg.id);
                            } else if (e.key === 'Escape') {
                              setEditingMessageId(null);
                            }
                          }}
                        />
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => setEditingMessageId(null)} 
                            className="p-2 hover:bg-black/10 rounded-xl transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                          >
                            <X size={14} />
                            Cancel
                          </button>
                          <button 
                            onClick={() => handleUpdateMessage(msg.id)} 
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                          >
                            <Check size={14} />
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {msg.text && (
                          <p className="leading-relaxed whitespace-pre-wrap font-medium">
                            {msg.text}
                            {msg.isEdited && <span className="text-[10px] opacity-60 italic ml-2 font-black uppercase tracking-widest">(edited)</span>}
                          </p>
                        )}
                        <div className={cn(
                          "flex items-center gap-1.5 mt-2 justify-end",
                          isMe ? activeTheme.text : 'text-zinc-400'
                        )}>
                          <span className="text-[9px] font-black tracking-widest uppercase">
                            {msg.createdAt ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                          </span>
                          {isMe && (
                            msg.read 
                              ? <CheckCheck className="h-3.5 w-3.5 text-white" /> 
                              : <Check className="h-3.5 w-3.5 opacity-60" />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="h-24 w-24 bg-white dark:bg-zinc-800 rounded-[2rem] flex items-center justify-center shadow-xl border border-zinc-100 dark:border-zinc-700 rotate-12">
              <MessageSquare className="h-10 w-10 text-red-600 -rotate-12" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-zinc-900 dark:text-white">No Messages Yet</h3>
              <p className="text-sm font-medium text-zinc-500 max-w-[200px] mx-auto">Say hello to start the conversation with this donor!</p>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 relative">
        <AnimatePresence>
          {attachedFile && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full left-6 right-6 mb-6 p-3 bg-white dark:bg-zinc-800 rounded-[2rem] shadow-2xl border border-zinc-100 dark:border-zinc-700 flex items-center gap-4"
            >
              <div className="h-14 w-14 bg-zinc-100 dark:bg-zinc-700 rounded-2xl overflow-hidden flex items-center justify-center ring-1 ring-black/5">
                {attachedFile.type === 'image' ? (
                  <img src={URL.createObjectURL(attachedFile.file)} className="h-full w-full object-cover" />
                ) : (
                  <Video className="h-6 w-6 text-red-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-zinc-900 dark:text-white truncate">{attachedFile.file.name}</p>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{attachedFile.type}</p>
              </div>
              <button 
                onClick={() => setAttachedFile(null)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showEmojiPicker && (
            <div 
              ref={emojiPickerRef}
              className="absolute bottom-full left-6 mb-6 z-50 shadow-2xl rounded-3xl overflow-hidden border border-zinc-100 dark:border-zinc-700"
            >
              <EmojiPicker 
                onEmojiClick={onEmojiClick}
                theme={document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT}
                width={320}
                height={400}
              />
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showThemePicker && (
            <div 
              ref={themePickerRef}
              className="absolute bottom-full right-6 mb-6 z-50 bg-white dark:bg-zinc-800 rounded-[2rem] shadow-2xl border border-zinc-100 dark:border-zinc-700 p-4 grid grid-cols-3 gap-3"
            >
              {THEMES.map(theme => (
                <button
                  key={theme.name}
                  onClick={() => handleThemeChange(theme.name)}
                  className={cn(
                    "w-10 h-10 rounded-2xl transition-all flex items-center justify-center",
                    theme.color,
                    currentTheme === theme.name ? "ring-4 ring-zinc-100 dark:ring-zinc-700 scale-110" : "hover:scale-105"
                  )}
                  title={theme.name}
                >
                  {currentTheme === theme.name && <Check className="h-5 w-5 text-white" />}
                </button>
              ))}
            </div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSendMessage} className="flex items-end gap-3">
          <div className={cn(
            "flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-[2rem] flex flex-col transition-all focus-within:bg-white dark:focus-within:bg-zinc-800 focus-within:shadow-xl focus-within:shadow-zinc-900/5",
            activeTheme.ring
          )}>
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
              className="w-full px-6 py-4 bg-transparent outline-none text-sm resize-none max-h-40 font-medium"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
            <div className="flex items-center gap-1 px-4 pb-3">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
              >
                <Smile className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setShowThemePicker(!showThemePicker)}
                className="p-2.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
              >
                <Palette className="h-5 w-5" />
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
            className={cn(
              "h-[56px] w-[56px] flex items-center justify-center rounded-[1.5rem] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl flex-shrink-0",
              activeTheme.color,
              activeTheme.hover,
              activeTheme.shadow
            )}
          >
            {uploading ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <Send className="h-6 w-6 text-white" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;

import { MessageSquare } from 'lucide-react';
