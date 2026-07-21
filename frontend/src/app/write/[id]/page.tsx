'use client';

import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Eye, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  getArticleForEdit,
  updateArticle,
  deleteArticle,
  getTags,
} from '@/lib/api';
import { generateExcerpt } from '@/lib/utils';
import Button from '@/components/ui/Button';
import ImageUpload from '@/components/editor/ImageUpload';
import TagInput from '@/components/editor/TagInput';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import type { Tag, UploadedFile } from '@/types';

const MarkdownEditor = dynamic(
  () => import('@/components/editor/MarkdownEditor'),
  { ssr: false, loading: () => <div className="h-[500px] animate-pulse rounded-xl bg-gray-100" /> }
);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditPage({ params }: PageProps) {
  const { id } = use(params);
  const { token, user } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState<UploadedFile | null>(null);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const savedRef = useRef(false);

  // Warn before closing/refreshing with unsaved content
  useEffect(() => {
    if (!title.trim() && !content.trim()) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (savedRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [title, content]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      getArticleForEdit(id, token),
      getTags(),
    ])
      .then(([articleRes, tagsRes]) => {
        const a = articleRes.data;
        // Redirect if the logged-in user doesn't own this article
        if (a.author?.id !== user?.id) {
          router.push('/profile');
          return;
        }
        setTitle(a.title);
        setContent(a.content);
        setIsPublished(!!a.publishedAt);
        setPublishedAt(a.publishedAt ?? null);
        if (a.coverImage) {
          setCoverImage({
            id: a.coverImage.id,
            documentId: a.coverImage.documentId,
            name: a.coverImage.name ?? '',
            url: a.coverImage.url,
            mime: '',
            size: 0,
          });
        }
        setSelectedTags(a.tags ?? []);
        setAvailableTags(tagsRes.data);
      })
      .catch(() => setError('Could not load article.'))
      .finally(() => setLoading(false));
  }, [id, token]);

  async function save(publish: boolean) {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!content.trim()) { setError('Content is required.'); return; }
    if (!token) return;

    setError('');
    publish ? setPublishing(true) : setSaving(true);

    try {
      await updateArticle(
        id,
        {
          title: title.trim(),
          content,
          excerpt: generateExcerpt(content),
          coverImage: coverImage?.id ?? null,
          tags: selectedTags.map((t) => t.id),
        },
        token,
        publish,
        publishedAt
      );
      savedRef.current = true;
      router.push(publish ? '/profile?published=1' : '/profile?saved=1');
    } catch (err) {
      setError((err as Error).message || 'Failed to save.');
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  }

  async function handleDelete() {
    if (!token || !confirm('Delete this article? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteArticle(id, token);
      savedRef.current = true;
      router.push('/profile');
    } catch (err) {
      setError((err as Error).message || 'Failed to delete.');
      setDeleting(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Top bar */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/profile" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
          My stories
        </Link>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {error && <span className="text-sm text-red-600">{error}</span>}
          <Button
            variant="danger"
            size="sm"
            loading={deleting}
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            loading={saving}
            disabled={publishing || deleting}
            onClick={() => save(false)}
          >
            <Save className="h-4 w-4" />
            Save draft
          </Button>
          <Button
            size="sm"
            loading={publishing}
            disabled={saving || deleting}
            onClick={() => save(true)}
          >
            <Eye className="h-4 w-4" />
            {isPublished ? 'Update' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <ImageUpload
          token={token!}
          value={coverImage}
          onChange={setCoverImage}
        />

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full border-0 text-4xl font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-0 bg-transparent"
        />

        <TagInput
          token={token!}
          selectedTags={selectedTags}
          availableTags={availableTags}
          onChange={setSelectedTags}
        />

        <MarkdownEditor
          value={content}
          onChange={setContent}
          minHeight={500}
          token={token ?? undefined}
        />
      </div>
    </div>
  );
}
