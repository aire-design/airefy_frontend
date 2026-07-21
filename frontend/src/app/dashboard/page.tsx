'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PenSquare, BookOpen, FileText, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getMyArticles } from '@/lib/api';
import { getMediaUrl } from '@/lib/api';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/LoadingSpinner';

export default function DashboardPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [published, setPublished] = useState(0);
  const [drafts, setDrafts] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !token) { router.push('/login?from=/dashboard'); return; }
    getMyArticles(user.documentId, token)
      .then((res) => {
        setPublished(res.data.filter((a) => a.publishedAt).length);
        setDrafts(res.data.filter((a) => !a.publishedAt).length);
      })
      .catch((err) => console.error("Failed to fetch articles:", err))
      .finally(() => setLoading(false));
  }, [user, token, authLoading, router]);

  if (authLoading || loading) return <PageLoader />;
  if (!user) return null;

  const avatarUrl = user.avatar ? getMediaUrl(user.avatar.url) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Welcome header */}
      <div className="mb-10 flex items-center gap-5">
        <Avatar username={user.username} size="lg" avatar={user.avatar} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.username}!</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm text-center">
          <p className="text-4xl font-bold text-gray-900">{published}</p>
          <p className="mt-1 text-sm text-gray-500">Published stories</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm text-center">
          <p className="text-4xl font-bold text-gray-900">{drafts}</p>
          <p className="mt-1 text-sm text-gray-500">Saved drafts</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/write" className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <PenSquare className="mb-3 h-6 w-6 text-gray-400 group-hover:text-gray-900 transition-colors" />
          <h3 className="font-semibold text-gray-900">New story</h3>
          <p className="mt-1 text-sm text-gray-500">Start writing a new post</p>
        </Link>
        <Link href="/stories" className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <BookOpen className="mb-3 h-6 w-6 text-gray-400 group-hover:text-gray-900 transition-colors" />
          <h3 className="font-semibold text-gray-900">My stories</h3>
          <p className="mt-1 text-sm text-gray-500">Manage your posts</p>
        </Link>
        <Link href="/profile" className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <User className="mb-3 h-6 w-6 text-gray-400 group-hover:text-gray-900 transition-colors" />
          <h3 className="font-semibold text-gray-900">Edit profile</h3>
          <p className="mt-1 text-sm text-gray-500">Update your info & photo</p>
        </Link>
      </div>
    </div>
  );
}
