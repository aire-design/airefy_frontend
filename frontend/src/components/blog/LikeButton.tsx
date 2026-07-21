'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { getLikeStatus, toggleLike } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface LikeButtonProps {
  documentId: string;
}

export default function LikeButton({ documentId }: LikeButtonProps) {
  const { token } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem('guestId')) {
        localStorage.setItem('guestId', 'guest-' + Math.random().toString(36).slice(2, 11));
      }
    }
  }, []);

  useEffect(() => {
    async function loadStatus() {
      try {
        const guestId = typeof window !== 'undefined' ? localStorage.getItem('guestId') : null;
        const res = await getLikeStatus(documentId, token, guestId);
        setIsLiked(res.data.isLiked);
        setCount(res.data.count);
      } catch (err) {
        console.error('Failed to load like status', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStatus();
  }, [documentId, token]);

  const handleLike = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const guestId = typeof window !== 'undefined' ? localStorage.getItem('guestId') : null;
      const res = await toggleLike(documentId, token, guestId);
      setIsLiked(res.data.isLiked);
      setCount(res.data.count);
    } catch (err) {
      console.error('Failed to toggle like', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <button disabled className="flex items-center gap-1.5 text-gray-400">
        <Heart className="h-5 w-5" />
        <span className="text-sm">...</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleLike}
      className={`flex items-center gap-1.5 transition-colors ${
        isLiked ? 'text-red-500 hover:text-red-600' : 'text-gray-500 hover:text-gray-900'
      }`}
      aria-label={isLiked ? 'Unlike article' : 'Like article'}
    >
      <Heart className={`h-5 w-5 transition-transform active:scale-90 ${isLiked ? 'fill-current' : ''}`} />
      <span className="text-sm font-medium">{count}</span>
    </button>
  );
}
