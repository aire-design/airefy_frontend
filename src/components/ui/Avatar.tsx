import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import { getMediaUrl } from '@/lib/api';
import type { Media } from '@/types';

interface AvatarProps {
  username: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  avatar?: Media | null;
}

const sizeClasses = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
};

const pixelSizes = { sm: 28, md: 36, lg: 48 };

const colors = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
  'bg-yellow-500', 'bg-orange-500', 'bg-teal-500', 'bg-indigo-500',
];

function colorForUsername(username: string | null | undefined): string {
  if (!username || typeof username !== 'string') return colors[0];
  const index = username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  return colors[index];
}

export default function Avatar({ username, size = 'md', className, avatar }: AvatarProps) {
  const avatarUrl = avatar ? getMediaUrl(avatar.formats?.thumbnail?.url ?? avatar.url) : null;
  const px = pixelSizes[size];

  if (avatarUrl) {
    return (
      <div className={cn('relative shrink-0 overflow-hidden rounded-full', sizeClasses[size], className)}>
        <Image src={avatarUrl} alt={username} width={px} height={px} className="object-cover w-full h-full" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full text-white font-semibold select-none shrink-0',
        sizeClasses[size],
        colorForUsername(username),
        className
      )}
      aria-label={username}
    >
      {getInitials(username)}
    </div>
  );
}
