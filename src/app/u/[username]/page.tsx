import type { Metadata } from 'next';
import { getArticlesByUsername, getUserByUsername } from '@/lib/api';
import ArticleList from '@/components/blog/ArticleList';
import ProfileHeader from '@/components/profile/ProfileHeader';
import type { UserProfile } from '@/types';

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username}'s stories`,
    description: `Read all published stories by ${username} on Airefy.`,
  };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params;

  // Fetch user profile info and articles in parallel
  const [profileUser, articlesRes] = await Promise.allSettled([
    getUserByUsername(username),
    getArticlesByUsername(username),
  ]);

  const user: UserProfile | null =
    profileUser.status === 'fulfilled' ? profileUser.value : null;
  const articles =
    articlesRes.status === 'fulfilled' && Array.isArray(articlesRes.value?.data)
      ? articlesRes.value.data
      : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {user ? (
        <ProfileHeader initialProfile={user} articleCount={articles.length} />
      ) : (
        <div className="mb-10 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <p className="text-gray-500 text-center">User not found</p>
        </div>
      )}

      {/* ── Stories ── */}
      <h2 className="mb-6 text-xl font-bold text-gray-900">Stories</h2>
      <ArticleList
        articles={articles}
        emptyMessage={`${username} hasn't published any stories yet.`}
      />
    </div>
  );
}
