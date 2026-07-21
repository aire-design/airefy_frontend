'use client';

import { useState } from 'react';
import type { Article } from '@/types';
import ArticleList from '@/components/blog/ArticleList';
import { getArticlesByTag } from '@/lib/api';

const PAGE_SIZE = 12;

export default function TagFeed({
  slug,
  initialArticles,
}: {
  slug: string;
  initialArticles: Article[];
}) {
  const [articles, setArticles] = useState(initialArticles);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialArticles.length === PAGE_SIZE);

  async function loadMore() {
    setLoading(true);
    try {
      const res = await getArticlesByTag(slug, page + 1, PAGE_SIZE);
      setArticles((prev) => [...prev, ...res.data]);
      setPage((p) => p + 1);
      setHasMore(res.data.length === PAGE_SIZE);
    } catch {
      // silent — user can try again
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <ArticleList
        articles={articles}
        emptyMessage={`No articles tagged with "${slug}" yet.`}
      />
      {hasMore && (
        <div className="mt-12 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="inline-flex items-center rounded-full border border-gray-300 px-8 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
