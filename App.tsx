
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Settings, MessageCircle, Users, User, Command, Zap, 
  Share2, Copy, CheckCircle2, X, Camera, Phone, AtSign, 
  Info, Hash, Pencil, Check, Plus, Radio, Shield, ZapOff, Sparkles, Star, Save,
  Pin, Gift, ExternalLink, MoreVertical, Globe, ShieldCheck
} from 'lucide-react';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import Avatar from './components/Avatar';
import { Contact, Message, UserProfile } from './types';
import { CURRENT_USER } from './constants';

function App() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts' | 'settings' | 'profile'>('chats');
  const [peers, setPeers] = useState<Contact[]>([]);
  const [networkMessages, setNetworkMessages] = useState<Record<string, Message[]>>({});
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddPeerModal, setShowAddPeerModal] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('pulse_user_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return CURRENT_USER;
      }
    }
    return CURRENT_USER;
  });

  useEffect(() => {
    localStorage.setItem('pulse_user_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFields, setEditFields] = useState({
    name: userProfile.name,
    username: userProfile.username || '',
    bio: userProfile.bio || '',
    phoneNumber: userProfile.phoneNumber || ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const channel = useMemo(() => new BroadcastChannel('pulse_mesh_v7_media'), []);

  const savedMessagesContact: Contact = useMemo(() => ({
    id: userProfile.id,
    name: 'Избранное',
    avatar: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=256&h=256&auto=format&fit=crop',
    status: 'online',
    bio: 'Ваше личное хранилище',
    isSelf: true,
    isFavorite: true
  }), [userProfile.id]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleContacts = useMemo(() => {
    const list = [savedMessagesContact, ...peers.map(p => ({
      ...p,
      isFavorite: favorites.has(p.id)
    }))];
    return list.sort((a, b) => {
      if (a.isSelf) return -1;
      if (b.isSelf) return 1;
      return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
    });
  }, [peers, savedMessagesContact, favorites]);

  const broadcastPresence = useCallback(() => {
    try {
      channel.postMessage({
        type: 'PRESENCE_UPDATE',
        payload: {
          id: userProfile.id,
          name: userProfile.name,
          avatar: userProfile.avatar,
          status: 'online',
          bio: userProfile.bio
        }
      });
    } catch (e) { console.warn(e); }
  }, [channel, userProfile]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      if (type === 'PRESENCE_UPDATE' && payload.id !== userProfile.id) {
        setPeers(prev => {
          const exists = prev.find(p => p.id === payload.id);
          if (exists) return prev.map(p => p.id === payload.id ? { ...p, ...payload } : p);
          broadcastPresence();
          return [...prev, payload];
        });
      }
      if (type === 'MSG_SEND' && payload.receiverId === userProfile.id) {
        setNetworkMessages(prev => ({
          ...prev,
          [payload.senderId]: [...(prev[payload.senderId] || []), payload.message]
        }));
      }
    };
    channel.addEventListener('message', handleMessage);
    broadcastPresence();
    const hb = setInterval(broadcastPresence, 5000);
    return () => {
      channel.removeEventListener('message', handleMessage);
      clearInterval(hb);
    };
  }, [channel, broadcastPresence, userProfile.id]);

  const handleSendToNetwork = (receiverId: string, message: Message) => {
    if (receiverId === userProfile.id) {
      setNetworkMessages(prev => ({ ...prev, [userProfile.id]: [...(prev[userProfile.id] || []), message] }));
      return;
    }
    channel.postMessage({ type: 'MSG_SEND', payload: { senderId: userProfile.id, receiverId, message } });
    setNetworkMessages(prev => ({ ...prev, [receiverId]: [...(prev[receiverId] || []), message] }));
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setUserProfile(prev => ({ ...prev, avatar: event.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    setUserProfile(prev => ({
      ...prev,
      name: editFields.name,
      username: editFields.username,
      bio: editFields.bio,
      phoneNumber: editFields.phoneNumber
    }));
    setIsEditingProfile(false);
    broadcastPresence();
  };

  const togglePinGift = (giftId: string) => {
    setUserProfile(prev => ({
      ...prev,
      gifts: prev.gifts?.map(g => g.id === giftId ? { ...g, isPinned: !g.isPinned } : g)
    }));
  };

  const togglePinContact = (contactId: string) => {
    setPeers(prev => prev.map(p => p.id === contactId ? { ...p, isPinned: !p.isPinned } : p));
  };

  const tabs = [
    { id: 'chats', label: 'Чаты', icon: MessageCircle },
    { id: 'contacts', label: 'Узлы', icon: Users },
    { id: 'settings', label: 'Опции', icon: Settings },
    { id: 'profile', label: 'Я', icon: User },
  ] as const;

  const activeTabIndex = tabs.findIndex(t => t.id === activeTab);
  const currentSelectedContactWithFav = useMemo(() => {
    if (!selectedContact) return null;
    return allVisibleContacts.find(c => c.id === selectedContact.id) || selectedContact;
  }, [selectedContact, allVisibleContacts]);

  return (
    <div className="flex h-full w-full text-white overflow-hidden font-sans bg-black">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-20 border-r border-zinc-900 bg-black items-center py-8 shrink-0">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-10 shadow-[0_0_20px_rgba(79,70,229,0.3)]">
          <Command size={24} />
        </div>
        <nav className="flex flex-col gap-8">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`p-3 rounded-xl transition-all ${activeTab === tab.id ? 'text-indigo-400 bg-indigo-400/10' : 'text-zinc-500 hover:text-zinc-200'}`}>
              <tab.icon size={24} />
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-row h-full relative overflow-hidden">
        {/* Mobile Dock Interface - Premium Floating Island */}
        {!selectedContact && (
          <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[94%] max-w-sm animate-in slide-in-from-bottom-10 duration-700 ease-out">
            <div className="bg-black/80 backdrop-blur-2xl h-[80px] rounded-[2.8rem] px-2 flex items-center justify-around relative shadow-[0_25px_60px_rgba(0,0,0,0.9)] border border-white/5">
              <div 
                className="absolute h-[64px] w-[74px] bg-white/10 border border-white/10 rounded-[2.4rem] z-0 shadow-2xl"
                style={{ 
                  left: `calc(${activeTabIndex} * 25% + 12.5% - 37px)`,
                  transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              />
              {tabs.map((tab) => (
                <button 
                  key={tab.id} 
                  onClick={() => { setActiveTab(tab.id); setSelectedContact(null); }} 
                  className={`relative z-10 flex flex-col items-center justify-center w-full h-full active:scale-90 transition-all duration-500 ${activeTab === tab.id ? 'scale-110' : 'opacity-30 hover:opacity-60'}`}
                >
                   {tab.id === 'profile' ? (
                    <div className={`w-[28px] h-[28px] rounded-full overflow-hidden border-2 transition-all duration-500 ${activeTab === tab.id ? 'border-white shadow-[0_0_15px_white]' : 'border-zinc-800'} bg-zinc-800`}>
                      <img 
                        src={userProfile.avatar} 
                        alt="Me" 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.name)}&background=random`;
                        }}
                      />
                    </div>
                  ) : (
                    <tab.icon size={24} className={activeTab === tab.id ? 'text-white' : 'text-zinc-400'} />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <section className={`flex flex-col h-full shrink-0 border-r border-zinc-900 w-full md:w-80 lg:w-[400px] bg-black z-10 ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
          <header className="p-6 shrink-0 pt-16 md:pt-10">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-black italic tracking-tighter text-white flex items-center gap-2">
                <Zap size={24} className="fill-current text-indigo-500" /> PULSE
              </h1>
              <div className="flex gap-2">
                {/* Plus button removed as per request */}
              </div>
            </div>
            {activeTab === 'chats' && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск по узлам..." className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-3 pl-11 pr-4 text-[15px] outline-none focus:border-indigo-500/50 transition-all" />
              </div>
            )}
          </header>

          <div className="flex-1 overflow-y-auto no-scrollbar pb-36">
            <AnimatePresence mode="wait">
              {activeTab === 'chats' && (
                <motion.div
                  key="chats"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChatList 
                    activeContactId={selectedContact?.id || null} 
                    onSelectContact={setSelectedContact} 
                    onTogglePin={togglePinContact}
                    searchQuery={searchQuery} 
                    contactsOverride={allVisibleContacts} 
                  />
                </motion.div>
              )}

              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="animate-in fade-in slide-in-from-bottom-6 duration-500 pb-40"
                >
                  {/* Profile Header / Cover */}
                  <div className="relative h-48 w-full overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/20 to-black z-0" />
                    <img 
                      src={userProfile.avatar} 
                      className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-30 scale-150" 
                      alt="" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.name)}&background=random`;
                      }}
                    />
                  </div>

                  <div className="px-6 -mt-20 relative z-10">
                    <div className="flex flex-col items-center">
                      <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 border-black bg-zinc-900 relative shadow-2xl transition-transform duration-500 group-hover:scale-105">
                          <img 
                            src={userProfile.avatar} 
                            className="w-full h-full object-cover" 
                            alt="Me" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.name)}&background=random`;
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                            <Camera size={24} className="text-white" />
                          </div>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-indigo-500 rounded-full border-4 border-black flex items-center justify-center">
                          <ShieldCheck size={14} className="text-white" />
                        </div>
                      </div>
                      <input type="file" ref={fileInputRef} onChange={handleAvatarSelect} hidden accept="image/*" />
                      
                      {!isEditingProfile ? (
                        <div className="text-center w-full mt-6">
                          <h3 className="font-bold text-2xl text-white">{userProfile.name}</h3>
                          <p className="text-sm text-zinc-500 font-mono mt-1">@{userProfile.username}</p>
                          
                          <div className="flex gap-2 mt-6 justify-center">
                            <button onClick={() => setIsEditingProfile(true)} className="px-6 py-2.5 bg-white text-black rounded-full text-xs font-bold uppercase tracking-wider active:scale-95 transition-all">
                              Изменить
                            </button>
                            <button className="p-2.5 bg-zinc-900 text-zinc-400 rounded-full hover:text-white transition-colors">
                              <Share2 size={18} />
                            </button>
                          </div>

                          {/* Info Cards */}
                          <div className="mt-10 space-y-3 text-left">
                            <div className="p-4 bg-zinc-900/50 rounded-3xl border border-zinc-800/50">
                              <div className="flex items-center gap-3 mb-2">
                                <Info size={14} className="text-indigo-400" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">О себе</span>
                              </div>
                              <p className="text-sm text-zinc-300 leading-relaxed">
                                {userProfile.bio || 'У этого узла еще нет описания'}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-4 bg-zinc-900/50 rounded-3xl border border-zinc-800/50">
                                <div className="flex items-center gap-3 mb-2">
                                  <AtSign size={14} className="text-emerald-400" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Ник</span>
                                </div>
                                <p className="text-sm text-zinc-300 font-mono">@{userProfile.username}</p>
                              </div>
                              <div className="p-4 bg-zinc-900/50 rounded-3xl border border-zinc-800/50">
                                <div className="flex items-center gap-3 mb-2">
                                  <Phone size={14} className="text-sky-400" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Связь</span>
                                </div>
                                <p className="text-sm text-zinc-300">{userProfile.phoneNumber || 'Не указан'}</p>
                              </div>
                            </div>
                          </div>

                          {/* NFT Gifts Section */}
                          <div className="mt-10 text-left">
                            <div className="flex items-center justify-between mb-4 px-1">
                              <div className="flex items-center gap-2">
                                <Gift size={16} className="text-amber-400" />
                                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">NFT Подарки</h4>
                              </div>
                              <span className="text-[10px] text-zinc-600 font-bold">{userProfile.gifts?.length || 0} шт.</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              {userProfile.gifts?.map(gift => (
                                <div key={gift.id} className="group relative bg-zinc-900/30 rounded-[2rem] overflow-hidden border border-zinc-800/50 hover:border-indigo-500/30 transition-all">
                                  <div className="aspect-square overflow-hidden">
                                    <img src={gift.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={gift.name} />
                                  </div>
                                  <div className="p-3">
                                    <p className="text-[11px] font-bold text-white truncate">{gift.name}</p>
                                    <p className="text-[9px] text-zinc-500 truncate mt-0.5">{gift.collection}</p>
                                  </div>
                                  
                                  <button 
                                    onClick={() => togglePinGift(gift.id)}
                                    className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-md transition-all ${gift.isPinned ? 'bg-indigo-500 text-white' : 'bg-black/40 text-white/50 opacity-0 group-hover:opacity-100'}`}
                                  >
                                    <Pin size={12} className={gift.isPinned ? "fill-white" : ""} />
                                  </button>
                                </div>
                              ))}
                              <button className="aspect-square rounded-[2rem] border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center gap-2 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 transition-all">
                                <Plus size={24} />
                                <span className="text-[9px] font-bold uppercase tracking-widest">Добавить</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full mt-8 space-y-6 text-left">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Публичное Имя</label>
                            <input value={editFields.name} onChange={e => setEditFields({...editFields, name: e.target.value})} className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:border-indigo-500 outline-none transition-all" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Никнейм</label>
                            <input value={editFields.username} onChange={e => setEditFields({...editFields, username: e.target.value})} className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-5 py-4 text-sm font-mono focus:border-indigo-500 outline-none transition-all" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">О себе</label>
                            <textarea value={editFields.bio} onChange={e => setEditFields({...editFields, bio: e.target.value})} className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl px-5 py-4 text-sm h-32 resize-none focus:border-indigo-500 outline-none transition-all" />
                          </div>
                          <div className="flex gap-3 pt-6">
                            <button onClick={() => setIsEditingProfile(false)} className="flex-1 py-4 bg-zinc-900 rounded-full text-[11px] font-bold uppercase tracking-widest border border-zinc-800">Отмена</button>
                            <button onClick={saveProfile} className="flex-1 py-4 bg-indigo-600 rounded-full text-[11px] font-bold uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"><Save size={16} /> Сохранить</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        <section className={`flex-1 h-full bg-[#020202] overflow-hidden ${selectedContact ? 'flex' : 'hidden md:flex flex-col items-center justify-center'}`}>
          {currentSelectedContactWithFav ? (
            <ChatWindow 
              contact={currentSelectedContactWithFav} 
              onBack={() => setSelectedContact(null)} 
              initialHistory={networkMessages[currentSelectedContactWithFav.id] || []} 
              onSendMessage={msg => handleSendToNetwork(currentSelectedContactWithFav.id, msg)} 
              onToggleFavorite={toggleFavorite}
            />
          ) : (
            <div className="text-center max-w-sm px-10 animate-in fade-in zoom-in-75 duration-1000">
              <div className="w-28 h-28 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-[3.5rem] flex items-center justify-center text-zinc-700 mx-auto mb-10 border border-indigo-500/10 shadow-3xl">
                <Zap size={56} className="opacity-30 animate-pulse text-indigo-400" />
              </div>
              <h2 className="text-4xl font-black italic mb-4 tracking-tighter uppercase text-zinc-200">Pulse Mesh</h2>
              <p className="text-zinc-600 text-[11px] leading-relaxed uppercase tracking-[0.5em] font-black opacity-50">Local P2P Encryption Active</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
