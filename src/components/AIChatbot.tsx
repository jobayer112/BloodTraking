import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Bot, User, Sparkles, Loader2, MessageCircle } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import { cn } from '../utils/helpers';

const AIChatbot = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
    { role: 'bot', text: 'Assalamuallaikum! I am your BloodTraking AI assistant. I can help you with blood donation info or answer any other questions you have. How can I assist you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: userMessage,
        config: {
          systemInstruction: "You are a professional, helpful, and caring AI assistant for BloodTraking. You are an expert in blood donation, medical facts about blood types, and how to use the BloodTraking app. However, you are also a general-purpose AI and can answer ANY question the user asks, whether it's about science, history, general knowledge, or daily life. Use 'Assalamuallaikum' as a greeting when responding in Bengali or to Muslim users. Keep responses concise, helpful, and formatted with markdown for readability. Always respond in the language the user is using (English or Bengali)."
        }
      });

      const botText = response.text || "I'm sorry, I couldn't process that request.";
      setMessages(prev => [...prev, { role: 'bot', text: botText }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999]">
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[-1] sm:hidden"
            />
            
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              className="fixed inset-0 sm:absolute sm:inset-auto sm:bottom-16 sm:right-0 w-full sm:w-[400px] h-full sm:h-[500px] sm:max-h-[80vh] bg-white dark:bg-zinc-900 sm:rounded-[32px] shadow-2xl border-t sm:border border-zinc-100 dark:border-zinc-800 flex flex-col overflow-hidden z-[10000]"
            >
            {/* Header */}
            <div className="p-4 bg-red-600 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-bold text-sm">BloodTraking AI</div>
                  <div className="text-[10px] opacity-80 flex items-center gap-1">
                    <Sparkles className="h-2 w-2" /> Online
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth overscroll-contain">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-3 max-w-[95%] sm:max-w-[90%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                  <div className={cn(
                    "h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0",
                    msg.role === 'bot' ? "bg-red-50 dark:bg-red-900/20 text-red-600" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                  )}>
                    {msg.role === 'bot' ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
                  </div>
                  <div className={cn(
                    "p-3 rounded-2xl text-sm break-words",
                    msg.role === 'user' 
                      ? 'bg-red-600 text-white rounded-tr-none' 
                      : 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 rounded-tl-none'
                  )}>
                    <div className="markdown-body prose prose-sm dark:prose-invert max-w-none overflow-hidden">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl rounded-tl-none">
                    <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 shrink-0">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask anything..."
                  className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-600 min-w-0"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 shrink-0"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 bg-red-600 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:bg-red-700 transition-all"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </motion.button>
    </div>
  );
};

export default AIChatbot;
