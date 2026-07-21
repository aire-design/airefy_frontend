'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PenSquare, Edit3, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getMyArticles, deleteArticle } from '@/lib/api';
import { formatRelativeDate } from '@/lib/utils';
import type { Article } from '@/types';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/LoadingSpinner';

function StoriesContent() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftSaved = searchParams.get('saved') === '1';

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !token) { router.push('/login?from=/stories'); return; }
    getMyArticles(user.documentId, token)
      .then((res) => setArticles(res.data))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [user, token, authLoading, router]);

  async function handleDelete(documentId: string) {
    if (!token || !confirm('Delete this article? This cannot be undone.')) return;
    setDeletingId(documentId);
    try {
      await deleteArticle(documentId, token);
      setArticles((prev) => prev.filter((a) => a.documentId !== documentId));
    } catch (err) { alert((err as Error).message); }
    finally { setDeletingId(null); }
  }

  if (authLoading || loading) return <PageLoader />;
  if (!user) return null;

  const published = articles.filter((a) => a.publishedAt);
  const drafts = articles.filter((a) => !a.publishedAt);
  const isEmpty = articles.length === 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {searchParams.get('published') === '1' && (
        <div className="mb-6 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 font-medium">
          🎉 Your story was published successfully! It is now live for everyone to read.
        </div>
      )}
      {draftSaved && (
        <div className="mb-6 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
          Draft saved. You can publish it anytime from the edit page.
        </div>
      )}
      <div className="mb-2 flex items-center gap-5">
        <Avatar username={user.username} size="lg" avatar={user.avatar} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Stories</h1>
          <p className="text-sm text-gray-500">{user.username}</p>
        </div>
        <Link href="/write" className="ml-auto">
          <Button size="sm"><PenSquare className="h-4 w-4" />New story</Button>
        </Link>
      </div>
      <hr className="mb-8 border-gray-100" />

      {isEmpty ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-8 py-16 text-center">
          <PenSquare className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h2 className="mb-2 text-xl font-semibold text-gray-700">No stories yet</h2>
          <p className="mb-6 text-gray-400">Start writing your first story today.</p>
          <Link href="/write"><Button size="lg">Start writing</Button></Link>
          {fetchError && <p className="mt-6 text-xs text-gray-400">Could not load stories — please refresh.</p>}
        </div>
      ) : (
        <div className="space-y-10">
          {published.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Published ({published.length})</h2>
              <div className="space-y-3">
                {published.map((a) => <ArticleRow key={a.id} article={a} onDelete={handleDelete} deletingId={deletingId} />)}
              </div>
            </section>
          )}
          {drafts.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Drafts ({drafts.length})</h2>
              <div className="space-y-3">
                {drafts.map((a) => <ArticleRow key={a.id} article={a} onDelete={handleDelete} deletingId={deletingId} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default function StoriesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <StoriesContent />
    </Suspense>
  );
}

function ArticleRow({ article, onDelete, deletingId }: { article: Article; onDelete: (id: string) => void; deletingId: string | null }) {
  const isDeleting = deletingId === article.documentId;
  const isDraft = !article.publishedAt;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {isDraft && <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Draft</span>}
          <h3 className="font-semibold text-gray-900 truncate">{article.title}</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{article.readTime} min read</span>
          <span>{isDraft ? `Last edited ${formatRelativeDate(article.updatedAt)}` : `Published ${formatRelativeDate(article.publishedAt!)}`}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!isDraft && article.author && (
          <Link href={`/${article.author.username}/${article.slug}`} className="text-xs text-gray-500 hover:text-gray-900 underline" target="_blank">View</Link>
        )}
        <Link href={`/write/${article.documentId}`}><Button variant="ghost" size="sm"><Edit3 className="h-4 w-4" /></Button></Link>
        <Button variant="danger" size="sm" loading={isDeleting} onClick={() => onDelete(article.documentId)}>×</Button>
      </div>
    </div>
  );
}
