import Link from "next/link";

interface OnboardingStep {
  title: string;
  description: string;
  href: string;
  completed: boolean;
  cta: string;
}

export function OnboardingChecklist({
  steps,
}: {
  steps: OnboardingStep[];
}) {
  const completed = steps.filter((s) => s.completed).length;
  const total = steps.length;
  const progress = Math.round((completed / total) * 100);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Welcome to PropertyPilot!</h2>
        <p className="text-sm text-gray-500 mt-1">
          Complete these steps to get your portfolio set up.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 bg-gray-100 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-600">
            {completed}/{total}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              step.completed
                ? "border-green-200 bg-green-50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div
              className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                step.completed
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {step.completed ? (
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <span className="text-xs font-bold">{i + 1}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${
                  step.completed ? "text-green-800 line-through" : "text-gray-900"
                }`}
              >
                {step.title}
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  step.completed ? "text-green-600" : "text-gray-500"
                }`}
              >
                {step.description}
              </p>
            </div>
            {!step.completed && (
              <Link
                href={step.href}
                className="flex-shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"
              >
                {step.cta}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
