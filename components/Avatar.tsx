
import React from 'react';

interface AvatarProps {
  src: string;
  name: string;
  status?: 'online' | 'offline' | 'busy';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Avatar: React.FC<AvatarProps> = ({ src, name, status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const statusColors = {
    online: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
    offline: 'bg-zinc-500',
    busy: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
  };

  return (
    <div className="relative inline-block shrink-0">
      <img
        src={src || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-black shadow-lg`}
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
        }}
      />
      {status && (
        <span className={`absolute -bottom-1 -right-1 block ${size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} rounded-full ${statusColors[status]} ring-2 ring-zinc-950 transition-all duration-500`} />
      )}
    </div>
  );
};

export default Avatar;
