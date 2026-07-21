export default function UserProfileLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 animate-pulse">
      <div className="mb-10 flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-gray-100" />
        <div className="space-y-2">
          <div className="h-6 w-32 rounded bg-gray-100" />
          <div className="h-4 w-20 rounded bg-gray-100" />
        </div>
      </div>
      <div className="mb-4 h-5 w-40 rounded bg-gray-100" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100" />
        ))}
      </div>
    </div>
  );
}
