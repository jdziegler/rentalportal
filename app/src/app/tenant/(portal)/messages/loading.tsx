export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 bg-gray-200 rounded" />
      </div>
      <div className="h-4 w-64 bg-gray-200 rounded" />

      <div className="bg-white rounded-lg border border-gray-200 min-h-[300px] p-4 space-y-3">
        {/* Alternating message bubbles */}
        <div className="flex justify-start">
          <div className="w-2/3 space-y-1.5">
            <div className="h-3 w-20 bg-gray-200 rounded" />
            <div className="h-12 bg-gray-100 rounded-lg" />
          </div>
        </div>
        <div className="flex justify-end">
          <div className="h-10 w-1/2 bg-blue-100 rounded-lg" />
        </div>
        <div className="flex justify-start">
          <div className="h-10 w-3/5 bg-gray-100 rounded-lg" />
        </div>
        <div className="flex justify-end">
          <div className="h-8 w-2/5 bg-blue-100 rounded-lg" />
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 h-10 bg-gray-200 rounded-lg" />
        <div className="h-10 w-16 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}
