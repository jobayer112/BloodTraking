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
    { role: 'bot', text: 'Hello! I am your BloodTraking assistant. How can I help you today? You can ask me about blood donation, eligibility, or how to use this app.' }
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
        model: "gemini-3.1-pro-preview",
        contents: userMessage,
        config: {
          systemInstruction: "You are a professional and caring medical assistant for BloodTraking, a blood donation app. Answer questions about blood donation, how to use the app, and medical facts about blood types. Keep responses concise, helpful, and formatted with markdown for readability. If you don't know something, suggest contacting a medical professional."
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
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-16 right-0 w-[calc(100vw-2rem)] sm:w-[400px] h-[500px] max-h-[70vh] bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl border border-zinc-100 dark:border-zinc-800 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-red-600 text-white flex justify-between items-center">
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-3 max-w-[90%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                  <div className={cn(
                    "h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0",
                    msg.role === 'bot' ? "bg-red-50 dark:bg-red-900/20 text-red-600" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                  )}>
                    {msg.role === 'bot' ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
                  </div>
                  <div className={cn(
                    "p-3 rounded-2xl text-sm",
                    msg.role === 'user' 
                      ? 'bg-red-600 text-white rounded-tr-none' 
                      : 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 rounded-tl-none'
                  )}>
                    <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
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
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask anything..."
                  className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-red-600"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="p-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </motion.div>
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
