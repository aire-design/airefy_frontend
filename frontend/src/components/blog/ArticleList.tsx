import type { Article } from '@/types';
import ArticleCard from './ArticleCard';

interface ArticleListProps {
  articles: Article[];
  emptyMessage?: string;
}

export default function ArticleList({
  articles,
  emptyMessage = 'No articles found.',
}: ArticleListProps) {
  if (!articles || !Array.isArray(articles) || articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-gray-400 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {articles.filter(Boolean).map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
