import React from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Contact } from '../types';
import Avatar from './Avatar';
import { Search, Zap, Star, Pin, Archive } from 'lucide-react';

interface ChatListProps {
  activeContactId: string | null;
  onSelectContact: (contact: Contact) => void;
  onTogglePin?: (id: string) => void;
  onArchive?: (id: string) => void;
  searchQuery: string;
  contactsOverride?: Contact[];
  stories?: any[];
  onAddStory?: () => void;
}

const ChatItem = ({ contact, activeContactId, onSelectContact, onTogglePin, onArchive }: any) => {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, -50], [1, 0]);
  const archiveOpacity = useTransform(x, [-100, -20], [1, 0]);
  const archiveScale = useTransform(x, [-100, -20], [1, 0.5]);

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x < -100 && onArchive) {
      onArchive(contact.id);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[24px] mb-2">
      {/* Archive Background Action */}
      <motion.div 
        style={{ opacity: archiveOpacity, scale: archiveScale }}
        className="absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-center rounded-r-[24px] z-0"
      >
        <Archive className="text-white" size={20} />
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.5, right: 0 }}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-[24px] transition-all duration-200 group relative cursor-pointer z-10 ${
          activeContactId === contact.id
            ? 'bg-zinc-100 dark:bg-[#1a1a1a] text-black dark:text-white shadow-xl border border-black/5 dark:border-white/5'
            : 'hover:bg-zinc-100 dark:hover:bg-[#1a1a1a]/50 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'
        }`}
        onClick={() => onSelectContact(contact)}
      >
        <div className="relative">
          <Avatar src={contact.avatar} name={contact.name} status={contact.status} size="md" />
          {contact.isFavorite && !contact.isSelf && (
            <div className="absolute -top-1 -right-1 bg-black rounded-full p-0.5 border border-white/10">
              <Star size={10} className="fill-amber-400 text-amber-400" />
            </div>
          )}
        </div>

        <div className="flex-1 text-left overflow-hidden">
          <div className="flex justify-between items-baseline">
            <h3 className={`font-bold text-[15px] truncate transition-colors flex items-center gap-2 ${
              activeContactId === contact.id ? 'text-black dark:text-white' : 'text-zinc-700 dark:text-zinc-300 group-hover:text-black dark:group-hover:text-white'
            }`}>
              {contact.name}
            </h3>
          </div>
          <p className="text-[12px] truncate leading-tight transition-colors font-medium text-zinc-500">
            {contact.lastMessage || contact.bio}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onTogglePin && !contact.isSelf && (
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onTogglePin(contact.id); }}
              className={`p-2 rounded-full transition-all ${contact.isPinned ? 'text-white bg-indigo-600' : 'text-zinc-500 hover:text-white hover:bg-white/5 opacity-0 group-hover:opacity-100'}`}
            >
              <Pin size={14} className={contact.isPinned ? "fill-white" : ""} />
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const ChatList: React.FC<ChatListProps> = ({ 
  activeContactId, 
  onSelectContact, 
  onTogglePin, 
  onArchive,
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
          <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center group-hover:border-indigo-500 transition-colors relative overflow-hidden">
            <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-2xl text-zinc-400 dark:text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">+</span>
          </div>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-black dark:group-hover:text-white transition-colors">История</span>
        </div>
        
        {stories.map((group, i) => {
          const isViewed = viewedGroups.has(group.userId);
          return (
            <div 
              key={group.userId || i} 
              onClick={() => handleStoryClick(group)}
              className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group"
            >
              <div className={`w-16 h-16 rounded-full p-[2px] transition-all duration-500 ${isViewed ? 'bg-zinc-300 dark:bg-zinc-700' : 'bg-gradient-to-tr from-indigo-500 to-purple-500'}`}>
                <div className="w-full h-full rounded-full border-2 border-white dark:border-black overflow-hidden">
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
            <ChatItem 
              key={contact.id}
              contact={contact}
              activeContactId={activeContactId}
              onSelectContact={onSelectContact}
              onTogglePin={onTogglePin}
              onArchive={onArchive}
            />
          ))
        ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-full text-zinc-700 p-8 text-center mt-10"
        >
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900/50 rounded-[1.5rem] flex items-center justify-center mb-6 border border-zinc-200 dark:border-zinc-800">
             <Zap size={24} className="opacity-20 animate-pulse text-black dark:text-white" />
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
