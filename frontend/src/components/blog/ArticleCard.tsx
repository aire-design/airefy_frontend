import Image from 'next/image';
import Link from 'next/link';
import { Clock, Calendar } from 'lucide-react';
import type { Article } from '@/types';
import { formatDate, generateExcerpt } from '@/lib/utils';
import { getMediaUrl } from '@/lib/api';
import Avatar from '@/components/ui/Avatar';

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const { title, slug, excerpt, content, coverImage, readTime, publishedAt, author, tags } = article;
  const displayExcerpt = excerpt || generateExcerpt(content, 140);
  // Only build a usable URL when the author is known; authorless articles have no canonical URL.
  const postUrl = author ? `/${author.username}/${slug}` : null;
  const imageUrl = getMediaUrl(
    coverImage?.formats?.medium?.url ?? coverImage?.url
  );

  return (
    <article className="group relative flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Cover image */}
      {imageUrl && (
        postUrl ? (
          <Link href={postUrl} className="relative z-10 overflow-hidden rounded-xl">
            <div className="relative h-48 w-full bg-gray-100">
              <Image
                src={imageUrl}
                alt={coverImage?.alternativeText || title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          </Link>
        ) : (
          <div className="overflow-hidden rounded-xl">
            <div className="relative h-48 w-full bg-gray-100">
              <Image
                src={imageUrl}
                alt={coverImage?.alternativeText || title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          </div>
        )
      )}

      {/* Tags */}
      {Array.isArray(tags) && tags.length > 0 && (
        <div className="relative z-10 flex flex-wrap gap-1.5">
          {tags.slice(0, 3).map((tag) => (
            <Link
              key={tag.id}
              href={`/tag/${tag.slug}`}
              className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
            >
              {tag.name}
            </Link>
          ))}
        </div>
      )}

      {/* Title + excerpt */}
      <div className="flex-1">
        {postUrl ? (
          <Link href={postUrl} className="before:absolute before:inset-0 before:z-0">
            <h2 className="mb-2 text-lg font-bold leading-snug text-gray-900 group-hover:text-brand-600 transition-colors line-clamp-2">
              {title}
            </h2>
          </Link>
        ) : (
          <h2 className="mb-2 text-lg font-bold leading-snug text-gray-900 line-clamp-2">
            {title}
          </h2>
        )}
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
          {displayExcerpt}
        </p>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {author && (
            <>
              <Avatar username={author.username} size="sm" />
              <Link
                href={`/u/${author.username}`}
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {author.username}
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1" title="Estimated reading time">
            <Clock className="h-3 w-3" />
            {readTime} min read
          </span>
          {publishedAt && (
            <span className="flex items-center gap-1" title="Publication date">
              <Calendar className="h-3 w-3" />
              {formatDate(publishedAt)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
