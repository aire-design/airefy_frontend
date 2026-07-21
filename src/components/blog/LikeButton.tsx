'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getLikeStatus, toggleLike } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface LikeButtonProps {
  documentId: string;
}

export default function LikeButton({ documentId }: LikeButtonProps) {
  const { user, token } = useAuth();
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLikeStatus(documentId, token)
      .then((res) => {
        setIsLiked(res.data.isLiked);
        setCount(res.data.count);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [documentId, token]);

  const handleToggle = async () => {
    if (!user || !token) {
      router.push(`/login?from=${window.location.pathname}`);
      return;
    }
    
    // Optimistic update
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setCount((prev) => (wasLiked ? prev - 1 : prev + 1));

    try {
      const res = await toggleLike(documentId, token);
      setIsLiked(res.data.isLiked);
      setCount(res.data.count);
    } catch (err) {
      // Revert on error
      setIsLiked(wasLiked);
      setCount((prev) => (wasLiked ? prev + 1 : prev - 1));
      alert('Failed to update like. Please try again.');
    }
  };

  if (loading) {
    return (
      <button disabled className="flex items-center gap-1.5 text-gray-400">
        <Heart className="h-5 w-5" />
        <span className="text-sm">...</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
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
