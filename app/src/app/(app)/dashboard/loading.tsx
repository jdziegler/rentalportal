export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 bg-gray-200 rounded mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4">
            <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-20 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded" />
          ))}
        </div>
        <div className="bg-white rounded-lg shadow p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
