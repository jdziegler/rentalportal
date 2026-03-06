import Sidebar from "@/components/sidebar";
import { CommandPalette } from "@/components/command-palette";
import { ToastHandler } from "@/components/toast-handler";
import { ChatWidget } from "@/components/chat-widget";
import { auth } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar
        user={
          session?.user
            ? {
                name: session.user.name,
                email: session.user.email,
                image: session.user.image,
              }
            : undefined
        }
      />
      <main className="flex-1 min-w-0 bg-gray-50 p-4 pt-18 sm:p-6 sm:pt-18 lg:p-8 lg:pt-8 overflow-x-hidden">{children}</main>
      <CommandPalette />
      <ToastHandler />
      <ChatWidget />
    </div>
  );
}
