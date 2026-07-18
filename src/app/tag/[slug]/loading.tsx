export default function TagLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 animate-pulse">
      <div className="mb-10 border-b border-gray-200 pb-8">
        <div className="mb-2 h-3 w-8 rounded bg-gray-100" />
        <div className="h-10 w-48 rounded-lg bg-gray-100" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
            <div className="h-48 rounded-xl bg-gray-100" />
            <div className="h-4 w-3/4 rounded bg-gray-100" />
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-1/2 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
