"use client";

export default function TenantPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="text-center py-12">
      <div className="bg-white rounded-lg border border-red-200 p-6 max-w-sm mx-auto">
        <svg
          className="w-10 h-10 text-red-400 mx-auto mb-3"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Something went wrong
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <button
          onClick={reset}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
