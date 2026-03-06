"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const nav = [
  { name: "Dashboard", href: "/dashboard", icon: "grid" },
  { name: "Properties", href: "/properties", icon: "building" },
  { name: "Tenants", href: "/tenants", icon: "users" },
  { name: "Leases", href: "/leases", icon: "file-text" },
  { name: "Transactions", href: "/transactions", icon: "dollar" },
  { name: "Maintenance", href: "/maintenance", icon: "wrench" },
  { name: "Listings", href: "/listings", icon: "megaphone" },
  { name: "Reports", href: "/reports", icon: "chart" },
];

const settingsNav = [
  { name: "Rent Automation", href: "/settings/rent-automation", icon: "repeat" },
  { name: "Account", href: "/settings/account", icon: "cog" },
  { name: "Billing", href: "/settings/billing", icon: "card" },
  { name: "Payments", href: "/settings/payments", icon: "stripe" },
];

const icons: Record<string, string> = {
  grid: "M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z",
  building:
    "M3 21V3h8v4h8v14H3zm2-2h4v-4H5v4zm0-6h4V9H5v4zm6 6h4v-4h-4v4zm0-6h4V9h-4v4zm6 6h2V9h-2v10z",
  users:
    "M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05C16.19 13.89 17 15.02 17 16.5V19h6v-2.5C23 14.17 18.33 13 16 13z",
  "file-text":
    "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 13h8v2H8v-2zm0 4h8v2H8v-2zm0-8h3v2H8V9z",
  dollar:
    "M12 2a10 10 0 100 20 10 10 0 000-20zm1 14.93V18h-2v-1.07A4 4 0 018 13h2a2 2 0 104 0c0 .73-.4 1.4-1.04 1.73l-.5.25A3.98 3.98 0 0011 18.93V17h2v-.07zM12 8a2 2 0 00-2 2H8a4 4 0 018 0h-2a2 2 0 00-2-2z",
  megaphone:
    "M18 1l-6 4H6a2 2 0 00-2 2v2a2 2 0 002 2h1l-2 6h4l2-6h1l6 4V1zM8 9V7h3.17L14 5.53v6.94L11.17 11H8z",
  wrench:
    "M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z",
  card: "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z",
  stripe:
    "M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z",
  chart: "M3 3v18h18v-2H5V3H3zm15 4h-4v10h4V7zm-6 4H8v6h4v-6z",
  cog: "M12 15.5A3.5 3.5 0 018.5 12 3.5 3.5 0 0112 8.5a3.5 3.5 0 013.5 3.5 3.5 3.5 0 01-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97s-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1s.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66z",
  repeat:
    "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z",
  logout:
    "M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z",
};

function NavIcon({ name }: { name: string }) {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d={icons[name] || ""} />
    </svg>
  );
}

export default function Sidebar({
  user,
}: {
  user?: { name?: string | null; email?: string | null; image?: string | null };
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="p-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">PropertyPilot</h1>
        {/* Close button on mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-gray-400 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-3 mb-3">
        <button
          onClick={() => {
            setMobileOpen(false);
            document.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", metaKey: true })
            );
          }}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 bg-gray-800 hover:bg-gray-700 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-xs bg-gray-700 px-1.5 py-0.5 rounded hidden sm:inline">⌘K</kbd>
        </button>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 text-sm ${
                active
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <NavIcon name={item.icon} />
              {item.name}
            </Link>
          );
        })}

        <Separator className="my-4 bg-gray-700" />

        <p className="px-3 mb-2 text-xs text-gray-500 uppercase tracking-wider font-medium">
          Settings
        </p>
        {settingsNav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 text-sm ${
                active
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <NavIcon name={item.icon} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User menu at bottom */}
      <div className="p-3 border-t border-gray-700">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.image || undefined} />
                <AvatarFallback className="bg-gray-600 text-white text-xs">
                  {user?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="truncate font-medium text-sm">
                  {user?.name || "User"}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {user?.email || ""}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="top"
            className="w-56"
          >
            <DropdownMenuItem asChild>
              <Link href="/settings/account">Account Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/billing">Billing</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action="/api/auth/signout" method="POST" className="w-full">
                <button type="submit" className="w-full text-left text-red-600">
                  Sign Out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 text-white flex items-center justify-between px-4 h-14">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-gray-300 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">PropertyPilot</h1>
        <button
          onClick={() => {
            document.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", metaKey: true })
            );
          }}
          className="text-gray-300 hover:text-white"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile slide-out sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col transform transition-transform duration-200 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-gray-900 text-white min-h-screen flex-col shrink-0">
        {sidebarContent}
      </aside>
    </>
  );
}
