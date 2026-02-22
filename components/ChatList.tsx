
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
  stories?: any[];
  onAddStory?: () => void;
}

const ChatList: React.FC<ChatListProps> = ({ 
  activeContactId, 
  onSelectContact, 
  onTogglePin, 
  searchQuery, 
  contactsOverride = [],
  stories = [],
  onAddStory
}) => {
  const [viewedGroups, setViewedGroups] = React.useState<Set<string>>(new Set());
  const [activeStoryGroup, setActiveStoryGroup] = React.useState<any | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = React.useState(0);

  const handleStoryClick = (group: any) => {
    setActiveStoryGroup(group);
    setCurrentStoryIndex(0);
    setViewedGroups(prev => new Set(prev).add(group.userId));
  };

  const nextStory = () => {
    if (activeStoryGroup && currentStoryIndex < activeStoryGroup.stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else {
      setActiveStoryGroup(null);
    }
  };
  const filteredContacts = contactsOverride.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto space-y-2 p-4 pb-32 md:pb-6">
      {/* Stories Section */}
      <div className="mb-6 overflow-x-auto pb-4 scrollbar-hide flex gap-4 px-2">
        <div 
          onClick={onAddStory}
          className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group"
        >
          <div className="w-16 h-16 rounded-full bg-zinc-900 border-2 border-dashed border-zinc-700 flex items-center justify-center group-hover:border-indigo-500 transition-colors relative overflow-hidden">
            <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-2xl text-zinc-500 group-hover:text-indigo-400 transition-colors">+</span>
          </div>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-white transition-colors">История</span>
        </div>
        
        {stories.map((group, i) => {
          const isViewed = viewedGroups.has(group.userId);
          return (
            <div 
              key={group.userId || i} 
              onClick={() => handleStoryClick(group)}
              className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group"
            >
              <div className={`w-16 h-16 rounded-full p-[2px] transition-all duration-500 ${isViewed ? 'bg-zinc-700' : 'bg-gradient-to-tr from-indigo-500 to-purple-500'}`}>
                <div className="w-full h-full rounded-full border-2 border-[#121212] overflow-hidden">
                  <img 
                    src={group.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${group.name}`} 
                    alt="Story" 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest truncate w-16 text-center transition-colors ${isViewed ? 'text-zinc-500' : 'text-zinc-400 group-hover:text-white'}`}>
                {group.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {activeStoryGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black flex items-center justify-center"
          >
            <div className="relative w-full max-w-lg h-full md:h-[90vh] md:rounded-3xl overflow-hidden bg-zinc-900">
              {/* Progress Bars */}
              <div className="absolute top-4 left-4 right-4 z-10 flex gap-1">
                {activeStoryGroup.stories.map((_: any, idx: number) => (
                  <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: idx < currentStoryIndex ? '100%' : idx === currentStoryIndex ? '100%' : '0%' }}
                      transition={{ duration: idx === currentStoryIndex ? 5 : 0, ease: 'linear' }}
                      onAnimationComplete={() => idx === currentStoryIndex && nextStory()}
                      className="h-full bg-white"
                    />
                  </div>
                ))}
              </div>

              {/* Header */}
              <div className="absolute top-8 left-4 right-4 z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar src={activeStoryGroup.avatar} name={activeStoryGroup.name} size="sm" />
                  <span className="text-white font-bold text-sm">{activeStoryGroup.name}</span>
                </div>
                <button onClick={() => setActiveStoryGroup(null)} className="text-white/70 hover:text-white">
                  <Zap size={24} className="rotate-45" />
                </button>
              </div>

              {/* Content */}
              <div className="w-full h-full flex items-center justify-center bg-black" onClick={nextStory}>
                <img 
                  src={activeStoryGroup.stories[currentStoryIndex].media_url} 
                  className="max-w-full max-h-full object-contain"
                  alt="Story content"
                />
              </div>

              {/* Navigation Areas */}
              <div className="absolute inset-y-0 left-0 w-1/4 z-20" onClick={(e) => { e.stopPropagation(); setCurrentStoryIndex(Math.max(0, currentStoryIndex - 1)); }} />
              <div className="absolute inset-y-0 right-0 w-1/4 z-20" onClick={(e) => { e.stopPropagation(); nextStory(); }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-2 mb-4 flex justify-between items-center">
        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">
          {searchQuery.startsWith('@') ? 'Глобальный поиск' : `Узлы онлайн (${filteredContacts.length})`}
        </h3>
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
