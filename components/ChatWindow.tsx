
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SendHorizontal, ChevronLeft, Sparkles, Paperclip
} from 'lucide-react';
import { Contact, Message } from '../types';
import Avatar from './Avatar';

interface ChatWindowProps {
  contact: Contact;
  onBack: () => void;
  initialHistory: Message[];
  onSendMessage: (msg: Message) => void;
}

const RECORDING_LIMIT_SEC = 60;

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(2, '0')}`;
};

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  contact, 
  onBack, 
  initialHistory, 
  onSendMessage,
}) => {
  const [messages, setMessages] = useState<Message[]>(initialHistory);
  const [inputValue, setInputValue] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMessages(initialHistory); }, [initialHistory]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSendMessage({ 
      id: Date.now().toString(), 
      role: 'user', 
      type: 'text', 
      content: inputValue.trim(), 
      timestamp: new Date(), 
      status: 'sent' 
    });
    setInputValue('');
  };

  return (
    <div className="flex flex-col h-full bg-black relative overflow-hidden safe-area-bottom">
      <header className="h-[72px] md:h-20 flex items-center justify-between px-4 border-b border-zinc-900 shrink-0 bg-black/80 backdrop-blur-xl z-[60]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden p-2 -ml-2 text-zinc-400"><ChevronLeft size={24} /></button>
          <Avatar src={contact.avatar} name={contact.name} status={contact.status} size="lg" />
          <div className="overflow-hidden">
            <h2 className="font-bold text-[15px] text-white truncate italic">{contact.name}</h2>
            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">{contact.isSelf ? 'Избранное' : 'P2P Меш'}</p>
          </div>
        </div>
        {/* Sparkles button removed as per request */}
      </header>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar relative transition-all duration-300">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div 
              key={msg.id} 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.type === 'text' && (
                    <div className={`px-4 py-2.5 rounded-[1.5rem] text-sm shadow-md ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-zinc-900 text-zinc-100 rounded-tl-none border border-white/5'
                    }`}>
                      {msg.content}
                    </div>
                  )}
                  <span className="text-[9px] text-zinc-600 mt-1 px-2 uppercase font-bold tracking-tighter">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} className="h-32" />
      </div>

      {/* Input Bar */}
      <footer className="shrink-0 p-4 pb-8 bg-gradient-to-t from-black to-transparent z-50">
        <div className="p-1.5 pl-4 rounded-[2.5rem] flex items-center gap-3 liquid-glass border border-white/5 shadow-2xl transition-all">
          <button className="p-2 text-zinc-500 hover:text-white transition-colors"><Paperclip size={22} /></button>
          <input 
            value={inputValue} 
            onChange={e => setInputValue(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Cообщение..." 
            className="flex-1 bg-transparent text-[15px] outline-none text-white py-3 min-w-0" 
          />
          <button 
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className={`w-11 h-11 rounded-full flex items-center justify-center mr-1 text-white shadow-lg active:scale-95 transition-all ${inputValue.trim() ? 'bg-indigo-600' : 'bg-zinc-800 text-zinc-500'}`}
          >
            <SendHorizontal size={20} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ChatWindow;
