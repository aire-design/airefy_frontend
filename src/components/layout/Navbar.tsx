'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PenSquare, LogOut, User, ChevronDown, Settings, Award } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    setMenuOpen(false);
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-gray-900 hover:opacity-80"
        >
          Airefy
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link href="/certifications">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <Award className="h-4 w-4" />
              Certifications
            </Button>
          </Link>
          {loading ? null : user ? (
            <>
              <Link href="/write">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <PenSquare className="h-4 w-4" />
                  Write
                </Button>
              </Link>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-1.5 rounded-full p-1 hover:bg-gray-100 focus:outline-none"
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                >
                  <Avatar username={user.username} size="sm" />
                  <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                </button>

                {menuOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpen(false)}
                    />
                    {/* Dropdown */}
                    <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                      <p className="truncate px-4 py-2 text-xs text-gray-500">
                        {user.email}
                      </p>
                      <hr className="my-1" />
                      <Link
                        href="/dashboard"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                      >
                        <User className="h-4 w-4" />
                        Dashboard
                      </Link>
                      <Link
                        href="/stories"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <User className="h-4 w-4" />
                        My stories
                      </Link>
                      <Link
                        href={`/u/${encodeURIComponent(user.username)}`}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <User className="h-4 w-4" />
                        Public profile
                      </Link>
                      <Link
                        href="/certifications/manage"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Award className="h-4 w-4" />
                        My certifications
                      </Link>
                      <Link
                        href="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Settings className="h-4 w-4" />
                        Edit profile
                      </Link>
                      <hr className="my-1" />
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            // Visitors see no sign-in button — the owner logs in at /login directly.
            <Link href="/">
              <Button variant="ghost" size="sm">
                Home
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
