import Sidebar from "@/components/sidebar";
import { CommandPalette } from "@/components/command-palette";
import { ToastHandler } from "@/components/toast-handler";
import { ChatWidget } from "@/components/chat-widget";
import { PageContextProvider } from "@/lib/ai/page-context";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  let unreadMessages = 0;
  if (session?.user?.id) {
    unreadMessages = await prisma.message.count({
      where: {
        userId: session.user.id,
        sender: "tenant",
        readAt: null,
      },
    });
  }

  return (
    <PageContextProvider>
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
          unreadMessages={unreadMessages}
        />
        <main className="flex-1 min-w-0 bg-gray-50 p-4 pt-18 sm:p-6 sm:pt-18 lg:p-8 lg:pt-8 overflow-x-hidden">{children}</main>
        <CommandPalette />
        <ToastHandler />
        <ChatWidget />
      </div>
    </PageContextProvider>
  );
}
