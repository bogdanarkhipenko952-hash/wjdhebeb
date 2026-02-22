import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Star, Zap, Filter, ShoppingBag, Gem, Clock, TrendingUp } from 'lucide-react';

interface MarketItem {
  id: string;
  name: string;
  collection: string;
  price: number;
  currency: 'STARS' | 'TON';
  imageUrl: string;
  totalIssued: number;
  sold: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  backgroundColor: string;
}

const MOCK_ITEMS: MarketItem[] = [
  {
    id: 'ghost-1',
    name: 'Ice Cream Ghost',
    collection: 'Ghost Biters',
    price: 150,
    currency: 'STARS',
    imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/582.png', // Vanillite
    totalIssued: 5000,
    sold: 4230,
    rarity: 'Common',
    backgroundColor: 'bg-blue-500/10'
  },
  {
    id: 'bear-1',
    name: 'Teddy Love',
    collection: 'Cuddly Toys',
    price: 500,
    currency: 'STARS',
    imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/216.png', // Teddiursa
    totalIssued: 1000,
    sold: 890,
    rarity: 'Rare',
    backgroundColor: 'bg-amber-500/10'
  },
  {
    id: 'rose-1',
    name: 'Eternal Rose',
    collection: 'Nature',
    price: 250,
    currency: 'STARS',
    imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/315.png', // Roselia
    totalIssued: 2000,
    sold: 1500,
    rarity: 'Common',
    backgroundColor: 'bg-red-500/10'
  },
  {
    id: 'dragon-1',
    name: 'Neon Dragon',
    collection: 'Cyber Beasts',
    price: 2500,
    currency: 'STARS',
    imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/384.png', // Rayquaza
    totalIssued: 100,
    sold: 98,
    rarity: 'Legendary',
    backgroundColor: 'bg-emerald-500/10'
  },
  {
    id: 'star-1',
    name: 'Lucky Star',
    collection: 'Celestial',
    price: 750,
    currency: 'STARS',
    imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/120.png', // Staryu
    totalIssued: 1000,
    sold: 200,
    rarity: 'Epic',
    backgroundColor: 'bg-yellow-500/10'
  },
  {
    id: 'robot-1',
    name: 'Mecha Bot',
    collection: 'Robotics',
    price: 1200,
    currency: 'STARS',
    imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/374.png', // Beldum
    totalIssued: 500,
    sold: 120,
    rarity: 'Epic',
    backgroundColor: 'bg-zinc-500/10'
  },
  {
    id: 'ghost-2',
    name: 'Shadow Spirit',
    collection: 'Ghost Biters',
    price: 300,
    currency: 'STARS',
    imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/92.png', // Gastly
    totalIssued: 3000,
    sold: 2800,
    rarity: 'Common',
    backgroundColor: 'bg-purple-500/10'
  },
  {
    id: 'crystal-1',
    name: 'Mystic Gem',
    collection: 'Minerals',
    price: 5000,
    currency: 'STARS',
    imageUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/302.png', // Sableye
    totalIssued: 50,
    sold: 49,
    rarity: 'Legendary',
    backgroundColor: 'bg-indigo-500/10'
  }
];

interface GiftMarketProps {
  onClose: () => void;
  onBuy: (item: MarketItem) => void;
  userBalance: number;
}

export default function GiftMarket({ onClose, onBuy, userBalance }: GiftMarketProps) {
  const [filter, setFilter] = useState<'all' | 'rare' | 'legendary'>('all');
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    return MOCK_ITEMS.filter(item => {
      if (filter === 'rare' && item.rarity !== 'Rare' && item.rarity !== 'Epic') return false;
      if (filter === 'legendary' && item.rarity !== 'Legendary') return false;
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [filter, search]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-[150] bg-[#000000] flex flex-col"
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between bg-[#121212] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
            <ShoppingBag size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-none">Магазин</h2>
            <p className="text-xs text-zinc-500 mt-1">NFT Подарки</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-full border border-white/5">
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-bold text-white">{userBalance.toLocaleString()}</span>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="px-6 py-4 space-y-4 bg-[#121212] shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
          <input 
            type="text" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск подарков..." 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-purple-500/50 transition-all" 
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${filter === 'all' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
          >
            Все
          </button>
          <button 
            onClick={() => setFilter('rare')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${filter === 'rare' ? 'bg-blue-500 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
          >
            Редкие
          </button>
          <button 
            onClick={() => setFilter('legendary')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${filter === 'legendary' ? 'bg-purple-500 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
          >
            Легендарные
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#0a0a0a]">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
          {filteredItems.map(item => (
            <motion.div 
              key={item.id}
              layoutId={item.id}
              className="bg-[#1c1c1e] rounded-[1.5rem] overflow-hidden border border-white/5 group relative"
            >
              {/* Rarity Badge */}
              <div className="absolute top-3 left-3 z-10">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border ${
                  item.rarity === 'Legendary' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                  item.rarity === 'Epic' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                  item.rarity === 'Rare' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                  'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                }`}>
                  {item.rarity}
                </span>
              </div>

              {/* Image Area */}
              <div className={`h-32 ${item.backgroundColor} relative flex items-center justify-center overflow-hidden`}>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                <img 
                  src={item.imageUrl || undefined} 
                  alt={item.name} 
                  className="w-20 h-20 object-contain drop-shadow-xl group-hover:scale-110 transition-transform duration-300 relative z-10" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>

              {/* Info Area */}
              <div className="p-4">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{item.collection}</p>
                <h3 className="text-sm font-bold text-white mb-3 truncate">{item.name}</h3>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs font-bold text-white">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    {item.price}
                  </div>
                  <span className="text-[10px] text-zinc-600">
                    {item.sold}/{item.totalIssued}
                  </span>
                </div>

                <button 
                  onClick={() => onBuy(item)}
                  className="w-full mt-3 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors border border-white/5"
                >
                  Купить
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
