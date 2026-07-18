import type { Metadata } from 'next';
import { getArticlesByTag } from '@/lib/api';
import TagFeed from '@/components/blog/TagFeed';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `#${slug}`,
    description: `Articles tagged with "${slug}" on Airefy.`,
  };
}

export default async function TagPage({ params }: PageProps) {
  const { slug } = await params;

  let articles: Awaited<ReturnType<typeof getArticlesByTag>>['data'] = [];
  try {
    const res = await getArticlesByTag(slug, 1, 12);
    articles = res.data;
  } catch {
    // Backend unreachable — show empty state
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-10 border-b border-gray-200 pb-8">
        <p className="mb-1 text-sm font-medium uppercase tracking-widest text-gray-400">Tag</p>
        <h1 className="text-4xl font-bold text-gray-900">
          <span className="text-gray-300">#</span>
          {slug}
        </h1>
        {articles.length > 0 && (
          <p className="mt-2 text-gray-500">
            {articles.length === 12 ? 'Many' : articles.length} article{articles.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
      <TagFeed slug={slug} initialArticles={articles} />
    </div>
  );
}
