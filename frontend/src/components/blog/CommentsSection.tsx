'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getComments, createComment, deleteComment } from '@/lib/api';
import type { Comment } from '@/types';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { formatRelativeDate } from '@/lib/utils';
import { MessageSquare, Trash2 } from 'lucide-react';

interface CommentsSectionProps {
  documentId: string;
}

export default function CommentsSection({ documentId }: CommentsSectionProps) {
  const { user, token } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [guestName, setGuestName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getComments(documentId)
      .then((res) => setComments(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [documentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!user && !guestName.trim()) {
      setError('Please enter your name before commenting.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const name = user ? undefined : guestName.trim();
      const res = await createComment(documentId, newComment, token, name);
      setComments((prev) => [...prev, res.data]);
      setNewComment('');
    } catch (err) {
      setError((err as Error).message || 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!token || !confirm('Delete this comment?')) return;
    try {
      await deleteComment(documentId, commentId, token);
      setComments((prev) => prev.filter((c) => c.documentId !== commentId));
    } catch (err) {
      alert((err as Error).message);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-50 rounded-xl mt-12"></div>;
  }

  return (
    <section className="mt-16 pt-8 border-t border-gray-200">
      <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        Comments ({comments.length})
      </h3>

      {/* Comment Form — always visible */}
      <form onSubmit={handleSubmit} className="mb-10">
        <div className="flex gap-4">
          <Avatar username={user ? user.username : (guestName.trim() || '?')} avatar={user?.avatar} size="md" />
          <div className="flex-1">
            {/* Name field for guests */}
            {!user && (
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Your name *"
                maxLength={60}
                className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 mb-2"
                disabled={submitting}
              />
            )}
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={user ? `Comment as ${user.username}…` : 'Share your thoughts…'}
              className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 min-h-[80px]"
              disabled={submitting}
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            <div className="mt-2 flex items-center justify-between gap-2">
              {!user && (
                <p className="text-xs text-gray-400">
                  Commenting as a guest.
                </p>
              )}
              <div className="ml-auto">
                <Button type="submit" size="sm" loading={submitting} disabled={!newComment.trim() || (!user && !guestName.trim())}>
                  Post Comment
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-4">
            <Avatar username={comment.author.username} size="md" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-gray-900">
                    {comment.author.username}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {formatRelativeDate(comment.createdAt)}
                  </span>
                </div>
                {user && user.id === comment.author.id && (
                  <button
                    onClick={() => handleDelete(comment.documentId)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Delete comment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">No comments yet. Be the first to share your thoughts!</p>
        )}
      </div>
    </section>
  );
}
