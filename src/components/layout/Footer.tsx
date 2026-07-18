import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-8 mt-16">
      <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
        <p>© {new Date().getFullYear()} Airefy.</p>
        <nav className="flex gap-4">
          <Link href="/" className="hover:text-gray-900">Home</Link>
        </nav>
      </div>
    </footer>
  );
}
