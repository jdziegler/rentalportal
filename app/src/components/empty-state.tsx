import Link from "next/link";
import { Button } from "@/components/ui/button";

const icons = {
  property: (
    <path d="M3 21V3h8v4h8v14H3zm2-2h4v-4H5v4zm0-6h4V9H5v4zm6 6h4v-4h-4v4zm0-6h4V9h-4v4zm6 6h2V9h-2v10z" />
  ),
  unit: (
    <path d="M17 11V3H7v4H3v14h8v-4h2v4h8V11h-4zM7 19H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm4 4H9v-2h2v2zm0-4H9V9h2v2zm0-4H9V5h2v2zm4 8h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm4 12h-2v-2h2v2zm0-4h-2v-2h2v2z" />
  ),
  tenant: (
    <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05C16.19 13.89 17 15.02 17 16.5V19h6v-2.5C23 14.17 18.33 13 16 13z" />
  ),
  lease: (
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 13h8v2H8v-2zm0 4h8v2H8v-2zm0-8h3v2H8V9z" />
  ),
  transaction: (
    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
  ),
  maintenance: (
    <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" />
  ),
  listing: (
    <path d="M18 1l-6 4H6a2 2 0 00-2 2v2a2 2 0 002 2h1l-2 6h4l2-6h1l6 4V1zM8 9V7h3.17L14 5.53v6.94L11.17 11H8z" />
  ),
};

export function EmptyState({
  icon,
  title,
  description,
  href,
  cta,
}: {
  icon: keyof typeof icons;
  title: string;
  description: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-12 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-gray-400"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          {icons[icon]}
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
        {description}
      </p>
      {href && cta && (
        <Button asChild>
          <Link href={href}>{cta}</Link>
        </Button>
      )}
    </div>
  );
}
