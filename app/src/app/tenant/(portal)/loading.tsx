export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Lease info card skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-64 bg-gray-200 rounded" />
          </div>
          <div className="text-right space-y-2">
            <div className="h-4 w-24 bg-gray-200 rounded ml-auto" />
            <div className="h-7 w-32 bg-gray-200 rounded ml-auto" />
          </div>
        </div>
        <div className="mt-4 h-16 bg-gray-100 rounded-lg" />
      </div>

      {/* Transaction list skeleton */}
      <div>
        <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="h-4 w-40 bg-gray-200 rounded" />
                <div className="h-3 w-24 bg-gray-200 rounded" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-5 w-14 bg-gray-200 rounded-full" />
                <div className="h-4 w-16 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
