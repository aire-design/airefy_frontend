import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'highlight.js/styles/github.css';
import { getArticleBySlug } from '@/lib/api';
import { getMediaUrl } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';
import { Clock, Calendar } from 'lucide-react';
import LikeButton from '@/components/blog/LikeButton';
import CommentsSection from '@/components/blog/CommentsSection';
import RelatedPosts from '@/components/blog/RelatedPosts';

/**
 * Custom renderers for ReactMarkdown.
 *
 * `img` — Images in markdown are stored with relative /uploads/... URLs that
 * point to the backend server, not the Next.js frontend. We resolve them
 * through getMediaUrl() so the correct absolute URL is used.
 */
const markdownComponents: Components = {
  img({ src, alt, ...props }) {
    let cleanSrc = src as string;
    if (!cleanSrc) return null;

    // Strip legacy hardcoded localhost URLs so getMediaUrl can apply the correct API_URL
    if (cleanSrc.startsWith('http://localhost:8000/uploads/')) {
      cleanSrc = cleanSrc.replace('http://localhost:8000', '');
    }

    // A bare filename (no slashes, no protocol) → treat as an uploaded file
    if (!cleanSrc.startsWith('http') && !cleanSrc.startsWith('/')) {
      cleanSrc = `/uploads/${cleanSrc}`;
    }

    const resolvedSrc = getMediaUrl(cleanSrc);
    if (!resolvedSrc) return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={resolvedSrc} alt={alt ?? ''} {...props} />
    );
  },
};

interface PageProps {
  params: Promise<{ username: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await getArticleBySlug(slug);
    const article = res.data[0];
    if (!article) return { title: 'Article not found' };
    return {
      title: article.title,
      description: article.excerpt || undefined,
      openGraph: {
        title: article.title,
        description: article.excerpt || undefined,
        images: article.coverImage
          ? [getMediaUrl(article.coverImage.url)]
          : [],
      },
    };
  } catch {
    return { title: 'Article' };
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const { username, slug } = await params;

  let article;
  try {
    const res = await getArticleBySlug(slug);
    article = res.data[0];
  } catch {
    notFound();
  }

  if (!article || !article.publishedAt) notFound();

  // Verify the username in the URL matches the article's author.
  // Also notFound when author is null — an authorless article has no canonical URL.
  if (!article.author || article.author.username !== username) {
    notFound();
  }

  const coverUrl = getMediaUrl(article.coverImage?.url);

  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      {/* Cover image */}
      {coverUrl && (
        <div className="relative mb-10 h-72 w-full overflow-hidden rounded-2xl bg-gray-100 sm:h-96">
          <Image
            src={coverUrl}
            alt={article.coverImage?.alternativeText || article.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 672px"
          />
        </div>
      )}

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/tag/${tag.slug}`}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
            >
              {tag.name}
            </Link>
          ))}
        </div>
      )}

      {/* Title */}
      <h1 className="mb-6 text-4xl font-bold leading-tight text-gray-900 sm:text-5xl">
        {article.title}
      </h1>

      {/* Author row */}
      <div className="mb-10 flex items-center gap-3 pb-8 border-b border-gray-200">
        {article.author && (
          <Link href={`/u/${article.author.username}`}>
            <Avatar username={article.author.username} size="md" />
          </Link>
        )}
        <div>
          {article.author && (
            <Link
              href={`/u/${article.author.username}`}
              className="font-semibold text-gray-900 hover:text-brand-600"
            >
              {article.author.username}
            </Link>
          )}
          <div className="flex items-center gap-3 text-sm text-gray-400 mt-0.5">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {article.readTime} min read
            </span>
            {article.publishedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(article.publishedAt)}
              </span>
            )}
          </div>
        </div>
        <div className="ml-auto">
          <LikeButton documentId={article.documentId} />
        </div>
      </div>

      {/* Content */}
      <div className="prose-blog">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeHighlight]}
          components={markdownComponents}
        >
          {article.content}
        </ReactMarkdown>
      </div>

      {/* Related Posts */}
      <RelatedPosts documentId={article.documentId} />

      {/* Comments */}
      <CommentsSection documentId={article.documentId} />

      {/* Back link */}
      <div className="mt-16 border-t border-gray-200 pt-8">
        <Link
          href={`/u/${article.author.username}`}
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          ← More by {article.author.username}
        </Link>
      </div>
    </article>
  );
}
