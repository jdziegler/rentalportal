"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { name: "Dashboard", href: "/dashboard", icon: "grid" },
  { name: "Properties", href: "/properties", icon: "building" },
  { name: "Units", href: "/units", icon: "door" },
  { name: "Tenants", href: "/tenants", icon: "users" },
  { name: "Leases", href: "/leases", icon: "file-text" },
  { name: "Transactions", href: "/transactions", icon: "dollar" },
  { name: "Listings", href: "/listings", icon: "megaphone" },
];

const icons: Record<string, string> = {
  grid: "M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z",
  building: "M3 21V3h8v4h8v14H3zm2-2h4v-4H5v4zm0-6h4V9H5v4zm6 6h4v-4h-4v4zm0-6h4V9h-4v4zm6 6h2V9h-2v10z",
  door: "M3 21V3h18v18H3zm2-2h5V5H5v14zm7 0h7V5h-7v14zm3-7a1 1 0 110-2 1 1 0 010 2z",
  users: "M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05C16.19 13.89 17 15.02 17 16.5V19h6v-2.5C23 14.17 18.33 13 16 13z",
  "file-text": "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 13h8v2H8v-2zm0 4h8v2H8v-2zm0-8h3v2H8V9z",
  dollar: "M12 2a10 10 0 100 20 10 10 0 000-20zm1 14.93V18h-2v-1.07A4 4 0 018 13h2a2 2 0 104 0c0 .73-.4 1.4-1.04 1.73l-.5.25A3.98 3.98 0 0011 18.93V17h2v-.07zM12 8a2 2 0 00-2 2H8a4 4 0 018 0h-2a2 2 0 00-2-2z",
  megaphone: "M18 1l-6 4H6a2 2 0 00-2 2v2a2 2 0 002 2h1l-2 6h4l2-6h1l6 4V1zM8 9V7h3.17L14 5.53v6.94L11.17 11H8z",
};

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold">PropertyPilot</h1>
      </div>
      <nav className="flex-1 px-3">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 text-sm ${
                active
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d={icons[item.icon] || ""} />
              </svg>
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
