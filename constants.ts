
import { Contact, UserProfile } from './types';

export const CURRENT_USER: UserProfile = {
  id: 'pulse-' + Math.random().toString(36).substr(2, 9),
  name: 'Пользователь ' + Math.floor(Math.random() * 1000),
  avatar: `https://picsum.photos/seed/${Math.random()}/200`,
  email: 'local@pulse.io',
  username: 'user_' + Math.floor(Math.random() * 10000),
  bio: 'В локальной сети Pulse. Шифрование включено.',
  phoneNumber: '+7 (900) 000-00-00',
  gifts: [
    {
      id: 'nft-1',
      name: 'Cyber Skull #001',
      collection: 'Pulse Genesis',
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=256&h=256&auto=format&fit=crop',
      isPinned: true
    },
    {
      id: 'nft-2',
      name: 'Neon Ape #404',
      collection: 'Pulse Genesis',
      imageUrl: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=256&h=256&auto=format&fit=crop',
      isPinned: false
    }
  ]
};

// Контакты теперь будут динамическими (пусто при старте)
export const CONTACTS: Contact[] = [];

export const SYSTEM_PROMPT = `
Вы — персональный ИИ-ассистент Pulse. 
Общайтесь на РУССКОМ языке. 
Помогайте пользователю ориентироваться в мессенджере.
`;
