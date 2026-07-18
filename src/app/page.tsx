import type { Metadata } from 'next';
import Link from 'next/link';
import { getArticles } from '@/lib/api';
import HomeFeed from '@/components/blog/HomeFeed';

export const metadata: Metadata = {
  title: 'Home',
  description: 'Discover stories, thinking, and expertise from writers on any topic.',
};

export default async function HomePage() {
  let articles: Awaited<ReturnType<typeof getArticles>>['data'] = [];

  try {
    const res = await getArticles(1, 12);
    articles = res.data;
  } catch {
    // Backend not running — show empty state
  }

  return (
    <>
      {/* Hero */}
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Airefy
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-gray-500">
            Stories, thinking, and ideas — my personal corner of the web.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="#feed"
              className="inline-flex items-center rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
            >
              Read stories
            </Link>
          </div>
        </div>
      </section>

      {/* Feed */}
      <section id="feed" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-8 text-2xl font-bold text-gray-900">
          Recent stories
        </h2>
        <HomeFeed initialArticles={articles} />
      </section>
    </>
  );
}
