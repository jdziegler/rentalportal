export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-6 w-48 bg-gray-200 rounded" />
        <div className="h-10 w-28 bg-gray-200 rounded-lg" />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-4 py-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-56 bg-gray-200 rounded" />
                <div className="h-3 w-40 bg-gray-200 rounded" />
                <div className="h-3 w-72 bg-gray-200 rounded" />
              </div>
              <div className="flex gap-2 ml-3">
                <div className="h-5 w-14 bg-gray-200 rounded-full" />
                <div className="h-5 w-16 bg-gray-200 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
