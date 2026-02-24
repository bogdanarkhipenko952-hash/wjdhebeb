
export type Role = 'user' | 'assistant';
export type MessageType = 'text' | 'voice' | 'video_circle' | 'gift' | 'image' | 'video' | 'list' | 'file' | 'location' | 'sticker' | 'transfer';

export interface NFTGift {
  id: string;
  name: string;
  imageUrl: string;
  collection: string;
  isPinned?: boolean;
  description?: string;
  date?: string;
  number?: number;
  totalIssued?: number;
  attributes?: { trait: string; value: string; rarity?: string }[];
  ownerId?: string;
  ownerName?: string;
}

export interface Message {
  id: string;
  role: Role;
  type: MessageType;
  content?: string;
  mediaUrl?: string; // Base64 or Blob URL
  duration?: number;
  gift?: NFTGift;
  listItems?: { id: string; text: string; checked: boolean }[];
  location?: { lat: number; lng: number; address?: string };
  fileSize?: string;
  fileName?: string;
  amount?: number;
  currency?: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  reactions?: { emoji: string; users: string[] }[];
}

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy';
  lastSeen?: string;
  bio: string;
  lastMessage?: string;
  isFavorite?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
  isSelf?: boolean;
  isBot?: boolean;
  username?: string;
  gifts?: NFTGift[];
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  email: string;
  username?: string;
  bio?: string;
  phoneNumber?: string;
  gifts?: NFTGift[];
  pinnedGifts?: NFTGift[];
}
