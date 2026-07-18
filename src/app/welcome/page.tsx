import Link from 'next/link';
import { PenTool, User, Zap } from 'lucide-react';

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-100 blur-3xl opacity-50 mix-blend-multiply animate-blob"></div>
        <div className="absolute top-40 -right-40 w-96 h-96 rounded-full bg-purple-100 blur-3xl opacity-50 mix-blend-multiply animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-40 left-20 w-96 h-96 rounded-full bg-pink-100 blur-3xl opacity-50 mix-blend-multiply animate-blob" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="max-w-3xl w-full space-y-10 z-10 relative bg-white/60 backdrop-blur-xl p-10 rounded-3xl border border-white/50 shadow-2xl">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 tracking-tight mb-4">
            Welcome to Airefy! 🎉
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            We&apos;re thrilled to have you here. Airefy is your new home for discovering stories, thinking, and expertise.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {/* Card 1 */}
          <div className="bg-white/80 p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <User size={24} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Complete Profile</h3>
            <p className="text-gray-500 text-sm">
              Head over to your profile settings to add an avatar and a short bio so readers can know more about you.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white/80 p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 delay-100">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <PenTool size={24} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Write a Story</h3>
            <p className="text-gray-500 text-sm">
              Use our rich Markdown editor to draft your first article, add a beautiful cover image, and publish it to the world.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white/80 p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 delay-200">
            <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center mb-4">
              <Zap size={24} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Engage</h3>
            <p className="text-gray-500 text-sm">
              Read stories from other authors, explore topics using tags, and get inspired to write your next masterpiece.
            </p>
          </div>
        </div>

        <div className="pt-8 text-center flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 px-8 py-4 text-lg bg-gray-900 text-white hover:bg-gray-800 hover:shadow-lg w-full sm:w-auto"
          >
            Go to your Dashboard
          </Link>
          <Link
            href="/profile"
            className="inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 px-8 py-4 text-lg bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 w-full sm:w-auto"
          >
            Setup Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
