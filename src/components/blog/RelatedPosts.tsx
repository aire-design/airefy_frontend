'use client';

import { useEffect, useState } from 'react';
import { getRelatedArticles } from '@/lib/api';
import type { Article } from '@/types';
import ArticleCard from './ArticleCard';

interface RelatedPostsProps {
  documentId: string;
}

export default function RelatedPosts({ documentId }: RelatedPostsProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRelatedArticles(documentId)
      .then((res) => setArticles(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [documentId]);

  if (loading) {
    return (
      <section className="mt-16">
        <div className="animate-pulse h-6 w-48 bg-gray-200 rounded mb-6"></div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </section>
    );
  }

  if (articles.length === 0) return null;

  return (
    <section className="mt-16 border-t border-gray-200 pt-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Reads</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}
