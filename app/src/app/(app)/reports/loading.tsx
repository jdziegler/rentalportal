export default function Loading() {
  return (
    <div>
      <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gray-200 animate-pulse" />
              <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
