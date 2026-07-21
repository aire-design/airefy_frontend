'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Eye, Save } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { createArticle, getTags } from '@/lib/api';
import { generateExcerpt, generateSlug } from '@/lib/utils';
import Button from '@/components/ui/Button';
import ImageUpload from '@/components/editor/ImageUpload';
import TagInput from '@/components/editor/TagInput';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import type { Tag, UploadedFile } from '@/types';

const MarkdownEditor = dynamic(
  () => import('@/components/editor/MarkdownEditor'),
  { ssr: false, loading: () => <div className="h-[500px] animate-pulse rounded-xl bg-gray-100" /> }
);

export default function WritePage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState<UploadedFile | null>(null);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    getTags()
      .then((res) => setAvailableTags(res.data))
      .catch(() => {});
  }, []);

  async function save(publish: boolean) {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!content.trim()) { setError('Content is required.'); return; }
    if (!token) return;

    setError('');
    publish ? setPublishing(true) : setSaving(true);

    try {
      const slug = generateSlug(title.trim());
      await createArticle(
        {
          title: title.trim(),
          slug,
          content,
          excerpt: generateExcerpt(content),
          coverImage: coverImage?.id ?? null,
          tags: selectedTags.map((t) => t.id),
        },
        token,
        publish
      );
      savedRef.current = true;
      setSuccess(publish ? 'Story published successfully!' : 'Draft saved successfully!');
      setTitle('');
      setContent('');
      setCoverImage(null);
      setSelectedTags([]);
      
      setTimeout(() => {
        setSuccess('');
        savedRef.current = false;
      }, 5000);
    } catch (err) {
      setError((err as Error).message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  }

  if (authLoading) return <PageLoader />;
  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Top bar */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/profile" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
          My stories
        </Link>
        <div className="flex items-center gap-2">
          {error && <span className="text-sm text-red-600">{error}</span>}
          {success && <span className="text-sm text-green-600">{success}</span>}
          <Button
            variant="secondary"
            size="sm"
            loading={saving}
            disabled={publishing}
            onClick={() => save(false)}
          >
            <Save className="h-4 w-4" />
            Save draft
          </Button>
          <Button
            size="sm"
            loading={publishing}
            disabled={saving}
            onClick={() => save(true)}
          >
            <Eye className="h-4 w-4" />
            Publish
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Cover image */}
        <ImageUpload
          token={token!}
          value={coverImage}
          onChange={setCoverImage}
        />

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full border-0 text-4xl font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-0 bg-transparent"
        />

        {/* Tags */}
        <TagInput
          token={token!}
          selectedTags={selectedTags}
          availableTags={availableTags}
          onChange={setSelectedTags}
        />

        {/* Editor */}
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
