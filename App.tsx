
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Settings, MessageCircle, Users, User, Command, Zap, 
  Share2, Copy, CheckCircle2, X, Camera, Phone, AtSign, 
  Info, Hash, Pencil, Check, Plus, Radio, Shield, ZapOff, Sparkles, Star, Save,
  Pin, Gift, ExternalLink, MoreVertical, Globe, ShieldCheck, ShoppingBag, ChevronRight, BellRing, Lock, Moon, LogOut, Clock, Gem, EyeOff, CornerUpRight
} from 'lucide-react';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import Avatar from './components/Avatar';
import GiftMarket from './components/GiftMarket';
import AuthScreen from './components/AuthScreen';
import { Contact, Message, UserProfile } from './types';

function App() {
  const [accounts, setAccounts] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('pulse_accounts');
    return saved ? JSON.parse(saved) : [];
  });

  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('pulse_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem('pulse_accounts', JSON.stringify(accounts));
  }, [accounts]);

  const handleLogin = (userData: any) => {
    setUser(userData);
    setAccounts(prev => {
      const exists = prev.find(a => a.id === userData.id);
      if (exists) return prev;
      if (prev.length >= 3) return prev;
      return [...prev, userData];
    });
  };

  const switchAccount = (accountId: string) => {
    const target = accounts.find(a => a.id === accountId);
    if (target) setUser(target);
  };

  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts' | 'settings' | 'profile'>('chats');
  const [peers, setPeers] = useState<Contact[]>([]);
  const [networkMessages, setNetworkMessages] = useState<Record<string, Message[]>>({});
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddPeerModal, setShowAddPeerModal] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [ws, setWs] = useState<WebSocket | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile>(user || {
    id: '',
    name: '',
    avatar: '',
    email: ''
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('pulse_auth_user', JSON.stringify(user));
      setUserProfile(user);
    } else {
      localStorage.removeItem('pulse_auth_user');
    }
  }, [user]);

  const [notifications, setNotifications] = useState<{ id: string, title: string, body: string }[]>([]);

  const addNotification = useCallback((title: string, body: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, title, body }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  // WebSocket Connection
  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'AUTH', userId: user.id }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'NEW_MESSAGE') {
        const msg = data.payload;
        const peerId = msg.senderId === user.id ? msg.receiverId : msg.senderId;
        
        if (msg.senderId !== user.id) {
          const sender = peers.find(p => p.id === msg.senderId);
          addNotification(sender?.name || 'Новое сообщение', msg.type === 'text' ? msg.content : 'Медиафайл');
        }

        setNetworkMessages(prev => {
          const currentMessages = prev[peerId] || [];
          // Deduplicate by ID
          if (currentMessages.some(m => m.id === msg.id)) return prev;
          
          return {
            ...prev,
            [peerId]: [...currentMessages, {
              id: msg.id,
              role: msg.senderId === user.id ? 'user' : 'assistant',
              type: msg.type || 'text',
              content: msg.content,
              mediaUrl: msg.mediaUrl,
              timestamp: new Date(msg.timestamp),
              status: 'delivered'
            }]
          };
        });
      }
    };

    setWs(socket);
    return () => socket.close();
  }, [user, peers, addNotification]);

  const [stories, setStories] = useState<any[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const plusBot: Contact = {
    id: 'plus_bot',
    name: 'Plus Bot',
    username: 'plus_bot',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=plus',
    status: 'online',
    bio: 'Pulse Plus Bot - Ваш помощник по безопасности и уведомлениям.',
    isBot: true
  };

  // Fetch initial data
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch profile with gifts
      const profileRes = await fetch(`/api/users/${user.id}`);
      if (profileRes.ok) {
        const data = await profileRes.json();
        setUserProfile(data);
      }

      // Fetch all users for global search
      const usersRes = await fetch('/api/users');
      if (usersRes.ok) {
        const users = await usersRes.json();
        const uniqueUsers = Array.from(new Map(users.map((u: any) => [u.id, u])).values());
        setPeers(uniqueUsers.filter((u: any) => u.id !== user.id));
      }

      // Fetch contacts
      const contactsRes = await fetch(`/api/contacts/${user.id}`);
      if (contactsRes.ok) {
        const data = await contactsRes.json();
        setContacts(data);
      }

      // Fetch favorites
      const favRes = await fetch(`/api/favorites/${user.id}`);
      if (favRes.ok) {
        const favIds = await favRes.json();
        setFavorites(new Set(favIds));
      }

      // Fetch stories
      const storiesRes = await fetch('/api/stories');
      if (storiesRes.ok) {
        const data = await storiesRes.json();
        const uniqueStories = Array.from(new Map(data.map((s: any) => [s.id, s])).values());
        setStories(uniqueStories);
      }
    };

    fetchData();
  }, [user]);

  const addContact = async (username: string) => {
    if (!user) return;
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, username })
    });
    if (res.ok) {
      const contactsRes = await fetch(`/api/contacts/${user.id}`);
      if (contactsRes.ok) {
        const data = await contactsRes.json();
        setContacts(data);
      }
    } else {
      const data = await res.json();
      alert(data.error || 'Ошибка при добавлении контакта');
    }
  };

  const handleLogout = () => {
    setAccounts(prev => prev.filter(a => a.id !== user?.id));
    setUser(null);
    localStorage.removeItem('pulse_auth_user');
  };

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showGiftMarket, setShowGiftMarket] = useState(false);
  const [selectedGift, setSelectedGift] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [userBalance, setUserBalance] = useState(2500); // Mock balance

  // Timer for pinned gift
  useEffect(() => {
    // Simplified timer for demo - just checking first gift
    if (!userProfile.pinnedGifts?.length) return;
    
    // ... timer logic ...
  }, [userProfile.pinnedGifts]);

  const handleBuyGift = (item: any) => {
    if (userBalance < item.price) {
      alert('Недостаточно средств!');
      return;
    }

    const gift = {
      id: item.id + '-' + Date.now(),
      name: item.name,
      imageUrl: item.imageUrl,
      collection: item.collection,
      description: `Эксклюзивный предмет из коллекции ${item.collection}.`,
      date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
      number: item.sold + 1,
      totalIssued: item.totalIssued,
      attributes: [
        { trait: 'Редкость', value: item.rarity, rarity: item.rarity === 'Legendary' ? '0.1%' : item.rarity === 'Epic' ? '1.5%' : '10%' },
        { trait: 'Коллекция', value: item.collection }
      ],
      ownerId: userProfile.id,
      ownerName: userProfile.name
    };
    
    setUserBalance(prev => prev - item.price);
    setUserProfile(prev => ({ 
      ...prev, 
      gifts: [...(prev.gifts || []), gift]
    }));
    setShowGiftMarket(false);
    setSelectedGift(gift); // Open details immediately
  };

  const handlePinGift = (gift: any) => {
    const currentPinned = userProfile.pinnedGifts || [];
    const isPinned = currentPinned.some(g => g.id === gift.id);
    
    if (isPinned) {
      setUserProfile(prev => ({ 
        ...prev, 
        pinnedGifts: prev.pinnedGifts?.filter(g => g.id !== gift.id) 
      }));
    } else {
      if (currentPinned.length >= 6) {
        alert('Можно закрепить максимум 6 подарков');
        return;
      }
      setUserProfile(prev => ({ 
        ...prev, 
        pinnedGifts: [...(prev.pinnedGifts || []), gift] 
      }));
    }
  };

  const [editFields, setEditFields] = useState({
    name: userProfile.name,
    username: userProfile.username || '',
    bio: userProfile.bio || '',
    phoneNumber: userProfile.phoneNumber || ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const savedMessagesContact: Contact = useMemo(() => ({
    id: userProfile.id,
    name: 'Избранное',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Fav&backgroundColor=4f46e5',
    status: 'online',
    bio: 'Ваше личное хранилище',
    isSelf: true,
    isFavorite: true
  }), [userProfile.id]);

  const toggleFavorite = async (id: string) => {
    const isFav = favorites.has(id);
    if (isFav) {
      await fetch(`/api/favorites/${userProfile.id}/${id}`, { method: 'DELETE' });
    } else {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userProfile.id, contactId: id })
      });
    }

    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleContacts = useMemo(() => {
    const list = [savedMessagesContact, plusBot, ...peers.map(p => ({
      ...p,
      isFavorite: favorites.has(p.id)
    }))];
    return list.sort((a, b) => {
      if (a.isSelf) return -1;
      if (b.isSelf) return 1;
      return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
    });
  }, [peers, savedMessagesContact, favorites, plusBot]);

  const handleSendToNetwork = (receiverId: string, message: Message) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'CHAT_MESSAGE',
        payload: {
          senderId: userProfile.id,
          receiverId,
          content: message.content,
          msgType: message.type,
          mediaUrl: message.mediaUrl
        }
      }));
    }
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

  const handleAddStory = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const res = await fetch('/api/stories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userProfile.id, mediaUrl: base64 })
        });
        if (res.ok) {
          // Refresh stories
          const storiesRes = await fetch('/api/stories');
          if (storiesRes.ok) {
            const data = await storiesRes.json();
            setStories(data);
          }
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const saveProfile = async () => {
    const updatedProfile = {
      ...userProfile,
      name: editFields.name,
      username: editFields.username,
      bio: editFields.bio,
      phoneNumber: editFields.phoneNumber
    };

    try {
      const response = await fetch(`/api/users/${userProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProfile)
      });

      if (response.ok) {
        setUserProfile(updatedProfile);
        setIsEditingProfile(false);
      }
    } catch (e) {
      console.error('Failed to save profile', e);
    }
  };

  const togglePinGift = (giftId: string) => {
    setUserProfile(prev => ({
      ...prev,
      gifts: prev.gifts?.map(g => g.id === giftId ? { ...g, isPinned: !g.isPinned } : g)
    }));
  };

  const tabs = [
    { id: 'chats', label: 'Чаты', icon: MessageCircle },
    { id: 'contacts', label: 'Узлы', icon: Users },
    { id: 'settings', label: 'Опции', icon: Settings },
    { id: 'profile', label: 'Я', icon: User },
  ] as const;

  const activeTabIndex = tabs.findIndex(t => t.id === activeTab);

  const groupedStories = useMemo(() => {
    const groups: Record<string, { userId: string, name: string, avatar: string, stories: any[], viewed: boolean }> = {};
    stories.forEach(s => {
      if (!groups[s.user_id]) {
        groups[s.user_id] = {
          userId: s.user_id,
          name: s.name,
          avatar: s.avatar,
          stories: [],
          viewed: false // For now, simple local state or mock
        };
      }
      groups[s.user_id].stories.push(s);
    });
    return Object.values(groups);
  }, [stories]);

  const fetchMessages = async (peerId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/messages/${user.id}/${peerId}`);
      if (res.ok) {
        const msgs = await res.json();
        setNetworkMessages(prev => ({
          ...prev,
          [peerId]: msgs.map((m: any) => ({
            id: m.id,
            role: m.sender_id === user.id ? 'user' : 'assistant',
            type: m.type || 'text',
            content: m.content,
            mediaUrl: m.media_url,
            timestamp: new Date(m.timestamp),
            status: 'delivered'
          }))
        }));
      }
    } catch (e) {
      console.error('Failed to fetch messages', e);
    }
  };

  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.id);
    }
  }, [selectedContact]);

  const currentSelectedContactWithFav = useMemo(() => {
    if (!selectedContact) return null;
    return allVisibleContacts.find(c => c.id === selectedContact.id) || selectedContact;
  }, [selectedContact, allVisibleContacts]);

  const filteredContacts = useMemo(() => {
    if (searchQuery.startsWith('@')) {
      const query = searchQuery.substring(1).toLowerCase();
      return peers.filter(p => p.username?.toLowerCase().includes(query));
    }
    return allVisibleContacts.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [peers, allVisibleContacts, searchQuery]);

  if (!user) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full w-full text-white overflow-hidden font-sans bg-[#121212]"
    >
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-20 border-r border-zinc-800 bg-[#0a0a0a] items-center py-8 shrink-0">
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
        {/* Other User Profile Viewer */}
        <AnimatePresence>
          {viewingContact && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#121212] border border-white/10 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl relative"
              >
                <button 
                  onClick={() => setViewingContact(null)}
                  className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="h-32 bg-gradient-to-br from-indigo-600 to-purple-700 relative">
                  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                    <div className="w-24 h-24 rounded-full border-4 border-[#121212] overflow-hidden bg-zinc-900 shadow-xl">
                      <img src={viewingContact.avatar} className="w-full h-full object-cover" alt={viewingContact.name} />
                    </div>
                  </div>
                </div>

                <div className="pt-16 pb-8 px-8 text-center">
                  <h3 className="text-2xl font-bold">{viewingContact.name}</h3>
                  <p className="text-zinc-500 font-mono text-sm mt-1">@{viewingContact.username}</p>
                  
                  <div className="mt-8 flex gap-3">
                    <button 
                      onClick={() => {
                        setSelectedContact(viewingContact);
                        setViewingContact(null);
                        setActiveTab('chats');
                      }}
                      className="flex-1 py-4 bg-white text-black rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-zinc-200 transition-colors"
                    >
                      Написать
                    </button>
                    <button 
                      onClick={() => {
                        addContact(viewingContact.username!);
                        setViewingContact(null);
                      }}
                      className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-zinc-800 transition-colors border border-white/5"
                    >
                      В контакты
                    </button>
                  </div>

                  <div className="mt-8 text-left space-y-4">
                    <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1">О себе</span>
                      <p className="text-sm text-zinc-300">{viewingContact.bio || 'Нет описания'}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="fixed top-6 right-6 z-[200] space-y-3 pointer-events-none">
          <AnimatePresence>
            {notifications.map(n => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl w-72 pointer-events-auto"
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">{n.title}</span>
                </div>
                <p className="text-sm text-zinc-300 line-clamp-2">{n.body}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {/* Mobile Dock Interface - Premium Floating Island */}
        {!selectedContact && (
          <div className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[280px] animate-in slide-in-from-bottom-10 duration-700 ease-out">
            <div className="liquid-glass h-[72px] rounded-[2.5rem] px-1.5 flex items-center justify-around relative shadow-[0_30px_70px_rgba(0,0,0,0.8)]">
              <div 
                className="absolute h-[56px] w-[64px] bg-white/10 border border-white/10 rounded-[2rem] z-0 shadow-xl"
                style={{ 
                  left: `calc(${activeTabIndex} * 25% + 12.5% - 32px)`,
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
                        src={userProfile.avatar || undefined} 
                        alt="Me" 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userProfile.name)}`;
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
        
        {/* Dynamic Island Header - Removed as per request */}

        <section className={`flex flex-col h-full shrink-0 border-r border-zinc-800 w-full md:w-80 lg:w-[400px] bg-[#121212] z-10 ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
          {activeTab === 'chats' && (
            <header className="p-6 shrink-0 pt-10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск..." className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-3 pl-11 pr-4 text-[15px] outline-none focus:border-indigo-500/50 transition-all" />
              </div>
            </header>
          )}

          <div className="flex-1 overflow-y-auto pb-36">
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
                    onTogglePin={toggleFavorite}
                    searchQuery={searchQuery} 
                    contactsOverride={filteredContacts} 
                    stories={groupedStories}
                    onAddStory={handleAddStory}
                  />
                </motion.div>
              )}

              {activeTab === 'contacts' && (
                <motion.div
                  key="contacts"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col h-full p-6 pt-10"
                >
                  <div className="flex justify-between items-center mb-8 pl-2">
                    <h2 className="text-2xl font-bold text-white">Контакты</h2>
                    <button 
                      onClick={() => {
                        const username = prompt('Введите username пользователя:');
                        if (username) addContact(username);
                      }}
                      className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white hover:bg-indigo-500 transition-colors shadow-lg"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  
                  <div className="space-y-3 overflow-y-auto pb-32">
                    <button className="w-full p-5 bg-zinc-900/50 rounded-3xl border border-zinc-800/50 flex items-center gap-4 hover:bg-zinc-800 transition-colors group">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                        <Users size={22} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-white">Создать группу</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">До 200,000 участников</p>
                      </div>
                    </button>
                    <button className="w-full p-5 bg-zinc-900/50 rounded-3xl border border-zinc-800/50 flex items-center gap-4 hover:bg-zinc-800 transition-colors group">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                        <Radio size={22} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-white">Создать канал</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">Неограниченная аудитория</p>
                      </div>
                    </button>
                    <button className="w-full p-5 bg-zinc-900/50 rounded-3xl border border-zinc-800/50 flex items-center gap-4 hover:bg-zinc-800 transition-colors group">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                        <Globe size={22} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-white">Создать сообщество</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">Объедините свои каналы</p>
                      </div>
                    </button>

                    <div className="pt-8">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4 pl-4">Мои контакты ({contacts.length})</p>
                      {contacts.length === 0 ? (
                        <div className="p-10 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/30">
                          <Users size={32} className="mx-auto text-zinc-700 mb-3" />
                          <p className="text-xs text-zinc-600 uppercase tracking-widest">Список пуст</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {contacts.map(contact => (
                            <div 
                              key={contact.id}
                              onClick={() => { setSelectedContact(contact); setActiveTab('chats'); }}
                              className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-3xl cursor-pointer transition-colors group"
                            >
                              <Avatar src={contact.avatar} name={contact.name} size="md" />
                              <div className="flex-1">
                                <h4 className="font-bold text-sm text-white">{contact.name}</h4>
                                <p className="text-[10px] text-zinc-500 font-mono">@{contact.username}</p>
                              </div>
                              <ChevronRight size={16} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
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
                  {/* Profile Header / Cover Removed */}
                  
                  <div className="px-6 pt-12 relative z-10">
                    <div className="flex flex-col items-center">
                      <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-black bg-zinc-900 relative shadow-2xl transition-transform duration-500 group-hover:scale-105 z-10">
                          <img 
                            src={userProfile.avatar || undefined} 
                            className="w-full h-full object-cover" 
                            alt="Me" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userProfile.name)}`;
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                            <Camera size={24} className="text-white" />
                          </div>
                        </div>
                        
                        {/* Pinned Gifts - Orbiting */}
                        {userProfile.pinnedGifts?.map((gift, index) => {
                          const total = userProfile.pinnedGifts!.length;
                          // Calculate position on a circle
                          // Start from -90deg (top)
                          const angle = (index * (360 / total)) - 90;
                          const radius = 85; // Distance from center (32px radius + gap)
                          const rad = angle * (Math.PI / 180);
                          const top = 64 + Math.sin(rad) * radius - 24; // 64 is center y, 24 is half item size
                          const left = 64 + Math.cos(rad) * radius - 24; // 64 is center x

                          return (
                            <div 
                              key={gift.id}
                              className="absolute w-12 h-12 flex items-center justify-center z-0"
                              style={{ 
                                top: `${top}px`, 
                                left: `${left}px`,
                              }}
                            >
                              <img src={gift.imageUrl || undefined} alt="Gift" className="w-10 h-10 object-contain drop-shadow-lg" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                            </div>
                          );
                        })}

                        {(!userProfile.pinnedGifts || userProfile.pinnedGifts.length === 0) && (
                          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-indigo-500 rounded-full border-4 border-black flex items-center justify-center z-20">
                            <ShieldCheck size={14} className="text-white" />
                          </div>
                        )}
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
                            <button onClick={handleLogout} className="p-2.5 bg-zinc-900 text-red-500 rounded-full hover:bg-red-500/10 transition-colors">
                              <LogOut size={18} />
                            </button>
                            <button className="p-2.5 bg-zinc-900 text-zinc-400 rounded-full hover:text-white transition-colors">
                              <Share2 size={18} />
                            </button>
                          </div>

                          {/* Pinned Gift Card Removed - Now shown on Avatar */}
                          
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
                              <div className="p-4 bg-zinc-900/50 rounded-3xl border border-zinc-800/50 overflow-hidden">
                                <div className="flex items-center gap-3 mb-2">
                                  <AtSign size={14} className="text-emerald-400" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Ник</span>
                                </div>
                                <p className="text-sm text-zinc-300 font-mono whitespace-nowrap overflow-hidden text-ellipsis">@{userProfile.username}</p>
                              </div>
                              <div className="p-4 bg-zinc-900/50 rounded-3xl border border-zinc-800/50 overflow-hidden">
                                <div className="flex items-center gap-3 mb-2">
                                  <Phone size={14} className="text-sky-400" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Связь</span>
                                </div>
                                <p className="text-sm text-zinc-300 whitespace-nowrap overflow-hidden text-ellipsis">{userProfile.phoneNumber || 'Не указан'}</p>
                              </div>
                            </div>
                          </div>

                          {/* NFT Gifts Section Temporarily Removed */}
                          {/* Gifts Grid Section */}
                          <div className="mt-8">
                            <div className="flex items-center justify-between mb-4 px-2">
                              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Мои Подарки</h3>
                              <span className="text-xs text-zinc-500">{userProfile.gifts?.length || 0}</span>
                            </div>
                            
                            {(!userProfile.gifts || userProfile.gifts.length === 0) ? (
                              <div className="p-8 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/30">
                                <Gift size={32} className="mx-auto text-zinc-600 mb-3" />
                                <p className="text-sm text-zinc-500">У вас пока нет подарков</p>
                                <button 
                                  onClick={() => setShowGiftMarket(true)}
                                  className="mt-4 text-xs font-bold text-indigo-400 uppercase tracking-wider hover:text-indigo-300"
                                >
                                  Перейти в магазин
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-3 gap-3">
                                {userProfile.gifts.map(gift => (
                                  <div 
                                    key={gift.id}
                                    onClick={() => setSelectedGift(gift)}
                                    className="aspect-square bg-zinc-900/50 rounded-2xl border border-zinc-800/50 flex flex-col items-center justify-center p-3 relative group cursor-pointer hover:bg-zinc-800/50 transition-all"
                                  >
                                    {userProfile.pinnedGifts?.some(g => g.id === gift.id) && (
                                      <div className="absolute top-2 right-2 text-purple-500">
                                        <Pin size={12} fill="currentColor" />
                                      </div>
                                    )}
                                    <img 
                                      src={gift.imageUrl || undefined} 
                                      alt={gift.name} 
                                      className="w-full h-full object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-300" 
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                    <div className="absolute bottom-2 left-2 right-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <span className="text-[9px] font-bold text-white bg-black/50 backdrop-blur-md px-2 py-1 rounded-full truncate block">
                                        {gift.name}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
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

              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="p-6 pt-10 space-y-6 pb-36"
                >
                  <h2 className="text-2xl font-bold text-white mb-2 pl-2">Настройки</h2>
                  
                  {/* Accounts Section */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 pl-4">Аккаунты ({accounts.length}/3)</p>
                    <div className="space-y-2">
                      {accounts.map(acc => (
                        <div 
                          key={acc.id}
                          onClick={() => switchAccount(acc.id)}
                          className={`flex items-center gap-4 p-4 rounded-3xl border transition-all cursor-pointer ${acc.id === user?.id ? 'bg-indigo-600/10 border-indigo-500/50' : 'bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-800'}`}
                        >
                          <Avatar src={acc.avatar} name={acc.name} size="md" />
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{acc.name}</h4>
                            <p className="text-[10px] text-zinc-400 font-mono">@{acc.username}</p>
                          </div>
                          {acc.id === user?.id && <CheckCircle2 size={18} className="text-indigo-400" />}
                        </div>
                      ))}
                      {accounts.length < 3 && (
                        <button 
                          onClick={handleLogout}
                          className="w-full p-4 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl flex items-center justify-center gap-2 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all"
                        >
                          <Plus size={18} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Добавить аккаунт</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Buy NFT Section - Featured */}
                  <div className="bg-gradient-to-br from-purple-900/20 to-zinc-900/50 rounded-3xl border border-purple-500/20 overflow-hidden">
                    <button 
                      onClick={() => setShowGiftMarket(true)}
                      className="w-full flex items-center justify-between p-5 hover:bg-purple-500/5 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                          <ShoppingBag size={22} />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <p className="text-base font-bold text-white">Купить NFT</p>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20 animate-pulse">New</span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">Эксклюзивные цифровые товары</p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-zinc-600 group-hover:text-purple-400 transition-colors" />
                    </button>
                  </div>

                  {/* General Settings */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 pl-4">Основное</p>
                    <div className="bg-zinc-900/50 rounded-3xl border border-zinc-800/50 overflow-hidden">
                      <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-zinc-800/50">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                            <BellRing size={18} />
                          </div>
                          <span className="text-sm font-medium text-zinc-200">Уведомления</span>
                        </div>
                        <ChevronRight size={16} className="text-zinc-700" />
                      </button>
                      <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-zinc-800/50">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                            <Lock size={18} />
                          </div>
                          <span className="text-sm font-medium text-zinc-200">Конфиденциальность</span>
                        </div>
                        <ChevronRight size={16} className="text-zinc-700" />
                      </button>
                      <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                            <Moon size={18} />
                          </div>
                          <span className="text-sm font-medium text-zinc-200">Оформление</span>
                        </div>
                        <ChevronRight size={16} className="text-zinc-700" />
                      </button>
                    </div>
                  </div>

                  {/* Account Actions */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 pl-4">Аккаунт</p>
                    <div className="bg-zinc-900/50 rounded-3xl border border-zinc-800/50 overflow-hidden">
                      <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                            <LogOut size={18} />
                          </div>
                          <span className="text-sm font-medium text-red-400 group-hover:text-red-300 transition-colors">Выйти</span>
                        </div>
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-center pt-8 pb-4">
                    <p className="text-[10px] text-zinc-700 font-mono">Pulse Messenger v0.9.2 (Beta)</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        <section className={`flex-1 h-full bg-[#181818] overflow-hidden ${selectedContact ? 'flex flex-col' : 'hidden md:flex flex-col items-center justify-center'}`}>
          {currentSelectedContactWithFav ? (
            <ChatWindow 
              contact={currentSelectedContactWithFav} 
              onBack={() => setSelectedContact(null)} 
              initialHistory={networkMessages[currentSelectedContactWithFav.id] || []} 
              onSendMessage={msg => handleSendToNetwork(currentSelectedContactWithFav.id, msg)} 
              onViewProfile={setViewingContact}
            />
          ) : (
            <div className="text-center max-w-sm px-10 animate-in fade-in zoom-in-75 duration-1000">
              <div className="w-28 h-28 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-[3.5rem] flex items-center justify-center text-zinc-700 mx-auto mb-10 border border-white/5 shadow-3xl">
                <Zap size={56} className="opacity-10 animate-pulse text-indigo-400" />
              </div>
              <p className="text-zinc-600 text-[11px] leading-relaxed uppercase tracking-[0.5em] font-black opacity-30">Secure P2P Encryption Active</p>
            </div>
          )}
        </section>
        {/* Gift Detail Modal (Telegram Style) */}
        <AnimatePresence>
          {selectedGift && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
              onClick={() => setSelectedGift(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md bg-[#1c1c1e] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl relative max-h-[90vh] overflow-y-auto"
              >
                {/* Header Actions */}
                <div className="absolute top-4 right-4 flex gap-2 z-20">
                  <button className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-white/10 transition-colors">
                    <MoreVertical size={20} />
                  </button>
                  <button 
                    onClick={() => setSelectedGift(null)}
                    className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-white/10 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Hero Image Section */}
                <div className={`relative h-80 flex items-center justify-center overflow-hidden ${userProfile.pinnedGifts?.some(g => g.id === selectedGift.id) ? 'bg-purple-900/20' : 'bg-zinc-900/50'}`}>
                  <div className={`absolute inset-0 ${userProfile.pinnedGifts?.some(g => g.id === selectedGift.id) ? 'bg-purple-500/10' : ''}`} />
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                  
                  {/* Star Pattern Background */}
                  <div className="absolute inset-0 opacity-10">
                    {[...Array(10)].map((_, i) => (
                      <Star 
                        key={i}
                        size={Math.random() * 20 + 10} 
                        className="absolute text-white"
                        style={{
                          top: `${Math.random() * 100}%`,
                          left: `${Math.random() * 100}%`,
                          transform: `rotate(${Math.random() * 360}deg)`
                        }} 
                      />
                    ))}
                  </div>

                  <img 
                    src={selectedGift.imageUrl || undefined} 
                    alt={selectedGift.name} 
                    className="w-48 h-48 object-contain relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>

                {/* Content Section */}
                <div className="p-6 -mt-6 relative z-10 bg-[#1c1c1e] rounded-t-[2rem]">
                  <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <h2 className="text-2xl font-bold text-white">{selectedGift.name}</h2>
                      <span className="text-zinc-500 text-lg">#{selectedGift.number?.toLocaleString()}</span>
                    </div>
                    <p className="text-zinc-500 text-sm">{selectedGift.collection}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-3 mb-8">
                    <button className="flex flex-col items-center justify-center gap-2 p-3 bg-zinc-800/50 rounded-2xl hover:bg-zinc-800 transition-colors">
                      <CornerUpRight size={20} className="text-white" />
                      <span className="text-[10px] font-medium text-zinc-400">Передать</span>
                    </button>
                    <button 
                      onClick={() => handlePinGift(selectedGift)}
                      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-colors ${userProfile.pinnedGifts?.some(g => g.id === selectedGift.id) ? 'bg-purple-500/20 hover:bg-purple-500/30' : 'bg-zinc-800/50 hover:bg-zinc-800'}`}
                    >
                      <Pin size={20} className={userProfile.pinnedGifts?.some(g => g.id === selectedGift.id) ? 'text-purple-400' : 'text-white'} fill={userProfile.pinnedGifts?.some(g => g.id === selectedGift.id) ? 'currentColor' : 'none'} />
                      <span className={`text-[10px] font-medium ${userProfile.pinnedGifts?.some(g => g.id === selectedGift.id) ? 'text-purple-400' : 'text-zinc-400'}`}>
                        {userProfile.pinnedGifts?.some(g => g.id === selectedGift.id) ? 'Открепить' : 'Закрепить'}
                      </span>
                    </button>
                    <button className="flex flex-col items-center justify-center gap-2 p-3 bg-zinc-800/50 rounded-2xl hover:bg-zinc-800 transition-colors">
                      <EyeOff size={20} className="text-white" />
                      <span className="text-[10px] font-medium text-zinc-400">Скрыть</span>
                    </button>
                  </div>

                  {/* Attributes Table */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-white/5">
                      <span className="text-zinc-400 text-sm">Владелец</span>
                      <div className="flex items-center gap-2">
                        <img src={userProfile.avatar || undefined} className="w-5 h-5 rounded-full" alt="Owner" />
                        <span className="text-blue-400 text-sm">{userProfile.name}</span>
                      </div>
                    </div>
                    
                    {selectedGift.attributes?.map((attr: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-white/5">
                        <span className="text-zinc-400 text-sm">{attr.trait}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm">{attr.value}</span>
                          {attr.rarity && (
                            <span className="bg-zinc-800 text-zinc-400 text-[10px] px-1.5 py-0.5 rounded-md">{attr.rarity}</span>
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between py-3 border-b border-white/5">
                      <span className="text-zinc-400 text-sm">Количество</span>
                      <span className="text-zinc-500 text-sm">
                        {selectedGift.number?.toLocaleString()} из {selectedGift.totalIssued?.toLocaleString()} выпущено
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedGift(null)}
                    className="w-full mt-8 py-4 bg-blue-500 hover:bg-blue-600 rounded-2xl text-white font-bold text-sm uppercase tracking-wider transition-colors"
                  >
                    OK
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gift Market Modal */}
        <AnimatePresence>
          {showGiftMarket && (
            <GiftMarket 
              onClose={() => setShowGiftMarket(false)} 
              onBuy={handleBuyGift}
              userBalance={userBalance}
            />
          )}
        </AnimatePresence>
      </main>
    </motion.div>
  );
}

export default App;
