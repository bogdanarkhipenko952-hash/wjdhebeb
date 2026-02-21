
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Contact } from '../types';
import Avatar from './Avatar';
import { Search, Zap, Star, Pin } from 'lucide-react';

interface ChatListProps {
  activeContactId: string | null;
  onSelectContact: (contact: Contact) => void;
  onTogglePin?: (id: string) => void;
  searchQuery: string;
  contactsOverride?: Contact[];
}

const ChatList: React.FC<ChatListProps> = ({ activeContactId, onSelectContact, onTogglePin, searchQuery, contactsOverride = [] }) => {
  const filteredContacts = contactsOverride.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto space-y-2 p-4 no-scrollbar pb-32 md:pb-6">
      <div className="px-2 mb-4 flex justify-between items-center">
        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Узлы онлайн ({filteredContacts.length})</h3>
        <Zap size={10} className="text-indigo-500 animate-pulse" />
      </div>
      <AnimatePresence>
        {filteredContacts.length > 0 ? (
          filteredContacts.map((contact, index) => (
            <motion.div
              key={contact.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all duration-300 group relative border cursor-pointer ${
                activeContactId === contact.id
                  ? 'bg-white/10 border-white/20 shadow-lg'
                  : 'hover:bg-white/5 border-transparent hover:border-white/10'
              }`}
              onClick={() => onSelectContact(contact)}
            >
            <div className="relative">
              <Avatar src={contact.avatar} name={contact.name} status={contact.status} size="lg" />
              {contact.isFavorite && !contact.isSelf && (
                <div className="absolute -top-1 -right-1 bg-black rounded-full p-0.5 border border-zinc-800">
                  <Star size={8} className="fill-amber-400 text-amber-400" />
                </div>
              )}
            </div>

            <div className="flex-1 text-left overflow-hidden">
              <div className="flex justify-between items-baseline mb-0.5">
                <h3 className={`font-medium text-[15px] truncate transition-colors flex items-center gap-2 ${
                  activeContactId === contact.id ? 'text-white' : 'text-zinc-200 group-hover:text-white'
                }`}>
                  {contact.name}
                </h3>
                <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">Online</span>
              </div>
              <p className="text-xs text-zinc-400 truncate leading-tight group-hover:text-zinc-300 transition-colors font-light">
                {contact.lastMessage || contact.bio}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onTogglePin && !contact.isSelf && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onTogglePin(contact.id); }}
                  className={`p-2 rounded-full transition-all ${contact.isPinned ? 'text-white bg-white/10' : 'text-zinc-600 hover:text-white hover:bg-white/5 opacity-0 group-hover:opacity-100'}`}
                >
                  <Pin size={14} className={contact.isPinned ? "fill-white" : ""} />
                </button>
              )}
              {activeContactId === contact.id && (
                <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              )}
            </div>
          </motion.div>
        ))
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-full text-zinc-700 p-8 text-center mt-10"
        >
          <div className="w-16 h-16 bg-zinc-900/50 rounded-[1.5rem] flex items-center justify-center mb-6 border border-zinc-800">
             <Zap size={24} className="opacity-20 animate-pulse" />
          </div>
          <p className="text-sm font-bold text-zinc-500">Сигнал потерян</p>
          <p className="text-[9px] mt-2 opacity-40 uppercase tracking-widest font-black leading-relaxed">Ожидание P2P партнеров...</p>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default ChatList;
