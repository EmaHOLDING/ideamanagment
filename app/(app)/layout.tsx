import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/layout/notification-bell";
import { getNotifications } from "@/app/actions/notificationActions";
import { getDisplayName } from "@/lib/user-display";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { items, nextCursor } = await getNotifications();

  return (
    <div className="flex min-h-screen flex-col">
      <Header displayName={getDisplayName(user)} email={user.email ?? ""}>
        <NotificationBell
          currentUserId={user.id}
          initialItems={items}
          initialNextCursor={nextCursor}
        />
      </Header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
