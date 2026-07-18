export default function ArticleLoading() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 animate-pulse">
      <div className="mb-10 h-72 w-full rounded-2xl bg-gray-100 sm:h-96" />
      <div className="mb-4 flex gap-2">
        <div className="h-5 w-16 rounded-full bg-gray-100" />
        <div className="h-5 w-20 rounded-full bg-gray-100" />
      </div>
      <div className="mb-2 h-10 w-4/5 rounded-lg bg-gray-100" />
      <div className="mb-6 h-10 w-3/5 rounded-lg bg-gray-100" />
      <div className="mb-10 flex items-center gap-3 border-b border-gray-100 pb-8">
        <div className="h-9 w-9 rounded-full bg-gray-100" />
        <div className="space-y-2">
          <div className="h-4 w-28 rounded bg-gray-100" />
          <div className="h-3 w-36 rounded bg-gray-100" />
        </div>
      </div>
      <div className="space-y-3">
        {[100, 95, 88, 100, 70, 92, 60, 100, 83, 75].map((w, i) => (
          <div key={i} className="h-4 rounded bg-gray-100" style={{ width: `${w}%` }} />
        ))}
      </div>
    </article>
  );
}
