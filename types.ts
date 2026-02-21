
export type Role = 'user' | 'assistant';
export type MessageType = 'text' | 'voice' | 'video_circle' | 'gift';

export interface NFTGift {
  id: string;
  name: string;
  imageUrl: string;
  collection: string;
  isPinned?: boolean;
}

export interface Message {
  id: string;
  role: Role;
  type: MessageType;
  content?: string;
  mediaUrl?: string; // Base64 or Blob URL
  duration?: number;
  gift?: NFTGift;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
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
  isSelf?: boolean;
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
}
