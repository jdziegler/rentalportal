export function ListSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-40 bg-gray-200 rounded" />
        <div className="h-10 w-32 bg-gray-200 rounded-lg" />
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4">
              {Array.from({ length: cols }).map((_, j) => (
                <div
                  key={j}
                  className="h-4 bg-gray-200 rounded"
                  style={{ width: `${Math.floor(100 / cols)}%` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
          <div className="h-8 w-56 bg-gray-200 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-16 bg-gray-200 rounded-lg" />
          <div className="h-10 w-20 bg-gray-200 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-20 bg-gray-200 rounded" />
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-1/4 bg-gray-200 rounded" />
              <div className="h-4 w-1/3 bg-gray-200 rounded" />
              <div className="h-4 w-1/5 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
