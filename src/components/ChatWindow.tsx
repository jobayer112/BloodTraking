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
            const isEditing = editingMessageId === msg.id;

            return (
              <div key={msg.id} className="space-y-1 group">
                {showTime && msg.createdAt && (
                  <div className="text-center py-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      {msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                  {/* Edit/Delete Actions (Left side for Me) */}
                  {isMe && !isEditing && (
                    <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex flex-col gap-1 mb-1">
                      <button 
                        onClick={() => { setEditingMessageId(msg.id); setEditText(msg.text || ''); }}
                        className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors shadow-sm"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteMessage(msg.id, e)}
                        className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shadow-sm"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                    isMe 
                      ? `${activeTheme.color} text-white rounded-tr-none` 
                      : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-tl-none border border-zinc-100 dark:border-zinc-700'
                  }`}>
                    {msg.mediaUrl && !isEditing && (
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
                    
                    {isEditing ? (
                      <div className="min-w-[200px]">
                        <textarea 
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full p-2 bg-black/10 dark:bg-white/10 rounded-lg outline-none text-inherit resize-none placeholder-white/50"
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
                        <div className="flex justify-end gap-2 mt-2">
                          <button 
                            onClick={() => setEditingMessageId(null)} 
                            className="p-1.5 hover:bg-black/10 rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                          <button 
                            onClick={() => handleUpdateMessage(msg.id)} 
                            className="p-1.5 hover:bg-black/10 rounded-lg transition-colors"
                            title="Save"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {msg.text && (
                          <p className="leading-relaxed whitespace-pre-wrap">
                            {msg.text}
                            {msg.isEdited && <span className="text-[10px] opacity-70 italic ml-1">(edited)</span>}
                          </p>
                        )}
                        <div className={`flex items-center gap-1 mt-1 justify-end ${isMe ? activeTheme.text : 'text-zinc-400'}`}>
                          <span className="text-[9px]">
                            {msg.createdAt ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                          </span>
                          {isMe && (
                            msg.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
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

        <AnimatePresence>
          {showThemePicker && (
            <div 
              ref={themePickerRef}
              className="absolute bottom-full right-4 mb-4 z-50 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-700 p-3 grid grid-cols-3 gap-2"
            >
              {THEMES.map(theme => (
                <button
                  key={theme.name}
                  onClick={() => handleThemeChange(theme.name)}
                  className={`w-8 h-8 rounded-full ${theme.color} hover:opacity-80 transition-opacity ${currentTheme === theme.name ? 'ring-2 ring-offset-2 ring-zinc-400 dark:ring-zinc-500' : ''}`}
                  title={theme.name}
                />
              ))}
            </div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <div className={`flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl flex flex-col transition-all ${activeTheme.ring}`}>
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
              <button
                type="button"
                onClick={() => setShowThemePicker(!showThemePicker)}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
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
            className={`p-3.5 ${activeTheme.color} text-white rounded-2xl ${activeTheme.hover} transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${activeTheme.shadow} flex-shrink-0`}
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
